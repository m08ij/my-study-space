/* ocr-parse.js — محلّل جدول التسجيل من نتيجة OCR (كلمات + إحداثيات الصندوق). مستقل عن محرّك الـOCR (Windows / Google Vision / غيره).
   الفكرة: عدّة قراءات -> كل قراءة تُحلَّل لصفوف -> تصويت + تحقق + درجة ثقة بأسبابها. يعمل بالمتصفح (window.OcrParse) وبـNode (للاختبار والمختبر).
   مصدر واحد: tools/ocr-lab/extract.js مجرّد غلاف Node يحمّل data.js ويمرّر COURSES_DB. أسلوب الملف ES2015 (const/سهم/spread) تجنّباً لأخطاء ترجمة 450 سطراً لـES5. */
(function(root){
'use strict';
var _db = null;
function setDB(d){ _db = d; }
function DBX(){ return _db || (typeof COURSES_DB !== 'undefined' ? COURSES_DB : {}); }
const DAY = { 'ح': 'Sun', 'ن': 'Mon', 'ث': 'Tue', 'ر': 'Wed', 'خ': 'Thu' };
const ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const DAYS_TEMPLATE = { 3: ['Sun', 'Tue', 'Thu'], 2: ['Mon', 'Wed'] };
const BUILDINGS = [{ re: /الحسين\s*الباني/, ab: 'ح.ب' }, { re: /خلدون/, ab: 'م.غ' }, { re: /رشد/, ab: 'م.ش' }];

/* ---------- نصوص عربية ---------- */
const normAr = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const nameKey = s => normAr(s).replace(/[\/\\|،,.:;]/g, ' ').replace(/\s+/g, ' ').trim();
function dice(a, b) {
  a = nameKey(a).replace(/ /g, ''); b = nameKey(b).replace(/ /g, ''); if (!a || !b) return 0;
  const bg = s => { const m = {}; for (let i = 0; i < s.length - 1; i++) { const k = s.substr(i, 2); m[k] = (m[k] || 0) + 1; } return m; };
  const A = bg(a), B = bg(b); let n = 0, t = 0, t2 = 0;
  for (const k in A) { t += A[k]; if (B[k]) n += Math.min(A[k], B[k]); }
  for (const k in B) t2 += B[k];
  return t + t2 ? 2 * n / (t + t2) : 0;
}
const tailNum = s => { const m = /\(\s*(\d+)\s*\)?\s*$/.exec(String(s)); return m ? m[1] : null; };
const fixDigits = s => String(s).replace(/[Il|]/g, '1').replace(/[Oo]/g, '0').replace(/S/g, '5').replace(/B/g, '8');
const isNum = t => /^\d+$/.test(fixDigits(t));
const toMin = t => t.h * 60 + t.m;
function timeIn(tok) {
  const m = /(\d{1,2})[,.:](\d{2})/.exec(fixDigits(tok));
  return m ? { h: +m[1], m: +m[2], str: String(+m[1]).padStart(2, '0') + ':' + m[2] } : null;
}

/* ---------- مطابقة المادة بالقاعدة: بالرقم أولاً، ثم بالاسم (برقم الشعبة (1)/(2) مطابقاً) ---------- */
function dbByCode(code) {
  const c1 = code, c2 = code.replace(/^0+/, '');
  for (const k of Object.keys(DBX())) {
    const c = DBX()[k], al = c.aliases || [];
    if (c.code === c1 || c.code.replace(/^0+/, '') === c2 || al.includes(c1) || al.includes(c2) || al.includes('0' + c2)) return k;
  }
  return null;
}
function dbByName(ocrName) {
  if (!ocrName) return null;
  const tn = tailNum(ocrName); let best = null, bs = 0;
  for (const k of Object.keys(DBX())) {
    if ((tailNum(k) || null) !== tn) continue;           /* «كيمياء (2)» لا تُطابَق مع «كيمياء» بلا رقم */
    const s = dice(ocrName, k); if (s > bs) { bs = s; best = k; }
  }
  return bs >= 0.86 ? { name: best, sim: bs } : null;
}

/* ---------- العناوين والأعمدة ---------- */
/* حدّ الترويسة ديناميكياً من موقع أول رقم مادة (لا خط ثابت): الترويسة = كل ما فوق منتصف المسافة بين رأس الصف الأول وأول رقم.
   كان الحدّ ثابتاً (y<62) فتفشل لقطات فيها هامش علوي أو ترويسة أعلى: سطر «النظري/العملي/الساعات» الثاني يقع تحت الخط فيضيع موضع الأعمدة. */
function headerCutoff(W) {
  const codes = W.filter(w => /^[\dIlOo|]{9,10}$/.test(w.t) && w.w > 60 && w.w > 4 * w.h).sort((a, b) => a.cy - b.cy);
  if (!codes.length) return 62;
  const S = codes.length > 1 ? Math.min(Math.max(codes[1].cy - codes[0].cy, 30), 90) : 64;
  return codes[0].cy - 0.5 * S;
}
function findHeaders(W, cutoff) {
  const H = W.filter(w => w.cy < (cutoff != null ? cutoff : headerCutoff(W)));
  const one = re => { const c = H.filter(w => re.test(normAr(w.t))); return c.length ? c.reduce((a, w) => a + w.cx, 0) / c.length : null; };
  return {
    theory: one(/^النظري$/), practical: one(/^العملي$/), hours: one(/^(الساعات|عدد)$/),
    time: one(/^(القاعه|وقت|المحاضره\/رقم)$/), code: one(/^(قم|رقم)$/),
    bottom: Math.max(0, ...H.map(w => w.y + w.h))
  };
}
/* تطبيع الحجم: ثوابت المحلّل بوحدة «صورة مرجعية» (ارتفاع أرقام رقم المادة = 14.7)؛ نقيسها بالقراءة نفسها فلا يهمّ تكبير الصورة */
const REF_CODE_H = 14.7, REF_MED_H = 18.33;
function normalizeWords(W) {
  const ch = W.filter(w => /^[\dIlOo|]{9,10}$/.test(w.t) && w.w > 4 * w.h).map(w => w.h).sort((a, b) => a - b);
  let k;
  if (ch.length) k = ch[Math.floor(ch.length / 2)] / REF_CODE_H;
  else { const hs = W.map(w => w.h).sort((a, b) => a - b); k = hs.length ? hs[Math.floor(hs.length / 2)] / REF_MED_H : 1; }
  if (!isFinite(k) || k <= 0) k = 1;
  return W.map(w => ({ t: w.t, x: w.x / k, y: w.y / k, w: w.w / k, h: w.h / k, cx: w.cx / k, cy: w.cy / k, ocy: w.cy, och: w.h }));
}

function parseRows(W, sharedHd, virtualYs) {
  let hd = sharedHd || findHeaders(W);
  const body = W.filter(w => w.cy > hd.bottom + 2);
  const codes = body.filter(w => /^\d{9,10}$/.test(fixDigits(w.t)) && w.w > 60);
  const rows = codes.map(c => ({ codeTok: c, oy: c.ocy, words: [] }));
  /* صفوف «افتراضية» من مواقع صفوف رأتها قراءات أخرى ولم يُقرأ رقمها هنا: تمنع نسب كلمات هذا الصف لجاره، ثم تُهمَل */
  const ch = codes.map(c => c.och).sort((a, b) => a - b), vtol = 1.1 * (ch.length ? ch[Math.floor(ch.length / 2)] : 15);
  (virtualYs || []).forEach(vy => { if (!rows.some(r => Math.abs(r.oy - vy) < vtol)) rows.push({ codeTok: null, oy: vy, words: [], virtual: true }); });
  rows.sort((a, b) => a.oy - b.oy);
  /* حدّ نسبة الكلمة لصف: 0.62 من المسافة لأقرب صف مجاور بنفس الجهة (بإحداثيات الصورة الأصلية) */
  rows.forEach((r, i) => {
    const up = i > 0 ? r.oy - rows[i - 1].oy : null, down = i < rows.length - 1 ? rows[i + 1].oy - r.oy : null;
    const typical = [up, down].filter(x => x != null);
    r.capUp = 0.62 * (up != null ? up : (typical.length ? typical[0] : 80));
    r.capDown = 0.62 * (down != null ? down : (typical.length ? typical[0] : 80));
  });
  body.forEach(w => {
    let best = null, bd = 1e9;
    rows.forEach(r => { const d = Math.abs(w.ocy - r.oy); if (d < bd) { bd = d; best = r; } });
    if (best && !best.virtual) { const dy = w.ocy - best.oy; if (dy >= -best.capUp && dy <= best.capDown) best.words.push(w); }
  });
  /* ما في عنوان «الساعات» (صورة بلا ترويسة أو لم يُقرأ): عمود الساعات = أقصى يسار أرقام صغيرة تتكرر بنصف الصفوف على الأقل */
  const realRows = rows.filter(r => !r.virtual);
  if (hd.hours == null && realRows.length) {
    const toks = [];
    realRows.forEach(r => r.words.forEach(w => { if (/^[\dIlOo|]{1,2}$/.test(w.t)) toks.push({ cx: w.cx, row: r }); }));
    toks.sort((a, b) => a.cx - b.cx);
    if (toks.length) {
      const cl = toks.filter(t => Math.abs(t.cx - toks[0].cx) < 25);
      if (new Set(cl.map(t => t.row)).size >= Math.ceil(realRows.length / 2)) hd = { ...hd, hours: cl.reduce((a, t) => a + t.cx, 0) / cl.length };
    }
  }
  return { hd, rows: realRows.map(r => buildRow(r, hd)) };
}

/* ترتيب كلمات الاسم: أسطر من الأعلى للأسفل، وبكل سطر من اليمين لليسار؛ ودمج الأجزاء الملتصقة (كلمة قطّعها الـOCR) */
function joinNameTokens(toks) {
  if (!toks.length) return '';
  const lines = [];
  toks.slice().sort((a, b) => a.cy - b.cy).forEach(w => {
    const l = lines.find(L => Math.abs(L.cy - w.cy) < 7);
    if (l) { l.ws.push(w); l.cy = (l.cy * (l.ws.length - 1) + w.cy) / l.ws.length; } else lines.push({ cy: w.cy, ws: [w] });
  });
  lines.sort((a, b) => a.cy - b.cy);
  const out = [];
  lines.forEach(l => {
    const ws = l.ws.sort((a, b) => b.cx - a.cx);
    let cur = ws[0].t;
    for (let i = 1; i < ws.length; i++) {
      const gap = (ws[i - 1].x) - (ws[i].x + ws[i].w);   /* المسافة بين حافتين (RTL: السابق على اليمين) */
      const frag = ws[i].t.length <= 3 || ws[i - 1].t.length <= 3;     /* كلمتان طويلتان ملتصقتان = كلمتان (للعلوم/العامة)، والجزء القصير بقايا كلمة قطّعها الـOCR */
      cur += (gap < 2.5 && frag && !/[()]/.test(ws[i].t + ws[i - 1].t) ? '' : ' ') + ws[i].t;
    }
    out.push(cur);
  });
  let nm = out.join(' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ').trim();
  if ((nm.match(/\(/g) || []).length > (nm.match(/\)/g) || []).length) nm += ')';      /* قوس ناقص قرأه الـOCR نصفه */
  return nm;
}

/* ---------- الأيام: حروف (ح ن ث ر خ) تُقرأ بالتسلسل ثم تُطابَق بأنماط الأيام بدل الاعتماد على حرف واحد ---------- */
const DLET = { Sun: 'ح', Mon: 'ن', Tue: 'ث', Wed: 'ر', Thu: 'خ' };
/* حروف متشابهة الشكل (نقاط/انحناء) يخلط بينها الـOCR: ح خ ج ع غ | ث ت ن ب ي | ر ز د ذ و */
const CLS = { 'ح': 'A', 'خ': 'A', 'ج': 'A', 'ع': 'A', 'غ': 'A', 'ث': 'B', 'ت': 'B', 'ن': 'B', 'ب': 'B', 'ي': 'B', 'ر': 'C', 'ز': 'C', 'د': 'C', 'ذ': 'C', 'و': 'C' };
const letterSim = (obs, day) => { const d = DLET[day]; if (obs === d) return 2; return (CLS[obs] && CLS[obs] === CLS[d]) ? 1 : 0; };
const ALL_SETS = (() => { const out = []; for (let m = 1; m < 32; m++) out.push(ORDER.filter((_, i) => m & (1 << i))); return out; })();
const isStd = set => ['Sun,Tue,Thu', 'Mon,Wed', 'Tue,Thu'].includes(set.join());

function extractDayLetters(cell, timeToks) {
  if (!timeToks.length) return [];
  const endTok = timeToks.reduce((a, b) => (b.w.cx < a.w.cx ? b : a)).w;      /* أقصى يسار = وقت النهاية (الجملة RTL) */
  const out = [];
  if (/^[Cح]\s*[IlO0-9]/.test(endTok.t)) out.push('ح');                      /* «ح» التصق بالوقت فقرأه الـOCR C */
  const toks = cell.filter(w => Math.abs(w.cy - endTok.cy) < 7 && w.cx < endTok.cx - 2).sort((a, b) => b.cx - a.cx);
  for (const w of toks) {
    const t = w.t.trim(), hasSlash = t.indexOf('/') >= 0;
    const clean = t.replace(/[\/,.:;()،ـً-ْ]/g, '');      /* التطويلة والتشكيل ليست حروف أيام */
    if (!clean) { if (hasSlash) break; continue; }
    if (!/^[ء-ي]{1,3}$/.test(clean)) { if (hasSlash) break; if (/^[ء-ي]{4,}$/.test(clean) || /\d/.test(clean)) break; continue; }
    if (clean.length === 3 && !hasSlash) break;                              /* كلمة (مثل «في») وليست حروف أيام */
    clean.split('').forEach(ch => out.push(ch));
    if (hasSlash) break;
  }
  return out.slice(0, 5);
}
/* يختار مجموعة الأيام الأنسب لقوائم حروف (واحدة لكل قراءة): تشابه الأحرف + أفضلية للأنماط القياسية + تلميح من الساعات/المدة */
function bestDays(letterLists, durH, hours) {
  const lists = letterLists.filter(L => L.length);
  const scored = ALL_SETS.map(set => {
    let sc = 0, exactAll = 0;
    lists.forEach(L => {
      /* محاذاة: حرف مقروء قد يكون ناقصاً (ضاع) أو زائداً (ضجيج) => تسلسل فرعي بأعلى تشابه */
      const n = L.length, m = set.length, dp = [];
      for (let i = 0; i <= n; i++) { dp.push(new Array(m + 1).fill(-1e9)); }
      dp[0][0] = 0;
      for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
        if (i === 0 && j === 0) continue;
        let v = -1e9;
        if (i > 0) v = Math.max(v, dp[i - 1][j] - 1.5);                       /* حرف زائد بالقراءة */
        if (j > 0) v = Math.max(v, dp[i][j - 1] - 1);                         /* يوم لم يُقرأ حرفه */
        if (i > 0 && j > 0) v = Math.max(v, dp[i - 1][j - 1] + letterSim(L[i - 1], set[j - 1]));
        dp[i][j] = v;
      }
      sc += dp[n][m];
      let ex = 0; if (n === m) { ex = 0; for (let i = 0; i < n; i++) if (letterSim(L[i], set[i]) === 2) ex++; }
      if (ex === set.length && n === set.length) exactAll++;
    });
    if (isStd(set)) sc += 2.5;
    if (durH && hours) { const ratio = hours / durH; if ((ratio > 2.6 && ratio < 3.4 && set.join() === 'Sun,Tue,Thu') || (ratio > 1.6 && ratio < 2.4 && (set.join() === 'Mon,Wed' || set.join() === 'Tue,Thu'))) sc += 1.5; }
    return { set, sc, exactAll };
  }).sort((a, b) => b.sc - a.sc || b.exactAll - a.exactAll);
  return { set: lists.length || (durH && hours) ? scored[0].set : [], margin: scored[0].sc - scored[1].sc, exactVariants: scored[0].exactAll, variants: lists.length, std: isStd(scored[0].set) };
}

/* الأوقات: «hh,mm» العادية + أوقات قطّعها الـOCR: «1630» بلا فاصل، أو رقمان متجاوران «16» و«30» (الفاصلة ضاعت) */
function collectTimes(cell) {
  const out = [], used = new Set();
  const mk = (h, m, w) => ({ t: { h, m, str: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') }, w });
  cell.forEach(w => { const t = timeIn(w.t); if (t && /[,.:]/.test(w.t)) { out.push({ t, w }); used.add(w); } });
  cell.forEach(w => {
    if (used.has(w)) return;
    const m = /^([01]?\d|2[0-3])([0-5]\d)$/.exec(fixDigits(w.t));
    if (m && w.t.length === 4 && +m[1] >= 6 && +m[2] % 5 === 0) { out.push(mk(+m[1], +m[2], w)); used.add(w); }
  });
  const twos = cell.filter(w => !used.has(w) && /^[\dIlOo]{2}$/.test(w.t));
  twos.forEach(a => {
    const b = twos.find(x => x !== a && !used.has(x) && !used.has(a) && Math.abs(x.cy - a.cy) < 5 && x.cx > a.cx && x.cx - a.cx < 2.2 * a.w + 6);
    if (!b) return;
    const h = +fixDigits(a.t), m = +fixDigits(b.t);
    if (h >= 6 && h <= 23 && m % 5 === 0 && m < 60) { out.push(mk(h, m, { ...a, cx: (a.cx + b.cx) / 2, t: a.t + ',' + b.t })); used.add(a); used.add(b); }
  });
  return out;
}

function buildRow(r, hd) {
  const flags = [];
  const code = fixDigits(r.codeTok.t);
  const ws = r.words.filter(w => w !== r.codeTok);
  const codeLeft = r.codeTok.cx - r.codeTok.w / 2;
  const used = new Set();
  const near = (w, c, tol) => c != null && Math.abs(w.cx - c) < tol;

  let hours = null, theory = null, practical = null;
  ws.forEach(w => {
    if (!isNum(w.t) || fixDigits(w.t).length > 2) return;
    const v = +fixDigits(w.t);
    if (hd.hours != null && w.cx < hd.hours + 30) { hours = v; used.add(w); }
    else if (near(w, hd.practical, 32)) { practical = v; used.add(w); }
    else if (near(w, hd.theory, 40)) { theory = v; used.add(w); }
  });

  /* بداية عمود الاسم: يمين عمود الشعبة؛ ولو ما انقرأ عنوان أي شعبة نقدّرها من عنوان الرقم (لا نترك null فيصير الصف كله «اسماً») */
  const nameLeft = hd.theory != null ? hd.theory + 28 : hd.practical != null ? hd.practical + 28 : (hd.code != null ? hd.code - 260 : codeLeft - 230);
  /* رقم عارٍ (شعبة) ليس من اسم المادة؛ أما «(1)» بين قوسين فمنه */
  const nameToks = ws.filter(w => !used.has(w) && w.cx > nameLeft && w.cx < codeLeft - 2 && !/^[\dIlOo|]{1,2}$/.test(w.t));
  nameToks.forEach(w => used.add(w));
  const ocrName = joinNameTokens(nameToks);

  const cell = ws.filter(w => !used.has(w));
  const lines = [];
  cell.slice().sort((a, b) => a.cy - b.cy).forEach(w => {
    let l = lines.find(L => Math.abs(L.cy - w.cy) < 9);
    if (!l) { l = { cy: w.cy, ws: [] }; lines.push(l); }
    l.ws.push(w);
  });
  lines.forEach(l => l.ws.sort((a, b) => b.cx - a.cx));
  const cellText = lines.map(l => l.ws.map(w => w.t).join(' ')).join(' ');

  const timeToks = collectTimes(cell), times = timeToks.map(x => x.t);
  times.sort((a, b) => toMin(a) - toMin(b));

  /* حروف الأيام: نحفظ التسلسل كما قُرئ، والقرار بالنمط لاحقاً (الحرف المفرد يخطئ فيه الـOCR كثيراً) */
  const letters = extractDayLetters(cell, timeToks);

  let timeFrom = null, timeTo = null;
  if (times.length >= 2) { timeFrom = times[0].str; timeTo = times[times.length - 1].str; }
  else if (times.length === 1) { timeFrom = times[0].str; flags.push('one-time-only'); }

  let dur = null;
  if (timeFrom && timeTo) dur = (toMin(timeIn(timeTo)) - toMin(timeIn(timeFrom))) / 60;
  /* أيام هذه القراءة وحدها (تُعاد حسابها بالتصويت بين القراءات في ensemble) */
  const dd = bestDays([letters], dur, hours);
  const days = dd.set;
  const daysExplicit = letters.length;

  const nt = normAr(cellText);
  const hasPlatform = /منصه|teams|مايكروسوفت/i.test(nt + ' ' + cellText);
  let modalityExplicit = false;
  let modality = /وجاهي/.test(nt) ? 'inperson' : /عن\s*بعد/.test(nt) ? 'online' : /مدمج/.test(nt) ? 'blended' : '';

  /* القاعة: رقم من 3 خانات + اختصار المبنى (يُقرأ كما هو مكتوب، أو من اسم المبنى المعروف) */
  let roomNum = '';
  for (const w of cell) {
    if (timeIn(w.t)) continue;
    const m = /^[^\d]{0,5}(\d{3})[^\d]{0,2}$/.exec(fixDigitsKeep(w.t));
    if (m) { roomNum = m[1]; break; }
  }
  const am = /([ء-ي])\s*[.،]\s*([ء-ي])\s*(?:\d{3})/.exec(cellText.replace(/\s+/g, ' '));
  let abbrRead = am ? am[1] + '.' + am[2] : '';
  if (!abbrRead && roomNum) {
    /* الـOCR يُسقط نقطة الاختصار (أ.ر -> «أأر»/«أر»): الكلمة القصيرة قبل رقم القاعة مباشرة تُعدّ اختصاراً */
    const rt = cell.find(w => !timeIn(w.t) && /^[^\d]{0,5}(\d{3})[^\d]{0,2}$/.test(fixDigitsKeep(w.t)));
    if (rt) {
      const prev = cell.filter(w => w !== rt && Math.abs(w.cy - rt.cy) < 7 && w.cx > rt.cx && w.cx - rt.cx < 60).sort((a, b) => a.cx - b.cx)[0];
      const pt = prev ? prev.t.replace(/[.،\/()]/g, '') : '';
      if (/^[ء-ي]{2,3}$/.test(pt) && !/^(في|من|على|عن|بعد)$/.test(pt)) abbrRead = pt[0] + '.' + pt[pt.length - 1];
    }
  }
  const abbrKnown = (BUILDINGS.find(b => b.re.test(nt)) || {}).ab || '';
  modalityExplicit = !!modality;
  const hasPlace = !!roomNum || /مبنى|مجمع|قاعات/.test(nt);
  /* النمط احتياطاً: لا مكان + منصة => عن بعد ؛ مكان بلا منصة => وجاهي */
  if (!modality) { if (hasPlatform && hasPlace) modality = 'blended'; else if (hasPlatform) modality = 'online'; else if (hasPlace) modality = 'inperson'; }
  /* اختصار مقروء قريب (بحروف متشابهة الشكل مثل ع/غ) من اختصار مبنى معروف => نثبّته عليه */
  const snapKnown = (() => {
    if (!abbrRead) return '';
    const a = abbrRead.split('.');
    for (const b of BUILDINGS) { const k = b.ab.split('.'); if (a.length === 2 && [0, 1].every(i => a[i] === k[i] || (CLS[a[i]] && CLS[a[i]] === CLS[k[i]]))) return b.ab; }
    return '';
  })();
  const abbr = abbrKnown || abbrRead;
  const room = roomNum ? (abbr ? abbr + ' ' : '') + roomNum : '';

  /* المادة: بالرقم، وإلا بالاسم، وإلا غير معروفة (نبقي اسم الـOCR) */
  let name = ocrName, matchedBy = 'none', sim = null, dbCode = null;
  const byCode = dbByCode(code);
  if (byCode) { name = byCode; matchedBy = 'code'; sim = dice(ocrName, byCode); dbCode = DBX()[byCode].code; }
  else {
    const bn = dbByName(ocrName);
    if (bn) { name = bn.name; matchedBy = 'name'; sim = bn.sim; dbCode = DBX()[bn.name].code; flags.push('matched-by-name'); }
    else flags.push('course-not-in-db');
  }
  const dbHours = matchedBy !== 'none' ? DBX()[name].h : null;
  if (hours == null && dbHours != null) { hours = dbHours; flags.push('hours-from-db'); }
  if (dbHours != null && hours != null && dbHours !== hours) flags.push('hours-differ-from-db');
  return { code, cy: r.codeTok.cy, ocy: r.codeTok.ocy, och: r.codeTok.och, dbCode, name, matchedBy, hours, section: { theory, practical }, days, daysExplicit, letters, dur, roomNum, abbrKnown, abbrRead, timeFrom, timeTo, room, modality, modalityExplicit, ocrName, nameSim: sim == null ? null : +sim.toFixed(2), flags, cellText };
}
function fixDigitsKeep(s) { const t = String(s).replace(/[±]/g, ''); return /^[\dIlOo|]{3}$/.test(t) ? fixDigits(t) : t; }

/* ---------- جودة قراءة واحدة (لاختيار الأفضل عند التعادل) ---------- */
function score(r) {
  let s = 0;
  if (r.timeFrom && r.timeTo) s += 3; else return -5;
  const a = r.timeFrom.split(':'), b = r.timeTo.split(':');
  const d = (+b[0] * 60 + +b[1]) - (+a[0] * 60 + +a[1]);
  if (d > 0 && d <= 240) s += 2;
  if (+a[1] % 5 === 0 && +b[1] % 5 === 0) s += 1;
  if (+a[0] >= 6 && +a[0] <= 22) s += 1;
  if (r.days.length) s += 2;
  if (r.daysExplicit) s += 1;
  if (!r.flags.includes('days-inferred-from-hours')) s += 1;
  if (r.hours != null) s += 1;
  if (r.nameSim != null) s += r.nameSim;
  return s;
}
const timeKey = r => (r.timeFrom || '') + '|' + (r.timeTo || '');
const alefN = s => String(s || '').replace(/[أإآ]/g, 'ا');

function ensemble(variants) {
  variants = variants.map(v => ({ label: v.label, words: normalizeWords(v.words) }));
  /* مواقع الأعمدة من أول قراءة فيها عناوين كاملة (محرّك الأرقام لا يقرأ العناوين العربية) */
  const hdOwn = variants.map(v => findHeaders(v.words));
  const shared = hdOwn.find(h => h.theory != null && h.hours != null) || null;
  const hdFor = i => (shared && hdOwn[i].theory == null ? shared : null);
  /* مرور أول: مواقع الصفوف الفعلية (y بالصورة الأصلية) من كل القراءات، لتُعرف الصفوف التي فات بعض القراءات رقمها */
  const pass1 = variants.map((v, i) => parseRows(v.words, hdFor(i)));
  const ys1 = []; pass1.forEach(p => p.rows.forEach(r => ys1.push({ y: r.ocy, h: r.och }))); ys1.sort((a, b) => a.y - b.y);
  const hh = ys1.map(o => o.h).sort((a, b) => a - b), ytol = 1.1 * (hh.length ? hh[Math.floor(hh.length / 2)] : 15);
  const centers = []; ys1.forEach(o => { const c = centers.find(c => Math.abs(c.y - o.y) < ytol); if (c) { c.y = (c.y * c.n + o.y) / (c.n + 1); c.n++; } else centers.push({ y: o.y, n: 1 }); });
  const virtualYs = centers.filter(c => c.n >= 2).map(c => c.y);          /* صف رآه قراءتان على الأقل */
  const per = variants.map((v, i) => ({ label: v.label, res: parseRows(v.words, hdFor(i), virtualYs) }));
  /* الصف الفعلي يُحدَّد بموقعه بالصورة (cy) لا بنص رقمه: قراءة بخطأ رقم واحد ما تصنع صفاً وهمياً، والرقم الصحيح بالأغلبية */
  const items = [];
  per.forEach(p => p.res.rows.forEach(r => items.push({ r, label: p.label })));
  items.sort((a, b) => a.r.ocy - b.r.ocy);
  const hs = items.map(i => i.r.och).sort((a, b) => a - b), tolY = 1.1 * (hs.length ? hs[Math.floor(hs.length / 2)] : 15);   /* بإحداثيات الصورة الأصلية (ثابتة بين القراءات) */
  const clusters = [];
  items.forEach(it => {
    const cl = clusters.find(c => Math.abs(c.cy - it.r.ocy) < tolY);
    if (cl) { cl.items.push(it); cl.cy = cl.items.reduce((a, x) => a + x.r.ocy, 0) / cl.items.length; } else clusters.push({ cy: it.r.ocy, items: [it] });
  });
  const byCode = {};
  clusters.forEach((cl, idx) => {
    const cnt = {};
    cl.items.forEach(it => { cnt[it.r.code] = (cnt[it.r.code] || 0) + (/^ar/.test(it.label) ? 1 : 0.6) + (dbByCode(it.r.code) ? 0.3 : 0); });
    const code = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    byCode['#' + idx + ':' + code] = cl.items.filter(it => it.r.code === code);
  });
  const out = [];
  Object.keys(byCode).forEach(key => {
    const c = key.replace(/^#\d+:/, '');
    const cand = byCode[key].map(x => ({ ...x, s: score(x.r) }));
    const withTime = cand.filter(x => x.r.timeFrom && x.r.timeTo);
    /* إجماع الوقت (بداية/نهاية) بالأكثر تكراراً */
    const tally = {};
    const wt = x => (/^ar/.test(x.label) ? 1 : 0.6);   /* محرّك العربية أوثق بالنصوص والأوقات من الإنجليزي */
    withTime.forEach(x => { const k = timeKey(x.r); (tally[k] = tally[k] || { n: 0, wsum: 0, w: 0, best: x }); tally[k].n++; tally[k].wsum += wt(x); tally[k].w += x.s; if (x.s > tally[k].best.s) tally[k].best = x; });
    const groups = Object.values(tally).sort((a, b) => b.wsum - a.wsum || b.w - a.w);
    const top = groups.length ? groups[0].best : cand.sort((a, b) => b.s - a.s)[0];
    const agreeN = groups.length ? groups[0].n : 0, timedN = withTime.length;
    const totW = groups.reduce((a, g) => a + g.wsum, 0), shareW = totW ? groups[0].wsum / totW : 0;
    const marginW = groups.length > 1 ? groups[0].wsum - groups[1].wsum : (groups.length ? groups[0].wsum : 0);
    const agreeCands = groups.length ? withTime.filter(x => timeKey(x.r) === timeKey(top.r)) : cand;
    const vote = get => { const cnt = {}; cand.forEach(x => { const v = get(x.r); if (v != null) cnt[v] = (cnt[v] || 0) + 1; }); const ks = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]); return ks.length ? +ks[0] : null; };
    const voteStr = (get, pool) => { const cnt = {}; (pool || cand).forEach(x => { const v = get(x.r); if (v) cnt[v] = (cnt[v] || 0) + 1; }); const ks = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]); return ks.length ? ks[0] : ''; };
    const hours = vote(r => r.hours) != null ? vote(r => r.hours) : top.r.hours;
    /* الأيام: تصويت بالنمط عبر حروف كل القراءات المتفقة على الوقت */
    const dd = bestDays(agreeCands.map(x => x.r.letters || []), top.r.dur, hours);
    /* القاعة: الرقم بالأغلبية، والاختصار: مبنى معروف أولاً، وإلا الأكثر قراءةً (ونفضّل الهمزة إن قُرئت) */
    const numV = voteStr(r => r.roomNum);
    /* اختصار مقروء بثبات (قراءتان أو أكثر) يُعتمد كما هو مطبوع؛ ولا نستبدله بالمبنى المعروف لأن الطباعة قد تختلف عنه */
    let abbr = voteStr(r => r.abbrKnown);          /* اسم المبنى معروف (من نص الخلية) => اختصاره المعروف */
    if (!abbr) {                                   /* وإلا الاختصار المقروء كما هو، بدون «تصحيح» تقريبي (ج.ب غير ح.ب) */
      const g = {}; cand.forEach(x => { const a = x.r.abbrRead; if (a) { const k = alefN(a); (g[k] = g[k] || []).push(a); } });
      const ks = Object.keys(g).sort((a, b) => g[b].length - g[a].length);
      if (ks.length) abbr = g[ks[0]].sort((a, b) => (/[أإآ]/.test(b) ? 1 : 0) - (/[أإآ]/.test(a) ? 1 : 0))[0];
    }
    const room = numV ? (abbr ? abbr + ' ' : '') + numV : '';
    /* اسم غير معروف بالقاعدة: أنظف اسم (أكثر تكراراً، وأقل أجزاء مقطّعة) */
    let name = top.r.name;
    if (top.r.matchedBy === 'none') {
      /* الأسماء من قراءات العربية فقط: الإنجليزي يقرأ الحروف العربية كخربشة فيغلب بالعدد */
      const pool = cand.filter(x => /^ar/.test(x.label)).length ? cand.filter(x => /^ar/.test(x.label)) : cand;
      const cnt = {};
      pool.forEach(x => { const n = x.r.ocrName; if (!n) return; const frag = n.split(' ').filter(t => /^[^\s()]{1,2}$/.test(t)).length; cnt[n] = (cnt[n] || 0) + 1 - 0.3 * frag + 0.05 * n.length; });
      const ks = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]); if (ks.length) name = ks[0];
    }
    const flags = Array.from(new Set(top.r.flags.filter(f => f !== 'one-time-only' || !(top.r.timeTo))));
    const merged = { ...top.r, name, flags, hours, days: dd.set, section: { theory: vote(r => r.section.theory), practical: vote(r => r.section.practical) }, room, modality: voteStr(r => r.modality, cand.filter(x => x.r.modalityExplicit)) || voteStr(r => r.modality) };
    merged._abbr = abbr; merged._abbrFromPhrase = !!voteStr(r => r.abbrKnown); merged._num = numV;
    const modalityInferred = !!merged.modality && !cand.some(x => x.r.modalityExplicit && x.r.modality === merged.modality);
    /* درجة الثقة بأسبابها */
    const reasons = [];
    const agreeRatio = shareW;
    const valid = merged.timeFrom && merged.timeTo && merged.days.length && merged.hours != null;
    const dayWeak = dd.variants === 0 || (dd.exactVariants === 0) || (dd.exactVariants < Math.ceil(dd.variants / 2));
    if (!valid) reasons.push('بيانات ناقصة (وقت/أيام/ساعات)');
    if (valid && (agreeRatio < 0.5 || marginW < 1)) reasons.push('القراءات مختلفة على الوقت (' + agreeN + '/' + timedN + ')');
    if (valid && dd.variants === 0) reasons.push('ما انقرأت حروف الأيام (استُنتجت من المدة)');
    else if (valid && dayWeak) reasons.push('حروف الأيام غير واضحة (طُبّق أقرب نمط)');
    if (valid && !dd.std) reasons.push('نمط أيام غير معتاد');
    if (flags.includes('one-time-only')) reasons.push('وقت النهاية غير موجود/غير مقروء بالصورة');
    const zeroDur = !!merged.timeFrom && merged.timeFrom === merged.timeTo;
    if (zeroDur) reasons.push('وقت النهاية = وقت البداية (غالباً غلط بالجدول نفسه)');
    if (flags.includes('hours-differ-from-db')) reasons.push('الساعات تختلف عن قاعدة المواد');
    if (modalityInferred) reasons.push('نمط المحاضرة مخمَّن (الكلمة غير مقروءة)');
    if (!merged.modality) reasons.push('نمط المحاضرة غير مقروء');
    else if (merged.modality !== 'online' && !numV) reasons.push('القاعة غير مقروءة');
    const roomMissing = !merged.modality || (merged.modality !== 'online' && !numV);
    const abbrSupport = abbr ? cand.filter(x => x.r.abbrKnown === abbr || x.r.abbrSnap === abbr || alefN(x.r.abbrRead) === alefN(abbr)).length : 0;
    const abbrWeak = !!abbr && !voteStr(r => r.abbrKnown) && !voteStr(r => r.abbrSnap) && abbrSupport < 2;
    if (abbrWeak) reasons.push('اختصار المبنى غير مؤكّد (قراءة واحدة)');
    /* اختصار مقروء من الصورة (اسم المبنى غير معروف) وفيه حرف نقاطه تلتبس (ع/غ، س/ش، ح/ج/خ): نقول ذلك بدل ادّعاء اليقين */
    const abbrConfusable = !!abbr && !voteStr(r => r.abbrKnown) && /[عغسشصضحجخبتثنيفق]/.test(abbr.replace(/\./g, ''));
    if (abbrConfusable && !abbrWeak) reasons.push('اختصار المبنى مقروء من الصورة وفيه حرف قد يلتبس بنقاطه');
    const roomNoAbbr = !!numV && !abbr;
    if (roomNoAbbr) reasons.push('اختصار المبنى غير مقروء (القاعة رقم فقط)');
    if (merged.matchedBy === 'none') reasons.push('المادة غير موجودة بقاعدة المواد (الاسم من الصورة)');
    if (merged.matchedBy === 'name' && merged.nameSim < 0.93) reasons.push('تطابق الاسم تقريبي');
    const hard = !valid || zeroDur || agreeRatio < 0.5 || marginW < 1 || dd.variants === 0 || flags.includes('one-time-only') || flags.includes('hours-differ-from-db');
    const soft = abbrWeak || abbrConfusable || roomMissing || modalityInferred || roomNoAbbr || merged.matchedBy === 'none' || (merged.matchedBy === 'name' && merged.nameSim < 0.93) || agreeRatio < 0.8 || dayWeak || !dd.std;
    merged.confidence = hard ? 'review' : (soft ? 'medium' : 'high');
    merged.reasons = reasons;
    merged.pickedFrom = top.label; merged.agree = agreeN + '/' + timedN;
    out.push(merged);
  });
  /* اختصار مقروء بحرف ملتبس (ع/غ، س/ش) يُوحَّد مع اختصار مبنى ظاهر بصف آخر من نفس الجدول (من اسم المبنى المكتوب)؛ ولا يُصحَّح بلا هذا الدليل */
  const knownAbbrs = Array.from(new Set(out.filter(r => r._abbrFromPhrase && r._abbr).map(r => r._abbr)));
  out.forEach(r => {
    if (r._abbrFromPhrase || !r._abbr || !r._num) return;
    const a = r._abbr.split('.');
    for (const k of knownAbbrs) {
      const kk = k.split('.');
      if (k !== r._abbr && a.length === 2 && kk.length === 2 && [0, 1].every(i => a[i] === kk[i] || (CLS[a[i]] && CLS[a[i]] === CLS[kk[i]]))) {
        r.room = k + ' ' + r._num; r.reasons.push('اختصار المبنى وُحِّد مع صف آخر (' + r._abbr + ' ← ' + k + ')'); if (r.confidence === 'high') r.confidence = 'medium'; break;
      }
    }
  });
  /* صفوف وهمية (رقم ملتقط خطأ): لا مادة ولا وقت => تُحذف */
  return out.filter(r => !(r.matchedBy === 'none' && !r.timeFrom)).sort((a, b) => (a.code < b.code ? -1 : 1));
}
function toApp(rows) {
  const courses = [], timetable = {};
  rows.forEach(r => {
    courses.push({ name: r.name, code: r.dbCode || r.code, hours: r.hours });
    r.days.forEach(d => { timetable[d + '-' + r.timeFrom] = { name: r.name, room: r.room, instructor: '', end: r.timeTo }; });
  });
  return { courses, timetable };
}
/* ---------- نتيجة منظَّمة جاهزة (من نموذج ذكاء اصطناعي كـGemini): تحقق + تطبيع + ثقة ---------- */
const GEMINI_PROMPT = `هذه لقطة شاشة لجدول تسجيل مواد جامعي (عربي، اتجاه من اليمين لليسار). استخرج كل صف مادة كما هو مطبوع بالضبط.
الأعمدة (من اليمين): رقم المادة، اسم المادة، الشعبة النظري، الشعبة العملي، «وقت المحاضرة/رقم القاعة» (نص طويل)، عدد الساعات.
القواعد:
- code: رقم المادة أرقام فقط كما هو مطبوع (9 أو 10 خانات).
- name: اسم المادة كما هو مطبوع.
- theory / practical: رقم الشعبة بالعمودين (null إن كانت الخانة فارغة).
- hours: عدد الساعات.
- days: من حروف الأيام داخل عمود الوقت: ح=Sun، ن=Mon، ث=Tue، ر=Wed، خ=Thu. اكتب فقط الأيام التي طُبعت حروفها فعلاً.
- timeFrom/timeTo: وقت البداية والنهاية بصيغة HH:MM (24 ساعة) من الأرقام المطبوعة مثل 09,30 - 10,30. وقت البداية دائماً أصغر من وقت النهاية. اكتب القيم كما هي مطبوعة. إن كان أحدهما غير موجود اتركه null ولا تخمّن.
- room: اختصار المبنى + رقم القاعة كما هو مطبوع مثل "ح.ب 104" أو "م.غ 203"؛ نص فاضي "" إن كانت المحاضرة عن بعد بلا قاعة.
- modality: وجاهي=inperson، مدمج=blended، عن بعد=online.
لا تخمّن أي قيمة غير مقروءة: ضع null. أعد JSON فقط.`;
const GEMINI_SCHEMA = { type: 'ARRAY', items: { type: 'OBJECT', properties: {
  code: { type: 'STRING' }, name: { type: 'STRING' }, theory: { type: 'INTEGER', nullable: true }, practical: { type: 'INTEGER', nullable: true }, hours: { type: 'INTEGER', nullable: true },
  days: { type: 'ARRAY', items: { type: 'STRING', enum: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] } },
  timeFrom: { type: 'STRING', nullable: true }, timeTo: { type: 'STRING', nullable: true }, room: { type: 'STRING', nullable: true },
  modality: { type: 'STRING', enum: ['inperson', 'blended', 'online'], nullable: true }
}, required: ['code', 'name', 'days'] } };

