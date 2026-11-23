/* effects.js — تأثيرات بصرية خفيفة للواجهة (172) — window.FxEffects
   1) تموّج (ripple) عند الضغط على الأزرار والبلاطات  2) ضوء يلحق الماوس على البطاقات (كمبيوتر فقط)
   3) انفجار ألوان صغير لما تخلّص مهمة. كله transform/opacity (رخيص)، ويحترم «تقليل الحركة». */
(function(){
  'use strict';
  var W = window, D = document;
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var RIP = '.fx-btn,.fx-tile,.fx-nbtn,.fx-tool,.fx-chip,.fx-tm-d,.fx-tm-c,.mx-fab,.fx-nav button';
  var COLORS = ['#8b5cf6', '#22c3ee', '#10b981', '#f59e0b', '#f43f5e', '#ec4899'];

  function ripple(e){
    var el = e.target.closest && e.target.closest(RIP);
    if(!el || !el.closest('#fx')) return;
    var r = el.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, sp = D.createElement('span');
    sp.className = 'fx-rip'; sp.setAttribute('aria-hidden', 'true');
    sp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    if(getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('fx-ripc'); el.appendChild(sp);
    setTimeout(function(){ if(sp.parentNode) sp.parentNode.removeChild(sp); }, 650);
  }

  function burst(x, y){
    var box = D.createElement('div'); box.className = 'fx-burst'; box.setAttribute('aria-hidden', 'true');
    box.style.left = x + 'px'; box.style.top = y + 'px';
    for(var i = 0; i < 12; i++){
      var p = D.createElement('i'), a = (Math.PI * 2 * i / 12) + Math.random() * 0.4, d = 26 + Math.random() * 22;
      p.style.cssText = '--x:' + (Math.cos(a) * d).toFixed(1) + 'px;--y:' + (Math.sin(a) * d).toFixed(1) + 'px;background:' + COLORS[i % COLORS.length] + ';animation-delay:' + Math.floor(Math.random() * 40) + 'ms';
      box.appendChild(p);
    }
    D.body.appendChild(box);
    setTimeout(function(){ if(box.parentNode) box.parentNode.removeChild(box); }, 800);
  }

  function onClick(e){
    var ck = e.target.closest && e.target.closest('#fx [data-fx="tog"]:is(.fx-ck,.fx-check)');
    if(ck && ck.getAttribute('aria-checked') !== 'true'){
      var r = ck.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2);
    }
  }

  /* ضوء الماوس: نحدّث --mx/--my للبطاقة اللي تحت الماوس بس، مرة لكل إطار */
  var last = null, raf = 0, ev = null;
  function spot(){
    raf = 0;
    var e = ev, card = e && e.target && e.target.closest ? e.target.closest('#fx .fx-glass') : null;
    if(last && last !== card) last.classList.remove('fx-lit');
    last = card; if(!card) return;
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    card.classList.add('fx-lit');
  }

  var started = false;
  function init(){
    if(reduce || started) return; started = true;
    D.addEventListener('pointerdown', ripple, { passive: true });
    D.addEventListener('click', onClick, true);
    if(fine){
      D.addEventListener('pointermove', function(e){ ev = e; if(!raf) raf = requestAnimationFrame(spot); }, { passive: true });
      D.documentElement.addEventListener('pointerleave', function(){ if(last) last.classList.remove('fx-lit'); last = null; });
    }
  }
  W.FxEffects = { burst: burst, init: init };
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
