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
  /* ===== «وين أروح؟»: موقعك بالخريطة =====
     الخريطة مرسومة تقريبياً (بدون إحداثيات GPS حقيقية للمباني)، فنتعلّم المطابقة من المستخدم نفسه: كل مرة يقرأ الجهاز GPS ويختار المستخدم مبناه
     نحفظ نقطة معايرة {lat,lon,x,y}. من نقطتين مختلفتين فأكثر نحسب دوران وإزاحة (المقياس ثابت MPP) فيصير الـGPS يحدّد المبنى لحاله.
     بدون GPS أو معايرة: نخمّن من الجدول (مبنى المحاضرة الحالية/السابقة) ونسأل مرة واحدة. تقريبي؛ يُصحَّح بنقرة. */
  var CAL_KEY = 'ss_cm_calib', CAL_MAX = 8;
  function geoLocal(lat, lon, lat0, lon0){ return { e: (lon - lon0) * Math.cos(lat0 * Math.PI / 180) * 111320, n: (lat - lat0) * 110574 }; }
  function fitCalib(pts){
    if(!pts || !pts.length) return null;
    var lat0 = pts[0].lat, lon0 = pts[0].lon;
    var G = pts.map(function(q){ return geoLocal(q.lat, q.lon, lat0, lon0); }), M = pts.map(function(q){ return { e: q.x * MPP, n: -q.y * MPP }; });
    var n = pts.length, gc = { e: 0, n: 0 }, mc = { e: 0, n: 0 };
    G.forEach(function(g){ gc.e += g.e / n; gc.n += g.n / n; }); M.forEach(function(m){ mc.e += m.e / n; mc.n += m.n / n; });
    var spread = 0; for(var i = 0; i < n; i++) for(var j = i + 1; j < n; j++) spread = Math.max(spread, Math.hypot(M[i].e - M[j].e, M[i].n - M[j].n));
    var th = 0;   /* نقطة وحيدة أو نقاط متقاربة: نفترض أن الخريطة شمالها لفوق */
    if(n >= 2 && spread >= 50){
      var a = 0, b = 0; for(var k = 0; k < n; k++){ var me = M[k].e - mc.e, mn = M[k].n - mc.n, ge = G[k].e - gc.e, gn = G[k].n - gc.n; a += me * ge + mn * gn; b += me * gn - mn * ge; }
      th = Math.atan2(b, a);
    }
    var c = Math.cos(th), s = Math.sin(th), tx = gc.e - (c * mc.e - s * mc.n), ty = gc.n - (s * mc.e + c * mc.n), err = 0;
    for(var q = 0; q < n; q++){ var px = c * M[q].e - s * M[q].n + tx, py = s * M[q].e + c * M[q].n + ty; err += Math.hypot(px - G[q].e, py - G[q].n) / n; }
    return { lat0: lat0, lon0: lon0, th: th, tx: tx, ty: ty, err: Math.round(err), n: n, ok: n >= 2 && spread >= 50 };
  }
  function geoToMap(fit, lat, lon){
    var g = geoLocal(lat, lon, fit.lat0, fit.lon0), c = Math.cos(fit.th), s = Math.sin(fit.th), de = g.e - fit.tx, dn = g.n - fit.ty;
    return { x: (c * de + s * dn) / MPP, y: -(-s * de + c * dn) / MPP };
  }
  function nearestBld(x, y){
    var best = null, bd = 1e9;
    BLD.forEach(function(b){ var dx = Math.max(Math.abs(x - b.cx) - b.w / 2, 0), dy = Math.max(Math.abs(y - b.cy) - b.h / 2, 0), d = Math.hypot(dx, dy); if(d < bd){ bd = d; best = b; } });
    return best ? { b: best, m: Math.round(bd * MPP) } : null;
  }
  function loadCal(){ try{ var a = JSON.parse(localStorage.getItem(CAL_KEY) || '[]'); return Array.isArray(a) ? a.filter(function(q){ return q && isFinite(q.lat) && isFinite(q.lon) && isFinite(q.x) && isFinite(q.y); }) : []; }catch(e){ return []; } }
  function addCal(lat, lon, id){
    var p = pointOf(id); if(!p) return;
    var a = loadCal().filter(function(q){ return Math.hypot(q.x - p.x, q.y - p.y) > 25 || Date.now() - q.t > 3600000; });   /* نفس المكان خلال ساعة: نستبدل القديم */
    a.push({ lat: lat, lon: lon, x: Math.round(p.x), y: Math.round(p.y), t: Date.now() }); if(a.length > CAL_MAX) a = a.slice(-CAL_MAX);
    try{ localStorage.setItem(CAL_KEY, JSON.stringify(a)); }catch(e){}
  }

  var ABBR = { 'حب': 'hb', 'مغ': 'west', 'غم': 'west', 'مش': 'east', 'شم': 'east' };

  var byId = {}; BLD.forEach(function(b){ b.cx = b.x + b.w / 2; b.cy = b.y + b.h / 2; byId[b.id] = b; });

  /* ===== الموقع الفعلي (GPS): إحداثيات حقيقية =====
     المصدر: خرائط OpenStreetMap (ترخيص ODbL — © مساهمو OpenStreetMap): حدّ حرم الجامعة الهاشمية (92 نقطة) ومواقع المباني/البوابات/المرافق.
     مباني غير مسمّاة بالخريطة المفتوحة (EST) قدّرنا موقعها من مطابقة رسم الخريطة (دوران ~44° ومقياس ~1.15 م/بكسل؛ متوسط الخطأ ~40 م).
     تُستعمل لقرار «داخل/خارج حدود الجامعة» ولاسم المكان الحالي؛ التطبيق يعمل بدون هذه البيانات (يرجع للسؤال اليدوي). */
  var G0 = { lat: 32.1030, lon: 36.1867 };
  var REAL_LL = { hb:[32.10025,36.18856], west:[32.105,36.18655], east:[32.1028,36.189], eng:[32.10121,36.18725], it:[32.10033,36.18615], pe:[32.10171,36.18412], activity:[32.1015,36.18455], dean:[32.10262,36.18615], rest:[32.10332,36.1872], lib:[32.10435,36.18661], reg:[32.10343,36.18568], eco:[32.10458,36.18564], bank:[32.10417,36.18483], h4:[32.10539,36.18379], tour:[32.10064,36.18685], health:[32.10678,36.18531], ahs:[32.10583,36.18487], nurs:[32.10563,36.18515], med:[32.10539,36.18541], qr:[32.10707,36.18442], mosque:[32.10659,36.18306], sdean:[32.10301,36.18825], res:[32.10152,36.18891], phys:[32.10187,36.18932], bio:[32.10219,36.18974], chem:[32.10255,36.19013], nursery:[32.10141,36.18996], busz:[32.10548,36.18269], busa:[32.09994,36.18985], busm:[32.10216,36.18111] };
  var EST_LL = { annex:[32.10017,36.18685], itfield:[32.10136,36.18578], pefield:[32.10127,36.18453], risala:[32.10211,36.18563], grad:[32.10421,36.18451], pharm:[32.10688,36.18677], math:[32.1028,36.18784] };
  var GATE_LL = { gm: [32.10304, 36.18143], gn: [32.10576, 36.18332], gz: [32.10548, 36.18269], ga: [32.10010, 36.18976] };
  var POIS = [['الفيلج', 32.10228, 36.18659], ['مكتبة الخطيب', 32.10247, 36.18592], ['كلية الآداب', 32.10426, 36.18296], ['مبنى إدارة الجامعة', 32.10206, 36.18549], ['مبنى النشاط الثقافي والاجتماعي', 32.10260, 36.18667],
    ['صالة عثمان بدير', 32.10127, 36.18412], ['ملاعب التنس', 32.10086, 36.18607], ['ملاعب الكرة الطائرة', 32.10080, 36.18540], ['كلية طب الأسنان', 32.10741, 36.18664], ['كلية هندسة العمارة', 32.09987, 36.18824],
    ['المشاغل الهندسية', 32.10012, 36.18708], ['مركز التعليم الإلكتروني', 32.10259, 36.18914], ['حديقة الشرقي', 32.10289, 36.18917], ['حديقة الرياضيات', 32.10263, 36.18777], ['دوار العمادة', 32.10300, 36.18671]];
  var CAMPUS_LL = [[32.10574,36.18361],[32.10625,36.18422],[32.10725,36.18309],[32.10778,36.18364],[32.10808,36.18416],[32.10829,36.18480],[32.10831,36.18541],[32.10821,36.18606],[32.10794,36.18669],[32.10590,36.18914],[32.10566,36.18943],[32.10482,36.18842],[32.10479,36.18841],[32.10475,36.18839],[32.10470,36.18840],[32.10336,36.18994],[32.10338,36.18997],[32.10309,36.19031],[32.10306,36.19028],[32.10248,36.19095],[32.10257,36.19107],[32.10282,36.19137],[32.10244,36.19182],[32.10234,36.19195],[32.10192,36.19135],[32.10177,36.19134],[32.10164,36.19128],[32.10155,36.19121],[32.10043,36.18988],[32.10041,36.18986],[32.10039,36.18986],[32.10037,36.18986],[32.10035,36.18987],[32.10024,36.18999],[32.10019,36.18993],[32.10016,36.18989],[32.10013,36.18985],[32.10009,36.18981],[32.10006,36.18977],[32.10000,36.18970],[32.09956,36.18916],[32.09908,36.18968],[32.09837,36.18908],[32.09869,36.18754],[32.09823,36.18744],[32.09782,36.18709],[32.09859,36.18598],[32.09858,36.18502],[32.09895,36.18459],[32.09941,36.18459],[32.09941,36.18452],[32.09941,36.18451],[32.09949,36.18451],[32.09949,36.18442],[32.09955,36.18442],[32.09956,36.18394],[32.09957,36.18324],[32.09959,36.18306],[32.09964,36.18288],[32.09970,36.18272],[32.09976,36.18259],[32.09984,36.18245],[32.09994,36.18233],[32.10006,36.18221],[32.10021,36.18210],[32.10042,36.18200],[32.10057,36.18196],[32.10072,36.18194],[32.10104,36.18193],[32.10109,36.18180],[32.10199,36.18181],[32.10253,36.18182],[32.10271,36.18162],[32.10289,36.18142],[32.10294,36.18142],[32.10298,36.18142],[32.10310,36.18142],[32.10315,36.18142],[32.10317,36.18143],[32.10321,36.18143],[32.10323,36.18146],[32.10327,36.18145],[32.10356,36.18182],[32.10428,36.18182],[32.10427,36.18199],[32.10432,36.18201],[32.10438,36.18204],[32.10449,36.18212],[32.10567,36.18352],[32.10570,36.18355],[32.10573,36.18359]];
  /* تحويل (شرق،شمال بالمتر) ← إحداثيات الرسم: (e,n) = s·R(th)·(x,-y) + (tx,ty) */
  var AFFINE = { s: 1.1539, th: 0.7674, tx: -749.61, ty: 103.68 };

  /* ---- هندسة الموقع الفعلي: داخل/خارج الحرم، أقرب مبنى/بوابة، موقعك على الرسم ---- */
  BLD.forEach(function(b){ var ll = REAL_LL[b.id] || EST_LL[b.id]; if(ll){ b.ll = ll; b.est = !REAL_LL[b.id]; b.loc = geoLocal(ll[0], ll[1], G0.lat, G0.lon); } });
  GATES.forEach(function(g){ var ll = GATE_LL[g.id]; if(ll){ g.ll = ll; g.loc = geoLocal(ll[0], ll[1], G0.lat, G0.lon); } });
  var POLY = CAMPUS_LL.map(function(p){ var q = geoLocal(p[0], p[1], G0.lat, G0.lon); return [q.e, q.n]; });
  var POIL = POIS.map(function(p){ return { n: p[0], loc: geoLocal(p[1], p[2], G0.lat, G0.lon) }; });
  function inPoly(e, n){
    var c = false;
    for(var i = 0, j = POLY.length - 1; i < POLY.length; j = i++){
      var a = POLY[i], b = POLY[j];
      if((a[1] > n) !== (b[1] > n) && e < (b[0] - a[0]) * (n - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function distSeg(e, n, a, b){
    var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((e - a[0]) * dx + (n - a[1]) * dy) / l)) : 0;
    return Math.hypot(e - (a[0] + t * dx), n - (a[1] + t * dy));
  }
  function distPoly(e, n){ var d = 1e9; for(var i = 0; i < POLY.length; i++) d = Math.min(d, distSeg(e, n, POLY[i], POLY[(i + 1) % POLY.length])); return d; }
  function geoToXY(lat, lon){
    var q = geoLocal(lat, lon, G0.lat, G0.lon), c = AFFINE.s * Math.cos(AFFINE.th), s = AFFINE.s * Math.sin(AFFINE.th), de = q.e - AFFINE.tx, dn = q.n - AFFINE.ty, det = c * c + s * s;
    return { x: (c * de + s * dn) / det, y: -((-s * de + c * dn) / det) };
  }
  function fmtDist(m){ m = Math.round(m); if(m < 1000) return m + ' م'; var k = (m / 1000).toFixed(1); if(k.slice(-2) === '.0') k = k.slice(0, -2); return k + ' كم'; }
  /* الحكم: «inside/outside» فقط إن كان بعد النقطة عن الحدّ أكبر من دقة الـGPS؛ وإلا «edge» (على الحدود تقريباً) أو «weak» (دقة ضعيفة لا تسمح بالحكم) */
  function whereAmI(lat, lon, acc){
    acc = Math.max(0, Math.round(+acc || 0));
    var q = geoLocal(lat, lon, G0.lat, G0.lon), inside = inPoly(q.e, q.n), edge = Math.round(distPoly(q.e, q.n));
    var nb = null, nbd = 1e9, np = null, npd = 1e9, gt = null, gtd = 1e9, d;
    BLD.forEach(function(b){ if(!b.loc) return; d = Math.hypot(q.e - b.loc.e, q.n - b.loc.n); if(d < nbd){ nbd = d; nb = b; } });
    POIL.forEach(function(p){ d = Math.hypot(q.e - p.loc.e, q.n - p.loc.n); if(d < npd){ npd = d; np = p; } });
    GATES.forEach(function(g){ if(!g.loc) return; d = Math.hypot(q.e - g.loc.e, q.n - g.loc.n); if(d < gtd){ gtd = d; gt = g; } });
    var state = edge > acc ? (inside ? 'inside' : 'outside') : (acc <= 100 ? 'edge' : 'weak');
    var xy = geoToXY(lat, lon);
    if(nb && nbd <= 40){ xy = { x: nb.cx, y: nb.cy }; }   /* قريب جداً من مبنى: نثبّت العلامة على مركزه */
    return { state: state, inside: inside, acc: acc, edge: edge,
      here: nb ? { id: nb.id, n: nb.n, m: Math.round(nbd), est: !!nb.est } : null,
      poi: np ? { n: np.n, m: Math.round(npd) } : null,
      gate: gt ? { id: gt.id, n: gt.n, m: Math.round(gtd), min: Math.max(1, Math.ceil(gtd * DETOUR / WALK)) } : null,
      x: Math.round(xy.x), y: Math.round(xy.y) };
  }
  function placeLine(w){
    var near = w.poi && w.here && w.poi.m < w.here.m && w.poi.m <= 50 ? w.poi : null;
    if(near) return 'عند ' + near.n;
    if(!w.here) return '';
    return w.here.m <= 60 ? 'عند ' + w.here.n : 'قرب ' + w.here.n + ' (~' + w.here.m + ' م)';
  }
  function whereText(w){
    var accTxt = w.acc ? ' · دقة ±' + w.acc + ' م' : '';
    if(w.state === 'outside'){
      var far = w.edge > 3000;
      return { tone: 'out', title: '🚫 أنت خارج حدود الجامعة',
        sub: (far ? 'بعيد عن الجامعة (~' + fmtDist(w.edge) + ' عن حدودها)' : 'تبعد حوالي ' + fmtDist(w.edge) + ' عن حدود الجامعة') +
          (w.gate && !far ? ' · أقرب بوابة: ' + w.gate.n + ' (' + fmtDist(w.gate.m) + '، حوالي ' + w.gate.min + ' د مشي)' : '') + accTxt };
    }
    if(w.state === 'edge') return { tone: 'edge', title: '📍 أنت على حدود الجامعة تقريباً', sub: (placeLine(w) || 'قرب أحد المداخل') + accTxt };
    if(w.state === 'weak') return { tone: 'weak', title: '📡 دقة الموقع ضعيفة', sub: 'ما قدرت أحكم إذا أنت داخل الجامعة أو برا (دقة ±' + w.acc + ' م). اطلع لمكان مفتوح أو قرب نافذة وانتظر ثواني، وبعدين اضغط «حدّث موقعي».' };
    return { tone: 'in', title: '✅ أنت داخل حرم الجامعة الهاشمية', sub: placeLine(w) + accTxt };
  }
  /* قراءة GPS دقيقة: نراقب الموقع بضع ثوانٍ ونأخذ أفضل دقة (يتوقف مبكراً عند ≤25 م)، بدل قراءة واحدة سريعة غير دقيقة (كانت تعطي مكاناً قديماً/تقريبياً).
     cb(fix|null, err) حيث err: unsupported|insecure|denied|unavailable|timeout */
  function acquireFix(cb){
    var geo = navigator.geolocation;
    if(!geo){ cb(null, 'unsupported'); return; }
    if(window.isSecureContext === false){ cb(null, 'insecure'); return; }
    var best = null, wid = null, done = false, t0 = Date.now(), tSoft = null, tHard = null;
    function fin(err){
      if(done) return; done = true; clearTimeout(tSoft); clearTimeout(tHard);
      try{ if(wid !== null && geo.clearWatch) geo.clearWatch(wid); }catch(e){}
      cb(best, best ? null : (err || 'timeout'));
    }
    function got(p){
      var c = p && p.coords; if(!c || !isFinite(c.latitude) || !isFinite(c.longitude)) return;
      var f = { lat: c.latitude, lon: c.longitude, acc: Math.round(c.accuracy || 0) || 9999, t: Date.now() };
      if(!best || f.acc < best.acc) best = f;
      var el = Date.now() - t0;
      if(best.acc <= 25 || (best.acc <= 60 && el > 3500) || (best.acc <= 150 && el > 6500)) fin();
    }
    function bad(e){
      if(best){ fin(); return; }
      fin(e && e.code === 1 ? 'denied' : (e && e.code === 3 ? 'timeout' : 'unavailable'));
    }
    var opts = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 };
    tSoft = setTimeout(function(){ if(best) fin(); }, 9000);
    tHard = setTimeout(function(){ fin('timeout'); }, 20000);   /* مهلة تكفي لظهور نافذة طلب الصلاحية */
    try{
      if(geo.watchPosition) wid = geo.watchPosition(got, bad, opts);
      else geo.getCurrentPosition(function(p){ got(p); fin(); }, bad, opts);
    }catch(e){ fin('unavailable'); }
  }
  var GEO_ERR = {
    unsupported: 'المتصفح ما بيدعم تحديد الموقع.',
    insecure: 'تحديد الموقع يحتاج اتصالاً آمناً (https).',
    denied: 'ما عندي صلاحية الموقع. فعّلها من إعدادات المتصفح/التطبيق (الموقع ← السماح)، وبعدين اضغط «حدّث موقعي».',
    unavailable: 'ما قدرت أحدد موقعك (الـGPS مغلق أو الإشارة ضعيفة). فعّل «الموقع» بالجهاز وجرّب برا المبنى.',
    timeout: 'تأخر تحديد الموقع. تأكد إن «الموقع» مفعّل وجرّب من مكان مفتوح.'
  };
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
  var st = { sel: null, fac: null, q: '', tab: 'mine', day: 'all', vb: { x: 0, y: 0, w: W, h: H }, anim: null, layers: { pins: true, gates: true, park: true }, route: null, dir: { from: '', to: '' }, guide: { step: 'idle', here: '', how: '', dest: '', fix: null } };
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
    if(st.me){ var mr = Math.max(12, Math.min(90, (st.me.acc || 0) / MPP)); h += '<g class="cm-me" transform="translate(' + st.me.x + ' ' + st.me.y + ')" aria-label="موقعك"><circle class="cm-me-acc" r="' + mr + '"/><circle class="cm-me-dot" r="7"/></g>'; }
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

  /* ---------- «وين أروح؟» ---------- */
  function lectureTarget(status, hereId){
    var c = status.current, nx = status.next, cb = c ? resolve(c) : null, nb = nx ? resolve(nx) : null;
    if(c && cb.b && cb.b.id !== hereId) return { e: c, b: cb.b, fl: cb.fl, kind: 'now' };
    if(c && cb.b && cb.b.id === hereId && !(nx && nb.b)) return { e: c, b: cb.b, fl: cb.fl, kind: 'here' };
    if(nx && nb.b) return { e: nx, b: nb.b, fl: nb.fl, kind: 'next' };
    var l = status.later && status.later.entry, lb = l ? resolve(l) : null;
    if(l && lb.b) return { e: l, b: lb.b, fl: lb.fl, kind: 'later', days: status.later.daysAhead };
    return null;
  }
  function scheduleGuess(status){
    var c = status.current && resolve(status.current); if(c && c.b) return { id: c.b.id, why: 'محاضرتك الحالية «' + status.current.name + '»' };
    var done = (status.today || []).filter(function(e){ return e.state === 'done' && status.nowMin - e.end <= 45 && resolve(e).b; }).sort(function(a, b){ return b.end - a.end; })[0];
    if(done) return { id: resolve(done).b.id, why: 'آخر محاضرة «' + done.name + '»' };
    return null;
  }
  function guideSelOpts(sel){
    return '<option value="">اختر مكانك…</option><optgroup label="المباني">' + BLD.map(function(b){ return '<option value="' + b.id + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.n) + '</option>'; }).join('') +
      '</optgroup><optgroup label="البوابات">' + GATES.map(function(g){ return '<option value="g:' + g.id + '">' + esc(g.n) + '</option>'; }).join('') + '</optgroup>';
  }
  function nameOf(id){ var p = pointOf(id); return p ? p.n : ''; }
  function whereCard(w){ if(!w) return ''; var t = whereText(w); return '<div class="cm-where ' + t.tone + '" role="status"><b>' + esc(t.title) + '</b><small>' + esc(t.sub) + '</small></div>'; }
  function guideHtml(status){
    var g = st.guide, h = '<div class="cm-guide" role="region" aria-label="وين أروح؟">';
    if(g.step === 'idle'){
      h += '<button type="button" class="cm-guide-btn" data-g="go"><span class="cm-guide-ic" aria-hidden="true">📍</span><span class="cm-guide-tx"><b>وين أروح؟</b><small>اضغط وبقول لك وين محاضرتك الجاية وكم بتمشي</small></span></button>';
    } else if(g.step === 'locating'){
      h += '<div class="cm-guide-msg"><span class="cm-live"></span> بحدّد مكانك بدقة… (إذا طلب منك الجهاز صلاحية الموقع اضغط «سماح»)</div>';
    } else if(g.step === 'outside'){
      h += whereCard(g.where) + '<div class="cm-guide-card"><div class="cm-guide-acts">' + (g.where && g.where.gate && g.where.edge <= 3000 ? '<button type="button" class="btn btn-sm" data-g="gate">🚪 اعرض أقرب بوابة</button>' : '') +
        '<button type="button" class="btn btn-sm btn-ghost" data-g="redo">🔄 حدّث موقعي</button><button type="button" class="btn btn-sm btn-ghost" data-g="manual">✍️ أنا بالحرم — اختر مبناي</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-g="close" aria-label="إغلاق">✕</button></div></div>';
    } else if(g.step === 'ask'){
      var guess = scheduleGuess(status), chips = '';
      if(g.err === 'weak' && g.where) h += whereCard(g.where);
      else if(g.err && GEO_ERR[g.err]) h += '<div class="cm-where warn" role="status"><b>⚠️ ' + esc(GEO_ERR[g.err]) + '</b></div>';
      if(g.fix && g.fix.near) chips += '<button type="button" class="cm-chip" data-g-here="' + g.fix.near.id + '">🛰️ ' + esc(g.fix.near.n) + ' (حسب الـGPS)</button>';
      if(guess && (!g.fix || !g.fix.near || guess.id !== g.fix.near.id)) chips += '<button type="button" class="cm-chip" data-g-here="' + guess.id + '">' + esc(nameOf(guess.id)) + ' — ' + esc(guess.why) + '</button>';
      h += '<div class="cm-guide-card"><b>وين أنت هسا؟</b>' + (g.fix ? '<small>' + (g.fix.near ? 'الـGPS مش متأكد، ' : 'ما قدرت أطابق الـGPS بالخريطة بعد، ') + 'اختر مبناك مرة وبتعلّم منها.</small>' : '<small>اختر مبناك وبحسب لك الطريق.</small>') +
        (chips ? '<div class="cm-chips">' + chips + '</div>' : '') + '<select class="cm-dir-sel" data-g-sel aria-label="مكاني الحالي">' + guideSelOpts('') + '</select><div class="cm-guide-acts"><button type="button" class="btn btn-sm btn-ghost" data-g="redo">🔄 حدّث موقعي</button></div></div>';
    } else if(g.step === 'result'){
      var tg = lectureTarget(status, g.here), pickDest = g.destManual === ' ', destId = pickDest ? '' : (g.destManual || (tg && tg.b.id)), body = '';
      if(!destId){
        body = (pickDest ? '<b>لوين بدك تروح؟</b>' : '<b>ما عندك محاضرة قادمة بالجدول 🌴</b><small>لوين بدك تروح؟</small>') + '<select class="cm-dir-sel" data-g-dest aria-label="وجهتي">' + guideSelOpts('').replace('اختر مكانك…', 'اختر وجهتك…') + '</select>';
      } else if(destId === g.here){
        body = '<b>✅ أنت بنفس المبنى</b><small>' + esc(nameOf(destId)) + (tg && tg.fl ? ' — الطابق ' + tg.fl : '') + (tg ? ' · «' + esc(tg.e.name) + '»' : '') + '</small>';
      } else {
        var mi = walkMinutes(g.here, destId), m = walkMeters(g.here, destId), msg = '';
        if(tg && !g.destManual){
          var left = tg.kind === 'now' ? -(status.nowMin - tg.e.start) : (tg.e.start - status.nowMin);
          if(tg.kind === 'later') msg = '⏰ «' + esc(tg.e.name) + '» ' + (tg.days === 1 ? 'بكرة' : dayName(tg.e.dayIdx)) + ' ' + hm(tg.e.start);
          else if(tg.kind === 'now') msg = '⚠️ «' + esc(tg.e.name) + '» بدأت من ' + Math.max(1, Math.round(status.nowMin - tg.e.start)) + ' د — اطلع هسا';
          else msg = '⏰ «' + esc(tg.e.name) + '» الساعة ' + hm(tg.e.start) + ' — باقي ' + Math.round(left) + ' د · ' + (left < mi ? '<b>ما بتلحق، اطلع هسا!</b>' : left < mi + 5 ? 'ضيّق، لا تتأخر' : 'مريح ✓');
        }
        body = '<b>🧭 من ' + esc(nameOf(g.here)) + ' إلى ' + esc(nameOf(destId)) + '</b><span class="cm-guide-walk">🚶 حوالي <b>' + mi + ' د</b> (' + m + ' م)' + (tg && tg.fl && !g.destManual ? ' · الطابق ' + tg.fl : '') + '</span>' + (msg ? '<small>' + msg + '</small>' : '') +
          '<small class="cm-guide-note">تقدير تقريبي مش قياس حقيقي</small>';
      }
      h += (g.where && g.how === 'gps' ? whereCard(g.where) : '') + '<div class="cm-guide-card result">' + body + '<div class="cm-guide-acts">' + (destId && destId !== g.here ? '<button type="button" class="btn btn-sm" data-g="route">🧭 اعرض المسار</button>' : '') +
        '<button type="button" class="btn btn-sm btn-ghost" data-g="redo">🔄 حدّث موقعي</button><button type="button" class="btn btn-sm btn-ghost" data-g="manual">✍️ اختر مبناي</button>' + (destId ? '<button type="button" class="btn btn-sm btn-ghost" data-g="dest">🎯 وجهة ثانية</button>' : '') + '<button type="button" class="btn btn-sm btn-ghost" data-g="close" aria-label="إغلاق">✕</button></div></div>';
    }
    return h + '</div>';
  }
  function guideStart(){
    st.guide = { step: 'locating', here: '', how: '', dest: '', fix: null, where: null, err: '' }; st.me = null; render();
    acquireFix(function(fix, err){
      var g = st.guide; if(!g || g.step !== 'locating') return;   /* أُغلق/تغيّر أثناء الانتظار */
      g.err = err || ''; g.fix = fix || null;
      if(!fix){ g.step = 'ask'; render(); return; }
      var w = whereAmI(fix.lat, fix.lon, fix.acc); g.where = w;
      if(w.state === 'outside'){ g.step = 'outside'; st.me = null; render(); return; }
      if(w.state === 'weak' || !w.here){ g.step = 'ask'; g.err = 'weak'; render(); return; }
      st.me = { x: w.x, y: w.y, acc: fix.acc };
      pickHere(w.here.id, true);
      var ww = 300; animateTo({ x: w.x - ww / 2, y: w.y - ww * H / W / 2, w: ww });
    });
  }
  function pickHere(id, auto){
    var g = st.guide; g.here = id; g.how = auto ? 'gps' : 'user'; g.step = 'result'; g.destManual = '';
    if(!auto && g.fix && isFinite(g.fix.lat)) addCal(g.fix.lat, g.fix.lon, id);   /* اختيار المستخدم + قراءة GPS = نقطة معايرة */
    render();
  }
  function guideRoute(){
    var g = st.guide, status = (window.Schedule && window.Schedule.status) ? window.Schedule.status() : { today: [] }, tg = lectureTarget(status, g.here), to = g.destManual || (tg && tg.b.id);
    if(!to || to === g.here) return;
    st.dir.from = g.here; st.dir.to = to; st.route = { kind: 'dir', ids: [g.here, to] }; st.tab = 'route'; render();
    var a = pointOf(g.here), b = pointOf(to); if(a && b){ var w = Math.max(240, Math.abs(a.x - b.x) * 1.8 + 120); animateTo({ x: (a.x + b.x) / 2 - w / 2, y: (a.y + b.y) / 2 - w * H / W / 2, w: w }); }
  }

  function render(){
    root = document.getElementById('campusRoot'); if(!root) return;
    var cs = courses(), status = (window.Schedule && window.Schedule.status) ? window.Schedule.status() : { current: null, next: null };
    var tabs = [['mine', '🎒 موادي'], ['route', '🧭 مساري'], ['places', '🏛️ المباني'], ['legend', '🎨 الدليل']];
    var panel = st.tab === 'mine' ? panelMine(cs) : st.tab === 'route' ? panelRoute(status) : st.tab === 'places' ? panelPlaces() : panelLegend();
    var nowMsg = '';
    if(status.current && resolve(status.current).b) nowMsg = '<div class="cm-now"><span class="cm-live"></span>محاضرتك الآن: <b>' + esc(status.current.name) + '</b> — ' + esc(resolve(status.current).b.n) + '</div>';
    else if(status.next && resolve(status.next).b) nowMsg = '<div class="cm-now next">⏭️ التالية: <b>' + esc(status.next.name) + '</b> — ' + esc(resolve(status.next).b.n) + ' (' + hm(status.next.start) + ')</div>';
    root.innerHTML = guideHtml(status) +
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
      var gb = t.closest('[data-g]'); if(gb){
        var ga = gb.getAttribute('data-g');
        if(ga === 'go' || ga === 'redo') guideStart();
        else if(ga === 'route') guideRoute();
        else if(ga === 'dest'){ st.guide.destManual = ' '; st.guide.step = 'result'; render(); }
        else if(ga === 'manual'){ st.guide.step = 'ask'; st.guide.err = ''; render(); }
        else if(ga === 'gate'){ var gw = st.guide.where, gg = gw && gw.gate ? GATES.filter(function(x){ return x.id === gw.gate.id; })[0] : null; if(gg){ var gz = 240; animateTo({ x: gg.x - gz / 2, y: gg.y - gz * H / W / 2, w: gz }); st.sel = null; } }
        else if(ga === 'close'){ st.guide = { step: 'idle', here: '', how: '', dest: '', fix: null }; st.me = null; render(); }
        return;
      }
      var gh = t.closest('[data-g-here]'); if(gh){ pickHere(gh.getAttribute('data-g-here'), false); return; }
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
      var gs = e.target.closest && e.target.closest('[data-g-sel]'); if(gs){ if(gs.value) pickHere(gs.value, false); return; }
      var gd = e.target.closest && e.target.closest('[data-g-dest]'); if(gd){ st.guide.destManual = gd.value || ''; render(); if(gd.value) guideRoute(); return; }
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
  window.CampusMap = { geo: { where: whereAmI, text: whereText, toXY: geoToXY, acquire: acquireFix, inPoly: function(lat, lon){ var q = geoLocal(lat, lon, G0.lat, G0.lon); return inPoly(q.e, q.n); }, real: REAL_LL, est: EST_LL, gates: GATE_LL, campus: CAMPUS_LL, affine: AFFINE }, calib: { fit: fitCalib, toMap: geoToMap, nearest: nearestBld, load: loadCal, add: addCal, geoLocal: geoLocal }, guide: { start: guideStart, state: function(){ return st.guide; }, target: lectureTarget, guess: scheduleGuess }, walkMinutes: walkMinutes, walkMeters: walkMeters, dayStops: dayStops, render: render, resolve: resolve, courses: courses, select: select, assign: assign, buildings: BLD, labs: LABS, norm: norm, state: st };
})();
