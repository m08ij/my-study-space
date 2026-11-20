const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {device,mkCloud,sleep,T,res,names,cloudNames,settle,saveWait}=require('./lib.js');
(async()=>{
 const cloudNotes=c=>c.row&&c.row.data.notes?c.row.data.notes.map(n=>n.title||n.text||n.body||JSON.stringify(n)).join('|'):'(none)';
 /* S10: ثيم + ملاحظة أوفلاين ثم عودة الاتصال */
 let cloud=mkCloud(); let A=device(cloud,{ss_sync_code:'N10'+'AAA'},'A'); await settle(); A.w.addCourseEverywhere('s1','1',3,{silent:true}); await saveWait(); let ls=A.dump(); A.close();
 cloud.down=true; A=device(cloud,ls,'Aoff'); await settle();
 A.w.applyTheme('coral'); A.w.notes.push({id:'n1',title:'ملاحظة أوفلاين',text:'x',date:'2026-10-03'}); A.w.S.set('notes',A.w.notes); await saveWait();
 T('S10a أوفلاين: الرفع محظور والتعديل محلي',cloud.row.data.theme!=='coral'&&A.w.S.get('theme')==='coral'); ls=A.dump(); A.close(); cloud.down=false;
 A=device(cloud,ls,'Aon'); await settle(); await sleep(800);
 T('S10b عودة الاتصال: ثيم الجهاز محفوظ ولم يُستبدل بالسحابة',A.w.document.documentElement.getAttribute('data-theme')==='coral'&&A.w.S.get('theme')==='coral',A.w.document.documentElement.getAttribute('data-theme'));
 T('S10c الملاحظة المحلية محفوظة',A.w.notes.some(n=>n.id==='n1'),String(A.w.notes.length));
 T('S10d التعديلات رُفعت للسحابة',cloud.row.data.theme==='coral'&&JSON.stringify(cloud.row.data.notes||[]).includes('n1'),'cloudTheme='+cloud.row.data.theme);
 T('S10e بدون حوار تعارض',!A.w.document.querySelector('.sync-conflict-backdrop'));
 ls=A.dump(); A.close();
 /* S11: ملاحظة أوفلاين على A + تعديل space من B => تعارض (الاثنين تغيّروا) */
 let B=device(cloud,{ss_sync_code:ls.ss_sync_code},'B'); await settle(); B.w.addCourseEverywhere('fromB','2',3,{silent:true}); await saveWait(); B.close();
 cloud.down=true; let Aoff2=device(cloud,ls,'Aoff2'); await settle(); Aoff2.w.notes.push({id:'n2',title:'ملاحظة 2',text:'y',date:'2026-10-03'}); Aoff2.w.S.set('notes',Aoff2.w.notes); await saveWait(); const ls2=Aoff2.dump(); Aoff2.close(); cloud.down=false;
 const wBefore=cloud.writes; A=device(cloud,ls2,'Aconf'); await settle(); await sleep(800);
 T('S11 تعديل ملاحظة محلي + تعديل جهاز ثاني => حوار تعارض بلا كتابة',!!A.w.document.querySelector('.sync-conflict-backdrop')&&cloud.writes===wBefore,'writes '+wBefore+'→'+cloud.writes); A.close();
 /* S12: تغيير activeTab فقط (حالة واجهة) لا يُعتبر تعديلاً */
 cloud=mkCloud(); A=device(cloud,{ss_sync_code:'N12'+'AAA'},'A'); await settle(); ls=A.dump(); A.close();
 B=device(cloud,{ss_sync_code:ls.ss_sync_code},'B'); await settle(); B.w.addCourseEverywhere('fromB2','3',3,{silent:true}); await saveWait(); B.close();
 const ls3=Object.assign({},ls,{activeTab:JSON.stringify('timetable'),openSems:JSON.stringify([2,3])});
 A=device(cloud,ls3,'A2'); await settle(); T('S12 activeTab/openSems فقط: السحابة تُطبَّق بلا حوار',names(A)==='fromB2'&&!A.w.document.querySelector('.sync-conflict-backdrop'),names(A)); A.close();
 /* S13: بصمة قديمة (بدون v2) + لا تعديل + سحابة لم تتغير => لا حوار ولا خسارة */
 cloud=mkCloud(); A=device(cloud,{ss_sync_code:'N13'+'AAA'},'A'); await settle(); A.w.addCourseEverywhere('old1','4',3,{silent:true}); await saveWait(); ls=A.dump(); A.close();
 const legacy=Object.assign({},ls); legacy.ss_synced_hash=JSON.stringify('5:123'); /* بصمة بصيغة قديمة لا تطابق */
 A=device(cloud,legacy,'Alegacy'); await settle(); await sleep(800);
 T('S13 بصمة قديمة غير مطابقة: يُعتبر محلياً معدّلاً ويُرفع (لا فقد) ولا حوار',names(A)==='old1'&&!A.w.document.querySelector('.sync-conflict-backdrop')&&cloudNames(cloud).includes('old1'),names(A)); A.close();
 console.log(res.join('\n')); process.exit(0);
})();
