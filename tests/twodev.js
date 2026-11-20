const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {device,mkCloud,sleep,T,res,names,cloudNames,settle,saveWait}=require('./lib.js');
(async()=>{
 /* S1-S2 */
 let cloud=mkCloud(); let A=device(cloud,{ss_sync_code:'"X"'.slice(1,2)+'TEST1'},'A');
 await settle(); T('S1 cloud فاضية → A يرفع',cloud.writes>=1&&cloud.row, 'writes='+cloud.writes);
 A.w.addCourseEverywhere('A1','111',3,{silent:true}); await saveWait();
 T('S2 تعديل A انرفع للسحابة',cloudNames(cloud).includes('A1'),cloudNames(cloud));
 const verOk=A.w.localStorage.getItem('ss_cloud_ver'); T('ver محفوظ كرقم',/^\d{13}$/.test(verOk||''),verOk);
 /* reload A */ let lsA=A.dump(); A.close(); const w0=cloud.writes;
 A=device(cloud,lsA,'A2'); await settle(); T('S2b reload A: المواد موجودة بدون تعارض',names(A)==='A1'&&!A.w.document.querySelector('.sync-conflict-backdrop'),names(A));
 /* S3 B جهاز جديد */
 let B=device(cloud,{ss_sync_code:lsA.ss_sync_code},'B'); await settle(); T('S3 B جهاز جديد يستلم نسخة A',names(B)==='A1',names(B));
 /* S4 تعديلان متزامنان */
 B.w.addCourseEverywhere('B1','222',3,{silent:true}); await saveWait(); T('S4a B رفع B1',cloudNames(cloud).includes('B1'),cloudNames(cloud));
 const wBefore=cloud.writes;
 A.w.addCourseEverywhere('A2','333',3,{silent:true}); await saveWait();
 T('S4b A (قديم) لم يكتب فوق السحابة',cloud.writes===wBefore && cloudNames(cloud).includes('B1') && !cloudNames(cloud).includes('A2'),'writes '+wBefore+'→'+cloud.writes+' cloud='+cloudNames(cloud));
 T('S4c ظهر حوار التعارض',!!A.w.document.querySelector('.sync-conflict-backdrop'));
 const bk=A.w.getConflictBackup(); T('S4d نسخة احتياطية للطرفين',bk&&bk.local&&bk.cloud&&bk.local.space.courses.some(c=>c.name==='A2')&&bk.cloud.space.courses.some(c=>c.name==='B1'));
 /* اختيار: احتفظ بنسخة الجهاز */
 A.w.document.querySelector('#scLocal').click(); await saveWait();
 T('S4e اختيار "نسخة الجهاز" يرفع A2 ويحتفظ بنسخة السحابة بالـ backup',cloudNames(cloud).includes('A2')&&A.w.getConflictBackup().cloud.space.courses.some(c=>c.name==='B1'),cloudNames(cloud));
 /* S5: B قديم الآن؛ B يعدّل → تعارض → اختيار السحابة */
 B.w.addCourseEverywhere('B2','444',3,{silent:true}); await saveWait();
 T('S5a B قديم: حوار تعارض ولا كتابة',!!B.w.document.querySelector('.sync-conflict-backdrop'));
 const wB=cloud.writes; B.w.document.querySelector('#scCloud').click(); await sleep(300);
 T('S5b اختيار السحابة: B يطبّق A2 ولا يكتب',names(B).includes('A2')&&cloud.writes===wB&&B.w.getConflictBackup().local.space.courses.some(c=>c.name==='B2'),names(B));
 A.close();B.close();
 /* S6 أوفلاين ثم عودة، بدون تعارض */
 cloud=mkCloud(); A=device(cloud,{ss_sync_code:'"Q"'.slice(1,2)+'OFF22'},'A'); await settle();
 A.w.addCourseEverywhere('O1','555',3,{silent:true}); await saveWait(); lsA=A.dump(); A.close();
 cloud.down=true; A=device(cloud,lsA,'Aoff'); await settle(); T('S6a أوفلاين: محظور الرفع',A.w.cloudSyncBlocked===true);
 A.w.addCourseEverywhere('O2','666',3,{silent:true}); await saveWait(); T('S6b أوفلاين: لا كتابة، التعديل محلي',!cloudNames(cloud).includes('O2')&&names(A).includes('O2'));
 cloud.down=false; A.w.dispatchEvent(new A.w.Event('online')); await saveWait(); await sleep(800);
 T('S6c عودة الاتصال: التعديل المحلي انرفع بدون reload',cloudNames(cloud).includes('O2'),cloudNames(cloud)+' errs='+A.errs.join('|'));
 lsA=A.dump(); A.close();
 /* S7 أوفلاين على A + تعديل من B → تعارض عند الإقلاع */
 let B2=device(cloud,{ss_sync_code:lsA.ss_sync_code},'B2'); await settle(); B2.w.addCourseEverywhere('BX','777',3,{silent:true}); await saveWait(); const bxw=cloud.writes; B2.close();
 cloud.down=true; let Aoff=device(cloud,lsA,'Aoff2'); await settle(); Aoff.w.addCourseEverywhere('AX','888',3,{silent:true}); await saveWait(); lsA=Aoff.dump(); Aoff.close(); cloud.down=false;
 A=device(cloud,lsA,'Aon'); await settle(); await sleep(800);
 T('S7 تعارض عند الإقلاع: حوار بدون كتابة',!!A.w.document.querySelector('.sync-conflict-backdrop')&&cloud.writes===bxw,'writes '+bxw+'→'+cloud.writes);
 A.close();
 /* S8 بدون تعديلات محلية + تعديل من جهاز آخر → يطبّق بصمت */
 cloud=mkCloud(); A=device(cloud,{ss_sync_code:'N'+'OCON1'},'A'); await settle(); lsA=A.dump(); A.close();
 B=device(cloud,{ss_sync_code:lsA.ss_sync_code},'B'); await settle(); B.w.addCourseEverywhere('Z1','999',3,{silent:true}); await saveWait(); B.close();
 A=device(cloud,lsA,'A'); await settle(); T('S8 جهاز نظيف يطبّق تعديل الآخر بدون حوار',names(A)==='Z1'&&!A.w.document.querySelector('.sync-conflict-backdrop'),names(A)); A.close();
 /* S9 trigger يغيّر updated_at: لا تعارض كاذب */
 cloud=mkCloud(); cloud.trigger=true; A=device(cloud,{ss_sync_code:'T'+'RIG11'},'A'); await settle();
 for(const n of ['t1','t2','t3']){ A.w.addCourseEverywhere(n,'9'+n,3,{silent:true}); await saveWait(); }
 T('S9 trigger: 3 حفظات متتالية بدون تعارض كاذب',!A.w.document.querySelector('.sync-conflict-backdrop')&&cloudNames(cloud).includes('t3'),cloudNames(cloud)); A.close();
 console.log(res.join('\n')); process.exit(0);
})();
