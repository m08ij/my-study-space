/* ============================================================
   🌳 plantree.js — الخطة الشجرية التفاعلية (تبويب «الخطة والمواد» ← «🌳 الخطة الشجرية»)
   - تُرسم من COURSES_DB نفسه (حقل pre = المتطلبات السابقة، وt = النوع)؛ لا بيانات منسوخة ولا بيانات وهمية.
   - حالة كل مادة من بياناتك: منجزة (completedCourses) / مسجّلة هذا الفصل (space.courses) / متاحة (متطلباتها منجزة) / مقفلة.
   - تفاعل: ضغط مادة يضيء سلسلة متطلباتها (للخلف) وما تفتحه (للأمام) مع بطاقة تفاصيل وإجراءات (أضف لموادي / علّمها منجزة)،
     بحث، فلاتر حالة، تكبير/تصغير وسحب. لا تكتب شيئاً بنفسها: الإجراءات تمر بدوال course-sync الموجودة.
   - الرسم: عقد HTML (أزرار قابلة للتركيز) فوق SVG للخطوط؛ الأعمدة بحسب عمق المتطلبات والأعمق يسار (RTL: الجذور يمين).
   ============================================================ */
(function(){
  'use strict';
  if(window.PlanTree) return;
  var NW = 158, NH = 48, GX = 72, GY = 12, PAD = 20;
  var TYPES = { 'faculty': 'كلية إجبارية', 'major-c': 'تخصص إجباري', 'major-e': 'تخصص اختياري' };
  var ST = { done: 'منجزة', now: 'مسجّلة الآن', open: 'متاحة', locked: 'مقفلة' };
  var st = { sel: '', filter: 'all', q: '', scale: 0, built: null };

  function $(s, r){ return (r || document).querySelector(s); }
  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sp(){ return window.space || {}; }
  function DB(){ return window.COURSES_DB || {}; }
  function doneMap(){ return window.getCompletedCourses ? window.getCompletedCourses() : {}; }
  function norm(s){ return String(s == null ? '' : s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim(); }

  /* ---------- بناء الرسم: عقد/حواف/أعمدة/إحداثيات (نقي: يعتمد على COURSES_DB فقط) ---------- */
  function build(){
    var db = DB(), names = Object.keys(db).filter(function(n){ return TYPES[db[n].t]; }), set = {}, nodes = {}, edges = [];
    names.forEach(function(n){ set[n] = 1; });
    names.forEach(function(n){ nodes[n] = { name: n, info: db[n], pre: (db[n].pre || []).filter(function(p){ return set[p]; }), post: [], depth: 0 }; });
    names.forEach(function(n){ nodes[n].pre.forEach(function(p){ nodes[p].post.push(n); edges.push([p, n]); }); });
    var memo = {}, busy = {};
    function dep(n){
      if(memo[n] !== undefined) return memo[n];
      if(busy[n]) return 0;                       /* حماية من دورة بالبيانات */
      busy[n] = 1; var d = 0; nodes[n].pre.forEach(function(p){ d = Math.max(d, dep(p) + 1); }); busy[n] = 0; return (memo[n] = d);
    }
    var maxD = 0; names.forEach(function(n){ nodes[n].depth = dep(n); maxD = Math.max(maxD, nodes[n].depth); });
    var cols = []; for(var i = 0; i <= maxD; i++) cols.push([]);
    names.forEach(function(n){ cols[nodes[n].depth].push(n); });
    /* الجذور: حسب الفصل ثم الاسم؛ الباقي: بمتوسط مواضع متطلباتها لتقليل التقاطع */
    cols[0].sort(function(a, b){ return (db[a].sem || 99) - (db[b].sem || 99) || a.localeCompare(b, 'ar'); });
    cols[0].forEach(function(n, k){ nodes[n].order = k; });
    for(var c = 1; c <= maxD; c++){
      cols[c].forEach(function(n){ var ps = nodes[n].pre, s = 0; ps.forEach(function(p){ s += nodes[p].order; }); nodes[n].bary = ps.length ? s / ps.length : 0; });
      cols[c].sort(function(a, b){ return nodes[a].bary - nodes[b].bary || (db[a].sem || 99) - (db[b].sem || 99) || a.localeCompare(b, 'ar'); });
      cols[c].forEach(function(n, k){ nodes[n].order = k; });
    }
    var maxRows = 0; cols.forEach(function(col){ maxRows = Math.max(maxRows, col.length); });
    var H = PAD * 2 + maxRows * (NH + GY) - GY, W = PAD * 2 + (maxD + 1) * NW + maxD * GX;
    cols.forEach(function(col, ci){
      var slot = (H - PAD * 2) / Math.max(1, col.length);
      col.forEach(function(n, k){
        var o = nodes[n]; o.x = W - PAD - NW - ci * (NW + GX);     /* الجذور يميناً */
        o.y = PAD + k * slot + (slot - NH) / 2;
      });
    });
    return { nodes: nodes, names: names, edges: edges, cols: cols, W: W, H: H, maxD: maxD };
  }
  function graph(){ if(!st.built) st.built = build(); return st.built; }

  /* ---------- حالات المواد ---------- */
  function stateOf(g, n){
    var done = doneMap(), nd = g.nodes[n];
    if(done[n]) return 'done';
    if((sp().courses || []).some(function(c){ return c.name === n; })) return 'now';
    return nd.pre.every(function(p){ return done[p]; }) ? 'open' : 'locked';
  }
  function chain(g, n, dir){            /* dir: 'pre' = المتطلبات (للخلف)، 'post' = ما تفتحه (للأمام) */
    var out = {}, stack = [n];
    while(stack.length){ var x = stack.pop(); g.nodes[x][dir].forEach(function(y){ if(!out[y]){ out[y] = 1; stack.push(y); } }); }
    return out;
  }

  /* ---------- الرسم ---------- */
  function edgePath(g, a, b){
    var p = g.nodes[a], c = g.nodes[b], x1 = p.x, y1 = p.y + NH / 2, x2 = c.x + NW, y2 = c.y + NH / 2, mx = (x1 + x2) / 2;
    return 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2;
  }
  function nodeHtml(g, n){
    var o = g.nodes[n], s = stateOf(g, n), lab = /مختبر/.test(n) || /عملية$/.test(n);
    return '<button type="button" class="pt-node t-' + o.info.t + ' s-' + s + (lab ? ' is-lab' : '') + '" data-n="' + esc(n) + '" style="left:' + Math.round(o.x) + 'px;top:' + Math.round(o.y) + 'px;width:' + NW + 'px;height:' + NH + 'px" aria-label="' + esc(n + ' — ' + TYPES[o.info.t] + ' — ' + ST[s]) + '">' +
      '<span class="pt-ic" aria-hidden="true">' + (s === 'done' ? '✓' : s === 'now' ? '●' : s === 'locked' ? '🔒' : '') + '</span><span class="pt-name">' + esc(n) + '</span><small>' + o.info.h + ' س</small></button>';
  }
  function statsLine(g){
    var cnt = { done: 0, now: 0, open: 0, locked: 0 }, hrsDone = 0, hrsAll = 0, db = DB();
    g.names.forEach(function(n){ var s = stateOf(g, n); cnt[s]++; hrsAll += db[n].h; if(s === 'done') hrsDone += db[n].h; });
    return { cnt: cnt, hrsDone: hrsDone, hrsAll: hrsAll, total: g.names.length };
  }

  function render(){
    var root = $('#planTree'); if(!root) return;
    var g = graph(), S = statsLine(g), pct = S.total ? Math.round(S.cnt.done / S.total * 100) : 0;
    if(!st.scale){ st.scale = 1; }
    var edgesSvg = g.edges.map(function(e){ return '<path class="pt-edge" data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" d="' + edgePath(g, e[0], e[1]) + '"/>'; }).join('');
    root.innerHTML =
      '<div class="pt-top">' +
        '<div class="pt-sum"><b>' + S.cnt.done + '</b> / ' + S.total + ' مادة منجزة <span class="pt-pct">' + pct + '%</span><small>' + S.hrsDone + ' من ' + S.hrsAll + ' ساعة (تخصص + كلية)</small>' +
          '<div class="pt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div></div>' +
        '<div class="pt-tools"><input type="search" id="ptSearch" class="pt-search" placeholder="🔍 ابحث عن مادة..." aria-label="بحث بالخطة الشجرية" value="' + esc(st.q) + '">' +
          '<span class="pt-zoom" role="group" aria-label="التكبير"><button type="button" data-z="-" aria-label="تصغير">−</button><button type="button" data-z="fit" aria-label="ملاءمة العرض">⤢</button><button type="button" data-z="+" aria-label="تكبير">＋</button></span></div>' +
      '</div>' +
      '<div class="pt-filters" role="group" aria-label="تصفية الحالة">' +
        [['all', 'الكل'], ['open', '🔓 متاحة الآن (' + S.cnt.open + ')'], ['now', '● مسجّلة (' + S.cnt.now + ')'], ['done', '✓ منجزة (' + S.cnt.done + ')'], ['locked', '🔒 مقفلة (' + S.cnt.locked + ')']].map(function(f){
          return '<button type="button" class="chip' + (st.filter === f[0] ? ' active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div class="pt-legend" aria-hidden="true"><span class="lg t-faculty">كلية إجبارية</span><span class="lg t-major-c">تخصص إجباري</span><span class="lg t-major-e">تخصص اختياري</span><span class="lg lab">مختبر</span></div>' +
      '<div class="pt-wrap"><div class="pt-view" id="ptView" tabindex="0" aria-label="الخطة الشجرية: اسحب للتنقل"><div class="pt-sizer" id="ptSizer"><div class="pt-canvas" id="ptCanvas" style="width:' + g.W + 'px;height:' + g.H + 'px">' +
        '<svg class="pt-svg" width="' + g.W + '" height="' + g.H + '" aria-hidden="true">' + edgesSvg + '</svg>' + g.names.map(function(n){ return nodeHtml(g, n); }).join('') +
      '</div></div></div><aside class="pt-panel" id="ptPanel" aria-live="polite"></aside></div>' +
      '<p class="pt-note">المتطلبات السابقة من خطة قسم هندسة الحاسوب 2023 كما هي مخزّنة بالموقع (لا تُظهر المتطلبات المتزامنة «+» ولا البدائل «أو»). متطلبات الجامعة الإجبارية والاختيارية بلا متطلبات سابقة فما تظهر هنا.</p>';
    bind(root, g);
    fit(false); applyView(); renderPanel();
  }

  /* ---------- العرض: تكبير/تصغير + إضاءة السلسلة + البحث والفلاتر ---------- */
  function applyScale(){
    var g = graph(), cv = $('#ptCanvas'), sz = $('#ptSizer'); if(!cv || !sz) return;
    cv.style.transform = 'scale(' + st.scale + ')'; sz.style.width = Math.round(g.W * st.scale) + 'px'; sz.style.height = Math.round(g.H * st.scale) + 'px';
  }
  /* full=true: ملاءمة كل الشجرة بالعرض؛ وإلا بداية مقروءة والتمرير لليمين حيث الجذور (RTL) */
  function fit(full){
    var v = $('#ptView'), g = graph(); if(!v) return;
    var w = v.clientWidth || 360, f = (w - 8) / g.W;
    st.scale = full ? Math.max(.35, Math.min(1, f)) : (w >= g.W ? 1 : (w < 600 ? .85 : 1));   /* مقروءة افتراضياً (التمرير للجانب)، و«⤢» تعرض الشجرة كاملة */
    applyScale(); v.scrollLeft = v.scrollWidth; v.scrollTop = 0;
  }
  function applyView(){
    var g = graph(), root = $('#planTree'); if(!root) return;
    var up = st.sel ? chain(g, st.sel, 'pre') : {}, down = st.sel ? chain(g, st.sel, 'post') : {}, q = norm(st.q);
    root.classList.toggle('has-sel', !!st.sel); root.classList.toggle('has-q', !!q);
    root.querySelectorAll('.pt-node').forEach(function(b){
      var n = b.getAttribute('data-n'), s = stateOf(g, n);
      b.classList.toggle('sel', n === st.sel); b.classList.toggle('hl-up', !!up[n]); b.classList.toggle('hl-down', !!down[n]);
      b.classList.toggle('dim-f', st.filter !== 'all' && s !== st.filter);
      b.classList.toggle('hit-q', !!q && norm(n).indexOf(q) > -1); b.classList.toggle('dim-q', !!q && norm(n).indexOf(q) < 0);
      b.setAttribute('aria-pressed', n === st.sel ? 'true' : 'false');
    });
    root.querySelectorAll('.pt-edge').forEach(function(p){
      var a = p.getAttribute('data-a'), b = p.getAttribute('data-b');
      var inUp = st.sel && (up[a] || a === st.sel) && (up[b] || b === st.sel);
      var inDown = st.sel && (down[b] || b === st.sel) && (down[a] || a === st.sel);
      p.classList.toggle('up', !!(inUp && !inDown)); p.classList.toggle('down', !!(inDown && !inUp));
    });
  }

  /* ---------- بطاقة التفاصيل ---------- */
  function chipHtml(g, n){ var s = stateOf(g, n); return '<button type="button" class="pt-chip s-' + s + '" data-go="' + esc(n) + '">' + (s === 'done' ? '✓ ' : s === 'locked' ? '🔒 ' : '') + esc(n) + '</button>'; }
  function renderPanel(){
    var el = $('#ptPanel'); if(!el) return;
    var g = graph();
    if(!st.sel || !g.nodes[st.sel]){
      var S = statsLine(g), nxt = g.names.filter(function(n){ return stateOf(g, n) === 'open'; }).sort(function(a, b){ return (DB()[a].sem || 99) - (DB()[b].sem || 99); }).slice(0, 6);
      el.innerHTML = '<h4>👋 كيف أستعملها؟</h4><p>اضغط أي مادة لتشوف سلسلة متطلباتها (بالأزرق) وشو بتفتح لك بعدها (بالعنبري).</p>' +
        (nxt.length ? '<h5>🔓 جاهزة لك الآن</h5><div class="pt-chips">' + nxt.map(function(n){ return chipHtml(g, n); }).join('') + '</div>' : '<p class="pt-muted">علّم موادك المنجزة من بطاقة المادة لتظهر هنا المواد الجاهزة لك.</p>') +
        '<p class="pt-muted">' + S.cnt.locked + ' مادة مقفلة بانتظار متطلباتها.</p>';
      bindPanel(el, g); return;
    }
    var n = st.sel, o = g.nodes[n], s = stateOf(g, n), i = o.info, miss = window.missingPrereqs ? window.missingPrereqs(n) : [];
    var btns = '';
    if(s === 'done') btns = '<button type="button" class="btn btn-sm btn-ghost" data-act="undone">↩ إلغاء الإنجاز</button>';
    else { btns = (s === 'now' ? '' : '<button type="button" class="btn btn-sm" data-act="add">➕ أضف لموادي</button>') + '<button type="button" class="btn btn-sm btn-ghost" data-act="done">✓ علّمها منجزة</button>'; }
    el.innerHTML = '<div class="pt-ph"><span class="pt-badge s-' + s + '">' + ST[s] + '</span><button type="button" class="pt-x" data-act="close" aria-label="إغلاق التفاصيل">✕</button></div>' +
      '<h4>' + esc(n) + '</h4><div class="pt-meta"><span>' + esc(TYPES[i.t]) + '</span><span>' + i.h + ' ساعات</span>' + (i.code ? '<span dir="ltr">' + esc(i.code) + '</span>' : '') + (i.sem ? '<span>فصل مقترح ' + i.sem + '</span>' : '') + '</div>' +
      (i.d ? '<p class="pt-desc">' + esc(i.d) + '</p>' : '') +
      '<h5>⬅ المتطلبات السابقة</h5>' + (o.pre.length ? '<div class="pt-chips">' + o.pre.map(function(p){ return chipHtml(g, p); }).join('') + '</div>' + (miss.length && s !== 'done' ? '<p class="pt-warn">ناقصك: ' + esc(miss.join('، ')) + '</p>' : '') : '<p class="pt-muted">بدون متطلبات سابقة.</p>') +
      '<h5>➡ تفتح لك</h5>' + (o.post.length ? '<div class="pt-chips">' + o.post.map(function(p){ return chipHtml(g, p); }).join('') + '</div>' : '<p class="pt-muted">ما بتكون متطلب لمادة ثانية.</p>') +
      '<div class="pt-acts">' + btns + '<button type="button" class="btn btn-sm btn-ghost" data-act="open">📖 فتح المادة</button></div>';
    bindPanel(el, g);
  }
  function bindPanel(el, g){
    el.querySelectorAll('[data-go]').forEach(function(b){ b.addEventListener('click', function(){ select(b.getAttribute('data-go'), true); }); });
    el.querySelectorAll('[data-act]').forEach(function(b){ b.addEventListener('click', function(){ act(b.getAttribute('data-act')); }); });
  }
  function act(a){
    var n = st.sel, i = DB()[n]; if(a === 'close'){ select('', false); return; } if(!n || !i) return;
    if(a === 'add'){
      var miss = window.missingPrereqs ? window.missingPrereqs(n) : [];
      var go = function(){ if(window.addCourseEverywhere) window.addCourseEverywhere(n, i.code || '', i.h || 3); };
      if(miss.length && window.customConfirm) window.customConfirm('«' + n + '» تتطلب: ' + miss.join('، ') + ' — وما علّمتها منجزة. تضيفها مع ذلك؟', go, { title: 'متطلب سابق ناقص', icon: '🔒', okLabel: 'أضف مع ذلك' }); else go();
    } else if(a === 'done'){ if(window.askCourseCompleted) window.askCourseCompleted(n); else if(window.markCourseCompleted) window.markCourseCompleted(n, ''); }
    else if(a === 'undone'){ if(window.unmarkCourseCompleted) window.unmarkCourseCompleted(n); }
    else if(a === 'open'){ var c = (sp().courses || []).filter(function(x){ return x.name === n; })[0]; if(c && window.Hub && window.Hub.openCourse){ window.switchTab('courses'); window.Hub.openCourse(c.id); } else if(window.switchSubTab) window.switchSubTab('plan', 'desc'); }
  }
  function select(n, scroll){
    st.sel = (n && st.sel !== n) || (n && scroll) ? n : '';
    applyView(); renderPanel();
    if(st.sel && scroll){ var b = $('#planTree .pt-node[data-n="' + st.sel.replace(/"/g, '\\"') + '"]'), v = $('#ptView'); if(b && v){ var o = graph().nodes[st.sel]; v.scrollTo ? v.scrollTo({ left: Math.max(0, (o.x + NW / 2) * st.scale - v.clientWidth / 2) * 1, top: Math.max(0, (o.y + NH / 2) * st.scale - v.clientHeight / 2), behavior: 'smooth' }) : 0; } }
  }

  /* ---------- أحداث ---------- */
  function bind(root, g){
    root.querySelectorAll('.pt-node').forEach(function(b){ b.addEventListener('click', function(){ select(b.getAttribute('data-n'), false); }); });
    root.querySelectorAll('[data-f]').forEach(function(b){ b.addEventListener('click', function(){ st.filter = b.getAttribute('data-f'); root.querySelectorAll('[data-f]').forEach(function(x){ x.classList.toggle('active', x === b); }); applyView(); }); });
    var q = $('#ptSearch', root); if(q) q.addEventListener('input', function(){ st.q = q.value; applyView(); });
    root.querySelectorAll('[data-z]').forEach(function(b){ b.addEventListener('click', function(){
      var z = b.getAttribute('data-z'); if(z === 'fit') fit(true); else { st.scale = Math.max(.35, Math.min(1.6, st.scale * (z === '+' ? 1.2 : 1 / 1.2))); applyScale(); }
    }); });
    var v = $('#ptView', root);
    if(v){
      v.addEventListener('wheel', function(e){ if(e.ctrlKey){ e.preventDefault(); st.scale = Math.max(.35, Math.min(1.6, st.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1))); applyScale(); } }, { passive: false });
      var drag = null;   /* سحب بالماوس للتنقل (اللمس يتنقل طبيعياً بالتمرير) */
      v.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.pt-node')) return; drag = { x: e.clientX, y: e.clientY, sl: v.scrollLeft, st: v.scrollTop }; v.classList.add('grab'); try{ v.setPointerCapture(e.pointerId); }catch(x){} });
      v.addEventListener('pointermove', function(e){ if(!drag) return; v.scrollLeft = drag.sl - (e.clientX - drag.x); v.scrollTop = drag.st - (e.clientY - drag.y); });
      var end = function(){ drag = null; v.classList.remove('grab'); };
      v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
      v.addEventListener('keydown', function(e){ if(e.key === 'Escape' && st.sel){ select('', false); } });
    }
  }

  function isActive(){ var s = $('#plan [data-plan-sub="tree"]'); return !!s && s.classList.contains('active') && !!$('#planTree'); }
  /* بعد أي تغيير ببيانات المواد: نعيد الرسم فقط لو التبويب ظاهر (حالات العقد والأرقام) */
  function refresh(){ if(isActive()) render(); }

  window.PlanTree = { render: render, refresh: refresh, build: build, stateOf: function(n){ return stateOf(graph(), n); }, select: function(n){ select(n, false); }, state: function(){ return { sel: st.sel, filter: st.filter, q: st.q, scale: st.scale }; } };
})();
