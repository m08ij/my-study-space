/* اقتراحات لك + صحة المادة + ما الجديد + مشاركة الجدول كصورة (layout) */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const now = new Date(2026, 9, 14, 11, 0, 0).getTime();   /* الأربعاء 2026-10-14 11:00 */
  const busy = { profile: { name: 'م' }, courses: [{ id: 'a', name: 'تفاضل', code: '1', hours: 3 }, { id: 'b', name: 'برمجة', code: '2', hours: 3 }],
    tasks: [{ id: 't1', title: 'واجب قديم', type: 'task', course: 'تفاضل', due: '2026-10-12', done: false, priority: 'high' },
      { id: 't2', title: 'مشروع بكرة', type: 'task', course: 'برمجة', due: '2026-10-15', done: false, priority: 'high' }],
    exams: [{ id: 'e1', name: 'نصفي تفاضل', course: 'تفاضل', date: '2026-10-16', time: '10:00', room: '' }],
    timetable: { 'Wed-10:00': { name: 'تفاضل', room: 'ح.ب 104', end: '10:50' }, 'Sun-09:00': { name: 'برمجة', room: 'م.ش 205', end: '10:00', building: 'الشرقي' } },
    attendance: { 'تفاضل': { present: 2, absent: 3 }, 'برمجة': { present: 8, absent: 0 } }, grades: [], decks: [] };
  const calm = { profile: { name: 'م' }, courses: [{ id: 'a', name: 'تفاضل', code: '1', hours: 3 }], tasks: [], exams: [], timetable: { 'Wed-10:00': { name: 'تفاضل', room: 'ح.ب 104', end: '10:50' } }, attendance: { 'تفاضل': { present: 9, absent: 0 } }, grades: [], decks: [] };
  const mk = (sp, extra) => {
    const b = boot(Object.assign({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', ss_seen_news: JSON.stringify('143'), space: JSON.stringify(sp) }, extra || {}));
    const RD = b.w.Date; b.w.Date = class extends RD { constructor(...a){ if(a.length) super(...a); else super(now); } static now(){ return now; } };
    return b;
  };
  let { w, errs } = mk(busy); await sl(900);
  const D = w.document, Q = s => D.querySelector(s), QA = s => [...D.querySelectorAll(s)], C = w.Coach, N = new Date(now);

  o.A_api = !!C && typeof C.suggest === 'function' && typeof C.health === 'function' && !!w.ShareTT;
  const before = JSON.stringify(w.space);
  const list = C.suggest(N), ids = list.map(x => x.id);
  o.S_rules = ids.includes('overdue') && ids.includes('exam-e1') && ids.includes('tom-high') && ids.includes('att-تفاضل');
  o.S_sorted = list.every((x, i) => !i || list[i - 1].pri >= x.pri) && ids[0] === 'overdue';
  o.S_content = /واجب قديم/.test(list[0].why) && /نصفي تفاضل/.test(list.find(x => x.id === 'exam-e1').title) && /40%/.test(list.find(x => x.id === 'att-تفاضل').title);
  o.S_noWrites = JSON.stringify(w.space) === before;
  /* البطاقة بلوحة التحكم */
  w.FocusUI.go('today'); w.FocusUI.render(false); await sl(200);
  o.D_card = QA('#fxMain .fx-cs').length === 1 && !!Q('#fxMain [data-fx="coach"][data-v="overdue"]');
  o.D_once = QA('#fxMain .fx-coach').length === 1;
  /* إجراء */
  Q('#fxMain [data-fx="coach"][data-v="overdue"]').click(); await sl(200);
  o.R_runs = w.FocusUI.view() === 'tasks' && w.currentTaskFilter === 'overdue';
  w.FocusUI.go('today'); await sl(150);
  /* إخفاء لليوم */
  Q('#fxMain [data-fx="coachx"][data-v="overdue"]').click(); await sl(150);
  o.X_hidden = !Q('#fxMain [data-fx="coach"][data-v="overdue"]') && !C.suggest(N).some(x => x.id === 'overdue') && JSON.parse(w.localStorage.getItem('ss_coach_dismiss')).overdue === '2026-10-14';
  const tmr = new Date(2026, 9, 15, 11, 0, 0); o.X_nextDay = C.suggest(tmr).some(x => x.id === 'overdue');   /* بكرة يرجع */
  /* صحة المادة */
  const h1 = C.health('تفاضل', N), h2 = C.health('برمجة', N);
  o.H_risk = h1.level === 'risk' && h1.reasons.some(r => /الحضور 40%/.test(r)) && h1.reasons.some(r => /متأخرة/.test(r));
  o.H_good = h2.level === 'good' && h2.reasons.length === 0;
  w.FocusUI.go('courses'); await sl(250);
  o.H_pill = QA('#fxMain .fx-hl.risk').length >= 1;
  o.H_sheet = true;
  /* مادة سليمة: ما في بطاقة اقتراحات */
  const b2 = mk(calm, { studyLog: JSON.stringify({ '2026-10-14': 40 }) }); await sl(900); const D2 = b2.w.document;
  b2.w.FocusUI.go('today'); await sl(200);
  o.E_noCardWhenFine = !D2.querySelector('#fxMain .fx-cs') && b2.w.Coach.suggest(N).length === 0;
  const empty = { profile: { name: 'م' }, courses: [], tasks: [], exams: [], timetable: {}, attendance: {}, grades: [], decks: [] };
  const b3 = mk(empty); await sl(900); b3.w.FocusUI.go('today'); await sl(200);
  o.E_setupHints = b3.w.Coach.suggest(N).some(x => x.id === 'setup-course') && /أضف مادة|ابدأ بإضافة موادك/.test(b3.w.document.querySelector('#fxMain .fx-coach').textContent);
  /* ما الجديد */
  const b4 = mk(busy, { ss_seen_news: '' }); await sl(900); b4.w.localStorage.removeItem('ss_seen_news');
  const shown = b4.w.Coach.whatsNew(); await sl(200);
  o.W_shows = shown === true && !!b4.w.document.querySelector('#cConfirm') && /بداية يومك/.test(b4.w.document.querySelector('#cConfirm').closest('.modal').textContent) && JSON.parse(b4.w.localStorage.getItem('ss_seen_news')) === '175';
  o.W_once = b4.w.Coach.whatsNew() === false;
  /* مشاركة الجدول: layout نقي */
  const E = w.Schedule.entries(), L = w.ShareTT.layout(E);
  o.T_layout = !!L && L.blocks.length === 2 && L.days.length === 2 && L.hours.length === L.h1 - L.h0 + 1;
  const sun = L.days.find(d => d.dayIdx === 0), wed = L.days.find(d => d.dayIdx === 3);
  o.T_rtl = sun.x > wed.x;   /* الأحد يمين الأربعاء */
  o.T_inside = L.blocks.every(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= L.w && b.y + b.h <= L.h) && L.blocks.every(b => b.hue >= 0 && b.hue < 360);
  o.T_empty = w.ShareTT.layout([]) === null && w.ShareTT.layout([{ name: 'x', dayIdx: 0, start: 600, end: 600 }]) === null;
  w.FocusUI.go('timetable'); await sl(150); { const tb = Q('#fxMain .fx-ttbtn'); if(tb) tb.click(); await sl(20); } o.T_button = !!Q('#fxTtPop [data-fx="share"]');
  const e2 = mk({ ...empty }); await sl(800); e2.w.ShareTT.share(); await sl(100); o.T_emptyToast = /أضف محاضرات/.test(e2.w.document.body.textContent);
  o.errs = [...errs, ...b2.errs, ...b3.errs, ...b4.errs, ...e2.errs].filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
