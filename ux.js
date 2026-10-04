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
  window.attendanceHint = function(present, absent){
    present = +present || 0; absent = +absent || 0;
    var total = present + absent; if(total <= 0) return null;
    if(present / total < 0.75) return { level: 'danger', text: 'نسبة حضورك تحت 75% (حد التنبيه بالتطبيق). تأكد من شروط مادتك بالجامعة.' };
    var allowed = Math.floor(present / 3 + 1e-9) - absent;   /* غيابات إضافية ممكنة قبل النزول تحت 75% بدون حضور جديد */
    if(allowed <= 0) return { level: 'warn', text: 'غياب واحد إضافي ينزّلك تحت 75% (حد التنبيه بالتطبيق) ما لم تحضر محاضرات جديدة.' };
    if(allowed <= 2) return { level: 'warn', text: 'تقدر تغيب ' + allowed + (allowed === 1 ? ' مرة' : ' مرات') + ' إضافية فقط قبل 75% (حد التنبيه) بدون حضور جديد.' };
    return null;
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

  var _enhance = enhance;
  enhance = function(){ _enhance(); renderExamMode(); };
  window.UX = { enhance: function(){ enhance(); }, renderExamMode: renderExamMode, maybeNag: maybeNag };
})();
