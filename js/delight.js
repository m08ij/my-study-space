/* delight.js — (176) لمسات تخلّي التطبيق ممتع: window.Delight
   1) خلفية حسب الوقت: صنف tod-morning/noon/evening/night على #fx (CSS بـ14-home.css)، تتحدّث كل 10 د. تنطفي بـss_fx_tod=0.
   2) أصوات خفيفة (WebAudio بدون ملفات) + اهتزاز: إنجاز مهمة وتسجيل حضور. تنطفي بـss_fx_feel=off.
   3) احتفالات: خلصت خطة اليوم · وصلت هدف التركيز · خلصت كل مهام الأسبوع — قصاصات + بطاقة رسالة (مرة وحدة لكل مناسبة).
   4) ضغط مطوّل على مهمة/مادة/محاضرة: قائمة سريعة (إنجاز/تعديل/تأجيل/حذف، أو افتح/تركيز/حضرت). */
(function(){
  'use strict';
  var W = window, D = document;
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(d){ d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function esc(s){ return W.esc ? W.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sp(){ return W.space || {}; }
  function reduced(){ try{ return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
  function feelOn(){ return lsGet('ss_fx_feel') !== 'off'; }
  function rerender(){ try{ if(W.FocusUI && W.FocusUI.render) W.FocusUI.render(false); }catch(e){} }

  /* ---------- 1) خلفية حسب الوقت ---------- */
  var TODS = ['tod-morning', 'tod-noon', 'tod-evening', 'tod-night'];
  function tod(){
    var fx = D.getElementById('fx'); if(!fx) return;
    var h = new Date().getHours(), k = h >= 5 && h < 11 ? 0 : h >= 11 && h < 16 ? 1 : h >= 16 && h < 19 ? 2 : 3, on = lsGet('ss_fx_tod') !== '0';
    TODS.forEach(function(c, i){ fx.classList.toggle(c, on && i === k); });
  }

  /* ---------- 2) أصوات + اهتزاز ---------- */
  var ac = null;
  function ctx(){ try{ if(!ac){ var A = W.AudioContext || W.webkitAudioContext; if(!A) return null; ac = new A(); } if(ac.state === 'suspended') ac.resume(); return ac; }catch(e){ return null; } }
  function tone(f, t0, len, vol, type){
    var c = ctx(); if(!c) return; var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (t0 || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + (len || 0.12));
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (len || 0.12) + 0.02);
  }
  /* تجهيز الصوت بوقت فاضي بعد أول لمسة (المتصفح بيسمح بعد تفاعل) — أول إنجاز مهمة ما بيعلق */
  D.addEventListener('pointerdown', function warm(){ D.removeEventListener('pointerdown', warm, true); if(!feelOn()) return;
    (W.requestIdleCallback || function(f){ return setTimeout(f, 300); })(function(){ ctx(); }, { timeout: 2000 }); }, true);
  function vib(p){ try{ if(feelOn() && !reduced() && navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function tick(){ if(!feelOn()) return; tone(880, 0, 0.09, 0.05); tone(1320, 0.06, 0.12, 0.04); }   /* الاهتزاز من ux.js (Haptic) */
  function chime(){ if(!feelOn()) return; tone(660, 0, 0.14, 0.05); tone(880, 0.09, 0.14, 0.05); tone(1175, 0.18, 0.22, 0.045); }
  function fanfare(){ if(!feelOn()) return; [523, 659, 784, 1047].forEach(function(f, i){ tone(f, i * 0.09, 0.2, 0.05, 'triangle'); }); vib([12, 50, 12, 50, 20]); }

  /* ---------- 3) احتفالات ---------- */
  function party(icon, title, sub){
    if(D.querySelector('.dl-party')) return;
    if(W.celebrate && !reduced()) W.celebrate(2);
    fanfare();
    var el = D.createElement('div'); el.className = 'dl-party'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="dl-pc"><span class="dl-pi">' + icon + '</span><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    D.body.appendChild(el);
    setTimeout(function(){ if(el.parentNode){ el.classList.add('out'); setTimeout(function(){ el.remove(); }, 260); } }, 3200);
  }
  function once(key, val){ if(lsGet(key) === val) return false; lsSet(key, val); return true; }
  function weekRange(){ var t0 = new Date(); t0.setHours(0, 0, 0, 0); t0.setDate(t0.getDate() - t0.getDay()); var t6 = new Date(t0.getTime()); t6.setDate(t6.getDate() + 6); return [ymd(t0), ymd(t6)]; }
  function checkWeek(){
    var r = weekRange(), wk = (sp().tasks || []).filter(function(x){ return x && x.title && x.due && x.due >= r[0] && x.due <= r[1]; });
    if(wk.length >= 3 && wk.every(function(x){ return x.done; }) && once('ss_party_week', r[0])) setTimeout(function(){ party('🏆', 'خلّصت كل مهام الأسبوع!', wk.length + ' مهام — أسبوع بطل 👏'); }, 700);
  }
  function focusMin(){
    var log = {}; try{ log = W.S && W.S.get ? W.S.get('studyLog', {}) || {} : JSON.parse(lsGet('studyLog') || '{}') || {}; }catch(e){}
    var fm = 0; try{ var dd = sp().dayPlan && sp().dayPlan.days && sp().dayPlan.days[ymd()]; if(dd && dd.fm) Object.keys(dd.fm).forEach(function(k){ fm += +dd.fm[k] || 0; }); }catch(e){}
    return Math.max(Math.round(+log[ymd()] || 0), Math.round(fm));
  }
  function checkFocus(){
    var goal = +lsGet('ss_fx_goal') || 120;
    if(focusMin() >= goal && once('ss_party_focus', ymd())) setTimeout(function(){ party('🎯', 'وصلت هدف التركيز اليوم!', 'ركّزت ' + focusMin() + ' دقيقة — كمّل هيك'); }, 900);
  }
  function checkPlan(){
    try{ var P = W.DayPlan; if(!P || !P.viewFor) return; var v = P.viewFor(ymd(), new Date());
      if(v && v.n && v.ok && once('ss_party_plan', ymd())) setTimeout(function(){ party('🌟', 'خلّصت خطة اليوم!', 'كل مادة إلها بند منجز — السلسلة كبرت 🔥'); }, 600);
    }catch(e){}
  }

  /* ربط بدوال التطبيق (بعد ما تتحمّل) */
  /* بعد ما تنرسم الضغطة (الصوت بيشغّل AudioContext وهاد تقيل على التلفون لو صار بنفس اللحظة) */
  function later(fn){ requestAnimationFrame(function(){ setTimeout(fn, 0); }); }
  function wrap(obj, name, after){
    var o = obj && obj[name]; if(typeof o !== 'function' || o._dl) return;
    var n = function(){ var r = o.apply(this, arguments); try{ after.apply(null, arguments); }catch(e){} return r; }; n._dl = true; obj[name] = n;
  }
  function hook(){
    wrap(W, 'toggleTask', function(id){ var t = (sp().tasks || []).filter(function(x){ return x && x.id === id; })[0]; if(t && t.done) later(function(){ tick(); checkWeek(); }); });
    wrap(W, 'markAttendance', function(n, type){ if(type === 'present') later(chime); });
    if(W.DayPlan) wrap(W.DayPlan, 'toggle', function(){ checkPlan(); });
  }
  D.addEventListener('ss:focus-complete', function(){ setTimeout(checkFocus, 400); });

  /* ---------- 4) ضغط مطوّل ← قائمة سريعة ---------- */
  var LP = '.fx-task,.fx-lntask,.fx-ccard,.fx-tl-b,.fx-wkc,.fx-ln[data-fx="course"]';
  var press = null, suppress = 0;
  function targetInfo(el){
    var tb = el.querySelector('[data-fx="tog"][data-id]');
    if(tb){ var id = tb.getAttribute('data-id'), t = (sp().tasks || []).filter(function(x){ return x && x.id === id; })[0]; return t ? { kind: 'task', t: t } : null; }
    var n = el.getAttribute('data-n'); if(!n) return null;
    var c = (sp().courses || []).filter(function(x){ return x && x.name === n; })[0]; return { kind: 'course', name: n, c: c };
  }
  function sheet(info){
    var ov = D.createElement('div'); ov.className = 'lp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    var items = [];
    if(info.kind === 'task'){
      var t = info.t;
      ov.setAttribute('aria-label', 'خيارات المهمة');
      items = [[t.done ? '↩️' : '✅', t.done ? 'رجّعها مش منجزة' : 'خلصت', 'done'], ['✏️', 'تعديل', 'edit'], ['⏭️', 'أجّلها لبكرة', 'later'], ['🗑️', 'حذف', 'del', 1]];
      ov.innerHTML = '<div class="lp-sh"><div class="lp-hd"><b>' + esc(t.title) + '</b><small>' + esc(t.course || 'مهمة') + '</small></div>';
    } else {
      ov.setAttribute('aria-label', 'خيارات المادة');
      items = [['📂', 'افتح المادة', 'open'], ['▶️', 'ابدأ جلسة تركيز', 'focus'], ['✅', 'سجّل حضور اليوم', 'att']];
      ov.innerHTML = '<div class="lp-sh"><div class="lp-hd"><b>' + esc(info.name) + '</b><small>مادة</small></div>';
    }
    var sh = ov.firstChild;
    sh.innerHTML += items.map(function(x){ return '<button type="button" class="lp-it' + (x[3] ? ' danger' : '') + '" data-lp="' + x[2] + '"><span>' + x[0] + '</span>' + x[1] + '</button>'; }).join('') + '<button type="button" class="lp-it lp-cancel" data-lp="x">إلغاء</button>';
    var prev = D.activeElement;
    function close(){ ov.classList.add('out'); D.removeEventListener('keydown', key, true); setTimeout(function(){ ov.remove(); }, 200); try{ if(prev && prev.focus) prev.focus({ preventScroll: true }); }catch(e){} }
    function key(e){ if(e.key === 'Escape'){ e.stopPropagation(); close(); } }
    ov.addEventListener('click', function(e){
      if(e.target === ov){ close(); return; }
      var b = e.target.closest('[data-lp]'); if(!b) return; var a = b.getAttribute('data-lp'); close(); if(a === 'x') return;
      setTimeout(function(){ act(info, a); }, 120);
    });
    D.addEventListener('keydown', key, true);
    D.body.appendChild(ov);
    setTimeout(function(){ var f = ov.querySelector('.lp-it'); try{ if(f) f.focus({ preventScroll: true }); }catch(e){} }, 50);
  }
  function act(info, a){
    if(info.kind === 'task'){
      var t = info.t;
      if(a === 'done' && W.toggleTask){ W.toggleTask(t.id); rerender(); }
      else if(a === 'edit' && W.editTask) W.editTask(t.id);
      else if(a === 'del' && W.deleteTask){ W.deleteTask(t.id); setTimeout(rerender, 60); }
      else if(a === 'later'){
        var old = t.due, x = new Date(); x.setDate(x.getDate() + 1); t.due = ymd(x); if(W.saveSpace) W.saveSpace(); rerender();
        var undo = function(){ t.due = old; if(W.saveSpace) W.saveSpace(); rerender(); };
        if(W.toastUndo) W.toastUndo('تأجّلت «' + t.title + '» لبكرة', undo, 5000); else if(W.toast) W.toast('تأجّلت لبكرة', 'info', 3000);
      }
    } else {
      if(a === 'open'){ if(info.c && W.Hub && W.Hub.openCourse) W.Hub.openCourse(info.c.id, 'over'); }
      else if(a === 'focus'){ lsSet('ss_dp_focus', JSON.stringify({ d: ymd(), k: '', c: info.name })); if(W.FocusUI && W.FocusUI.study) W.FocusUI.study(); }
      else if(a === 'att' && W.markAttendance){ W.markAttendance(info.name, 'present'); rerender(); }
    }
  }
  function lpStart(e){
    if(e.button > 0 || e.pointerType === 'mouse') return;   /* بالماوس: كليك يمين (contextmenu تحت) */
    var el = e.target.closest && e.target.closest(LP); if(!el || !el.closest('#fx') || e.target.closest('input,textarea,select')) return;
    press = { el: el, x: e.clientX, y: e.clientY, tm: setTimeout(function(){
      var info = targetInfo(el); press = null; if(!info) return;
      suppress = Date.now(); vib(18); el.classList.add('lp-hit'); setTimeout(function(){ el.classList.remove('lp-hit'); }, 300);
      sheet(info);
    }, 480) };
    el.classList.add('lp-arm');
  }
  function lpCancel(e){
    if(!press) return;
    if(e && e.type === 'pointermove' && Math.abs(e.clientX - press.x) < 10 && Math.abs(e.clientY - press.y) < 10) return;
    clearTimeout(press.tm); press.el.classList.remove('lp-arm'); press = null;
  }
  D.addEventListener('pointerdown', lpStart, { passive: true });
  D.addEventListener('pointermove', lpCancel, { passive: true });
  D.addEventListener('pointerup', function(){ if(press){ press.el.classList.remove('lp-arm'); } lpCancel(); }, { passive: true });
  D.addEventListener('pointercancel', lpCancel, { passive: true });
  D.addEventListener('scroll', lpCancel, { passive: true, capture: true });
  /* الضغطة اللي بعد الضغط المطوّل ما تفتح إشي */
  D.addEventListener('click', function(e){ if(suppress && Date.now() - suppress < 700){ e.preventDefault(); e.stopPropagation(); suppress = 0; } }, true);
  /* كمبيوتر: كليك يمين على مهمة/مادة بيفتح نفس القائمة */
  D.addEventListener('contextmenu', function(e){
    var el = e.target.closest && e.target.closest(LP); if(!el || !el.closest('#fx')) return;
    var info = targetInfo(el); if(!info) return; e.preventDefault(); sheet(info);
  });

  W.Delight = { tod: tod, tick: tick, chime: chime, party: party, checkPlan: checkPlan, checkFocus: checkFocus, checkWeek: checkWeek, sheet: sheet };
  function boot(){ tod(); hook(); setTimeout(hook, 1500); setTimeout(tod, 600); setInterval(tod, 10 * 60 * 1000); }
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
