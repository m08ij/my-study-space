/* استيراد الجدول من صورة (ocr-import.js + نافذة «إضافة جدول»): خدمة التحليل مُحاكاة (بدون شبكة)؛ الإضافة اليدوية لا تتأثر */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
const base = { profile: { name: 'س' }, courses: [], tasks: [], exams: [], attendance: {}, grades: [], timetable: {} };
const SVC = [
  { code: '110108101', name: 'تفاضل وتكامل (1)', matchedBy: 'code', hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '09:30', timeTo: '10:30', room: 'ح.ب 104', modality: 'blended', confidence: 'high', reasons: [] },
  { code: '110108102', name: 'تفاضل وتكامل (2)', matchedBy: 'name', hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '10:30', timeTo: '11:30', room: 'ح.ب 104', modality: 'blended', confidence: 'medium', reasons: ['تطابق الاسم تقريبي'] },
  { code: '221602105', name: 'اللغة العربية للاتصال', matchedBy: 'none', hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '17:30', timeTo: null, room: '', modality: 'online', confidence: 'review', reasons: ['وقت النهاية غير موجود/غير مقروء بالصورة'] },
  { code: '130108103', name: 'رياضيات هندسية (1)', matchedBy: 'none', hours: 3, days: ['Tue', 'Thu'], timeFrom: '09:00', timeTo: '09:00', room: 'ج.ب 302', modality: 'blended', confidence: 'review', reasons: ['وقت النهاية = وقت البداية'] }
];
(async () => {
  const { w, errs } = boot({ ss_n8n_base: 'off', welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(base) }); await sl(2300);
  const d = w.document, o = {}, Q = s => d.querySelector(s), QA = s => [...d.querySelectorAll(s)];
  const toasts = []; w.toast = m => toasts.push(String(m));
  const calls = []; let mode = 'ok';
  w.fetch = async (url, opts) => {
    calls.push({ url, method: opts && opts.method, type: opts && opts.headers && opts.headers['Content-Type'], size: opts && opts.body && opts.body.size });
    if (mode === 'down') throw new Error('Failed to fetch');
    if (mode === 'empty') return { ok: true, json: async () => ({ rows: [], seconds: 3 }) };
    if (mode === 'xss') return { ok: true, json: async () => ({ rows: [{ ...SVC[2], name: '<img src=x onerror=window.__pwned=1>مادة', reasons: ['<b onmouseover=window.__pwned=1>x</b>'] }], seconds: 1 }) };
    return { ok: true, json: async () => ({ rows: SVC, seconds: 12 }) };
  };
  const upload = async (type, size) => {
    const inp = Q('input.ocri-file'); if (!inp) return false;
    Object.defineProperty(inp, 'files', { value: [new w.File([new Uint8Array(size || 300)], 'جدول.png', { type: type || 'image/png' })] });
    inp.dispatchEvent(new w.Event('change')); return true;
  };
  const closeModal = () => { const c = Q('.stt-close'); if (c) c.click(); document_cleanup(); };
  const document_cleanup = () => { QA('.stt-backdrop,.ocri-overlay').forEach(e => e.remove()); };

  /* ===== التفعيل: localhost أو ?ocr=1 فقط ===== */
  o.A_enabledOnLocalhost = w.OcrImport.enabled() === true;
  o.A_enabledFor = w.OcrImport.enabledFor('localhost', false) && w.OcrImport.enabledFor('127.0.0.1', false) && !w.OcrImport.enabledFor('m08ij.github.io', false) && w.OcrImport.enabledFor('m08ij.github.io', true);
  o.A_defaultEndpoint = w.OcrImport.endpoint() === 'http://127.0.0.1:8780/ocr';

  /* ===== الإضافة اليدوية تبقى شغّالة + زر الصورة ظاهر ===== */
  w.openSmartTimetable([{ code: '', name: 'مادة يدوية', matched: null, days: ['Mon'], timeFrom: '13:00', timeTo: '14:00', room: '201' }, { code: '', name: '', matched: null, days: [], timeFrom: '', timeTo: '', room: '' }]);
  await sl(200);
  o.B_modalHasOcrBtn = !!Q('.stt-header .stt-ocr-btn');
  o.B_manualRowBefore = QA('.stt-row').length === 2 && QA('.stt-name')[0].value === 'مادة يدوية';
  o.B_noCallsYet = calls.length === 0;                                   /* لا شبكة قبل أن يطلب المستخدم */

  /* ===== رفع صورة: تعبئة النافذة ===== */
  Q('.stt-ocr-btn').click(); await sl(30);
  o.C_inputCreated = !!Q('input.ocri-file') && Q('input.ocri-file').accept === 'image/png,image/jpeg,image/webp';
  await upload('image/png', 500); await sl(250);
  o.C_postedOnce = calls.length === 1 && calls[0].method === 'POST' && calls[0].url === 'http://127.0.0.1:8780/ocr' && calls[0].type === 'image/png' && calls[0].size === 500;
  const rows = QA('.stt-row');
  o.C_rowsCount = rows.length === 5;                                      /* 1 يدوي + 4 من الصورة (الفارغ استُبدل) */
  o.C_manualKept = QA('.stt-name')[0].value === 'مادة يدوية' && QA('.stt-room-input')[0].value === '201' && rows[0].querySelector('.stt-day.active').dataset.day === 'Mon';
  const r1 = rows[1], r2 = rows[2], r3 = rows[3], r4 = rows[4];
  o.C_r1Canonical = r1.querySelector('.stt-code').value === '0110108101' && r1.querySelector('.stt-name').value === 'تفاضل وتكامل (1)' && r1.classList.contains('matched');
  o.C_r1Fields = [...r1.querySelectorAll('.stt-day.active')].map(b => b.dataset.day).join() === 'Sun,Tue,Thu' && r1.querySelector('[data-field="timeFrom"]').value === '09:30' && r1.querySelector('[data-field="timeTo"]').value === '10:30' && r1.querySelector('.stt-room-input').value === 'ح.ب 104';
  o.C_r2ByName = r2.querySelector('.stt-code').value === '0110101102' && r2.querySelector('.stt-name').value === 'تفاضل وتكامل (2)' && r2.classList.contains('ocr-medium');
  o.C_r3MissingEnd = r3.querySelector('[data-field="timeTo"]').value === '' && r3.classList.contains('ocr-review') && !r3.classList.contains('ready') && r3.querySelector('.stt-room-input').value === 'عن بعد';
  o.C_r4ZeroDuration = r4.querySelector('[data-field="timeTo"]').value === '' && r4.classList.contains('ocr-review') && /وقت النهاية/.test(r4.querySelector('.stt-ocr-note').textContent);
  o.C_highHasNoWarning = r1.classList.contains('ocr-high') && !/⚠|تأكّد/.test(r1.querySelector('.stt-ocr-note').textContent);
  o.C_summaryToast = toasts.some(m => /قرأت 4 مادة/.test(m) && /2 تحتاج مراجعة/.test(m));
  o.C_overlayClosed = !Q('.ocri-overlay');
  o.C_statsUpdated = Q('[data-stat="rows"]').textContent === '3' && /3/.test(Q('[data-action="save"]').textContent);   /* اليدوي + r1 + r2 جاهزة */

  /* ===== معاينة ثم حفظ: الجاهز فقط يُحفظ، والناقص يُبلَّغ عنه ===== */
  Q('[data-action="preview"]').click(); await sl(80);
  o.D_previewShown = !!Q('.stt-preview.show, .stt-preview[style*="flex"], .stt-preview.open') || /تفاضل وتكامل/.test(Q('.stt-preview').textContent);
  const back = Q('[data-preview="close"]'); if (back) back.click();
  Q('[data-action="save"]').click(); await sl(300);
  const tt = w.space.timetable;
  o.D_savedReady = !!tt['Sun-09:30'] && tt['Sun-09:30'].name === 'تفاضل وتكامل (1)' && tt['Sun-09:30'].room === 'ح.ب 104' && tt['Sun-09:30'].end === '10:30' && !!tt['Sun-10:30'] && !!tt['Mon-13:00'];
  o.D_incompleteNotSaved = !tt['Sun-17:30'] && !tt['Tue-09:00'];
  o.D_coursesCreated = w.space.courses.some(c => c.name === 'تفاضل وتكامل (1)') && w.space.courses.some(c => c.name === 'مادة يدوية');
  o.D_resultMentionsIncomplete = /ناقص|ناقصة|incomplete|2/.test((Q('.stt-result-backdrop') || { textContent: '' }).textContent);
  document_cleanup();

  /* ===== فشل الخدمة: رسالة واضحة، والصفوف اليدوية ما تتأثر ===== */
  mode = 'down'; w.space.timetable = {};
  w.openSmartTimetable([{ code: '', name: 'يدوي ثاني', matched: null, days: ['Wed'], timeFrom: '10:00', timeTo: '11:00', room: '' }]); await sl(150);
  Q('.stt-ocr-btn').click(); await upload('image/png'); await sl(200);
  o.E_downShowsHelp = !!Q('.ocri-overlay') && /مش شغّالة/.test(Q('.ocri-overlay').textContent) && Q('.ocri-cmd').textContent === 'node tools/ocr-lab/server.js';
  Q('.ocri-btn:not(.ghost)').click();
  o.E_dialogCloses = !Q('.ocri-overlay');
  o.E_manualUntouched = QA('.stt-row').length === 1 && QA('.stt-name')[0].value === 'يدوي ثاني';

  /* ===== إلغاء أثناء التحليل: لا رسالة خطأ ولا تعبئة ===== */
  mode = 'slow'; const origFetch = w.fetch;
  w.fetch = (url, opts) => new Promise((res, rej) => { if (opts && opts.signal) opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
  const rowsBefore = QA('.stt-row').length;
  Q('.stt-ocr-btn').click(); await upload('image/png'); await sl(60);
  o.J_busyShown = !!Q('.ocri-overlay') && /جاري تحليل/.test(Q('.ocri-overlay').textContent);
  Q('.ocri-btn:not(.ghost)').click(); await sl(120);
  o.J_cancelSilent = !Q('.ocri-overlay') && QA('.stt-row').length === rowsBefore;
  w.fetch = origFetch; mode = 'empty';

  /* ===== ردّ فاضي، وملف غير صورة، وصورة كبيرة ===== */
  mode = 'empty'; Q('.stt-ocr-btn').click(); await upload('image/png'); await sl(150);
  o.F_emptyMessage = /ما قدرت أقرأ/.test((Q('.ocri-overlay') || { textContent: '' }).textContent); if (Q('.ocri-btn')) Q('.ocri-btn:not(.ghost)').click();
  const before = calls.length; toasts.length = 0;
  Q('.stt-ocr-btn').click(); await upload('text/plain'); await sl(60);
  o.F_nonImageRejected = calls.length === before && toasts.some(m => /PNG أو JPG/.test(m));
  Q('.stt-ocr-btn').click(); await upload('image/png', 13 * 1024 * 1024); await sl(60);
  o.F_bigRejected = calls.length === before && toasts.some(m => /كبيرة/.test(m));

  /* ===== نص خبيث جاي من الـOCR لا يتحوّل HTML ===== */
  mode = 'xss'; Q('.stt-ocr-btn').click(); await upload('image/png'); await sl(200);
  o.G_noInjectedHtml = !Q('.stt-ocr-note img') && !Q('.stt-ocr-note b') && !w.__pwned && QA('.stt-name').some(i => /<img/.test(i.value));
  document_cleanup();

  /* ===== من صفحة الجدول: اختر صورة ← تفتح النافذة معبّأة ===== */
  mode = 'ok'; w.switchTab('timetable'); await sl(400);
  const ob = Q('#fxMain [data-fx="ocr"]'); o.H_pageButton = !!ob;
  if (ob) { ob.click(); await sl(30); await upload('image/png'); await sl(250); o.H_resultDialog = !!Q('.ocri-result') && QA('.ocri-rs').length === 4 && /قرأت 4 مادة/.test(Q('.ocri-result').textContent); const go = Q('.ocri-result .ocri-btn:not(.ghost)'); if (go) go.click(); await sl(150); }
  o.H_opensFilled = !!Q('.stt-modal') && QA('.stt-row').length >= 4 && QA('.stt-name').some(i => i.value === 'تفاضل وتكامل (1)');
  o.H_manualButtonStillThere = !!Q('#fxMain [data-fx="addclass"]');
  document_cleanup();

  /* ===== مفتاح الإعدادات: يفعّل/يطفئ على موقع منشور (غير localhost)، والزر يظهر ويختفي لحظياً ===== */
  const sw = Q('#ocrLabBtn'); o.K_switchExists = !!sw && sw.getAttribute('role') === 'switch';
  o.K_localhostAlwaysOn = /localhost/.test(sw.querySelector('.ol-t').textContent);
  const realHost = w.OcrImport.enabledFor; 
  w.switchTab('timetable'); await sl(300);
  w.localStorage.removeItem('ocr_lab'); const wasHere = !!Q('#fxMain [data-fx="ocr"]');
  o.K_toggleOnLocalhostIsNoop = (w.OcrImport.toggle(), w.localStorage.getItem('ocr_lab') === null) && wasHere;
  /* محاكاة موقع منشور: enabled تعتمد على الاسم والمفتاح؛ نختبر المنطق مباشرة */
  o.K_pubOff = !realHost('m08ij.github.io', false); o.K_pubOn = realHost('m08ij.github.io', true);
  document_cleanup();

  /* ===== محرّك Gemini: JSON منظّم من الصورة -> تحقق ocr-parse -> نفس الصفوف ===== */
  const gj = [
    { code: '110108101', name: 'تفاضل وتكامل (1)', theory: 1, practical: 0, hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '09:30', timeTo: '10:30', room: 'ح.ب 104', modality: 'blended' },
    { code: '1701081136', name: 'فيزياء عامة (1)', theory: 4, practical: 0, hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '11:30', timeTo: '10:30', room: 'ح.ب105', modality: 'inperson' },
    { code: '221602105', name: 'اللغة العربية للاتصال', theory: 0, practical: 7, hours: 3, days: ['Sun', 'Tue', 'Thu'], timeFrom: '17:30', timeTo: null, room: '', modality: 'online' }
  ];
  const gresp = { candidates: [{ content: { parts: [{ text: JSON.stringify(gj) }] } }] };
  let gcalls = [];
  w.fetch = async (url, opts) => { gcalls.push({ url: String(url), method: opts && opts.method, headers: opts && opts.headers, body: opts && opts.body }); return { ok: true, status: 200, json: async () => gresp }; };
  w.localStorage.setItem('ocr_gemini', 'AQ.FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE1234'); w.localStorage.setItem('ocr_consent', '1');
  o.L_engineGemini = w.OcrImport.engine() === 'gemini' && w.OcrImport.enabled();
  w.openSmartTimetable(); await sl(150);
  Q('.stt-ocr-btn').click(); await upload('image/png', 800); await sl(300);
  o.L_calledGemini = gcalls.length === 1 && gcalls[0].url === 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent' && gcalls[0].method === 'POST';
  o.L_keyInHeaderNotUrl = gcalls[0].headers['x-goog-api-key'] === 'AQ.FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE1234' && gcalls[0].url.indexOf('FAKE') === -1;
  const gb = JSON.parse(gcalls[0].body);
  o.L_requestShape = gb.contents[0].parts[0].text.indexOf('رقم المادة') > -1 && gb.contents[0].parts[1].inline_data.mime_type === 'image/png' && gb.contents[0].parts[1].inline_data.data.length > 100 && gb.generationConfig.responseMimeType === 'application/json' && gb.generationConfig.responseSchema.type === 'ARRAY' && gb.generationConfig.temperature === 0;
  o.L_notLocalEndpoint = !gcalls.some(c => c.url.indexOf('127.0.0.1') > -1);
  const byCode = c => QA('.stt-row').find(r => r.querySelector('.stt-code').value === c);
  const g1 = byCode('0110108101'), g2 = byCode('0110102101'), g3 = byCode('221602105');
  o.L_row1High = !!g1 && g1.classList.contains('ocr-high') && [...g1.querySelectorAll('.stt-day.active')].map(b => b.dataset.day).join() === 'Sun,Tue,Thu' && g1.querySelector('[data-field="timeFrom"]').value === '09:30' && g1.querySelector('[data-field="timeTo"]').value === '10:30' && g1.querySelector('.stt-room-input').value === 'ح.ب 104';
  o.L_row2SwapAndRoomFixed = !!g2 && g2.querySelector('[data-field="timeFrom"]').value === '10:30' && g2.querySelector('[data-field="timeTo"]').value === '11:30' && g2.querySelector('.stt-room-input').value === 'ح.ب 105' && g2.classList.contains('ocr-medium') && /معكوس/.test(g2.querySelector('.stt-ocr-note').textContent);
  o.L_row3MissingEndReview = !!g3 && g3.classList.contains('ocr-review') && g3.querySelector('[data-field="timeTo"]').value === '' && g3.querySelector('.stt-room-input').value === 'عن بعد';
  /* أخطاء Gemini بصياغة واضحة */
  const errResp = (status, msg) => async () => ({ ok: false, status, json: async () => ({ error: { code: status, message: msg } }) });
  const tryErr = async (fn) => { w.fetch = fn; Q('.stt-ocr-btn').click(); await upload('image/png'); await sl(200); const t = (Q('.ocri-overlay') || { textContent: '' }).textContent; const ghost = !!Q('.ocri-actions .ocri-btn.ghost'); const ok = Q('.ocri-btn:not(.ghost)'); if (ok) ok.click(); return { t, ghost }; };
  let e1 = await tryErr(errResp(429, 'You exceeded your current quota, RESOURCE_EXHAUSTED'));
  o.M_quotaHint = /Gemini رفض الطلب/.test(e1.t) && /انتهى الحد المجاني/.test(e1.t) && e1.ghost;
  let e2 = await tryErr(errResp(400, 'API key not valid. Please pass a valid API key.'));
  o.M_badKeyHint = /غير صالح/.test(e2.t);
  let e3 = await tryErr(errResp(404, 'This model models/x is no longer available to new users.'));
  o.M_modelHint = /النموذج غير متاح/.test(e3.t);
  let e4 = await tryErr(async () => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) }));
  o.M_emptyReply = /ما رجّع نتيجة/.test(e4.t);
  let e5 = await tryErr(async () => { throw new Error('Failed to fetch'); });
  o.M_offline = /تعذّر الاتصال بـGemini/.test(e5.t);
  /* 503 (Google مشغول): يعيد مرتين على كل نموذج من الثلاثة ثم يعرض رسالة ضغط مؤقت؛ ولو نجحت المحاولة الثانية يكمل */
  w.OcrImport._setRetryMs(5);
  let n503 = 0; let e6 = await tryErr(async () => { n503++; return { ok: false, status: 503, json: async () => ({ error: { code: 503, message: 'This model is currently experiencing high demand.' } }) }; });
  o.M_overloadRetriesThenHint = n503 === 9 && /Google مشغول/.test(e6.t) && !/راجع إعدادات المفتاح/.test(e6.t);
  let n2 = 0; w.fetch = async () => { n2++; return n2 === 1 ? { ok: false, status: 503, json: async () => ({ error: { message: 'high demand' } }) } : { ok: true, status: 200, json: async () => gresp }; };
  Q('.stt-ocr-btn').click(); await upload('image/png'); await sl(300);
  o.M_overloadRecovers = n2 === 2 && QA('.stt-row').some(r => r.querySelector('.stt-code').value === '0110108101');
  w.OcrImport._setRetryMs(5000);
  /* حوار الإعدادات: المفتاح بنقطة مقبول، شكل خاطئ مرفوض، والنموذج اختياري */
  w.OcrImport.openSettings(); await sl(40);
  o.N_dialogOpen = !!Q('#ocriKey') && Q('#ocriKey').value.indexOf('AQ.') === 0 && !!Q('#ocriModel') && Q('#ocriEnable').checked;
  Q('#ocriKey').value = 'bad key!'; Q('.ocri-actions .ocri-btn:not(.ghost)').click(); await sl(30);
  o.N_badKeyRejected = !!Q('#ocriKey') && w.localStorage.getItem('ocr_gemini').indexOf('AQ.') === 0;
  Q('#ocriKey').value = 'AQ.' + 'FAKE-test-key-not-real-'.repeat(2); Q('#ocriModel').value = 'bad model!'; Q('.ocri-actions .ocri-btn:not(.ghost)').click(); await sl(30);
  o.N_badModelRejected = !!Q('#ocriModel');
  Q('#ocriModel').value = 'gemini-3.5-flash'; Q('.ocri-actions .ocri-btn:not(.ghost)').click(); await sl(30);
  o.N_savedWithModel = !Q('#ocriKey') && w.localStorage.getItem('ocr_gemini').length > 20 && w.localStorage.getItem('ocr_gmodel') === 'gemini-3.5-flash';
  w.fetch = async (url) => { gcalls.push({ url: String(url) }); return { ok: true, status: 200, json: async () => gresp }; };
  gcalls = []; Q('.stt-ocr-btn').click(); await upload('image/png'); await sl(250);
  o.N_modelUsed = gcalls.length === 1 && gcalls[0].url.indexOf('/models/gemini-3.5-flash:generateContent') > -1;
  /* ترك المفتاح فاضياً = رجوع للخدمة المحلية */
  w.OcrImport.openSettings(); await sl(40); Q('#ocriKey').value = ''; Q('#ocriModel').value = ''; Q('#ocriEp').value = 'https://abc.ngrok-free.app/ocr?k=0123456789abcdef0123456789abcdef'; Q('.ocri-actions .ocri-btn:not(.ghost)').click(); await sl(30);
  o.N_clearsKeyBackToLocal = w.localStorage.getItem('ocr_gemini') === null && w.localStorage.getItem('ocr_gmodel') === null && w.OcrImport.engine() === 'local' && /ngrok-free/.test(w.OcrImport.endpoint());
  w.localStorage.removeItem('ocr_endpoint'); w.localStorage.removeItem('ocr_gemini'); w.localStorage.removeItem('ocr_gmodel'); document_cleanup();

  /* ===== بدون التفعيل: لا زر ولا أثر (موقع منشور بلا ?ocr=1) ===== */
  const realEnabled = w.OcrImport.enabled; w.OcrImport.enabled = () => false;
  w.openSmartTimetable(); await sl(120);
  o.I_alwaysVisible = !!Q('.stt-ocr-btn') && QA('.stt-row').length >= 4;   /* 143: الزر دايماً ظاهر (بدون مفتاح بيفتح الإعداد) */
  w.OcrImport.enabled = realEnabled; document_cleanup();

  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
