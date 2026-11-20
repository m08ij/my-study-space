/* اختبار الميزات الجديدة: توقع التقدم، ربط التركيز، أهداف الادخار، المساعد، نظافة الدوال. */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const base={courses:[],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'T'},decks:[],budget:[],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify(base)}); await sl(2400);
 const d=w.document, o={}; const Q=s=>d.querySelector(s), QA=s=>[...d.querySelectorAll(s)];
 global.FETCH=()=>Promise.reject(new Error('offline')); w.fetch=(...a)=>global.FETCH(...a);
 Object.defineProperty(w,'crypto',{value:require('crypto').webcrypto,configurable:true}); w.TextEncoder=TextEncoder;
 const pad=n=>String(n).padStart(2,'0'); const ds=off=>{const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());};
 const ev=(el,t)=>el.dispatchEvent(new w.Event(t,{bubbles:true}));
 const set=(id,v)=>{ const e=Q('#'+id); e.value=v; ev(e,'change'); };
 w.toast=()=>{};

 /* ===== توقع التقدم الأكاديمي ===== */
 const P=w.Progress;
 w.space.courses=[{id:'c1',name:'م1',hours:3},{id:'c2',name:'م2',hours:2}]; w.space.grades=[{name:'م1',items:[{name:'a',score:18,weight:30},{name:'b',score:9,weight:10}]},{name:'م2',items:[]},{name:'فارغة',items:[{name:'x',score:0,weight:0}]}];
 const pr=P.courseProjection(w.space.grades[0]); o.P_cur=Math.abs(pr.cur-67.5)<1e-9&&pr.min===27&&pr.max===87&&pr.remaining===60;
 o.P_skipEmpty=P.courseProjection(w.space.grades[1])===null&&P.courseProjection(w.space.grades[2])===null;
 const rep=P.report(); o.P_report=rep.rows.length===1&&rep.hours===3&&rep.gpa>0&&rep.gpaMin<=rep.gpa&&rep.gpa<=rep.gpaMax;
 o.P_letter=P.letterFor(95).label==='A'&&P.letterFor(44.9).label==='F'&&P.letterFor(100).label==='A'&&P.letterFor(-5)!==null;
 w.switchTab('grades',false); await sl(80); o.P_cardRendered=/معدلك المتوقع/.test(Q('#fxMain').textContent);
 w.space.grades=[]; w.FocusUI.render(true); await sl(60); o.P_emptyState=!/معدلك المتوقع/.test(Q('#fxMain').textContent);











 /* ===== أهداف الادخار ===== */
 const G=w.BudgetPlan._calc.goalStatus; const now=ds(0);
 let g1=G({target:1000,saved:0,date:ds(60)},300,now); o.G_calc=Math.abs(g1.months-60/30.4375)<1e-9&&Math.abs(g1.required-1000/(60/30.4375))<1e-6&&g1.feasible===false&&Math.abs(g1.eta-1000/300)<1e-9;
 o.G_feasible=G({target:600,saved:0,date:ds(61)},400,now).feasible===true;
 o.G_done=G({target:500,saved:500,date:ds(10)},0,now).done===true&&G({target:500,saved:900,date:''},0,now).done===true;
 const od=G({target:500,saved:100,date:ds(-3)},50,now); o.G_overdue=od.overdue&&od.required===400&&od.feasible===false;
 const nd=G({target:500,saved:0,date:''},0,now); o.G_noDateNoNet=nd.months===null&&nd.eta===null&&nd.feasible===null;
 w.localStorage.removeItem('budgetPlan'); w.space.budget=[{id:'i',type:'income',category:'salary',amount:900,date:ds(-1)},{id:'e',type:'expense',category:'food',amount:300,date:ds(-1)}];
 w.switchTab('budget',false); w.renderBudget(); await sl(60); Q('[data-bp-tab=goals]').click(); await sl(40);
 set('bpGName','لابتوب'); set('bpGTarget','1200'); set('bpGSaved','200'); set('bpGDate',ds(150)); Q('#bpGAdd').click(); await sl(50);
 const gs=JSON.parse(w.localStorage.getItem('budgetPlan')).goals; o.G_added=gs.length===1&&gs[0].target===1200&&gs[0].saved===200&&/لابتوب/.test(Q('#budgetPlan').textContent);
 Q('#bpGName').value=''; Q('#bpGTarget').value='0'; Q('#bpGAdd').click(); await sl(30); o.G_rejectInvalid=JSON.parse(w.localStorage.getItem('budgetPlan')).goals.length===1;
 const gi=Q('[data-goal-add]'); gi.value='300'; Q('[data-goal-plus]').click(); await sl(40); o.G_addSaved=JSON.parse(w.localStorage.getItem('budgetPlan')).goals[0].saved===500;
 o.G_notTransaction=w.space.budget.length===2;
 Q('[data-goal-del]').click(); await sl(30); const cb=d.getElementById('cConfirm'); cb&&cb.click(); await sl(40); o.G_deleted=JSON.parse(w.localStorage.getItem('budgetPlan')).goals.length===0;

 /* ===== المساعد: Esc ومسح المحادثة ===== */
 w.localStorage.setItem('ss_n8n_base','https://n8n.test/webhook'); w.localStorage.setItem('ss_asst_consent','1');
 global.FETCH=()=>Promise.resolve({ok:true,status:200,text:()=>Promise.resolve('{"answer":"أهلين"}')});
 d.getElementById('aiFab').click(); await sl(300); const panel=d.getElementById('aiPanel'); o.AI_opens=panel.classList.contains('show');
 d.getElementById('aiInput').value='مرحبا'; d.getElementById('aiSend').click(); await sl(600); o.AI_hasMessages=d.querySelectorAll('#aiMessages .ai-msg').length>=2;
 d.getElementById('aiClear').click(); o.AI_cleared=d.querySelectorAll('#aiMessages .ai-msg').length===0&&!!d.querySelector('#aiMessages .asst-welcome');
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); o.AI_escCloses=!panel.classList.contains('show');

 /* ===== نظافة الدوال المكررة + رسائل التأكيد ===== */
 o.D_deadFnRemoved=typeof w.deleteMyCourse==='undefined'&&['renderCourses','renderExams','renderAttendance','renderGradeCalc','renderPlan'].every(k=>typeof w[k]==='function');
 w.space.budget=[{id:'z',type:'income',category:'salary',amount:5,date:now}]; let msg=''; const oc=w.customConfirm; w.customConfirm=(m)=>{msg=m;};
 w.clearBudget(); o.D_clearBudgetCount=/1 معاملة/.test(msg)&&/نسخة احتياطية/.test(msg);
 w.gpaRows=[{name:'x',hrs:3,grade:'A (90-100)'}]; w.clearGpa(); o.D_clearGpaCount=/1 مادة/.test(msg); w.customConfirm=oc;
 /* ===== النسخ الاحتياطي لخطة الميزانية وربط التركيز ===== */
 w.localStorage.removeItem('budgetPlan'); w.localStorage.removeItem('focusLinks');
 let sn=w.gatherSnapshot(); o.B_snapshotKeysNullWhenUnused=('budgetPlan' in sn)&&sn.budgetPlan===null&&sn.focusLinks===null;
 const plan={openingBalance:250,balanceDate:'2026-01-01',monthlyBudget:400,limits:{food:100,'__proto__':5},recurring:[{id:'r',type:'expense',category:'housing',amount:150}],scenarios:[{id:'s',name:'توفير',expensePct:-10}],goals:[{id:'g',name:'لابتوب',target:900,saved:100,date:'2027-01-01'}],horizon:6};
 w.S.set('budgetPlan',plan); w.S.set('focusLinks',{tasks:{t1:50},courses:{'م1':50}});
 sn=w.gatherSnapshot(); o.B_snapshotIncludes=sn.budgetPlan&&sn.budgetPlan.monthlyBudget===400&&sn.budgetPlan.goals.length===1&&sn.focusLinks.tasks.t1===50;
 const fileJson=JSON.stringify(sn); const parsed=JSON.parse(fileJson,(k,v)=>k==='__proto__'?undefined:v);
 o.B_validateOk=w.validateBackup(parsed).ok===true;
 o.B_validateRejectsBad=w.validateBackup(Object.assign({},parsed,{budgetPlan:'oops'})).ok===false&&w.validateBackup(Object.assign({},parsed,{focusLinks:[1]})).ok===false;
 /* مسح محلي ثم استعادة من النسخة */
 w.localStorage.removeItem('budgetPlan'); w.localStorage.removeItem('focusLinks'); w.applyServerData(parsed);
 const rp=JSON.parse(w.localStorage.getItem('budgetPlan')); o.B_restoredPlan=rp&&rp.openingBalance===250&&rp.monthlyBudget===400&&rp.limits.food===100&&rp.goals[0].target===900&&rp.recurring.length===1&&rp.scenarios.length===1;
 o.B_restoredFocus=JSON.parse(w.localStorage.getItem('focusLinks')).tasks.t1===50;
 o.B_protoSafe=!Object.prototype.hasOwnProperty.call(rp.limits,'__proto__')&&({}).polluted===undefined;
 /* نسخة قديمة بلا المفاتيح لا تمسح المحلي */
 const old=JSON.parse(fileJson); delete old.budgetPlan; delete old.focusLinks; w.applyServerData(old); o.B_oldBackupKeepsLocal=JSON.parse(w.localStorage.getItem('budgetPlan')).monthlyBudget===400&&JSON.parse(w.localStorage.getItem('focusLinks')).tasks.t1===50;
 /* قيم تالفة تُتجاهل ولا تكسر */
 w.applyServerData(Object.assign({},parsed,{budgetPlan:[1,2],focusLinks:'x'})); o.B_badValuesIgnored=JSON.parse(w.localStorage.getItem('budgetPlan')).monthlyBudget===400;
 w.applyServerData(Object.assign({},parsed,{focusLinks:{tasks:{a:'نص',b:-5,c:30},courses:{}}})); const fl=JSON.parse(w.localStorage.getItem('focusLinks')); o.B_focusSanitized=fl.tasks.c===30&&!('a' in fl.tasks)&&!('b' in fl.tasks);
 w.applyServerData(Object.assign({},parsed,{budgetPlan:{monthlyBudget:'abc',openingBalance:NaN,limits:{food:'x',bills:50},recurring:'no',goals:[null,{id:'g2',name:'x',target:10,saved:0,date:''}]}})); const rp2=JSON.parse(w.localStorage.getItem('budgetPlan')); o.B_planFieldsSanitized=!('monthlyBudget' in rp2)&&rp2.limits.bills===50&&!('food' in rp2.limits)&&!('recurring' in rp2)&&rp2.goals.length===1;
 w.localStorage.setItem('budgetPlan',JSON.stringify(plan)); w.switchTab('budget',false); w.renderBudget(); await sl(60); Q('[data-bp-tab=month]').click(); await sl(40); set('bpOpen','999'); await sl(30); o.B_editStillSavesAndSnapshots=w.gatherSnapshot().budgetPlan.openingBalance===999;
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
