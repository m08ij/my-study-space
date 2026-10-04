/* ============================================================
   ical-sync.js — اشتراك تقويم Moodle (iCal) بدل الاستيراد اليدوي
   - الرابط الرسمي الذي يولّده الطالب من Moodle: التقويم ← تصدير التقويم ← «احصل على الرابط»
   - الرابط سرّي (يحمل authtoken): يُحفظ محلياً فقط بمفتاح moodleIcalUrl، خارج space وخارج المزامنة والنسخ الاحتياطي
   - يضيف العناصر الجديدة فقط (بلا تكرار)، ولا يعدّل أو يحذف أي عنصر موجود
   - قد يمنع المتصفح الجلب المباشر (CORS)؛ عندها تظهر رسالة صريحة وبدائل
   ============================================================ */
(function(){
  'use strict';
  var URL_KEY = 'moodleIcalUrl', PROXY_KEY = 'moodleIcalProxy', META_KEY = 'moodleIcalMeta';
  var REFRESH_MS = 6 * 3600 * 1000;

  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function S(){ return window.S; }
  function sp(){ return window.space || {}; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }

  function unescapeText(v){ return String(v || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').replace(/\s+/g, ' ').trim(); }

  /* DTSTART → {date:'YYYY-MM-DD', time:'HH:MM'|''}؛ الصيغة بتوقيت UTC (Z) تُحوَّل للتوقيت المحلي */
  function parseDt(raw){
    var m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(String(raw || '').trim());
    if(!m) return null;
    if(m[4] === undefined) return { date: m[1] + '-' + m[2] + '-' + m[3], time: '', allDay: true };
    if(m[7]){
      var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
      if(isNaN(d.getTime())) return null;
      return { date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
    }
    return { date: m[1] + '-' + m[2] + '-' + m[3], time: m[4] + ':' + m[5] };
  }

  function parseIcs(text){
    var out = [], src = String(text || '');
    if(src.indexOf('BEGIN:VCALENDAR') === -1) return { events: [], valid: false };
    var lines = src.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n'), cur = null;
    lines.forEach(function(line){
      if(line === 'BEGIN:VEVENT'){ cur = {}; return; }
      if(line === 'END:VEVENT'){ if(cur && cur.SUMMARY && cur.DTSTART) out.push(cur); cur = null; return; }
      if(!cur) return;
      var i = line.indexOf(':'); if(i < 1) return;
      var name = line.slice(0, i).split(';')[0].toUpperCase();
      if(name === 'SUMMARY' || name === 'DTSTART' || name === 'UID' || name === 'CATEGORIES' || name === 'DESCRIPTION') cur[name] = line.slice(i + 1);
    });
    var events = out.map(function(e){
      var dt = parseDt(e.DTSTART); if(!dt) return null;
      return { uid: String(e.UID || '').trim(), title: unescapeText(e.SUMMARY), date: dt.date, time: dt.time, course: unescapeText(e.CATEGORIES) };
    }).filter(Boolean);
    return { events: events, valid: true };
  }

  var EXAM_RE = /exam|امتحان|اختبار|midterm|final|quiz\s*exam/i;

  function matchCourse(raw){
    var name = String(raw || '').trim(); if(!name) return '';
    var list = sp().courses || [], low = name.toLowerCase();
    for(var i = 0; i < list.length; i++){ var c = String(list[i].name || '').toLowerCase(); if(c && (low.indexOf(c) > -1 || c.indexOf(low) > -1)) return list[i].name; }
    return name;
  }

  /* دمج: يضيف الجديد فقط. الأحداث الأقدم من 14 يوماً تُتجاهل. مفتاح التكرار = uid، ثم (العنوان + التاريخ) */
  function merge(events, todayStr){
    var s = sp(); if(!s.tasks) s.tasks = []; if(!s.exams) s.exams = [];
    var floor = new Date(todayStr + 'T00:00:00'); floor.setDate(floor.getDate() - 14);
    var floorStr = floor.getFullYear() + '-' + pad(floor.getMonth() + 1) + '-' + pad(floor.getDate());
    var uids = {}, keys = {};
    s.tasks.forEach(function(t){ if(t.uid) uids[t.uid] = 1; keys[(t.title || '') + '|' + (t.due || '')] = 1; });
    s.exams.forEach(function(e){ if(e.uid) uids[e.uid] = 1; keys[(e.name || '') + '|' + (e.date || '')] = 1; });
    var addedT = 0, addedE = 0, skipped = 0, old = 0;
    events.forEach(function(ev){
      if(ev.date < floorStr){ old++; return; }
      var key = ev.title + '|' + ev.date;
      if((ev.uid && uids[ev.uid]) || keys[key]){ skipped++; return; }
      var id = window.uid ? window.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      var course = matchCourse(ev.course);
      if(EXAM_RE.test(ev.title)){ s.exams.push({ id: id, name: ev.title, course: course, date: ev.date, time: ev.time, room: '', source: 'moodle-ical', uid: ev.uid }); addedE++; }
      else { s.tasks.push({ id: id, title: ev.title, type: 'assignment', course: course, due: ev.date, done: false, source: 'moodle-ical', uid: ev.uid }); addedT++; }
      if(ev.uid) uids[ev.uid] = 1; keys[key] = 1;
    });
    return { addedTasks: addedT, addedExams: addedE, skipped: skipped, old: old };
  }

  function getMeta(){ var m = S() && S().get(META_KEY, null); return m && typeof m === 'object' ? m : {}; }
  function setMeta(m){ if(S()) S().set(META_KEY, m); }

  function fetchText(url){
    var proxy = S() && S().get(PROXY_KEY, ''), target = proxy ? String(proxy).replace('{url}', encodeURIComponent(url)) : url;
    return fetch(target, { credentials: 'omit', cache: 'no-store' }).then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
  }

  /* يرجع {ok, ...} أو {ok:false, reason} */
  function syncNow(opts){
    opts = opts || {};
    var url = S() && S().get(URL_KEY, '');
    if(!url) return Promise.resolve({ ok: false, reason: 'no-url' });
    return fetchText(url).then(function(text){
      var p = parseIcs(text);
      if(!p.valid) throw new Error('not-ics');
      var r = merge(p.events, window.today ? window.today() : new Date().toISOString().slice(0, 10));
      if(r.addedTasks || r.addedExams){
        if(window.saveSpace) window.saveSpace();
        if(window.renderTasks) window.renderTasks();
        if(window.renderExams) window.renderExams();
        if(window.renderDashboard) window.renderDashboard();
      }
      setMeta({ last: Date.now(), ok: true, found: p.events.length, addedTasks: r.addedTasks, addedExams: r.addedExams });
      return { ok: true, found: p.events.length, r: r };
    }).catch(function(e){
      var m = String(e && e.message || e), reason = m === 'not-ics' ? 'not-ics' : (/^HTTP/.test(m) ? 'http' : 'blocked');
      setMeta({ last: Date.now(), ok: false, reason: reason, detail: m.slice(0, 80) });
      return { ok: false, reason: reason, detail: m };
    });
  }

  var REASONS = {
    'no-url': 'ما في رابط محفوظ.',
    'not-ics': 'الرابط ما رجّع ملف تقويم صالح. تأكد إنك نسخت رابط «تصدير التقويم» من Moodle كاملاً.',
    'http': 'رفض الخادم الطلب (الرابط غير صالح أو منتهي). ولّد رابطاً جديداً من Moodle.',
    'blocked': 'المتصفح منع الجلب المباشر (غالباً سياسة CORS في موقع Moodle) أو ما في اتصال. البدائل: (1) افتح الرابط بالمتصفح واحفظ الملف ثم استورده بزر «استيراد تقويم (.ics)» بالأدوات الجانبية، أو (2) أدخل رابط وسيط خاص فيك بالإعدادات المتقدمة تحت.'
  };

  /* ---------- واجهة ---------- */
  function ago(ts){ var m = Math.round((Date.now() - ts) / 60000); return m < 1 ? 'الآن' : m < 60 ? 'قبل ' + m + ' د' : m < 1440 ? 'قبل ' + Math.round(m / 60) + ' س' : 'قبل ' + Math.round(m / 1440) + ' يوم'; }
  function statusHtml(){
    var m = getMeta(), url = S() && S().get(URL_KEY, '');
    if(!url) return '<span class="u-note">ما في رابط محفوظ.</span>';
    if(!m.last) return '<span class="u-note">الرابط محفوظ — لم تتم مزامنة بعد.</span>';
    if(m.ok) return '✅ آخر مزامنة ' + ago(m.last) + ' — ' + (m.found || 0) + ' حدث في التقويم، أُضيف ' + (m.addedTasks || 0) + ' مهمة و' + (m.addedExams || 0) + ' امتحان.';
    return '<span class="pg-warn">⚠️ فشلت آخر مزامنة (' + ago(m.last) + '): ' + esc(REASONS[m.reason] || m.detail || '') + '</span>';
  }
  function render(){
    var page = document.getElementById('hulinks'); if(!page) return;
    var box = document.getElementById('icalSync');
    if(!box){ box = document.createElement('div'); box.id = 'icalSync'; box.className = 'card ical-card'; var head = page.querySelector('.page-head'); head && head.nextSibling ? page.insertBefore(box, head.nextSibling) : page.appendChild(box); }
    var url = (S() && S().get(URL_KEY, '')) || '', proxy = (S() && S().get(PROXY_KEY, '')) || '';
    box.innerHTML = '<div class="card-head"><h3>🔄 مزامنة تقويم Moodle</h3></div>' +
      '<p class="bp-note">من Moodle: <b>التقويم ← تصدير التقويم ← «احصل على رابط التقويم»</b> وألصقه هون. بيتحدّث تلقائياً كل 6 ساعات عند فتح التطبيق، وبيضيف الواجبات والامتحانات الجديدة فقط بدون تكرار أو حذف. الرابط سرّي: بيتخزّن على جهازك فقط (خارج المزامنة والنسخ الاحتياطي).</p>' +
      '<div class="bp-rec-add"><input type="url" id="icalUrl" placeholder="https://lms.hu.edu.jo/calendar/export_execute.php?..." value="' + esc(url) + '" dir="ltr" autocomplete="off"><button class="btn btn-sm" id="icalSave">حفظ وتحديث الآن</button>' + (url ? '<button class="btn btn-sm btn-ghost" id="icalRefresh">تحديث</button><button class="btn btn-sm btn-danger" id="icalDel" aria-label="حذف الرابط">🗑</button>' : '') + '</div>' +
      '<div id="icalStatus" class="bp-note" role="status">' + statusHtml() + '</div>' +
      '<details class="pg-adv"><summary>إعدادات متقدمة (وسيط CORS)</summary><p class="bp-note">إذا منع المتصفح الجلب، ممكن تستخدم وسيطاً تتحكم فيه أنت (مثلاً Cloudflare Worker). اكتب عنوانه وضع <code>{url}</code> مكان الرابط. <b>انتبه:</b> الوسيط يشوف رابط التقويم السرّي، فلا تستخدم خدمة ما بتثق فيها.</p><input type="text" id="icalProxy" dir="ltr" placeholder="https://my-proxy.example/?u={url}" value="' + esc(proxy) + '"></details>';
    bind(box);
  }
  function setStatus(html){ var s = document.getElementById('icalStatus'); if(s) s.innerHTML = html; }
  function run(){
    setStatus('<span class="u-empty is-loading">جاري المزامنة…</span>');
    return syncNow().then(function(res){
      if(res.ok){ setStatus(statusHtml()); if(window.toast) window.toast('تمت المزامنة: ' + res.r.addedTasks + ' مهمة و' + res.r.addedExams + ' امتحان جديد', 'success'); }
      else setStatus(statusHtml());
      return res;
    });
  }
  function bind(box){
    var q = function(id){ return box.querySelector('#' + id); };
    q('icalSave').onclick = function(){
      var v = (q('icalUrl').value || '').trim();
      if(!/^https:\/\/[^\s]+$/i.test(v)){ if(window.toast) window.toast('الصق رابطاً صحيحاً يبدأ بـ https://', 'warn'); return; }
      var pr = (q('icalProxy').value || '').trim();
      if(pr && !/^https:\/\/[^\s]*\{url\}[^\s]*$/i.test(pr)){ if(window.toast) window.toast('الوسيط لازم يبدأ بـ https:// ويحتوي {url}', 'warn'); return; }
      S().set(URL_KEY, v); S().set(PROXY_KEY, pr); setMeta({}); render(); run();
    };
    if(q('icalRefresh')) q('icalRefresh').onclick = run;
    if(q('icalDel')) q('icalDel').onclick = function(){
      var go = function(){ S().remove ? S().remove(URL_KEY) : S().set(URL_KEY, ''); S().set(META_KEY, {}); render(); if(window.toast) window.toast('حُذف الرابط (المهام المستوردة بقيت)', 'info'); };
      if(window.customConfirm) window.customConfirm('حذف رابط التقويم؟ المهام والامتحانات المستوردة ما بتنحذف.', go, { title: 'حذف الرابط' }); else go();
    };
  }

  /* تحديث تلقائي هادئ: مرة كل 6 ساعات كحدّ أقصى، وفقط إذا في رابط وفي اتصال */
  function autoSync(){
    var url = S() && S().get(URL_KEY, ''); if(!url || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    var m = getMeta(); if(m.last && Date.now() - m.last < REFRESH_MS) return;
    syncNow();
  }

  /* app.js يُحمَّل بعد هذا الملف ويعرّف switchTab من جديد، فنراقب ظهور القسم نفسه بدل تغليف الدالة */
  function onShown(id, fn){
    var el = document.getElementById(id); if(!el || typeof MutationObserver === 'undefined') return;
    var was = el.classList.contains('active');
    new MutationObserver(function(){ var now = el.classList.contains('active'); if(now && !was){ try{ fn(); }catch(e){ console.warn(id, e); } } was = now; }).observe(el, { attributes: true, attributeFilter: ['class'] });
    if(was) setTimeout(fn, 0);
  }  onShown('hulinks', render);
  setTimeout(autoSync, 4000);

  window.IcalSync = { parseIcs: parseIcs, parseDt: parseDt, merge: merge, syncNow: syncNow, render: render, REASONS: REASONS };
})();
