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
  window.APP_BUILD = '89';

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