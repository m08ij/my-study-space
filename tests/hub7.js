const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/^vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const saves=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}}));
  w.scrollTo=()=>{}; w.__ioInstances=[]; w.IntersectionObserver=class{constructor(cb){this.cb=cb;this.targets=[];this.disc=false;w.__ioInstances.push(this);} observe(t){this.targets.push(t);} unobserve(t){this.targets=this.targets.filter(x=>x!==t);} disconnect(){this.disc=true;this.targets=[];} fire(idx){const ts=idx.map(i=>this.targets[i]).filter(Boolean); this.cb(ts.map(t=>({isIntersecting:true,target:t})),this);} }; w.fetch=()=>Promise.reject(new Error('offline'));
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
setTimeout(async()=>{ const w=dom.window,o={}; const d=w.document; const sl=ms=>new Promise(r=>setTimeout(r,ms)); global.STORE={};
 let toasts=[]; w.toast=m=>toasts.push(m); const Q=s=>d.querySelector(s), QA=s=>Array.from(d.querySelectorAll(s));
 /* ===== validateBackup ===== */
 const V=w.validateBackup; const good={version:7,savedAt:'2026-10-01T10:00:00Z',space:{courses:[{id:'a',name:'م1'},{id:'b',name:'م2'}],tasks:[{id:'t',title:'x'}],exams:[{id:'e',name:'y'}],timetable:{'Sun-08:00':{name:'م1'}}},notes:[{title:'n'}]};
 const vg=V(good); o.V_good = vg.ok&&vg.summary.courses===2&&vg.summary.tasks===1&&vg.summary.exams===1&&vg.summary.notes===1&&vg.summary.lectures===1&&vg.warnings.length===0;
 o.V_notObject = !V(null).ok&&!V([]).ok&&!V('x').ok&&!V(5).ok;
 o.V_noSpace = !V({a:1}).ok&&!V({space:[]}).ok&&!V({space:'x'}).ok;
 o.V_coursesNotArray = !V({space:{courses:{}}}).ok&&!V({space:{tasks:'x'}}).ok&&!V({space:{exams:5}}).ok;
 o.V_courseNoName = !V({space:{courses:[{id:'a'}]}}).ok&&!V({space:{courses:[{id:'a',name:'  '}]}}).ok&&!V({space:{courses:['x']}}).ok&&!V({space:{courses:[{id:5,name:'x'}]}}).ok;
 const vd=V({space:{courses:[{id:'a',name:'x'},{id:'a',name:'y'}]}}); o.V_dupIds = !vd.ok&&vd.errors.some(e=>/مكررة/.test(e));
 o.V_badTask = !V({space:{tasks:[{id:'1'}]}}).ok&&!V({space:{tasks:[5]}}).ok; o.V_badExam = !V({space:{exams:[{id:'1'}]}}).ok;
 o.V_badNotes = !V({space:{},notes:'x'}).ok;
 const vw=V({version:9,space:{timetable:{'zzz':{name:'q'}}}}); o.V_warnings = vw.ok&&vw.warnings.length===3&&vw.summary.lectures===1;
 o.V_emptySpaceOk = V({space:{}}).ok;
 /* ===== الاستيراد عبر الملف ===== */
 w.addCourseEverywhere('حالية','111',3,{silent:true,noPrompt:true}); w.location.reload=()=>{};
 let conf=true, msgs=[]; w.customConfirm=(m,run,op)=>{msgs.push({m,op}); if(conf) run();}; w.confirm=()=>true;
 let inp; const oc=d.createElement.bind(d); d.createElement=function(t){const e=oc(t); if(t==='input') inp=e; return e;};
 async function pick(text,size){ w.restoreFromFile(); const f=new w.File([text],'b.json'); if(size) Object.defineProperty(f,'size',{value:size}); inp.onchange({target:{files:[f]}}); await sl(150); }
 toasts=[]; msgs=[]; await pick(JSON.stringify({space:{courses:[{id:'a',name:'x'},{id:'a',name:'y'}]}})); o.I_rejectDup = toasts.some(t=>/غير صالح/.test(t)&&/مكررة/.test(t))&&msgs.length===0&&w.space.courses.some(c=>c.name==='حالية');
 toasts=[]; await pick(JSON.stringify({space:{courses:[{name:''}]}})); o.I_rejectBad = toasts.some(t=>/غير صالح/.test(t))&&msgs.length===0;
 toasts=[]; await pick('{',0); o.I_rejectCorrupt = toasts.some(t=>/تالف/.test(t));
 toasts=[]; await pick('{}',11*1024*1024); o.I_rejectBig = toasts.some(t=>/كبير/.test(t))&&msgs.length===0;
 conf=false; msgs=[]; await pick(JSON.stringify(Object.assign({},good,{version:12}))); o.I_confirmAsked = msgs.length===1&&/في الملف: 2 مادة، 1 مهمة، 1 امتحان، 1 ملاحظة، 1 محاضرة/.test(msgs[0].m)&&/عندك الآن: 1 مادة/.test(msgs[0].m)&&/أحدث/.test(msgs[0].m)&&msgs[0].op.danger===false&&msgs[0].op.title==='استعادة نسخة احتياطية';
 o.I_cancelNoWrite = w.space.courses.some(c=>c.name==='حالية')&&!w.space.courses.some(c=>c.name==='م1')&&w.localStorage.getItem('ss_pre_restore_backup')===null;
 conf=true; await pick(JSON.stringify(good)); o.I_applied = w.space.courses.map(c=>c.name).sort().join()==='م1,م2'&&w.space.courses.map(c=>c.id).sort().join()==='a,b'&&w.space.tasks.length===1;
 const pre=JSON.parse(w.localStorage.getItem('ss_pre_restore_backup')||'null'); o.I_preBackup = !!pre&&pre.snapshot.space.courses.some(c=>c.name==='حالية');
 o.I_noProtoPollution = ({}).polluted===undefined;
 await pick('{"space":{"courses":[],"__proto__":{"polluted":1}}}'); o.I_protoStripped = ({}).polluted===undefined && w.Object.prototype.polluted===undefined;
 /* أسماء الملفات: عربي/مسافات/ASCII تنحفظ وتظهر كما هي */ { const S=w.SB, names=['ملخص المحاضرة 1.pdf','my notes v2.txt','report.pdf','ا'.repeat(120)+'.docx','a.b.c.png','noext','🙂 emoji.txt']; o.N_roundTrip = names.every(n=>{ const st=S.storedFileName(n); const shown=S.displayFileName(st); return /^[A-Za-z0-9_.\\-]+$/.test(st) && st.length<255 && (shown===n || (n.length>90 && shown.endsWith('.docx') && shown.length<n.length)); }); o.N_asciiPlain = /^\d+_report\.pdf$/.test(S.storedFileName('report.pdf')); o.N_legacyUnchanged = S.displayFileName('1700000000000_old_file.pdf')==='old_file.pdf' && S.displayFileName('1_a.b.pdf')==='a.b.pdf'; o.N_keepsExt = /\.pdf$/.test(S.storedFileName('ملف.pdf')) && S.getFileIcon(S.storedFileName('ملف.pdf'))==='📄'; }
 /* ===== ملفات المادة ===== */ w.addCourseEverywhere('ملفات','55',3,{silent:true,noPrompt:true});
 const cid=w.space.courses[0].id; const host=d.createElement('div'); host.innerHTML='<span data-files-count="'+cid+'"></span><div data-files-list="'+cid+'"></div><button data-upload-course="'+cid+'">📤 رفع ملف</button>'; d.body.appendChild(host);
 const F=(name,n)=>new w.File(['x'.repeat(n)],name); const keys=()=>Object.keys(global.STORE);
 await w.handleCourseFileUpload(cid,F('beta.pdf',300)); await w.handleCourseFileUpload(cid,F('alpha.docx',100)); await sl(5); await w.handleCourseFileUpload(cid,F('gamma.png',200)); await sl(300);
 o.F_uploaded = keys().length===3;
 const list=Q('[data-files-list="'+cid+'"]'); const items=()=>QA('[data-files-list="'+cid+'"] .course-file-item .cf-name').map(n=>n.textContent);
 o.F_listed = items().length===3&&Q('[data-files-count="'+cid+'"]').textContent==='3 ملف';
 o.F_tools = !!Q('[data-cf-q]')&&!!Q('[data-cf-sort]')&&QA('[data-cf-sort] option').length===5;
 o.F_downloadLink = QA('.cf-actions a[download]').length===3&&QA('.cf-actions a[target=_blank]').length===3;
 const sortSel=Q('[data-cf-sort]'); sortSel.value='name'; sortSel.dispatchEvent(new w.Event('change',{bubbles:true})); o.F_sortName = items().join()==='alpha.docx,beta.pdf,gamma.png'.replace(/,/g,',');
 sortSel.value='size'; sortSel.dispatchEvent(new w.Event('change',{bubbles:true})); o.F_sortSize = items().join()==='beta.pdf,gamma.png,alpha.docx';
 sortSel.value='type'; sortSel.dispatchEvent(new w.Event('change',{bubbles:true})); o.F_sortType = items().join()==='alpha.docx,beta.pdf,gamma.png';
 const qi=Q('[data-cf-q]'); qi.value='ALP'; qi.dispatchEvent(new w.Event('input',{bubbles:true})); o.F_search = items().join()==='alpha.docx'&&Q('[data-files-count="'+cid+'"]').textContent==='1 من 3 ملف';
 qi.value='zzz'; qi.dispatchEvent(new w.Event('input',{bubbles:true})); o.F_searchNone = /ما في ملفات تطابق/.test(list.textContent)&&!!Q('[data-cf-q]');
 qi.value=''; qi.dispatchEvent(new w.Event('input',{bubbles:true}));
 /* الحالة تبقى بعد إعادة التحميل */
 await w.loadCourseFilesForCard(cid); o.F_stateKept = Q('[data-cf-sort]').value==='type';
 /* تكرار: نفس الاسم والحجم يُسأل عنه */
 conf=false; msgs=[]; const before=keys().length; await w.handleCourseFileUpload(cid,F('beta.pdf',300)); o.F_dupAsks = msgs.length===1&&/بنفس الاسم والحجم/.test(msgs[0].m)&&keys().length===before;
 conf=true; msgs=[]; await w.handleCourseFileUpload(cid,F('beta.pdf',300)); await sl(100); o.F_dupConfirmedUploads = keys().length===before+1;
 conf=false; msgs=[]; await w.handleCourseFileUpload(cid,F('ملف عربي.pdf',77)); conf=false; await sl(300); const k1=keys().length; await w.handleCourseFileUpload(cid,F('ملف عربي.pdf',77)); o.F_arabicDupAsks = msgs.length===1 && keys().length===k1 && QA('.cf-name').some(n=>n.textContent==='ملف عربي.pdf'); conf=true;
 /* منع الرفع المتزامن لنفس الملف */
 const same=F('delta.txt',50); toasts=[]; const p1=w.handleCourseFileUpload(cid,same), p2=w.handleCourseFileUpload(cid,same); await Promise.all([p1,p2]); await sl(100);
 o.F_inflightGuard = keys().filter(k=>/delta/.test(k)).length===1&&toasts.some(t=>/قيد الرفع/.test(t));
 o.F_buttonRestored = Q('[data-upload-course="'+cid+'"]').disabled===false&&Q('[data-upload-course="'+cid+'"]').textContent==='📤 رفع ملف';
 toasts=[]; await w.handleCourseFileUpload(cid,F('empty.txt',0)); o.F_emptyRejected = toasts.some(t=>/فارغ/.test(t))&&!keys().some(k=>/empty/.test(k));
 const big=F('big.bin',10); Object.defineProperty(big,'size',{value:26*1024*1024}); toasts=[]; await w.handleCourseFileUpload(cid,big); o.F_bigRejected = toasts.some(t=>/كبير/.test(t))&&!keys().some(k=>/big/.test(k));
 /* حذف بتأكيد */
 conf=false; const k0=keys().length; QA('[data-del-file]')[0].click(); await sl(80); o.F_deleteCancel = keys().length===k0;
 conf=true; const tgt=QA('[data-del-file]')[0]; const tp=tgt.dataset.delFile; tgt.click(); await sl(400); o.F_deleteConfirmed = keys().length===k0-1&&!keys().includes(tp)&&items().length===k0-1;
 /* فشل التحميل: رسالة + إعادة محاولة */
 global.STORE_FAIL=true; w.__perfClearFileCache&&w.__perfClearFileCache(); await w.loadCourseFilesForCard(cid); o.F_errState = !!Q('[data-retry-files]')&&Q('[data-files-count="'+cid+'"]').textContent==='—'; global.STORE_FAIL=false;
 Q('[data-retry-files]').click(); await sl(400); o.F_retryRecovers = !Q('[data-retry-files]')&&items().length===k0-1;
 /* ملفات المادة لا تتأثر بإعادة تسمية المادة (id ثابت) */
 const c0=w.space.courses[0]; w.updateCourseEverywhere(c0.name,{name:'اسم جديد'}); await w.loadCourseFilesForCard(cid); o.F_afterRename = items().length===k0-1&&w.space.courses[0].id===cid;
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
