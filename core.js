/* ============================================================
   🧰 core.js — State, Utils, Storage
   ============================================================ */
(function(){
  'use strict';
  if(window._coreLoaded) return;
  window._coreLoaded = true;
  /* خروج ناعم للنوافذ المنبثقة: تُزال النافذة الحقيقية فوراً (DOM والتركيز والاختبارات سليمة) وتُترك نسخة شبحية
     بأسماء أصناف مختلفة (modal-ghost / mg-box) تتلاشى ~140ms ثم تُحذف. تُتخطى مع prefers-reduced-motion. */
  window.dismissOverlay = function(bd){
    try{
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var box = bd && bd.querySelector && bd.querySelector('.modal');
      if(!reduce && box && document.body.contains(bd)){
        var g = document.createElement('div'); g.className = 'modal-ghost'; g.setAttribute('aria-hidden', 'true');
        var c = box.cloneNode(true); c.className = 'mg-box';
        c.querySelectorAll('[id]').forEach(function(n){ n.removeAttribute('id'); });
        c.removeAttribute('id'); c.removeAttribute('role'); c.removeAttribute('aria-modal');
        c.querySelectorAll('input,textarea,select,button').forEach(function(n){ n.tabIndex = -1; n.disabled = true; });
        g.appendChild(c); document.body.appendChild(g);
        setTimeout(function(){ if(g.parentNode) g.parentNode.removeChild(g); }, 170);
      }
    }catch(e){}
    if(bd && bd.remove) bd.remove();
  };
  /* رقم الإصدار: يجب أن يطابق BUILD في سكربت الحماية داخل index.html وCACHE_NAME في sw.js (اتركه متزامناً عند كل إصدار) */
  window.NAV_SVG = {"dashboard":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"5\" rx=\"1.5\"/><rect x=\"14\" y=\"12\" width=\"7\" height=\"9\" rx=\"1.5\"/><rect x=\"3\" y=\"16\" width=\"7\" height=\"5\" rx=\"1.5\"/></svg>","timetable":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"4.5\" width=\"18\" height=\"16.5\" rx=\"2.5\"/><path d=\"M3 9.5h18M8 2.5v4M16 2.5v4\"/></svg>","courses":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5\"/></svg>","tasks":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 6h11M9 12h11M9 18h11\"/><path d=\"M3.5 6l1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8\"/></svg>","exams":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 3h12M6 21h12M7 3v3.5c0 1.6 1 2.6 2.2 3.5L12 12l-2.8 2c-1.2.9-2.2 1.9-2.2 3.5V21M17 3v3.5c0 1.6-1 2.6-2.2 3.5L12 12l2.8 2c1.2.9 2.2 1.9 2.2 3.5V21\"/></svg>","attendance":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 12.3l2.8 2.8L16.3 9.5\"/></svg>","timer":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"13.5\" r=\"8\"/><path d=\"M12 9v4.5l3 1.8M9.5 2.5h5\"/></svg>","flashcards":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"6\" y=\"7\" width=\"15\" height=\"13\" rx=\"2.5\"/><path d=\"M3 15V6a2.5 2.5 0 0 1 2.5-2.5H16\"/></svg>","gradecalc":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/></svg>","budget":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 7.5A2.5 2.5 0 0 1 5.5 5H19v14H5.5A2.5 2.5 0 0 1 3 16.5v-9z\"/><path d=\"M16 12h5v4h-5a2 2 0 0 1 0-4z\"/></svg>","notes":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z\"/><path d=\"M14 3v5h5M9 13h6M9 17h6\"/></svg>","plan":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14\"/></svg>","hulinks":"<svg class=\"ico\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 9l10-5 10 5-10 5-10-5z\"/><path d=\"M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5M22 9v6\"/></svg>"};
window.APP_BUILD = '96';

  /* ============ Global State ============ */
  window.space = null;
  window.notes = [];
  window.gpaRows = [{name:'', hrs:3, grade:'A (90-100)'}];
  window.timerSettings = {focus:25, short:5, long:15};
  window.dataCorrupted = false;
  window.currentTaskFilter = 'all';
  window.currentBudgetFilter = 'all';
  window.currentBudgetCat = 'all';
  window.currentCdYear = 'all';
  window.timerMode = 'focus';
  window.historyInitialized = false;
  window.backupTimer = null;
  window.NOTIF_ASKED_KEY = 'ss_notif_asked';
  window.serverOnline = false;
  window.serverSaveTimer = null;
  window.serverSaveInFlight = false;
  window.bootSyncing = true;

  /* ============ HTML Escape ============ */
  window.esc = function(s){
    if(s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  };

  /* ============ UID ============ */
  window.uid = function(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  };

  /* ============ Local date ============ */
  window.today = function(){
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
  };
  window.daysBetween = function(d1, d2){
    var t1 = new Date(d1); t1.setHours(0,0,0,0);
    var t2 = new Date(d2); t2.setHours(0,0,0,0);
    return Math.round((t2 - t1) / 86400000);
  };

  /* ============ Days ============ */
  window.DAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  window.DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  window.WEEK_DAYS_AR = window.DAYS_AR.slice(0, 5);
  window.WEEK_DAYS_EN = window.DAYS_EN.slice(0, 5);

  /* ============ Arabic days ============ */
  window.arabicDays = function(n){
    n = Math.abs(parseInt(n, 10) || 0);
    if(n === 0) return 'اليوم';
    if(n === 1) return 'يوم';
    if(n === 2) return 'يومان';
    if(n >= 3 && n <= 10) return n + ' أيام';
    return n + ' يومًا';
  };

  /* ============ Toast ============ */
  window.toast = function(msg, type, dur){
    type = type || 'info'; dur = dur || 2600;
    var c = document.getElementById('toastContainer');
    if(!c){ console.log('[toast]', msg); return; }
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(function(){
      t.classList.add('out');
      setTimeout(function(){ t.remove(); }, 300);
    }, dur);
  };

  /* ============ Storage S ============ */
  var storageAvailable = (function(){
    try{ var k='__test__'; localStorage.setItem(k,'x'); localStorage.removeItem(k); return true; }
    catch(e){ return false; }
  })();
  var memoryStore = {};

  window.S = {
    get: function(k, d){
      try{
        if(!storageAvailable) return memoryStore[k] !== undefined ? memoryStore[k] : d;
        var v = localStorage.getItem(k);
        return v === null ? d : JSON.parse(v);
      }catch(e){ return d; }
    },
    set: function(k, v){
      try{
        if(!storageAvailable){ memoryStore[k] = v; return true; }
        localStorage.setItem(k, JSON.stringify(v));
        if(k === 'space') localStorage.setItem('ss_space_ts', String(Date.now()));  /* وقت آخر تعديل محلي — لمقارنته بالسحابة */
        if(window.scheduleBackup) window.scheduleBackup();
        return true;
      }catch(e){ return false; }
    },
    remove: function(k){
      try{ if(storageAvailable) localStorage.removeItem(k); else delete memoryStore[k]; }
      catch(e){}
    }
  };

  /* ============ Debug ============ */
  window.debugLog = function(msg){
    var p = document.getElementById('debugPanel'); if(!p) return;
    p.textContent = msg; p.classList.add('show');
    clearTimeout(p._t);
    p._t = setTimeout(function(){ p.classList.remove('show'); }, 4000);
  };

  /* ============ Helpers ============ */
  window.getSpace = function(){
    return window.space || {
      profile:{}, timetable:{}, courses:[], tasks:[],
      exams:[], attendance:{}, decks:[], budget:[], grades:[],
      completedCourses: [], currentSemester: 1
    };
  };
  /* حفظ محلي فاشل (المساحة ممتلئة) أو التخزين غير متاح (وضع خاص): ننبّه المستخدم بدل الفشل الصامت.
     التنبيه محدود (مرة كل 15 ثانية) حتى لا يتكرر مع كل حفظ. */
  var lastSaveWarn = 0;
  window.saveSpace = function(){
    if(window.S && typeof window.S.set === 'function'){
      var ok = window.S.set('space', window.space);
      var now = Date.now();
      if((ok === false || !storageAvailable) && now - lastSaveWarn > 15000){
        lastSaveWarn = now;
        window.toast(storageAvailable
          ? '⚠️ تعذّر الحفظ على هذا الجهاز (المساحة ممتلئة؟) — صدّر نسخة من القائمة ⚙️ لحماية بياناتك'
          : '⚠️ التخزين المحلي غير متاح (وضع خاص؟) — بياناتك لن تبقى بعد إغلاق الصفحة', 'warn', 6000);
      }
      return ok;
    }
    return false;
  };

  console.log('🧰 core.js loaded');
})();