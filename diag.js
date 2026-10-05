/* ============================================================
   diag.js — سجل أخطاء محلي (آخر 20 خطأ JavaScript) لتشخيص المشاكل بدل التخمين
   - يُحمَّل مبكراً (بعد core.js) ليلتقط أخطاء بقية الملفات
   - محلي بالكامل: يُخزَّن بـ localStorage (ss_error_log) خارج space والمزامنة والنسخ الاحتياطي، ولا يُرسل لأي مكان
   - يعرض الرسالة والملف والسطر والوقت فقط؛ لا يسجّل بيانات المستخدم
   ============================================================ */
(function(){
  'use strict';
  var KEY = 'ss_error_log', MAX = 20;
  var IGNORE = /ResizeObserver loop|^Script error\.?$|Failed to fetch|NetworkError when attempting|Load failed|AbortError|The operation was aborted/i;

  function load(){ try{ var v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; }catch(e){ return []; } }
  function save(a){ try{ localStorage.setItem(KEY, JSON.stringify(a.slice(-MAX))); }catch(e){} }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function add(kind, msg, src){
    msg = String(msg == null ? '' : msg).replace(/\s+/g, ' ').trim().slice(0, 300);
    if(!msg || IGNORE.test(msg)) return;
    src = String(src || '').slice(0, 160);
    var a = load(), last = a[a.length - 1];
    if(last && last.m === msg && last.s === src){ last.n = (last.n || 1) + 1; last.t = Date.now(); }
    else a.push({ t: Date.now(), k: kind, m: msg, s: src, n: 1 });
    save(a); badge();
  }

  window.addEventListener('error', function(e){
    var f = String(e && e.filename || '').split('/').pop().split('?')[0];
    add('error', e && e.message, f ? f + ':' + (e.lineno || 0) + ':' + (e.colno || 0) : '');
  });
  window.addEventListener('unhandledrejection', function(e){
    var r = e && e.reason, msg = r && (r.message || r), st = r && r.stack ? String(r.stack).split('\n').filter(function(l){ return /\.js/.test(l); })[0] : '';
    add('promise', msg, st ? st.replace(/^.*?([\w.\-]+\.js:\d+(?::\d+)?).*$/, '$1') : '');
  });


  /* ---------- قياس الأداء (بالذاكرة فقط؛ لا يُحفظ ولا يُرسل) ---------- */
  var perfStats = {}, longTasks = { n: 0, max: 0 };
  var RENDERS = ['renderDashboard', 'renderTasks', 'renderExams', 'renderCourses', 'renderBudget', 'renderDecks', 'renderNotes', 'renderTimetable', 'renderAttendance', 'renderGradeCalc', 'renderPlan'];
  function wrapRenders(){
    RENDERS.forEach(function(name){
      var f = window[name]; if(typeof f !== 'function' || f._perf) return;
      var w = function(){
        var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
        try{ return f.apply(this, arguments); }
        finally{
          var d = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0, s = perfStats[name] || (perfStats[name] = { n: 0, sum: 0, max: 0 });
          s.n++; s.sum += d; if(d > s.max) s.max = d;
        }
      };
      w._perf = true; window[name] = w;
    });
  }
  try{
    if(window.PerformanceObserver){ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ longTasks.n++; if(e.duration > longTasks.max) longTasks.max = e.duration; }); }).observe({ entryTypes: ['longtask'] }); }
  }catch(e){}
  window.addEventListener('load', function(){ setTimeout(wrapRenders, 0); });
  function bootInfo(){
    var o = { dcl: null, load: null, scripts: 0, kb: null };
    try{
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if(nav){ o.dcl = Math.round(nav.domContentLoadedEventEnd); o.load = nav.loadEventEnd ? Math.round(nav.loadEventEnd) : null; }
      var res = performance.getEntriesByType ? performance.getEntriesByType('resource') : [], bytes = 0, hasSize = false;
      res.forEach(function(r){ if(r.initiatorType === 'script' && /\.js(\?|$)/.test(r.name)){ o.scripts++; if(r.transferSize){ bytes += r.transferSize; hasSize = true; } } });
      if(hasSize) o.kb = Math.round(bytes / 1024);
    }catch(e){}
    return o;
  }
  function perfRows(){
    return Object.keys(perfStats).map(function(k){ var s = perfStats[k]; return { name: k, n: s.n, avg: s.sum / s.n, max: s.max }; }).sort(function(a, b){ return b.max - a.max; });
  }
  function perfText(){
    var b = bootInfo(), rows = perfRows().slice(0, 6), L = ['⚡ الأداء'];
    L.push('الإقلاع: DOM ' + (b.dcl == null ? '؟' : b.dcl + 'ms') + ' · تحميل كامل ' + (b.load == null ? '؟' : b.load + 'ms') + ' · سكربتات ' + b.scripts + (b.kb != null ? ' (~' + b.kb + 'KB)' : ''));
    L.push('مهام طويلة (>50ms): ' + longTasks.n + (longTasks.n ? ' · أطولها ' + Math.round(longTasks.max) + 'ms' : ''));
    if(rows.length) rows.forEach(function(r){ L.push('رسم ' + r.name.replace(/^render/, '') + ': متوسط ' + r.avg.toFixed(1) + 'ms · أقصى ' + r.max.toFixed(1) + 'ms · ×' + r.n); });
    else L.push('لا قياسات رسم بعد — تنقّل بين الصفحات ثم افتح السجل.');
    return L;
  }
  function perfHtml(){
    return '<div class="diag-perf"><b>⚡ الأداء</b>' + perfText().slice(1).map(function(l){ return '<div class="u-note">' + esc(l) + '</div>'; }).join('') + '</div>';
  }
  function fmtTime(t){ try{ return new Date(t).toLocaleString('ar-JO', { dateStyle: 'short', timeStyle: 'medium' }); }catch(e){ return String(t); } }
  function report(){
    var a = load().slice().reverse(), L = ['Study Space — تقرير أخطاء', 'الإصدار: ' + (window.APP_BUILD || '?'), 'المتصفح: ' + (navigator.userAgent || ''), 'الوقت: ' + fmtTime(Date.now()), ''];
    if(!a.length) L.push('لا أخطاء مسجّلة.');
    a.forEach(function(x){ L.push('[' + fmtTime(x.t) + '] ' + (x.k === 'promise' ? 'Promise' : 'Error') + (x.n > 1 ? ' ×' + x.n : '') + ' — ' + x.m + (x.s ? '  (' + x.s + ')' : '')); });
    L.push(''); perfText().forEach(function(l){ L.push(l); });
    return L.join('\n');
  }

  function badge(){
    var b = document.getElementById('diagBtn'); if(!b) return;
    var n = load().length, t = b.querySelector('.diag-count');
    if(!t){ t = document.createElement('span'); t.className = 'diag-count'; b.appendChild(t); }
    t.textContent = n ? String(n) : ''; t.hidden = !n;
  }

  function open(){
    document.querySelectorAll('.diag-backdrop').forEach(function(m){ m.remove(); });
    var a = load().slice().reverse();
    var bd = document.createElement('div'); bd.className = 'modal-backdrop show diag-backdrop';
    bd.innerHTML = '<div class="modal diag-modal" role="dialog" aria-modal="true" aria-label="سجل الأخطاء">' +
      '<div class="ics-head"><h3>🩺 سجل الأخطاء</h3><button class="sync-x" data-x type="button" aria-label="إغلاق">✕</button></div>' +
      '<p class="ics-note">آخر ' + MAX + ' خطأ برمجي على هذا الجهاز. محفوظ محلياً فقط ولا يُرسل لأي مكان. إذا واجهت مشكلة انسخ التقرير وأرسله.</p>' +
      perfHtml() + (a.length ? '<div class="diag-list">' + a.map(function(x){
        return '<div class="diag-row"><div class="diag-top"><span class="ics-chip ' + (x.k === 'promise' ? 'warn' : 'mute') + '">' + (x.k === 'promise' ? 'Promise' : 'Error') + (x.n > 1 ? ' ×' + x.n : '') + '</span><span class="u-note">' + esc(fmtTime(x.t)) + '</span></div>' +
          '<div class="diag-msg">' + esc(x.m) + '</div>' + (x.s ? '<div class="diag-src" dir="ltr">' + esc(x.s) + '</div>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="u-empty">✅ ما في أخطاء مسجّلة</div>') +
      '<div class="ics-actions"><button class="btn btn-ghost" id="diagClear" type="button"' + (a.length ? '' : ' disabled') + '>مسح السجل</button><button class="btn" id="diagCopy" type="button">📋 نسخ التقرير</button></div></div>';
    document.body.appendChild(bd);
    function close(){ if(window.dismissOverlay) window.dismissOverlay(bd); else bd.remove(); }
    bd.addEventListener('click', function(e){ if(e.target === bd) close(); });
    bd.addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
    bd.querySelector('[data-x]').onclick = close;
    bd.querySelector('#diagClear').onclick = function(){ save([]); badge(); close(); if(window.toast) window.toast('تم مسح السجل', 'info', 1800); };
    bd.querySelector('#diagCopy').onclick = function(){
      var txt = report();
      if(window.copyText) window.copyText(txt, '📋 نُسخ التقرير'); else if(window.toast) window.toast('تعذّر النسخ', 'warn', 2500);
    };
    var c = bd.querySelector('#diagCopy'); if(c) c.focus();
  }

  function bind(){
    var b = document.getElementById('diagBtn');
    if(b && !b._diag){ b._diag = true; b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); open(); }); }
    badge();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();

  window.DiagLog = { perf: function(){ return { boot: bootInfo(), longTasks: longTasks, rows: perfRows() }; }, wrap: wrapRenders, list: load, clear: function(){ save([]); badge(); }, report: report, open: open, add: add };
})();
