/* ===== خريطة الجامعة التفاعلية (تبويب «خريطة الجامعة») =====
   رسم متجهي (SVG) مبسّط لحرم الجامعة الهاشمية: المباني بألوان الكليات، بوابات، مختبرات، تكبير/سحب/بحث.
   ربط الجدول: كل محاضرة تُحوَّل (اختصار المبنى + رقم القاعة، أو اسم المبنى) إلى مبنى، فتظهر دبابيس على المباني
   مع «الآن/التالية»؛ والمادة بلا موقع تُسند لمبنى بقائمة — يُخزَّن بحقل building الموجود أصلاً بالمحاضرة (بدون تغيير بنية البيانات).
   الإحداثيات تقريبية بحسب خريطة الجامعة الرسمية وليست مقياس رسم. */
(function(){
  'use strict';

  var W = 740, H = 1010, RATIO = H / W;
  var FAC = {
    util: ['مرافق الجامعة', '#2b3a67'], eng: ['كلية الهندسة', '#0fb48f'], it: ['كلية تكنولوجيا المعلومات', '#3aa90c'],
    nat: ['كلية الموارد الطبيعية والبيئية', '#1f7a3a'], sci: ['كلية العلوم', '#cdb800'], eco: ['كلية الاقتصاد والعلوم الإدارية', '#f2960a'],
    edu: ['كلية العلوم التربوية', '#c0702a'], grad: ['كلية الدراسات العليا', '#a5a5a5'], tour: ['كلية السياحة والتراث', '#6b4a2e'],
    med: ['كلية الطب', '#6b0f23'], nurs: ['كلية التمريض', '#b3123c'], alh: ['كلية العلوم الطبية التطبيقية', '#e24d5e'],
    pharm: ['كلية الصيدلة', '#ff1a6e'], sdean: ['عمادة العلوم', '#a8456f'], pe: ['كلية التربية البدنية وعلوم الرياضة', '#6a1fb0'],
    qr: ['كلية الملكة رانيا للطفولة', '#33b5d9']
  };
  var LIGHT_FILL = { sci: 1, eco: 1, grad: 1, qr: 1, alh: 1 };   /* خلفيات فاتحة: نص غامق */

  /* x,y,w,h بإحداثيات الرسم؛ r = تدوير بالدرجات؛ k = كلمات بحث مطبّعة (بدون همزات/تاء مربوطة) */
  var BLD = [
    { id: 'hb', n: 'الحسين الباني', f: 'util', x: 250, y: 785, w: 138, h: 40, k: ['حسين الباني', 'هندسه العماره', 'العماره'], ab: 'ح.ب' },
    { id: 'west', n: 'الغربي', f: 'util', x: 513, y: 340, w: 82, h: 52, k: ['الغربي', 'المبني الغربي'], ab: 'م.غ' },
    { id: 'east', n: 'الشرقي', f: 'util', x: 503, y: 642, w: 86, h: 50, k: ['الشرقي', 'المبني الشرقي'], ab: 'م.ش' },
    { id: 'eng', n: 'الهندسة', f: 'eng', x: 215, y: 610, w: 175, h: 52, r: -38, k: ['الهندسه'] },
    { id: 'annex', n: 'ملحق الهندسة', f: 'eng', x: 188, y: 698, w: 76, h: 42, r: 38, k: ['ملحق الهندسه'] },
    { id: 'it', n: 'IT', f: 'it', x: 112, y: 592, w: 92, h: 56, r: 40, k: ['تكنولوجيا المعلومات', 'حاسوب', 'it'] },
    { id: 'itfield', n: 'ملعب IT', f: 'it', x: 205, y: 553, w: 74, h: 48, r: -30, k: ['ملعب it'] },
    { id: 'pe', n: 'الرياضة', f: 'pe', x: 62, y: 530, w: 64, h: 40, r: -30, k: ['الرياضه', 'التربيه البدنيه'] },
    { id: 'pefield', n: 'ملعب الرياضة', f: 'pe', x: 125, y: 488, w: 74, h: 48, r: -30, k: ['ملعب الرياضه'] },
    { id: 'activity', n: 'النشاط الرياضي', s: 'النشاط الرياضي', f: 'util', x: 192, y: 500, w: 54, h: 42, r: -40, k: ['النشاط الرياضي'] },
    { id: 'risala', n: 'الرسالة', f: 'util', x: 254, y: 504, w: 58, h: 24, k: ['الرساله'] },
    { id: 'dean', n: 'العمادة', f: 'util', x: 322, y: 483, w: 62, h: 70, k: ['العماده', 'عماده القبول'] },
    { id: 'rest', n: 'المطاعم', f: 'util', x: 418, y: 483, w: 72, h: 70, k: ['المطاعم'] },
    { id: 'lib', n: 'المكتبة', f: 'util', x: 425, y: 402, w: 80, h: 58, k: ['المكتبه'] },
    { id: 'reg', n: 'القبول والتسجيل', f: 'util', x: 362, y: 335, w: 24, h: 92, k: ['القبول والتسجيل', 'القبول'] },
    { id: 'eco', n: 'الاقتصاد', f: 'eco', x: 425, y: 327, w: 62, h: 50, k: ['الاقتصاد', 'العلوم الاداريه'] },
    { id: 'grad', n: 'الدراسات العليا', f: 'grad', x: 330, y: 290, w: 54, h: 36, k: ['الدراسات العليا'] },
    { id: 'bank', n: 'بنك القاهرة', s: 'بنك القاهرة', f: 'util', x: 334, y: 246, w: 46, h: 36, k: ['بنك'] },
    { id: 'h4', n: 'الحارث الرابع', s: 'الحارث الرابع', f: 'util', x: 318, y: 192, w: 74, h: 36, k: ['الحارث'] },
    { id: 'tour', n: 'السياحة والتراث', s: 'السياحة والتراث', f: 'tour', x: 252, y: 184, w: 60, h: 32, r: -25, k: ['السياحه', 'التراث'] },
    { id: 'health', n: 'المركز الصحي', s: 'المركز الصحي', f: 'util', x: 544, y: 188, w: 48, h: 40, k: ['المركز الصحي', 'عياده'] },
    { id: 'ahs', n: 'العلوم الطبية التطبيقية', s: 'الطبية التطبيقية', f: 'alh', x: 427, y: 190, w: 98, h: 26, k: ['العلوم الطبيه التطبيقيه', 'الطبيه التطبيقيه'] },
    { id: 'nurs', n: 'التمريض', f: 'nurs', x: 427, y: 228, w: 98, h: 36, k: ['التمريض'] },
    { id: 'med', n: 'الطب', f: 'med', x: 427, y: 272, w: 98, h: 32, k: ['الطب', 'كليه الطب'] },
    { id: 'pharm', n: 'الصيدلة', f: 'pharm', x: 625, y: 175, w: 85, h: 153, k: ['الصيدله'] },
    { id: 'qr', n: 'كلية الملكة رانيا للطفولة', s: 'الملكة رانيا للطفولة', f: 'qr', x: 472, y: 92, w: 118, h: 60, k: ['رانيا', 'الطفوله'] },
    { id: 'mosque', n: 'المسجد', f: 'util', x: 416, y: 82, w: 46, h: 28, r: 18, k: ['المسجد'] },
    { id: 'math', n: 'الرياضيات', f: 'sci', x: 428, y: 570, w: 62, h: 48, k: ['الرياضيات'] },
    { id: 'sdean', n: 'عمادة العلوم', f: 'sdean', x: 503, y: 570, w: 58, h: 48, k: ['عماده العلوم'] },
    { id: 'res', n: 'الموارد', f: 'nat', x: 425, y: 718, w: 36, h: 52, k: ['الموارد'] },
    { id: 'phys', n: 'الفيزياء', f: 'sci', x: 470, y: 718, w: 36, h: 52, k: ['الفيزياء'] },
    { id: 'bio', n: 'الأحياء', f: 'sci', x: 514, y: 718, w: 36, h: 52, k: ['الاحياء', 'علم الحياه'] },
    { id: 'chem', n: 'الكيمياء', f: 'sci', x: 558, y: 718, w: 36, h: 52, k: ['الكيمياء'] },
    { id: 'nursery', n: 'المشاتل', f: 'util', x: 441, y: 785, w: 136, h: 42, k: ['المشاتل'] },
    { id: 'busz', n: 'مجمع باصات الزرقاء', s: 'باصات الزرقاء', f: 'util', x: 300, y: 38, w: 86, h: 86, k: ['باصات الزرقاء'] },
    { id: 'busa', n: 'مجمع باصات عمان', s: 'باصات عمان', f: 'util', x: 325, y: 897, w: 82, h: 105, k: ['باصات عمان'] },
    { id: 'busm', n: 'مجمع باصات مأدبا', s: 'باصات مأدبا', f: 'util', x: 22, y: 285, w: 78, h: 38, r: -35, k: ['باصات مادبا', 'مادبا'] }
  ];
  var PARK = [[150, 130, 44, 44, -30], [558, 247, 38, 38, 0], [673, 402, 40, 40, 0], [28, 420, 76, 62, 38], [255, 430, 38, 38, 0], [525, 520, 34, 34, 0], [432, 897, 76, 104, 0]];
  var GATES = [
    { id: 'gz', n: 'بوابة الزرقاء', x: 356, y: 150 }, { id: 'ga', n: 'بوابة عمان', x: 408, y: 856 },
    { id: 'gm', n: 'البوابة الرئيسية', x: 128, y: 232 }, { id: 'gn', n: 'بوابة الشمال', x: 92, y: 330 }
  ];
  /* مختبرات/قاعات من «أماكن المختبرات» بخريطة الجامعة: اسم القاعة ← مبنى + طابق */
  var LABS = [
    { n: 'ابن سينا', b: 'eng', fl: 1 }, { n: 'ابن خلدون', b: 'eng', fl: 2 }, { n: 'ابن رشد', b: 'dean', fl: 2 },
    { n: 'الخوارزمي', b: 'rest', fl: 2 }, { n: 'ابن حيان', b: 'rest', fl: 2 }, { n: 'الطبري', b: 'lib', fl: 2 },
    { n: 'الرازي', b: 'res', fl: 1 }, { n: 'التعليم الإلكتروني', b: 'east', fl: 2 }, { n: 'الطفولة', b: 'qr', fl: 1 },
    { n: 'ابن النفيس', b: 'ahs', fl: 3 }
  ];
  /* أيقونات المرافق (تظهر على المبنى إن كان كبيراً بما يكفي) */
  var ICONS = { lib: '📚', mosque: '🕌', rest: '🍽️', health: '➕', busz: '🚌', busa: '🚌', busm: '🚌', bank: '🏦', nursery: '🌱', reg: '📝', pharm: '💊', med: '🩺', nurs: '💉', eng: '⚙️', it: '💻', west: '🏛️', east: '🏛️', hb: '🏛️', dean: '🎓', pe: '🏅', pefield: '⚽', itfield: '⚽', activity: '🏃', chem: '🧪', phys: '⚛️', bio: '🧬', math: '➗', res: '🌿', eco: '📈', qr: '🧒', grad: '🎓', h4: '🏢', tour: '🏺', risala: '🏢', sdean: '🔬', ahs: '🧬' };
  /* مسافة تقريبية: 1 بكسل ≈ 1.1 متر، ×1.25 التفافات، ومشي ~70 متر بالدقيقة (تقدير مش قياس حقيقي) */
  var MPP = 1.1, DETOUR = 1.25, WALK = 70;
  function pointOf(id){
    if(!id) return null;
    if(id.indexOf('g:') === 0){ var g = GATES.filter(function(x){ return x.id === id.slice(2); })[0]; return g ? { x: g.x, y: g.y, n: g.n } : null; }
    var b = byId[id]; return b ? { x: b.cx, y: b.cy, n: b.n } : null;
  }
  function walkMeters(a, b){ var p = pointOf(a), q = pointOf(b); if(!p || !q) return 0; return Math.round(Math.hypot(p.x - q.x, p.y - q.y) * MPP * DETOUR); }
  function walkMinutes(a, b){ return Math.max(1, Math.ceil(walkMeters(a, b) / WALK)); }
  var ABBR = { 'حب': 'hb', 'مغ': 'west', 'غم': 'west', 'مش': 'east', 'شم': 'east' };

  var byId = {}; BLD.forEach(function(b){ b.cx = b.x + b.w / 2; b.cy = b.y + b.h / 2; byId[b.id] = b; });
  function norm(s){
    return String(s == null ? '' : s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  }
  LABS.forEach(function(l){ l.nn = norm(l.n); });
  function esc(s){ return window.esc ? window.esc(s) : String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- ربط المحاضرة بمبنى ---------- */
  function resolve(entry){
    var dig = function(x){ return String(x || '').replace(/[٠-٩]/g, function(d){ return String(d.charCodeAt(0) - 1632); }); };
    var room = dig(entry.room), bld = dig(entry.building);
    var text = norm(bld + ' ' + room);
    var out = { b: null, fl: 0, remote: false, how: '' };
    if(/عن بعد|اونلاين|online|اكترون|الكترون.*عن/.test(text) && !/تعليم الكتروني/.test(text)){ out.remote = true; return out; }
    var dm = room.replace(/[٠-٩]/g, function(d){ return String(d.charCodeAt(0) - 1632); }).match(/(\d{2,4})\s*$/);
    if(dm) out.fl = parseInt(dm[1].charAt(0), 10);
    var fm = text.match(/ط\s*(\d)/); if(fm) out.fl = parseInt(fm[1], 10);
    /* 1) اختصار المبنى: الحروف قبل رقم القاعة بدون نقاط ومسافات (ح.ب 104 -> حب) */
    var ab = norm(room).replace(/[.\s]/g, '').match(/^([^\d]{2,3})\d/);
    if(ab && ABBR[ab[1]]){ out.b = byId[ABBR[ab[1]]]; out.how = 'اختصار ' + room.split(/\s*\d/)[0]; return out; }
    /* 2) كلمات الاسم: حقل المبنى أولاً ثم القاعة */
    var srcs = [norm(bld), norm(room)];
    for(var s = 0; s < srcs.length; s++){
      var t = srcs[s]; if(!t) continue;
      var tn = t.replace(/\./g, '');
      var a2 = tn.replace(/\s/g, '').replace(/^([^\d]{2,3})\d.*$/, '$1'); if(ABBR[a2]){ out.b = byId[ABBR[a2]]; out.how = 'اختصار'; return out; }
      for(var i = 0; i < LABS.length; i++){ if(t.indexOf(LABS[i].nn) > -1){ out.b = byId[LABS[i].b]; out.fl = out.fl || LABS[i].fl; out.how = 'قاعة ' + LABS[i].n; return out; } }
      for(var j = 0; j < BLD.length; j++){
        for(var q = 0; q < BLD[j].k.length; q++){ if(t.indexOf(BLD[j].k[q]) > -1){ out.b = BLD[j]; out.how = 'اسم المبنى'; return out; } }
      }
    }
    return out;
  }

  /* مواد الجدول مجمّعة بالاسم مع موقع كل مادة */
  function courses(){
    var list = (window.Schedule && window.Schedule.entries) ? window.Schedule.entries() : [];
    var map = {}, order = [];
    list.forEach(function(e){
      var c = map[e.name]; if(!c){ c = map[e.name] = { name: e.name, slots: [], b: null, fl: 0, remote: false, how: '' }; order.push(c); }
      c.slots.push(e);
      var r = resolve(e); e._r = r;
      if(r.remote) c.remote = true;
      if(r.b && !c.b){ c.b = r.b; c.fl = r.fl; c.how = r.how; }
    });
    order.forEach(function(c){ c.slots.sort(function(a, b){ return a.dayIdx - b.dayIdx || a.start - b.start; }); if(c.b) c.remote = false; });
    return order;
  }
  function dayName(i){ return (window.DAYS_AR || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'])[i]; }
  function hm(m){ m = Math.round(m); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  function slotText(e){ return dayName(e.dayIdx) + ' ' + hm(e.start) + (e.hasEnd ? '–' + hm(e.end) : ''); }

  /* ---------- الحالة ---------- */
  var st = { sel: null, fac: null, q: '', tab: 'mine', day: 'all', vb: { x: 0, y: 0, w: W, h: H }, anim: null, layers: { pins: true, gates: true, park: true }, route: null, dir: { from: '', to: '' } };
  var root = null, svg = null;

  /* ---------- الرسم ---------- */
  /* أين يُكتب اسم المبنى الصغير خارجه (t فوق، l يسار، r يمين، الافتراضي تحت) حتى لا يغطّي جيرانه */
  var OUT_SIDE = { ahs: 't', grad: 'l', bank: 'l', health: 'r' };
  function labelFor(b){
    var words = (b.s || b.n).split(' '), vertical = b.h >= b.w * 1.35, bw = vertical ? b.h : b.w, bh = vertical ? b.w : b.h;
    var best = null;
    for(var lines = 1; lines <= Math.min(3, words.length); lines++){
      var per = Math.ceil(words.length / lines), rows = [];
      for(var i = 0; i < words.length; i += per) rows.push(words.slice(i, i + per).join(' '));
      var maxLen = Math.max.apply(null, rows.map(function(r){ return r.length; }));
      var fs = Math.min(15, (bh - 6) / (rows.length * 1.25), (bw - 8) / (maxLen * .58));
      if(!best || fs > best.fs) best = { fs: fs, rows: rows };
    }
    var fs2 = Math.max(9, Math.min(13, best.fs));
    var tspans = best.rows.map(function(r, i){ return '<tspan x="0" dy="' + (i === 0 ? (-(best.rows.length - 1) * .62).toFixed(2) : 1.25) + 'em">' + esc(r) + '</tspan>'; }).join('');
    return '<text class="cm-t" font-size="' + fs2.toFixed(1) + '" text-anchor="middle" dominant-baseline="central" transform="translate(' + b.cx + ' ' + b.cy + ')' + (vertical ? ' rotate(-90)' : '') + '">' + tspans + '</text>';
  }
  function matches(b, q){
    if(!q) return false; var nq = norm(q);
    if(norm(b.n).indexOf(nq) > -1 || (b.ab && norm(b.ab).replace(/\./g, '').indexOf(nq.replace(/\./g, '')) > -1)) return true;
    for(var i = 0; i < b.k.length; i++) if(b.k[i].indexOf(nq) > -1) return true;
    for(var j = 0; j < LABS.length; j++) if(LABS[j].b === b.id && LABS[j].nn.indexOf(nq) > -1) return true;
    return false;
  }
  function visibleCourses(cs){
    if(st.day === 'all') return cs;
    var d = (new Date()).getDay();
    return cs.filter(function(c){ return c.slots.some(function(e){ return e.dayIdx === d; }); });
  }
  function svgHtml(cs, status){
    var h = '<svg id="cmSvg" class="cm-svg" viewBox="' + [st.vb.x, st.vb.y, st.vb.w, st.vb.h].join(' ') + '" role="group" aria-label="خريطة الجامعة الهاشمية" preserveAspectRatio="xMidYMid meet">';
    h += '<defs><filter id="cmShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-opacity=".35"/></filter>' +
      '<linearGradient id="cmRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>' +
      '<marker id="cmArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>';
    h += '<rect class="cm-ground" x="-80" y="-60" width="' + (W + 160) + '" height="' + (H + 120) + '" rx="26"/>';
    /* الشوارع */
    var roadsD = '<path d="M406 160V856"/><path d="M406 172H586Q610 172 610 196V836Q610 860 586 860H406"/>' +
      '<path d="M406 166Q196 166 160 232L22 430Q4 470 26 522L160 740Q228 860 406 860"/>' +
      '<path d="M400 38H696Q722 38 722 64V490H612"/><path d="M400 38H238Q204 38 176 82L150 130"/>' +
      '<path d="M150 232L330 440" /><path d="M90 332L240 470"/><circle cx="406" cy="512" r="20"/><circle cx="96" cy="188" r="18"/><circle cx="168" cy="262" r="22"/><circle cx="332" cy="440" r="17"/>';
    h += '<g class="cm-roads out" fill="none" stroke-linecap="round" stroke-linejoin="round">' + roadsD + '</g><g class="cm-roads" fill="none" stroke-linecap="round" stroke-linejoin="round">' + roadsD + '</g>';
    /* مواقف */
    if(st.layers.park) PARK.forEach(function(p){ h += '<g class="cm-park" transform="translate(' + (p[0] + p[2] / 2) + ' ' + (p[1] + p[3] / 2) + ') rotate(' + p[4] + ')"><rect x="' + (-p[2] / 2) + '" y="' + (-p[3] / 2) + '" width="' + p[2] + '" height="' + p[3] + '" rx="8"/><text text-anchor="middle" dominant-baseline="central" font-size="' + Math.min(p[2], p[3]) * .62 + '">P</text></g>'; });
    /* خط أقرب بوابة للمبنى المختار */
    if(st.sel){
      var sb = byId[st.sel], g = nearestGate(sb);
      h += '<line class="cm-route" x1="' + g.x + '" y1="' + g.y + '" x2="' + sb.cx + '" y2="' + sb.cy + '"/><circle class="cm-gate-on" cx="' + g.x + '" cy="' + g.y + '" r="9"/>';
    }
    /* مسار: خط متقطع بأسهم + نقاط مرقّمة */
    if(st.route && st.route.ids && st.route.ids.length > 1){
      var pts = st.route.ids.map(pointOf).filter(Boolean);
      h += '<polyline class="cm-path" marker-mid="url(#cmArrow)" marker-end="url(#cmArrow)" points="' + pts.map(function(p){ return p.x + ',' + p.y; }).join(' ') + '"/>';
    }
    /* المباني */
    BLD.forEach(function(b){
      var col = FAC[b.f][1], cls = 'cm-b';
      if(st.sel === b.id) cls += ' sel';
      if(st.fac && b.f !== st.fac) cls += ' dim';
      if(st.q){ if(matches(b, st.q)) cls += ' hit'; else cls += ' dim'; }
      var rot = b.r ? ' transform="rotate(' + b.r + ' ' + b.cx + ' ' + b.cy + ')"' : '';
      var txtCol = LIGHT_FILL[b.f] ? '#13203a' : '#ffffff';
      var small = Math.min(b.w, b.h) < 42, ic = ICONS[b.id] && Math.min(b.w, b.h) >= 30 && b.w * b.h >= 1800 ? '<text class="cm-ic" x="' + (b.x + b.w - 11) + '" y="' + (b.y + 12) + '" text-anchor="middle" font-size="11">' + ICONS[b.id] + '</text>' : '';
      h += '<g class="' + cls + (small ? ' cm-small' : '') + '" data-b="' + b.id + '" role="button" tabindex="0" aria-label="' + esc(b.n + ' — ' + FAC[b.f][0]) + '"><title>' + esc(b.n) + '</title><g' + rot + '>' +
                '<rect class="cm-face" x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="6" fill="' + col + '"/>' +
        '' +
        '<g fill="' + txtCol + '">' + labelFor(b) + '</g></g></g>';
    });
    /* بوابات */
    if(st.layers.gates) GATES.forEach(function(g){
      h += '<g class="cm-gate" transform="translate(' + g.x + ' ' + g.y + ')"><circle r="7"/><text y="-12" text-anchor="middle" font-size="10.5">' + esc(g.n) + '</text></g>';
    });
    /* دبابيس مواد الجدول */
    var perB = {}; if(st.layers.pins) visibleCourses(cs).forEach(function(c){ if(c.b){ (perB[c.b.id] = perB[c.b.id] || []).push(c); } });
    var nowId = status.current && resolve(status.current).b ? resolve(status.current).b.id : null;
    var nextId = status.next && resolve(status.next).b ? resolve(status.next).b.id : null;
    Object.keys(perB).forEach(function(id, i){
      var b = byId[id], n = perB[id].length, cl = 'cm-pin' + (id === nowId ? ' now' : (id === nextId ? ' next' : ''));
      h += '<g class="' + cl + '" data-pin="' + id + '" transform="translate(' + b.cx + ' ' + pinY(b) + ') scale(.85)"><g class="cm-pin-in" style="animation-delay:' + (i * 60) + 'ms">' +
        '<circle class="cm-pulse" r="14" cy="-26"/><path d="M0 0C-8-11-14-17-14-26a14 14 0 1 1 28 0C14-17 8-11 0 0z"/><text y="-22" text-anchor="middle" font-size="13" font-weight="800">' + n + '</text></g></g>';
    });
    if(st.route && st.route.ids && st.route.ids.length > 1){
      st.route.ids.forEach(function(id, i){ var p = pointOf(id); if(!p) return; var last = i === st.route.ids.length - 1;
        h += '<g class="cm-stop' + (i === 0 ? ' first' : '') + (last ? ' last' : '') + '" transform="translate(' + p.x + ' ' + p.y + ')"><circle r="11"/><text text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="800">' + (i + 1) + '</text></g>'; });
    }
    h += '</svg>';
    return h;
  }
  /* أعلى حافة المبنى (مع حساب التدوير) حتى لا يغطّي الدبوس الاسم */
  function pinY(b){ if(!b.r) return b.y; var t = Math.abs(b.r) * Math.PI / 180; return b.cy - (Math.abs(Math.sin(t)) * b.w / 2 + Math.abs(Math.cos(t)) * b.h / 2) + 4; }
  function nearestGate(b){
    var best = GATES[0], bd = 1e9;
    GATES.forEach(function(g){ var d = Math.pow(g.x - b.cx, 2) + Math.pow(g.y - b.cy, 2); if(d < bd){ bd = d; best = g; } });
    return best;
  }

  function courseRow(c){
    var slots = c.slots.map(slotText).join(' · '), loc = '';
    if(c.b) loc = '<span class="cm-loc">📍 ' + esc(c.b.n) + (c.fl ? ' · ط' + c.fl : '') + '</span>';
    else if(c.remote) loc = '<span class="cm-loc cm-remote">💻 عن بعد</span>';
    else loc = '<select class="cm-assign" data-assign="' + esc(c.name) + '" aria-label="تحديد مبنى ' + esc(c.name) + '"><option value="">📍 حدّد المبنى…</option>' + BLD.filter(function(b){ return !/باصات/.test(b.n); }).map(function(b){ return '<option value="' + b.id + '">' + esc(b.n) + '</option>'; }).join('') + '</select>';
    return '<div class="cm-course' + (c.b && st.sel === c.b.id ? ' on' : '') + '"><button type="button" class="cm-course-main"' + (c.b ? ' data-go="' + c.b.id + '"' : ' tabindex="-1"') + '><b>' + esc(c.name) + '</b><small>' + esc(slots) + '</small></button>' + loc + '</div>';
  }
  function panelMine(cs){
    var shown = visibleCourses(cs), unk = cs.filter(function(c){ return !c.b && !c.remote; }).length;
    var h = '<div class="cm-chips" role="group" aria-label="عرض">' +
      '<button type="button" class="cm-chip" data-day="all" aria-pressed="' + (st.day === 'all') + '">كل الأسبوع</button>' +
      '<button type="button" class="cm-chip" data-day="today" aria-pressed="' + (st.day === 'today') + '">اليوم فقط</button></div>';
    if(!cs.length) return h + '<div class="cm-empty">ما في محاضرات بجدولك بعد.<br>أضف جدولك من «الجدول الأسبوعي» وبتظهر مواقعها هون على الخريطة.</div>';
    h += '<div class="cm-sum">' + cs.length + ' مادة' + (unk ? ' · <b>' + unk + ' بلا موقع</b> — اختار لها مبنى' : ' · كلها محدّدة الموقع ✓') + '</div>';
    if(!shown.length) h += '<div class="cm-empty">ما عندك محاضرات اليوم 🎉</div>';
    return h + shown.map(courseRow).join('');
  }
  function dayStops(status){
    var out = [];
    (status.today || []).forEach(function(e){ var r = resolve(e); if(r.remote) return; out.push({ e: e, b: r.b, fl: r.fl }); });
    return out;
  }
  function panelRoute(status){
    var stops = dayStops(status), h = '<div class="cm-sub">محاضرات اليوم ومشيتك بينها</div>';
    if(!stops.length) h += '<div class="cm-empty">ما عندك محاضرات حضورية اليوم.</div>';
    else {
      stops.forEach(function(s, i){
        var e = s.e;
        h += '<div class="cm-stop-row ' + (e.state || '') + '"><span class="cm-stop-n">' + (i + 1) + '</span><div class="cm-stop-b"><b>' + esc(e.name) + '</b><small><bdi dir="ltr">' + hm(e.start) + (e.hasEnd ? '–' + hm(e.end) : '') + '</bdi> · ' + (s.b ? '<button type="button" class="hub-link" data-go="' + s.b.id + '">📍 ' + esc(s.b.n) + (s.fl ? ' · ط' + s.fl : '') + '</button>' : '<span class="warn">بلا موقع — حدّده من «موادي»</span>') + '</small></div></div>';
        var nx = stops[i + 1];
        if(nx){
          var gap = nx.e.start - (e.hasEnd ? e.end : e.start + 60);
          if(s.b && nx.b && s.b.id !== nx.b.id){
            var wm = walkMinutes(s.b.id, nx.b.id), cls = gap < wm ? 'bad' : (gap < wm + 3 ? 'warn' : 'ok');
            h += '<div class="cm-leg-row ' + cls + '">🚶 ~' + wm + ' د مشي (' + walkMeters(s.b.id, nx.b.id) + ' م) · الفاصل ' + gap + ' د ' + (cls === 'bad' ? '— <b>ما بتلحق!</b> اطلع بدري' : cls === 'warn' ? '— ضيّق، لا تتأخر' : '— مريح ✓') + '</div>';
          } else if(s.b && nx.b) h += '<div class="cm-leg-row ok">نفس المبنى · الفاصل ' + gap + ' د</div>';
        }
      });
      var ids = stops.filter(function(s){ return s.b; }).map(function(s){ return s.b.id; });
      var on = st.route && st.route.kind === 'day';
      if(ids.length > 1) h += '<button type="button" class="btn btn-sm' + (on ? '' : ' btn-ghost') + ' cm-route-btn" data-route-day="1">' + (on ? '✕ إخفاء المسار عن الخريطة' : '🧭 اعرض مساري على الخريطة') + '</button>';
    }
    /* اتجاهات بين نقطتين */
    var opts = '<option value="">اختر…</option><optgroup label="البوابات">' + GATES.map(function(g){ return '<option value="g:' + g.id + '">' + esc(g.n) + '</option>'; }).join('') + '</optgroup><optgroup label="المباني">' +
      BLD.filter(function(b){ return !/باصات/.test(b.n) || true; }).map(function(b){ return '<option value="' + b.id + '">' + esc(b.n) + '</option>'; }).join('') + '</optgroup>';
    function sel(name, val){ return '<select class="cm-dir-sel" data-dir="' + name + '" aria-label="' + (name === 'from' ? 'من' : 'إلى') + '">' + opts.replace('value="' + val + '"', 'value="' + val + '" selected') + '</select>'; }
    h += '<div class="cm-sub">اتجاهات بين نقطتين</div><div class="cm-dir"><label>من ' + sel('from', st.dir.from) + '</label><button type="button" class="cm-swap" data-dir-swap aria-label="تبديل">⇅</button><label>إلى ' + sel('to', st.dir.to) + '</label></div>';
    if(st.dir.from && st.dir.to && st.dir.from !== st.dir.to){
      var m = walkMeters(st.dir.from, st.dir.to), mi = walkMinutes(st.dir.from, st.dir.to);
      h += '<div class="cm-dir-res">🚶 حوالي <b>' + mi + ' د</b> مشي (' + m + ' م) — تقدير تقريبي مش قياس حقيقي</div>';
    }
    return h;
  }
  function panelPlaces(){
    var list = BLD.filter(function(b){ return !st.q || matches(b, st.q); });
    var h = list.map(function(b){ return '<button type="button" class="cm-place' + (st.sel === b.id ? ' on' : '') + '" data-go="' + b.id + '"><i style="background:' + FAC[b.f][1] + '"></i><span>' + esc(b.n) + '<small>' + esc(FAC[b.f][0]) + (b.ab ? ' · ' + esc(b.ab) : '') + '</small></span></button>'; }).join('');
    var labs = LABS.filter(function(l){ return !st.q || l.nn.indexOf(norm(st.q)) > -1; });
    if(labs.length) h += '<div class="cm-sub">قاعات ومختبرات</div>' + labs.map(function(l){ return '<button type="button" class="cm-place" data-go="' + l.b + '"><i style="background:' + FAC[byId[l.b].f][1] + '"></i><span>' + esc(l.n) + '<small>' + esc(byId[l.b].n) + ' · الطابق ' + l.fl + '</small></span></button>'; }).join('');
    return h || '<div class="cm-empty">ما لقيت نتيجة لـ«' + esc(st.q) + '»</div>';
  }
  function panelLegend(){
    return '<div class="cm-sub">ألوان الكليات (اضغط للتمييز)</div>' + Object.keys(FAC).map(function(k){ return '<button type="button" class="cm-leg' + (st.fac === k ? ' on' : '') + '" data-fac="' + k + '"><i style="background:' + FAC[k][1] + '"></i>' + esc(FAC[k][0]) + '</button>'; }).join('') +
      '<div class="cm-sub">رموز</div><div class="cm-key"><span>📍 دبوس = مادة من جدولك (الرقم = عددها)</span><span>🔵 نبض = محاضرتك الآن/التالية</span><span>خط متقطع = أقرب بوابة للمبنى المختار</span><span>ح.ب = الحسين الباني · م.غ = الغربي · م.ش = الشرقي</span></div>';
  }
  function infoCard(cs){
    if(!st.sel) return '';
    var b = byId[st.sel], mine = cs.filter(function(c){ return c.b && c.b.id === b.id; }), g = nearestGate(b);
    var labs = LABS.filter(function(l){ return l.b === b.id; });
    var h = '<div class="cm-info" style="--fc:' + FAC[b.f][1] + '"><div class="cm-info-h"><span class="cm-dot"></span><div><b>' + esc(b.n) + '</b><small>' + esc(FAC[b.f][0]) + (b.ab ? ' · اختصار ' + esc(b.ab) : '') + '</small></div><button type="button" class="cm-x" data-clear aria-label="إغلاق">✕</button></div>';
    h += '<div class="cm-info-b"><span>🚪 أقرب بوابة: <b>' + esc(g.n) + '</b></span>';
    if(labs.length) h += '<span>🔬 ' + labs.map(function(l){ return esc(l.n) + ' (ط' + l.fl + ')'; }).join('، ') + '</span>';
    h += '</div><div class="cm-info-act"><button type="button" class="btn btn-sm btn-ghost" data-dir-to="' + b.id + '">🧭 اتجاهات إلى هنا</button></div>';
    if(mine.length) h += '<div class="cm-info-m"><small>موادك هون</small>' + mine.map(function(c){ return '<div class="cm-mini"><b>' + esc(c.name) + '</b><span>' + esc(c.slots.map(function(e){ return slotText(e) + (e.room ? ' · ' + e.room : ''); }).join(' | ')) + '</span></div>'; }).join('') + '</div>';
    else h += '<div class="cm-info-m"><small>ما عندك مواد بهذا المبنى</small></div>';
    return h + '</div>';
  }

  function render(){
    root = document.getElementById('campusRoot'); if(!root) return;
    var cs = courses(), status = (window.Schedule && window.Schedule.status) ? window.Schedule.status() : { current: null, next: null };
    var tabs = [['mine', '🎒 موادي'], ['route', '🧭 مساري'], ['places', '🏛️ المباني'], ['legend', '🎨 الدليل']];
    var panel = st.tab === 'mine' ? panelMine(cs) : st.tab === 'route' ? panelRoute(status) : st.tab === 'places' ? panelPlaces() : panelLegend();
    var nowMsg = '';
    if(status.current && resolve(status.current).b) nowMsg = '<div class="cm-now"><span class="cm-live"></span>محاضرتك الآن: <b>' + esc(status.current.name) + '</b> — ' + esc(resolve(status.current).b.n) + '</div>';
    else if(status.next && resolve(status.next).b) nowMsg = '<div class="cm-now next">⏭️ التالية: <b>' + esc(status.next.name) + '</b> — ' + esc(resolve(status.next).b.n) + ' (' + hm(status.next.start) + ')</div>';
    root.innerHTML =
      '<div class="cm-bar"><div class="cm-search"><span aria-hidden="true">🔎</span><input type="search" id="cmQ" value="' + esc(st.q) + '" placeholder="ابحث عن مبنى أو مختبر (مثلاً: المكتبة، ابن سينا، ح.ب)" autocomplete="off" aria-label="بحث بالخريطة"></div>' + nowMsg + '</div>' +
      '<div class="cm-wrap"><div class="cm-mapcard"><div class="cm-zoom" role="group" aria-label="التحكم بالخريطة"><button type="button" data-z="in" aria-label="تكبير">＋</button><button type="button" data-z="out" aria-label="تصغير">－</button><button type="button" data-z="reset" aria-label="إعادة الضبط">⟲</button></div>' +
      '<div class="cm-layers" role="group" aria-label="الطبقات"><button type="button" data-layer="pins" aria-pressed="' + st.layers.pins + '">📍 دبابيسي</button><button type="button" data-layer="gates" aria-pressed="' + st.layers.gates + '">🚪 البوابات</button><button type="button" data-layer="park" aria-pressed="' + st.layers.park + '">🅿️ المواقف</button></div>' +
      svgHtml(cs, status) + '<div class="cm-hint">اسحب لتحريك الخريطة · عجلة الماوس أو اقرص للتكبير</div></div>' +
      '<aside class="cm-side">' + infoCard(cs) + '<div class="cm-tabs" role="tablist">' + tabs.map(function(t){ return '<button type="button" role="tab" class="cm-tab" data-tab="' + t[0] + '" aria-selected="' + (st.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div class="cm-panel" role="tabpanel">' + panel + '</div></aside></div>';
    svg = document.getElementById('cmSvg'); if(svg) svg.classList.toggle('zfar', st.vb.w > 520);
    bind();
  }

  /* ---------- تفاعل ---------- */
  function dirRoute(){ st.route = (st.dir.from && st.dir.to && st.dir.from !== st.dir.to) ? { kind: 'dir', ids: [st.dir.from, st.dir.to] } : null; }
  function applyVb(){ if(svg) svg.classList.toggle('zfar', st.vb.w > 520); if(svg) svg.setAttribute('viewBox', [st.vb.x, st.vb.y, st.vb.w, st.vb.h].map(function(n){ return +n.toFixed(2); }).join(' ')); }
  function clampVb(){
    st.vb.w = Math.max(150, Math.min(W, st.vb.w)); st.vb.h = st.vb.w * RATIO;
    st.vb.x = Math.max(-40, Math.min(W + 40 - st.vb.w, st.vb.x)); st.vb.y = Math.max(-40, Math.min(H + 40 - st.vb.h, st.vb.y));
    if(st.vb.w >= W - 1){ st.vb.x = 0; st.vb.y = 0; }
  }
  function animateTo(t){
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var from = { x: st.vb.x, y: st.vb.y, w: st.vb.w }, t0 = null, raf = window.requestAnimationFrame;
    if(st.anim && window.cancelAnimationFrame) window.cancelAnimationFrame(st.anim);
    t.h = t.w * RATIO;
    if(reduce || !raf){ st.vb = t; clampVb(); applyVb(); return; }
    function step(ts){
      if(t0 === null) t0 = ts; var p = Math.min(1, (ts - t0) / 380), e = 1 - Math.pow(1 - p, 3);
      st.vb = { x: from.x + (t.x - from.x) * e, y: from.y + (t.y - from.y) * e, w: from.w + (t.w - from.w) * e, h: 0 }; st.vb.h = st.vb.w * RATIO; clampVb(); applyVb();
      if(p < 1) st.anim = raf(step); else st.anim = null;
    }
    st.anim = raf(step);
  }
  function focusOn(id){
    var b = byId[id]; if(!b) return;
    var w = 260; animateTo({ x: b.cx - w / 2, y: b.cy - (w * RATIO) / 2, w: w });
  }
  function select(id, zoom){
    st.sel = id; render(); if(zoom && id) focusOn(id);
    if(id && window.matchMedia && window.matchMedia('(max-width:900px)').matches){ var s = root.querySelector('.cm-info'); if(s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function zoomBy(f, cx, cy){
    var nw = Math.max(150, Math.min(W, st.vb.w * f)); cx = cx == null ? st.vb.x + st.vb.w / 2 : cx; cy = cy == null ? st.vb.y + st.vb.h / 2 : cy;
    var k = nw / st.vb.w; st.vb = { x: cx - (cx - st.vb.x) * k, y: cy - (cy - st.vb.y) * k, w: nw, h: nw * RATIO }; clampVb(); applyVb();
  }
  function toSvgPoint(ev){
    var r = svg.getBoundingClientRect(), sc = Math.min(r.width / st.vb.w, r.height / st.vb.h) || 1;
    var ox = (r.width - st.vb.w * sc) / 2, oy = (r.height - st.vb.h * sc) / 2;
    return { x: st.vb.x + (ev.clientX - r.left - ox) / sc, y: st.vb.y + (ev.clientY - r.top - oy) / sc, sc: sc };
  }
  function bind(){
    if(!root) return;
    root.querySelector('#cmQ').addEventListener('input', function(e){
      st.q = e.target.value; var pos = e.target.selectionStart;
      if(st.q && st.tab === 'legend') st.tab = 'places';
      render(); var i = document.getElementById('cmQ'); if(i){ i.focus(); try{ i.setSelectionRange(pos, pos); }catch(x){} }
      var hit = BLD.filter(function(b){ return matches(b, st.q); }); if(st.q && hit.length === 1) focusOn(hit[0].id);
    });
    if(!root._cm){ root._cm = true; bindRoot(); }
    bindSvg();
  }
  function bindRoot(){
    root.addEventListener('click', function(e){
      var t = e.target;
      var ly = t.closest('[data-layer]'); if(ly){ var k2 = ly.getAttribute('data-layer'); st.layers[k2] = !st.layers[k2]; render(); return; }
      var dt = t.closest('[data-dir-to]'); if(dt){ st.dir.to = dt.getAttribute('data-dir-to'); if(!st.dir.from) st.dir.from = 'g:' + nearestGate(byId[st.dir.to]).id; st.tab = 'route'; st.route = { kind: 'dir', ids: [st.dir.from, st.dir.to] }; render(); return; }
      if(t.closest('[data-dir-swap]')){ var tmp = st.dir.from; st.dir.from = st.dir.to; st.dir.to = tmp; dirRoute(); render(); return; }
      var rd = t.closest('[data-route-day]'); if(rd){ if(st.route && st.route.kind === 'day') st.route = null; else { var ids = dayStops((window.Schedule && window.Schedule.status) ? window.Schedule.status() : {}).filter(function(s){ return s.b; }).map(function(s){ return s.b.id; }); st.route = { kind: 'day', ids: ids }; } render(); return; }
      var z = t.closest('[data-z]'); if(z){ var k = z.getAttribute('data-z'); if(k === 'in') zoomBy(.7); else if(k === 'out') zoomBy(1.4); else animateTo({ x: 0, y: 0, w: W }); return; }
      var tb = t.closest('[data-tab]'); if(tb){ st.tab = tb.getAttribute('data-tab'); render(); return; }
      var dy = t.closest('[data-day]'); if(dy){ st.day = dy.getAttribute('data-day'); render(); return; }
      var f = t.closest('[data-fac]'); if(f){ var v = f.getAttribute('data-fac'); st.fac = st.fac === v ? null : v; render(); return; }
      if(t.closest('[data-clear]')){ st.sel = null; render(); return; }
      var go = t.closest('[data-go]'); if(go){ select(go.getAttribute('data-go'), true); return; }
      var b = t.closest('[data-b]'); if(b && !moved){ select(st.sel === b.getAttribute('data-b') ? null : b.getAttribute('data-b'), true); return; }
      var pin = t.closest('[data-pin]'); if(pin){ select(pin.getAttribute('data-pin'), true); }
    });
    root.addEventListener('change', function(e){
      var dsel = e.target.closest && e.target.closest('[data-dir]'); if(dsel){ st.dir[dsel.getAttribute('data-dir')] = dsel.value; dirRoute(); render(); return; }
      var a = e.target.closest && e.target.closest('[data-assign]'); if(!a || !a.value) return;
      assign(a.getAttribute('data-assign'), a.value);
    });
    root.addEventListener('keydown', function(e){
      var b = e.target.closest && e.target.closest('[data-b]');
      if(b && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); select(b.getAttribute('data-b'), true); }
      else if(e.key === 'Escape' && st.sel){ st.sel = null; render(); }
    });
  }
  function bindSvg(){
    /* سحب + عجلة + قرص */
    var ptrs = {}, last = null, pinch0 = null; moved = false;
    svg.addEventListener('wheel', function(e){ e.preventDefault(); var p = toSvgPoint(e); zoomBy(e.deltaY < 0 ? .85 : 1.18, p.x, p.y); }, { passive: false });
    svg.addEventListener('dblclick', function(e){ var p = toSvgPoint(e); animateTo({ x: p.x - st.vb.w * .35, y: p.y - st.vb.h * .35, w: st.vb.w * .7 }); });
    svg.addEventListener('pointerdown', function(e){
      ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY }; moved = false;
      if(Object.keys(ptrs).length === 2){ var a = Object.keys(ptrs).map(function(k){ return ptrs[k]; }); pinch0 = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), w: st.vb.w }; }
    });
    svg.addEventListener('pointermove', function(e){
      if(!ptrs[e.pointerId]) return; ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ks = Object.keys(ptrs);
      if(ks.length === 2 && pinch0){
        var a = ks.map(function(k){ return ptrs[k]; }), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); moved = true;
        var nw = Math.max(150, Math.min(W, pinch0.w * pinch0.d / (d || 1))), k = nw / st.vb.w, cx = st.vb.x + st.vb.w / 2, cy = st.vb.y + st.vb.h / 2;
        st.vb = { x: cx - (cx - st.vb.x) * k, y: cy - (cy - st.vb.y) * k, w: nw, h: nw * RATIO }; clampVb(); applyVb(); return;
      }
      if(ks.length === 1 && last){
        var dx = e.clientX - last.x, dy = e.clientY - last.y;
        if(!moved && Math.hypot(dx, dy) < 5) return;
        moved = true; var r = svg.getBoundingClientRect(), sc = Math.min(r.width / st.vb.w, r.height / st.vb.h) || 1;
        st.vb.x -= dx / sc; st.vb.y -= dy / sc; clampVb(); applyVb(); last = { x: e.clientX, y: e.clientY }; svg.classList.add('drag');
      }
    });
    function up(e){ delete ptrs[e.pointerId]; if(Object.keys(ptrs).length < 2) pinch0 = null; svg.classList.remove('drag'); setTimeout(function(){ moved = false; }, 0); }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up); svg.addEventListener('pointerleave', function(e){ if(e.pointerType === 'mouse') up(e); });
  }
  var moved = false;

  /* إسناد مبنى لمادة (يحدّث حقل building بكل محاضراتها) */
  function assign(courseName, bid){
    var b = byId[bid], tt = window.space && window.space.timetable; if(!b || !tt) return;
    var n = 0; Object.keys(tt).forEach(function(k){ if(tt[k] && tt[k].name === courseName){ tt[k].building = b.n; n++; } });
    if(!n) return;
    if(window.saveSpace) window.saveSpace();
    if(window.renderTimetable) try{ window.renderTimetable(); }catch(e){}
    if(window.toast) window.toast('📍 ' + courseName + ' ← ' + b.n, 'success', 2200);
    st.sel = bid; render(); focusOn(bid);
  }

  window.renderCampus = render;
  window.CampusMap = { walkMinutes: walkMinutes, walkMeters: walkMeters, dayStops: dayStops, render: render, resolve: resolve, courses: courses, select: select, assign: assign, buildings: BLD, labs: LABS, norm: norm, state: st };
})();
