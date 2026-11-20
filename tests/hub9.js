const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/(^|\/)vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const saves=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}}));
  w.scrollTo=()=>{}; w.__ioInstances=[]; w.IntersectionObserver=class{constructor(cb){this.cb=cb;this.targets=[];this.disc=false;w.__ioInstances.push(this);} observe(t){this.targets.push(t);} unobserve(t){this.targets=this.targets.filter(x=>x!==t);} disconnect(){this.disc=true;this.targets=[];} fire(idx){const ts=idx.map(i=>this.targets[i]).filter(Boolean); this.cb(ts.map(t=>({isIntersecting:true,target:t})),this);} }; w.fetch=()=>Promise.reject(new Error('offline'));
  if(process.env.WMODE==='noname') w.localStorage.setItem('welcomeDone','true');
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
 const Q=s=>d.querySelector(s), QA=s=>Array.from(d.querySelectorAll(s)); const ov=Q('#welcomeOverlay'); const mode2=process.env.WMODE||'new';
 let toasts=[]; w.toast=m=>toasts.push(m);
 if(mode2==='existing'){
   o.X_noIsNew=!d.documentElement.classList.contains('is-new'); o.X_notShown=!ov.classList.contains('show')&&ov.style.display!==''||!ov.classList.contains('show'); o.X_name=w.space.profile.name==='محلي';
   o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);
 }
 if(mode2==='noname'){
   o.N_shown=ov.classList.contains('show'); o.N_isNew=true; o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);
 }
 /* ===== مستخدم جديد ===== */
 o.W_markup = !!Q('#welcomeTitle')&&!!Q('#welcomeSub')&&!!Q('#welcomeName')&&!!Q('#welcomeBtn')&&QA('.welcome-feats li').length===4&&ov.getAttribute('role')==='dialog'&&ov.getAttribute('aria-modal')==='true'&&ov.getAttribute('aria-labelledby')==='welcomeTitle';
 o.W_label = Q('label[for=welcomeName]').textContent.trim()==='ما اسمك؟';
 o.W_shown = ov.classList.contains('show');
 o.W_noOtherWelcomeUI = QA('.welcome-overlay').length===1;
 o.W_noFakeLogin = !/تسجيل الدخول|sign ?in|password|كلمة المرور/i.test(ov.textContent);
 o.W_focusInput = d.activeElement===Q('#welcomeName');
 /* اسم فارغ: رسالة داخلية، لا حفظ */
 const wd0=w.localStorage.getItem('welcomeDone'); Q('#welcomeBtn').click(); await sl(30);
 o.W_emptyErr = /اكتب اسمك/.test(Q('#welcomeErr').textContent)&&Q('.welcome-form').classList.contains('has-err')&&Q('#welcomeName').getAttribute('aria-invalid')==='true'&&ov.classList.contains('show')&&!ov.classList.contains('hide');
 o.W_emptyNoSave = w.localStorage.getItem('welcomeDone')===wd0&&!(w.space.profile&&w.space.profile.name);
 Q('#welcomeName').value='س'; Q('#welcomeName').dispatchEvent(new w.Event('input',{bubbles:true})); o.W_errClears = Q('#welcomeErr').textContent===''&&!Q('.welcome-form').classList.contains('has-err');
 /* حبس التركيز */
 Q('#welcomeBtn').focus(); const tab=new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}); Q('#welcomeBtn').dispatchEvent(tab); o.W_trapFwd = d.activeElement===Q('#welcomeName')&&tab.defaultPrevented;
 Q('#welcomeName').focus(); const stab=new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}); Q('#welcomeName').dispatchEvent(stab); o.W_trapBack = d.activeElement===Q('#welcomeBtn');
 /* بيانات موجودة قبل الدخول لا تُمسح */
 const coursesBefore=w.space.courses.length; w.space.tasks=[{id:'t1',title:'مهمة قديمة',type:'task',course:'',due:'',done:false}]; w.saveSpace();
 /* Enter + نقر مزدوج = تنفيذ واحد */
 Q('#welcomeName').value='  أحمد  '; const saves0=0; const sp0=JSON.stringify(w.space.tasks);
 Q('#welcomeName').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); Q('#welcomeBtn').click(); Q('#welcomeBtn').click(); await sl(60);
 o.W_savedName = w.space.profile.name==='أحمد'&&w.localStorage.getItem('welcomeDone')==='true';
 o.W_singleWelcomeToast = toasts.filter(t=>/أهلاً أحمد/.test(t)).length===0; /* التوست بعد 400ms */
 await sl(500); o.W_singleWelcomeToast = toasts.filter(t=>/أهلاً أحمد/.test(t)).length===1;
 o.W_hideClass = ov.classList.contains('hide')||ov.style.display==='none';
 await sl(300); o.W_closed = ov.style.display==='none'&&!ov.classList.contains('show')&&!d.documentElement.classList.contains('is-new');
 o.W_busyForm = Q('.welcome-form').classList.contains('busy');
 o.W_dataKept = JSON.stringify(w.space.tasks)===sp0&&w.space.courses.length===coursesBefore;
 o.W_mainFocus = d.activeElement===Q('main');
 o.W_dashboardVisible = w.FocusUI && w.FocusUI.view() === 'today' && !!Q('#fxMain .fx-hello');
 /* حالة تلف البيانات تُظهر الشاشة من جديد بوضعها المبسط */
 w.showWelcome(true); o.W_reopen = ov.style.display===''&&ov.classList.contains('show')&&!ov.classList.contains('hide')&&Q('#welcomeTitle').textContent==='مرحبًا بك مجددًا';
 ov.classList.remove('show'); ov.style.display='none';
 /* ===== التبويبات والأنيميشن ===== */
 w.switchTab('tasks',false); await sl(80); o.A_playSync = w.FocusUI.view()==='tasks';
 w.switchTab('courses',false); await sl(80); o.A_otherTabScrolls = w.FocusUI.view()==='courses';
 w.switchTab('dashboard',false); await sl(80); o.A_sameTabNoReplay = w.FocusUI.view()==='today';
 /* ===== showModal ===== */
 const opener=Q('#fxMain button')||Q('#settingsBtn'); opener.focus(); let calls=0; let got=null;
 w.showModal('اختبار',[{key:'title',label:'العنوان'},{key:'n',label:'ملاحظة',type:'textarea'}],{title:'',n:''},function(data){ calls++; got=data; return true; });
 const bd=Q('.modal-backdrop'); const m=Q('.modal');
 o.M_a11y = m.getAttribute('role')==='dialog'&&m.getAttribute('aria-modal')==='true'&&Q('label[for=mf_title]')!==null&&Q('label[for=mf_n]')!==null;
 await sl(150); o.M_focusFirst = d.activeElement===Q('#mf_title');
 Q('#mf_title').value='عنوان'; Q('#mf_n').value='س';
 const tEnter=new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}); Q('#mf_n').dispatchEvent(tEnter); o.M_enterInTextareaNoSubmit = calls===0&&!tEnter.defaultPrevented;
 const save=Q('#mSave'); Q('#mf_title').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); save.click(); save.click();
 o.M_enterSubmitsOnce = calls===1&&got.title==='عنوان'&&!Q('.modal-backdrop');
 o.M_focusRestored = d.activeElement===opener;
 /* إلغاء ثم نقرة متأخرة لا تنفذ */
 w.showModal('ثاني',[{key:'title',label:'العنوان'}],{title:'x'},function(){ calls++; return true; }); const sv2=Q('#mSave'); Q('#mCancel').click(); sv2.click(); o.M_cancelThenClickNoop = calls===1&&!Q('.modal-backdrop');
 /* الإدخال الفاشل لا يغلق */
 w.showModal('ثالث',[{key:'title',label:'العنوان'}],{title:''},function(){ return false; }); Q('#mSave').click(); o.M_rejectKeepsOpen = !!Q('.modal-backdrop'); Q('#mCancel').click();
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
