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

  window.UX = { enhance: enhance };
})();
