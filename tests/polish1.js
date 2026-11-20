/* ميزات التطوير الشامل: مهام متكررة، «شو أبدأ؟»، حماية الجدول من الاستبدال، توقع المعدل الصادق، تجميع الإجراءات، فئات الميزانية */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const dsK=k=>{ const d=new Date(); d.setDate(d.getDate()+k); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const base={profile:{name:'س'},courses:[{id:'c1',name:'شبكات',code:'',hours:3},{id:'c2',name:'فيزياء',code:'',hours:3}],tasks:[],exams:[],attendance:{},grades:[{name:'شبكات',items:[{name:'م',score:40,weight:50}]},{name:'فيزياء',items:[]}],timetable:{'Sun-08:00':{name:'شبكات',room:'1',end:'09:00'}},decks:[],budget:[],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify(base)}); await sl(2300);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)]; const sp=()=>w.space; const toasts=[]; w.toast=m=>toasts.push(String(m)); let confirmFn=null,confirmMsg=null; w.customConfirm=(m,ok)=>{ confirmMsg=m; confirmFn=ok; }; let undoFn=null; w.toastUndo=(m,fn)=>{ toasts.push(String(m)); undoFn=fn; };
 /* ===== مهام متكررة ===== */
 w.switchTab('tasks'); await sl(60); w.addTask(); await sl(250); o.R_fieldExists=!!Q('#mf_repeat')&&Q('#mf_repeat').options.length===3;
 Q('#mf_title').value='مراجعة أسبوعية'; Q('#mf_due').value=dsK(0); Q('#mf_repeat').value='weekly'; Q('#mSave').click(); await sl(80);
 let t=sp().tasks.find(x=>x.title==='مراجعة أسبوعية'); o.R_saved=!!t&&t.repeat==='weekly'&&(w.FocusUI.render(true),/🔁/.test(Q('#fxMain').innerHTML));
 toasts.length=0; w.toggleTask(t.id); await sl(40); const nxt=sp().tasks.filter(x=>x.title==='مراجعة أسبوعية'&&!x.done);
 o.R_spawnsNext=nxt.length===1&&nxt[0].due===dsK(7)&&nxt[0].repeat==='weekly'&&t.done&&toasts.some(m=>/جدولت التالية/.test(m));
 w.toggleTask(t.id); w.toggleTask(t.id); o.R_noDoubleSpawn=sp().tasks.filter(x=>x.title==='مراجعة أسبوعية').length===2;
 const dly={id:'dly',title:'ورد يومي',due:dsK(-3),done:false,repeat:'daily',order:99}; sp().tasks.push(dly); w.toggleTask('dly'); o.R_overdueRepeatsFromToday=sp().tasks.some(x=>x.title==='ورد يومي'&&!x.done&&x.due===dsK(1));
 w.editTask(nxt[0].id); await sl(250); o.R_editShowsRepeat=Q('#mf_repeat').value==='weekly'; Q('#mf_repeat').value=''; Q('#mSave').click(); await sl(80); o.R_editClears=!('repeat' in sp().tasks.find(x=>x.id===nxt[0].id));
 w.toggleTask(nxt[0].id); o.R_noRepeatNoSpawn=sp().tasks.filter(x=>x.title==='مراجعة أسبوعية').length===2;
 /* ===== شو أبدأ؟ ===== */
 sp().tasks=[{id:'a',title:'بعيدة',due:dsK(9),done:false},{id:'b',title:'اليوم عادية',due:dsK(0),done:false},{id:'c',title:'متأخرة عالية',due:dsK(-2),done:false,priority:'high'},{id:'d',title:'بدون موعد',done:false},{id:'e',title:'منجزة',due:dsK(-9),done:true}];
 o.N_picksOverdueHigh=w.pickNextTask().id==='c'; o.N_skipping=w.pickNextTask(['c']).id==='b'&&w.pickNextTask(['c','b']).id==='a'&&w.pickNextTask(['c','b','a']).id==='d'&&w.pickNextTask(['c','b','a','d'])===null;



 /* ===== «تجربة مثال» ما تستبدل جدولك بصمت ===== */
 w.switchTab('timetable'); await sl(80); w.renderTimetable(); const before=JSON.stringify(sp().timetable);

 confirmFn=null; w.loadExampleTimetable(); o.E_asksFirst=!!confirmFn&&/1 محاضرة/.test(confirmMsg)&&JSON.stringify(sp().timetable)===before;
 confirmFn(); await sl(30); o.E_replacedAfterConfirm=Object.keys(sp().timetable).length===6&&typeof undoFn==='function'; undoFn(); o.E_undoRestores=JSON.stringify(sp().timetable)===before;

 /* ===== توقع المعدل: مواد بلا علامات ما تخفّض ===== */




 /* ===== تجميع إجراءات موادي + فئات الميزانية ===== */


 w.switchTab('budget'); await sl(80); w.renderBudget(); await sl(150); const bp=Q('#budgetPlan'); const cats=bp?bp.querySelectorAll('.bp-cat').length:0; const more=bp&&bp.querySelector('details.bp-more');
 o.B_collapsedWhenNoActivity=!!more&&more.open===true&&cats>=10;
 sp().budget=[{id:'x',type:'expense',category:'food',amount:5,date:dsK(0),note:''}]; w.renderBudget(); await sl(150); const more2=Q('#budgetPlan details.bp-more'); o.B_activeFirst=!!more2&&!more2.open&&/باقي الفئات/.test(more2.textContent)&&Q('#budgetPlan > * .bp-cats, #budgetPlan .bp-cats').querySelectorAll('.bp-cat').length===1&&/طعام/.test(Q('#budgetPlan .bp-cats').textContent);
 o.B_limitsStillBound=(()=>{ const inp=more2.querySelector('.bp-limit'); return !!inp&&inp.getAttribute('data-cat')!==null; })();
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
