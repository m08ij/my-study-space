/* خطتي اليوم (dayplan.js): الاقتراحات الذكية، الدمج مع المحفوظ والترحيل، السلسلة والإعفاء، المراجعة الأسبوعية، البطاقة والورقة، التذكيرات والودجت */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
const DP = require('../js/dayplan.js');
(async () => {
  const o = {};
  /* ---------- (1) منطق نقي ---------- */
  const base = { courses: [{ id: 'a', name: 'تفاضل' }, { id: 'b', name: 'برمجة' }, { id: 'c', name: 'فيزياء' }, { id: 'z', name: 'قديمة', completed: true }],
    timetable: { 'Wed-10:00': { name: 'تفاضل', end: '10:50' }, 'Wed-12:00': { name: 'برمجة', end: '13:00' }, 'Tue-09:00': { name: 'فيزياء' }, 'Wed-14:00': { name: 'قديمة' } },
    exams: [{ id: 'e1', name: 'نصفي فيزياء', course: 'فيزياء', date: '2026-10-17', time: '10:00' }, { id: 'e2', name: 'كويز تفاضل', course: 'تفاضل', date: '2026-10-15' }, { id: 'e3', name: 'بعيد', course: 'برمجة', date: '2026-11-30' }],
    tasks: [{ id: 't1', title: 'واجب 3', course: 'برمجة', due: '2026-10-12', done: false }, { id: 't2', title: 'تقرير', course: 'برمجة', due: '2026-10-20', done: false },
      { id: 't3', title: 'خلصت اليوم', course: 'تفاضل', due: '2026-10-14', done: true, completedAt: '2026-10-14' }, { id: 't4', title: 'بلا مادة', due: '2026-10-14', done: false }] };
  const W = '2026-10-14';   /* الأربعاء */
  const s1 = DP.suggest({ date: W, space: base, now: new Date(2026, 9, 14, 11, 0) }), byN = n => s1.find(c => c.name === n);
  o.P_courses = s1.map(c => c.name).join(',') === 'تفاضل,فيزياء,برمجة';                     /* كويز بكرة (99) ← امتحان بعد 3 (87) ← مهمة متأخرة (70) */
  o.P_rev = byN('تفاضل').items.some(x => x.k === 'rev:تفاضل' && x.kind === 'rev') && byN('برمجة').items.some(x => x.k === 'rev:برمجة');
  o.P_exam2 = byN('تفاضل').items.filter(x => x.kind === 'exam').length === 2 && byN('فيزياء').items.filter(x => x.kind === 'exam').length === 1;   /* تدريب إضافي لامتحان خلال يومين */
  o.P_order = byN('تفاضل').items[0].kind === 'exam' && byN('تفاضل').items.slice(-1)[0].kind !== 'exam';
  o.P_why = /كويز تفاضل بكرة/.test(byN('تفاضل').why[0]) && byN('برمجة').why.includes('⚠️ مهمة متأخرة');
  o.P_tasks = byN('برمجة').items.some(x => x.k === 'task:t1' && x.late) && !byN('برمجة').items.some(x => x.k === 'task:t2') && byN('تفاضل').items.some(x => x.k === 'task:t3' && x.d);
  o.P_skip = !s1.some(c => c.name === 'قديمة') && !s1.some(c => c.items.some(x => x.k === 'task:t4'));
  o.P_lite = DP.suggest({ date: W, space: base, lite: true }).every(c => c.items.length === 1);
  o.P_examDone = !DP.suggest({ date: '2026-10-17', space: base, now: new Date(2026, 9, 17, 11, 0) }).some(c => c.name === 'فيزياء' && c.items.some(x => x.kind === 'exam'));
  o.P_topic = /المصفوفات/.test(DP.suggest({ date: W, space: base, weekTopic: n => n === 'تفاضل' ? 'المصفوفات' : null })[0].items.find(x => x.kind === 'rev').t);
  /* view: التشييك/الإخفاء/بنودي/الترحيل */
  const rec = { d: { 'rev:تفاضل': 'تفاضل' }, hid: ['exam2:e2'], u: [{ k: 'u:1', t: 'حل تمارين', c: 'فيزياء' }] };
  const prev = { d: {}, hid: [], u: [{ k: 'u:0', t: 'لخّص', c: 'برمجة' }, { k: 'u:9', t: 'خلص', c: 'برمجة' }] };
  prev.d['u:9'] = 'برمجة';
  const v1 = DP.view({ date: W, space: base, rec: rec, prevRec: prev, since: '2026-10-01' }), cv = n => v1.courses.find(c => c.name === n);
  o.V_done = cv('تفاضل').items.find(x => x.k === 'rev:تفاضل').d === true && cv('تفاضل').ok;
  o.V_hidden = !cv('تفاضل').items.some(x => x.k === 'exam2:e2');
  o.V_user = cv('فيزياء').items.some(x => x.k === 'u:1' && x.kind === 'user');
  o.V_carryUser = cv('برمجة').items.some(x => x.k === 'u:0@2026-10-13' && /\(من أمس\)/.test(x.t)) && !cv('برمجة').items.some(x => x.k.indexOf('u:9') === 0);
  o.V_carryRev = cv('فيزياء').items.some(x => x.k === 'rev:فيزياء@2026-10-13' && x.kind === 'carry');   /* محاضرة الثلاثاء ما انراجعت */
  o.V_noCarryBeforeSince = !DP.view({ date: W, space: base, rec: rec, prevRec: prev, since: W }).courses.some(c => c.items.some(x => x.kind === 'carry'));
  o.V_noCarryLite = !DP.view({ date: W, space: base, rec: rec, prevRec: prev, since: '2026-10-01', lite: true }).courses.some(c => c.items.some(x => x.kind === 'carry'));
  o.V_counts = v1.n === 3 && v1.okN === 1 && !v1.ok && !v1.full;
  /* السلسلة: منجز/فائت/إعفاء/راحة */
  const days = { '2026-10-04': { ok: 1, n: 2 }, '2026-10-05': { ok: 1, n: 2 }, '2026-10-06': { ok: 0, n: 2 }, '2026-10-07': { ok: 1, n: 1 }, '2026-10-08': { ok: 0, n: 3 }, '2026-10-11': { ok: 1, n: 2 }, '2026-10-12': { ok: 1, n: 2 }, '2026-10-13': { ok: 1, n: 1 } };
  const exp = dt => [0, 1, 2, 3, 4].includes(new Date(dt).getDay());
  const st = DP.streak({ today: W, since: '2026-10-04', days: days, todayOk: false, expected: dt => { const p = dt.split('-'); return [0, 1, 2, 3, 4].includes(new Date(+p[0], p[1] - 1, +p[2]).getDay()); } });
  o.S_freeze = st.hist['2026-10-06'] === 'freeze' && st.hist['2026-10-08'] === 'miss';   /* إعفاء واحد بالأسبوع: الثاني بيكسر */
  o.S_rest = st.hist['2026-10-09'] === 'rest' && st.hist['2026-10-10'] === 'rest';        /* الجمعة/السبت بلا سجل ولا محاضرات */
  o.S_cur = st.cur === 3 && st.best === 3 && st.hist[W] === 'today';
  o.S_today = DP.streak({ today: W, since: '2026-10-04', days: days, todayOk: true, expected: () => true }).cur === 4;
  o.S_missNoRec = DP.streak({ today: W, since: '2026-10-11', days: {}, todayOk: false, expected: () => true }).hist['2026-10-12'] === 'miss';
  o.S_freezeWeek = st.freezeWeek === null;   /* أسبوع 11–17 ما استُعمل فيه إعفاء */
  const ws = DP.weekSummary({ ws: '2026-10-11', today: W, hist: st.hist, days: { '2026-10-12': { d: { 'rev:تفاضل': 'تفاضل', 'u:3': 'تفاضل', 'task:t9': 'برمجة' } } }, space: base, log: { '2026-10-12': 50, '2026-10-13': 25 } });
  o.W_sum = ws.done === 3 && ws.exp === 3 && ws.focus === 75 && ws.per['تفاضل'] === 3 && ws.days.length === 7 && ws.days[6].st === 'future';
  o.W_neglect = ws.neglect.includes('فيزياء') && !ws.neglect.includes('قديمة');

  /* ---------- (2) بالتطبيق ---------- */
  const now = new Date(2026, 9, 14, 11, 0, 0).getTime();
  const sp = Object.assign({ profile: { name: 'م' }, attendance: {}, budget: [], grades: [], decks: [] }, JSON.parse(JSON.stringify(base)));
  const b = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', ss_seen_news: JSON.stringify('147'), space: JSON.stringify(sp) });
  const RD = b.w.Date; let clock = now; b.w.Date = class extends RD { constructor(...a){ if(a.length) super(...a); else super(clock); } static now(){ return clock; } };
  const w = b.w; await sl(900);
  const D = w.document, Q = s => D.querySelector(s), QA = s => [...D.querySelectorAll(s)];
  w.switchTab('dashboard', false); w.renderDashboard(); w.renderMyDay(); await sl(150);
  o.A_api = !!w.DayPlan && typeof w.DayPlan.cardHtml === 'function';
  o.C_noWrite = w.space.dayPlan === undefined;   /* العرض لحاله ما بيكتب */
  /* تشييك بند */
  const chk = () => QA('#myDay .md-plan [data-dp="tog"]').find(x => x.getAttribute('data-k') === 'rev:برمجة');
  w.DayPlan.toggle('rev:برمجة'); await sl(150);
  o.T_saved = w.space.dayPlan && w.space.dayPlan.days[W] && w.space.dayPlan.days[W].d['rev:برمجة'] === 'برمجة' && w.space.dayPlan.since === W;
  o.T_persist = JSON.parse(w.localStorage.getItem('space')).dayPlan.days[W].n === 3;
  /* بند مهمة = ينجز المهمة نفسها */
  w.DayPlan.toggle('task:t1'); await sl(150);
  o.T_task = w.space.tasks.find(t => t.id === 't1').done === true;
  /* الورقة: إضافة بند + اختصار + تأجيل + حذف */
  w.DayPlan.openSheet(); await sl(150);
  o.H_open = !!Q('.dp-sheet') && QA('.dp-sheet .dp-course').length === 3 && !!Q('.dp-sheet .dp-hist');
  const fz = QA('.dp-sheet form.dp-add').find(f => f.getAttribute('data-dpc') === 'فيزياء');
  fz.querySelector('input').focus(); fz.querySelector('input').value = 'حل أسئلة الفصل 2'; fz.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sl(150);
  const ui = w.space.dayPlan.days[W].u;
  o.H_add = ui.some(u => u.t === 'حل أسئلة الفصل 2' && u.c === 'فيزياء') && QA('.dp-sheet .dp-t').some(x => /حل أسئلة الفصل 2/.test(x.textContent));
  o.H_addFocus = D.activeElement && D.activeElement.tagName === 'INPUT' && D.activeElement.closest('form').getAttribute('data-dpc') === 'فيزياء' && D.activeElement.value === '';
  const qk = QA('.dp-sheet [data-dp="quick"]').find(x => x.getAttribute('data-c') === 'تفاضل' && x.getAttribute('data-t') === 'لخّص المحاضرة'); qk.click(); await sl(120);
  o.H_quick = w.space.dayPlan.days[W].u.some(u => u.t === 'لخّص المحاضرة' && u.c === 'تفاضل');
  const lt = QA('.dp-sheet [data-dp="later"]').find(x => x.getAttribute('data-k') === 'rev:تفاضل'); lt.click(); await sl(120);
  o.H_later = w.space.dayPlan.days[W].hid.includes('rev:تفاضل') && w.space.dayPlan.days['2026-10-15'].u.some(u => u.t === 'راجع محاضرة اليوم' && u.pp === 1);
  const uk = w.space.dayPlan.days[W].u.find(u => u.t === 'لخّص المحاضرة').k;
  QA('.dp-sheet [data-dp="del"]').find(x => x.getAttribute('data-k') === uk).click(); await sl(120);
  o.H_del = !w.space.dayPlan.days[W].u.some(u => u.k === uk);
  /* اليوم المنجز: بند لكل مادة */
  let v = w.DayPlan.viewFor(W);
  v.courses.filter(c => !c.ok).forEach(c => { const it = c.items.find(x => !x.d && x.kind !== 'task'); if(it) w.DayPlan.toggle(it.k); });
  v = w.DayPlan.viewFor(W);
  o.K_ok = v.ok && w.space.dayPlan.days[W].ok === 1 && w.DayPlan.streakInfo(new w.Date()).cur === 1;
  w.renderMyDay(); await sl(80);
  /* التذكيرات: بعد ما خلص اليوم ما في تذكير لليوم؛ بكرة في صبح + تذكيرات صارمة */
  const nToday = w.DayPlan.notifs(new Date(2026, 9, 14), new w.Date()), nTom = w.DayPlan.notifs(new Date(2026, 9, 15), new w.Date());
  o.N_todayDone = !nToday.some(n => /dp-(am|960|1200|1320)/.test(n.key));
  o.N_tomorrow = nTom.some(n => n.key === '2026-10-15|dp-am' && n.at.getHours() === 8) && ['dp-960', 'dp-1200', 'dp-1320'].every(k => nTom.some(n => n.key === '2026-10-15|' + k));
  w.DayPlan.setCfg('strict', false); await sl(50);
  o.N_gentle = w.DayPlan.notifs(new Date(2026, 9, 15), new w.Date()).filter(n => /dp-\d/.test(n.key)).length === 1;
  w.DayPlan.setCfg('strict', true);
  o.N_rev = w.DayPlan.notifs(new Date(2026, 9, 15), new w.Date()).some(n => /dp-rev/.test(n.key) && n.at.getHours() === 19);   /* الخميس */
  o.N_native = w.NativeApp.plan({ now: new w.Date(), prefs: {}, entries: [], space: w.space, helpers: {}, days: 3, dayplan: w.DayPlan.notifs }).some(n => n.key === '2026-10-15|dp-am');
  o.N_nativeOff = !w.NativeApp.plan({ now: new w.Date(), prefs: { dayplan: false }, entries: [], space: w.space, helpers: {}, days: 3, dayplan: w.DayPlan.notifs }).some(n => /dp-/.test(n.key));
  o.N_center = w.NotifyCenter.prefs().dayplan === true && w.NotifyCenter.allow('dayplan') === true;
  const wd = w.DayPlan.widget(new w.Date());
  o.G_widget = wd.d === W && wd.ok === 1 && wd.n === v.n && wd.st === 1 && wd.it.length > 0 && wd.it.every(x => typeof x.k === 'string' && typeof x.h === 'number');
  o.G_snapshot = w.NativeApp.widgetData({ now: new w.Date(), entries: [], space: w.space, helpers: {}, dayplan: w.DayPlan.widget }).dp.d === W;
  /* تطبيق أندرويد (Capacitor مُحاكى): تشييك من ودجت الخطة + تذكيرات أصلية بدل المكررة (والتطبيق الأقدم يرجع لـLocalNotifications) */
  const ln = { sched: [] }, wb = { pend: [], alarms: null };
  const fakes = { LocalNotifications: { checkPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [] }), cancel: async () => {}, schedule: async (a) => { ln.sched.push(a); } },
    WidgetBridge: { update: async () => {}, takePending: async () => ({ items: [] }), takePendingTasks: async () => ({ ids: [] }), takePendingPlan: async () => { const r = { items: wb.pend }; wb.pend = []; return r; } } };
  w.NativeApp._reset(); w.Capacitor = { isNativePlatform: () => true, registerPlugin: (n) => fakes[n] };
  const und = w.DayPlan.viewFor(W).courses.reduce((a, c) => a.concat(c.items), []).find(x => !x.d && x.kind !== 'task');
  wb.pend = [{ d: W, k: und.k }, { d: '2026-10-13', k: und.k }, { d: W, k: 'rev:مش موجود' }];
  const pp = await w.NativeApp.pullPlan(); await sl(60);
  o.M_pull = pp.applied === 1 && !!w.space.dayPlan.days[W].d[und.k];
  const r1 = await w.NativeApp.schedule();
  o.M_fallback = r1.planAlarms === false && ln.sched.length === 1 && ln.sched[0].notifications.some(n => /dp-am/.test(n.extra.key));
  fakes.WidgetBridge.planAlarms = async (a) => { wb.alarms = JSON.parse(a.data); return { scheduled: wb.alarms.length }; };
  ln.sched = []; const r2 = await w.NativeApp.schedule();
  o.M_native = r2.planAlarms === true && !(ln.sched[0] || { notifications: [] }).notifications.some(n => /dp-/.test(n.extra.key)) &&
    wb.alarms.length > 3 && wb.alarms.some(x => x.k === 'am' && x.d === '2026-10-15') && wb.alarms.some(x => x.k === 'rem') && wb.alarms.every(x => typeof x.at === 'number' && x.at > clock);
  o.M_items = w.NativeApp.planAlarmItems().every(x => x.t && x.b && /^\d{4}-\d{2}-\d{2}$/.test(x.d));
  w.Capacitor = undefined; w.NativeApp._reset();
  /* جلسة تركيز من ▶ تسكّر البند */
  w.DayPlan.setCfg('auto', false);
  const tgt = w.DayPlan.viewFor(W).courses.find(c => c.name === 'فيزياء').items.find(x => !x.d && x.kind !== 'task');
  w.localStorage.setItem('ss_dp_focus', JSON.stringify({ d: W, k: tgt.k, c: 'فيزياء' }));
  D.dispatchEvent(new w.CustomEvent('ss:focus-complete', { detail: { minutes: 25 } })); await sl(120);
  o.F_focus = !!w.space.dayPlan.days[W].d[tgt.k] && w.localStorage.getItem('ss_dp_focus') === null;
  w.renderMyDay(); await sl(60);
  o.F_minutes = w.space.dayPlan.days[W].fm['فيزياء'] === 25;
  D.dispatchEvent(new w.CustomEvent('ss:focus-complete', { detail: { minutes: 25 } })); await sl(80);   /* بدون بند ولا مادة مختارة: ما بينحسب لمادة */
  o.F_noCourse = w.space.dayPlan.days[W].fm['فيزياء'] === 25 && Object.keys(w.space.dayPlan.days[W].fm).length === 1;
  /* إعدادات من الورقة */
  if(!Q('.dp-sheet')) w.DayPlan.openSheet(); await sl(80);
  const lite = Q('.dp-sheet [data-dpset="lite"]'); lite.checked = true; lite.dispatchEvent(new w.Event('change', { bubbles: true })); await sl(100);
  o.E_lite = w.space.dayPlan.cfg.lite === true && w.DayPlan.viewFor(W).courses.every(c => c.items.filter(x => x.kind !== 'user').length <= 1);
  const mo = Q('.dp-sheet [data-dpset="morning"]'); mo.value = '07:00'; mo.dispatchEvent(new w.Event('change', { bubbles: true })); await sl(80);
  o.E_morning = w.DayPlan.cfg().morning === '07:00' && w.DayPlan.notifs(new Date(2026, 9, 16), new w.Date()).some(n => /dp-am/.test(n.key) && n.at.getHours() === 7);
  /* الفتح التلقائي مرة باليوم (بالقوة لأن localhost مستثنى) */
  w.DayPlan.setCfg('lite', false); w.DayPlan.setCfg('auto', true);
  D.querySelectorAll('.hub-sheet-backdrop .hub-x').forEach(x => x.click());
  clock = new Date(2026, 9, 15, 9, 0, 0).getTime(); w.FocusUI.go('today'); await sl(60);
  o.O_skipLocal = w.DayPlan.maybeAutoOpen(false) === false;
  o.O_force = w.DayPlan.maybeAutoOpen(true) === true && !!Q('.dp-sheet') && w.localStorage.getItem('ss_dp_seen') === '2026-10-15';
  D.querySelectorAll('.hub-sheet-backdrop .hub-x').forEach(x => x.click());
  o.O_once = w.DayPlan.maybeAutoOpen(true) === false;
  o.V_carryPostponed = w.DayPlan.viewFor('2026-10-15').courses.some(c => c.items.some(x => x.pp && /راجع محاضرة اليوم/.test(x.t)));
  /* المراجعة الأسبوعية: الخميس 18:00 وبعدها */
  w.space.dayPlan.since = '2026-10-10';
  clock = new Date(2026, 9, 15, 19, 0, 0).getTime();
  o.R_due = w.DayPlan.reviewDue(new w.Date()) === true && w.DayPlan.reviewDue(new Date(2026, 9, 15, 12, 0)) === false;
  w.renderMyDay(); await sl(60);
  w.DayPlan.openReview(); await sl(100);
  const rv = Q('.dp-review'); o.R_open = !!rv && rv.querySelectorAll('.dp-rv-day').length === 7;
  rv.querySelector('[data-rv-save]').click(); await sl(60);
  o.R_needPick = !w.space.dayPlan.rev['2026-10-11'];
  rv.querySelector('[data-rv="why"][data-v="big"]').click(); rv.querySelector('[data-rv="goal"][data-v="four"]').click(); rv.querySelector('[data-rv-save]').click(); await sl(100);
  o.R_saved = w.space.dayPlan.rev['2026-10-11'] && w.space.dayPlan.rev['2026-10-11'].why === 'big' && w.space.dayPlan.cfg.lite === true && !w.DayPlan.reviewDue(new w.Date());
  /* مستخدم بلا جدول: حالة فراغ بزر إضافة */
  const b2 = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', ss_seen_news: JSON.stringify('147'), space: JSON.stringify({ profile: { name: 'س' }, courses: [], tasks: [], exams: [], timetable: {}, attendance: {}, budget: [], grades: [] }) });
  await sl(800); b2.w.switchTab('dashboard', false); b2.w.renderMyDay(); await sl(80);
  o.Z_empty = b2.w.space.dayPlan === undefined;
  o.Z_errs = !b.errs.filter(e => !/Service Worker|navigation|Not implemented/i.test(e)).length && !b2.errs.filter(e => !/Service Worker|navigation|Not implemented/i.test(e)).length;
  if(!o.Z_errs) console.log(b.errs.concat(b2.errs).slice(0, 5));
  console.log(JSON.stringify(o, null, 1));
  process.exit(0);
})().catch(e => { console.error('Error:', e); process.exit(1); });
