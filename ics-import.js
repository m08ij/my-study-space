/* ============================================================
   ics-import.js — استيراد تقويم من ملف .ics (Moodle أو أي تقويم) مع معاينة وتأكيد
   - يدوي بالكامل: الملف يُقرأ محلياً على جهازك ولا يُرسل لأي مكان؛ لا روابط تصدير ولا رموز وصول
   - لا يكتب أي شيء قبل ضغط «استيراد»، ولا يحذف ولا يستبدل شيئاً (الجدول والمحاضرات لا تُمس)
   - المراجع: الأحداث تُضاف كمهام/امتحانات بحقل uid لمنع التكرار عند إعادة استيراد الملف نفسه
   ============================================================ */
(function(){
  'use strict';
  var MAX_BYTES = 5 * 1024 * 1024, MAX_EVENTS = 400, MAX_OCC = 52, HORIZON_DAYS = 548;

  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function sp(){ return window.space || {}; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function dstr(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr(){ return window.today ? window.today() : dstr(new Date()); }
  function mkDate(s){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDays(s, n){ var d = mkDate(s); d.setDate(d.getDate() + n); return dstr(d); }
  function diffDays(a, b){ return Math.round((mkDate(b) - mkDate(a)) / 86400000); }

  /* ---------- قراءة الملف ---------- */
  function unescapeText(v){ return String(v || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').replace(/\s+/g, ' ').trim(); }

  function parseProp(line){
    var i = -1, q = false;
    for(var k = 0; k < line.length; k++){ var c = line[k]; if(c === '"') q = !q; else if(c === ':' && !q){ i = k; break; } }
    if(i < 1) return null;
    var left = line.slice(0, i).split(';'), name = left[0].toUpperCase(), params = {};
    for(var p = 1; p < left.length; p++){ var kv = left[p].split('='); if(kv.length > 1) params[kv[0].toUpperCase()] = kv.slice(1).join('=').replace(/^"|"$/g, ''); }
    return { name: name, params: params, value: line.slice(i + 1) };
  }

  function tzOffsetMs(utcMs, tz){
    var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var o = {}; f.formatToParts(new Date(utcMs)).forEach(function(p){ o[p.type] = p.value; });
    return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second) - Math.floor(utcMs / 1000) * 1000;
  }
  function zonedToDate(y, mo, d, h, mi, s, tz){
    var guess = Date.UTC(y, mo - 1, d, h, mi, s), t = guess - tzOffsetMs(guess, tz);
    return new Date(guess - tzOffsetMs(t, tz));
  }

  /* قيمة DTSTART/DTEND → { date, time, allDay, tzUnknown } بالتوقيت المحلي للجهاز */
  function parseDt(value, params){
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(value || '').trim());
    if(!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if(mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    if(m[4] === undefined || (params && params.VALUE === 'DATE')) return { date: m[1] + '-' + m[2] + '-' + m[3], time: '', allDay: true };
    var h = +m[4], mi = +m[5], s = +(m[6] || 0), dt;
    if(m[7]) dt = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
    else if(params && params.TZID){
      try{ dt = zonedToDate(y, mo, d, h, mi, s, params.TZID); if(isNaN(dt.getTime())) throw new Error('bad'); }
      catch(e){ return { date: m[1] + '-' + m[2] + '-' + m[3], time: m[4] + ':' + m[5], allDay: false, tzUnknown: params.TZID }; }
    } else return { date: m[1] + '-' + m[2] + '-' + m[3], time: m[4] + ':' + m[5], allDay: false };
    if(isNaN(dt.getTime())) return null;
    return { date: dstr(dt), time: pad(dt.getHours()) + ':' + pad(dt.getMinutes()), allDay: false };
  }

  function parseRrule(v){
    var r = {}; String(v || '').split(';').forEach(function(p){ var kv = p.split('='); if(kv.length === 2) r[kv[0].toUpperCase()] = kv[1]; });
    return r;
  }

  /* يرجع { valid, reason, events[], warnings[] } — الأحداث المتكررة تُوسَّع (حدّ 52 تكراراً خلال ~18 شهراً) */
  function parseIcs(text, nowStr){
    var src = String(text || '');
    if(!src.trim()) return { valid: false, reason: 'empty', events: [], warnings: [] };
    if(src.indexOf('\u0000') > -1) return { valid: false, reason: 'binary', events: [], warnings: [] };
    if(src.indexOf('BEGIN:VCALENDAR') === -1) return { valid: false, reason: 'not-ics', events: [], warnings: [] };
    var lines = src.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n'), cur = null, raws = [];
    lines.forEach(function(line){
      var t = line.replace(/\s+$/, '');
      if(t === 'BEGIN:VEVENT'){ cur = { ex: [] }; return; }
      if(t === 'END:VEVENT'){ if(cur) raws.push(cur); cur = null; return; }
      if(!cur) return;
      var p = parseProp(t); if(!p) return;
      if(p.name === 'EXDATE'){ p.value.split(',').forEach(function(v){ var d = parseDt(v, p.params); if(d) cur.ex.push(d.date); }); return; }
      if(!(p.name in cur)) cur[p.name] = p;
    });
    if(!raws.length) return { valid: false, reason: 'no-events', events: [], warnings: [] };
    var warnings = [], horizon = addDays(nowStr || todayStr(), HORIZON_DAYS), out = [], truncated = false;
    var overrides = {};
    raws.forEach(function(r){ if(r['RECURRENCE-ID'] && r.UID){ var rd = parseDt(r['RECURRENCE-ID'].value, r['RECURRENCE-ID'].params); if(rd) overrides[r.UID.value + '#' + rd.date] = true; } });
    var tzBad = {}, rruleUnsupported = 0, skippedNoDate = 0;

    raws.forEach(function(r){
      if(!r.SUMMARY || !r.DTSTART){ skippedNoDate++; return; }
      var st = parseDt(r.DTSTART.value, r.DTSTART.params); if(!st){ skippedNoDate++; return; }
      if(st.tzUnknown) tzBad[st.tzUnknown] = 1;
      var en = r.DTEND ? parseDt(r.DTEND.value, r.DTEND.params) : null, span = 1;
      if(en){
        var endDate = en.date;
        if(st.allDay || (en.time === '00:00' && endDate > st.date)) endDate = addDays(endDate, -1);
        span = Math.max(1, diffDays(st.date, endDate) + 1);
      }
      var base = { uid: r.UID ? String(r.UID.value).trim() : '', title: unescapeText(r.SUMMARY.value), date: st.date, time: st.time, allDay: !!st.allDay, span: span,
        location: r.LOCATION ? unescapeText(r.LOCATION.value) : '', categories: r.CATEGORIES ? unescapeText(r.CATEGORIES.value) : '',
        description: r.DESCRIPTION ? unescapeText(r.DESCRIPTION.value) : '', cancelled: !!(r.STATUS && /CANCELLED/i.test(r.STATUS.value)), notes: [] };
      if(st.tzUnknown) base.notes.push('منطقة زمنية غير معروفة (' + st.tzUnknown + '): الوقت كما هو بالملف');
      if(span > 1) base.notes.push('يمتد ' + span + ' أيام — يُستورد بتاريخ البداية فقط');
      var recId = r['RECURRENCE-ID'] ? parseDt(r['RECURRENCE-ID'].value, r['RECURRENCE-ID'].params) : null;

      if(recId && base.uid){ base.key = base.uid + '#' + recId.date; out.push(base); return; }
      if(!r.RRULE){ base.key = base.uid || ('noid:' + base.title + '|' + base.date); out.push(base); return; }

      var rule = parseRrule(r.RRULE.value), freq = rule.FREQ, interval = Math.max(1, parseInt(rule.INTERVAL, 10) || 1), count = parseInt(rule.COUNT, 10) || 0;
      /* UNTIL يُقارَن كلحظة زمنية (قد يكون بتوقيت UTC) وليس كتاريخ فقط */
      var untilMs = null;
      if(rule.UNTIL){ var um = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(rule.UNTIL); if(um){ untilMs = um[4] === undefined ? new Date(+um[1], +um[2] - 1, +um[3], 23, 59, 59).getTime() : (um[7] ? Date.UTC(+um[1], +um[2] - 1, +um[3], +um[4], +um[5], +(um[6] || 0)) : new Date(+um[1], +um[2] - 1, +um[3], +um[4], +um[5], +(um[6] || 0)).getTime()); } }
      var tparts = (st.time || '00:00').split(':'), instantOf = function(ds0){ var dd = mkDate(ds0); dd.setHours(+tparts[0], +tparts[1], 0, 0); return dd.getTime(); };
      var unsupported = !/^(DAILY|WEEKLY|MONTHLY)$/.test(freq || '') || rule.BYSETPOS || rule.BYMONTH || rule.BYYEARDAY || rule.BYWEEKNO || (rule.BYDAY && freq !== 'WEEKLY') || (rule.BYMONTHDAY && freq !== 'MONTHLY') || /\d/.test(rule.BYDAY || '');
      if(unsupported){
        rruleUnsupported++; base.notes.push('تكرار غير مدعوم (' + (freq || '?') + ') — تُستورد أول مرة فقط'); base.key = (base.uid || ('noid:' + base.title)) + '#' + base.date; out.push(base); return;
      }
      var codes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'], days = [];
      if(freq === 'WEEKLY'){ (rule.BYDAY ? rule.BYDAY.split(',') : [codes[mkDate(st.date).getDay()]]).forEach(function(c){ var i = codes.indexOf(c.toUpperCase()); if(i > -1) days.push(i); }); if(!days.length) days = [mkDate(st.date).getDay()]; }
      var occ = [], d = st.date, n = 0, guard = 0, startWeek = addDays(st.date, -mkDate(st.date).getDay());
      while(guard++ < 4000){
        var ok = false;
        if(freq === 'DAILY') ok = diffDays(st.date, d) % interval === 0;
        else if(freq === 'WEEKLY') ok = days.indexOf(mkDate(d).getDay()) > -1 && Math.floor(diffDays(startWeek, d) / 7) % interval === 0;
        else { var sd = mkDate(st.date), cd = mkDate(d); ok = cd.getDate() === sd.getDate() && ((cd.getFullYear() - sd.getFullYear()) * 12 + cd.getMonth() - sd.getMonth()) % interval === 0; }
        if(d < st.date) ok = false;
        if(ok){ n++; if(untilMs !== null && instantOf(d) > untilMs) break; if(count && n > count) break; if(r.ex.indexOf(d) === -1 && !(base.uid && overrides[base.uid + '#' + d])) occ.push(d); }
        if(d > horizon || (untilMs !== null && instantOf(d) > untilMs) || (count && n >= count) || occ.length >= MAX_OCC){ if(occ.length >= MAX_OCC) truncated = true; break; }
        d = addDays(d, 1);
      }
      occ.forEach(function(od){ var c = {}; Object.keys(base).forEach(function(k){ c[k] = base[k]; }); c.notes = base.notes.slice(); c.date = od; c.key = (base.uid || ('noid:' + base.title)) + '#' + od; c.recurring = true; out.push(c); });
    });
    if(skippedNoDate) warnings.push(skippedNoDate + ' حدث بدون عنوان أو تاريخ صالح تم تجاهله');
    if(truncated) warnings.push('أحداث متكررة كثيرة: اقتُصر على أول ' + MAX_OCC + ' تكراراً لكل حدث');
    if(rruleUnsupported) warnings.push(rruleUnsupported + ' حدث بتكرار معقّد غير مدعوم (استُورد أول موعد فقط)');
    if(out.length > MAX_EVENTS){ warnings.push('الملف كبير: عُرض أول ' + MAX_EVENTS + ' حدثاً فقط (' + out.length + ' بالملف)'); out = out.slice(0, MAX_EVENTS); }
    return { valid: true, events: out, warnings: warnings };
  }

  /* ---------- التصنيف والمطابقة ---------- */
  var EXAM_RE = /exam|midterm|final|امتحان|اختبار|فاينل|ميد\s*ترم/i, QUIZ_RE = /quiz|كويز/i;
  function kindOf(title){ return EXAM_RE.test(title) ? 'exam' : (QUIZ_RE.test(title) ? 'quiz' : 'assignment'); }
  function norm(s){ return String(s || '').toLowerCase().replace(/[ً-ٟـ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim(); }

  /* مطابقة موثوقة فقط: (1) تطابق تام للتصنيف/العنوان مع اسم المادة، (2) رمز المادة (5+ خانات)، (3) الاسم الكامل (6+ أحرف) داخل النص.
     مادة واحدة = تطابق؛ عند تعدّد المواد يُختار الاسم الأطول فقط إن احتوى كل الباقين (مثل «X Lab» تحتوي «X»)، وإلا لا مطابقة. */
  function matchCourse(ev){
    var list = sp().courses || [], hay = ' ' + norm(ev.categories + ' ' + ev.title) + ' ', cat = norm(ev.categories), tit = norm(ev.title), raw = (ev.categories + ' ' + ev.title).replace(/\s+/g, '');
    var exact = [], codes = [], names = [];
    list.forEach(function(c){
      var name = norm(c.name), code = String(c.code || '').replace(/\s+/g, '');
      if(name.length >= 3 && (cat === name || tit === name)) exact.push(c.name);
      if(code.length >= 5 && raw.indexOf(code) > -1) codes.push(c.name);
      if(name.length >= 6 && hay.indexOf(' ' + name + ' ') > -1) names.push(c.name);
    });
    function pickOne(arr){
      if(arr.length === 1) return { course: arr[0], ambiguous: false };
      if(arr.length > 1){
        var longest = arr.slice().sort(function(a, b){ return norm(b).length - norm(a).length; })[0], nl = norm(longest);
        if(arr.every(function(n){ return n === longest || nl.indexOf(norm(n)) > -1; })) return { course: longest, ambiguous: false };
        return { course: '', ambiguous: true };
      }
      return null;
    }
    return pickOne(exact) || pickOne(codes) || pickOne(names) || { course: '', ambiguous: false };
  }
  /* ---------- مقارنة بالموجود (لا كتابة) ---------- */
  function analyze(events, nowStr){
    var s = sp(), byUid = {}, byKey = {}, today = nowStr || todayStr();
    (s.tasks || []).forEach(function(t){ var it = { kind: 'task', ref: t, title: t.title, date: t.due, time: '' }; if(t.uid) byUid[t.uid] = it; byKey[norm(t.title) + '|' + (t.due || '')] = it; });
    (s.exams || []).forEach(function(e){ var it = { kind: 'exam', ref: e, title: e.name, date: e.date, time: e.time || '' }; if(e.uid) byUid[e.uid] = it; byKey[norm(e.name) + '|' + (e.date || '')] = it; });
    var seenKeys = {}, rows = events.map(function(ev, i){
      var row = { i: i, ev: ev, kind: kindOf(ev.title), match: matchCourse(ev), status: 'new', existing: null, past: ev.date < today };
      if(ev.cancelled){ row.status = 'cancelled'; return row; }
      if(seenKeys[ev.key]){ row.status = 'repeat'; return row; }
      seenKeys[ev.key] = 1;
      var ex = byUid[ev.key] || (ev.uid && !ev.recurring ? byUid[ev.uid] : null);
      if(ex){
        row.existing = ex;
        /* المهام لا تحفظ وقتاً، فالوقت يُقارَن للامتحانات فقط */
        var changed = norm(ex.title) !== norm(ev.title) || ex.date !== ev.date || (ex.kind === 'exam' && (ex.time || '') !== (ev.time || ''));
        row.status = changed ? 'changed' : 'same';
        row.updatable = changed && ex.ref && (ex.ref.source === 'ics' || ex.ref.source === 'moodle-ical');
        return row;
      }
      var dup = byKey[norm(ev.title) + '|' + ev.date];
      if(dup){ row.status = 'dup'; row.existing = dup; }
      return row;
    });
    var fileKeys = {}; events.forEach(function(e){ fileKeys[e.key] = 1; if(e.uid) fileKeys[e.uid] = 1; });
    var missing = [];
    (s.tasks || []).concat(s.exams || []).forEach(function(x){ if((x.source === 'ics') && x.uid && !fileKeys[x.uid] && (x.due || x.date || '') >= today) missing.push(x.title || x.name); });
    return { rows: rows, missing: missing };
  }
  function defaultChecked(r){ return r.status === 'new' && !r.past; }

  /* ---------- التطبيق (فقط بعد تأكيد المستخدم) ---------- */
  function apply(rows, picks){
    var s = sp(); if(!s.tasks) s.tasks = []; if(!s.exams) s.exams = [];
    var added = { tasks: 0, exams: 0 }, updated = 0;
    rows.forEach(function(r){
      var pick = picks[r.i]; if(!pick || !pick.on) return;
      var kind = pick.kind || r.kind, ev = r.ev, id = window.uid ? window.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      if(r.status === 'changed'){
        if(!r.updatable) return;
        var ref = r.existing.ref, isExam = r.existing.kind === 'exam';
        if(isExam){ ref.name = ev.title; ref.date = ev.date; ref.time = ev.time; } else { ref.title = ev.title; ref.due = ev.date; }
        if(r.match.course) ref.course = r.match.course;
        updated++; return;
      }
      if(r.status !== 'new' && r.status !== 'dup') return;
      if(kind === 'exam'){ s.exams.push({ id: id, name: ev.title, course: r.match.course, date: ev.date, time: ev.time, room: ev.location, source: 'ics', uid: ev.key }); added.exams++; }
      else { s.tasks.push({ id: id, title: ev.title, type: kind === 'quiz' ? 'quiz' : 'assignment', course: r.match.course, due: ev.date, done: false, source: 'ics', uid: ev.key }); added.tasks++; }
    });
    if(added.tasks || added.exams || updated){
      if(window.saveSpace) window.saveSpace();
      if(window.renderTasks) window.renderTasks();
      if(window.renderExams) window.renderExams();
      if(window.renderCourses) window.renderCourses();
      if(window.renderDashboard) window.renderDashboard();
    }
    return { added: added, updated: updated };
  }

  /* ---------- الواجهة ---------- */
  var STATUS = { 'new': ['جديد', 'ok'], same: ['مستورد سابقاً', 'mute'], changed: ['معدّل بالملف', 'warn'], dup: ['مكرر محتمل', 'warn'], cancelled: ['ملغي', 'mute'], repeat: ['مكرر داخل الملف', 'mute'] };
  var ERRORS = {
    empty: 'الملف فارغ.',
    binary: 'هذا ليس ملف تقويم نصي (.ics).',
    'not-ics': 'الملف ليس تقويماً صالحاً (ما فيه BEGIN:VCALENDAR). غالباً نزّلت صفحة دخول بدل ملف التقويم.',
    'no-events': 'الملف تقويم صالح لكن بدون أحداث.',
    big: 'الملف كبير جداً (الحد 5MB).',
    read: 'تعذّرت قراءة الملف.'
  };

  function close(bd){ if(!bd) return; if(window.dismissOverlay) window.dismissOverlay(bd); else bd.remove(); }
  function overlay(html, wide){
    document.querySelectorAll('.ics-backdrop').forEach(function(m){ m.remove(); });
    var bd = document.createElement('div'); bd.className = 'modal-backdrop show ics-backdrop';
    bd.innerHTML = '<div class="modal ics-modal' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(bd);
    bd.addEventListener('click', function(e){ if(e.target === bd) close(bd); });
    bd.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(bd); });
    return bd;
  }

  var MANUAL_NOTE = 'الاستيراد <b>يدوي</b>: لتحديث التقويم صدّر ملف .ics جديداً من Moodle (التقويم ← تصدير التقويم ← نزّل الملف) واستورده مجدداً. الأحداث المستوردة سابقاً لا تتكرر. لا تستخدم رابط التصدير (authtoken) ولا ترسله لأحد.';

  function openHub(){
    var bd = overlay('<div class="ics-head"><h3>📅 مزامنة التقويم (.ics)</h3><button class="sync-x" data-x type="button" aria-label="إغلاق">✕</button></div>' +
      '<div class="ics-choices">' +
        '<button class="ics-choice" id="icsOut" type="button"><span class="ic">📤</span><b>تصدير جدولي</b><small>محاضراتك وامتحاناتك ومهامك لملف يفتح بتطبيق التقويم بهاتفك أو Google Calendar</small></button>' +
        '<button class="ics-choice" id="icsIn" type="button"><span class="ic">📥</span><b>استيراد ملف تقويم</b><small>ملف Moodle أو أي تقويم: تشوف معاينة وتؤكد قبل ما يتغير أي شي</small></button>' +
      '</div><p class="ics-note">' + MANUAL_NOTE + '</p>');
    bd.querySelector('[data-x]').onclick = function(){ close(bd); };
    bd.querySelector('#icsOut').onclick = function(){ close(bd); if(window.exportCalendar) window.exportCalendar(); };
    bd.querySelector('#icsIn').onclick = function(){ close(bd); pick(); };
    var f = bd.querySelector('#icsIn'); if(f) f.focus();
  }

  function pick(){
    var input = document.createElement('input'); input.type = 'file'; input.accept = '.ics,text/calendar';
    input.onchange = function(){ var f = input.files && input.files[0]; if(f) readFile(f); };
    input.click();
  }

  function readFile(file){
    if(file.size > MAX_BYTES){ fail('big', file.name); return; }
    var r = new FileReader();
    r.onerror = function(){ fail('read', file.name); };
    r.onload = function(){ preview(String(r.result || ''), file.name); };
    r.readAsText(file);
  }
  function fail(reason, name){
    var bd = overlay('<div class="ics-head"><h3>⚠️ تعذّر استيراد الملف</h3><button class="sync-x" data-x type="button" aria-label="إغلاق">✕</button></div>' +
      '<p class="ics-note"><b>' + esc(name || '') + '</b><br>' + esc(ERRORS[reason] || 'ملف غير صالح.') + '</p><div class="ics-actions"><button class="btn" data-x type="button">حسناً</button></div>');
    bd.querySelectorAll('[data-x]').forEach(function(b){ b.onclick = function(){ close(bd); }; });
  }

  function preview(text, name){
    var parsed = parseIcs(text, todayStr());
    if(!parsed.valid){ fail(parsed.reason, name); return; }
    var an = analyze(parsed.events, todayStr()), rows = an.rows, picks = {};
    rows.forEach(function(r){ picks[r.i] = { on: defaultChecked(r), kind: r.kind }; });
    var cnt = {}; rows.forEach(function(r){ cnt[r.status] = (cnt[r.status] || 0) + 1; });
    var pastNew = rows.filter(function(r){ return r.status === 'new' && r.past; }).length;

    var html = '<div class="ics-head"><h3>📥 معاينة الاستيراد</h3><button class="sync-x" data-x type="button" aria-label="إغلاق">✕</button></div>' +
      '<div class="ics-file">' + esc(name) + ' — <b>' + rows.length + '</b> حدث</div>' +
      '<div class="ics-chips">' + ['new', 'changed', 'dup', 'same', 'cancelled', 'repeat'].filter(function(k){ return cnt[k]; }).map(function(k){ return '<span class="ics-chip ' + STATUS[k][1] + '">' + STATUS[k][0] + ' ' + cnt[k] + '</span>'; }).join('') + (pastNew ? '<span class="ics-chip mute">منتهية ' + pastNew + '</span>' : '') + '</div>';
    if(parsed.warnings.length) html += '<div class="ics-warns">' + parsed.warnings.map(function(w){ return '<div>⚠️ ' + esc(w) + '</div>'; }).join('') + '</div>';
    html += '<div class="ics-toolbar"><button class="btn btn-sm btn-ghost" id="icsAllNew" type="button">تحديد الجديد</button><button class="btn btn-sm btn-ghost" id="icsNone" type="button">إلغاء التحديد</button></div><div class="ics-list" id="icsList">';
    rows.forEach(function(r){
      var ev = r.ev, st = STATUS[r.status], can = r.status === 'new' || r.status === 'dup' || (r.status === 'changed' && r.updatable);
      var old = r.status === 'changed' && r.existing ? '<div class="ics-old">بالتطبيق الآن: ' + esc(r.existing.title) + ' — ' + esc(r.existing.date || '') + (r.existing.time ? ' ' + esc(r.existing.time) : '') + (r.updatable ? '' : ' (عنصر موجود بتعديلك — لن يُغيَّر)') + '</div>' : '';
      var dupN = r.status === 'dup' && r.existing ? '<div class="ics-old">يشبه: ' + esc(r.existing.title) + ' — ' + esc(r.existing.date || '') + '</div>' : '';
      var course = r.match.course ? '📚 ' + esc(r.match.course) : (r.match.ambiguous ? '<span class="u-note">أكثر من مادة تطابق — بدون مادة</span>' : '<span class="u-note">بدون مادة (ما في تطابق موثوق)</span>');
      html += '<div class="ics-row' + (r.past ? ' past' : '') + (can ? '' : ' off') + '" data-i="' + r.i + '"><label class="ics-chk"><input type="checkbox" data-pick="' + r.i + '"' + (picks[r.i].on ? ' checked' : '') + (can ? '' : ' disabled') + ' aria-label="' + esc(ev.title) + '"></label>' +
        '<div class="ics-main"><div class="ics-title">' + esc(ev.title) + '</div>' +
        '<div class="ics-meta"><span>📆 ' + esc(ev.date) + (ev.time ? ' · ⏰ <bdi dir="ltr">' + esc(ev.time) + '</bdi>' : ' · طوال اليوم') + (ev.span > 1 ? ' · ' + ev.span + ' أيام' : '') + (ev.recurring ? ' · 🔁' : '') + (r.past ? ' · منتهي' : '') + '</span><span>' + course + '</span></div>' + old + dupN +
        (ev.notes.length ? '<div class="ics-old">' + ev.notes.map(esc).join(' · ') + '</div>' : '') + '</div>' +
        '<div class="ics-side"><span class="ics-chip ' + st[1] + '">' + st[0] + '</span>' + (r.status === 'changed' ? '' : '<select data-kind="' + r.i + '" aria-label="النوع"' + (can ? '' : ' disabled') + '><option value="assignment"' + (r.kind === 'assignment' ? ' selected' : '') + '>مهمة</option><option value="quiz"' + (r.kind === 'quiz' ? ' selected' : '') + '>كويز</option><option value="exam"' + (r.kind === 'exam' ? ' selected' : '') + '>امتحان</option></select>') + '</div></div>';
    });
    html += '</div>';
    if(an.missing.length) html += '<div class="ics-warns">ℹ️ ' + an.missing.length + ' عنصر مستورد سابقاً ما عاد موجوداً بهذا الملف (مثلاً ' + esc(an.missing.slice(0, 2).join('، ')) + '). <b>ما بينحذف تلقائياً</b>، احذفه يدوياً إن لزم.</div>';
    html += '<p class="ics-note">' + MANUAL_NOTE + ' لا يُستبدل جدولك ولا تُحذف محاضرات أو مهام أو امتحانات موجودة. المتكرر والمنتهي والمكرر والمعدّل غير محدّدين افتراضياً.</p>' +
      '<div class="ics-actions"><span class="ics-count" id="icsCount"></span><button class="btn btn-ghost" id="icsCancel" type="button">إلغاء</button><button class="btn" id="icsGo" type="button">استيراد</button></div>';
    var bd = overlay(html, true);
    function refresh(){
      var n = rows.filter(function(r){ return picks[r.i].on; }).length;
      bd.querySelector('#icsCount').textContent = n + ' محدّد';
      var go = bd.querySelector('#icsGo'); go.disabled = n === 0; go.textContent = n ? 'استيراد (' + n + ')' : 'استيراد';
    }
    bd.querySelectorAll('[data-x]').forEach(function(b){ b.onclick = function(){ close(bd); }; });
    bd.querySelector('#icsCancel').onclick = function(){ close(bd); };
    bd.querySelectorAll('[data-pick]').forEach(function(c){ c.onchange = function(){ picks[c.dataset.pick].on = c.checked; refresh(); }; });
    bd.querySelectorAll('[data-kind]').forEach(function(s){ s.onchange = function(){ picks[s.dataset.kind].kind = s.value; }; });
    bd.querySelector('#icsAllNew').onclick = function(){ rows.forEach(function(r){ var on = defaultChecked(r) || (r.status === 'new'); picks[r.i].on = on; var c = bd.querySelector('[data-pick="' + r.i + '"]'); if(c && !c.disabled) c.checked = on; }); refresh(); };
    bd.querySelector('#icsNone').onclick = function(){ rows.forEach(function(r){ picks[r.i].on = false; var c = bd.querySelector('[data-pick="' + r.i + '"]'); if(c) c.checked = false; }); refresh(); };
    bd.querySelector('#icsGo').onclick = function(){
      var res = apply(rows, picks); close(bd);
      var parts = []; if(res.added.tasks) parts.push(res.added.tasks + ' مهمة'); if(res.added.exams) parts.push(res.added.exams + ' امتحان'); if(res.updated) parts.push(res.updated + ' محدَّث');
      if(window.toast) window.toast(parts.length ? '✅ تم الاستيراد: ' + parts.join(' و') : 'ما تم استيراد شي', parts.length ? 'success' : 'info', 4000);
    };
    refresh();
  }

  function bindMenu(){
    var b = document.getElementById('calSyncBtn');
    if(b && !b._ics){ b._ics = true; b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); openHub(); }); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindMenu); else bindMenu();

  window.IcsImport = { pick: pick, openHub: openHub, parseIcs: parseIcs, parseDt: parseDt, analyze: analyze, apply: apply, preview: preview, matchCourse: matchCourse, kindOf: kindOf, readFile: readFile };
})();
