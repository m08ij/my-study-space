/* ============================================================
   ux.js — ترابط بصري وتجربة متكيّفة (بدون ميزات دراسية جديدة ولا تغيير ببنية البيانات)
   1) روابط المادة: اسم المادة بالمهام/الامتحانات/الحضور/العلامات يفتح نافذة المادة الموجودة (Hub.openCourse)
   2) حالات الفراغ: زر إجراء يظهر فقط عندما تكون البيانات فارغة فعلاً (يستدعي زر الإضافة الموجود بالصفحة)
   كل شيء قراءة فقط من space؛ لا كتابة ولا حفظ.
   ============================================================ */
(function(){
  'use strict';
  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function sp(){ return window.space || {}; }

  /* ---------- 1) روابط المادة ---------- */
  function courseExists(name){
    var list = sp().courses || [];
    for(var i = 0; i < list.length; i++) if(list[i].name === name) return true;
    return false;
  }
  /* يرجع نصاً عادياً إن لم تكن المادة موجودة بقائمة المواد (لا روابط ميتة) */
  window.courseLink = function(name, prefix){
    var label = (prefix || '') + esc(name);
    if(!name || !courseExists(name) || !(window.Hub && window.Hub.openCourse)) return label;
    return '<span class="course-link" data-open-course="' + esc(name) + '" role="link" tabindex="0" title="فتح صفحة المادة">' + label + '</span>';
  };
  function openFrom(el, e){
    var name = el.getAttribute('data-open-course');
    if(!name || !window.Hub || !window.Hub.openCourse) return;
    if(e){ e.preventDefault(); e.stopPropagation(); }
    window.Hub.openCourse(name);
  }
  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('[data-open-course]'); if(el) openFrom(el, e);
  }, true);
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest && e.target.closest('[data-open-course]'); if(el && e.target === el) openFrom(el, e);
  }, true);

  /* ---------- 2) حالات الفراغ التفاعلية ---------- */
  var CTA = {
    tasks:      { btn: 'btnAddTask',    empty: function(s){ return !(s.tasks || []).length; } },
    exams:      { btn: 'btnAddExam',    empty: function(s){ return !(s.exams || []).length; } },
    attendance: { btn: 'btnAddAtt',     empty: function(s){ return !Object.keys(s.attendance || {}).length; } },
    flashcards: { btn: 'btnAddDeck',    empty: function(s){ return !(s.decks || []).length; } },
    notes:      { btn: 'btnAddNote',    empty: function(){ return !(window.notes || []).length; } },
    budget:     { btn: 'btnAddExpense', empty: function(s){ return !(s.budget || []).length; } },
    courses:    { btn: 'btnAddCourse',  empty: function(s){ return !(s.courses || []).length; } }
  };
  function enhance(){
    var s = sp();
    document.querySelectorAll('.empty:not([data-cta])').forEach(function(box){
      var sec = box.closest && box.closest('section.section'); if(!sec) return;
      var def = CTA[sec.id]; if(!def) return;
      box.setAttribute('data-cta', '1');
      if(box.querySelector('button') || !def.empty(s)) return;
      var src = document.getElementById(def.btn); if(!src) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm empty-cta';
      b.textContent = src.textContent.trim();
      b.addEventListener('click', function(){ src.click(); });
      box.appendChild(b);
    });
  }
  var pending = false;
  function schedule(){ if(pending) return; pending = true; (window.requestAnimationFrame || setTimeout)(function(){ pending = false; try{ enhance(); }catch(e){ console.warn('ux', e); } }); }
  function init(){
    var main = document.querySelector('main'); if(!main || typeof MutationObserver === 'undefined') return;
    new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
    schedule();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /* ---------- 3) تنبيه الغياب (نفس حد التنبيه 75% المستخدم بألوان بطاقة الحضور) ---------- */
  /* عدد محاضرات المادة بالأسبوع من الجدول (تطابق تام باسم المادة؛ 0 إن لم توجد) */
  window.weeklyLectures = function(name){
    var tt = sp().timetable || {}, n = 0;
    Object.keys(tt).forEach(function(k){ if(tt[k] && tt[k].name === name) n++; });
    return n;
  };
  /* weekly (اختياري): محاضرات المادة بالأسبوع؛ إن وُجد يضاف توقع «لو غبت أسبوعاً كاملاً» */
  window.attendanceHint = function(present, absent, weekly){
    present = +present || 0; absent = +absent || 0; weekly = +weekly || 0;
    var total = present + absent; if(total <= 0) return null;
    var h = null;
    if(present / total < 0.75) return { level: 'danger', text: 'نسبة حضورك تحت 75% (حد التنبيه بالتطبيق). تأكد من شروط مادتك بالجامعة.' };
    var allowed = Math.floor(present / 3 + 1e-9) - absent;   /* غيابات إضافية ممكنة قبل النزول تحت 75% بدون حضور جديد */
    if(allowed <= 0) h = { level: 'warn', text: 'غياب واحد إضافي ينزّلك تحت 75% (حد التنبيه بالتطبيق) ما لم تحضر محاضرات جديدة.' };
    else if(allowed <= 2) h = { level: 'warn', text: 'تقدر تغيب ' + allowed + (allowed === 1 ? ' مرة' : ' مرات') + ' إضافية فقط قبل 75% (حد التنبيه) بدون حضور جديد.' };
    if(weekly > 0){
      var after = Math.round(present / (total + weekly) * 100), wk = 'لو غبت أسبوعاً كاملاً (' + weekly + (weekly === 1 ? ' محاضرة' : ' محاضرات') + ' بجدولك) بتصير نسبتك ' + after + '%.';
      if(h) h.text += ' ' + wk;
      else if(present / (total + weekly) < 0.75) h = { level: 'warn', text: wk + ' (تحت 75%)' };
    }
    return h;
  };

  /* ---------- 4) وضع الامتحانات: يظهر تلقائياً إذا كان في امتحان خلال 7 أيام ---------- */
  function ymd(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function daysLeft(dateStr){
    var d = ymd(dateStr), t = ymd(window.today ? window.today() : ''); if(!d || !t) return null;
    return Math.round((d - t) / 86400000);
  }
  function courseGrade(name){
    var g = (sp().grades || []).filter(function(x){ return x.name === name; })[0]; if(!g) return null;
    var earned = 0, done = 0; (g.items || []).forEach(function(i){ var w = parseFloat(i.weight) || 0; if(w > 0){ earned += Math.min(parseFloat(i.score) || 0, w); done += w; } });
    return done > 0 ? Math.round(earned / done * 1000) / 10 : null;
  }
  function fmtMin(m){ m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + ' س ' + (m % 60) + ' د' : m + ' د'; }
  function examModeHtml(list){
    var focus = (window.S && window.S.get('focusLinks', null)) || {}, fc = (focus && focus.courses) || {};
    var rows = list.slice(0, 3).map(function(x){
      var e = x.e, d = x.d, when = d === 0 ? 'اليوم' : d === 1 ? 'غداً' : 'بعد ' + d + ' أيام';
      var pend = e.course ? (sp().tasks || []).filter(function(t){ return !t.done && t.course === e.course; }).length : 0;
      var gr = e.course ? courseGrade(e.course) : null, fm = e.course ? fc[e.course] : 0;
      var chips = [];
      if(pend) chips.push('<span class="em-chip">📝 ' + pend + ' مهمة مفتوحة</span>');
      if(gr !== null) chips.push('<span class="em-chip">📊 علامتك الحالية ' + gr + '%</span>');
      if(fm) chips.push('<span class="em-chip">⏱️ ' + fmtMin(fm) + ' تركيز</span>');
      return '<div class="em-row' + (d <= 1 ? ' hot' : '') + '"><div class="em-when">' + esc(when) + '</div><div class="em-main"><b>' + esc(e.name || 'امتحان') + '</b>' +
        '<div class="em-meta">' + (e.course ? window.courseLink(e.course, '📚 ') + ' · ' : '') + esc(e.date) + (/^\d{1,2}:\d{2}/.test(e.time || '') ? ' · <bdi dir="ltr">' + esc(e.time) + '</bdi>' : '') + (e.room ? ' · ' + esc(e.room) : '') + '</div>' +
        (chips.length ? '<div class="em-chips">' + chips.join('') + '</div>' : '') + '</div></div>';
    }).join('');
    return '<div class="card-head"><h3>🎯 وضع الامتحانات</h3><span class="u-note">امتحانات خلال أسبوع (' + list.length + ')</span></div>' + rows +
      '<div class="em-actions"><button class="btn btn-sm" type="button" data-em="timer">⏱️ جلسة تركيز</button>' +
      (typeof window.openExamPlan === 'function' ? '<button class="btn btn-sm btn-ghost" type="button" data-em="plan">📋 خطة مراجعة</button>' : '') +
      '<button class="btn btn-sm btn-ghost" type="button" data-em="exams">كل الامتحانات</button></div>';
  }
  function renderExamMode(){
    var dash = document.getElementById('dashboard'); if(!dash) return;
    var list = (sp().exams || []).map(function(e){ return { e: e, d: daysLeft(e.date) }; }).filter(function(x){ return x.d !== null && x.d >= 0 && x.d <= 7; })
      .sort(function(a, b){ return a.d - b.d || String(a.e.time || '').localeCompare(String(b.e.time || '')); });
    var box = document.getElementById('examMode');
    if(!list.length){ if(box) box.remove(); return; }
    var html = examModeHtml(list);
    if(!box){
      box = document.createElement('section'); box.id = 'examMode'; box.className = 'card exam-mode'; box.setAttribute('aria-label', 'وضع الامتحانات');
      var head = dash.querySelector(':scope > .page-head');
      if(head && head.nextSibling) dash.insertBefore(box, head.nextSibling); else dash.insertBefore(box, dash.firstChild);
      box.addEventListener('click', function(ev){
        var b = ev.target.closest && ev.target.closest('[data-em]'); if(!b) return;
        var k = b.getAttribute('data-em');
        if(k === 'plan' && window.openExamPlan) window.openExamPlan();
        else if(window.switchTab) window.switchTab(k === 'timer' ? 'timer' : 'exams');
      });
    }
    if(box._h !== html){ box._h = html; box.innerHTML = html; }
  }

  /* ---------- 5) تذكير النسخة الاحتياطية (مرة كل 7 أيام كحدّ أقصى؛ لا ينسخ شيئاً تلقائياً) ---------- */
  var DAY = 86400000, NAG_AFTER = 7 * DAY;
  function lsNum(k){ try{ return parseInt(localStorage.getItem(k), 10) || 0; }catch(e){ return 0; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, String(v)); }catch(e){} }
  function hasUserData(){ var s = sp(); return (s.courses || []).length + (s.tasks || []).length + (s.exams || []).length + (s.budget || []).length + (window.notes || []).length > 0; }
  function maybeNag(){
    if(document.getElementById('backupNag') || !hasUserData()) return;
    var now = Date.now(), first = lsNum('ss_first_seen'); if(!first){ lsSet('ss_first_seen', now); return; }
    var ref = lsNum('ss_last_backup') || first;
    if(now - ref < NAG_AFTER || now - lsNum('ss_backup_nag') < NAG_AFTER) return;
    if(document.querySelector('.modal-backdrop,.welcome-overlay.show,#onbOverlay[style*="flex"]')) return;
    var days = Math.floor((now - ref) / DAY), nag = document.createElement('div');
    nag.id = 'backupNag'; nag.className = 'backup-nag'; nag.setAttribute('role', 'status');
    nag.innerHTML = '<span>💾 ' + (lsNum('ss_last_backup') ? 'آخر نسخة احتياطية قبل ' + days + ' يوم.' : 'ما أخذت نسخة احتياطية لبياناتك بعد.') + '</span>' +
      '<button class="btn btn-sm" type="button" data-nag="now">خذ نسخة الآن</button><button class="btn btn-sm btn-ghost" type="button" data-nag="later">لاحقاً</button>';
    document.body.appendChild(nag);
    nag.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('[data-nag]'); if(!b) return;
      lsSet('ss_backup_nag', Date.now());
      if(b.getAttribute('data-nag') === 'now' && window.downloadBackup) window.downloadBackup(false);
      nag.remove();
    });
  }
  setTimeout(maybeNag, 7000);

  /* ---------- 6) ملخص الصباح: مرة واحدة بأول فتح لليوم، وفقط بين 5:00 و11:59 ---------- */
  var DE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function dstr(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function whenText(n){ return n <= 0 ? 'اليوم' : n === 1 ? 'غداً' : n === 2 ? 'بعد يومين' : 'بعد ' + n + ' أيام'; }
  /* يرجع { lines: [...] } من بيانات موجودة فقط (لا يخترع شيئاً)؛ lines فارغة = لا شيء يستحق العرض */
  function morningData(now){
    var s = sp(), tt = s.timetable || {}, lines = [], today = dstr(now);
    var slots = []; Object.keys(tt).forEach(function(k){ var i = k.indexOf('-'); if(i > 0 && k.slice(0, i) === DE[now.getDay()] && tt[k]) slots.push({ time: k.slice(i + 1), name: tt[k].name, room: tt[k].room }); });
    slots.sort(function(a, b){ return a.time.localeCompare(b.time); });
    if(slots.length) lines.push('📅 محاضرات اليوم: ' + slots.length + ' — أولها «' + (slots[0].name || 'محاضرة') + '» الساعة <bdi dir="ltr">' + esc(slots[0].time) + '</bdi>' + (slots[0].room ? ' (' + esc(slots[0].room) + ')' : ''));
    else if(Object.keys(tt).length) lines.push('🌴 ما في محاضرات اليوم');
    var items = [];
    (s.tasks || []).forEach(function(t){ if(!t.done && t.due && t.due >= today) items.push({ d: t.due, label: t.title, ex: false }); });
    (s.exams || []).forEach(function(e){ if(e.date && e.date >= today) items.push({ d: e.date, label: e.name || 'امتحان', ex: true }); });
    items.sort(function(a, b){ return a.d < b.d ? -1 : a.d > b.d ? 1 : (b.ex ? 1 : 0) - (a.ex ? 1 : 0); });
    if(items.length){ var n = daysLeft(items[0].d); lines.push((items[0].ex ? '⏳ أقرب امتحان: ' : '📝 أقرب موعد: ') + '«' + esc(items[0].label) + '» — ' + whenText(n === null ? 0 : n)); }
    var over = (s.tasks || []).filter(function(t){ return !t.done && t.due && t.due < today; }).length;
    if(over) lines.push('⚠️ ' + over + (over === 1 ? ' مهمة متأخرة' : ' مهام متأخرة'));
    var att = s.attendance || {}, warn = [];
    Object.keys(att).forEach(function(name){ var h = window.attendanceHint(att[name].present, att[name].absent, window.weeklyLectures(name)); if(h) warn.push(name); });
    if(warn.length) lines.push('✅ تنبيه حضور: ' + esc(warn.slice(0, 2).join('، ')) + (warn.length > 2 ? ' و' + (warn.length - 2) + ' أخرى' : ''));
    return { lines: lines, name: (s.profile && s.profile.name) || '' };
  }
  function maybeMorning(now, opt){
    opt = opt || {}; now = now || new Date();
    var key = 'ss_morning_date', today = dstr(now);
    var h = now.getHours();
    if(!opt.force){
      if(h < 5 || h >= 12) return false;
      try{ if(localStorage.getItem(key) === today) return false; }catch(e){}
      if(document.querySelector('.modal-backdrop,.welcome-overlay.show,#onbOverlay[style*="flex"],#morningCard')) return false;
    }
    var data = morningData(now);
    if(!data.lines.length) return false;
    try{ localStorage.setItem(key, today); }catch(e){}
    var card = document.createElement('div'); card.id = 'morningCard'; card.className = 'morning-card'; card.setAttribute('role', 'status');
    card.innerHTML = '<div class="mc-head"><b>☀️ صباح الخير' + (data.name ? ' ' + esc(data.name) : '') + '</b><button type="button" class="sync-x" data-mc aria-label="إغلاق">✕</button></div>' +
      '<ul>' + data.lines.map(function(l){ return '<li>' + l + '</li>'; }).join('') + '</ul>';
    document.body.appendChild(card);
    var done = function(){ if(card.parentNode) card.remove(); };
    card.querySelector('[data-mc]').onclick = done;
    setTimeout(done, 25000);
    return true;
  }
  setTimeout(function(){ maybeMorning(); }, 3500);

  /* حبس Tab لكل نافذة .modal-backdrop تُضاف للصفحة (مزامنة، ICS، سجل الأخطاء، إدخال سريع، بطاقات...).
     النوافذ التي تحبس بنفسها (showModal / customConfirm) تضع bd._trap فتُتخطّى. */
  function trapDialogs(){
    if(typeof MutationObserver === 'undefined' || !document.body) return;
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        Array.prototype.forEach.call(m.addedNodes, function(bd){
          if(!bd.classList || !bd.classList.contains('modal-backdrop') || bd._trap) return;
          bd._trap = true;
          bd.addEventListener('keydown', function(e){
            if(e.key !== 'Tab') return;
            var f = Array.prototype.filter.call(bd.querySelectorAll('input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"])'), function(n){ return !n.disabled && !n.closest('[hidden]'); });
            if(!f.length) return;
            var first = f[0], last = f[f.length - 1];
            if(!bd.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
            else if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
            else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
          });
        });
      });
    }).observe(document.body, { childList: true });
  }
  trapDialogs();


  /* ---------- 7) ملخص بدء التشغيل: كرت واحد بدل 3 تنبيهات متتالية (تحية + متأخرة + اليوم) ----------
     يقرأ من البيانات الموجودة فقط. يتخطّى نفسه إن كان «ملخص الصباح» سيظهر (أغنى منه)، وإن كانت نافذة مفتوحة. */
  window._briefAt = 0;
  function briefChips(now){
    var s = sp(), t = dstr(now), chips = [], pend = (s.tasks || []).filter(function(k){ return !k.done; });
    var over = pend.filter(function(k){ return k.due && k.due < t; }).length;
    var today = pend.filter(function(k){ return k.due === t; }).length;
    var tomHigh = pend.filter(function(k){ return k.priority === 'high' && daysLeft(k.due) === 1; }).length;
    if(over) chips.push({ cls: 'warn', go: 'tasks', icon: '⚠️', text: over + (over === 1 ? ' مهمة متأخرة' : ' مهام متأخرة') });
    if(today) chips.push({ cls: 'info', go: 'tasks', icon: '📌', text: today + (today === 1 ? ' مهمة اليوم' : ' مهام اليوم') });
    if(tomHigh) chips.push({ cls: 'info', go: 'tasks', icon: '🔺', text: tomHigh + ' مهمة مهمة غدًا' });
    var ex = (s.exams || []).map(function(e){ return { e: e, d: daysLeft(e.date) }; }).filter(function(x){ return x.d !== null && x.d >= 0 && x.d <= 3; }).sort(function(a, b){ return a.d - b.d; })[0];
    if(ex) chips.push({ cls: 'warn', go: 'exams', icon: '⏳', text: String(ex.e.name || 'امتحان').slice(0, 22) + ' ' + (ex.d === 0 ? 'اليوم' : ex.d === 1 ? 'غدًا' : 'بعد ' + ex.d + ' أيام') });
    var due = 0; (s.decks || []).forEach(function(d){ (d.cards || []).forEach(function(c){ if(c.last && (c.due || t) <= t) due++; }); });
    if(due) chips.push({ cls: 'info', go: 'flashcards', icon: '🃏', text: due + ' بطاقة مستحقة' });
    return chips.slice(0, 4);
  }
  window.startupBrief = function(name, opt){
    opt = opt || {}; var now = new Date(), h = now.getHours();
    if(!window.space || !window.toastCard) return false;
    if(!opt.force && Date.now() - window._briefAt < 600000) return false;                 /* لا تكرار خلال 10 دقائق */
    if(document.querySelector('.modal-backdrop,.welcome-overlay.show,#onbOverlay[style*="flex"]')) return false;
    var chips = briefChips(now), first = String(name || (sp().profile && sp().profile.name) || '').split(' ')[0];
    var greet = window.greetWord(h) + (first ? ' ' + first : '');
    /* الصباح: ملخص الصباح (أغنى) سيظهر بعد قليل، فلا نكرر عليه */
    try{ if(h >= 5 && h < 12 && localStorage.getItem('ss_morning_date') !== dstr(now) && morningData(now).lines.length && !opt.force) return 'morning'; }catch(e){}
    window._briefAt = Date.now();
    if(!chips.length){ window.toast(greet + ' 👋', 'success', 2400); return true; }
    var el = window.toastCard('<div class="brief-head"><b>' + esc(greet) + ' 👋</b><span class="brief-sub">عندك اليوم:</span></div>' +
      '<div class="brief-chips">' + chips.map(function(c){ return '<button type="button" class="brief-chip ' + c.cls + '" data-go="' + c.go + '">' + c.icon + ' ' + esc(c.text) + '</button>'; }).join('') + '</div>',
      { cls: 'brief', icon: '👋', dur: 9000 });
    if(el) el.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('[data-go]'); if(!b) return;
      if(window.switchTab) window.switchTab(b.getAttribute('data-go'));
      var x = el.querySelector('.t-x'); if(x) x.click();
    });
    return true;
  };
  /* ---------- 8) قائمة الإعدادات: حالات العناصر، حجم الخط، ورقة سفلية على الموبايل ---------- */
  var FS_LABEL = { sm: 'صغير', md: 'عادي', lg: 'كبير' };
  function lsv(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function applyFont(v){
    if(v === 'sm' || v === 'lg') document.documentElement.setAttribute('data-fs', v); else document.documentElement.removeAttribute('data-fs');
    var cur = (v === 'sm' || v === 'lg') ? v : 'md';
    document.querySelectorAll('#settingsMenu [data-fs]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-fs') === cur ? 'true' : 'false'); });
    var s = document.getElementById('fontSub'); if(s) s.textContent = FS_LABEL[cur];
  }
  window.refreshSettingsMenu = function(){
    var th = document.documentElement.getAttribute('data-theme') || 'dark', ts = document.getElementById('themeSub');
    if(ts){ var f = (window.THEMES || []).filter(function(x){ return x.id === th; })[0]; ts.textContent = f ? f.name : th; }
    applyFont(lsv('ss_font'));
    var d = document.getElementById('densityBtn'); if(d){ var on = lsv('ss_density') === 'compact', t = d.querySelector('.db-t'); if(t) t.textContent = on ? 'مضغوطة' : 'مريحة'; d.setAttribute('aria-checked', on ? 'true' : 'false'); }
    var td = document.getElementById('todayBtn'); if(td){ var on2 = lsv('ss_today_mode') === '1', t2 = td.querySelector('.tb-t'); if(t2) t2.textContent = on2 ? 'مفعّل — اللوحة مبسّطة' : 'اللوحة الكاملة'; td.setAttribute('aria-checked', on2 ? 'true' : 'false'); }
    if(window.updateNotifBtn) try{ window.updateNotifBtn(); }catch(e){}
    var ss = document.getElementById('syncMenuSub'); if(ss && window.getSyncStatus) try{ ss.textContent = window.getSyncStatus().text; }catch(e){}
  };
  /* على الموبايل تُنقل القائمة إلى body (الشريط العلوي له backdrop-filter فيحبس العناصر fixed بداخله) وتصير ورقة سفلية */
  var smWrap = null;
  window.settingsMenuSync = function(){
    var m = document.getElementById('settingsMenu'); if(!m) return;
    if(!smWrap) smWrap = m.parentNode;
    var open = m.classList.contains('show'), phone = window.innerWidth <= 900;
    if(open && phone && m.parentNode !== document.body) document.body.appendChild(m);
    else if((!open || !phone) && m.parentNode === document.body && smWrap) smWrap.appendChild(m);
    if(open) window.refreshSettingsMenu();
  };
  function initSettingsMenu(){
    var m = document.getElementById('settingsMenu'); if(!m || m._smInit) return; m._smInit = true;
    applyFont(lsv('ss_font'));
    m.addEventListener('click', function(e){
      var f = e.target.closest && e.target.closest('[data-fs]');
      if(f){ var v = f.getAttribute('data-fs'); try{ if(v === 'md') localStorage.removeItem('ss_font'); else localStorage.setItem('ss_font', v); }catch(x){} applyFont(v); return; }
      if(e.target === m && window.innerWidth <= 900 && window.closeSettingsMenu) window.closeSettingsMenu();   /* النقر على الخلفية المعتمة */
    });
    /* سحب المقبض للأسفل يغلق الورقة */
    var y0 = null;
    m.addEventListener('pointerdown', function(e){ if(window.innerWidth <= 900 && e.target.closest && e.target.closest('.sm-handle')){ y0 = e.clientY; try{ m.setPointerCapture(e.pointerId); }catch(x){} } });
    m.addEventListener('pointermove', function(e){ if(y0 !== null){ var dy = Math.max(0, e.clientY - y0); m.style.transform = 'translateY(' + dy + 'px)'; } });
    function endDrag(e){ if(y0 === null) return; var dy = e.clientY - y0; y0 = null; m.style.transform = ''; if(dy > 70 && window.closeSettingsMenu) window.closeSettingsMenu(); }
    m.addEventListener('pointerup', endDrag); m.addEventListener('pointercancel', function(){ y0 = null; m.style.transform = ''; });
    window.addEventListener('resize', function(){ window.settingsMenuSync(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && m.classList.contains('show') && window.closeSettingsMenu) window.closeSettingsMenu(); });
    window.refreshSettingsMenu();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSettingsMenu); else initSettingsMenu();

  /* ---------- 9) السحب على المهام (لمس فقط): يمين = إنجاز، يسار = حذف (مع «تراجع») ---------- */
  var SWIPE_GO = 90;
  function initSwipe(){
    var list = document.getElementById('tasksList'); if(!list || list._swipe) return; list._swipe = true;
    var st = null;
    function reset(s){ s.row.classList.remove('swiping'); s.row.style.transform = ''; s.row.removeAttribute('data-swipe'); s.row.style.removeProperty('--sw'); }
    list.addEventListener('pointerdown', function(e){
      if(e.pointerType !== 'touch') return;
      var row = e.target.closest && e.target.closest('.task[data-task-id]'); if(!row) return;
      if(e.target.closest('button,a,input,select,[role="checkbox"],.course-link,.task-handle')) return;
      st = { row: row, id: row.getAttribute('data-task-id'), x: e.clientX, y: e.clientY, dx: 0, lock: null, pid: e.pointerId };
    });
    list.addEventListener('pointermove', function(e){
      if(!st || e.pointerId !== st.pid) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y;
      if(st.lock === null){
        if(Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5){ st.lock = 'x'; st.row.classList.add('swiping'); try{ list.setPointerCapture(e.pointerId); }catch(x){} }
        else if(Math.abs(dy) > 10){ st = null; return; }
      }
      if(st.lock === 'x'){
        st.dx = Math.max(-140, Math.min(140, dx));
        st.row.style.transform = 'translateX(' + st.dx + 'px)';
        st.row.setAttribute('data-swipe', st.dx > 0 ? 'done' : 'del');
        st.row.style.setProperty('--sw', String(Math.min(1, Math.abs(st.dx) / SWIPE_GO)));
      }
    });
    function end(){
      if(!st) return; var s = st; st = null; if(s.lock !== 'x') return;
      var go = Math.abs(s.dx) >= SWIPE_GO, right = s.dx > 0; reset(s);
      if(!go) return;
      if(right){ if(window.toggleTask) window.toggleTask(s.id); } else if(window.deleteTask) window.deleteTask(s.id);
    }
    list.addEventListener('pointerup', end); list.addEventListener('pointercancel', function(){ if(st){ var s = st; st = null; if(s.lock === 'x') reset(s); } });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSwipe); else initSwipe();

  var _enhance = enhance;
  enhance = function(){ _enhance(); renderExamMode(); };
  window.UX = { enhance: function(){ enhance(); }, renderExamMode: renderExamMode, maybeNag: maybeNag, maybeMorning: maybeMorning, morningData: morningData };

  /* ============================================================
     وضع الخصوصية: يغبّش العلامات والمعدل والميزانية بنقرة وحدة (لو حدا جنبك). محلي فقط (ss_privacy) ولا يدخل المزامنة.
     ============================================================ */
  (function(){
    var KEY = 'ss_privacy';
    function isOn(){ try{ return localStorage.getItem(KEY) === '1'; }catch(e){ return false; } }
    function paint(on){
      document.documentElement.classList.toggle('privacy', !!on);
      var b = document.getElementById('privacyBtn'); if(!b) return;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      var t = b.querySelector('.pv-t'); if(t) t.textContent = on ? 'مفعّل — الأرقام الحساسة مغبّشة' : 'الأرقام ظاهرة';
    }
    function set(on, quiet){
      try{ localStorage.setItem(KEY, on ? '1' : '0'); }catch(e){}
      paint(on);
      if(!quiet && window.toast) window.toast(on ? '🙈 وضع الخصوصية شغّال — العلامات والميزانية مغبّشة (اضغط على الرقم مطولاً لإظهاره)' : '👀 رجعت الأرقام ظاهرة', 'info', 3200);
    }
    window.PrivacyMode = { isOn: isOn, set: set, toggle: function(){ set(!isOn()); } };
    paint(isOn());
    function bind(){
      var b = document.getElementById('privacyBtn'); if(!b || b._pv) return; b._pv = true;
      b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); window.PrivacyMode.toggle(); });
      paint(isOn());
    }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
    setTimeout(bind, 400);
  })();})();
