/* استيراد جدول الامتحانات ونتائجها من صورة (Gemini مُحاكى بنفس محتوى لقطتي بوابة الطالب) */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const now = new Date(2026, 10, 18, 20, 0, 0).getTime();   /* 2026-11-18 */
  const sp = { profile: { name: 'م' }, courses: [
      { id: 'a', name: 'تفاضل وتكامل (1)', code: '0110108101', hours: 3 }, { id: 'b', name: 'فيزياء عامة (1)', code: '0110102101', hours: 3 },
      { id: 'c', name: 'أساسيات الكيمياء العامة', code: '1701081137', hours: 3 }, { id: 'd', name: 'مهارات التواصل باللغة الانجليزية', code: '0101101103', hours: 3 }],
    tasks: [], exams: [{ id: 'old1', name: 'أول تفاضل', course: 'تفاضل وتكامل (1)', date: '2026-11-18', time: '' }], timetable: {}, attendance: {}, grades: [], budget: [], decks: [] };
  const b = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', ss_seen_news: JSON.stringify('999'), space: JSON.stringify(sp) });
  const RD = b.w.Date; b.w.Date = class extends RD { constructor(...a){ if(a.length) super(...a); else super(now); } static now(){ return now; } };
  const { w, errs } = b; await sl(1000);
  const D = w.document, Q = s => D.querySelector(s), QA = s => [...D.querySelectorAll(s)], X = w.ExamImport;
  const schedule = { exams: [
    { course: 'امتحان مستوى في اللغة الانجليزية', type: 'امتحان مستوى', date: '30/09/2026', time: '09:30', duration: 40, room: '94', building: 'ابن رشد' },
    { course: 'امتحان مستوى في اللغة العربية', type: 'امتحان مستوى', date: '2026-09-30', time: '09:30', duration: 40, room: '94', building: 'ابن رشد' },
    { course: 'تفاضل وتكامل (1)', type: 'الامتحان الاول', date: '18/11/2026', time: '13:15', duration: 60, room: '205', building: 'ابن خلدون' },
    { course: 'اساسيات الكيمياء العامة', type: 'الامتحان الاول', date: '16/11/2026', time: '13:15', duration: 60, room: '29', building: 'ابن حيان' },
    { course: 'فيزياء عامة (1)', type: 'الامتحان الاول', date: '19/11/2026', time: '11:30', duration: 60, room: '138', building: 'ابن خلدون' },
    { course: 'مهارات التواصل باللغة الانجليزية', type: 'امتحان mid', date: '10/12/2026', time: '12:30', room: '50', building: 'ابن خلدون' },
    { course: 'فيزياء عامة (1)', type: 'الامتحان الاول', date: '19/11/2026', time: '11:30' } ], results: [] };
  const results = { exams: [], results: [
    { course: 'تفاضل وتكامل (1)', code: '110108101', section: '1', type: 'الامتحان الاول', score: 15, max: 15 },
    { course: 'اساسيات الكيمياء العامة', code: '1701081137', section: '15', type: 'الامتحان الاول', score: 27.5, max: 30 },
    { course: 'مادة مش عندي', code: '999999999', type: 'الامتحان الاول', score: 10, max: 20 } ] };
  /* دوال نقية */
  o.A_api = !!X && typeof X.parse === 'function' && !!w.OcrImport.ask;
  o.P_types = X.examType('امتحان مستوى') === 'level' && X.examType('الامتحان الاول') === 'first' && X.examType('امتحان mid') === 'mid' && X.examType('النهائي') === 'final' && X.examType('امتحان قصير') === 'quiz';
  o.P_date = X.normDate('30/09/2026') === '2026-09-30' && X.normDate('٣٠/٠٩/٢٠٢٦') === '2026-09-30' && X.normDate('x') === '';
  const P = X.parse([schedule, results]);
  o.P_dedupe = P.exams.length === 6 && P.results.length === 3;
  o.M_code = X.matchCourse('Calc', '110108101', w.space.courses).id === 'a';
  o.M_name = X.matchCourse('اساسيات الكيمياء العامة', '', w.space.courses).id === 'c';
  const pl = X.plan(P, w.space, '2026-11-18');
  const byC = n => pl.exams.find(x => x.course === n);
  o.C_status = pl.exams.filter(x => x.done).length === 3 && !byC('فيزياء عامة (1)').done && !byC('تفاضل وتكامل (1)').done;
  o.C_level = /^امتحان مستوى في اللغة الانجليزية$/.test(pl.exams[0].name) && /الامتحان الأول – فيزياء عامة/.test(byC('فيزياء عامة (1)').name);
  o.C_existing = byC('تفاضل وتكامل (1)').existing === 'old1';
  o.C_resultUnmatched = pl.results[2].matched === false && pl.results[2].on === false;
  /* الواجهة: Gemini مُحاكى ← نافذة مراجعة ← حفظ */
  let call = 0; w.OcrImport.ask = (pr, sc, cb) => { call++; o.U_prompt = /جدول امتحانات/.test(pr) && !!sc.properties.results; cb(call === 1 ? [schedule] : [results]); };
  w.FocusUI.go('exams'); await sl(100);
  Q('#fxMain [data-fx="eximp"]').click(); await sl(150);
  o.U_review = !!Q('.exi-modal') && QA('.exi-modal .exi-row').length === 6 && /امتحانات جاية/.test(Q('.exi-modal').textContent) && /امتحانات خلصت/.test(Q('.exi-modal').textContent);
  Q('.exi-modal [data-ok]').click(); await sl(200);
  const ex = w.space.exams;
  o.S_added = ex.length === 6 && ex.filter(e => e.id === 'old1').length === 1 && ex.find(e => e.id === 'old1').time === '13:15' && ex.find(e => e.id === 'old1').room === 'ابن خلدون 205';
  o.S_kind = ex.find(e => e.course === 'فيزياء عامة (1)').kind === 'first' && ex.find(e => /مهارات التواصل/.test(e.course)).kind === 'mid';
  w.FocusUI.go('grades'); await sl(100);
  Q('#fxMain [data-fx="eximp"]').click(); await sl(150);
  o.U_review2 = QA('.exi-modal .exi-row').length === 3 && !!Q('.exi-modal input[data-k="r2"]:disabled');
  Q('.exi-modal [data-ok]').click(); await sl(200);
  const g = n => (w.space.grades.find(x => x.name === n) || { items: [] }).items;
  o.G_items = g('تفاضل وتكامل (1)').length === 1 && g('تفاضل وتكامل (1)')[0].score === 15 && g('تفاضل وتكامل (1)')[0].weight === 15 && g('أساسيات الكيمياء العامة')[0].score === 27.5 && !w.space.grades.some(x => x.name === 'مادة مش عندي');
  o.G_examScore = w.space.exams.find(e => e.id === 'old1').score === 15;
  /* مرة ثانية نفس الصورة: ما بتتكرر */
  Q('#fxMain [data-fx="eximp"]').click(); await sl(150); Q('.exi-modal [data-ok]').click(); await sl(200);
  o.G_noDup = g('تفاضل وتكامل (1)').length === 1;
  w.FocusUI.go('grades'); await sl(100);
  o.V_gpa = /معدلك المتوقع/.test(Q('#fxMain').textContent) && Q('.fx-gpa-b.main b').textContent === '4.00' && QA('#fxMain .fx-let').length === 2;
  w.FocusUI.go('exams'); await sl(100);
  o.V_score = /15\/15/.test(Q('#fxMain').textContent);
  o.E_none = !errs.filter(e => !/offline|Not implemented|Could not parse|navigation/i.test(e)).length;
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
