/* ============================================================
   mobile.js — إحساس «تطبيق» على التلفون (≤820px أو لمس) — 170
   1) زر «+» عائم (مهمة/امتحان/مصروف/ملاحظة)      2) النوافذ تنسحب لتحت وتتسكّر (Bottom Sheet)
   3) العنوان بيصغر ويثبت بالشريط العلوي لما تنزل  4) مؤشر متحرّك تحت التبويب النشط بالشريط السفلي
   5) «اليوم» أقصر: الأقسام الطويلة بتنطوي (عرض الكل) 6) سحب المهمة: يمين = خلّصتها، يسار = بكرة
   7) اهتزاز خفيف عند الحفظ/الإضافة                   8) سحب لتحت بأعلى الصفحة = تحديث
   9) شارة بعدد المهام المتأخرة على «المهام» بالشريط السفلي
   التصميم بـcss/13-mobile.css. ما بيغيّر بيانات إلا بإجراء صريح من المستخدم (سحب مهمة). على الكمبيوتر ما بيعمل إشي.
   ============================================================ */
(function(){
  'use strict';
  var W = window, d = document;
  function phone(){ try{ return W.matchMedia('(max-width: 820px), (pointer: coarse)').matches; }catch(e){ return W.innerWidth <= 820; } }
  function vib(p){ try{ if(W.Haptic) W.Haptic(p); else if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(x){ return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  function today(){ return ymd(new Date()); }
  function tomorrow(){ var x = new Date(); x.setDate(x.getDate() + 1); return ymd(x); }
  function root(){ return d.getElementById('fx'); }
  function main(){ return d.getElementById('fxMain'); }
  function curView(){ return (location.hash || '#today').slice(1) || 'today'; }
  function rerender(){ try{ if(W.FocusUI && W.FocusUI.go) W.FocusUI.go(curView() === 'dashboard' ? 'today' : curView()); }catch(e){} }
  function saveSp(){ try{ if(W.saveSpace) W.saveSpace(); }catch(e){} }

  /* ---------- 1) زر «+» العائم ---------- */
  var FAB = [['task', 'مهمة', '✓', function(){ if(W.addTask) W.addTask(); }], ['exam', 'امتحان', '⏳', function(){ if(W.addExam) W.addExam(); }],
    ['expense', 'مصروف', '💸', function(){ if(W.addBudgetItem) W.addBudgetItem('expense'); }], ['note', 'ملاحظة', '📔', function(){ if(W.addCourseNote) W.addCourseNote(); }]];
  function buildFab(){
    var r = root(); if(!r || d.getElementById('mxFab')) return;
    var wrap = d.createElement('div'); wrap.className = 'mx-fabwrap'; wrap.id = 'mxFabWrap';
    wrap.innerHTML = '<div class="mx-fabmenu" id="mxFabMenu" role="menu" hidden>' + FAB.map(function(x, i){ return '<button type="button" class="mx-fabit" role="menuitem" data-mx="' + i + '" style="--d:' + (i * 35) + 'ms"><span>' + x[1] + '</span><i aria-hidden="true">' + x[2] + '</i></button>'; }).join('') + '</div>' +
      '<button type="button" class="mx-fab" id="mxFab" aria-label="إضافة جديد" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>';
    r.appendChild(wrap);
    var btn = wrap.querySelector('#mxFab'), menu = wrap.querySelector('#mxFabMenu');
    function setOpen(o){ menu.hidden = !o; btn.setAttribute('aria-expanded', o ? 'true' : 'false'); wrap.classList.toggle('open', o); }
    btn.addEventListener('click', function(e){ e.stopPropagation(); vib(8); setOpen(menu.hidden); });
    menu.addEventListener('click', function(e){ var b = e.target.closest('[data-mx]'); if(!b) return; setOpen(false); vib(8); try{ FAB[+b.getAttribute('data-mx')][3](); }catch(err){} });
    d.addEventListener('click', function(e){ if(!menu.hidden && !wrap.contains(e.target)) setOpen(false); });
    d.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !menu.hidden) setOpen(false); });
  }

  /* ---------- 2) النوافذ: سحب لتحت للإغلاق ---------- */
  function closeSheet(panel){
    var bd = panel.closest('.modal-backdrop,.hub-sheet-backdrop') || panel.parentNode;
    var x = bd && bd.querySelector('.hub-x,#mCancel,.modal-x,.m-close,[data-close],button[aria-label="إغلاق"]');
    if(x){ x.click(); return; }
    try{ bd.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }catch(e){}
    if(bd && bd.isConnected) setTimeout(function(){ if(bd.isConnected && bd.classList.contains('modal-backdrop')) bd.remove(); }, 60);
  }
  var drag = null;
  d.addEventListener('touchstart', function(e){
    if(!phone() || e.touches.length !== 1) return;
    var panel = e.target.closest && e.target.closest('.modal-backdrop .modal, .hub-sheet'); if(!panel) return;
    if(e.target.closest('input,textarea,select,[contenteditable],.hub-ctabs,.mx-noswipe')) return;
    var body = panel.querySelector('.hub-sheet-body') || panel, r = panel.getBoundingClientRect(), y = e.touches[0].clientY;
    if(y - r.top > 64 && body.scrollTop > 0) return;   /* بنص المحتوى وهو ممرور: هاد تمرير مش سحب */
    drag = { panel: panel, y0: y, dy: 0, t: Date.now(), body: body };
  }, { passive: true });
  d.addEventListener('touchmove', function(e){
    if(!drag) return; var dy = e.touches[0].clientY - drag.y0;
    if(dy < 0 || (drag.body.scrollTop > 0 && drag.dy === 0)){ if(dy < -8) drag = null; return; }
    drag.dy = dy; drag.panel.style.transition = 'none'; drag.panel.style.transform = 'translateY(' + dy + 'px)';
  }, { passive: true });
  d.addEventListener('touchend', function(){
    if(!drag) return; var g = drag; drag = null;
    var fast = g.dy > 50 && Date.now() - g.t < 250;
    g.panel.style.transition = 'transform .22s cubic-bezier(.22,1,.36,1)';
    if(g.dy > 110 || fast){ g.panel.style.transform = 'translateY(100%)'; vib(6); setTimeout(function(){ closeSheet(g.panel); }, 160); }
    else g.panel.style.transform = '';
    setTimeout(function(){ if(g.panel.isConnected){ g.panel.style.transition = ''; } }, 260);
  }, { passive: true });

  /* ---------- 3) العنوان بيصغر ويثبت فوق ---------- */
  var titleEl = null;
  function ensureTitle(){
    var top = d.querySelector('#fx .fx-top'); if(!top || d.getElementById('mxTitle')) return;
    titleEl = d.createElement('div'); titleEl.id = 'mxTitle'; titleEl.className = 'mx-title'; titleEl.setAttribute('aria-hidden', 'true');
    var logo = top.querySelector('.fx-logo'); if(logo && logo.nextSibling) top.insertBefore(titleEl, logo.nextSibling); else top.appendChild(titleEl);
  }
  function onScroll(){
    var m = main(), r = root(); if(!m || !r) return;
    var h1 = m.querySelector('.fx-head h1, h1'), lim = h1 ? h1.offsetTop + h1.offsetHeight - 8 : 60;
    var on = phone() && m.scrollTop > lim;
    r.classList.toggle('mx-scrolled', on);
    if(titleEl) titleEl.textContent = on && h1 ? h1.textContent.trim() : '';
  }

  /* ---------- 4+9) مؤشر الشريط السفلي + شارة المتأخرة ---------- */
  function navUpdate(){
    var nav = d.querySelector('#fx .fx-nav'); if(!nav) return;
    var bs = [].slice.call(nav.querySelectorAll('button')), i = bs.findIndex(function(b){ return b.classList.contains('on'); });
    nav.style.setProperty('--mx-i', String(Math.max(0, i))); nav.style.setProperty('--mx-n', String(bs.length || 5));
    nav.classList.toggle('mx-has', i >= 0);
    var late = 0, t = today(); ((W.space || {}).tasks || []).forEach(function(x){ if(x && !x.done && x.due && x.due < t) late++; });
    var tb = nav.querySelector('[data-v="tasks"]'); if(!tb) return;
    var bd = tb.querySelector('.mx-badge'); if(!late){ if(bd) bd.remove(); return; }
    if(!bd){ bd = d.createElement('em'); bd.className = 'mx-badge'; tb.appendChild(bd); }
    bd.textContent = late > 9 ? '9+' : String(late); bd.setAttribute('aria-label', late + ' مهام متأخرة');
  }

  /* ---------- 5) «اليوم» أقصر: الأقسام الطويلة بتنطوي ---------- */
  var OPEN = {};
  function foldToday(){
    if(!phone() || curView() !== 'today' && curView() !== 'dashboard') return;
    var m = main(); if(!m) return;
    [].forEach.call(m.querySelectorAll('.fx-sec'), function(sec, si){
      var rows = sec.querySelectorAll('.fx-ln'); if(rows.length <= 3 || sec.querySelector('.mx-more')) return;
      var key = (sec.querySelector('h3') || {}).textContent || String(si);
      var b = d.createElement('button'); b.type = 'button'; b.className = 'mx-more';
      function paint(){ var o = !!OPEN[key]; sec.classList.toggle('mx-fold', !o); b.textContent = o ? 'عرض أقل' : 'عرض الكل (' + rows.length + ')'; b.setAttribute('aria-expanded', o ? 'true' : 'false'); }
      b.addEventListener('click', function(){ OPEN[key] = !OPEN[key]; paint(); vib(6); });
      sec.appendChild(b); paint();
    });
  }

  /* ---------- 6) سحب المهمة: يمين = خلّصتها · يسار = بكرة ---------- */
  var sw = null;
  function taskRow(t){ var row = t.closest && t.closest('.fx-lntask, .fx-task'); if(!row) return null; var tg = row.querySelector('[data-fx="tog"][data-id]'); return tg ? { row: row, id: tg.getAttribute('data-id') } : null; }
  d.addEventListener('touchstart', function(e){
    if(!phone() || e.touches.length !== 1 || e.target.closest('button,a,input')) { sw = null; return; }
    var r = taskRow(e.target); if(!r){ sw = null; return; }
    sw = { row: r.row, id: r.id, x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, on: false };
  }, { passive: true });
  d.addEventListener('touchmove', function(e){
    if(!sw) return; var dx = e.touches[0].clientX - sw.x0, dy = e.touches[0].clientY - sw.y0;
    if(!sw.on){ if(Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)){ sw = null; return; } if(Math.abs(dx) < 12) return; sw.on = true; sw.row.classList.add('mx-swiping'); }
    sw.dx = dx; sw.row.style.transform = 'translateX(' + dx + 'px)';
    sw.row.classList.toggle('mx-sw-done', dx > 70); sw.row.classList.toggle('mx-sw-later', dx < -70);
  }, { passive: true });
  d.addEventListener('touchend', function(){
    if(!sw) return; var s = sw; sw = null; if(!s.on) return;
    s.row.style.transition = 'transform .2s ease'; s.row.style.transform = '';
    setTimeout(function(){ s.row.classList.remove('mx-swiping', 'mx-sw-done', 'mx-sw-later'); s.row.style.transition = ''; }, 220);
    if(s.dx > 80){ if(W.toggleTask) W.toggleTask(s.id); setTimeout(rerender, 180); }
    else if(s.dx < -80){
      var t = ((W.space || {}).tasks || []).filter(function(x){ return x.id === s.id; })[0]; if(!t) return;
      var old = t.due; t.due = tomorrow(); saveSp(); vib(10); setTimeout(rerender, 150);
      var msg = 'تأجّلت «' + t.title + '» لبكرة', undo = function(){ t.due = old; saveSp(); rerender(); };
      if(W.toastUndo) W.toastUndo(msg, undo, 5000); else if(W.toast) W.toast(msg, 'info', 4000);
    }
  }, { passive: true });

  /* ---------- 7) اهتزاز عند الحفظ ---------- */
  d.addEventListener('click', function(e){
    if(!phone()) return;
    var b = e.target.closest && e.target.closest('.modal .btn-primary, .modal [type=submit], #mSave, .fx-add button[type=submit], [data-fx="attnow"]');
    if(b) vib(10);
  }, true);

  /* ---------- 8) سحب لتحت بأعلى «اليوم» = تحديث ---------- */
  var pull = null, ind = null;
  function indicator(){ if(ind) return ind; ind = d.createElement('div'); ind.className = 'mx-pull'; ind.innerHTML = '<i></i>'; var r = root(); if(r) r.appendChild(ind); return ind; }
  d.addEventListener('touchstart', function(e){
    var m = main(); if(!phone() || !m || e.touches.length !== 1 || m.scrollTop > 0 || !m.contains(e.target) || e.target.closest('input,textarea,.fx-lntask,.fx-task')) { pull = null; return; }
    pull = { y0: e.touches[0].clientY, dy: 0 };
  }, { passive: true });
  d.addEventListener('touchmove', function(e){
    if(!pull) return; var dy = e.touches[0].clientY - pull.y0; if(dy <= 0){ pull.dy = 0; return; }
    pull.dy = dy; var i = indicator(), p = Math.min(1, dy / 90); i.style.opacity = String(p); i.style.transform = 'translate(-50%,' + Math.min(70, dy * .6) + 'px) rotate(' + (dy * 3) + 'deg)'; i.classList.toggle('ready', dy > 90);
  }, { passive: true });
  d.addEventListener('touchend', function(){
    if(!pull) return; var p = pull; pull = null; var i = ind; if(!i) return;
    if(p.dy > 90){
      i.classList.add('spin'); vib(10);
      setTimeout(function(){ if(navigator.onLine === false){ i.classList.remove('spin'); i.style.opacity = '0'; if(W.toast) W.toast('أنت أوفلاين — عرضت آخر نسخة محفوظة', 'warn', 3000); rerender(); return; } location.reload(); }, 350);
    } else { i.style.opacity = '0'; i.style.transform = 'translate(-50%,0)'; }
  }, { passive: true });

  /* ---------- تشغيل ---------- */
  function onRender(){ navUpdate(); foldToday(); onScroll(); }
  function start(){
    if(!root() || !main()){ setTimeout(start, 300); return; }
    buildFab(); ensureTitle(); onRender();
    main().addEventListener('scroll', onScroll, { passive: true });
    try{ new MutationObserver(function(){ onRender(); }).observe(main(), { childList: true }); }catch(e){}
    try{ var nav = d.querySelector('#fx .fx-nav'); if(nav) new MutationObserver(navUpdate).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] }); }catch(e){}
  }
  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function(){ setTimeout(start, 400); }); else setTimeout(start, 400);
  W.MobileUX = { phone: phone, navUpdate: navUpdate, foldToday: foldToday };
})();
