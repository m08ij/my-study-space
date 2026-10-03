/* ============================================================
   🧭 hub.js — يومي الجامعي + تفاصيل المحاضرة + مركز المواد + لوحة الأوامر
   - يعتمد على البيانات والدوال الموجودة (space / S / switchTab / showModal ...)
   - كل الألوان من متغيرات الثيم؛ لا بيانات وهمية
   ============================================================ */
(function(){
  'use strict';
  if(window._hubLoaded) return;
  window._hubLoaded = true;

  /* ============ أدوات ============ */
  function sp(){ return window.space || {}; }
  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function toast(m, t, d){ if(window.toast) window.toast(m, t, d); }
  function $(s, r){ return (r || document).querySelector(s); }
  function DE(){ return window.DAYS_EN || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; }
  function DA(){ return window.DAYS_AR || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']; }
  function todayStr(){ return window.today ? window.today() : ''; }
  function pm(t){
    if(window.ttMin) return window.ttMin(t);
    var p = String(t || '').split(':'), h = parseInt(p[0], 10);
    return isNaN(h) ? null : h * 60 + (parseInt(p[1], 10) || 0);
  }
  function pad(m){
    m = ((Math.round(m) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function dur(m){
    m = Math.max(1, Math.round(m));
    if(window.ttDur) return window.ttDur(m);
    return m + ' د';
  }
  /* مدة حتى حدث: دقائق/ساعات/أيام */
  function until(min){
    min = Math.max(0, min);
    if(min < 60) return Math.max(1, Math.ceil(min)) + ' د';
    if(min < 1440){ var h = Math.floor(min / 60), m = Math.round(min % 60); return m ? h + 'س ' + m + 'د' : h + ' س'; }
    var d = Math.floor(min / 1440), hh = Math.round((min % 1440) / 60);
    return d + ' يوم' + (hh ? ' و' + hh + 'س' : '');
  }
  function normCode(c){ return String(c || '').replace(/^0+/, ''); }
  function foldersOf(c){
    var out = [c.id];
    (c.filesFrom || []).forEach(function(f){ if(f && out.indexOf(f) === -1) out.push(f); });
    return out;
  }
  function findCourse(ref){
    var list = sp().courses || [];
    for(var i = 0; i < list.length; i++){ if(list[i].id === ref) return list[i]; }
    for(var j = 0; j < list.length; j++){ if(list[j].name === ref) return list[j]; }
    return null;
  }
  function parseExamDate(e){
    if(!e || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) return null;
    var p = e.date.split('-'), hh = 23, mm = 59;
    var m = String(e.time || '').match(/^(\d{1,2}):(\d{2})/);
    if(m){ hh = parseInt(m[1], 10); mm = parseInt(m[2], 10); }
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10), hh, mm, 0);
  }
  function daysFromToday(d){
    var n = new Date(), a = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    var b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((b - a) / 86400000);
  }
  function dayWord(n){ return n === 0 ? 'اليوم' : n === 1 ? 'غداً' : n === 2 ? 'بعد غد' : 'بعد ' + n + ' يوم'; }
  function afterChange(){
    try{ if(window.renderDashboard) window.renderDashboard(); }catch(e){}
    refreshActiveCourse();
  }

  /* ============================================================
     1) Schedule — حسابات الجدول (مصدر واحد للوقت الحالي/القادم)
     ============================================================ */
  var Schedule = {
    /* محاضرات الجدول كقائمة موحّدة. المحاضرة بلا وقت نهاية تُعامل ساعة واحدة (hasEnd=false) */
    entries: function(){
      var tt = sp().timetable || {}, out = [], de = DE();
      Object.keys(tt).forEach(function(k){
        var i = k.indexOf('-'); if(i < 0) return;
        var day = k.slice(0, i), s = pm(k.slice(i + 1)), c = tt[k];
        if(s === null || !c || !c.name) return;
        var dayIdx = de.indexOf(day); if(dayIdx < 0) return;
        var e = pm(c.end), hasEnd = e !== null && e > s;
        out.push({ key: k, day: day, dayIdx: dayIdx, start: s, end: hasEnd ? e : s + 60, hasEnd: hasEnd,
          name: c.name, room: c.room || '', building: c.building || '', instructor: c.instructor || '' });
      });
      return out;
    },
    forCourse: function(name){
      return Schedule.entries().filter(function(e){ return e.name === name; })
        .sort(function(a, b){ return a.dayIdx - b.dayIdx || a.start - b.start; });
    },
    place: function(e){ return (e.building ? e.building + (e.room ? ' · ' : '') : '') + (e.room || ''); },
    status: function(now){
      now = now || new Date();
      var nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60, dayIdx = now.getDay();
      var all = Schedule.entries();
      var today = all.filter(function(e){ return e.dayIdx === dayIdx; }).sort(function(a, b){ return a.start - b.start; });
      today.forEach(function(e){ e.state = nowMin >= e.end ? 'done' : (nowMin >= e.start ? 'now' : 'up'); });
      var current = null, next = null;
      today.forEach(function(e){ if(e.state === 'now') current = e; });
      for(var i = 0; i < today.length; i++){ if(today[i].state === 'up'){ next = today[i]; break; } }
      var later = null;
      if(!next){
        for(var d = 1; d <= 7 && !later; d++){
          var idx = (dayIdx + d) % 7;
          var list = all.filter(function(e){ return e.dayIdx === idx; }).sort(function(a, b){ return a.start - b.start; });
          if(list.length) later = { entry: list[0], daysAhead: d, minutesUntil: d * 1440 - nowMin + list[0].start };
        }
      }
      return { now: now, nowMin: nowMin, dayIdx: dayIdx, today: today, current: current, next: next, later: later,
        doneCount: today.filter(function(e){ return e.state === 'done'; }).length };
    }
  };
  window.Schedule = Schedule;

  /* ============================================================
     أرضية النوافذ الجانبية (Sheet) — طبقة خاصة فوق المحتوى وتحت مودالات التعديل
     ============================================================ */
  var sheets = [];
  function openSheet(opts){
    var bd = document.createElement('div');
    bd.className = 'hub-sheet-backdrop';
    bd.innerHTML = '<div class="hub-sheet" role="dialog" aria-modal="true" aria-label="' + esc(opts.title || '') + '" tabindex="-1">' +
      '<div class="hub-sheet-head"><h3 class="hub-sheet-title"></h3><button type="button" class="hub-x" aria-label="إغلاق">✕</button></div>' +
      '<div class="hub-sheet-body"></div></div>';
    document.body.appendChild(bd);
    var s = { el: bd, panel: bd.querySelector('.hub-sheet'), body: bd.querySelector('.hub-sheet-body'),
      opener: document.activeElement, onClose: opts.onClose, closed: false };
    s.setTitle = function(t){ bd.querySelector('.hub-sheet-title').textContent = t; s.panel.setAttribute('aria-label', t); };
    s.setTitle(opts.title || '');
    s.close = function(){
      if(s.closed) return; s.closed = true;
      var i = sheets.indexOf(s); if(i > -1) sheets.splice(i, 1);
      bd.remove();
      if(s.onClose){ try{ s.onClose(); }catch(e){} }
      if(s.opener && s.opener.focus && document.contains(s.opener)){ try{ s.opener.focus(); }catch(e){} }
    };
    bd.addEventListener('click', function(e){ if(e.target === bd) s.close(); });
    bd.querySelector('.hub-x').addEventListener('click', s.close);
    /* حبس التركيز داخل النافذة (Tab/Shift+Tab) */
    s.panel.addEventListener('keydown', function(e){
      if(e.key !== 'Tab') return;
      var f = s.panel.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
      if(!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
    sheets.push(s);
    setTimeout(function(){ if(!s.closed) s.panel.focus(); }, 30);
    return s;
  }

  /* ============================================================
     2) يومي الجامعي (لوحة اليوم)
     ============================================================ */
  var myDayLast = '';
  function renderMyDay(){
    var el = document.getElementById('myDay'); if(!el) return;
    var st = Schedule.status(), tasks = sp().tasks || [], exams = sp().exams || [], today = todayStr();
    var now = st.now;

    /* --- بطاقة الحالة الرئيسية --- */
    var hero = '';
    function heroCard(kind, kicker, e, count, sub, pct){
      var place = Schedule.place(e);
      return '<div class="myday-hero ' + kind + '" data-course="' + esc(e.name) + '" role="button" tabindex="0" aria-label="' + esc(e.name) + '">' +
        '<div class="myday-kicker">' + kicker + '</div>' +
        '<div class="myday-title">' + esc(e.name) + '</div>' +
        '<div class="myday-meta"><span>⏰ <bdi dir="ltr">' + pad(e.start) + (e.hasEnd ? '–' + pad(e.end) : '') + '</bdi>' + (e.hasEnd ? ' (' + dur(e.end - e.start) + ')' : '') + '</span>' +
          (place ? '<span>📍 ' + esc(place) + '</span>' : '') + (e.instructor ? '<span>👤 ' + esc(e.instructor) + '</span>' : '') + '</div>' +
        (count ? '<div class="myday-count">' + count + '</div>' : '') +
        (pct !== null && pct !== undefined ? '<div class="myday-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' : '') +
        (sub ? '<div class="myday-sub">' + sub + '</div>' : '') +
        '</div>';
    }
    function laterText(l){
      var e = l.entry;
      return 'المحاضرة القادمة: <b>' + esc(e.name) + '</b> — ' + (l.daysAhead === 1 ? 'غداً' : DA()[e.dayIdx]) + ' <bdi dir="ltr">' + pad(e.start) + '</bdi> (بعد ' + until(l.minutesUntil) + ')';
    }
    if(st.current){
      var c = st.current, elapsed = st.nowMin - c.start;
      var nextLine = st.next ? 'بعدها: <b>' + esc(st.next.name) + '</b> بعد ' + until(st.next.start - st.nowMin) : (st.later ? laterText(st.later) : '');
      hero = heroCard('now', '🔴 جارية الآن', c,
        c.hasEnd ? 'باقي <b>' + until(c.end - st.nowMin) + '</b> · تنتهي <bdi dir="ltr">' + pad(c.end) + '</bdi>' : 'بدأت منذ ' + dur(Math.max(1, Math.floor(elapsed))),
        nextLine, c.hasEnd ? Math.min(100, Math.max(0, elapsed / (c.end - c.start) * 100)) : null);
    } else if(st.next){
      var nx = st.next;
      hero = heroCard('next', '⏭ المحاضرة القادمة', nx, 'بعد <b>' + until(nx.start - st.nowMin) + '</b> · الساعة <bdi dir="ltr">' + pad(nx.start) + '</bdi>', '', null);
    } else if(st.today.length){
      hero = '<div class="myday-hero done" data-go="timetable" role="button" tabindex="0"><div class="myday-kicker">✅ خلصت محاضرات اليوم</div>' +
        '<div class="myday-title">' + st.today.length + ' ' + (st.today.length === 1 ? 'محاضرة' : 'محاضرات') + ' انتهت</div>' +
        (st.later ? '<div class="myday-sub">' + laterText(st.later) + '</div>' : '') + '</div>';
    } else if(st.later){
      hero = '<div class="myday-hero free" data-go="timetable" role="button" tabindex="0"><div class="myday-kicker">🌴 ما في محاضرات اليوم</div>' +
        '<div class="myday-sub">' + laterText(st.later) + '</div></div>';
    } else {
      hero = '<div class="myday-hero empty"><div class="myday-kicker">📅 ما في محاضرات بجدولك</div>' +
        '<div class="myday-sub">أضف جدولك لتظهر هنا المحاضرة الحالية والقادمة والوقت المتبقي.</div>' +
        '<button type="button" class="btn btn-sm" data-myday-act="addclass">➕ إضافة محاضرات</button></div>';
    }

    /* --- المهام --- */
    var pending = tasks.filter(function(t){ return !t.done; });
    var dueToday = pending.filter(function(t){ return t.due === today; });
    var overdue = pending.filter(function(t){ return t.due && t.due < today; });
    var tiles = '';
    tiles += '<button type="button" class="myday-tile' + (dueToday.length ? ' hot' : '') + '" data-go="tasks" data-tf="pending">' +
      '<span class="myday-tile-ic">📝</span><span class="myday-num">' + dueToday.length + '</span>' +
      '<span class="myday-lbl">' + (dueToday.length === 1 ? 'مهمة مستحقة اليوم' : 'مهام مستحقة اليوم') + '</span>' +
      (dueToday.length ? '<span class="myday-note">' + esc(dueToday.slice(0, 2).map(function(t){ return t.title; }).join('، ')) + (dueToday.length > 2 ? '…' : '') + '</span>' : (tasks.length ? '<span class="myday-note">لا شي مستحق اليوم</span>' : '<span class="myday-note">لا مهام بعد</span>')) +
      '</button>';
    tiles += '<button type="button" class="myday-tile' + (overdue.length ? ' danger' : '') + '" data-go="tasks" data-tf="overdue">' +
      '<span class="myday-tile-ic">⚠️</span><span class="myday-num">' + overdue.length + '</span>' +
      '<span class="myday-lbl">' + (overdue.length === 1 ? 'مهمة متأخرة' : 'مهام متأخرة') + '</span>' +
      '<span class="myday-note">' + (overdue.length ? esc(overdue.slice(0, 2).map(function(t){ return t.title; }).join('، ')) + (overdue.length > 2 ? '…' : '') : 'ما في متأخرات') + '</span></button>';

    /* --- الامتحان القادم (الأقرب فعلاً بالتاريخ/الوقت) --- */
    var upcoming = exams.map(function(e){ return { e: e, dt: parseExamDate(e) }; })
      .filter(function(x){ return x.dt && x.dt.getTime() > now.getTime(); })
      .sort(function(a, b){ return a.dt - b.dt; });
    if(upcoming.length){
      var ux = upcoming[0], dd = daysFromToday(ux.dt);
      tiles += '<button type="button" class="myday-tile' + (dd <= 2 ? ' hot' : '') + '" data-go="exams">' +
        '<span class="myday-tile-ic">⏳</span><span class="myday-num sm">' + dayWord(dd) + '</span>' +
        '<span class="myday-lbl">' + esc(ux.e.name || 'امتحان') + '</span>' +
        '<span class="myday-note">' + (ux.e.course ? esc(ux.e.course) + ' · ' : '') + (/^\d{1,2}:\d{2}/.test(ux.e.time || '') ? '<bdi dir="ltr">' + esc(ux.e.time) + '</bdi>' : esc(ux.e.date)) + (upcoming.length > 1 ? ' · +' + (upcoming.length - 1) + ' قادمة' : '') + '</span></button>';
    } else {
      tiles += '<button type="button" class="myday-tile" data-go="exams"><span class="myday-tile-ic">⏳</span><span class="myday-num sm">—</span><span class="myday-lbl">لا امتحانات قادمة</span><span class="myday-note">' + (exams.length ? 'كل امتحاناتك المسجّلة انتهت' : 'أضف موعد امتحان') + '</span></button>';
    }

    /* --- إنجاز اليوم (من بيانات فعلية فقط) --- */
    var doneToday = tasks.filter(function(t){ return t.done && t.completedAt === today; }).length;
    var dueAll = tasks.filter(function(t){ return t.due === today; }), dueDone = dueAll.filter(function(t){ return t.done; }).length;
    var log = (window.S && window.S.get('studyLog', {})) || {}, studyMin = parseInt(log[today], 10) || 0;
    var lines = '';
    if(dueAll.length) lines += '<div class="myday-line"><span>مهام اليوم</span><b>' + dueDone + ' / ' + dueAll.length + '</b></div><div class="myday-bar slim"><i style="width:' + (dueDone / dueAll.length * 100).toFixed(1) + '%"></i></div>';
    if(doneToday) lines += '<div class="myday-line"><span>مهام أُنجزت اليوم</span><b>' + doneToday + '</b></div>';
    if(studyMin) lines += '<div class="myday-line"><span>وقت الدراسة</span><b>' + dur(studyMin) + '</b></div>';
    if(st.today.length) lines += '<div class="myday-line"><span>محاضرات انتهت</span><b>' + st.doneCount + ' / ' + st.today.length + '</b></div>';
    tiles += '<button type="button" class="myday-tile wide" data-go="' + (lines ? 'tasks' : 'timer') + '">' +
      '<span class="myday-tile-ic">🏁</span><span class="myday-lbl strong">إنجاز اليوم</span>' +
      (lines ? '<span class="myday-lines">' + lines + '</span>' : '<span class="myday-note">ما في إنجاز مسجّل بعد اليوم — ابدأ جلسة تركيز أو أنجز مهمة.</span>') + '</button>';

    var dateLabel = DA()[st.dayIdx] + ' ' + now.getDate() + '/' + (now.getMonth() + 1);
    var html = '<div class="myday-head"><h3>🧭 يومي الجامعي</h3><span class="myday-date">' + dateLabel + '</span></div>' + hero + '<div class="myday-grid">' + tiles + '</div>';
    if(html === myDayLast) return;
    myDayLast = html;
    el.innerHTML = html;
    bindMyDay(el);
  }
  function bindMyDay(el){
    var go = function(node){
      var tab = node.getAttribute('data-go'), tf = node.getAttribute('data-tf');
      if(tf && window.filterTasks) window.filterTasks(tf);
      if(tab && window.switchTab) window.switchTab(tab);
    };
    el.querySelectorAll('[data-go]').forEach(function(n){
      n.addEventListener('click', function(){ go(n); });
      n.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); go(n); } });
    });
    el.querySelectorAll('[data-course]').forEach(function(n){
      var open = function(){
        var c = findCourse(n.getAttribute('data-course'));
        if(c){ window.switchTab('courses'); openCourse(c.id); } else if(window.switchTab) window.switchTab('timetable');
      };
      n.addEventListener('click', open);
      n.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); } });
    });
    var add = el.querySelector('[data-myday-act="addclass"]');
    if(add) add.addEventListener('click', function(e){ e.stopPropagation(); if(window.openSmartTimetable) window.openSmartTimetable(); });
  }
  /* تحديث تلقائي: كل 20 ثانية والصفحة ظاهرة، وعند العودة للتبويب، وبعد أي تغيير بيانات (renderDashboard) */
  setInterval(function(){
    if(document.visibilityState === 'hidden') return;
    var el = document.getElementById('myDay');
    if(el && el.offsetParent !== null) renderMyDay();
  }, 20000);
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') renderMyDay(); });

  /* ============================================================
     تفاصيل المحاضرة (عند الضغط على محاضرة بالجدول)
     ============================================================ */
  window.showClassDetails = function(key){
    var tt = sp().timetable || {}, cls = tt[key];
    if(!cls){ return; }
    var e = null, all = Schedule.entries();
    for(var i = 0; i < all.length; i++){ if(all[i].key === key){ e = all[i]; break; } }
    if(!e) return;
    var st = Schedule.status(), state = '';
    if(e.dayIdx === st.dayIdx){
      if(st.nowMin >= e.end) state = '<span class="hub-pill muted">انتهت اليوم</span>';
      else if(st.nowMin >= e.start) state = '<span class="hub-pill danger">🔴 جارية — ' + (e.hasEnd ? 'باقي ' + until(e.end - st.nowMin) : 'بدأت منذ ' + dur(st.nowMin - e.start)) + '</span>';
      else state = '<span class="hub-pill ok">اليوم — بعد ' + until(e.start - st.nowMin) + '</span>';
    } else {
      var ahead = (e.dayIdx - st.dayIdx + 7) % 7;
      state = '<span class="hub-pill muted">' + (ahead === 1 ? 'غداً' : DA()[e.dayIdx]) + ' · بعد ' + until(ahead * 1440 - st.nowMin + e.start) + '</span>';
    }
    var conf = window.getTimetableConflicts ? window.getTimetableConflicts().keys[key] : false;
    var course = findCourse(e.name);
    var place = Schedule.place(e);
    var s = openSheet({ title: e.name });
    s.body.innerHTML =
      '<div class="hub-rows">' +
        '<div class="hub-row"><span>🗓 اليوم</span><b>' + DA()[e.dayIdx] + '</b></div>' +
        '<div class="hub-row"><span>⏰ الوقت</span><b><bdi dir="ltr">' + pad(e.start) + (e.hasEnd ? '–' + pad(e.end) : '') + '</bdi></b></div>' +
        '<div class="hub-row"><span>⌛ المدة</span><b>' + (e.hasEnd ? dur(e.end - e.start) : 'غير محددة (وقت النهاية غير مسجّل)') + '</b></div>' +
        (place ? '<div class="hub-row"><span>📍 المكان</span><b>' + esc(place) + '</b></div>' : '') +
        (e.instructor ? '<div class="hub-row"><span>👤 الدكتور</span><b>' + esc(e.instructor) + '</b></div>' : '') +
        '<div class="hub-row"><span>الحالة</span><b>' + state + '</b></div>' +
      '</div>' +
      (conf ? '<div class="hub-warn">⚠️ هذه المحاضرة متعارضة مع محاضرة ثانية بنفس اليوم.</div>' : '') +
      '<div class="hub-actions">' +
        (course ? '<button type="button" class="btn" data-ca="course">📚 فتح المادة</button>'
                : '<button type="button" class="btn" data-ca="addcourse">➕ إضافة إلى موادي</button>') +
        '<button type="button" class="btn btn-ghost" data-ca="edit">✏️ تعديل المحاضرة</button>' +
        '<button type="button" class="btn btn-danger" data-ca="del">🗑 حذف المحاضرة</button>' +
      '</div>';
    s.body.querySelector('[data-ca="edit"]').addEventListener('click', function(){ s.close(); if(window.editClassSlot) window.editClassSlot(key); });
    s.body.querySelector('[data-ca="del"]').addEventListener('click', function(){
      var run = function(){
        delete sp().timetable[key]; window.saveSpace();
        if(window.renderTimetable) window.renderTimetable();
        if(window.renderDashboard) window.renderDashboard();
        toast('🗑 حُذفت المحاضرة', 'success', 1800);
        s.close();
      };
      if(window.customConfirm) window.customConfirm('حذف محاضرة "' + e.name + '" (' + DA()[e.dayIdx] + ' ' + pad(e.start) + ')؟', run); else if(confirm('حذف المحاضرة؟')) run();
    });
    var cb = s.body.querySelector('[data-ca="course"]');
    if(cb) cb.addEventListener('click', function(){ s.close(); window.switchTab('courses'); openCourse(course.id); });
    var ab = s.body.querySelector('[data-ca="addcourse"]');
    if(ab) ab.addEventListener('click', function(){
      var known = (window.COURSES_DB || {})[e.name];
      var ok = window.addCourseEverywhere ? window.addCourseEverywhere(e.name, known ? known.code : '', known ? known.h : 3, { silent: true }) : false;
      if(ok === false) toast('المادة موجودة أصلاً', 'info', 2000); else toast('✅ أُضيفت "' + e.name + '" إلى موادي', 'success', 2000);
      s.close();
      var c2 = findCourse(e.name); if(c2){ window.switchTab('courses'); openCourse(c2.id); }
    });
  };

  /* ============================================================
     3) مركز إدارة المواد
     ============================================================ */
  var hub = { q: '', filter: 'all', sort: 'name' };
  var FILTERS = [
    { id: 'all', label: 'الكل' }, { id: 'today', label: '🎓 محاضرات اليوم' }, { id: 'tasks', label: '📝 عليها مهام' },
    { id: 'exam', label: '⏳ امتحان قريب' }, { id: 'lowatt', label: '⚠️ حضور منخفض' }, { id: 'nosched', label: '🗓 بدون جدول' }
  ];
  var SORTS = [ { id: 'name', label: 'الاسم' }, { id: 'exam', label: 'أقرب امتحان' }, { id: 'tasks', label: 'الأكثر مهام' } ];

  function attPct(name){
    var a = (sp().attendance || {})[name]; if(!a) return null;
    var tot = (a.present || 0) + (a.absent || 0);
    return tot ? Math.round((a.present || 0) / tot * 100) : null;
  }
  function gradePct(name){
    var g = (sp().grades || []).filter(function(x){ return x.name === name; })[0];
    if(!g || !g.items || !g.items.length) return null;
    var t = 0, e = 0;
    g.items.forEach(function(it){ t += parseFloat(it.weight) || 0; e += parseFloat(it.score) || 0; });
    return t > 0 ? Math.round(e / t * 100) : null;
  }
  function buildCtx(){
    var tasks = sp().tasks || [], exams = sp().exams || [], today = todayStr(), now = new Date(), by = {};
    function slot(n){ return by[n] || (by[n] = { pending: 0, overdue: 0, done: 0, exam: null, sched: [] }); }
    tasks.forEach(function(t){
      if(!t.course) return; var s = slot(t.course);
      if(t.done) s.done++; else { s.pending++; if(t.due && t.due < today) s.overdue++; }
    });
    exams.forEach(function(e){
      if(!e.course) return; var dt = parseExamDate(e);
      if(dt && dt.getTime() > now.getTime()){ var s = slot(e.course); if(!s.exam || dt < s.exam.dt) s.exam = { e: e, dt: dt }; }
    });
    Schedule.entries().forEach(function(en){ slot(en.name).sched.push(en); });
    Object.keys(by).forEach(function(k){ by[k].sched.sort(function(a, b){ return a.dayIdx - b.dayIdx || a.start - b.start; }); });
    return by;
  }
  function schedLine(list){
    return list.slice(0, 3).map(function(en){ return DA()[en.dayIdx] + ' <bdi dir="ltr">' + pad(en.start) + (en.hasEnd ? '–' + pad(en.end) : '') + '</bdi>'; }).join(' · ') + (list.length > 3 ? ' …' : '');
  }
  function matches(c, ctx){
    var q = hub.q.trim().toLowerCase();
    if(q){
      var places = (ctx.sched || []).map(function(en){ return Schedule.place(en); }).join(' ');
      var hay = [c.name, c.code, c.instructor, c.room, places].join(' ').toLowerCase();
      var toks = q.split(/\s+/), ok = true;
      toks.forEach(function(t){ if(hay.indexOf(t) === -1) ok = false; });
      if(!ok) return false;
    }
    var f = hub.filter, dayIdx = new Date().getDay();
    if(f === 'today') return (ctx.sched || []).some(function(en){ return en.dayIdx === dayIdx; });
    if(f === 'tasks') return ctx.pending > 0;
    if(f === 'exam') return !!ctx.exam && daysFromToday(ctx.exam.dt) <= 14;
    if(f === 'lowatt'){ var p = attPct(c.name); return p !== null && p < 75; }
    if(f === 'nosched') return !(ctx.sched || []).length;
    return true;
  }

  function ensureToolbar(grid){
    var bar = document.getElementById('hubBar');
    if(bar) return bar;
    bar = document.createElement('div');
    bar.id = 'hubBar'; bar.className = 'hub-bar';
    bar.innerHTML = '<div class="hub-search"><input type="search" id="hubSearch" placeholder="🔎 ابحث بالاسم أو الكود أو الدكتور أو القاعة…" aria-label="بحث في المواد" autocomplete="off"></div>' +
      '<div class="hub-filters" id="hubFilters" role="group" aria-label="تصفية المواد">' + FILTERS.map(function(f){ return '<button type="button" class="hub-chip" data-hf="' + f.id + '">' + f.label + '</button>'; }).join('') + '</div>' +
      '<div class="hub-sortrow"><label for="hubSort">ترتيب:</label><select id="hubSort">' + SORTS.map(function(s){ return '<option value="' + s.id + '">' + s.label + '</option>'; }).join('') + '</select><span class="hub-count" id="hubCount" aria-live="polite"></span></div>';
    grid.parentNode.insertBefore(bar, grid);
    var inp = bar.querySelector('#hubSearch'), timer = null;
    inp.addEventListener('input', function(){ clearTimeout(timer); timer = setTimeout(function(){ hub.q = inp.value; renderCourses(); }, 120); });
    inp.addEventListener('keydown', function(e){ if(e.key === 'Escape' && inp.value){ e.stopPropagation(); inp.value = ''; hub.q = ''; renderCourses(); } });
    bar.querySelectorAll('[data-hf]').forEach(function(b){ b.addEventListener('click', function(){ hub.filter = b.getAttribute('data-hf'); renderCourses(); }); });
    bar.querySelector('#hubSort').addEventListener('change', function(e){ hub.sort = e.target.value; renderCourses(); });
    return bar;
  }

  var hubObserver = null;
  function loadFileBadge(c){
    var els = document.querySelectorAll('[data-files-badge="' + c.id + '"]');
    if(!els.length) return;
    if(!window.SB || !window.SB.listCourseFilesMulti){ els.forEach(function(n){ n.textContent = '—'; }); return; }
    window.SB.listCourseFilesMulti(foldersOf(c)).then(function(files){
      document.querySelectorAll('[data-files-badge="' + c.id + '"]').forEach(function(n){ n.textContent = files === null ? '—' : String(files.length); });
    }, function(){});
  }

  function renderCourses(){
    var grid = document.getElementById('myCoursesGrid'); if(!grid) return;
    var bar = ensureToolbar(grid);
    var courses = sp().courses || [];
    var by = buildCtx();
    var list = courses.filter(function(c){ return matches(c, by[c.name] || { sched: [] }); });
    var coll = (typeof Intl !== 'undefined' && Intl.Collator) ? new Intl.Collator('ar') : null;
    list.sort(function(a, b){
      var ca = by[a.name] || {}, cb = by[b.name] || {};
      if(hub.sort === 'exam'){
        var ea = ca.exam ? ca.exam.dt.getTime() : Infinity, eb = cb.exam ? cb.exam.dt.getTime() : Infinity;
        if(ea !== eb) return ea - eb;
      } else if(hub.sort === 'tasks'){
        var d = (cb.pending || 0) - (ca.pending || 0); if(d) return d;
      }
      return coll ? coll.compare(a.name, b.name) : String(a.name).localeCompare(b.name);
    });

    /* حالة الأدوات: لا نعيد بناء الأدوات حتى لا نفقد النص المكتوب */
    var inp = bar.querySelector('#hubSearch'); if(inp && document.activeElement !== inp && inp.value !== hub.q) inp.value = hub.q;
    bar.querySelectorAll('[data-hf]').forEach(function(b){ var on = b.getAttribute('data-hf') === hub.filter; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var sel = bar.querySelector('#hubSort'); if(sel && sel.value !== hub.sort) sel.value = hub.sort;
    bar.querySelector('#hubCount').textContent = courses.length ? (list.length === courses.length ? courses.length + ' مادة' : list.length + ' من ' + courses.length) : '';
    bar.style.display = courses.length ? '' : 'none';

    if(hubObserver){ hubObserver.disconnect(); hubObserver = null; }
    if(!courses.length){
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="ic">📚</div><p>لا توجد مواد بعد</p><p class="sub">أضف مادة، أو استورد مواد فصلك من الخطة بضغطة واحدة.</p>' +
        '<div class="hub-empty-actions"><button type="button" class="btn" data-ea="add">+ مادة</button><button type="button" class="btn btn-ghost" data-ea="plan">📥 استيراد من الخطة</button></div></div>';
      var a = grid.querySelector('[data-ea="add"]'); if(a) a.addEventListener('click', function(){ window.addMyCourse(); });
      var p = grid.querySelector('[data-ea="plan"]'); if(p) p.addEventListener('click', function(){ window.importFromPlan(); });
      return;
    }
    if(!list.length){
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="ic">🔎</div><p>ما في مواد مطابقة</p><p class="sub">جرّب كلمة ثانية أو أزل التصفية.</p><div class="hub-empty-actions"><button type="button" class="btn btn-ghost" data-ea="reset">إعادة ضبط البحث</button></div></div>';
      var r = grid.querySelector('[data-ea="reset"]'); if(r) r.addEventListener('click', function(){ hub.q = ''; hub.filter = 'all'; if(inp) inp.value = ''; renderCourses(); });
      return;
    }

    var html = '';
    list.forEach(function(c){
      var cx = by[c.name] || { pending: 0, overdue: 0, sched: [], exam: null };
      var ap = attPct(c.name), gp = gradePct(c.name);
      var first = cx.sched[0], place = first ? Schedule.place(first) : '';
      var apc = ap === null ? '' : ap >= 85 ? 'ok' : ap >= 75 ? 'warn' : 'bad';
      html += '<div class="card hub-card" data-course-card="' + esc(c.id) + '" tabindex="0" role="button" aria-label="فتح مادة ' + esc(c.name) + '">' +
        '<div class="hub-card-head"><div class="hub-card-title"><b>' + esc(c.name) + '</b>' + (c.code ? '<small>' + esc(c.code) + '</small>' : '') + '</div>' +
          '<div class="hub-card-actions"><button type="button" class="btn btn-sm btn-ghost" data-edit-course="' + esc(c.id) + '" title="تعديل المادة" aria-label="تعديل ' + esc(c.name) + '">✏️</button>' +
          '<button type="button" class="unified-course-btn added" data-course-name="' + esc(c.name) + '" title="حذف المادة" aria-label="حذف ' + esc(c.name) + '">🗑</button></div></div>' +
        '<div class="hub-chips"><span class="badge">' + (c.hours || 3) + ' ساعات</span>' +
          (c.instructor ? '<span class="badge">👤 ' + esc(c.instructor) + '</span>' : '') +
          ((c.room || place) ? '<span class="badge">📍 ' + esc(place || c.room) + '</span>' : '') + '</div>' +
        (cx.sched.length ? '<div class="hub-sched">🗓 ' + schedLine(cx.sched) + '</div>' : '<div class="hub-sched none">🗓 لا محاضرات بالجدول</div>') +
        '<div class="hub-stats">' +
          '<span class="hub-stat ' + apc + '" title="الحضور">✅ ' + (ap === null ? '—' : ap + '%') + '</span>' +
          '<span class="hub-stat" title="العلامة حتى الآن">📊 ' + (gp === null ? '—' : gp + '%') + '</span>' +
          '<span class="hub-stat ' + (cx.overdue ? 'bad' : (cx.pending ? 'warn' : '')) + '" title="مهام متبقية">📝 ' + cx.pending + (cx.overdue ? ' (' + cx.overdue + ' متأخرة)' : '') + '</span>' +
          (cx.exam ? '<span class="hub-stat ' + (daysFromToday(cx.exam.dt) <= 3 ? 'warn' : '') + '" title="' + esc(cx.exam.e.name || 'امتحان') + '">⏳ ' + dayWord(daysFromToday(cx.exam.dt)) + '</span>' : '') +
          '<span class="hub-stat" title="ملفات المادة">📎 <span data-files-badge="' + esc(c.id) + '">…</span></span>' +
        '</div>' +
        '<div class="hub-open">فتح المادة ‹</div></div>';
    });
    grid.innerHTML = html;

    grid.querySelectorAll('[data-course-card]').forEach(function(card){
      var id = card.getAttribute('data-course-card');
      card.addEventListener('click', function(e){ if(e.target.closest('button')) return; openCourse(id); });
      card.addEventListener('keydown', function(e){ if(e.target === card && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); openCourse(id); } });
    });
    grid.querySelectorAll('[data-edit-course]').forEach(function(b){
      b.addEventListener('click', function(e){ e.stopPropagation(); window.editCourseDialog(b.getAttribute('data-edit-course')); });
    });
    grid.querySelectorAll('.unified-course-btn').forEach(function(b){
      b.addEventListener('click', function(e){ e.stopPropagation(); window.confirmRemoveCourse(b.getAttribute('data-course-name')); });
    });

    /* عدّاد الملفات: يُحمَّل فقط عند ظهور البطاقة (لا طلبات للكل دفعة وهي مخفية) */
    var load = function(id){ var c = findCourse(id); if(c) loadFileBadge(c); };
    if(window.IntersectionObserver){
      hubObserver = new IntersectionObserver(function(entries, obs){
        entries.forEach(function(en){ if(en.isIntersecting){ obs.unobserve(en.target); load(en.target.getAttribute('data-course-card')); } });
      }, { rootMargin: '200px' });
      grid.querySelectorAll('[data-course-card]').forEach(function(card){ hubObserver.observe(card); });
    } else {
      list.forEach(function(c){ loadFileBadge(c); });
    }
  }
  window.renderCourses = renderCourses;

  /* ---------- نافذة المادة ---------- */
  var activeCourse = null;   /* { sheet, id } */
  function openCourse(ref, section){
    var c = findCourse(ref); if(!c) return;
    if(activeCourse && !activeCourse.sheet.closed) activeCourse.sheet.close();
    var sheet = openSheet({ title: c.name, onClose: function(){
      var cur = findCourse(activeCourse && activeCourse.id); activeCourse = null;
      if(cur) loadFileBadge(cur);
    } });
    sheet.el.classList.add('hub-course-sheet');
    activeCourse = { sheet: sheet, id: c.id };
    renderCourseSheet(section);
  }
  window.Hub = window.Hub || {};
  window.Hub.openCourse = openCourse;
  window.Hub.renderCourses = renderCourses;

  function refreshActiveCourse(){
    if(activeCourse && !activeCourse.sheet.closed) renderCourseSheet();
  }

  function renderCourseSheet(scrollTo){
    if(!activeCourse) return;
    var sheet = activeCourse.sheet, c = findCourse(activeCourse.id);
    if(!c){ sheet.close(); return; }          /* المادة انحذفت */
    var name = c.name, id = c.id, today = todayStr();
    var scroll = sheet.body.scrollTop;
    sheet.setTitle(name);

    var sched = Schedule.forCourse(name);
    var tasks = (sp().tasks || []).filter(function(t){ return t.course === name; });
    tasks.sort(function(a, b){
      if(!!a.done !== !!b.done) return a.done ? 1 : -1;
      return String(a.due || '9999').localeCompare(String(b.due || '9999'));
    });
    var exams = (sp().exams || []).filter(function(e){ return e.course === name; }).sort(function(a, b){ return String(a.date || '').localeCompare(String(b.date || '')); });
    var g = (sp().grades || []).filter(function(x){ return x.name === name; })[0];
    var att = (sp().attendance || {})[name] || { present: 0, absent: 0 };
    var attTot = (att.present || 0) + (att.absent || 0), ap = attTot ? Math.round((att.present || 0) / attTot * 100) : null;
    var notes = []; (window.notes || []).forEach(function(n, i){ if(n && n.course === name) notes.push({ n: n, i: i }); });

    var h = '';
    h += '<div class="hub-course-top">' +
      '<div class="hub-chips">' + (c.code ? '<span class="badge mono">' + esc(c.code) + '</span>' : '') + '<span class="badge">' + (c.hours || 3) + ' ساعات</span>' +
        (c.instructor ? '<span class="badge">👤 ' + esc(c.instructor) + '</span>' : '') + (c.room ? '<span class="badge">📍 ' + esc(c.room) + '</span>' : '') + '</div>' +
      '<div class="hub-actions inline"><button type="button" class="btn btn-sm btn-ghost" data-act="edit">✏️ تعديل</button><button type="button" class="btn btn-sm btn-danger" data-act="delete">🗑 حذف</button></div></div>';
    h += '<nav class="hub-secnav" aria-label="أقسام المادة">' + [['sched','🗓 الجدول'],['files','📎 الملفات'],['tasks','📝 المهام'],['exams','⏳ الامتحانات'],['grades','📊 العلامات'],['att','✅ الحضور'],['notes','📔 ملاحظات']]
      .map(function(s){ return '<button type="button" class="hub-chip" data-jump="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</nav>';

    /* الجدول */
    h += '<section class="hub-sec" id="hs-sched"><h4>🗓 محاضرات المادة</h4>';
    if(sched.length) h += '<div class="hub-list">' + sched.map(function(en){
      return '<button type="button" class="hub-li" data-sched-day="' + en.day + '"><span><b>' + DA()[en.dayIdx] + '</b> <bdi dir="ltr">' + pad(en.start) + (en.hasEnd ? '–' + pad(en.end) : '') + '</bdi></span><span class="muted">' + esc(Schedule.place(en) || '') + '</span></button>';
    }).join('') + '</div>';
    else h += '<div class="hub-empty">ما في محاضرات لهذه المادة بالجدول. <button type="button" class="hub-link" data-act="addclass">إضافة محاضرة</button></div>';
    h += '</section>';

    /* الملفات (نفس السمات التي تستخدمها دوال الرفع/التحميل الحالية) */
    h += '<section class="hub-sec" id="hs-files"><h4>📎 الملفات <span class="muted" data-files-count="' + esc(id) + '">—</span></h4>' +
      '<div class="course-files-list" data-files-list="' + esc(id) + '"><div class="hub-empty">جاري التحميل…</div></div>' +
      '<button type="button" class="upload-course-btn" data-upload-course="' + esc(id) + '">📤 رفع ملف</button>' +
      '<input type="file" style="display:none" data-file-input="' + esc(id) + '">' +
      '<div class="upload-progress-bar" data-upload-progress="' + esc(id) + '"><div class="inner"></div></div></section>';

    /* المهام */
    h += '<section class="hub-sec" id="hs-tasks"><h4>📝 المهام <span class="muted">' + tasks.filter(function(t){ return !t.done; }).length + ' متبقية</span></h4>';
    if(tasks.length) h += '<div class="hub-list">' + tasks.slice(0, 10).map(function(t){
      var late = !t.done && t.due && t.due < today;
      return '<div class="hub-li task' + (t.done ? ' done' : '') + '"><button type="button" class="hub-check" data-task-toggle="' + esc(t.id) + '" aria-label="' + (t.done ? 'إلغاء الإكمال' : 'إكمال') + '">' + (t.done ? '☑' : '☐') + '</button>' +
        '<span class="hub-li-main">' + esc(t.title) + (t.due ? '<small class="' + (late ? 'bad' : '') + '">' + esc(t.due) + (late ? ' · متأخرة' : '') + '</small>' : '') + '</span>' +
        '<button type="button" class="hub-mini" data-task-edit="' + esc(t.id) + '" aria-label="تعديل المهمة">✏️</button></div>';
    }).join('') + (tasks.length > 10 ? '<button type="button" class="hub-link" data-act="alltasks">عرض كل المهام (' + tasks.length + ')</button>' : '') + '</div>';
    else h += '<div class="hub-empty">لا مهام لهذه المادة.</div>';
    h += '<button type="button" class="btn btn-sm" data-act="addtask">+ مهمة</button></section>';

    /* الامتحانات */
    h += '<section class="hub-sec" id="hs-exams"><h4>⏳ الامتحانات</h4>';
    if(exams.length) h += '<div class="hub-list">' + exams.map(function(e){
      var dt = parseExamDate(e), dd = dt ? daysFromToday(dt) : null, past = dt && dt.getTime() < Date.now();
      return '<div class="hub-li' + (past ? ' done' : '') + '"><span class="hub-li-main">' + esc(e.name) + '<small>' + esc(e.date || '') + (e.time ? ' · ' + esc(e.time) : '') + (e.room ? ' · ' + esc(e.room) : '') + '</small></span>' +
        '<span class="hub-pill ' + (past ? 'muted' : (dd !== null && dd <= 3 ? 'danger' : 'ok')) + '">' + (past ? 'انتهى' : (dd === null ? '' : dayWord(dd))) + '</span>' +
        '<button type="button" class="hub-mini" data-exam-edit="' + esc(e.id) + '" aria-label="تعديل الامتحان">✏️</button></div>';
    }).join('') + '</div>';
    else h += '<div class="hub-empty">لا امتحانات مسجّلة لهذه المادة.</div>';
    h += '<button type="button" class="btn btn-sm" data-act="addexam">+ امتحان</button></section>';

    /* العلامات */
    var gItems = (g && g.items) || [], gt = 0, ge = 0; gItems.forEach(function(it){ gt += parseFloat(it.weight) || 0; ge += parseFloat(it.score) || 0; });
    h += '<section class="hub-sec" id="hs-grades"><h4>📊 العلامات ' + (gt > 0 ? '<span class="muted">' + ge + ' / ' + gt + ' (' + Math.round(ge / gt * 100) + '%)</span>' : '') + '</h4>';
    if(gItems.length) h += '<div class="hub-list">' + gItems.map(function(it, i){
      return '<div class="hub-li"><span class="hub-li-main">' + esc(it.name) + '</span><b>' + esc(it.score) + ' / ' + esc(it.weight) + '</b><button type="button" class="hub-mini" data-grade-del="' + i + '" aria-label="حذف العلامة">✕</button></div>';
    }).join('') + '</div>'; else h += '<div class="hub-empty">ما في علامات مسجّلة بعد.</div>';
    h += '<div class="hub-actions inline"><button type="button" class="btn btn-sm" data-act="addgrade">+ علامة</button><button type="button" class="btn btn-sm btn-ghost" data-act="gradecalc">حاسبة العلامات ‹</button></div></section>';

    /* الحضور */
    h += '<section class="hub-sec" id="hs-att"><h4>✅ الحضور ' + (ap !== null ? '<span class="muted ' + (ap >= 85 ? 'ok' : ap >= 75 ? 'warn' : 'bad') + '">' + ap + '%</span>' : '') + '</h4>' +
      '<div class="hub-rows"><div class="hub-row"><span>حاضر</span><b>' + (att.present || 0) + '</b></div><div class="hub-row"><span>غائب</span><b>' + (att.absent || 0) + '</b></div></div>' +
      '<div class="hub-actions inline"><button type="button" class="btn btn-sm" data-att="present">+ حاضر</button><button type="button" class="btn btn-sm btn-ghost" data-att="absent">+ غائب</button></div></section>';

    /* الملاحظات */
    h += '<section class="hub-sec" id="hs-notes"><h4>📔 ملاحظات المادة</h4>';
    if(notes.length) h += '<div class="hub-list">' + notes.slice(0, 6).map(function(x){
      return '<button type="button" class="hub-li" data-note-open="1"><span class="hub-li-main">' + esc(x.n.title || '(بدون عنوان)') + '<small>' + esc(String(x.n.body || '').slice(0, 70)) + '</small></span></button>';
    }).join('') + '</div>'; else h += '<div class="hub-empty">لا ملاحظات مرتبطة بهذه المادة.</div>';
    h += '<button type="button" class="btn btn-sm" data-act="addnote">+ ملاحظة</button></section>';

    sheet.body.innerHTML = h;
    bindCourseSheet(sheet, c);
    if(window.loadCourseFilesForCard) window.loadCourseFilesForCard(id);
    if(scrollTo){ var t = sheet.body.querySelector('#hs-' + scrollTo); if(t) t.scrollIntoView({ block: 'start' }); }
    else sheet.body.scrollTop = scroll;
  }

  function bindCourseSheet(sheet, c){
    var b = sheet.body, name = c.name, id = c.id;
    function on(sel, fn){ b.querySelectorAll(sel).forEach(function(el){ el.addEventListener('click', function(e){ fn(el, e); }); }); }
    on('[data-act="edit"]', function(){ window.editCourseDialog(id); });
    on('[data-act="delete"]', function(){ window.confirmRemoveCourse(name); });
    on('[data-act="addclass"]', function(){ sheet.close(); if(window.addClassSlot) window.addClassSlot(); });
    on('[data-act="alltasks"]', function(){ sheet.close(); window.switchTab('tasks'); });
    on('[data-act="gradecalc"]', function(){ sheet.close(); window.switchTab('gradecalc'); });
    on('[data-jump]', function(el){ var t = b.querySelector('#hs-' + el.getAttribute('data-jump')); if(t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
    on('[data-sched-day]', function(el){ try{ localStorage.setItem('tt_view', el.getAttribute('data-sched-day')); }catch(e){} sheet.close(); window.switchTab('timetable'); });
    on('[data-task-toggle]', function(el){ window.toggleTask(el.getAttribute('data-task-toggle')); });
    on('[data-task-edit]', function(el){ window.editTask(el.getAttribute('data-task-edit')); });
    on('[data-exam-edit]', function(el){ window.editExam(el.getAttribute('data-exam-edit')); });
    on('[data-att]', function(el){ window.markAttendance(name, el.getAttribute('data-att')); });
    on('[data-note-open]', function(){ sheet.close(); window.switchTab('notes'); });
    on('[data-grade-del]', function(el){
      var g = (sp().grades || []).filter(function(x){ return x.name === name; })[0]; if(!g) return;
      g.items.splice(parseInt(el.getAttribute('data-grade-del'), 10), 1); window.saveSpace();
      if(window.renderGradeCalc) window.renderGradeCalc(); afterChange();
    });
    on('[data-act="addtask"]', function(){ addTaskFor(name); });
    on('[data-act="addexam"]', function(){ window.addExamForCourse(name); });
    on('[data-act="addgrade"]', function(){ addGradeFor(name); });
    on('[data-act="addnote"]', function(){ addNoteFor(name); });
    /* رفع الملفات: نفس منطق الرفع الحالي */
    on('[data-upload-course]', function(){ var inp = b.querySelector('[data-file-input="' + id + '"]'); if(inp) inp.click(); });
    b.querySelectorAll('[data-file-input]').forEach(function(inp){
      inp.addEventListener('change', function(e){
        var f = e.target.files[0]; if(!f) return;
        window.handleCourseFileUpload(inp.getAttribute('data-file-input'), f);
        inp.value = '';
      });
    });
  }

  function addTaskFor(name){
    window.showModal('مهمة جديدة — ' + name, [
      { key: 'title', label: 'العنوان' },
      { key: 'type', label: 'النوع', type: 'select', options: [{ v: 'task', l: 'مهمة' }, { v: 'assignment', l: 'واجب' }, { v: 'quiz', l: 'كويز' }, { v: 'project', l: 'مشروع' }] },
      { key: 'due', label: 'تاريخ التسليم', type: 'date' }
    ], { title: '', type: 'task', due: '' }, function(data){
      if(!data.title){ toast('أدخل عنوانًا', 'warn'); return false; }
      if(!sp().tasks) window.space.tasks = [];
      window.space.tasks.push({ id: window.uid ? window.uid() : Date.now().toString(36), title: data.title, type: data.type, course: name, due: data.due, done: false });
      window.saveSpace(); if(window.renderTasks) window.renderTasks(); afterChange();
      return true;
    });
  }
  function addGradeFor(name){
    window.showModal('علامة — ' + name, [
      { key: 'name', label: 'اسم التقييم (مثل: امتحان 1)' },
      { key: 'score', label: 'العلامة', type: 'number' },
      { key: 'weight', label: 'من (الوزن)', type: 'number' }
    ], { name: '', score: 0, weight: 10 }, function(data){
      if(!data.name){ toast('أدخل اسمًا', 'warn'); return false; }
      var score = parseFloat(data.score) || 0, weight = parseFloat(data.weight) || 0;
      if(score > weight){ toast('⚠️ العلامة أكبر من الوزن', 'warn', 2500); return false; }
      if(!Array.isArray(sp().grades)) window.space.grades = [];
      var g = window.space.grades.filter(function(x){ return x.name === name; })[0];
      if(!g){ g = { name: name, items: [] }; window.space.grades.push(g); }
      if(!Array.isArray(g.items)) g.items = [];
      g.items.push({ name: data.name, score: score, weight: weight });
      window.saveSpace(); if(window.renderGradeCalc) window.renderGradeCalc(); afterChange();
      return true;
    });
  }
  function addNoteFor(name){
    window.showModal('ملاحظة — ' + name, [
      { key: 'title', label: 'العنوان' },
      { key: 'body', label: 'النص', type: 'textarea' }
    ], { title: '', body: '' }, function(data){
      if(!data.title && !data.body){ toast('اكتب عنواناً أو نصاً', 'warn'); return false; }
      window.notes.unshift({ title: data.title, body: data.body, ts: Date.now(), course: name });
      if(window.S) window.S.set('notes', window.notes);
      if(window.renderNotes) window.renderNotes(); afterChange();
      return true;
    });
  }

  /* ============================================================
     4) الإضافة السريعة السياقية + لوحة الأوامر
     ============================================================ */
  var TAB_ADD = {
    courses: { fab: 'course', run: function(){ window.addMyCourse(); } },
    tasks: { fab: 'task', run: function(){ window.addTask(); } },
    exams: { fab: 'exam', run: function(){ window.addExam(); } },
    notes: { fab: 'note', run: function(){ window.addNote(); } },
    budget: { fab: 'budget', run: function(){ window.addBudgetItem('expense'); } },
    timetable: { fab: 'quick', run: function(){ window.addClassSlot(); } },
    attendance: { fab: 'quick', run: function(){ window.addAttendanceCourse(); } }
  };
  function currentTab(){ var s = $('.section.active'); return s ? s.id : 'dashboard'; }
  function quickAddHere(){
    var t = TAB_ADD[currentTab()];
    if(t) t.run(); else if(window.openQuickCapture) window.openQuickCapture();
  }
  window.quickAddHere = quickAddHere;
  function markFab(){
    var ctx = TAB_ADD[currentTab()], fab = ctx ? ctx.fab : 'quick';
    document.querySelectorAll('.fab-action[data-fab]').forEach(function(b){ b.classList.toggle('ctx', b.getAttribute('data-fab') === fab); });
  }
  /* switchTab يُعرَّف في app.js (يُحمَّل بعد hub.js) — نغلّفه من initUI بعد اكتمال التحميل */
  function wrapSwitchTab(){
    if(typeof window.switchTab !== 'function' || window._hubSwitchWrapped) return;
    var origSwitch = window.switchTab;
    window.switchTab = function(){
      var r = origSwitch.apply(this, arguments);
      setTimeout(markFab, 0);
      return r;
    };
    window._hubSwitchWrapped = true;
  }

  /* --- لوحة الأوامر --- */
  var palette = null;
  var SHORTCUTS = [
    ['Alt + K', 'فتح لوحة الأوامر'], ['؟  /  ?', 'عرض الاختصارات'], ['/', 'التركيز على البحث'],
    ['Alt + 1…6', 'الرئيسية، الجدول، موادي، المهام، الحضور، علاماتي'], ['Alt + A', 'إضافة حسب الصفحة الحالية'],
    ['Alt + Q', 'إضافة سريعة بالنص'], ['Alt + T', 'مهمة جديدة'], ['Alt + N', 'ملاحظة جديدة'], ['Alt + P', 'المؤقت'], ['Esc', 'إغلاق أي نافذة']
  ];
  function paletteCommands(){
    var out = [], idxHints = { dashboard: 'Alt+1', timetable: 'Alt+2', courses: 'Alt+3', tasks: 'Alt+4', attendance: 'Alt+5', gradecalc: 'Alt+6' };
    document.querySelectorAll('.nav-item[data-tab]').forEach(function(n){
      var tab = n.getAttribute('data-tab'), lbl = (n.querySelector('.label') || n).textContent.trim(), ic = (n.querySelector('.ic') || {}).textContent || '➡️';
      out.push({ cat: 'تنقل', icon: ic, label: 'اذهب إلى: ' + lbl, kw: tab, hint: idxHints[tab] || '', run: function(){ window.switchTab(tab); } });
    });
    var act = [
      ['📝', 'إضافة مهمة', 'task مهمة واجب', 'Alt+T', function(){ window.addTask(); }],
      ['⏳', 'إضافة امتحان', 'exam امتحان اختبار', '', function(){ window.addExam(); }],
      ['📔', 'إضافة ملاحظة', 'note ملاحظة', 'Alt+N', function(){ window.addNote(); }],
      ['📚', 'إضافة مادة', 'course مادة', '', function(){ window.addMyCourse(); }],
      ['🗓', 'إضافة محاضرة / جدول', 'class lecture محاضرة جدول', '', function(){ if(window.openSmartTimetable) window.openSmartTimetable(); }],
      ['💰', 'إضافة مصروف', 'expense مصروف', '', function(){ window.addBudgetItem('expense'); }],
      ['⚡', 'إضافة سريعة بالنص', 'quick capture', 'Alt+Q', function(){ window.openQuickCapture(); }],
      ['➕', 'أضف هنا (حسب الصفحة الحالية)', 'add here', 'Alt+A', quickAddHere],
      ['⏱️', 'المؤقت (التركيز)', 'timer pomodoro مؤقت بومودورو', 'Alt+P', function(){ window.switchTab('timer'); }],
      ['💾', 'تصدير نسخة احتياطية', 'backup export نسخة', '', function(){ window.downloadBackup(false); }],
      ['📥', 'استيراد نسخة احتياطية', 'restore import', '', function(){ window.restoreFromFile(); }],
      ['☁️', 'المزامنة السحابية', 'sync cloud مزامنة', '', function(){ if(window.SB) window.SB.showSyncPanel(); }],
      ['🖨️', 'طباعة / تصدير PDF', 'print pdf طباعة', '', function(){ window.exportPDF(); }],
      ['🧩', 'تخصيص لوحة التحكم', 'customize dashboard تخصيص لوحة', '', function(){ window.switchTab('dashboard'); dsOpenEditor(); }],
      ['↺', 'استعادة ترتيب لوحة التحكم الافتراضي', 'reset dashboard layout استعادة ترتيب', '', function(){ window.switchTab('dashboard'); dsConfirmReset(); }],
      ['⌨️', 'عرض الاختصارات', 'help shortcuts مساعدة اختصارات', '؟', function(){ openPalette('help'); }]
    ];
    act.forEach(function(a){ out.push({ cat: 'أوامر', icon: a[0], label: a[1], kw: a[2], hint: a[3], run: a[4] }); });
    (window.THEMES || []).forEach(function(t){ out.push({ cat: 'الثيم', icon: '🎨', label: 'الثيم: ' + t.name, kw: 'theme ثيم ' + t.id, hint: '', run: function(){ window.applyTheme(t.id, true); } }); });
    return out;
  }
  function paletteData(q){
    var res = [], tok = q.toLowerCase().split(/\s+/).filter(Boolean);
    function hit(text){ var h = String(text || '').toLowerCase(); return tok.every(function(t){ return h.indexOf(t) > -1; }); }
    (sp().courses || []).forEach(function(c){
      if(hit(c.name + ' ' + (c.code || '') + ' ' + (c.instructor || '') + ' ' + (c.room || ''))) res.push({ cat: 'المواد', icon: '📚', label: c.name, hint: c.code || '', run: function(){ window.switchTab('courses'); openCourse(c.id); } });
    });
    (sp().tasks || []).forEach(function(t){
      if(t.title && hit(t.title + ' ' + (t.course || ''))) res.push({ cat: 'المهام', icon: t.done ? '☑' : '☐', label: t.title, hint: t.due || '', run: function(){ window.switchTab('tasks'); } });
    });
    (sp().exams || []).forEach(function(e){
      if(e.name && hit(e.name + ' ' + (e.course || ''))) res.push({ cat: 'الامتحانات', icon: '⏳', label: e.name, hint: e.date || '', run: function(){ window.switchTab('exams'); } });
    });
    (window.notes || []).forEach(function(n){
      if(n && hit((n.title || '') + ' ' + (n.body || ''))) res.push({ cat: 'الملاحظات', icon: '📔', label: n.title || String(n.body || '').slice(0, 40), hint: n.course || '', run: function(){ window.switchTab('notes'); } });
    });
    return res;
  }
  function openPalette(mode){
    if(palette) { palette.input.focus(); if(mode === 'help') renderPalette('?'); return; }
    var bd = document.createElement('div');
    bd.className = 'cmdk-backdrop';
    bd.innerHTML = '<div class="cmdk" role="dialog" aria-modal="true" aria-label="لوحة الأوامر">' +
      '<div class="cmdk-input"><span aria-hidden="true">⌘</span><input type="text" id="cmdkInput" placeholder="اكتب أمراً أو ابحث في موادك ومهامك…  (؟ للمساعدة)" autocomplete="off" aria-label="لوحة الأوامر" aria-controls="cmdkList"></div>' +
      '<div class="cmdk-list" id="cmdkList" role="listbox"></div>' +
      '<div class="cmdk-foot"><span>↑↓ تنقل</span><span>Enter تنفيذ</span><span>Esc إغلاق</span></div></div>';
    document.body.appendChild(bd);
    palette = { el: bd, input: bd.querySelector('#cmdkInput'), list: bd.querySelector('#cmdkList'), items: [], active: 0, opener: document.activeElement };
    bd.addEventListener('click', function(e){ if(e.target === bd) closePalette(); });
    palette.input.addEventListener('input', function(){ renderPalette(palette.input.value); });
    palette.input.addEventListener('keydown', function(e){
      if(e.key === 'ArrowDown'){ e.preventDefault(); setPaletteActive(Math.min(palette.items.length - 1, palette.active + 1)); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); setPaletteActive(Math.max(0, palette.active - 1)); }
      else if(e.key === 'Enter'){ e.preventDefault(); runPaletteItem(palette.active); }
      else if(e.key === 'Tab'){ e.preventDefault(); }
    });
    renderPalette(mode === 'help' ? '?' : '');
    if(mode === 'help') palette.input.value = '؟';
    palette.input.focus();
  }
  function closePalette(){
    if(!palette) return false;
    var p = palette; palette = null; p.el.remove();
    if(p.opener && p.opener.focus && document.contains(p.opener)){ try{ p.opener.focus(); }catch(e){} }
    return true;
  }
  function setPaletteActive(i){
    if(!palette) return;
    palette.active = i;
    palette.list.querySelectorAll('.cmdk-item').forEach(function(el, k){
      el.classList.toggle('active', k === i); el.setAttribute('aria-selected', k === i ? 'true' : 'false');
      if(k === i && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    });
  }
  function runPaletteItem(i){
    if(!palette || !palette.items[i]) return;
    var it = palette.items[i];
    closePalette();
    setTimeout(function(){ try{ it.run(); }catch(e){ console.error(e); toast('تعذّر تنفيذ الأمر', 'warn', 2200); } }, 30);
  }
  function renderPalette(q){
    if(!palette) return;
    q = String(q || '').trim();
    if(q === '?' || q === '؟'){
      palette.items = []; palette.active = -1;
      palette.list.innerHTML = '<div class="cmdk-help">' + SHORTCUTS.map(function(s){ return '<div class="cmdk-help-row"><kbd>' + esc(s[0]) + '</kbd><span>' + esc(s[1]) + '</span></div>'; }).join('') + '</div>';
      return;
    }
    var items = [];
    var cmds = paletteCommands();
    if(q){
      var tok = q.toLowerCase().split(/\s+/).filter(Boolean);
      cmds = cmds.filter(function(c){ var h = (c.label + ' ' + c.kw).toLowerCase(); return tok.every(function(t){ return h.indexOf(t) > -1; }); });
      cmds.sort(function(a, b){ return a.label.toLowerCase().indexOf(tok[0]) - b.label.toLowerCase().indexOf(tok[0]); });
      items = cmds.slice(0, 8).concat(paletteData(q).slice(0, 10));
    } else {
      /* بدون نص: الإضافات والأوامر أولاً ثم التنقل (الثيمات تظهر عند البحث فقط) */
      var rest = cmds.filter(function(c){ return c.cat !== 'الثيم'; });
      items = rest.filter(function(c){ return c.cat === 'أوامر'; }).concat(rest.filter(function(c){ return c.cat === 'تنقل'; })).slice(0, 20);
    }
    palette.items = items; palette.active = items.length ? 0 : -1;
    if(!items.length){ palette.list.innerHTML = '<div class="cmdk-empty">ما في نتائج لـ «' + esc(q) + '»</div>'; return; }
    var html = '', lastCat = '';
    items.forEach(function(it, i){
      if(it.cat !== lastCat){ html += '<div class="cmdk-cat">' + esc(it.cat) + '</div>'; lastCat = it.cat; }
      html += '<div class="cmdk-item" role="option" data-i="' + i + '" aria-selected="false"><span class="cmdk-ic">' + esc(it.icon) + '</span><span class="cmdk-lbl">' + esc(it.label) + '</span>' + (it.hint ? '<kbd>' + esc(it.hint) + '</kbd>' : '') + '</div>';
    });
    palette.list.innerHTML = html;
    palette.list.querySelectorAll('.cmdk-item').forEach(function(el){
      el.addEventListener('mousemove', function(){ var i = parseInt(el.getAttribute('data-i'), 10); if(i !== palette.active) setPaletteActive(i); });
      el.addEventListener('click', function(){ runPaletteItem(parseInt(el.getAttribute('data-i'), 10)); });
    });
    setPaletteActive(0);
  }
  window.openCommandPalette = openPalette;

  /* Esc يغلق أعلى طبقة تابعة للـ hub (اللوحة ثم النوافذ الجانبية) */
  window.HubUI = { closeTop: function(){
    if(closePalette()) return true;
    var s = sheets[sheets.length - 1];
    if(s){ s.close(); return true; }
    return false;
  } };

  /* اختصارات: Alt+K (لوحة الأوامر) — Alt+A (أضف هنا) — ؟ (الاختصارات). لا تتعارض مع اختصارات المتصفح (Ctrl+K/Ctrl+/ مثلاً) */
  document.addEventListener('keydown', function(e){
    var tag = ((document.activeElement || {}).tagName || '').toUpperCase();
    var typing = ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(tag) > -1 || (document.activeElement && document.activeElement.isContentEditable);
    if(e.altKey && !e.ctrlKey && !e.metaKey && String(e.key).toLowerCase() === 'k'){
      e.preventDefault(); if(palette) closePalette(); else openPalette(); return;
    }
    if(typing) return;
    if(e.altKey && !e.ctrlKey && !e.metaKey && String(e.key).toLowerCase() === 'a'){ e.preventDefault(); quickAddHere(); return; }
    if(!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === '?' || e.key === '؟')){ e.preventDefault(); openPalette('help'); }
  });

  /* ============================================================
     3) تخصيص لوحة التحكم (DashLayout)
     - الترتيب الافتراضي الحقيقي هو ترتيب DOM في index.html (عناصر data-dsec).
     - التخصيص يُحفظ محلياً فقط في localStorage['dash_layout'] = {v, order, hidden}؛ لا يدخل في المزامنة ولا يمس أي بيانات.
     - order يشمل كل الأقسام (المخفية أيضاً) فتعود لمكانها عند إظهارها. أقسام جديدة بإصدار لاحق تُدرج بعد سابقها الافتراضي.
     ============================================================ */
  var DASH_KEY = 'dash_layout';
  var DASH_SECTIONS = [
    { id: 'term', name: 'تقدم الترم', icon: '🎓' },
    { id: 'stats', name: 'الأرقام الرئيسية', icon: '🔢' },
    { id: 'myday', name: 'يومي الجامعي', icon: '🧭' },
    { id: 'timer', name: 'مؤقت التركيز', icon: '⏱️' },
    { id: 'budget', name: 'نظرة الميزانية', icon: '💰' },
    { id: 'quote', name: 'الاقتباس اليومي', icon: '💬' },
    { id: 'lms', name: 'روابط LMS HU السريعة', icon: '🔗' },
    { id: 'enhanced', name: 'الإحصائيات المتقدمة', icon: '📊' },
    { id: 'insights', name: 'التحليلات المتقدمة', icon: '📈' }
  ];
  var dsById = {}; DASH_SECTIONS.forEach(function(s){ dsById[s.id] = s; });
  var dsState = null;

  function dsDefault(){ return { order: DASH_SECTIONS.map(function(s){ return s.id; }), hidden: [] }; }
  function dsClone(st){ return { order: st.order.slice(), hidden: st.hidden.slice() }; }
  function dsEqual(a, b){ return a.order.join() === b.order.join() && a.hidden.slice().sort().join() === b.hidden.slice().sort().join(); }
  /* تنظيف أي تخصيص محفوظ: يتجاهل المجهول والمكرر، ويضيف الأقسام الجديدة بأماكنها الافتراضية */
  function dsNormalize(raw){
    var order = [], seen = {};
    if(raw && Array.isArray(raw.order)) raw.order.forEach(function(id){ if(dsById[id] && !seen[id]){ seen[id] = true; order.push(id); } });
    DASH_SECTIONS.forEach(function(s, i){
      if(seen[s.id]) return;
      seen[s.id] = true;
      var at = 0;
      if(i > 0){ var p = order.indexOf(DASH_SECTIONS[i - 1].id); at = p > -1 ? p + 1 : order.length; }
      order.splice(at, 0, s.id);
    });
    var hidden = [], hs = {};
    if(raw && Array.isArray(raw.hidden)) raw.hidden.forEach(function(id){ if(dsById[id] && !hs[id]){ hs[id] = true; hidden.push(id); } });
    return { order: order, hidden: hidden };
  }
  function dsLoad(){
    try{ var v = localStorage.getItem(DASH_KEY); if(v) return dsNormalize(JSON.parse(v)); }catch(e){}
    return dsDefault();
  }
  function dsSave(st){
    try{
      if(dsEqual(st, dsDefault())) localStorage.removeItem(DASH_KEY);
      else localStorage.setItem(DASH_KEY, JSON.stringify({ v: 1, order: st.order, hidden: st.hidden }));
      return true;
    }catch(e){ return false; }
  }
  function dsEl(id){ return document.querySelector('#dashboard [data-dsec="' + id + '"]'); }
  /* تطبيق الحالة على الـ DOM: إعادة ترتيب العقد نفسها (بدون إعادة بناء) + إخفاء العرض فقط */
  function dsApply(st){
    var dash = document.getElementById('dashboard'); if(!dash) return;
    dsState = st;
    var vis = [];
    st.order.forEach(function(id){
      var el = dsEl(id); if(!el) return;
      dash.appendChild(el);
      var off = st.hidden.indexOf(id) > -1;
      el.classList.toggle('dash-hidden', off);
      el.classList.remove('dash-solo');
      if(!off) vis.push(el);
    });
    /* النصفية (المؤقت/الميزانية) تتجاور بعمودين؛ المنفردة تأخذ العرض كاملاً */
    for(var i = 0; i < vis.length; i++){
      if(!vis[i].hasAttribute('data-half')) continue;
      if(vis[i + 1] && vis[i + 1].hasAttribute('data-half')){ i++; continue; }
      vis[i].classList.add('dash-solo');
    }
    var note = document.getElementById('dashAllHidden');
    if(!vis.length){
      if(!note){
        note = document.createElement('div'); note.id = 'dashAllHidden'; note.className = 'dash-allhidden';
        note.innerHTML = 'كل أقسام لوحة التحكم مخفية. افتح القائمة <b>⋯</b> أعلى الصفحة ← «تخصيص لوحة التحكم» لإظهارها.';
      }
      dash.appendChild(note);
    } else if(note) note.remove();
  }
  function dsReset(){ try{ localStorage.removeItem(DASH_KEY); }catch(e){} dsApply(dsDefault()); }

  function dsConfirmReset(done){
    var run = function(){ dsReset(); if(window.toast) window.toast('تمت استعادة الترتيب الافتراضي', 'success'); if(done) done(); };
    if(window.customConfirm) window.customConfirm('استعادة الترتيب الافتراضي وإظهار كل الأقسام التي أخفيتها؟', run, { title: 'استعادة الترتيب', icon: '↺', okLabel: 'استعادة', danger: false }); else if(confirm('استعادة الترتيب الافتراضي؟')) run();
  }

  /* --- نافذة التخصيص --- */
  function dsOpenEditor(){
    if(document.querySelector('.dl-editor')) return;
    var snapshot = dsClone(dsState || dsLoad()), work = dsClone(snapshot), saved = false, drag = null;
    var sheet = openSheet({ title: 'تخصيص لوحة التحكم', onClose: function(){ if(!saved) dsApply(snapshot); } });
    sheet.body.classList.add('dl-editor');
    function visIds(){ return work.order.filter(function(id){ return work.hidden.indexOf(id) < 0; }); }
    function hidIds(){ return work.order.filter(function(id){ return work.hidden.indexOf(id) > -1; }); }
    function commit(focus){ dsApply(work); render(focus); }
    function move(id, dir){
      var v = visIds(), i = v.indexOf(id), t = v[i + dir]; if(i < 0 || !t) return;
      var a = work.order.indexOf(id), b = work.order.indexOf(t); work.order[a] = t; work.order[b] = id;
      commit('h:' + id);
    }
    function moveTo(id, targetId, before){
      if(id === targetId) return;
      work.order.splice(work.order.indexOf(id), 1);
      var t = work.order.indexOf(targetId); work.order.splice(before ? t : t + 1, 0, id);
      commit('h:' + id);
    }
    function row(id, off){
      var s = dsById[id], v = visIds(), i = v.indexOf(id);
      if(off) return '<li class="dl-row off" data-id="' + id + '"><span class="dl-name">' + s.icon + ' ' + esc(s.name) + '</span>' +
        '<button type="button" class="dl-btn" data-act="show" data-id="' + id + '" data-f="s:' + id + '" aria-label="إضافة ' + esc(s.name) + ' للوحة">＋ إضافة</button></li>';
      return '<li class="dl-row" data-id="' + id + '"><button type="button" class="dl-handle" data-handle="' + id + '" data-f="h:' + id + '" aria-label="نقل ' + esc(s.name) + ' (اسحب، أو استخدم أسهم لوحة المفاتيح)" title="اسحب لإعادة الترتيب">⠿</button>' +
        '<span class="dl-name">' + s.icon + ' ' + esc(s.name) + '</span>' +
        '<button type="button" class="dl-btn" data-act="up" data-id="' + id + '" data-f="u:' + id + '" aria-label="تحريك ' + esc(s.name) + ' للأعلى"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" class="dl-btn" data-act="down" data-id="' + id + '" data-f="d:' + id + '" aria-label="تحريك ' + esc(s.name) + ' للأسفل"' + (i === v.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '<button type="button" class="dl-btn" data-act="hide" data-id="' + id + '" data-f="x:' + id + '" aria-label="إخفاء ' + esc(s.name) + '">🙈 إخفاء</button></li>';
    }
    function render(focus){
      var v = visIds(), h = hidIds(), dirty = !dsEqual(work, snapshot);
      sheet.body.innerHTML =
        '<p class="dl-note">اسحب المقبض ⠿ (أو اضغط عليه واستخدم الأسهم ↑ ↓) لترتيب الأقسام. الإخفاء يخفي العرض فقط ولا يحذف أي بيانات.</p>' +
        '<div class="dl-group">الأقسام الظاهرة (' + v.length + ')</div>' +
        (v.length ? '<ul class="dl-list" id="dlVisible">' + v.map(function(id){ return row(id, false); }).join('') + '</ul>' : '<div class="dl-empty">لا توجد أقسام ظاهرة — أضف قسماً من القائمة بالأسفل.</div>') +
        '<div class="dl-group">الأقسام المخفية (' + h.length + ')</div>' +
        (h.length ? '<ul class="dl-list">' + h.map(function(id){ return row(id, true); }).join('') + '</ul>' : '<div class="dl-empty">لا توجد أقسام مخفية.</div>') +
        '<div class="dl-foot"><div class="grp"><button type="button" class="btn" data-act="save">✓ حفظ التغييرات</button>' +
        '<button type="button" class="btn btn-ghost" data-act="cancel">إلغاء' + (dirty ? ' التعديلات' : '') + '</button></div>' +
        '<button type="button" class="btn btn-ghost" data-act="reset">↺ استعادة الترتيب الافتراضي</button></div>';
      if(focus){ var f = sheet.body.querySelector('[data-f="' + focus + '"]'); if(f && !f.disabled) f.focus(); else { var a = sheet.body.querySelector('[data-f="' + focus.replace(/^[udhx]:/, 'h:') + '"]'); if(a) a.focus(); } }
    }
    sheet.body.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('[data-act]') : null; if(!b) return;
      var act = b.getAttribute('data-act'), id = b.getAttribute('data-id');
      if(act === 'up') move(id, -1);
      else if(act === 'down') move(id, 1);
      else if(act === 'hide'){ var v = visIds(), nx = v[v.indexOf(id) + 1] || v[v.indexOf(id) - 1]; if(work.hidden.indexOf(id) < 0) work.hidden.push(id); commit(nx ? 'h:' + nx : null); }
      else if(act === 'show'){ work.hidden = work.hidden.filter(function(x){ return x !== id; }); commit('h:' + id); }
      else if(act === 'save'){
        if(!dsSave(work)){ if(window.toast) window.toast('تعذر حفظ التخصيص (التخزين المحلي غير متاح)', 'error'); return; }
        saved = true; dsApply(work); sheet.close(); if(window.toast) window.toast('تم حفظ تخصيص اللوحة', 'success');
      }
      else if(act === 'cancel') sheet.close();
      else if(act === 'reset'){
        dsConfirmReset(function(){ snapshot = dsDefault(); work = dsClone(snapshot); saved = false; render('h:' + work.order[0]); });
      }
    });
    /* بديل لوحة المفاتيح للسحب: ↑ ↓ على المقبض */
    sheet.body.addEventListener('keydown', function(e){
      var h = e.target.closest ? e.target.closest('[data-handle]') : null; if(!h || e.altKey || e.ctrlKey || e.metaKey) return;
      if(e.key === 'ArrowUp' || e.key === 'ArrowDown'){ e.preventDefault(); move(h.getAttribute('data-handle'), e.key === 'ArrowUp' ? -1 : 1); }
    });
    /* السحب بالمؤشر (ماوس/لمس/قلم) عبر Pointer Events */
    function clearMarks(){ sheet.body.querySelectorAll('.drop-before,.drop-after,.dragging').forEach(function(r){ r.classList.remove('drop-before', 'drop-after', 'dragging'); }); }
    sheet.body.addEventListener('pointerdown', function(e){
      var h = e.target.closest ? e.target.closest('[data-handle]') : null; if(!h || (e.button !== undefined && e.button > 0)) return;
      e.preventDefault();
      drag = { id: h.getAttribute('data-handle'), target: null, before: true, pid: e.pointerId, h: h };
      try{ h.setPointerCapture(e.pointerId); }catch(err){}
      h.closest('.dl-row').classList.add('dragging');
    });
    sheet.body.addEventListener('pointermove', function(e){
      if(!drag || e.pointerId !== drag.pid) return;
      var under = document.elementFromPoint(e.clientX, e.clientY), r = under && under.closest ? under.closest('#dlVisible .dl-row') : null;
      sheet.body.querySelectorAll('.drop-before,.drop-after').forEach(function(x){ x.classList.remove('drop-before', 'drop-after'); });
      if(!r || r.getAttribute('data-id') === drag.id){ drag.target = null; return; }
      var b = r.getBoundingClientRect(); drag.before = e.clientY < b.top + b.height / 2; drag.target = r.getAttribute('data-id');
      r.classList.add(drag.before ? 'drop-before' : 'drop-after');
    });
    function endDrag(e, apply){
      if(!drag || (e && e.pointerId !== drag.pid)) return;
      var d = drag; drag = null; clearMarks();
      try{ d.h.releasePointerCapture(d.pid); }catch(err){}
      if(apply && d.target) moveTo(d.id, d.target, d.before);
    }
    sheet.body.addEventListener('pointerup', function(e){ endDrag(e, true); });
    sheet.body.addEventListener('pointercancel', function(e){ endDrag(e, false); });
    render('h:' + (visIds()[0] || ''));
  }

  /* --- قائمة ⋯ الصغيرة في عنوان لوحة التحكم --- */
  function dsBuildMenu(){
    var head = document.querySelector('#dashboard > .page-head'); if(!head || document.getElementById('dashMore')) return;
    var wrap = document.createElement('div'); wrap.className = 'dash-more'; wrap.id = 'dashMore';
    wrap.innerHTML = '<button type="button" class="dash-more-btn" id="dashMoreBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="dashMoreMenu" aria-label="خيارات لوحة التحكم" title="خيارات لوحة التحكم">⋯</button>' +
      '<div class="dash-more-menu" id="dashMoreMenu" role="menu" hidden>' +
      '<button type="button" role="menuitem" data-m="edit">✏️ تخصيص لوحة التحكم</button>' +
      '<button type="button" role="menuitem" data-m="reset">↺ استعادة الترتيب الافتراضي</button></div>';
    head.appendChild(wrap);
    var btn = wrap.querySelector('#dashMoreBtn'), menu = wrap.querySelector('#dashMoreMenu');
    function close(focusBtn){ menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); if(focusBtn) btn.focus(); }
    function open(){ menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); var f = menu.querySelector('button'); if(f) f.focus(); }
    btn.addEventListener('click', function(){ if(menu.hidden) open(); else close(); });
    menu.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('[data-m]') : null; if(!b) return;
      var m = b.getAttribute('data-m'); close(false);
      if(m === 'edit') dsOpenEditor(); else dsConfirmReset();
    });
    wrap.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && !menu.hidden){ e.stopPropagation(); close(true); return; }
      if(menu.hidden) return;
      var items = Array.prototype.slice.call(menu.querySelectorAll('button')), i = items.indexOf(document.activeElement);
      if(e.key === 'ArrowDown'){ e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    document.addEventListener('click', function(e){ if(!menu.hidden && !wrap.contains(e.target)) close(false); });
  }
  window.DashLayout = { sections: DASH_SECTIONS, load: dsLoad, apply: dsApply, reset: dsReset, edit: dsOpenEditor, state: function(){ return dsState ? dsClone(dsState) : null; } };
  /* ============================================================
     ربط مع التطبيق: تحديث لوحة اليوم مع renderDashboard، وزر لوحة الأوامر بالإعدادات
     ============================================================ */
  if(typeof window.renderDashboard === 'function' && !window._hubDashWrapped){
    var origDash = window.renderDashboard;
    window.renderDashboard = function(){
      var r = origDash.apply(this, arguments);
      try{ renderMyDay(); }catch(e){ console.error('[hub] myday', e); }
      try{ refreshActiveCourse(); }catch(e){}
      return r;
    };
    window._hubDashWrapped = true;
  }
  window.renderMyDay = renderMyDay;
  /* إضافة/تعديل/حذف امتحان يمرّ عبر renderExams فقط: نحدّث صفحة المادة المفتوحة أيضاً */
  if(typeof window.renderExams === 'function' && !window._hubExamsWrapped){
    var origExams = window.renderExams;
    window.renderExams = function(){
      var r = origExams.apply(this, arguments);
      try{ refreshActiveCourse(); }catch(e){}
      return r;
    };
    window._hubExamsWrapped = true;
  }

  function initUI(){
    var menu = document.getElementById('settingsMenu');
    if(menu && !document.getElementById('cmdkBtn')){
      var b = document.createElement('button');
      b.className = 'settings-item'; b.id = 'cmdkBtn'; b.type = 'button';
      b.innerHTML = '<span>⌘</span> لوحة الأوامر (Alt+K)';
      b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); openPalette(); });
      var anchor = document.getElementById('syncCodeBtn');
      if(anchor && anchor.parentNode === menu) menu.insertBefore(b, anchor); else menu.appendChild(b);
    }
    wrapSwitchTab();
    markFab();
    dsBuildMenu();
    dsApply(dsLoad());
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI); else initUI();

  console.log('[Hub] loaded');
})();