function normTimeStr(s) {
  const m = /^\s*(\d{1,2})\s*[:,.]\s*(\d{2})\s*$/.exec(fixDigits(s == null ? '' : s));
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return String(+m[1]).padStart(2, '0') + ':' + m[2];
}
const minOf = t => +t.slice(0, 2) * 60 + +t.slice(3);
function fromStructured(list) {
  const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], out = [];
  (list || []).forEach(r => {
    const code = String(r.code == null ? '' : r.code).replace(/\D/g, '');
    if (code.length < 6) return;
    const reasons = [], flags = [];
    let name = String(r.name || '').replace(/\s+/g, ' ').trim();
    let hours = r.hours == null || r.hours === '' || isNaN(+r.hours) ? null : +r.hours;
    const days = ALL_DAYS.filter(d => (r.days || []).indexOf(d) > -1);
    let tf = normTimeStr(r.timeFrom), tt = normTimeStr(r.timeTo);
    if (tf && tt && minOf(tf) > minOf(tt)) { const x = tf; tf = tt; tt = x; flags.push('times-swapped'); }     /* الجملة RTL: النموذج يقرأ الوقتين بعكس ترتيبهما أحياناً */
    let room = String(r.room == null ? '' : r.room).replace(/\s+/g, ' ').trim();
    room = room.replace(/^([^\d\s]+?)\s*(\d{2,4})$/, '$1 $2');                                              /* «م.غ203» -> «م.غ 203» */
    const modality = ['inperson', 'blended', 'online'].indexOf(r.modality) > -1 ? r.modality : '';
    let matchedBy = 'none', sim = null, dbCode = null;
    const byCode = dbByCode(code);
    if (byCode) { matchedBy = 'code'; sim = dice(name, byCode); dbCode = DBX()[byCode].code; name = byCode; }
    else { const bn = dbByName(name); if (bn) { matchedBy = 'name'; sim = bn.sim; dbCode = DBX()[bn.name].code; name = bn.name; flags.push('matched-by-name'); } }
    const dbHours = matchedBy !== 'none' ? DBX()[name].h : null;
    if (hours == null && dbHours != null) { hours = dbHours; flags.push('hours-from-db'); }
    if (dbHours != null && hours != null && dbHours !== hours) { flags.push('hours-differ-from-db'); reasons.push('الساعات تختلف عن قاعدة المواد'); }
    /* الثقة: لا «عالية» إلا إذا تطابقت قراءتان مستقلتان (الرقم المطبوع والاسم) واكتملت الحقول وانسجمت */
    let level = 'high';
    const down = (to, why) => { reasons.push(why); if (to === 'review' || level === 'high') level = to; };
    if (!tf || !tt) down('review', !tf && !tt ? 'الوقت غير مقروء' : 'وقت البداية أو النهاية ناقص');
    else if (tf === tt) down('review', 'وقت النهاية = وقت البداية (غالباً غلط بالجدول نفسه)');
    if (!days.length) down('review', 'الأيام غير مقروءة');
    if (hours == null) down('review', 'الساعات غير مقروءة');
    if (level !== 'review') {
      if (matchedBy === 'none') down('medium', 'المادة غير موجودة بقاعدة المواد (الاسم من الصورة)');
      else if (matchedBy === 'name') down('medium', 'طُوبقت بالاسم لأن الرقم غير موجود بالقاعدة');
      else if (sim != null && sim < 0.85) down('medium', 'الاسم المقروء يختلف عن قاعدة المواد');
      if (days.length && !isStd(days)) down('medium', 'نمط أيام غير معتاد');
      if (tf && (minOf(tf) % 5 !== 0 || minOf(tf) < 360 || minOf(tf) > 1320)) down('medium', 'وقت البداية غير معتاد');
      if (!modality) down('medium', 'نمط المحاضرة غير مقروء');
      else if (modality !== 'online' && !room) down('medium', 'القاعة غير مقروءة');
      if (flags.indexOf('times-swapped') > -1) down('medium', 'الوقتان كانا بترتيب معكوس فصُحّحا');
    }
    out.push({ code, dbCode, name, matchedBy, hours, section: { theory: r.theory == null ? null : +r.theory, practical: r.practical == null ? null : +r.practical }, days, timeFrom: tf, timeTo: tt, room, modality, nameSim: sim == null ? null : +sim.toFixed(2), flags, confidence: level, reasons });
  });
  return out;
}

var api = { fromStructured: fromStructured, GEMINI_PROMPT: GEMINI_PROMPT, GEMINI_SCHEMA: GEMINI_SCHEMA, parseRows: parseRows, ensemble: ensemble, toApp: toApp, score: score, normalizeWords: normalizeWords, nameKey: nameKey, findHeaders: findHeaders, headerCutoff: headerCutoff, setDB: setDB };
if(typeof module === 'object' && module.exports) module.exports = api; else root.OcrParse = api;
})(typeof window !== 'undefined' ? window : this);
