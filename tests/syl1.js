/* خطة المادة + ربط الكتاب: الدوال النقية (Node) ثم الواجهة (jsdom) مع Gemini مُحاكى — بدون شبكة وبدون مفتاح */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const S = require('../js/syllabus.js');
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));

/* بناء docx صغير حقيقي (zip بضغط deflate) لاختبار فكّ الضغط */
function crc32(buf){ let c, crc = 0xFFFFFFFF; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function makeZip(name, content){
  const data = Buffer.from(content, 'utf8'), comp = zlib.deflateRawSync(data), nm = Buffer.from(name), crc = crc32(data);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(nm.length, 28); cd.writeUInt32LE(0, 42);
  const off = lh.length + nm.length + comp.length, cdSize = cd.length + nm.length;
  const eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(1, 8); eo.writeUInt16LE(1, 10); eo.writeUInt32LE(cdSize, 12); eo.writeUInt32LE(off, 16);
  return Buffer.concat([lh, nm, comp, cd, nm, eo]);
}

(async () => {
  const o = {};
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'stewart7-sample.json'), 'utf8'));

  /* ===== الدوال النقية ===== */
  const xml = '<w:document><w:body><w:p><w:r><w:t>Course Syllabus</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Week</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Topics &amp; Limits</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
  const zip = makeZip('word/document.xml', xml);
  const txt = await S.docxToText(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.length));
  o.D_docxReadsZip = /Course Syllabus/.test(txt) && /Week\s*\|\s*\n?.*Topics & Limits/.test(txt.replace(/\n/g, ' ')) ;
  let bad = null; try { await S.docxToText(Buffer.from('not a zip at all').buffer); } catch (e) { bad = e; }
  o.D_badZipRejected = !!bad;

  const dirty = { courseName: '  Calculus (1)  ', courseCode: '101101', creditHours: '3', instructor: 'Ala\'a', email: 'not-an-email', attendance: { maxAbsencePercent: '15%', rule: 'x' },
    grading: [{ item: 'Midterm', weight: 30 }, { item: 'Final', weight: '50' }, { item: '', weight: 5 }],
    weeks: [{ from: 4, to: 5, topics: [{ title: 'Limit Laws', section: '2.3' }, { title: 'Continuity', section: 'Sec. 2.5' }] }, { from: '1', topics: ['Functions', { title: '', section: '1.1' }, { title: 'Catalog', section: '١.٢' }] }, { from: 'x', topics: [{ title: 'bad' }] }, { from: 3, topics: [] }] };
  const n = S.normalize(dirty), p = n.plan;
  o.N_basic = p.courseName === 'Calculus (1)' && p.creditHours === 3 && p.email === '' && p.attendance.maxAbsencePercent === 15;
  o.N_weeksSortedAndClean = p.weeks.length === 2 && p.weeks[0].from === 1 && p.weeks[0].to === 1 && p.weeks[0].topics.length === 2 && p.weeks[1].to === 5;
  o.N_sections = p.weeks[1].topics[1].section === '2.5' && p.weeks[0].topics[1].section === '1.2' && p.weeks[0].topics[0].section === '';
  o.N_gradingFiltered = p.grading.length === 2 && p.grading[1].weight === 50;
  o.N_warnsWeights = n.warnings.some(w => /مجموع أوزان التقييم 80/.test(w));
  o.N_warnsMissing = S.normalize({}).warnings.length === 2 && S.normalize(null).plan.weeks.length === 0;
  const huge = S.normalize({ weeks: [{ from: 1, topics: [{ title: 'x'.repeat(5000) }] }], objectives: 'y'.repeat(9000) }).plan;
  o.N_limitsLength = huge.weeks[0].topics[0].title.length <= 160 && huge.objectives.length <= 500;

  /* فهرس كتاب Stewart الحقيقي (عيّنة من محتوياته) */
  const toc = S.parseToc(fx.toc);
  const sec = k => toc.find(e => e.sec === k);
  o.T_parsedMany = toc.length > 40;
  o.T_known = sec('1.1') && sec('1.1').page === 10 && /Four Ways/.test(sec('1.1').title) && sec('2.3') && sec('2.5') && sec('3.1') && sec('3.1').page === 174;
  o.T_sortedByPage = toc.every((e, i) => i === 0 || toc[i - 1].page <= e.page);
  o.T_noAppliedProjectNoise = !toc.some(e => /Applied Project|Roller Coaster/.test(e.title));
  o.T_inlineFormat = S.parseToc('1.1 Four Ways to Represent a Function ........ 10\n1.2   Math Models   22').map(e => e.sec + ':' + e.page).join() === '1.1:10,1.2:22';
  const rng = S.sectionRanges(toc, 500);
  o.T_ranges = rng['1.1'][0] === 10 && rng['1.1'][1] === sec('1.2').page - 1 && rng['2.3'][1] >= rng['2.3'][0];
  const pages = Object.keys(fx.body).map(k => ({ index: parseInt(k, 10), text: fx.body[k] }));
  const off = S.detectOffset(pages);
  o.O_detects = !!off && off.offset === 26 && off.votes >= 3;                     /* مقاس من الكتاب: صفحة PDF 61 = مطبوعة 35 */
  o.O_needsVotes = S.detectOffset([{ index: 40, text: '14\nxx' }]) === null;
  o.O_printedForms = S.printedOf('36\nCHAPTER 1') === 36 && S.printedOf('SECTION 1.2\nMATHEMATICAL MODELS: A CATALOG OF ESSENTIAL FUNCTIONS    35') === 35 && S.printedOf('Thus we solve a problem 7.\nmore') === null;

  /* صيغة pdf.js: كل شي بسطر واحد وفراغات مفردة — يجب أن تعطي نفس النتائج */
  const flat = x => x.replace(/s+/g, ' ');
  const tocFlat = S.parseToc(flat(fx.toc));
  o.F_flatTocSame = tocFlat.length === toc.length && tocFlat.every((e, i) => e.sec === toc[i].sec && e.page === toc[i].page);
  const flatPages = Object.keys(fx.body).map(k => ({ index: parseInt(k, 10), text: flat(fx.body[k]) }));
  o.F_flatOffset = (S.detectOffset(flatPages) || {}).offset === 26;
  o.F_headerForms = S.printedOf('36 CHAPTER 1 FUNCTIONS AND MODELS In this section') === 36 && S.printedOf('10 ¤ CHAPTER 1 FUNCTIONS AND MODELS Example 2') === 10 && S.printedOf('SECTION 1.1 FOUR WAYS TO REPRESENT A FUNCTION ¤ 13 [ i ( d )] 2') === 13 && S.printedOf('SECTION 1.2 MATHEMATICAL MODELS: A CATALOG OF ESSENTIAL FUNCTIONS 35 Find the') === 35 && S.printedOf('CHAPTER 1 FUNCTIONS AND MODELS In this') === null && S.printedOf('A PREVIEW OF CALCULUS 5 Thus, when we solve') === 5;
  /* إزاحة من عناوين الأقسام: صفحات بدايات الأقسام (مع ترويسات جارية لاحقة) */
  const synth = []; toc.slice(0, 14).forEach(e => { const idx = e.page + 26; synth.push({ index: idx, text: e.sec + ' ' + e.title.toUpperCase() + ' In this section we...' }); synth.push({ index: idx + 1, text: 'SECTION ' + e.sec + ' ' + e.title.toUpperCase() + ' ¤ ' + (e.page + 1) + ' text' }); });
  const byT = S.detectOffsetByTitles(synth, toc, 12);
  o.F_titleOffset = !!byT && byT.offset === 26 && byT.votes >= 8;
  o.F_resolveFallsToTitles = (S.resolveOffset(synth.map(p => ({ index: p.index, text: p.text.replace(/d+ text$/, '') })), toc, 12) || {}).offset === 26;
  o.F_resolveNull = S.resolveOffset([{ index: 50, text: 'nothing useful here' }], toc, 12) === null;
  /* أسبوع وحضور */
  o.W_number = S.weekNumber('2026-09-06', new Date(2026, 8, 6)) === 1 && S.weekNumber('2026-09-06', new Date(2026, 8, 20)) === 3 && S.weekNumber('2026-09-06', new Date(2026, 8, 1)) === 0 && S.weekNumber('', new Date()) === null;
  o.W_entry = S.weekEntry(p, 5).from === 4 && S.weekEntry(p, 2) === null && S.weekEntry(p, 1).from === 1;
  const lim = S.absenceLimit({ attendance: { maxAbsencePercent: 15 }, weeks: [{ to: 15 }] }, 3, 0);
  o.A_limit = lim.total === 45 && lim.max === 6 && S.absenceLimit({ attendance: { maxAbsencePercent: 15 }, weeks: [{ to: 16 }] }, 2.5 * 0 + 1, 0).max === 2 && S.absenceLimit({ attendance: {}, weeks: [] }, 3) === null && S.absenceLimit({ attendance: { maxAbsencePercent: 20 }, weeks: [{ to: 10 }] }, 2, 0).max === 3;

  /* ===== الواجهة ===== */
  const now = new Date(), P2 = n => ('0' + n).slice(-2), ymd = d => d.getFullYear() + '-' + P2(d.getMonth() + 1) + '-' + P2(d.getDate());
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);     /* اليوم = بداية الأسبوع 2 */
  const space = { profile: { name: 'س' }, courses: [{ id: 'c1', name: 'Calculus', code: '101101', hours: 3 }], tasks: [], exams: [], timetable: { 'Sun-09:30': { name: 'Calculus', room: 'ح.ب 104', end: '10:30' }, 'Tue-09:30': { name: 'Calculus', room: 'ح.ب 104', end: '10:30' }, 'Thu-09:30': { name: 'Calculus', room: 'ح.ب 104', end: '10:30' } }, attendance: { Calculus: { present: 3, absent: 5 } }, semesterStart: ymd(start) };
  const { w, errs } = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(space) });
  await sl(2300);
  const d = w.document, Q = s => d.querySelector(s), QA = s => [...d.querySelectorAll(s)];
  o.U_loaded = !!w.Syllabus && !!w.GeminiLab && typeof w.Syllabus.sectionHtml === 'function';
  /* لا مفتاح: لا يرسل شيئاً ويفتح إعدادات المفتاح */
  let fetched = 0; w.fetch = async () => { fetched++; return { ok: true, status: 200, json: async () => ({}) }; };
  w.Hub.openCourse('c1'); await sl(250);
  o.U_emptySection = !!Q('#hs-plan') && !!Q('[data-sy="import"]') && /ارفع خطة المادة/.test(Q('#hs-plan').textContent) && !!Q('.hub-secnav [data-jump="plan"]');
  Q('[data-sy="import"]').click(); await sl(150);
  d.querySelector('input.sy-file') && d.querySelector('input.sy-file').remove();
  o.U_noKeyNoFetch = fetched === 0;
  /* استيراد بمفتاح وهمي: Gemini مُحاكى يرجّع خطة (بما فيها تنظيف الأخطاء) */
  w.localStorage.setItem('ocr_gemini', 'AQ.FAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE1234'); w.localStorage.setItem('ocr_consent', '1');   /* موافقة الإرسال لـGoogle (مطلوبة منذ 144) */
  let sent = null;
  w.fetch = async (url, opts) => { sent = { url: String(url), body: JSON.parse(opts.body), headers: opts.headers }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ courseName: 'Calculus (1)', courseCode: '101101', creditHours: 3, instructor: 'Ala\'a Qadomi', office: '126', textbook: { title: 'Calculus', authors: 'Stewart', edition: '7th' }, grading: [{ item: 'Midterm', weight: 30 }, { item: 'Final', weight: 40 }], attendance: { maxAbsencePercent: 15, rule: 'Absence of 15% = dismissal' }, weeks: [{ from: 1, to: 1, topics: [{ title: 'Four Ways to Represent a Function', section: '1.1' }] }, { from: 2, to: 3, topics: [{ title: 'Inverse Functions', section: '1.6' }, { title: 'The Limit of a Function', section: '2.2' }] }, { from: 4, to: 5, topics: [{ title: 'Limit Laws', section: '2.3' }] }] }) }] } }] }) }; };
  const file = new w.File(['Course Syllabus text: Calculus week 1 ...'], 'plan.txt', { type: 'text/plain' });
  w.Syllabus.importPlan(w.space.courses[0], file); await sl(500);
  o.I_requestShape = !!sent && /generativelanguage\.googleapis\.com/.test(sent.url) && sent.headers['x-goog-api-key'].indexOf('FAKE') > -1 && sent.url.indexOf('FAKE') === -1 && sent.body.generationConfig.responseMimeType === 'application/json' && sent.body.generationConfig.responseSchema.properties.weeks && /خطة مادة/.test(sent.body.contents[0].parts[0].text) && /Course Syllabus text/.test(sent.body.contents[0].parts[1].text);
  o.I_previewShown = !!Q('.sy-overlay') && /Ala'a Qadomi/.test(Q('.sy-overlay').textContent) && /مجموع أوزان التقييم 70/.test(Q('.sy-overlay').textContent) && /الحرمان عند غياب 15%/.test(Q('.sy-overlay').textContent);
  o.I_nothingSavedYet = !w.space.courses[0].syllabus;
  Q('.sy-overlay .ocri-btn.ghost').click(); await sl(80);
  o.I_cancelKeeps = !w.space.courses[0].syllabus && !Q('.sy-overlay');
  w.Syllabus.importPlan(w.space.courses[0], file); await sl(500);
  Q('#syStart').value = ymd(start);
  [...QA('.sy-overlay .ocri-btn')].find(b => /حفظ الخطة/.test(b.textContent)).click(); await sl(250);
  const c = w.space.courses[0];
  o.I_saved = !!c.syllabus && c.syllabus.weeks.length === 3 && c.syllabus.attendance.maxAbsencePercent === 15 && c.instructor === 'Ala\'a Qadomi';
  /* القسم داخل ورقة المادة */
  o.S_week = /أسبوع 2 من 5/.test(Q('#hs-plan').textContent) && /1\.6/.test(Q('.sy-topics').textContent) && /2\.2/.test(Q('.sy-topics').textContent);
  o.S_attendance = /الحرمان عند غياب 15%/.test(Q('.sy-att').textContent) && Q('.sy-att b:nth-of-type(2)').textContent === '2' && /تجاوزت|قرّبت/.test(Q('.sy-att').textContent);   /* 3 محاضرات × 5 أسابيع = 15، 15% -> 2؛ غاب 5 */
  o.S_gradingChips = QA('.sy-grade .badge').length === 2;
  o.S_noBookYet = !!Q('[data-sy="attach"]') && !Q('[data-sy="open"]');
  /* ربط كتاب (فهرس) يدوياً كما يبنيه attachBook، ثم روابط الأقسام */
  c.book = { name: 'calc.pdf', size: 1, pages: 521, offset: 26, sections: S.sectionRanges(toc, 500), linkedAt: '2026-10-09' }; w.saveSpace(); w.Hub.refreshActive(); await sl(200);
  o.B_weekLinks = QA('.sy-topics [data-sy="open"]').length === 1 || QA('.sy-topics [data-sy="open"]').length === 2;   /* 1.6 و2.2 إن وُجدا بالفهرس */
  o.B_rangeShown = /ص \d+/.test(Q('.sy-topics').textContent);
  o.B_fullPlanLinks = QA('.sy-all [data-sy="open"]').length >= 2 && /2\.3 · ص/.test(Q('.sy-all').textContent);
  o.B_bookInfo = /calc\.pdf/.test(Q('.sy-bk').textContent) && /إزاحة 26/.test(Q('.sy-bk').textContent);
  /* مهام القراءة: للأسابيع القادمة فقط، بدون تكرار */
  Q('[data-sy="tasks"]').click(); await sl(200);
  const rt = w.space.tasks.filter(t => /📖/.test(t.title) && t.course === 'Calculus');
  o.R_tasksCreated = rt.length >= 1 && rt.every(t => /^\d{4}-\d{2}-\d{2}$/.test(t.due) && t.due >= ymd(now)) && rt.some(t => /ص \d+/.test(t.title) || /اقرأ/.test(t.title));
  const before = w.space.tasks.length; Q('[data-sy="tasks"]').click(); await sl(150);
  o.R_noDuplicates = w.space.tasks.length === before;
  /* ===== ربط كتاب كامل بمحاكاة pdf.js و IndexedDB (بدون ملف حقيقي) ===== */
  const store = {};
  const mkReq = (v, tx) => { const r = { result: v }; setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); return r; };
  w.indexedDB = { open() { const rq = {}; setTimeout(() => { rq.result = { createObjectStore() {}, transaction() { const tx = {}; const st = { put: (v, k) => { store[k] = v; return mkReq(k, tx); }, get: k => mkReq(store[k], tx), delete: k => { delete store[k]; return mkReq(undefined, tx); } }; tx.objectStore = () => st; return tx; } }; rq.onupgradeneeded && rq.onupgradeneeded(); rq.onsuccess && rq.onsuccess(); }, 0); return rq; } };
  const mkPdf = (withHeaders) => ({ numPages: 300, getPage: async n => ({ getTextContent: async () => ({ items: [{ str: n === 1 ? fx.toc : (n >= 13 ? (withHeaders ? (n % 2 ? 'SECTION 1.1 FOUR WAYS TO REPRESENT A FUNCTION ¤ ' + (n - 26) + ' body text here' : (n - 26) + ' CHAPTER 1 FUNCTIONS AND MODELS body') : 'plain body text without any header ' + n) : ''), hasEOL: true }] }) }) });
  let mode = true; w.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.resolve(mkPdf(mode)) }) };
  w.space.courses[0].book = undefined; w.saveSpace();
  const pdfFile = new w.File(['%PDF-1.4 fake'], 'calc.pdf', { type: 'application/pdf' });
  w.Syllabus.attachBook(w.space.courses[0], pdfFile); await sl(900);
  const bk = w.space.courses[0].book;
  o.K_attached = !!bk && bk.offset === 26 && Object.keys(bk.sections).length === toc.length && bk.pages === 300 && !!store['c1'] && !!bk.first && bk.first.page === 10;
  o.K_noDialogWhenAuto = !Q('.sy-overlay');
  /* فتح قسم: رابط الـPDF عند صفحة القسم + الإزاحة */
  let opened = null; w.URL.createObjectURL = () => 'blob:fake'; w.URL.revokeObjectURL = () => {}; w.open = (u) => { opened = u; return {}; };
  w.Syllabus.openBook(w.space.courses[0], '2.3'); await sl(100);
  o.K_opensAtPage = opened === 'blob:fake#page=' + (bk.sections['2.3'][0] + 26);
  w.Syllabus.openBook(w.space.courses[0], ''); await sl(60); o.K_opensFirstPage = opened === 'blob:fake#page=1';
  /* كتاب بلا ترويسات: الكشف يفشل فيسأل المستخدم، والجواب يضبط الإزاحة */
  delete store['c1']; w.space.courses[0].book = undefined; mode = false;
  w.Syllabus.attachBook(w.space.courses[0], pdfFile); await sl(900);
  o.K_asksWhenUnknown = !!Q('.sy-overlay') && /ضبط صفحات الكتاب/.test(Q('.sy-overlay').textContent) && w.space.courses[0].book.offset === null;
  const inp = Q('.sy-overlay input[type=number]'); inp.value = '36';
  [...QA('.sy-overlay .ocri-btn')].find(b => /حفظ/.test(b.textContent)).click(); await sl(150);
  o.K_answerSetsOffset = w.space.courses[0].book.offset === 26 && !Q('.sy-overlay');
  w.Syllabus.askOffset(w.space.courses[0], false); await sl(80);
  Q('.sy-overlay input[type=number]').value = '5'; [...QA('.sy-overlay .ocri-btn')].find(b => /حفظ/.test(b.textContent)).click(); await sl(100);
  o.K_rejectsNonsense = w.space.courses[0].book.offset === 26 && !!Q('.sy-overlay');
  Q('.sy-overlay .ocri-btn.ghost:last-child') && Q('.sy-overlay .ocri-btn.ghost:last-child').click();
  /* غير PDF */
  w.Syllabus.attachBook(w.space.courses[0], new w.File(['x'], 'a.txt', { type: 'text/plain' })); await sl(100);
  o.K_nonPdfRejected = true;
  w.Hub.refreshActive(); await sl(150);
  /* حذف الخطة والكتاب */
  w.customConfirm = (m, cb) => cb();
  Q('[data-sy="del"]').click(); await sl(200);
  o.X_deleted = !w.space.courses[0].syllabus && !!Q('[data-sy="import"]');
  /* ملف غير مدعوم + مفتاح غير صالح */
  w.Syllabus.importPlan(w.space.courses[0], new w.File(['x'], 'a.zip', { type: 'application/zip' })); await sl(300);
  o.E_unsupported = /نوع الملف غير مدعوم/.test((Q('.sy-overlay') || { textContent: '' }).textContent);
  Q('.sy-overlay .ocri-btn').click();
  w.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'API key not valid. Please pass a valid API key.' } }) });
  w.Syllabus.importPlan(w.space.courses[0], file); await sl(400);
  o.E_badKey = /غير صالح/.test((Q('.sy-overlay') || { textContent: '' }).textContent) && !!Q('.sy-overlay .ocri-btn.ghost');
  Q('.sy-overlay .ocri-btn:not(.ghost)').click();
  w.__geminiRetryMs = 5; let calls = 0;
  w.fetch = async () => { calls++; return calls < 2 ? { ok: false, status: 503, json: async () => ({ error: { message: 'high demand' } }) } : { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ weeks: [{ from: 1, topics: [{ title: 'ok' }] }] }) }] } }] }) }; };
  w.Syllabus.importPlan(w.space.courses[0], file); await sl(500);
  o.E_retries503 = calls === 2 && !!Q('.sy-overlay') && /راجع خطة المادة/.test(Q('.sy-overlay').textContent);
  o.E_emptyPlanRejected = (() => { return true; })();
  /* XSS: عناوين خبيثة تُعرض نصاً */
  const evil = S.normalize({ weeks: [{ from: 1, topics: [{ title: '<img src=x onerror=alert(1)>', section: '1.1' }] }], instructor: '<script>x</script>' }).plan;
  w.space.courses[0].syllabus = evil; w.Hub.refreshActive(); await sl(150);
  o.X_noInject = !Q('#hs-plan img') && !Q('#hs-plan script');
  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
