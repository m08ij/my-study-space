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

  function fmtTime(t){ try{ return new Date(t).toLocaleString('ar-JO', { dateStyle: 'short', timeStyle: 'medium' }); }catch(e){ return String(t); } }
  function report(){
    var a = load().slice().reverse(), L = ['Study Space — تقرير أخطاء', 'الإصدار: ' + (window.APP_BUILD || '?'), 'المتصفح: ' + (navigator.userAgent || ''), 'الوقت: ' + fmtTime(Date.now()), ''];
    if(!a.length) L.push('لا أخطاء مسجّلة.');
    a.forEach(function(x){ L.push('[' + fmtTime(x.t) + '] ' + (x.k === 'promise' ? 'Promise' : 'Error') + (x.n > 1 ? ' ×' + x.n : '') + ' — ' + x.m + (x.s ? '  (' + x.s + ')' : '')); });
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
      (a.length ? '<div class="diag-list">' + a.map(function(x){
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
      try{ navigator.clipboard.writeText(txt).then(function(){ if(window.toast) window.toast('📋 نُسخ التقرير', 'success', 1800); }, function(){ if(window.toast) window.toast('تعذّر النسخ — حدّد النص يدوياً', 'warn', 2500); }); }
      catch(e){ if(window.toast) window.toast('تعذّر النسخ', 'warn', 2500); }
    };
    var c = bd.querySelector('#diagCopy'); if(c) c.focus();
  }

  function bind(){
    var b = document.getElementById('diagBtn');
    if(b && !b._diag){ b._diag = true; b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); open(); }); }
    badge();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();

  window.DiagLog = { list: load, clear: function(){ save([]); badge(); }, report: report, open: open, add: add };
})();
