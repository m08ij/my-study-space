/* النسخ التلقائية اليومية على الجهاز (AutoSnap بـapp.js): مرة باليوم ولما تتغيّر البيانات، الاحتفاظ (7 أيام + 4 أسابيع)، والاسترجاع من «استرجاع نسخة سابقة» */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
function fakeIDB(){
  const dbs = {}, clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  return { dbs, open(name){ const rq = {}; setTimeout(() => {
    const fresh = !dbs[name]; if(fresh) dbs[name] = {}; const store = dbs[name], mk = v => ({ result: v });
    rq.result = { createObjectStore(){}, transaction(){ const tx = {}; const st = { get: k => mk(clone(store[k])), put: (v, k) => { store[k] = clone(v); return mk(k); }, delete: k => { delete store[k]; return mk(undefined); } };
      tx.objectStore = () => st; setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); return tx; } };
    if(fresh && rq.onupgradeneeded) rq.onupgradeneeded(); if(rq.onsuccess) rq.onsuccess(); }, 0); return rq; } };
}
(async () => {
  const o = {};
  const sp = { profile: { name: 'م' }, courses: [{ id: 'a', name: 'تفاضل', code: '1', hours: 3 }, { id: 'b', name: 'برمجة', code: '2', hours: 3 }], tasks: [{ id: 't1', title: 'واجب', due: '2026-11-03', done: false }],
    exams: [], timetable: { 'Sun-10:00': { name: 'تفاضل' } }, attendance: {}, budget: [], grades: [] };
  const b = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', ss_seen_news: JSON.stringify('999'), space: JSON.stringify(sp) });
  const RD = b.w.Date; let clock = new Date(2026, 10, 2, 10, 0, 0).getTime();
  b.w.Date = class extends RD { constructor(...a){ if(a.length) super(...a); else super(clock); } static now(){ return clock; } };
  const w = b.w, D = w.document; await sl(900);
  const idb = fakeIDB(); w.indexedDB = idb;
  o.A_api = !!w.AutoSnap && typeof w.AutoSnap.take === 'function';
  o.T_saved = await w.AutoSnap.take() === 'saved';
  let l = await w.AutoSnap.list();
  o.T_index = l.length === 1 && l[0].d === '2026-11-02' && l[0].sum.courses === 2 && l[0].sum.tasks === 1 && !!idb.dbs.ss_snapshots['d:2026-11-02'].space;
  o.T_sameDay = await w.AutoSnap.take() === 'skip';
  clock += 86400000; o.T_unchanged = await w.AutoSnap.take() === 'skip';   /* يوم جديد بدون تغيير: ما في داعي لنسخة */
  /* 20 يوم بتعديل كل يوم */
  for(let i = 0; i < 20; i++){ clock += 86400000; w.space.tasks.push({ id: 'x' + i, title: 'مهمة ' + i, due: '', done: false }); w.saveSpace(); o['_d' + i] = await w.AutoSnap.take(); }
  Object.keys(o).filter(k => /^_d/.test(k)).forEach(k => { if(o[k] !== 'saved') o.T_daily = false; delete o[k]; });
  if(o.T_daily === undefined) o.T_daily = true;
  l = await w.AutoSnap.list();
  const keys = Object.keys(idb.dbs.ss_snapshots).filter(k => k.indexOf('d:') === 0);
  o.R_retention = l.length <= 11 && l.length >= 9 && keys.length === l.length && l.every(x => keys.includes('d:' + x.d));
  const days = l.map(x => x.d);
  o.R_recent7 = days.slice(0, 7).every((d, i) => i === 0 || (new Date(days[i - 1]) - new Date(d)) === 86400000);
  o.R_newestFirst = days.every((d, i) => i === 0 || days[i - 1] > d);
  /* الزر يظهر والاسترجاع يرجّع نسخة قديمة */
  w.refreshRestorePrevBtn(); await sl(60);
  o.U_button = D.getElementById('restorePrevBtn').style.display !== 'none';
  const oldest = l[l.length - 1];
  w.restorePreviousBackup(); await sl(120);
  const sel = D.querySelector('.modal-backdrop select');
  o.U_options = !!sel && [...sel.options].some(op => op.value === 'as:' + oldest.d) && [...sel.options].some(op => /نسخة تلقائية/.test(op.textContent));
  sel.value = 'as:' + oldest.d; sel.dispatchEvent(new w.Event('change', { bubbles: true }));
  const ok = [...D.querySelectorAll('.modal-backdrop button')].find(x => /حفظ|تأكيد|استرجاع|موافق/.test(x.textContent) && !/إلغاء/.test(x.textContent));
  const before = w.space.tasks.length; ok && ok.click(); await sl(250);
  o.U_restored = w.space.tasks.length === oldest.sum.tasks && w.space.tasks.length < before && !!w.localStorage.getItem('ss_pre_restore_backup');
  /* بدون IndexedDB: ما في كراش */
  delete w.indexedDB; w.indexedDB = undefined;
  o.N_noIdb = await w.AutoSnap.take() === 'unavailable';
  o.N_noIdbList = Array.isArray(await w.AutoSnap.list());
  o.Z_errs = !b.errs.filter(e => !/navigation|Not implemented/i.test(e)).length;
  if(!o.Z_errs) console.log(b.errs.slice(0, 5));
  console.log(JSON.stringify(o, null, 1));
  process.exit(0);
})().catch(e => { console.error('Error:', e); process.exit(1); });
