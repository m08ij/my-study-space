/* منجزة بنقرة + أرشيف الفصول + جدول المذاكرة + أزرار النسخ الاحتياطي + التحديث الكسول للشاشات */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const dsK=k=>{ const d=new Date(); d.setDate(d.getDate()+k); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const DE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const dow=k=>{ const d=new Date(); d.setDate(d.getDate()+k); return DE[d.getDay()]; };
const base={profile:{name:'س'},courses:[],tasks:[],exams:[],attendance:{},grades:[],timetable:{},decks:[],budget:[],completedCourses:[],currentSemester:3};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify(base)}); await sl(2300);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)]; const sp=()=>w.space, DB=w.COURSES_DB;
 const toasts=[]; w.toast=m=>toasts.push(String(m)); let undoFn=null; w.toastUndo=(m,fn)=>{ toasts.push(String(m)); undoFn=fn; }; let confirmMsg=null; w.customConfirm=(m,ok)=>{ confirmMsg=m; ok&&ok(); };
 /* ===== 1) منجزة بنقرة ===== */
 w.switchTab('tree'); await sl(100);
 const calc1='تفاضل وتكامل (1)', calc2='تفاضل وتكامل (2)';
 o.C_buttonsOnRows=typeof w.askCourseCompleted==='function';
 o.C_lockBefore=w.missingPrereqs(calc2).includes(calc1);
 w.askCourseCompleted(calc1); await sl(250); o.C_modalHasGrades=Q('#mf_grade').options.length===Object.keys(w.GRADES).length+1;
 Q('#mf_grade').value='B+ (80-84)'; Q('#mSave').click(); await sl(100);
 o.C_marked=sp().completedCourses.includes(calc1)&&sp().courseResults[calc1].grade==='B+ (80-84)'&&sp().courseResults[calc1].hours===DB[calc1].h;
 o.C_gpaRowAdded=w.gpaRows.length===1&&w.gpaRows[0].name===calc1&&w.gpaRows[0].grade==='B+ (80-84)'&&w.gpaRows[0].auto===true&&w.gpaRows[0].hrs===DB[calc1].h;

 o.C_hoursBarDone=w.planHoursSummary().done===DB[calc1].h;
 o.C_lockGone=w.missingPrereqs(calc2).length===0;
 w.markCourseCompleted('فيزياء عامة (1)',''); o.C_noGradeNoRow=w.gpaRows.length===1&&!sp().courseResults['فيزياء عامة (1)']&&sp().completedCourses.includes('فيزياء عامة (1)');
 w.unmarkCourseCompleted(calc1); await sl(80); o.C_undone=!sp().completedCourses.includes(calc1)&&!sp().courseResults[calc1]&&w.gpaRows.length===1&&w.gpaRows[0].name==='';
 w.unmarkCourseCompleted('فيزياء عامة (1)');
 /* العلامة تبقى ثابتة لو المادة مسجّلة حالياً: تنتقل من «مسجّل» إلى «منجز» */
 w.addCourseEverywhere(calc1,DB[calc1].code,DB[calc1].h,{silent:true,noPrompt:true}); const cur0=w.planHoursSummary().current; w.markCourseCompleted(calc1,'A (90-100)'); o.C_currentToDone=cur0===3&&w.planHoursSummary().current===0&&w.planHoursSummary().done===3; w.unmarkCourseCompleted(calc1); w.removeCourseEverywhere(calc1,{noUndo:true,silent:true});
 /* ===== 2) إغلاق الفصل ===== */
 const A='تفاضل وتكامل (1)',B='فيزياء عامة (1)',Cn='رسم هندسي يدوي';
 [A,B,Cn].forEach(n=>w.addCourseEverywhere(n,DB[n].code,DB[n].h,{silent:true,noPrompt:true}));
 sp().grades.find(g=>g.name===A).items=[{name:'ميد',score:45,weight:50}]; sp().grades.find(g=>g.name===B).items=[{name:'ميد',score:30,weight:50}];
 sp().attendance[A]={present:9,absent:1}; sp().timetable['Sun-08:00']={name:A,room:'1',end:'09:00'}; sp().timetable['Mon-10:00']={name:Cn,room:'2',end:'11:00'};
 sp().exams.push({id:'x1',name:'ميد',course:A,date:dsK(5)},{id:'x2',name:'م',course:'',date:dsK(6)}); sp().tasks.push({id:'tk1',title:'واجب',course:A,done:false});
 const ids=sp().courses.map(c=>c.id); const before=JSON.stringify({c:sp().courses,a:sp().attendance,g:sp().grades,t:sp().timetable,e:sp().exams,tk:sp().tasks,cc:sp().completedCourses,sem:sp().currentSemester,gr:w.gpaRows});
 w.switchTab('courses'); await sl(60); o.S_buttons=!!Q('#fxMain [data-v="closeSemester"]')&&!!Q('#fxMain [data-v="openSemesterArchive"]');
 Q('#fxMain [data-v="closeSemester"]').click(); await sl(250); o.S_dialogDefaultName=Q('#mf_name').value==='الفصل 3'; Q('#mf_name').value='خريف 2026'; confirmMsg=null; undoFn=null; Q('#mSave').click(); await sl(200);
 o.S_confirmListsCourses=!!confirmMsg&&confirmMsg.includes(A)&&confirmMsg.includes('(A)')&&confirmMsg.includes('بتقدر تتراجع');
 const arch=w.semesterArchive()[0];
 o.S_archived=!!arch&&arch.name==='خريف 2026'&&arch.courses.length===3&&arch.hours===DB[A].h+DB[B].h+DB[Cn].h&&arch.semNo===3;
 o.S_gradesRecorded=arch.courses.find(c=>c.name===A).grade==='A (90-100)'&&arch.courses.find(c=>c.name===A).pct===90&&arch.courses.find(c=>c.name===B).grade.startsWith('C')&&arch.courses.find(c=>c.name===A).att===90&&arch.courses.find(c=>c.name===A).items.length===1&&arch.courses.find(c=>c.name===Cn).grade==='';
 o.S_gpaOfSemester=typeof arch.gpa==='number'&&Math.abs(arch.gpa-((4*DB[A].h+2*DB[B].h)/(DB[A].h+DB[B].h)))<0.011;
 o.S_cleaned=sp().courses.length===0&&Object.keys(sp().attendance).length===0&&sp().grades.length===0&&Object.keys(sp().timetable).length===0&&sp().exams.length===1&&sp().exams[0].id==='x2';
 o.S_tasksKept=sp().tasks.length===1&&sp().tasks[0].course==='';
 o.S_completedAndGpa=[A,B,Cn].every(n=>sp().completedCourses.includes(n))&&w.gpaRows.filter(r=>r.auto).length===2&&sp().courseResults[A].grade==='A (90-100)'&&!sp().courseResults[Cn];
 o.S_semesterAdvanced=sp().currentSemester===4; o.S_undoOffered=typeof undoFn==='function'&&toasts.some(t=>/أُغلق «خريف 2026»/.test(t));
 undoFn(); await sl(50);
 o.S_undoRestoresAll=JSON.stringify({c:sp().courses,a:sp().attendance,g:sp().grades,t:sp().timetable,e:sp().exams,tk:sp().tasks,cc:sp().completedCourses,sem:sp().currentSemester,gr:w.gpaRows})===before&&sp().courses.map(c=>c.id).join()===ids.join()&&w.semesterArchive().length===0;
 /* أرشيف: إغلاق ثم عرض وحذف */
 Q('#fxMain [data-v="closeSemester"]').click(); await sl(250); Q('#mSave').click(); await sl(200); o.S_second=w.semesterArchive().length===1;
 Q('#fxMain [data-v="openSemesterArchive"]').click(); await sl(80); o.S_archiveModal=!!Q('.arch-card')&&/تفاضل وتكامل \(1\)/.test(Q('.arch-card').textContent)&&/A/.test(Q('.arch-card').textContent)&&/معدل الفصل/.test(Q('.arch-card').textContent);
 Q('[data-arch-del]').click(); await sl(250); o.S_archiveDeleted=w.semesterArchive().length===0&&/ما في فصول مؤرشفة/.test(Q('.arch-list').textContent)&&sp().completedCourses.includes(A); Q('#archClose').click(); await sl(300);
 w.closeSemester(); o.S_emptyCloseRefused=toasts.some(t=>/ما عندك مواد مسجّلة/.test(t)); w.semesterArchive();
 /* ===== 3) جدول المذاكرة ===== */
 sp().courses=[];sp().attendance={};sp().grades=[];sp().timetable={};sp().exams=[];sp().tasks=[];sp().completedCourses=[];
 const X='برمجة الحاسوب',Y='رياضيات متقطعة',Z='هندسة برمجيات';
 [X,Y,Z].forEach(n=>sp().courses.push({id:n,name:n,code:'',hours:3})); sp().exams.push({id:'e1',name:'ميد',course:X,date:dsK(3),time:'10:00'},{id:'e2',name:'ميد',course:Y,date:dsK(12),time:''}); sp().tasks.push({id:'t1',title:'t',course:Z,due:dsK(2),done:false});
 sp().timetable[dow(1)+'-10:00']={name:X,room:'',end:'11:00'}; sp().timetable[dow(2)+'-13:00']={name:Y,room:'',end:'14:30'};
 w.localStorage.removeItem('ss_study_plan'); const P=w.StudyPlan.build();
 o.P_sevenDays=P.days.length===7&&P.courses===3;
 const items=P.days.flatMap(x=>x.items.map(i=>({date:x.date,...i})));
 o.P_hasSessions=items.length>=6; o.P_perDayCap=P.days.every(x=>x.items.length<=3);
 o.P_noSessionOnOrAfterExam=!items.some(i=>i.course===X&&i.date>=dsK(3))&&!items.some(i=>i.course===Y&&i.date>=dsK(12));
 const m=t=>+t.slice(0,2)*60+ +t.slice(3); const lec=(date,s,e)=>items.some(i=>i.date===date&&m(i.start)<e+10&&m(i.end)>s-10);
 o.P_noOverlapLectures=!lec(dsK(1),600,660)&&!lec(dsK(2),780,870);
 /* أول يوم دراسة بعد اليوم (إن كان بكرة يوم راحة كالجمعة فلا جلسات فيه بحسب الإعداد، فلا نفترض أن days[1] دائماً يوم دراسة) */
 const firstStudyDay=P.days.slice(1).find(x=>!x.off&&x.items.length);
 o.P_nearestExamFirst=!!firstStudyDay&&firstStudyDay.items[0].course===X&&items.some(i=>i.course===X&&i.date<dsK(3));
 o.P_taskCourseGetsSessions=items.some(i=>i.course===Z)&&/مهمة مفتوحة|مراجعة/.test(items.find(i=>i.course===Z).reason);
 o.P_offDayEmpty=P.days.filter(x=>x.dow===5).every(x=>x.off&&x.items.length===0);
 o.P_withinHours=items.every(i=>m(i.start)>=480&&m(i.end)<=1260);
 o.P_todayNotInPast=P.days[0].items.every(i=>m(i.start)>=new Date().getHours()*60+new Date().getMinutes());
 o.P_noBackToBackSameCourse=P.days.every(x=>x.items.every((it,i)=>i===0||it.course!==x.items[i-1].course));
 w.switchTab('timetable'); await sl(120); w.FocusUI.render(true); await sl(60);
 o.P_cardRendered=!!Q('#fxMain .fx-sp')&&QA('#fxMain .fx-spi').length>0;
 Q('#fxMain [data-fx="sptog"]').click(); await sl(30); o.P_toggleHides=QA('#fxMain .fx-spi').length===0&&JSON.parse(w.localStorage.getItem('ss_study_plan')).on===false; Q('#fxMain [data-fx="sptog"]').click(); await sl(30);
 Q('#fxMain [data-fx="spcfg"]').click(); await sl(250); Q('#mf_from').value='18:00'; Q('#mf_to').value='18:10'; Q('#mSave').click(); await sl(40); o.P_cfgRejectsShortWindow=!!Q('.modal')&&Q('#mf_to').getAttribute('aria-invalid')==='true';
 Q('#mf_from').value='09:00'; Q('#mf_to').value='20:00'; Q('#mf_len').value='500'; Q('#mSave').click(); await sl(40); o.P_cfgRejectsBadLen=!!Q('.modal')&&Q('#mf_len').getAttribute('aria-invalid')==='true';
 Q('#mf_len').value='30'; Q('#mf_perDay').value='2'; Q('#mf_off').value=''; Q('#mSave').click(); await sl(80); const P2=w.StudyPlan.build();
 o.P_cfgApplied=P2.cfg.len===30&&P2.days.every(x=>x.items.length<=2&&!x.off)&&P2.days.flatMap(x=>x.items).every(i=>m(i.end)-m(i.start)===30);
 w.localStorage.removeItem('ss_study_plan');
 sp().courses=[]; o.P_emptyMessage=(w.FocusUI.render(true),/ما عندك مواد مسجّلة/.test(Q('#fxMain').textContent)); sp().courses=[X,Y,Z].map(n=>({id:n,name:n,code:'',hours:3}));
 sp().completedCourses=[X,Y,Z]; o.P_completedExcluded=w.StudyPlan.build().courses===0; sp().completedCourses=[];
 /* ===== 4) أزرار النسخ الاحتياطي بالإعدادات ===== */
 let exp=0,imp=0; w.downloadBackup=()=>{exp++;}; w.restoreFromFile=()=>{imp++;};
 o.B_buttons=!!Q('#settingsMenu #exportBackupBtn')&&!!Q('#settingsMenu #importBackupBtn'); Q('#exportBackupBtn').click(); Q('#importBackupBtn').click(); o.B_wired=exp===1&&imp===1;
 /* ===== 5) التحديث الكسول: شاشة الخطة ما تُرسم وهي مخفية، وتُرسم صح عند فتحها ===== */




 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e));
 console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
