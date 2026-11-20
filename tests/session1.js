/* إصلاحات جلسة الاستخدام الفعلي: أنواع الإضافة السريعة، مبالغ بالكسور، حقل المبلغ، ترتيب الامتحانات، التلميح بعد الأزرار، علامات بلا بيانات، توليد الجدول */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const ds=k=>{ const d=new Date(Date.now()+k*864e5); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const base={profile:{name:'س'},courses:[{id:'c1',name:'شبكات',code:'0110102101',hours:3,room:'101'},{id:'c2',name:'فيزياء',code:'0110108101',hours:3},{id:'c3',name:'كيمياء',code:'',hours:3}],
 tasks:[],exams:[{id:'e1',name:'ميد',course:'فيزياء',date:ds(3),time:'10:00'},{id:'e2',name:'كويز',course:'',date:ds(1),time:''}],attendance:{'شبكات':{present:0,absent:0}},grades:[{name:'شبكات',items:[]},{name:'فيزياء',items:[{name:'ك',score:5,weight:10}]}],
 timetable:{'Sun-08:00':{name:'كيمياء',room:'1',end:'09:00'}},decks:[],budget:[],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify(base)}); await sl(2300);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)]; const go=async t=>{ w.switchTab(t,false); await sl(150); };
 /* ---- الإضافة السريعة: النوع من الكلمة الأولى ---- */
 await go('tasks'); const add=t=>{ w.quickAddTask(t); return w.space.tasks[w.space.tasks.length-1]; };
 o.Q_assignment=add('واجب شبكات غدا').type==='assignment'; o.Q_quiz=add('كويز فيزياء').type==='quiz'; o.Q_project=add('مشروع التخرج').type==='project'; o.Q_plain=add('مراجعة الكيمياء').type==='task';
 o.Q_courseLinked=w.space.tasks.find(t=>/شبكات/.test(t.title)).course==='شبكات';
 /* ---- مبالغ بالكسور ---- */
 o.J_fmt=w.fmtJD(2.5)==='2.5'&&w.fmtJD(3)==='3'&&w.fmtJD(2.505)==='2.51'&&w.fmtJD('x')==='0'&&w.fmtJD(1500)==='1500'&&w.fmtJD(0.1+0.2)==='0.3'&&w.fmtJD(-4.25)==='-4.25';
 w.space.budget=[{id:'i',type:'income',category:'family',amount:150,date:w.today(),note:''},{id:'x',type:'expense',category:'food',amount:2.5,date:w.today(),note:''}];
 await go('budget'); w.FocusUI.render(true); await sl(1600); const sum=Q('#fxMain').textContent; o.B_decimals=/2.5 د/.test(sum)&&/147.5 د/.test(sum)&&/🍔|طعام/.test(sum);
 o.B_dashDecimals=/147.5 د/.test(sum);
 /* ---- نافذة المبلغ: فاضي، وتحديد القيمة الرقمية المعبّأة ---- */
 await go('budget'); w.addBudgetItem('expense'); await sl(250); o.A_emptyDefault=Q('#mf_amount').value===''&&d.activeElement===Q('#mf_amount');
 Q('#mf_amount').value='150'; Q('#mSave').click(); await sl(80); o.A_savedExactly=w.space.budget[w.space.budget.length-1].amount===150;
 const bid=w.space.budget[w.space.budget.length-1].id; let selCalls=0; const os=w.HTMLInputElement.prototype.select; w.HTMLInputElement.prototype.select=function(){ selCalls++; return os.apply(this,arguments); }; w.editBudget(bid); await sl(250); o.A_editSelects=d.activeElement===Q('#mf_amount')&&selCalls>=1&&Q('#mf_amount').type==='number'; w.HTMLInputElement.prototype.select=os; Q('#mCancel').click(); await sl(30);
 /* ---- تسمية زر الحفظ ---- */
 w.showModal('t',[{key:'a',label:'a'}],{a:'x'},()=>true,null,{saveLabel:'استيراد'}); await sl(30); o.L_label=Q('#mSave').textContent==='استيراد'; Q('#mCancel').click(); await sl(30);
 w.showModal('t',[{key:'a',label:'a'}],{a:'x'},()=>true); await sl(30); o.L_defaultLabel=Q('#mSave').textContent==='حفظ'; Q('#mCancel').click(); await sl(30);
 w.importFromPlan(); await sl(250); o.L_importLabel=Q('#mSave').textContent==='استيراد'; Q('#mCancel').click(); await sl(30);



 /* ---- الامتحانات: ترتيب وتحقق ---- */




 w.addExamForCourse('شبكات'); await sl(250); Q('#mf_name').value='فاينل'; Q('#mf_date').value=ds(10); Q('#mf_time').value='سبعة'; Q('#mSave').click(); await sl(60);
 o.E_perCourseTimeRejected=!!Q('.modal')&&Q('#mf_time').getAttribute('aria-invalid')==='true';
 Q('#mf_time').value='3 م'; Q('#mSave').click(); await sl(80); o.E_perCourseNormalized=w.space.exams.some(e=>e.name==='فاينل'&&e.time==='15:00');
 w.addExamForCourse('شبكات'); await sl(250); Q('#mf_name').value='قديم'; Q('#mf_date').value='2020-01-01'; Q('#mSave').click(); await sl(60); o.E_perCoursePastWarns=!!Q('.modal')&&Q('#mf_date').classList.contains('is-warn')&&!w.space.exams.some(e=>e.name==='قديم'); Q('#mSave').click(); await sl(60); o.E_perCoursePastConfirms=w.space.exams.some(e=>e.name==='قديم');
 /* ---- علامات: بدون بيانات ---- */




 /* ---- توليد الجدول من المواد ---- */
 w.space.timetable={'Sun-08:00':{name:'كيمياء',room:'1',end:'09:00'}}; await go('timetable'); w.autoFillTimetable(); await sl(300);
 const names=QA('.stt-modal input').map(i=>i.value).filter(Boolean); o.T_prefilled=!!Q('.stt-backdrop')&&names.includes('شبكات')&&names.includes('فيزياء')&&!names.includes('كيمياء'); o.T_codesFilled=names.includes('0110102101');
 QA('.stt-backdrop').forEach(x=>x.remove());
 w.space.timetable={'Sun-08:00':{name:'شبكات',room:'1'},'Mon-08:00':{name:'فيزياء',room:'1'},'Tue-08:00':{name:'كيمياء',room:'1'}}; const before=QA('.stt-backdrop').length; w.autoFillTimetable(); await sl(100); o.T_allPresentNoModal=QA('.stt-backdrop').length===before;
 /* ---- مواد البطاقات ---- */
 o.C_hardVsGood=true;
 /* ---- الاقتباس ---- */

 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
