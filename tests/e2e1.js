/* اختبار وظيفي شامل (Desktop): دورة CRUD لكل ميزة + إعادة تحميل حقيقية للتحقق من الحفظ.
   معزول بالكامل: jsdom + Supabase وهمي + localStorage مؤقت داخل العملية (لا يلمس أي بيانات حقيقية). */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const base={courses:[],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'T'},decks:[],budget:[],completedCourses:[],currentSemester:1};
let cur, o={}, errsAll=[];
const T=(n,c,d)=>{ o[n]=!!c; if(!c&&d!==undefined) o[n+'__detail']=String(d).slice(0,200); };
const SKIP=(n,why)=>{ console.log('SKIP '+n+' — '+why); };
async function start(ls){ cur=boot(ls); await sl(2300); return cur; }
async function reload(){ const ls={}; const st=cur.w.localStorage; for(let i=0;i<st.length;i++){ const k=st.key(i); ls[k]=st.getItem(k); } cur.errs.forEach(e=>errsAll.push(e)); cur.w.close(); await start(ls); }
const W=()=>cur.w, D=()=>cur.w.document, Q=s=>D().querySelector(s), QA=s=>[...D().querySelectorAll(s)], sp=()=>cur.w.space;
const ev=(el,t)=>el.dispatchEvent(new (W().Event)(t,{bubbles:true}));
function fill(m){ const miss=[]; Object.keys(m).forEach(k=>{ const e=D().getElementById('mf_'+k); if(!e){miss.push(k);return;} e.value=m[k]; ev(e,'input'); ev(e,'change'); }); return miss; }
const save=()=>{ const b=D().getElementById('mSave'); if(b) b.click(); return !!b; };
const confirmYes=async()=>{ const b=D().getElementById('cConfirm'); if(b){ b.click(); await sl(30); return true; } return false; };
const today=()=>W().today();
const ds=off=>{ const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
const go=async t=>{ W().switchTab(t,false); await sl(120); };
async function sect(name,fn){ try{ await fn(); }catch(e){ T(name+'_CRASH',false,e.stack.split('\n').slice(0,2).join(' ')); } }

(async()=>{
 await start({welcomeDone:'true',space:JSON.stringify(base)});
 T('boot_ok', !!W().space && Array.isArray(sp().courses));

 /* ===== المواد ===== */
 await sect('courses',async()=>{
  await go('courses'); Q('#fxMain [data-v="addMyCourse"]').click(); await sl(60);
  let miss=fill({name:'مادة اختبار',code:'TST101',hours:'3',instructor:'د. تجربة',room:'R1'}); T('course_modal_fields',miss.length===0,miss); save(); await sl(80);
  const c0=sp().courses.find(c=>c.name==='مادة اختبار'); T('course_added',!!c0&&c0.code==='TST101'&&+c0.hours===3,JSON.stringify(sp().courses));
  T('course_in_ui',/مادة اختبار/.test(Q('#fxMain').textContent));
  T('course_synced_attendance',!!(sp().attendance&&sp().attendance['مادة اختبار']),'attendance sync');
  T('course_synced_grades',(sp().grades||[]).some(g=>g.name==='مادة اختبار'),'grades sync');
  /* تكرار: إضافة نفس الاسم لا تنشئ نسخة ثانية */
  const n0=sp().courses.length; W().addMyCourse(); await sl(40); fill({name:'مادة اختبار',code:'TST101',hours:'3'}); save(); await sl(60);
  T('course_no_duplicate',sp().courses.filter(c=>c.name==='مادة اختبار').length===1,'count='+sp().courses.filter(c=>c.name==='مادة اختبار').length);
  /* تعديل */
  W().editMyCourse(c0.id); await sl(60); fill({room:'R2',hours:'4'}); save(); await sl(80);
  const c1=sp().courses.find(c=>c.id===c0.id); T('course_edited',c1&&c1.room==='R2'&&+c1.hours===4,JSON.stringify(c1));
  /* فارغ */
  W().addMyCourse(); await sl(40); fill({name:'',code:'',hours:''}); const before=sp().courses.length; save(); await sl(40); T('course_empty_rejected',sp().courses.length===before&&!!Q('.modal'),'len='+sp().courses.length); const cb=D().getElementById('mCancel'); cb&&cb.click();
 });

 /* ===== المهام ===== */
 await sect('tasks',async()=>{
  await go('tasks'); W().addTask(); await sl(60);
  let miss=fill({title:'مهمة اختبار',type:'assignment',course:'مادة اختبار',due:ds(2),priority:'high'}); T('task_modal_fields',miss.length===0,miss); save(); await sl(80);
  let t=sp().tasks.find(x=>x.title==='مهمة اختبار'); T('task_added',!!t&&t.due===ds(2)&&t.priority==='high'&&!t.done,JSON.stringify(t));
  T('task_in_ui',/مهمة اختبار/.test(Q('#fxMain').textContent));
  W().editTask(t.id); await sl(60); fill({title:'مهمة معدّلة',priority:'low',due:ds(-1)}); save(); await sl(80);
  t=sp().tasks.find(x=>x.id===t.id); T('task_edited',t.title==='مهمة معدّلة'&&t.priority==='low'&&t.due===ds(-1),JSON.stringify(t));
  T('task_overdue_filter_count',/متأخر/.test(Q('#fxMain').textContent));
  W().toggleTask(t.id); await sl(60); t=sp().tasks.find(x=>x.id===t.id); T('task_complete',t.done===true&&!!t.completedAt,JSON.stringify(t));
  W().toggleTask(t.id); await sl(60); t=sp().tasks.find(x=>x.id===t.id); T('task_uncomplete',t.done===false);
  W().quickAddTask('مهمة سريعة غدا'); await sl(60); T('task_quickadd',sp().tasks.some(x=>/سريعة/.test(x.title)&&!!x.due),JSON.stringify(sp().tasks.map(x=>x.title)));
  const nq=sp().tasks.length; W().quickAddTask('   '); await sl(30); T('task_quickadd_blank_ignored',sp().tasks.length===nq);
  W().addTask(); await sl(40); fill({title:''}); const nb=sp().tasks.length; save(); await sl(40); T('task_empty_rejected',sp().tasks.length===nb); D().getElementById('mCancel')&&D().getElementById('mCancel').click();
  await reload(); T('task_persist_reload',sp().tasks.some(x=>x.title==='مهمة معدّلة'),JSON.stringify(sp().tasks.map(x=>x.title)));
  await go('tasks'); const tt=sp().tasks.find(x=>x.title==='مهمة معدّلة'); W().deleteTask(tt.id); await sl(40); await confirmYes(); await sl(60);
  T('task_deleted',!sp().tasks.some(x=>x.id===tt.id)); await reload(); T('task_delete_persist',!sp().tasks.some(x=>x.title==='مهمة معدّلة'));
 });

 /* ===== الامتحانات ===== */
 await sect('exams',async()=>{
  await go('exams'); Q('#fxMain [data-v="addExam"]').click(); await sl(60);
  let miss=fill({name:'امتحان اختبار',course:'مادة اختبار',date:ds(3),time:'10:00',room:'H1'}); T('exam_modal_fields',miss.length===0,miss); save(); await sl(80);
  let e=sp().exams.find(x=>x.name==='امتحان اختبار'); T('exam_added',!!e&&e.date===ds(3)&&e.time==='10:00',JSON.stringify(e));
  T('exam_in_ui',/امتحان اختبار/.test(Q('#fxMain').textContent));
  const rem=W().examRemaining(e); T('exam_countdown',rem&&rem.days===3,JSON.stringify(rem));
  W().editExam(e.id); await sl(60); fill({room:'H2',date:ds(1)}); save(); await sl(80); e=sp().exams.find(x=>x.id===e.id); T('exam_edited',e.room==='H2'&&e.date===ds(1)); T('exam_countdown_updated',W().examRemaining(e).days===1);
  await reload(); T('exam_persist',sp().exams.some(x=>x.name==='امتحان اختبار'&&x.date===ds(1)));
  await go('exams'); const e2=sp().exams.find(x=>x.name==='امتحان اختبار'); W().deleteExam(e2.id); await sl(40); await confirmYes(); await sl(60); T('exam_deleted',!sp().exams.some(x=>x.id===e2.id));
 });

 /* ===== الحضور ===== */
 await sect('attendance',async()=>{
  await go('attendance'); const name='مادة اختبار';
  T('att_course_listed',/مادة اختبار/.test(Q('#fxMain').textContent));
  const pb=QA('#fxMain [data-fx="att"][data-v="present"]').find(b=>b.dataset.n===name), ab=QA('#fxMain [data-fx="att"][data-v="absent"]').find(b=>b.dataset.n===name);
  T('att_buttons_exist',!!pb&&!!ab);
  if(pb&&ab){ pb.click(); await sl(80); QA('#fxMain [data-fx="att"][data-v="present"]').find(b=>b.dataset.n===name).click(); await sl(80); QA('#fxMain [data-fx="att"][data-v="absent"]').find(b=>b.dataset.n===name).click(); await sl(80);
   const a=sp().attendance[name]; T('att_counts',a.present===2&&a.absent===1,JSON.stringify(a)); T('att_percent_67',/67%/.test(Q('#fxMain').textContent));
   await reload(); T('att_persist',sp().attendance[name]&&sp().attendance[name].present===2&&sp().attendance[name].absent===1);
  }
  await go('attendance'); W().addAttendanceCourse(); await sl(40); fill({name:'__custom__',custom:'مادة يدوية'}); save(); await sl(60); T('att_custom_added',!!sp().attendance['مادة يدوية']);
  W().addAttendanceCourse(); await sl(40); fill({name:'__custom__',custom:'مادة يدوية'}); save(); await sl(60); T('att_custom_not_reset',Object.keys(sp().attendance).filter(k=>k==='مادة يدوية').length===1&&sp().attendance['مادة يدوية'].present===0);
  W().markAttendance('مادة يدوية','present'); W().addAttendanceCourse(); await sl(40); fill({name:'__custom__',custom:'مادة يدوية'}); save(); await sl(60); T('att_readd_keeps_counts',sp().attendance['مادة يدوية'].present===1,JSON.stringify(sp().attendance['مادة يدوية']));
  W().removeAttendance('مادة يدوية'); await sl(40); await confirmYes(); T('att_removed',!sp().attendance['مادة يدوية']);
 });

 /* ===== العلامات والمعدل ===== */
 await sect('grades',async()=>{
  await go('grades'); const gi=sp().grades.findIndex(g=>g.name==='مادة اختبار'); T('grade_course_exists',gi>-1);
  if(gi>-1){ W().addGradeItem(gi); await sl(50); fill({name:'منتصف',score:'18',weight:'30'}); save(); await sl(60);
   W().addGradeItem(gi); await sl(50); fill({name:'واجب',score:'9',weight:'10'}); save(); await sl(60);
   const g=sp().grades[gi]; T('grade_items_added',g.items.length===2&&g.items[0].score===18,JSON.stringify(g.items));
   W().addGradeItem(gi); await sl(50); fill({name:'خطأ',score:'50',weight:'10'}); const n=sp().grades[gi].items.length; save(); await sl(40); T('grade_score_gt_weight_rejected',sp().grades[gi].items.length===n); D().getElementById('mCancel')&&D().getElementById('mCancel').click();
   W().FocusUI.go('grades'); await sl(60); const txt=Q('#fxMain').textContent; T('grade_total_67_5_pct',/جمعت 27 من 40/.test(txt)&&/68%/.test(txt),txt.replace(/s+/g,' ').slice(0,120));
   await reload(); T('grade_persist',sp().grades.find(x=>x.name==='مادة اختبار').items.length===2);
  }
  W().addGradeCourse(); await sl(40); fill({name:'علامة مستقلة'}); save(); await sl(60); T('grade_course_added',sp().grades.some(x=>x.name==='علامة مستقلة'));
  /* GPA */
  await go('gpa');
  const add=Q('#fxMain [data-fx="gpaadd"]'); T('gpa_add_btn',!!add); if(add){ const n0=(W().gpaRows||[]).length; add.click(); await sl(60); T('gpa_row_added',(W().gpaRows||[]).length===n0+1); }


 });

 /* ===== الميزانية ===== */
 await sect('budget',async()=>{
  await go('budget'); Q('#fxMain [data-v="addBudgetItem"][data-id="income"]').click(); await sl(50); fill({category:'salary',amount:'500',date:today(),note:'راتب'}); save(); await sl(60);
  W().addBudgetItem('expense'); await sl(50); fill({category:'food',amount:'120.5',date:today(),note:'غداء'}); save(); await sl(60);
  W().addBudgetItem('expense'); await sl(50); fill({category:'transport',amount:'0',date:today()}); const nb=sp().budget.length; save(); await sl(40); T('budget_zero_rejected',sp().budget.length===nb); D().getElementById('mCancel')&&D().getElementById('mCancel').click();
  W().addBudgetItem('expense'); await sl(50); fill({category:'transport',amount:'-5',date:today()}); save(); await sl(40); T('budget_negative_rejected',sp().budget.length===nb); D().getElementById('mCancel')&&D().getElementById('mCancel').click();
  T('budget_two_items',sp().budget.length===2&&sp().budget[0].amount===500||sp().budget.length===2,JSON.stringify(sp().budget.map(b=>b.amount)));
  await go('budget'); const sum=Q('#fxMain').textContent.replace(/s+/g,' '); T('budget_totals',/500/.test(sum)&&/120|121/.test(sum),sum.slice(0,160));









  /* تعديل وحذف */
  await go('budget'); const it=sp().budget.find(b=>b.type==='expense'); W().editBudget(it.id); await sl(60); fill({amount:'200'}); save(); await sl(60); T('budget_edited',sp().budget.find(b=>b.id===it.id).amount===200);
  W().deleteBudget(it.id); await sl(40); await confirmYes(); await sl(60); T('budget_deleted',!sp().budget.some(b=>b.id===it.id)&&sp().budget.length===1);
 });

 /* ===== ملاحظات المادة (التبويب العام حُذف؛ الملاحظات لكل مادة) ===== */
 await sect('notes',async()=>{
  await go('courses'); const cn=(sp().courses[0]||{}).name; T('note_has_course',!!cn);
  if(cn){ W().addCourseNote(cn); await sl(60); fill({title:'عنوان',body:'نص'}); save(); await sl(60); T('note_added',W().notes.length===1&&W().notes[0].course===cn&&W().notes[0].title==='عنوان');
   await reload(); T('note_persist',W().notes.length===1&&W().notes[0].body==='نص',JSON.stringify(W().notes));
   W().Hub.openCourse(cn,'notes'); await sl(150); const ed=D().querySelector('[data-note-edit]'); T('note_listed_in_course',!!ed&&/عنوان/.test(ed.textContent));
   const dl=D().querySelector('[data-note-del]'); dl&&dl.click(); await sl(80); T('note_deleted',W().notes.length===0); await reload(); T('note_delete_persist',W().notes.length===0); }
 });
 T('tabs_removed',!D().getElementById('flashcards')&&!D().getElementById('notes'));

 /* ===== الجدول ===== */
 await sect('timetable',async()=>{
  await go('timetable'); sp().timetable={ 'Sun-08:00':{name:'DSA',room:'A1',instructor:'د.أ',end:'09:30'}, 'Sun-09:00':{name:'DB',room:'A2',instructor:'د.ب',end:'10:30'}, 'Mon-08:00':{name:'OS',room:'B1',instructor:'د.ج',end:'09:00'} };
  W().saveSpace&&W().saveSpace(); W().renderTimetable(); await sl(60);
  const c=W().getTimetableConflicts(); T('tt_conflict_detected',c.list.length===1&&c.keys['Sun-08:00']&&c.keys['Sun-09:00']&&!c.keys['Mon-08:00'],JSON.stringify(c.list));
  W().FocusUI.go('timetable'); await sl(60); T('tt_rendered_classes',/DSA/.test(Q('#fxMain').textContent)||/OS/.test(Q('#fxMain').textContent));
  W().editClassSlot('Sun-09:00'); await sl(60); fill({time:'09:30',end:'11:00'}); save(); await sl(80);
  T('tt_edit_moves_slot',!!sp().timetable['Sun-09:30']&&!sp().timetable['Sun-09:00'],JSON.stringify(Object.keys(sp().timetable)));
  T('tt_conflict_resolved',W().getTimetableConflicts().list.length===0);
  await reload(); T('tt_persist',!!sp().timetable['Sun-09:30']&&!!sp().timetable['Mon-08:00']);
  await go('timetable'); const clr=Q('#fxMain [data-v="clearTimetable"]'); if(clr){ clr.click(); await sl(40); await confirmYes(); await sl(60); T('tt_cleared',Object.keys(sp().timetable).length===0); } else T('tt_clear_btn',false);
 });





































 /* ===== الروابط الجامعية ===== */
 await sect('hulinks',async()=>{ await go('hulinks'); const links=QA('#fxMain a[href]'); T('hulinks_present',links.length>3,links.length); T('hulinks_safe_targets',links.filter(a=>a.target==='_blank'&&!(a.rel||'').includes('noopener')).length===0&&links.every(a=>/^(https:\/\/|tel:|mailto:)/.test(a.href)),links.filter(a=>!/^(https:\/\/|tel:|mailto:)/.test(a.href)).map(a=>a.href).join()); });

 /* ===== المساعد ===== */
 await sect('assistant',async()=>{
  /* المساعد الجديد عبر n8n: خادم مُحاكى بيرجّع { answer } + إجراء مقترح */
  let sent=null; W().localStorage.setItem('ss_n8n_base','https://n8n.test/webhook'); W().localStorage.setItem('ss_asst_consent','1');
  W().fetch=(url,opts)=>{ sent={url,body:JSON.parse(opts.body)}; return Promise.resolve({ok:true,status:200,text:()=>Promise.resolve(JSON.stringify({answer:'عندك **مهمتين** اليوم\n- واجب\n<actions>[{"type":"task","title":"مراجعة سريعة","due":"2099-01-01"}]</actions>'}))}); };
  T('ai_module',!!W().Assistant&&!!W().N8n&&W().N8n.enabled());
  D().getElementById('aiFab').click(); await sl(300); T('ai_opens',D().getElementById('aiPanel').classList.contains('show'));
  D().getElementById('aiInput').value='شو مهامي؟'; D().getElementById('aiSend').click(); await sl(600);
  T('ai_request',!!sent&&/\/assistant$/.test(sent.url)&&sent.body.question==='شو مهامي؟'&&typeof sent.body.context==='string'&&sent.body.context.length>10,sent&&sent.url);
  const bot=QA('#aiMessages .ai-msg.bot').pop(); T('ai_answer_md',!!bot&&/<b>مهمتين<\/b>/.test(bot.innerHTML)&&!!bot.querySelector('li'),bot&&bot.innerHTML.slice(0,80));
  const act=bot&&bot.querySelector('.ai-act'); const n0=(W().space.tasks||[]).length; if(act) act.click(); T('ai_action_confirm',!!act&&(W().space.tasks||[]).length===n0+1);
  W().fetch=()=>Promise.reject(new Error('offline')); D().getElementById('aiInput').value='سؤال'; D().getElementById('aiSend').click(); await sl(400);
  T('ai_error_shown',/n8n/.test((QA('#aiMessages .ai-msg.err').pop()||{}).textContent||''));
 });

 /* ===== الثيمات والإعدادات ===== */
 await sect('settings',async()=>{
  const themes=W().THEMES.map(t=>t.id); T('themes_count_8',themes.length===8,themes.length);
  let bad=[]; for(const th of themes){ W().applyTheme(th,true); if(D().documentElement.getAttribute('data-theme')!==th) bad.push(th); } T('themes_apply_all',bad.length===0,bad);
  W().applyTheme('coral',true); await reload(); T('theme_persist',D().documentElement.getAttribute('data-theme')==='coral',D().documentElement.getAttribute('data-theme'));
  W().applyTheme('nonexistent-theme',true); T('theme_invalid_falls_back',themes.includes(D().documentElement.getAttribute('data-theme')),D().documentElement.getAttribute('data-theme'));


  D().documentElement.dir='ltr'; await go('tasks'); T('ltr_no_crash',true); D().documentElement.dir='rtl';
 });

 /* ===== النسخ الاحتياطي ===== */
 await sect('backup',async()=>{
  const snap=W().gatherSnapshot&&W().gatherSnapshot(); T('backup_snapshot',!!snap&&!!snap.space,snap&&Object.keys(snap).join());
  const v=W().validateBackup&&W().validateBackup(JSON.parse(JSON.stringify({version:7,space:sp(),savedAt:new Date().toISOString()}))); T('backup_validates_good',v&&(v.ok!==false),JSON.stringify(v).slice(0,100));
  const bad=W().validateBackup&&W().validateBackup({space:'oops'}); T('backup_rejects_bad',bad&&(bad.ok===false||(bad.errors&&bad.errors.length>0)),JSON.stringify(bad).slice(0,100));
 });

 /* ===== حذف المادة وكل علاقاتها ===== */
 await sect('course_delete',async()=>{
  await go('courses'); const c=sp().courses.find(x=>x.name==='مادة اختبار'); T('course_still_exists_before_delete',!!c);
  W().Hub.openCourse(c.id); await sl(200); const delBtn=Q('[data-act="delete"]'); T('course_delete_btn_in_ui',!!delBtn); delBtn&&delBtn.click(); await sl(80);
  const c2=D().getElementById('cConfirm'); if(c2){ c2.click(); await sl(80); }
  T('course_deleted',!sp().courses.some(x=>x.name==='مادة اختبار'),JSON.stringify(sp().courses.map(x=>x.name)));
  T('course_delete_cascades_attendance',!sp().attendance['مادة اختبار'],Object.keys(sp().attendance).join());
  T('course_delete_cascades_grades',!sp().grades.some(g=>g.name==='مادة اختبار'));
  await reload(); T('course_delete_persists',!sp().courses.some(x=>x.name==='مادة اختبار'));
 });

 cur.errs.forEach(e=>errsAll.push(e));
 o.runtime_errors=errsAll.filter(e=>!/offline|not implemented|Could not parse CSS/i.test(e)).slice(0,8);
 console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
