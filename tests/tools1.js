/* قائمة الأدوات السريعة (الشريط الجانبي 🎯): المحاضرة الجاية + حضرت، مهام اليوم، إضافة سريعة، ترتيب/تخصيص */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const now = new Date(), mins = Math.max(15, Math.min(1385, now.getHours() * 60 + now.getMinutes())), pad = n => ('0' + n).slice(-2), hm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const DE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], day = DE[now.getDay()];
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const space = { profile: { name: 'م' }, courses: [{ id: 'c1', name: 'دوائر', code: 'EE1', hours: 3 }, { id: 'c2', name: 'برمجة', code: 'CS1', hours: 3 }],
    timetable: {}, attendance: { 'دوائر': { present: 2, absent: 0 }, 'برمجة': { present: 0, absent: 0 } }, grades: {}, exams: [], decks: [],
    tasks: [{ id: 't1', title: 'واجب اليوم', due: ymd(now), course: 'دوائر' }, { id: 't2', title: 'متأخرة قديمة', due: '2020-01-01' }, { id: 't3', title: 'بعدين', due: ymd(tomorrow) }, { id: 't4', title: 'منجزة', due: ymd(now), done: true }] };
  space.timetable[day + '-' + hm(mins - 10)] = { name: 'دوائر', room: 'ح.ب 104', end: hm(mins + 50) };
  const { w, errs } = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(space) });
  await sl(900);
  const D = w.document, Q = s => D.querySelector(s), QA = s => [...D.querySelectorAll(s)];

  /* ===== المحاضرة الحالية بالواجهة الجديدة: «حضرت» مرة وحدة بنفس مفتاح ودجت أندرويد ===== */
  w.FocusUI.go('today'); await sl(150);
  const nx = Q('#fxMain .fx-next');
  o.N_content = /دوائر/.test(nx.textContent) && /جارية الآن/.test(nx.textContent) && /باقي/.test(nx.textContent) && /104/.test(nx.textContent);
  o.N_attBtn = !!Q('#fxMain [data-fx="attnow"]');
  Q('#fxMain [data-fx="attnow"]').click(); await sl(150);
  o.N_marks = w.space.attendance['دوائر'].present === 3 && /سُجّل حضورك/.test(Q('#fxMain .fx-next').textContent) && !Q('#fxMain [data-fx="attnow"]');
  w.FocusUI.render(true); await sl(80); o.N_noDouble = !Q('#fxMain [data-fx="attnow"]') && w.space.attendance['دوائر'].present === 3;
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + (mins - 10) * 60000;
  o.N_keyShape = JSON.parse(w.localStorage.getItem('ss_att_applied')).indexOf('دوائر|' + startMs) > -1;
  /* مهام اليوم بالواجهة الجديدة */
  w.FocusUI.go('tasks'); await sl(100);
  o.T_list = /واجب اليوم/.test(Q('#fxMain').textContent) && /متأخرة قديمة/.test(Q('#fxMain').textContent);
  Q('#fxMain [data-fx="tog"][data-id="t1"]').click(); await sl(150);
  o.T_complete = w.space.tasks.find(t => t.id === 't1').done === true;
  /* ===== «يومي» (اللوحة): إجراء رئيسي — حضرت أثناء المحاضرة، ويتشارك المفتاح مع الشريط الجانبي ===== */
  w.FocusUI.go('today'); w.FocusUI.render(false); await sl(150);
  const cta = () => Q('#fxMain .fx-next');
  o.D_sharedKeyDone = /سُجّل حضورك/.test(cta().textContent) && !Q('#fxMain [data-fx="attnow"]');   /* سُجّل بالشريط الجانبي أعلاه: نفس المفتاح */
  w.localStorage.setItem('ss_att_applied', '[]'); w.FocusUI.render(false); await sl(150);
  o.D_ctaAttend = !!Q('#fxMain [data-fx="attnow"][data-n="دوائر"]') && /دوائر/.test(cta().textContent);
  Q('#fxMain [data-fx="attnow"]').click(); await sl(200);
  o.D_ctaMarks = w.space.attendance['دوائر'].present === 4 && !Q('#fxMain [data-fx="attnow"]') && /سُجّل حضورك/.test(cta().textContent);
  o.D_sidebarSeesIt = w.TodayLogic.attKeys().length === 1;
  /* بدون محاضرة قريبة: ابدأ جلسة تركيز (+خطة مراجعة لو امتحان خلال أسبوع) */
  w.space.timetable = {}; w.space.timetable[DE[(now.getDay() + 1) % 7] + '-09:00'] = { name: 'برمجة', room: 'م.ش 205', end: '10:00' };   /* محاضرة بيوم لاحق: ما في هدف حضور قريب بأي ساعة من اليوم */
  w.space.exams = [{ id: 'ex1', name: 'نصفي', date: ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3)), course: 'برمجة' }]; w.saveSpace(); w.FocusUI.render(false); await sl(200);
  o.D_ctaFocus = !Q('#fxMain [data-fx="attnow"]') && !!Q('#fxMain .fx-next [data-fx="study"]') && !!Q('#fxMain .fx-exrow');
  o.errs = errs.filter(x => !/offline|Not implemented|Could not parse/i.test(x));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
