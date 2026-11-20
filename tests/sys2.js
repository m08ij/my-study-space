/* إصدار بنية البيانات (schemaVersion) + رمز مزامنة 12 خانة للمستخدمين الجدد (القدامى يبقى رمزهم) */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {}, base = { profile: { name: 'م' }, courses: [], tasks: [], exams: [], timetable: {}, attendance: {}, grades: [], decks: [], budget: [] };
  const mk = (sp, extra) => boot(Object.assign({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(sp) }, extra || {}));
  let b = mk(base); await sl(700);
  o.V_stampsLegacy = b.w.space.schemaVersion === 1 && b.w.SCHEMA_VERSION === 1 && JSON.parse(b.w.localStorage.getItem('space')).schemaVersion === 1 || b.w.space.schemaVersion === 1;
  b = mk(Object.assign({}, base, { schemaVersion: 7 })); await sl(700);
  o.V_futureUntouched = b.w.space.schemaVersion === 7 && b.w.schemaFuture === true;
  b = mk(base); await sl(700);
  const r = b.w.migrateSpace({ a: 1 }); o.V_pure = r.schemaVersion === 1 && b.w.migrateSpace(null) === null && Array.isArray(b.w.migrateSpace([1])) && b.w.migrateSpace({ schemaVersion: 1, x: 2 }).x === 2;
  /* استعادة نسخة احتياطية قديمة (بلا schemaVersion) تُختم */
  b.w.applyServerData({ space: Object.assign({}, base, { courses: [{ id: 'z', name: 'قديمة', code: '1', hours: 3 }] }) }); await sl(200);
  o.V_restoreStamps = (b.w.space.schemaVersion === 1 && b.w.space.courses.some(c => c.name === 'قديمة'));
  /* رمز المزامنة */
  b = mk(base); await sl(700); const c = b.w.SB.getCode();
  o.S_newUser12 = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{12}$/.test(c);
  b = mk(base, { ss_sync_code: 'ABC234' }); await sl(700); o.S_oldKeeps6 = b.w.SB.getCode() === 'ABC234';
  o.errs = [];
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
