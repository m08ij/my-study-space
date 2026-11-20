/* الواجهة الجديدة (focus.js) — الواجهة الوحيدة بعد حذف القديمة: كل الشاشات بترسم، «الخطوة الجاية»، الأدوات، والتحويل من الدوال القديمة */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const now = new Date(2026, 9, 14, 10, 20, 0).getTime();   /* الأربعاء 10:20 — محاضرة تفاضل شغالة */
  const sp = { profile: { name: 'سامي علي' }, courses: [{ id: 'a', name: 'تفاضل', code: '1', hours: 3 }, { id: 'b', name: 'برمجة', code: '2', hours: 3 }],
    tasks: [{ id: 't1', title: 'واجب قديم', type: 'task', course: 'تفاضل', due: '2026-10-12', done: false }, { id: 't2', title: 'تقرير', type: 'task', course: 'برمجة', due: '2026-10-14', done: false }],
    exams: [{ id: 'e1', name: 'نصفي تفاضل', course: 'تفاضل', date: '2026-10-17', time: '10:00', room: '' }],
    timetable: { 'Wed-10:00': { name: 'تفاضل', room: 'ح.ب 104', end: '11:00' }, 'Wed-12:00': { name: 'برمجة', room: 'م.ش 205', end: '13:00' } },
    attendance: { 'تفاضل': { present: 2, absent: 3 } }, grades: [], budget: [], decks: [] };
  const b = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', ss_seen_news: JSON.stringify('999'), space: JSON.stringify(sp) });
  const RD = b.w.Date; b.w.Date = class extends RD { constructor(...a){ if(a.length) super(...a); else super(now); } static now(){ return now; } };
  const { w, errs } = b; await sl(1000);
  const D = w.document, Q = s => D.querySelector(s), QA = s => [...D.querySelectorAll(s)], M = () => Q('#fxMain');
  o.A_api = !!w.FocusUI && typeof w.FocusUI.view === 'function';
  /* لا هيكل قديم */
  o.O_noOld = !Q('.sidebar') && !Q('.topbar') && !Q('#dashboard') && !Q('.fab-main') && !Q('#tasks.section');
  /* كل الشاشات بترسم بدون أخطاء */
  const V = ['today', 'timetable', 'tasks', 'grades', 'more', 'courses', 'exams', 'attendance', 'budget', 'timer', 'settings', 'plan', 'tree', 'gpa', 'stats', 'prayer', 'hulinks'];
  const bad = []; for(const v of V){ w.FocusUI.go(v); await sl(60); if(w.FocusUI.view() !== v || !M() || M().textContent.trim().length < 5) bad.push(v); }
  o.V_all = bad.length === 0; if(bad.length) console.log('bad views', bad);
  /* اليوم: تحية بالاسم الأول، حلقة، الخطوة الجاية = المحاضرة الحالية + حضرت */
  w.FocusUI.go('today'); await sl(120);
  o.T_hello = /سامي/.test(Q('.fx-hello').textContent) && !/علي/.test(Q('.fx-hello b').textContent);
  o.T_noKpis = !Q('#fxMain .fx-kpis');
  o.T_nextClass = /تفاضل/.test(Q('.fx-next h2').textContent) && /جارية الآن/.test(Q('.fx-next small').textContent) && !!Q('.fx-next [data-fx="attnow"]');
  Q('.fx-next [data-fx="attnow"]').click(); await sl(150);
  o.T_attMarked = w.space.attendance['تفاضل'].present === 3 && !Q('.fx-next [data-fx="attnow"]') && !!Q('.fx-attok');
  o.T_exam = /نصفي تفاضل/.test(Q('.fx-exrow').textContent);
  o.T_later = QA('.fx-sec .fx-ln').some(x => /برمجة/.test(x.textContent));
  o.T_side = !!Q('#fxSide .fx-snav.on') && QA('#fxSide .fx-scrs').length > 0;
  o.T_coach = QA('.fx-cs').length === 1;
  /* أدوات كانت بالقديمة بس */
  w.FocusUI.go('timetable'); await sl(80);
  o.X_tt = !!Q('#fxMain [data-fx="ocr"]') && !!Q('#fxMain [data-fx="share"]') && !!Q('#fxMain [data-fx="cal"]');
  w.FocusUI.go('courses'); await sl(80);
  o.X_courses = !!Q('#fxMain [data-v="closeSemester"]') && !!Q('#fxMain [data-v="openSemesterArchive"]') && !!Q('#fxMain .fx-hl');
  /* الدوال القديمة: switchTab بتحوّل، والرسم القديم بيصير تحديث للجديدة */
  w.switchTab('exams'); await sl(80); o.R_switch = w.FocusUI.view() === 'exams';
  w.switchTab('dashboard'); await sl(80); o.R_dash = w.FocusUI.view() === 'today';
  w.switchTab('gradecalc'); await sl(80); o.R_gpa = w.FocusUI.view() === 'gpa';
  o.R_retired = !!(w.renderDashboard && w.renderDashboard._fx) && !!(w.renderExams && w.renderExams._fx);
  w.space.exams.push({ id: 'e2', name: 'كويز برمجة', course: 'برمجة', date: '2026-10-20' }); w.renderExams(); w.FocusUI.go('exams'); await sl(150);
  o.R_refresh = /كويز برمجة/.test(M().textContent);
  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse|navigation/i.test(e)); if(o.errs.length) console.log(o.errs.slice(0, 5));
  o.E_none = o.errs.length === 0; delete o.errs;
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
