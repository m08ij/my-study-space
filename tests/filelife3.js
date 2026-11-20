const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/^vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const saves=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}}));
  w.scrollTo=()=>{}; w.fetch=()=>Promise.reject(new Error('offline'));
  if(mode!=='nolocal'){}
  const sbMode=mode;
  const state={data:{version:7,space:{courses:[{id:'1',name:'سحابة',code:'1',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'سحابي'}},welcomeDone:true},updated_at:sbMode==='cloudOld'?'2020-01-01T00:00:00Z':new Date(Date.now()+3600e3).toISOString()};
  w.supabase={createClient(){return {from(){return {select(){return {eq(){return {maybeSingle:async()=>{
      if(sbMode==='error') return {error:{message:'net'},data:null};
      if(sbMode==='empty') return {data:null,error:null};
      return {data:state,error:null};}};}};},
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async(prefix)=>{ if(global.STORE_FAIL) return {data:null,error:{message:'StorageUnknownError'}}; const seen={},out=[]; Object.keys(global.STORE).forEach(k=>{ if(!k.startsWith(prefix+'/')) return; const rest=k.slice(prefix.length+1); const nm=rest.split('/')[0]; if(seen[nm]) return; seen[nm]=1; out.push(rest.includes('/')?{name:nm,id:null}:{name:nm,id:'x',metadata:{size:global.STORE[k].size,mimetype:'application/pdf'},created_at:'t'}); }); return {data:out,error:null}; }, upload:async(path,file)=>{ global.STORE[path]={size:file.size||1}; return {error:null}; }, remove:async(paths)=>{ paths.forEach(p=>{delete global.STORE[p];}); return {error:null}; }, getPublicUrl:(p)=>({data:{publicUrl:'http://x/'+p}})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={}; const d=w.document; w.toast=()=>{}; global.STORE={}; const sl=ms=>new Promise(r=>setTimeout(r,ms));
 const sp=()=>w.space; const find=n=>sp().courses.find(c=>c.name===n);
 let msg=null, run=null, confirmCalls=0; w.customConfirm=(m,f)=>{msg=m;run=f;confirmCalls++;};
 const dlg=()=>d.querySelector('.sync-conflict-backdrop #lfYes')?d.querySelector('.sync-conflict-backdrop'):null;
 const inFolder=id=>Object.keys(global.STORE).filter(k=>k.includes('/courses/'+id+'/'));
 const total=()=>Object.keys(global.STORE).length;
 const up=async(id,n)=>w.SB.uploadCourseFile(id,{name:n,size:5,type:'application/pdf'});
 /* S1 */
 w.addCourseEverywhere('مادة أ','7001',3,{silent:true,noPrompt:true}); const idA=find('مادة أ').id; await up(idA,'l1.pdf'); await up(idA,'l2.pdf');
 w.confirmRemoveCourse('مادة أ'); await sl(300); o.s1_msg=/\(2\)/.test(msg||'')&&/تبقى محفوظة/.test(msg); run(); await sl(100);
 const arch=(sp().archivedCourses||[])[0]; o.s1_archive=!!arch&&arch.id===idA&&arch.folders.length===1&&arch.folders[0]===idA&&arch.files===2; o.s1_storage=inFolder(idA).length===2;
 /* S2: إعادة الإضافة، "لا" */
 w.addCourseEverywhere('مادة أ','07001',3,{silent:true}); await sl(700); o.s2_prompt=!!dlg(); const idB=find('مادة أ').id; o.s2_newId=idB!==idA; o.s2_noAutoLink=!(find('مادة أ').filesFrom&&find('مادة أ').filesFrom.length)&&(await w.SB.listCourseFilesMulti([idB],true)).length===0;
 d.querySelector('#lfNo').click(); await sl(100); o.s2_archiveKept=(sp().archivedCourses||[]).some(a=>a.id===idA); o.s2_idUnchanged=find('مادة أ').id===idB;
 /* S3: ربط صريح: id الجديد لا يتغير، مرجع filesFrom فقط */
 w.addCourseEverywhere('x','x',3,{silent:true,noPrompt:true}); w.removeCourseEverywhere('x'); /* ضجيج بلا أثر */
 w.offerArchivedFiles(find('مادة أ')); await sl(700); o.s3_promptAgain=!!dlg(); d.querySelector('#lfYes').click(); await sl(150);
 const cur=find('مادة أ'); o.s3_idNotChanged=cur.id===idB; o.s3_oldIdNotReused=cur.id!==idA; o.s3_filesFrom=Array.isArray(cur.filesFrom)&&cur.filesFrom.length===1&&cur.filesFrom[0]===idA; o.s3_archiveRemoved=!(sp().archivedCourses||[]).some(a=>a.id===idA);
 o.s3_viewSeesOld=(await w.SB.listCourseFilesMulti([cur.id].concat(cur.filesFrom),true)).length===2; o.s3_storageUntouched=inFolder(idA).length===2;
 /* ظهور في الواجهة (loadCourseFilesForCard) */
 w.switchTab('courses',false); w.Hub.openCourse(cur.id); await sl(600); const listHtml=d.querySelector('[data-files-list="'+cur.id+'"]').innerHTML; o.s3_uiShowsFiles=listHtml.includes('l1.pdf')&&listHtml.includes('l2.pdf');
 /* S3b: رفع جديد يذهب لمجلد المادة الحالي (لا للقديم) */
 await up(cur.id,'new.pdf'); o.s3b_newUploadOwnFolder=inFolder(idB).length===1&&inFolder(idA).length===2;
 /* S3c: عدم ربط نفس المجلد بمادة ثانية */
 w.addCourseEverywhere('مادة ج','7001',3,{silent:true,noPrompt:true}); /* نفس الكود -> exists=false لأن كود 7001 موجود: يُرفض */
 o.s3c_dupCodeRejected=!find('مادة ج');
 sp().archivedCourses.unshift({id:idA,folders:[idA],name:'مادة أ',code:'7002',hours:3,deletedAt:new Date().toISOString(),files:2});
 w.addCourseEverywhere('مادة د','7002',3,{silent:true}); await sl(700); const dd=dlg(); o.s3c_promptForOther=!!dd; if(dd){ d.querySelector('#lfYes').click(); await sl(150); }
 o.s3c_blockedBecauseTaken=!(find('مادة د').filesFrom&&find('مادة د').filesFrom.length); sp().archivedCourses=(sp().archivedCourses||[]).filter(a=>a.id!==idA);
 /* S8: إعادة تسمية بعد الربط تحافظ على الملفات والمرجع */
 w.updateCourseEverywhere(cur.id,{name:'مادة أ معدلة'}); const ren=find('مادة أ معدلة'); o.s8_stable=ren.id===idB&&ren.filesFrom[0]===idA&&(await w.SB.listCourseFilesMulti(foldersFor(ren),true)).length===3;
 function foldersFor(c){return [c.id].concat(c.filesFrom||[]);}
 /* S9: حذف ثانٍ لمادة مرتبطة: الأرشيف يحمل المجلدين، وإعادة الإضافة تعرض الكل */
 w.confirmRemoveCourse('مادة أ معدلة'); await sl(300); o.s9_msgCountsAll=/\(3\)/.test(msg||''); run(); await sl(100);
 const a2=(sp().archivedCourses||[]).find(a=>a.id===idB); o.s9_archiveBothFolders=!!a2&&a2.folders.length===2&&a2.folders.indexOf(idA)>-1&&a2.folders.indexOf(idB)>-1; o.s9_noDuplicateArchive=(sp().archivedCourses||[]).filter(a=>a.id===idB).length===1; o.s9_storageUntouched=inFolder(idA).length===2&&inFolder(idB).length===1;
 w.addCourseEverywhere('مادة أ معدلة','7001',3,{silent:true}); await sl(700); o.s9_promptAll=!!dlg(); d.querySelector('#lfYes').click(); await sl(150); const fin=find('مادة أ معدلة'); o.s9_relinkedAll=fin.id!==idA&&fin.id!==idB&&fin.filesFrom.length===2&&(await w.SB.listCourseFilesMulti(foldersFor(fin),true)).length===3;
 /* لا ربط مرتين: استدعاء offer مرة ثانية بعد الربط لا يعرض شيئاً */
 w.offerArchivedFiles(fin); await sl(500); o.s9_noSecondPrompt=!dlg();
 /* الضغط المزدوج على الحذف: نافذة تأكيد واحدة */
 confirmCalls=0; w.confirmRemoveCourse('مادة أ معدلة'); w.confirmRemoveCourse('مادة أ معدلة'); await sl(400); o.s10_singleConfirm=confirmCalls===1; run&&0;
 /* S5: فشل Storage وقت الحذف: أرشفة بحالة غير معروفة */
 w.addCourseEverywhere('مادة ب','8001',3,{silent:true,noPrompt:true}); const idC=find('مادة ب').id; await up(idC,'b.pdf');
 global.STORE_FAIL=true; w.__perfClearFileCache(); w.confirmRemoveCourse('مادة ب'); await sl(1800); o.s5_unknownMsg=/تعذّر التحقق/.test(msg||''); global.STORE_FAIL=false; run(); await sl(100);
 const aC=(sp().archivedCourses||[]).find(a=>a.id===idC); o.s5_archivedUnknown=!!aC&&aC.files===null&&inFolder(idC).length===1;
 /* فشل أثناء عرض الملفات بعد الربط: رسالة إعادة محاولة (لا "لا ملفات") */
 global.STORE_FAIL=true; w.__perfClearFileCache(); w.Hub.openCourse(find('مادة أ معدلة').id); await sl(2200); const failHtml=d.querySelector('[data-files-list="'+find('مادة أ معدلة').id+'"]').innerHTML; o.s5_failShowsRetry=failHtml.includes('data-retry-files')&&!failHtml.includes('ما في ملفات'); global.STORE_FAIL=false;
 /* لم يُحذف أي ملف طوال الاختبار */
 o.noFileEverDeleted=total()===4;
 /* نسخة احتياطية/استعادة */
 const snap=JSON.parse(JSON.stringify(w.gatherSnapshot())); w.applyServerData(snap); o.s6_kept=(w.space.courses.find(c=>c.name==='مادة أ معدلة')||{}).filesFrom.length===0 ? false : true;
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);


