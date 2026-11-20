/* UX: تحقق داخل الحقل، حبس Tab، منع الحفظ/التأكيد المزدوج، تركيز الملاحظة الجديدة */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const base={courses:[],tasks:[],exams:[{id:'e1',name:'ميد',course:'',date:'2099-02-01',time:'10:00',room:''}],attendance:{},grades:[],timetable:{},profile:{name:'T'},decks:[],budget:[{id:'b1',type:'expense',category:'food',amount:5,date:'2099-01-01',note:''}],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify(base)}); await sl(2400);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)];
 const key=(el,k,sh)=>el.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,shiftKey:!!sh,bubbles:true,cancelable:true}));
 /* مهمة بدون عنوان: النافذة تبقى، الحقل معلَّم ومركَّز، ولا تُضاف مهمة */
 w.addTask(); await sl(200); Q('#mSave').click(); await sl(50);
 o.V_stays=!!Q('.modal'); o.V_marked=Q('#mf_title').getAttribute('aria-invalid')==='true'&&Q('#mf_title').classList.contains('is-invalid'); o.V_focus=d.activeElement===Q('#mf_title'); o.V_noTask=(w.space.tasks||[]).length===0;
 Q('#mf_title').value='س'; Q('#mf_title').dispatchEvent(new w.Event('input',{bubbles:true})); o.V_clears=!Q('#mf_title').hasAttribute('aria-invalid');
 /* حبس Tab */
 const btns=QA('.modal input,.modal select,.modal textarea,.modal button'); btns[btns.length-1].focus(); key(btns[btns.length-1],'Tab'); o.T_wrapFwd=d.activeElement===btns[0];
 key(btns[0],'Tab',true); o.T_wrapBack=d.activeElement===btns[btns.length-1];
 /* حفظ مزدوج: مهمة واحدة فقط */
 const sv=Q('#mSave'); sv.click(); sv.click(); await sl(60); o.D_oneTask=w.space.tasks.length===1;
 /* تعديل امتحان بدون اسم يُرفض */
 w.editExam('e1'); await sl(200); Q('#mf_name').value=''; Q('#mSave').click(); await sl(50); o.X_editRejected=!!Q('.modal')&&w.space.exams[0].name==='ميد'&&Q('#mf_name').getAttribute('aria-invalid')==='true';
 Q('#mCancel').click(); await sl(50);
 /* تعديل مبلغ صفر يُرفض */
 w.editBudget('b1'); await sl(200); Q('#mf_amount').value='0'; Q('#mSave').click(); await sl(50); o.B_editRejected=!!Q('.modal')&&w.space.budget[0].amount===5&&Q('#mf_amount').getAttribute('aria-invalid')==='true';
 Q('#mCancel').click(); await sl(50);
 /* تأكيد الحذف: نقرتان = حذف واحد/لا خطأ، وحبس Tab */
 let n=0; w.customConfirm('x',()=>{n++;}); await sl(50); const c=Q('#cConfirm'); key(c,'Tab'); o.C_wrap=d.activeElement===Q('#cCancel'); c.click(); c.click(); o.C_once=n===1;
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
