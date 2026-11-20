/* السحابة بطيئة عند الإقلاع: الموقع يرسم بيانات الجهاز بعد ~1.5 ث بدل ما يستنى، والقرار (تطبيق/رفع/تعارض) يتم لما يوصل الرد بدون ما يخسر تعديل */
const { device, mkCloud, sleep, T, res, names, cloudNames, settle, saveWait } = require('./lib.js');
(async () => {
  /* تجهيز: A يرفع A1 (v1)، ثم A1+A2 (v2) */
  const cloud = mkCloud();
  let A = device(cloud, { ss_sync_code: 'SLOWC1' }, 'A'); await settle();
  A.w.addCourseEverywhere('A1', '111', 3, { silent: true }); await saveWait();
  const lsV1 = A.dump();
  A.w.addCourseEverywhere('A2', '222', 3, { silent: true }); await saveWait();
  const lsV2 = A.dump(); A.close();
  T('prep السحابة فيها A1,A2', cloudNames(cloud) === 'A1,A2', cloudNames(cloud));

  /* 1) جهاز بنسخة قديمة + سحابة بطيئة (3 ث): رسم محلي أولاً ثم تطبيق الأحدث */
  cloud.delayLoad = 3000;
  let D = device(cloud, lsV1, 'old'); await sleep(2100);
  T('L1 رسم قبل رد السحابة', names(D) === 'A1' && D.w.bootSyncing === true && !!D.w.document.querySelector('#fxMain .fx-hello'), names(D) + ' sync=' + D.w.bootSyncing);
  const w1 = cloud.writes; await sleep(2200);
  const sp1 = JSON.parse(D.w.localStorage.getItem('space'));
  T('L2 لما وصل الرد: طُبّقت النسخة الأحدث', D.w._lateBoot === 'apply' && sp1.courses.map(c => c.name).join(',') === 'A1,A2' && D.w.cloudSyncBlocked === true, D.w._lateBoot);   /* الرفع موقوف لحد إعادة التحميل */
  T('L3 ولا كتابة على السحابة', cloud.writes === w1 && cloudNames(cloud) === 'A1,A2');
  D.close();

  /* 2) تعديل محلي أثناء الانتظار + السحابة أحدث ← تعارض (ما بينكتب فوق أي طرف) */
  D = device(cloud, lsV1, 'old-edit'); await sleep(1900);
  D.w.addCourseEverywhere('L1', '333', 3, { silent: true }); await sleep(300);
  const w2 = cloud.writes;
  T('C1 التعديل أثناء الانتظار ما انرفع', cloud.writes === w2 && !cloudNames(cloud).includes('L1'));
  await sleep(2600);
  T('C2 القرار تعارض + حوار', D.w._lateBoot === 'conflict' && !!D.w.document.querySelector('.sync-conflict-backdrop'), D.w._lateBoot);
  T('C3 الطرفين محفوظين', cloudNames(cloud) === 'A1,A2' && names(D).includes('L1') && !!D.w.getConflictBackup());
  D.close();

  /* 3) نفس النسخة وبدون تعديل: ما في تحديث ولا إعادة تحميل */
  D = device(cloud, lsV2, 'same'); await sleep(4300);
  T('S1 نفس النسخة: لا شيء يتطبّق', D.w._lateBoot === 'same' && D.w.bootSyncing === false && names(D) === 'A1,A2' && ![...D.w.document.querySelectorAll('.toast')].some(t => /وصلت بيانات أحدث/.test(t.textContent)), D.w._lateBoot + ' ' + D.w.bootSyncing + ' ' + names(D));
  D.w.addCourseEverywhere('S2', '444', 3, { silent: true }); await saveWait();
  T('S2 بعدها الرفع العادي شغّال', cloudNames(cloud).includes('S2'), cloudNames(cloud));
  const lsV3 = D.dump(); D.close();

  /* 4) سحابة سريعة: نفس السلوك القديم (القرار قبل الرسم) */
  cloud.delayLoad = 0;
  D = device(cloud, lsV3, 'fast'); await settle();
  T('F1 سحابة سريعة: بدون مسار متأخر', D.w._lateBoot === undefined && D.w.bootSyncing === false && names(D) === 'A1,A2,S2');
  D.close();

  /* 5) جهاز جديد بلا بيانات: بيستنى أطول (حتى 8 ث) عشان ما يبدأ فاضي */
  cloud.delayLoad = 3000;
  D = device(cloud, { ss_sync_code: 'SLOWC1' }, 'new'); await sleep(4200);
  T('N1 جهاز جديد: استلم السحابة قبل الرسم', D.w._lateBoot === undefined && names(D) === 'A1,A2,S2', names(D));
  D.close();

  /* 6) السحابة بطيئة ثم فشلت: محلي + منع الرفع (ما نكتب فوق سحابة ما قرأناها) */
  cloud.down = true;
  D = device(cloud, lsV3, 'down'); await sleep(4300);
  T('E1 فشل متأخر: محلي ورفع موقوف', D.w._lateBoot === 'error' && D.w.cloudSyncBlocked === true && names(D) === 'A1,A2,S2', D.w._lateBoot);
  /* 7) السحابة رجعت (مثلاً مشروع Supabase كان متوقف): إعادة المحاولة بترجّع الاتصال بدون إعادة تحميل */
  cloud.down = false;
  const rc = await D.w.retryCloud();
  T('R1 رجعت السحابة: اتصال بدون تحديث', rc === 'same' && D.w.cloudLoadFailed === false && D.w.cloudSyncBlocked === false, rc);
  D.w.addCourseEverywhere('R2', '999', 3, { silent: true }); await saveWait();
  T('R2 بعدها الرفع رجع يشتغل', cloudNames(cloud).includes('R2'), cloudNames(cloud));
  const lsR = D.dump(); D.close();
  /* 8) تعديل وقت الانقطاع ثم رجعت السحابة ← بينرفع (ما بينكتب فوقه) */
  cloud.down = true; cloud.delayLoad = 0;
  D = device(cloud, lsR, 'outage'); await settle();
  D.w.addCourseEverywhere('O9', '919', 3, { silent: true }); await saveWait();
  T('R3 وقت الانقطاع: محلي بس', !cloudNames(cloud).includes('O9') && D.w.cloudLoadFailed === true);
  cloud.down = false; const rc2 = await D.w.retryCloud(); await saveWait();
  T('R4 رجعت: تعديل الانقطاع انرفع', rc2 === 'keep-local' && cloudNames(cloud).includes('O9'), rc2 + ' ' + cloudNames(cloud));
  T('R5 بدون فشل: ما في محاولة', await D.w.retryCloud() === 'skip');
  D.close();
  cloud.down = false; cloud.delayLoad = 0;
  res.forEach(r => console.log(r));
  process.exit(0);
})().catch(e => { console.error('Error:', e); process.exit(1); });
