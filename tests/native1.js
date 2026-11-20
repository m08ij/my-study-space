/* جسر تطبيق أندرويد: خطة الإشعارات (نقية) + جدولة عبر Capacitor مُحاكى + تنزيل الملفات + قارئ الكتاب */
const N = require('../js/native-bridge.js'), A = require('../js/smart-assist.js');
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  /* ===== خطة الإشعارات ===== */
  const now = new Date(2026, 9, 11, 7, 0, 0);                                  /* أحد 07:00 */
  const bmap = { 'ح.ب': { id: 'hb', name: 'الحسين الباني' }, 'م.ش': { id: 'east', name: 'الشرقي' } };
  const helpers = { buildingOf: e => bmap[String(e.room).slice(0, 3)] || null, walk: () => 6, leaveInfo: A.leaveInfo };
  const entries = [
    { key: 'Sun-09:00', dayIdx: 0, start: 540, end: 600, hasEnd: true, name: 'A', room: 'ح.ب 104' },
    { key: 'Sun-10:05', dayIdx: 0, start: 605, end: 660, hasEnd: true, name: 'B', room: 'م.ش 105' },
    { key: 'Tue-09:00', dayIdx: 2, start: 540, end: 600, hasEnd: true, name: 'C', room: 'ح.ب 1' }
  ];
  const space = { exams: [{ id: 'e1', name: 'امتحان', course: 'A', date: '2026-10-12', time: '10:00' }, { id: 'e2', name: 'اليوم', date: '2026-10-11', time: '14:00' }], tasks: [{ id: 't', title: 'واجب', due: '2026-10-11' }, { id: 't2', title: 'منجزة', due: '2026-10-11', done: true }] };
  const base = { now, entries, space, helpers, prefs: { lec: true, lecMin: 10, exams: true, tasks: true, tasksAt: '08:00' } };
  const p = N.plan(base), by = k => p.find(x => x.key === k);
  o.P_lecAlerts = !!by('2026-10-11|lec|Sun-09:00') && by('2026-10-11|lec|Sun-09:00').at.getHours() === 8 && by('2026-10-11|lec|Sun-09:00').at.getMinutes() === 50 && /الحسين الباني/.test(by('2026-10-11|lec|Sun-09:00').body);
  const lv = by('2026-10-11|leave|Sun-10:05');
  o.P_leave = !!lv && lv.at.getHours() === 10 && lv.at.getMinutes() === 0 && /ما بتلحق/.test(lv.title) && /الحسين الباني/.test(lv.body) && /الشرقي/.test(lv.body);
  o.P_noLeaveForFirst = !by('2026-10-11|leave|Sun-09:00');
  o.P_weeklyRecurs = !!by('2026-10-13|lec|Tue-09:00') && !by('2026-10-18|lec|Sun-09:00');
  o.P_exams = !!by('2026-10-11|examEve|e1_2026-10-12') && by('2026-10-11|examEve|e1_2026-10-12').at.getHours() === 20 && !!by('2026-10-11|exam2h|e2_2026-10-11') && by('2026-10-11|exam2h|e2_2026-10-11').at.getHours() === 12;
  o.P_tasks = !!by('2026-10-11|tasks') && /1 مهمة/.test(by('2026-10-11|tasks').title) && by('2026-10-11|tasks').at.getHours() === 8 && by('2026-10-11|tasks').body === 'واجب';
  o.P_sortedUniqueIds = p.every((x, i) => i === 0 || p[i - 1].at <= x.at) && new Set(p.map(x => x.id)).size === p.length && p.every(x => Number.isInteger(x.id) && x.id > 0 && x.id < 2147483647);
  o.P_stableIds = N.hashId('abc') === N.hashId('abc') && N.hashId('abc') !== N.hashId('abd');
  o.P_skipsPast = !N.plan(Object.assign({}, base, { now: new Date(2026, 9, 11, 9, 30, 0) })).some(x => x.key === '2026-10-11|lec|Sun-09:00');
  o.P_prefsOff = N.plan(Object.assign({}, base, { prefs: { lec: false, exams: false, tasks: false } })).length === 0 && !N.plan(Object.assign({}, base, { prefs: { lec: false, exams: true, tasks: true } })).some(x => /\|lec\||\|leave\|/.test(x.key));
  o.P_quiet = N.inQuiet({ quietOn: true, quietFrom: '22:00', quietTo: '07:00' }, 23 * 60) && N.inQuiet({ quietOn: true, quietFrom: '22:00', quietTo: '07:00' }, 6 * 60) && !N.inQuiet({ quietOn: true, quietFrom: '22:00', quietTo: '07:00' }, 12 * 60) && !N.inQuiet({ quietOn: false, quietFrom: '22:00', quietTo: '07:00' }, 23 * 60);
  const q = N.plan(Object.assign({}, base, { prefs: Object.assign({}, base.prefs, { quietOn: true, quietFrom: '08:30', quietTo: '09:30' }) }));
  o.P_quietSkips = !q.some(x => x.key === '2026-10-11|lec|Sun-09:00') && q.some(x => x.key === '2026-10-11|lec|Sun-10:05');
  o.P_limit = N.plan(Object.assign({}, base, { limit: 3 })).length === 3;

  /* ===== لقطة الودجات ===== */
  const wd = N.widgetData({ now, entries, space: Object.assign({}, space, { tasks: [{ id: 't', title: 'واجب', due: '2026-10-11' }, { id: 'old', title: 'قديمة', due: '2026-10-01' }, { id: 'f', title: 'مستقبل', due: '2026-10-30' }, { id: 'd', title: 'منجزة', due: '2026-10-11', done: true }] }), helpers: { placeOf: e => bmap[String(e.room).slice(0, 3)] ? bmap[String(e.room).slice(0, 3)].name : '', hueOf: n => n === 'A' ? 10 : 200 }, days: 7 });
  o.WD_shape = wd.v === 2 && Array.isArray(wd.exams) && Array.isArray(wd.tl) && wd.at === now.getTime() && wd.lectures.length === 3 && wd.lectures.every(l => Number.isInteger(l.s) && l.e > l.s && l.n && typeof l.p === 'string' && Number.isInteger(l.h));
  o.WD_sortedFuture = wd.lectures.every((l, i) => i === 0 || wd.lectures[i - 1].s <= l.s) && wd.lectures.every(l => l.e > now.getTime());
  o.WD_times = new Date(wd.lectures[0].s).getHours() === 9 && new Date(wd.lectures[0].e).getHours() === 10 && wd.lectures[0].p === 'الحسين الباني' && wd.lectures[0].h === 10;
  o.WD_tasksExam = wd.tasks.due === 2 && wd.tasks.titles.length === 2 && wd.exam.n === 'اليوم' && new Date(wd.exam.at).getDate() === 11 && new Date(wd.exam.at).getHours() === 14;
  o.WD_ongoingKept = (() => { const x = N.widgetData({ now: new Date(2026, 9, 11, 9, 30, 0), entries, space, helpers: {}, days: 1 }).lectures; return x.length === 2 && x[0].s < new Date(2026, 9, 11, 9, 30, 0).getTime(); })() && N.widgetData({ now: new Date(2026, 9, 11, 12, 0, 0), entries, space, helpers: {}, days: 1 }).lectures.length === 0;
  o.WD_noEndAssumesHour = (() => { const x = N.widgetData({ now, entries: [{ key: 'k', dayIdx: 0, start: 600, end: 600, hasEnd: false, name: 'ن', room: '' }], space: {}, helpers: {}, days: 1 }).lectures[0]; return x.e - x.s === 3600000; })();
  o.WD_noExam = N.widgetData({ now, entries: [], space: {}, helpers: {}, days: 7 }).exam === null;
  o.WD_cap = N.widgetData({ now, entries: Array.from({ length: 60 }, (_, i) => ({ key: 'k' + i, dayIdx: 0, start: 600 + i, end: 700 + i, hasEnd: true, name: 'x', room: '' })), space: {}, helpers: {}, days: 7 }).lectures.length === 42;

  /* ===== داخل المتصفح (jsdom): ليس تطبيقاً => لا شي ===== */
  const now2 = new Date(), de = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], P2 = n => ('0' + n).slice(-2), td = de[now2.getDay()];
  const space2 = { profile: { name: 'س' }, courses: [{ id: 'c1', name: 'A', code: '1', hours: 3 }], tasks: [], exams: [], timetable: { [td + '-23:50']: { name: 'A', room: 'ح.ب 104', end: '23:59' }, ['Sun-09:00']: { name: 'A', room: 'ح.ب 104', end: '10:00' }, ['Mon-11:00']: { name: 'B', room: 'م.ش 105', end: '12:00' } } };
  const { w, errs } = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(space2) });
  await sl(2300);
  const d = w.document, Q = s => d.querySelector(s), QA = s => [...d.querySelectorAll(s)];
  o.W_notNative = w.NativeApp.isNative() === false && !d.documentElement.classList.contains('native-app');
  o.W_scheduleNoop = (await w.NativeApp.schedule()).native === false;
  /* ===== تطبيق (Capacitor مُحاكى) ===== */
  const calls = { schedule: [], cancel: [], perm: 0, write: [], share: [] };
  let perm = 'prompt', pending = [{ id: 11 }, { id: 12 }];
  const fakes = {
    LocalNotifications: { checkPermissions: async () => ({ display: perm }), requestPermissions: async () => { calls.perm++; perm = 'granted'; return { display: 'granted' }; }, getPending: async () => ({ notifications: pending }), cancel: async (a) => { calls.cancel.push(a); }, schedule: async (a) => { calls.schedule.push(a); } },
    Filesystem: { writeFile: async (a) => { calls.write.push(a); return { uri: 'file:///cache/' + a.path }; } },
    Share: { share: async (a) => { calls.share.push(a); return {}; } }
  };
  w.Capacitor = { isNativePlatform: () => true, registerPlugin: (n) => fakes[n] };
  o.A_isNative = w.NativeApp.isNative() === true;
  w.__nbCache = null;
  const r1 = await w.NativeApp.schedule();
  o.A_permissionAsked = calls.perm === 1 && r1.native === true && r1.scheduled >= 1;
  o.A_cancelsOld = calls.cancel.length === 1 && calls.cancel[0].notifications.map(x => x.id).join() === '11,12';
  const sc = calls.schedule[0].notifications;
  o.A_scheduled = sc.length === r1.scheduled && sc.every(n => Number.isInteger(n.id) && n.title && typeof n.schedule.at === 'string' && !isNaN(Date.parse(n.schedule.at)) && n.schedule.allowWhileIdle === true && n.smallIcon === 'ic_stat_icon') && sc.some(n => /«A»|«B»/.test(n.title));
  const r2 = await w.NativeApp.schedule(); o.A_permissionOnce = calls.perm === 1 && calls.schedule.length === 2;
  perm = 'denied'; calls.schedule.length = 0; const r3 = await w.NativeApp.schedule(); o.A_deniedNoSchedule = calls.schedule.length === 0 && r3.permission === 'denied';
  perm = 'granted';
  /* دفع اللقطة للودجات + نافذة إضافة الودجت */
  const wcalls = { update: [], pin: [] }; fakes.WidgetBridge = { update: async (a) => { wcalls.update.push(a); }, pin: async (a) => { wcalls.pin.push(a); return { requested: a.type !== 'actions' }; } };
  const pr = await w.NativeApp.pushWidget(); const snap = JSON.parse(wcalls.update[0].data);
  o.W_push = pr.native === true && wcalls.update.length === 1 && snap.v === 2 && Array.isArray(snap.exams) && Array.isArray(snap.tl) && Array.isArray(snap.lectures) && snap.lectures.length >= 1 && snap.lectures.every(l => l.s && l.e && l.n);
  /* ودجت المهام: مهام أُنجزت من الودجت تُطبَّق بالتطبيق (للمعلّقة فقط) */
  fakes.WidgetBridge.takePendingTasks = async () => ({ ids: [w.space.tasks[0] && w.space.tasks[0].id, 'missing-id'] });
  const before = (w.space.tasks[0] || {}).done, pt = await w.NativeApp.pullTasks();
  o.W_pullTasks = pt.applied === (w.space.tasks[0] && !before ? 1 : 0) && (w.space.tasks[0] ? w.space.tasks[0].done === true || before === true : true);
  const pt2 = await w.NativeApp.pullTasks(); o.W_pullTasksNoReopen = pt2.applied === 0 || (w.space.tasks[0] && w.space.tasks[0].done === false);
  w.NativeApp.openWidgetPicker(); await sl(80);
  o.W_pickerOpens = QA('.wg-opt').length === 4 && !!Q('#wgPicker') && QA('.wg-opt').map(x => x.getAttribute('data-wg')).join() === 'next,tasks,exams,actions';   /* 2.0: محاضرتي · مهامي · امتحاناتي · اختصارات */
  const upd0 = wcalls.update.length; wcalls.pin.length = 0;
  Q('[data-wg="next"]').click(); await sl(150);
  o.W_pin = wcalls.pin.length === 1 && wcalls.pin[0].type === 'next' && !Q('#wgPicker') && wcalls.update.length === upd0 + 1;
  w.NativeApp.openWidgetPicker(); Q('[data-wg="actions"]').click(); await sl(150); o.W_pinUnsupportedToast = wcalls.pin[1].type === 'actions' && !Q('#wgPicker');
  /* رقم القاعة بالودجات + تسجيل الحضور من الودجت */
  o.W_roomField = snap.lectures.every(l => typeof l.r === 'string') && snap.lectures.some(l => l.r.length > 0 && !/ح\.ب|قاعة/.test(l.r));
  const wr = N.widgetData({ now: new Date(2026, 9, 11, 8, 0, 0), entries: [{ key: 'k', dayIdx: 0, start: 600, end: 660, hasEnd: true, name: 'ن', room: 'ح.ب 101' }], space: {}, helpers: { placeOf: () => 'الحسين الباني', roomOf: e => '101' }, days: 1 }).lectures[0];
  o.W_roomPure = wr.r === '101' && wr.p === 'الحسين الباني';
  const sp0 = w.space.courses[0].name; const pend = [{ n: sp0, s: 1000 }, { n: sp0, s: 1000 }, { n: 'مادة محذوفة', s: 5 }, { n: sp0, s: 2000 }];
  fakes.WidgetBridge.takePending = async () => ({ items: pend.splice(0) });
  const att0 = (w.space.attendance[sp0] || { present: 0 }).present;
  const pa = await w.NativeApp.pullAttendance();
  o.AT_applied = pa.applied === 2 && w.space.attendance[sp0].present === att0 + 2 && !w.space.attendance['مادة محذوفة'];
  o.AT_toast = /سُجّل حضورك من الودجت/.test(d.body.textContent);
  pend.push({ n: sp0, s: 1000 }); const pb = await w.NativeApp.pullAttendance();
  o.AT_noReapply = pb.applied === 0 && w.space.attendance[sp0].present === att0 + 2;
  fakes.WidgetBridge.takePending = async () => { throw new Error('no method'); };
  o.AT_oldApkSafe = (await w.NativeApp.pullAttendance()).error === true;
  o.AT_pure = JSON.stringify(N.attendItems([{ n: 'a', s: 1 }, { n: 'a', s: 1 }, { n: 'b', s: 2 }, null, { s: 3 }], { courses: [{ name: 'a' }], attendance: { b: {} } }, ['b|2']).apply) === '[{"n":"a","s":1}]';
  o.W_btnNativeOnly = !!Q('#widgetBtn') && /native-only/.test(Q('#widgetBtn').className) && require('fs').readFileSync(require('path').join(__dirname, '..', 'css', '04-responsive-components-phases.css'), 'utf8').indexOf('.native-only{display:none!important}') > -1;
  /* تنزيل الملفات */
  w.fetch = async () => ({ blob: async () => new w.Blob(['ABC']) });
  w.NativeApp.patchDownloads();
  const a = d.createElement('a'); a.href = 'data:text/plain;base64,QUJD'; a.setAttribute('download', 'نسخة/احتياطية:1.json'); d.body.appendChild(a); a.click(); await sl(300);
  o.D_intercepted = calls.write.length === 1 && calls.write[0].directory === 'CACHE' && calls.write[0].data === 'QUJD' && !/[\\/:*?"<>|]/.test(calls.write[0].path) && /\.json$/.test(calls.write[0].path) && calls.share.length === 1 && /^file:\/\/\/cache\//.test(calls.share[0].url);
  o.D_patchOnce = (w.NativeApp.patchDownloads(), true);
  /* ===== تحديث التطبيق ===== */
  o.UP_pure = N.newerRelease(3, { versionCode: 4, url: 'apk/StudySpace.apk' }, 0) === true && N.newerRelease(4, { versionCode: 4, url: 'apk/StudySpace.apk' }, 0) === false && N.newerRelease(3, { versionCode: 4, url: 'apk/StudySpace.apk' }, 4) === false && N.newerRelease(3, { versionCode: 4, url: 'http://evil.com/x.apk' }, 0) === false && N.newerRelease(3, { versionCode: 4, url: '../x.apk' }, 0) === false && N.newerRelease(3, null, 0) === false && N.newerRelease(3, { versionCode: 'x', url: 'apk/a.apk' }, 0) === false;
  const up = { info: 0, install: [], listeners: [] };
  fakes.AppUpdater = { info: async () => { up.info++; return { versionName: '1.2', versionCode: 3 }; }, install: async (a) => { up.install.push(a); return up.mode === 'perm' ? { needsPermission: true } : (up.mode === 'fail' ? Promise.reject(new Error('checksum mismatch')) : { started: true }); }, addListener: (n, cb) => { up.listeners.push({ n, cb }); return Promise.resolve({ remove() {} }); } };
  let remote = { versionCode: 4, versionName: '1.3', url: 'apk/StudySpace.apk', sha256: 'abc123', size: 3300000, notes: ['ودجات أندرويد', 'تحديث تلقائي'] };
  w.fetch = async (u) => { if(!/apk\/version\.json\?t=\d+/.test(u)) throw new Error('unexpected ' + u); return { ok: true, json: async () => remote }; };
  w.localStorage.removeItem('ss_apk_check'); w.localStorage.removeItem('ss_apk_skip');
  const cu = await w.NativeApp.checkUpdate(true);
  o.UP_found = cu.update === true && !!Q('#upDlg') && /1\.3/.test(Q('#upDlg').textContent) && /1\.2/.test(Q('#upDlg').textContent) && QA('#upDlg .up-notes li').length === 2 && /3\.1/.test(Q('#upDlg').textContent);
  Q('#upDlg .ocri-btn').click(); await sl(100);
  o.UP_installCall = up.install.length === 1 && up.install[0].url === 'http://localhost/apk/StudySpace.apk' && up.install[0].sha256 === 'abc123' && /فتحت شاشة التثبيت/.test(Q('#upDlg').textContent);
  up.listeners[0].cb({ pct: 55 }); o.UP_progress = up.listeners[0].n === 'progress' && Q('#upDlg .up-bar i').style.width === '55%' && /55%/.test(Q('#upDlg').textContent);
  Q('#upDlg').remove(); up.mode = 'perm'; await w.NativeApp.checkUpdate(true); Q('#upDlg .ocri-btn').click(); await sl(100);
  o.UP_permission = /السماح بالتثبيت/.test(Q('#upDlg').textContent) && !Q('#upDlg .ocri-btn').disabled;
  Q('#upDlg').remove(); up.mode = 'fail'; await w.NativeApp.checkUpdate(true); Q('#upDlg .ocri-btn').click(); await sl(100);
  o.UP_failure = /فشل التحديث: checksum mismatch/.test(Q('#upDlg').textContent) && !Q('#upDlg .ocri-btn').disabled;
  Q('#upDlg').remove(); up.mode = ''; await w.NativeApp.checkUpdate(true); QA('#upDlg .ocri-btn')[2].click();
  o.UP_skip = w.localStorage.getItem('ss_apk_skip') === '4' && !Q('#upDlg') && (await w.NativeApp.checkUpdate(false)).update === undefined;      /* الفحص التلقائي محدود بالزمن */
  w.localStorage.removeItem('ss_apk_check'); const auto = await w.NativeApp.checkUpdate(false); o.UP_autoSkippedVersion = auto.update === false && !Q('#upDlg');
  const manualAfterSkip = await w.NativeApp.checkUpdate(true); o.UP_manualIgnoresSkip = manualAfterSkip.update === true && !!Q('#upDlg'); Q('#upDlg').remove();
  remote = { versionCode: 3, versionName: '1.2', url: 'apk/StudySpace.apk' }; const same = await w.NativeApp.checkUpdate(true); o.UP_upToDate = same.update === false && !Q('#upDlg') && /آخر إصدار/.test(Q('#updateSub').textContent);
  w.fetch = async () => { throw new Error('offline'); }; const bad = await w.NativeApp.checkUpdate(true); o.UP_offline = !!bad.error && !Q('#upDlg');
  o.UP_btnNativeOnly = !!Q('#updateBtn') && /native-only/.test(Q('#updateBtn').className);
  /* ===== الوضع الفعلي بالتطبيق: موقع بعيد بدون @capacitor/core => فقط nativePromise/addListener (لا registerPlugin ولا Plugins) ===== */
  const ncalls = []; const lst = [];
  w.NativeApp._reset();
  w.Capacitor = { isNativePlatform: () => true, nativePromise: async (p, m, opts) => { ncalls.push([p, m, opts]); if(!fakes[p] || !fakes[p][m]) throw new Error('unimplemented ' + p + '.' + m); return fakes[p][m](opts); }, addListener: (p, e, cb) => { lst.push([p, e, cb]); return { remove() {} }; } };
  perm = 'granted';
  const rm1 = await w.NativeApp.pushWidget();
  o.RM_push = rm1.native === true && ncalls.some(c => c[0] === 'WidgetBridge' && c[1] === 'update' && typeof c[2].data === 'string' && JSON.parse(c[2].data).v === 2);
  calls.schedule.length = 0; calls.cancel.length = 0;
  const rm2 = await w.NativeApp.schedule();
  o.RM_schedule = rm2.scheduled >= 1 && ncalls.some(c => c[0] === 'LocalNotifications' && c[1] === 'checkPermissions') && ncalls.some(c => c[0] === 'LocalNotifications' && c[1] === 'schedule') && calls.schedule.length === 1;
  w.fetch = async () => ({ ok: true, json: async () => ({ versionCode: 9, versionName: '9.0', url: 'apk/StudySpace.apk', notes: ['x'] }) });
  w.localStorage.removeItem('ss_apk_skip');
  await w.NativeApp.checkUpdate(true); Q('#upDlg .ocri-btn').click(); await sl(100);
  o.RM_updater = ncalls.some(c => c[0] === 'AppUpdater' && c[1] === 'info') && ncalls.some(c => c[0] === 'AppUpdater' && c[1] === 'install' && /apk\/StudySpace\.apk$/.test(c[2].url)) && lst.some(l => l[0] === 'AppUpdater' && l[1] === 'progress');
  Q('#upDlg') && Q('#upDlg').remove();
  w.fetch = async () => ({ blob: async () => new w.Blob(['ABC']) });
  const an = d.createElement('a'); an.href = 'data:text/plain;base64,QUJD'; an.setAttribute('download', 'b.json'); d.body.appendChild(an); calls.write.length = 0; calls.share.length = 0; an.click(); await sl(300);
  o.RM_download = calls.write.length === 1 && calls.share.length === 1 && ncalls.some(c => c[0] === 'Filesystem' && c[1] === 'writeFile');
  o.RM_noThenTrap = (() => { const px = w.NativeApp._plugin('Whatever'); return px.then === undefined && typeof px.anything === 'function'; })();
  /* ===== قارئ الكتاب ===== */
  const store = {}; const mkReq = (v, tx) => { const r = { result: v }; setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); return r; };
  w.indexedDB = { open() { const rq = {}; setTimeout(() => { rq.result = { createObjectStore() {}, transaction() { const tx = {}; const st = { put: (v, k) => { store[k] = v; return mkReq(k, tx); }, get: k => mkReq(store[k], tx), delete: k => { delete store[k]; return mkReq(undefined, tx); } }; tx.objectStore = () => st; return tx; } }; rq.onupgradeneeded && rq.onupgradeneeded(); rq.onsuccess && rq.onsuccess(); }, 0); return rq; } };
  store['c1'] = new w.File(['%PDF'], 'b.pdf', { type: 'application/pdf' });
  w.HTMLCanvasElement.prototype.getContext = () => ({});
  let drawn = []; w.pdfjsLib = { GlobalWorkerOptions: {}, getDocument: () => ({ promise: Promise.resolve({ numPages: 50, destroy() {}, getPage: async (n) => ({ getViewport: ({ scale }) => ({ width: 100 * scale, height: 140 * scale }), render: () => { drawn.push(n); return { promise: Promise.resolve() }; } }) }) }) };
  const c = w.space.courses[0]; c.book = { name: 'b.pdf', size: 4, pages: 50, offset: 5, sections: { '1.1': [3, 9], '1.2': [10, 20] }, first: { sec: '1.1', title: 't', page: 3 } }; w.saveSpace();
  o.R_wantsReaderInApp = w.Syllabus.wantReader() === true;
  w.Syllabus.openBook(c, '1.2'); await sl(500);
  o.R_opens = !!Q('.rd-overlay') && Q('.rd-pg').value === '15' && drawn[drawn.length - 1] === 15 && /\/ 50/.test(Q('.rd-of').textContent) && d.documentElement.classList.contains('rd-open');
  Q('[data-rd="next"]').click(); await sl(150); o.R_next = Q('.rd-pg').value === '16' && drawn[drawn.length - 1] === 16;
  Q('[data-rd="prev"]').click(); Q('[data-rd="prev"]').click(); await sl(250); o.R_prev = Q('.rd-pg').value === '14';
  const sel = Q('.rd-sec'); sel.value = '1.1'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await sl(200); o.R_sectionJump = Q('.rd-pg').value === '8' && sel.value === '';       /* 3 + إزاحة 5 */
  const pg = Q('.rd-pg'); pg.value = '999'; pg.dispatchEvent(new w.Event('change', { bubbles: true })); await sl(200); o.R_clamps = Q('.rd-pg').value === '50';
  Q('[data-rd="zin"]').click(); await sl(150); Q('[data-rd="zout"]').click(); await sl(150); o.R_zoomWorks = !!Q('.rd-cv');
  Q('[data-rd="close"]').click(); o.R_closes = !Q('.rd-overlay') && !d.documentElement.classList.contains('rd-open');
  w.Syllabus.openBook(c, ''); await sl(400); o.R_firstPage = Q('.rd-pg').value === '1'; Q('[data-rd="close"]').click();
  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
