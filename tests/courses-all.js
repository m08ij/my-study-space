/* اختبار شامل لكل مواد القاعدة (130) والخطة (10 فصول): إضافة/حذف/تراجع/رقم المادة/الجدول/سلامة البيانات */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const base={profile:{name:'س'},courses:[],tasks:[],exams:[],attendance:{},grades:[],timetable:{},decks:[],budget:[],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify(base)}); await sl(2300);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)]; const DB=w.COURSES_DB, names=Object.keys(DB);
 const toasts=[]; w.toast=m=>toasts.push(String(m)); let undoFn=null; w.toastUndo=(m,fn)=>{ toasts.push(String(m)); undoFn=fn; };
 w.customConfirm=(m,ok)=>{ ok&&ok(); };            /* نؤكد تلقائياً (نختبر المنطق؛ نص التأكيد يُفحص بمواضع خاصة) */
 const sp=()=>w.space; const has=n=>sp().courses.some(c=>c.name===n);
 const residue=n=>[ has(n), !!sp().attendance[n], sp().grades.some(g=>g.name===n), Object.values(sp().timetable).some(e=>e.name===n), sp().exams.some(e=>e.course===n), sp().tasks.some(t=>t.course===n) ].filter(Boolean).length;
 const RENDERS=['renderDashboard','renderCourses','renderAttendance','renderGradeCalc','renderPlan','renderTimetable','renderExams']; const realR={}; RENDERS.forEach(f=>realR[f]=w[f]); const stub=keep=>RENDERS.forEach(f=>{ w[f]=(keep&&keep.includes(f))?realR[f]:()=>{}; });
 stub();
 const fails=[]; const chk=(k,ok,info)=>{ if(!ok) fails.push(k+(info?': '+info:'')); };

 /* ===== 1) كل مادة بالقاعدة: إضافة + سجلات + رقم + جدول ===== */
 names.forEach((n,i)=>{
  const c=DB[n]; const ok=w.addCourseEverywhere(n,c.code,c.h,{silent:true,noPrompt:true});
  chk('add:'+n,ok===true);
  const row=sp().courses.find(x=>x.name===n);
  chk('rec:'+n,!!row&&row.code===c.code&&row.hours===c.h&&!!sp().attendance[n]&&sp().grades.some(g=>g.name===n));
  chk('dup:'+n,w.addCourseEverywhere(n,c.code,c.h,{silent:true,noPrompt:true})===false);
  const f1=w.findCourseByCode(c.code), f2=w.findCourseByCode(String(c.code).replace(/^0+/,'')), f3=w.findCourseByCode('0'+String(c.code).replace(/^0+/,''));
  chk('code:'+n,f1&&f1.name===n&&f2&&f2.name===n&&f3&&f3.name===n);
  /* محاضرة لكل مادة بخانة فريدة (5 أيام × 26 نصف ساعة) + مهمة + امتحان */
  const day=w.DAYS_EN[i%5], mins=6*60+Math.floor(i/5)*30, hh=String(Math.floor(mins/60)).padStart(2,'0'), mm=String(mins%60).padStart(2,'0'), e=mins+25;
  sp().timetable[day+'-'+hh+':'+mm]={name:n,room:'R'+i,end:String(Math.floor(e/60)).padStart(2,'0')+':'+String(e%60).padStart(2,'0')};
  sp().tasks.push({id:'t'+i,title:'مهمة '+n,course:n,done:false}); sp().exams.push({id:'e'+i,name:'ميد',course:n,date:'2030-01-01'});
 });
 o.A_all130Added=sp().courses.length===names.length&&names.length===130;
 o.A_noConflictsInTT=w.getTimetableConflicts().list.length===0; o.A_tightButNotConflict=w.getTimetableTight(10).length>0&&w.getTimetableTight(10).every(p=>p.gap===5);
 o.A_integrityClean=w.checkDataIntegrity().length===0;
 o.A_hoursSummary=(()=>{ const s=w.planHoursSummary(); return s.current===names.reduce((a,n)=>a+DB[n].h,0)&&s.over===true&&s.done===0; })();
 /* ===== 2) حذف كل مادة: لا أثر ===== */
 let removedOk=0; names.forEach(n=>{ w.removeCourseEverywhere(n,{noUndo:true}); const r=residue(n); if(r===0||(r===1&&sp().tasks.some(t=>t.course===n))===false) removedOk++; else chk('rm:'+n,false,'residue='+r); });
 o.R_allRemoved=sp().courses.length===0&&Object.keys(sp().attendance).length===0&&sp().grades.length===0&&Object.keys(sp().timetable).length===0&&sp().exams.length===0;
 o.R_tasksUnlinkedKept=sp().tasks.length===130&&sp().tasks.every(t=>t.course==='');
 o.R_integrityCleanAfter=w.checkDataIntegrity().length===0; sp().tasks=[];
 /* ===== 3) التراجع الكامل عن حذف مادة (عينة) ===== */
 let undoOk=0; for(const n of [names[0],names[20],names[64],names[100],names[129]]){
  const c=DB[n]; w.addCourseEverywhere(n,c.code,c.h,{silent:true,noPrompt:true}); const id=sp().courses.find(x=>x.name===n).id;
  sp().attendance[n]={present:3,absent:1}; sp().grades.find(g=>g.name===n).items.push({name:'ك',score:5,weight:10}); sp().timetable['Sun-08:00']={name:n,room:'1',end:'09:00'}; sp().exams.push({id:'ex'+id,name:'ميد',course:n,date:'2030-01-01'}); sp().tasks.push({id:'tk'+id,title:'x',course:n,done:false});
  undoFn=null; w.removeCourseEverywhere(n); const gone=residue(n)===0||(residue(n)===1&&sp().tasks.find(t=>t.id==='tk'+id).course==='');
  const had=typeof undoFn==='function'; if(had) undoFn();
  const back=sp().courses.find(x=>x.name===n);
  if(gone&&had&&back&&back.id===id&&sp().attendance[n].present===3&&sp().grades.find(g=>g.name===n).items.length===1&&sp().timetable['Sun-08:00'].name===n&&sp().exams.some(e=>e.id==='ex'+id)&&sp().tasks.find(t=>t.id==='tk'+id).course===n) undoOk++; else chk('undo:'+n,false);
  w.removeCourseEverywhere(n,{noUndo:true}); delete sp().timetable['Sun-08:00']; sp().exams=[]; sp().tasks=[];
 }
 o.U_undoRestoresEverything=undoOk===5;
 /* ===== 4) إضافة بالرقم فقط من نافذة «+ مادة» لكل المواد (130) + بدون صفر بادئ ===== */
 stub(); w.switchTab('courses'); await sl(60); let byCode=0, byCodeNoZero=0;
 for(const n of names){
  const c=DB[n]; for(const [vi,variant] of [c.code, String(c.code).replace(/^0+/,'')].entries()){
   w.addMyCourse(); await sl(5); Q('#mf_name').value=''; Q('#mf_code').value=variant; Q('#mf_hours').value='3'; Q('#mSave').click();
   const row=sp().courses.find(x=>x.name===n);
   if(row&&row.hours===c.h&&row.code===c.code&&sp().attendance[n]&&sp().grades.some(g=>g.name===n)){ if(vi===0) byCode++; else byCodeNoZero++; }
   else { chk('byCode:'+n+':'+variant,false, row?('h='+row.hours+' code='+row.code):'missing'); if(Q('.modal')) Q('#mCancel').click(); }
   w.removeCourseEverywhere(n,{noUndo:true});
  }
 }
 o.N_byCodeAll=byCode===130; o.N_byCodeWithoutLeadingZero=byCodeNoZero===130;
 w.addMyCourse(); await sl(5); Q('#mf_name').value=''; Q('#mf_code').value='9999999999'; Q('#mSave').click(); o.N_unknownCodeRejected=!!Q('.modal')&&Q('#mf_name').getAttribute('aria-invalid')==='true'&&sp().courses.length===0; Q('#mCancel').click();
 w.addMyCourse(); await sl(5); const nm=names[10]; Q('#mf_name').value=nm; Q('#mf_code').value=''; Q('#mf_hours').value='3'; Q('#mSave').click(); const cr=sp().courses.find(x=>x.name===nm); o.N_nameFillsCode=!!cr&&cr.code===DB[nm].code&&cr.hours===DB[nm].h; w.removeCourseEverywhere(nm,{noUndo:true});
 stub(['renderPlan','renderCourses']); /* ===== 5) الخطة: كل فصل بأزرار + (حسب الواجهة) ثم حذف ===== */
 w.switchTab('plan'); await sl(100); o.P_hoursBar=/خلصت من خطتك/.test(Q('#fxMain').textContent);
 const SEM=w.SEMESTERS; let planAdded=0, planRows=0, lockShown=0;
 /* الخطة كاملة بالدوال نفسها اللي بتستعملها الواجهة (addCourseEverywhere) */
 SEM.forEach(s=>s.courses.forEach(c=>{ planRows++; const f=c.code&&c.code!=='—'?w.findCourseByCode(c.code):null; const nm=f?f.name:c.n; if(!has(nm)) w.addCourseEverywhere(nm,f?f.info.code:'',f?f.info.h:(c.h||3),{silent:true,noPrompt:true}); }));
 planAdded=sp().courses.length;
 const planNames={}; SEM.forEach(s=>s.courses.forEach(c=>{ const f=c.code&&c.code!=='—'?w.findCourseByCode(c.code):null; planNames[f?f.name:c.n]=1; }));
 o.P_everyPlanRowAdded=Object.keys(planNames).every(n=>has(n));
 o.P_recordsForAll=sp().courses.every(c=>sp().attendance[c.name]&&sp().grades.some(g=>g.name===c.name)); o.P_integrityClean=w.checkDataIntegrity().length===0;
 o.P_hoursBarUpdated=w.planHoursSummary().current>0;
 sp().courses.map(c=>c.name).forEach(n=>w.removeCourseEverywhere(n,{silent:true}));
 o.P_removedAllFromPlan=sp().courses.length===0&&Object.keys(sp().attendance).length===0&&sp().grades.length===0; o.P_integrityCleanAfterRemove=w.checkDataIntegrity().length===0;
 /* قفل المتطلبات: مادة بمتطلب سابق ناقص تعرض 🔒 ثم تختفي لما المتطلب يُسجَّل منجزاً */
 const withPre=names.find(n=>DB[n].pre&&DB[n].pre.length); const pre=DB[withPre].pre[0];
 o.L_missing=w.missingPrereqs(withPre).length===DB[withPre].pre.length; sp().completedCourses=[pre]; o.L_metWhenCompleted=!w.missingPrereqs(withPre).includes(pre); sp().completedCourses=[];
 const confirms=[]; w.customConfirm=(m,ok,opt)=>{ confirms.push(m); /* لا نؤكد: نتحقق من النص */ };
 w.addMyCourse(); await sl(5); Q('#mf_name').value=withPre; Q('#mf_code').value=DB[withPre].code; Q('#mSave').click(); o.L_confirmAsksPrereq=confirms.length===1&&confirms[0].includes(pre)&&!has(withPre);
 w.customConfirm=(m,ok)=>{ ok&&ok(); };
 stub(['renderCourses']); /* ===== 6) استيراد كل فصل من الخطة (10) ===== */
 let imp=0; for(let i=0;i<SEM.length;i++){
  w.importFromPlan(); await sl(5); Q('#mf_sem').value=String(i); Q('#mSave').click(); await sl(5);
  const bad=SEM[i].courses.filter(c=>!has((c.code&&c.code!=='—'&&w.findCourseByCode(c.code)&&w.COURSES_DB[c.n])?c.n:c.n)).length;
  const recs=sp().courses.every(c=>sp().attendance[c.name]&&sp().grades.some(g=>g.name===c.name));
  if(!bad&&recs) imp++; else chk('import:'+i,false,'bad='+bad+' recs='+recs);
 }
 o.I_allSemestersImported=imp===SEM.length; o.I_integrityClean=w.checkDataIntegrity().length===0; o.I_lockedToast=toasts.some(t=>/بمتطلب سابق ناقص/.test(t));
 stub(); /* ===== 7) فحص السلامة: يكتشف ويصلح بدون فقد بيانات ===== */
 const keep=sp().courses[0].name; sp().attendance['يتيمة فيها بيانات']={present:4,absent:1}; sp().attendance['يتيمة فاضية']={present:0,absent:0}; sp().grades.push({name:'علامات يتيمة',items:[{name:'a',score:1,weight:2}]}); sp().timetable['Thu-17:00']={name:'جدول يتيم',room:'',end:'17:30'}; sp().exams.push({id:'xo',name:'م',course:'مادة محذوفة',date:'2030-01-01'}); sp().tasks.push({id:'to',title:'م',course:'مادة محذوفة',done:false}); delete sp().attendance[keep];
 const iss=w.checkDataIntegrity(); const kinds=iss.map(i=>i.k);
 o.G_detects=['orphAtt','orphGr','orphTt','orphEx','orphTk','noatt'].every(k=>kinds.includes(k));
 w.openIntegrityCheck(); await sl(30); o.G_dialogListsAll=!!Q('.integ-list')&&QA('.integ-list li').length===iss.length&&!!Q('#igFix'); Q('#igFix').click(); await sl(30);
 o.G_fixed=w.checkDataIntegrity().length===0&&sp().attendance['يتيمة فيها بيانات'].present===4&&has('يتيمة فيها بيانات')&&!sp().attendance['يتيمة فاضية']&&sp().grades.find(g=>g.name==='علامات يتيمة').items.length===1&&has('علامات يتيمة')&&has('جدول يتيم')&&sp().exams.find(e=>e.id==='xo').course===''&&sp().tasks.find(t=>t.id==='to').course===''&&!!sp().attendance[keep];
 await sl(450); toasts.length=0; w.openIntegrityCheck(); o.G_cleanMessage=toasts.some(t=>/بياناتك سليمة/.test(t))&&!Q('.integ-list');
 o.G_settingsButton=!!Q('#integrityBtn');
 stub(RENDERS); /* ===== 8) الجدول الذكي: تداخل بأوقات بداية مختلفة + حفظ ينشئ علامات المادة ===== */
 sp().courses=[]; sp().attendance={}; sp().grades=[]; sp().timetable={}; toasts.length=0;
 const A=names[0], Bn=names[1], Cn=names[2];
 w.openSmartTimetable([{code:DB[A].code,name:A,matched:{name:A,info:DB[A]},days:['Sun','Tue'],timeFrom:'08:00',timeTo:'09:30',room:'a'},{code:DB[Bn].code,name:Bn,matched:{name:Bn,info:DB[Bn]},days:['Sun'],timeFrom:'09:00',timeTo:'10:00',room:'b'},{code:DB[Cn].code,name:Cn,matched:{name:Cn,info:DB[Cn]},days:['Mon'],timeFrom:'08:00',timeTo:'09:00',room:'c'}]); await sl(250);
 o.T_modalCountsOverlap=Q('[data-stat="conflicts"]').textContent==='1';
 Q('[data-action="save"]').click(); await sl(250);
 o.T_savedAndWarned=Object.keys(sp().timetable).length===4&&toasts.some(t=>/تعارض بالجدول/.test(t)&&t.includes(A)&&t.includes(Bn));
 o.T_gradesCreatedForNew=[A,Bn,Cn].every(n=>sp().grades.some(g=>g.name===n)&&sp().attendance[n]); o.T_integrityClean=w.checkDataIntegrity().length===0;
 const cf=w.getTimetableConflicts(); o.T_realConflictFlagged=cf.list.length===1&&cf.list[0].day==='Sun';
 /* حذف محاضرة من الجدول عبر المحرر ثم حذف المادة كاملة */
 w.editClassSlot('Mon-08:00'); await sl(250); Q('#mDel').click(); await sl(30); o.T_slotDeleted=!sp().timetable['Mon-08:00'];
 w.removeCourseEverywhere(A,{noUndo:true}); w.removeCourseEverywhere(Bn,{noUndo:true}); w.removeCourseEverywhere(Cn,{noUndo:true}); o.T_allGone=Object.keys(sp().timetable).length===0&&sp().courses.length===0&&w.checkDataIntegrity().length===0;
 o.failures=fails.slice(0,15); o.failureCount=fails.length; o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e));
 console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
