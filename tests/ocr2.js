/* استيراد الجدول من صورة v143: دوال نقية، بوابة الموافقة، سلسلة النماذج، القراءة العامة، عدة صور، لصق، شاشة النتيجة، اختبار المفتاح */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const base = { profile: { name: 'س' }, courses: [], tasks: [], exams: [], attendance: {}, grades: [], timetable: {} };
  const { w, errs } = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(base) }); await sl(2300);
  const d = w.document, Q = s => d.querySelector(s), QA = s => [...d.querySelectorAll(s)], OI = w.OcrImport;
  const toasts = []; w.toast = m => toasts.push(String(m));
  const cleanup = () => QA('.stt-backdrop,.ocri-overlay,input.ocri-file').forEach(e => e.remove());
  const file = (name, size) => new w.File([new Uint8Array(size || 400)], name || 'جدول.png', { type: 'image/png' });
  const upload = async (files) => { const inp = Q('input.ocri-file'); if (!inp) return false; Object.defineProperty(inp, 'files', { value: files, configurable: true }); inp.dispatchEvent(new w.Event('change')); return true; };

  /* ===== دوال نقية ===== */
  o.P_fit = JSON.stringify(OI.fitSize(4800, 2400, 2400)) === JSON.stringify({ w: 2400, h: 1200, scale: 0.5 }) && OI.fitSize(1000, 500, 2400).scale === 1 && OI.fitSize(0, 0, 100).w === 0;
  o.P_digits = OI.normDigits('٠٩:٣٠ و ۱۰:۴۵') === '09:30 و 10:45';
  const R = (name, days, f, t, conf) => ({ name, days, timeFrom: f, timeTo: t, room: '', _ocr: { confidence: conf || 'high', reasons: [] } });
  const merged = OI.mergeRows([R('أ', ['Sun'], '09:00', '10:00', 'review'), R('أ', ['Sun'], '09:00', '10:00', 'high'), R('ب', ['Sun'], '09:00', '10:00')]);
  o.P_merge = merged.length === 2 && merged[0]._ocr.confidence === 'high';
  const vr = [R('أ', ['Sun', 'Tue'], '09:00', '10:30'), R('ب', ['Tue'], '10:00', '11:00'), R('ج', ['Mon'], '05:00', '06:00'), R('د', ['Wed'], '10:00', '10:10'), R('هـ', ['Thu'], '٠٩:٠٠', '١٠:٠٠')];
  const nconf = OI.validateRows(vr);
  o.P_conflict = nconf === 1 && vr[0]._ocr.confidence === 'review' && /تعارض بالوقت مع «ب»/.test(vr[0]._ocr.reasons.join()) && vr[1]._ocr.confidence === 'review';
  o.P_oddHours = vr[2]._ocr.confidence === 'review' && /خارج ساعات/.test(vr[2]._ocr.reasons.join()) && /مدة/.test(vr[3]._ocr.reasons.join());
  o.P_digitsFixed = vr[4].timeFrom === '09:00' && vr[4]._ocr.confidence === 'high';
  o.P_retryable = OI.modelRetryable({ status: 429 }) && OI.modelRetryable({ status: 404 }) && OI.modelRetryable({ message: 'quota exceeded' }) && OI.modelRetryable({ status: 503 }) && !OI.modelRetryable({ status: 400, message: 'API key not valid' });
  o.P_chain = OI.modelChain().length >= 3 && OI.modelChain()[0] === 'gemini-flash-latest' && new Set(OI.modelChain()).size === OI.modelChain().length;
  o.P_explain = /مشغول/.test(OI.explainGemini({ status: 503 })) && /الحد المجاني/.test(OI.explainGemini({ status: 429 })) && /المفتاح غير صالح/.test(OI.explainGemini({ message: 'API key not valid' }));

  /* ===== صفحة الجدول: الزر دايماً ظاهر (بدون مفتاح) + تصوير ===== */
  w.switchTab('timetable'); await sl(400);
  o.B_alwaysShown = !!Q('#fxMain [data-fx="ocr"]') && !!Q('#fxMain [data-fx="ocrcam"]');
  o.B_noDuplicate = QA('#fxMain [data-fx="ocr"]').length === 1;

  /* ===== اختبار المفتاح ===== */
  let gcalls = [], plan = [];
  const rowsA = [
    { code: '110108101', name: 'تفاضل وتكامل (1)', theory: 1, practical: 0, hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '09:30', timeTo: '10:30', room: 'ح.ب 104', modality: 'inperson' },
    { code: '110108102', name: 'تفاضل وتكامل (2)', theory: 1, practical: 0, hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '10:00', timeTo: '11:00', room: 'ح.ب 104', modality: 'inperson' }   /* يتعارض مع الأول */
  ];
  const okResp = list => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(list) }] } }] }) });
  const errResp = (status, message) => ({ ok: false, status, json: async () => ({ error: { message } }) });
  w.fetch = async (url, opts) => {
    const body = opts && opts.body ? String(opts.body) : '';
    gcalls.push({ url: String(url), model: (/models\/([^:]+):/.exec(String(url)) || [])[1], generic: /جدول محاضرات \(جامعي/.test(body), hasImage: /inline_data/.test(body) });
    const step = plan.shift(); return step ? step(gcalls[gcalls.length - 1]) : okResp(rowsA);
  };
  plan = [() => okResp([])];
  const kt = await OI.testKey('AQ.FAKEFAKEFAKEFAKEFAKEFAKEFAKE1234', 'gemini-flash-latest');
  o.K_ok = kt.ok === true && /شغّال/.test(kt.message) && gcalls.length === 1 && !gcalls[0].hasImage;
  plan = [() => errResp(400, 'API key not valid. Please pass a valid API key.')];
  const kb = await OI.testKey('AQ.BADBADBADBADBADBADBADBADBAD1234', ''); o.K_bad = kb.ok === false && /المفتاح غير صالح/.test(kb.message);
  OI.openSettings({ intro: true }); await sl(40);
  o.K_dialog = !!Q('.ocri-intro') && !!Q('.ocri-test') && !!Q('.ocri-testres');
  cleanup();

  /* ===== بوابة الموافقة ===== */
  w.localStorage.setItem('ocr_gemini', 'AQ.FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE1234'); w.localStorage.removeItem('ocr_consent'); gcalls = []; plan = [];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(50);
  o.C_asks = /قبل ما نحلّل صورتك/.test(Q('.ocri-box').textContent) && !Q('input.ocri-file') && gcalls.length === 0;
  Q('.ocri-box .ocri-btn:not(.ghost)').click(); await sl(50);
  o.C_thenPicks = w.localStorage.getItem('ocr_consent') === '1' && !!Q('input.ocri-file') && Q('input.ocri-file').multiple === true;
  cleanup();
  Q('#fxMain [data-fx="ocrcam"]').click(); await sl(30); o.C_cameraInput = !!Q('input.ocri-file') && Q('input.ocri-file').getAttribute('capture') === 'environment'; cleanup();

  /* ===== شاشة النتيجة + تحذير التعارض ===== */
  gcalls = []; plan = [];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(30); await upload([file()]); await sl(300);
  o.R_dialog = !!Q('.ocri-result') && QA('.ocri-rs').length === 2 && /قرأت 2 مادة/.test(Q('.ocri-result').textContent) && /تعارض بالوقت/.test(Q('.ocri-result').textContent);
  o.R_reviewRows = QA('.ocri-rs.review').length === 2;
  o.R_oneCall = gcalls.length === 1 && gcalls[0].model === 'gemini-flash-latest' && !gcalls[0].generic;
  let opened = null; w.openSmartTimetable = rows => { opened = rows; };
  Q('.ocri-result .ocri-btn:not(.ghost)').click(); await sl(50);
  o.R_opensEditor = !!opened && opened.length === 2 && !Q('.ocri-result');
  cleanup();

  /* ===== سلسلة النماذج ===== */
  gcalls = []; plan = [() => errResp(429, 'Quota exceeded for metric'), () => okResp(rowsA)];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(30); await upload([file()]); await sl(400);
  o.F_fallsToNext = gcalls.length === 2 && gcalls[0].model === 'gemini-flash-latest' && gcalls[1].model === 'gemini-3.5-flash' && !!Q('.ocri-result');
  cleanup();
  gcalls = []; plan = [() => errResp(429, 'Quota exceeded'), () => errResp(429, 'Quota exceeded'), () => errResp(429, 'Quota exceeded')];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(30); await upload([file()]); await sl(400);
  o.F_allExhausted = gcalls.length === 3 && /الحد المجاني/.test(Q('.ocri-box').textContent) && /3 نماذج/.test(Q('.ocri-box').textContent);
  cleanup();
  gcalls = []; plan = [() => errResp(400, 'API key not valid. Please pass a valid API key.')];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(30); await upload([file()]); await sl(300);
  o.F_badKeyNoFallback = gcalls.length === 1 && /المفتاح غير صالح/.test(Q('.ocri-box').textContent);
  cleanup();

  /* ===== قراءة عامة عند صورة ما هي جدول تسجيل ===== */
  gcalls = []; plan = [() => okResp([]), () => okResp(rowsA)];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(30); await upload([file()]); await sl(400);
  o.G_genericRetry = gcalls.length === 2 && gcalls[0].generic === false && gcalls[1].generic === true && !!Q('.ocri-result') && /قراءة عامة/.test(Q('.ocri-result').textContent);
  cleanup();

  /* ===== عدة صور: دمج + إزالة المكرر ===== */
  gcalls = []; plan = [];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(30); await upload([file('1.png'), file('2.png')]); await sl(500);
  o.M_twoCalls = gcalls.length === 2;
  o.M_dedupe = QA('.ocri-rs').length === 2 && /2 صور/.test(Q('.ocri-result').textContent);   /* نفس الجدول بصورتين = مواده مرة وحدة */
  cleanup();
  gcalls = [];
  Q('#fxMain [data-fx="ocr"]').click(); await sl(30); await upload([new w.File([new Uint8Array(10)], 'x.pdf', { type: 'application/pdf' })]); await sl(100);
  o.M_badTypeRejected = gcalls.length === 0 && toasts.some(m => /PNG أو JPG أو WebP/.test(m)) && !Q('.ocri-result'); cleanup();

  /* ===== لصق صورة (Ctrl+V) على صفحة الجدول ===== */
  gcalls = []; plan = [];
  const ev = new w.Event('paste', { bubbles: true, cancelable: true }); Object.defineProperty(ev, 'clipboardData', { value: { files: [file('paste.png')] } });
  d.dispatchEvent(ev); await sl(400);
  o.V_pasteRuns = gcalls.length === 1 && !!Q('.ocri-result') && ev.defaultPrevented === true;
  cleanup();
  w.switchTab('tasks'); await sl(100); gcalls = [];
  const ev2 = new w.Event('paste', { bubbles: true, cancelable: true }); Object.defineProperty(ev2, 'clipboardData', { value: { files: [file('x.png')] } });
  d.dispatchEvent(ev2); await sl(200); o.V_ignoredElsewhere = gcalls.length === 0 && !ev2.defaultPrevented;

  /* ===== سلامة: لا كتابة بالجدول قبل «حفظ الكل» ===== */
  o.D_noTimetableWrites = Object.keys(w.space.timetable || {}).length === 0;
  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
