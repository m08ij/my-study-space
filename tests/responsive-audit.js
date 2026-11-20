/* أداة تدقيق التجاوب (تُحقن داخل الصفحة بمتصفح حقيقي، لا تُحمَّل بالتطبيق):
   في Console أو أداة المتصفح:  const s=document.createElement('script'); s.src='/tests/responsive-audit.js'; document.head.appendChild(s);
   ثم:  await __sum()   ← يمرّ على كل الصفحات والنوافذ بالحجم الحالي للنافذة ويرجع الملخص (JSON).
   يفحص: تمرير أفقي بالصفحة، عناصر خارج الشاشة، نصوص مقصوصة، أهداف لمس أصغر من 30px (≤900px)، تداخل العناصر الثابتة، وملاءمة النوافذ للشاشة.
   ملاحظة: يُستخدم مع بيانات اختبار (في متصفح الاختبار فقط). */
(function(){
  window.__audit = async function(opts){
    opts = opts || {}; var sl = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
    var W = innerWidth, H = innerHeight, out = { w: W, h: H, docOverflow: {}, pages: {}, overlays: {}, fixed: [] };
    function hidden(el){ var cs = getComputedStyle(el); return cs.display === 'none' || cs.visibility === 'hidden' || (el.offsetParent === null && cs.position !== 'fixed'); }
    function inScroller(el){ for(var e = el.parentElement; e && e !== document.body; e = e.parentElement){ var cs = getComputedStyle(e); if(/(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth) return true; } return false; }
    function lab(el){ var c = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return (el.id ? '#' + el.id : '') + c || el.tagName.toLowerCase(); }
    function uniq(a){ return Array.from(new Set(a)); }
    var ids = Array.from(document.querySelectorAll('.section')).map(function(s){ return s.id; });
    for(var k = 0; k < ids.length; k++){
      var id = ids[k]; switchTab(id, false); await sl(opts.wait || 280);
      var sec = document.getElementById(id), off = [], clip = [], small = [];
      sec.querySelectorAll('*').forEach(function(el){
        if(hidden(el)) return; var r = el.getBoundingClientRect(); if(!r.width && !r.height) return;
        if((r.right > W + 1.5 || r.left < -1.5) && !inScroller(el)) off.push(lab(el) + '[' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
        var cs = getComputedStyle(el);
        if(el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && /(hidden|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && el.clientWidth > 0 && el.children.length < 4) clip.push(lab(el) + '[' + el.scrollWidth + '>' + el.clientWidth + ']');
        if(W <= 900 && el.matches('button,a[href],input:not([type=hidden]):not([type=file]),select,textarea,[role=button],[role=checkbox],.chip')){
          var m = Math.min(r.width, r.height); if(el.matches('.task-check')){ m = Math.max(m, 44); } if(m < 30) small.push(lab(el) + '(' + Math.round(r.width) + 'x' + Math.round(r.height) + ')');
        }
      });
      out.docOverflow[id] = document.documentElement.scrollWidth > W + 1;
      out.pages[id] = { off: uniq(off).slice(0, 5), clip: uniq(clip).slice(0, 4), small: uniq(small).slice(0, 5), offN: off.length, smallN: small.length };
    }
    switchTab('dashboard', false); await sl(250);
    var fx = ['.bottom-nav', '.fab-main', '.ai-fab', '.lw-expand-btn', '.backup-badge', '.topbar'].map(function(s){ var e = document.querySelector(s); if(!e || hidden(e)) return null; return { s: s, r: e.getBoundingClientRect() }; }).filter(Boolean);
    for(var i = 0; i < fx.length; i++) for(var j = i + 1; j < fx.length; j++){
      var a = fx[i].r, b = fx[j].r, ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if(ix > 4 && iy > 4) out.fixed.push(fx[i].s + '×' + fx[j].s + '(' + Math.round(ix) + 'x' + Math.round(iy) + ')');
    }
    async function ov(name, open, sel, btnSel){
      try{
        open(); await sl(260); var el = document.querySelector(sel); if(!el){ out.overlays[name] = 'لم تفتح'; return; }
        var r = el.getBoundingClientRect(), o = { w: Math.round(r.width), h: Math.round(r.height), fitsW: r.left >= -1 && r.right <= W + 1, fitsH: r.height <= H + 1 };
        /* نافذة أطول من الشاشة مقبولة إن كان داخلها تمرير (الصفحة الجانبية: الجسم .hub-sheet-body) */
        var scroller = el.querySelector('.hub-sheet-body') || el; o.scrolls = /(auto|scroll)/.test(getComputedStyle(scroller).overflowY) || /(auto|scroll)/.test(getComputedStyle(el).overflowY);
        if(btnSel){ var b = document.querySelector(btnSel); if(b){ var br = b.getBoundingClientRect(); o.btnReachable = br.bottom <= H + 1 || o.scrolls; } }
        out.overlays[name] = o;
      }catch(e){ out.overlays[name] = 'خطأ ' + e.message; }
    }
    function closeAll(){ document.querySelectorAll('.modal-backdrop,.modal-ghost').forEach(function(m){ m.remove(); }); if(window.HubUI) while(HubUI.closeTop()); var s = document.getElementById('settingsMenu'); if(s) s.classList.remove('show'); }
    await ov('addTask', function(){ addTask(); }, '.modal', '#mSave'); closeAll(); await sl(150);
    await ov('addExam', function(){ addExam(); }, '.modal', '#mSave'); closeAll(); await sl(150);
    await ov('courseSheet', function(){ switchTab('courses', false); Hub.openCourse(space.courses[0].id); }, '.hub-sheet'); closeAll(); await sl(150);
    await ov('classDetails', function(){ switchTab('timetable', false); var k = Object.keys(space.timetable)[0]; if(k) showClassDetails(k); }, '.hub-sheet'); closeAll(); await sl(150);
    await ov('dashEditor', function(){ switchTab('dashboard', false); DashLayout.edit(); }, '.hub-sheet'); closeAll(); await sl(150);
    await ov('examPlan', function(){ openExamPlan(); }, '.hub-sheet'); closeAll(); await sl(150);
    await ov('settingsMenu', function(){ var b = document.getElementById('settingsBtn'); if(b) b.click(); }, '#settingsMenu'); closeAll(); await sl(150);
    await ov('welcome', function(){ showWelcome(false); }, '.welcome-overlay.show .welcome-card');
    var wo = document.getElementById('welcomeOverlay'); wo.classList.remove('show'); wo.style.display = 'none';
    closeAll(); switchTab('dashboard', false);
    return out;
  };
  window.__sum = async function(){
    var r = await window.__audit(), bad = {};
    Object.keys(r.pages).forEach(function(k){ var v = r.pages[k]; if(v.offN || v.clip.length || v.smallN) bad[k] = { off: v.off, clip: v.clip, small: v.small, n: [v.offN, v.smallN] }; });
    var docs = Object.keys(r.docOverflow).filter(function(k){ return r.docOverflow[k]; }), ovBad = {};
    Object.keys(r.overlays).forEach(function(k){ var v = r.overlays[k]; if(typeof v === 'string' || !v.fitsW || (!v.fitsH && !v.scrolls) || v.btnReachable === false) ovBad[k] = v; });
    return JSON.stringify({ vp: r.w + 'x' + r.h, docOverflow: docs, fixedOverlap: r.fixed, pages: bad, overlays: ovBad });
  };
  window.__seedAudit = function(){
    /* بيانات اختبار معزولة (للمتصفح التجريبي فقط) */
    localStorage.setItem('welcomeDone', 'true'); localStorage.setItem('ss_onboarding_done_v1', 'true');
    return 'ok';
  };
})();

/* ===== فحص التباين (WCAG AA 4.5:1 للنص العادي) لكل الصفحات بالثيم الحالي — يتخطى النص فوق التدرجات (له فحص منفصل) ===== */
(function(){
  function parse(c){ var m = c.match(/rgba?\(([^)]+)\)/); if(!m) return [0, 0, 0, 0]; var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  function over(f, b){ var a = f[3]; return [f[0] * a + b[0] * (1 - a), f[1] * a + b[1] * (1 - a), f[2] * a + b[2] * (1 - a), 1]; }
  function lum(c){ function f(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); } return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }
  function grad(el){ for(var e = el; e; e = e.parentElement){ var bi = getComputedStyle(e).backgroundImage; if(bi && bi !== 'none' && /linear-gradient/.test(bi)) return true; if(parse(getComputedStyle(e).backgroundColor)[3] >= 1) return false; } return false; }
  function bgOf(el){ var layers = []; for(var e = el; e; e = e.parentElement){ var c = parse(getComputedStyle(e).backgroundColor); if(c[3] > 0){ layers.push(c); if(c[3] >= 1) break; } } var r = parse(getComputedStyle(document.body).backgroundColor); for(var i = layers.length - 1; i >= 0; i--) r = over(layers[i], r); return r; }
  window.__contrast = async function(){
    var st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st);
    var ids = Array.from(document.querySelectorAll('.section')).map(function(s){ return s.id; }), n = 0, bad = [];
    for(var k = 0; k < ids.length; k++){
      switchTab(ids[k], false); await new Promise(function(r){ setTimeout(r, 200); });
      var w = document.createTreeWalker(document.getElementById(ids[k]), NodeFilter.SHOW_TEXT), node;
      while(node = w.nextNode()){
        var t = node.nodeValue.trim(); if(!t || !/[\p{L}\p{N}]/u.test(t)) continue; var el = node.parentElement; if(!el || el.offsetParent === null) continue;
        if(el.closest('.dash-collapsed') && !el.closest('.card-head')) continue; if(grad(el)) continue;
        var cs = getComputedStyle(el), bg = bgOf(el), fg = over(parse(cs.color), bg), cr = (Math.max(lum(fg), lum(bg)) + .05) / (Math.min(lum(fg), lum(bg)) + .05); n++;
        if(cr < 4.5 && !(parseFloat(cs.fontSize) >= 24)) bad.push(ids[k] + '|' + t.slice(0, 16) + '|' + cr.toFixed(2) + '|' + (el.className || el.tagName));
      }
    }
    st.remove(); switchTab('dashboard', false); return { n: n, bad: bad.slice(0, 8), badN: bad.length };
  };
})();