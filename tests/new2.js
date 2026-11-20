/* تنبيه الغياب، وضع الامتحانات، تذكير/قسم النسخة الاحتياطية، ومحاضرات ICS الأسبوعية */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const ds=off=>{const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());}; const cmp=s=>s.replace(/-/g,'');
const base={courses:[{id:'c1',name:'Data Structures',code:'0110102',hours:3},{id:'c2',name:'Databases',code:'0110200',hours:3}],tasks:[{id:'t1',title:'واجب',course:'Data Structures',due:ds(2),done:false}],exams:[],attendance:{'Data Structures':{present:9,absent:2}},grades:[{name:'Data Structures',items:[{name:'م',score:18,weight:30}]}],timetable:{'Sun-08:00':{name:'Existing',room:'A',end:'09:30'}},profile:{name:'T'},decks:[],budget:[],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify(base)}); await sl(2400);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)]; w.toast=m=>{ w.__lastToast=m; };

 /* ===== تنبيه الغياب ===== */
 const H=w.attendanceHint;
 o.A_none=H(0,0)===null&&H(10,0)===null&&H(30,2)===null;
 const h1=H(9,2); o.A_oneMore=h1&&h1.level==='warn'&&/تقدر تغيب 1 مرة/.test(h1.text);   /* allowed=floor(9/3)-2=1 */
 const h2=H(9,3); o.A_zeroLeft=h2&&/غياب واحد إضافي/.test(h2.text)&&h2.level==='warn';   /* 9/12=75% بالضبط: لسا ≥75 */
 const h3=H(9,4); o.A_below=h3&&h3.level==='danger'&&/تحت 75%/.test(h3.text);
 const h4=H(12,2); o.A_twoLeft=h4&&h4.level==='warn'&&/2 مرات|مرتين|2/.test(h4.text);
 o.A_noNoiseWhenSafe=H(30,1)===null&&H(0,0)===null;
 w.switchTab('attendance',false); w.renderAttendance(); await sl(80);
 w.FocusUI.go('attendance'); await sl(80); o.A_cardHint=/تقدر تغيب 1 مرة/.test(Q('#fxMain').textContent);
 w.space.attendance['Data Structures']={present:30,absent:1}; w.renderAttendance(); await sl(60); o.A_cardNoHintWhenSafe=!Q('#attendance .att-hint');
 w.space.attendance['Data Structures']={present:9,absent:1}; w.markAttendance('Data Structures','absent'); await sl(30); o.A_toastOnAbsent=/غياب واحد إضافي|تحت 75%|إضافية/.test(w.__lastToast||'');
 w.__lastToast=''; w.markAttendance('Data Structures','present'); await sl(30); o.A_noToastOnPresent=!w.__lastToast;

 /* ===== وضع الامتحانات ===== */
 const orderBefore=QA('#dashboard > [data-dsec]').map(e=>e.dataset.dsec).join();
 w.space.exams=[{id:'e1',name:'ميد DSA',course:'Data Structures',date:ds(2),time:'10:00',room:'H1'},{id:'e2',name:'بعيد',course:'Databases',date:ds(30)},{id:'e3',name:'ماضي',course:'Databases',date:ds(-2)}];
 w.S.set('focusLinks',{tasks:{},courses:{'Data Structures':75}});
 w.switchTab('dashboard',false); w.renderDashboard(); await sl(60);
 o.X_examModeGone=!Q('#examMode')&&!w.UX.renderExamMode&&!QA('#dashboard .em-row').length;   /* «وضع الامتحانات» حُذف (142): بطاقة الامتحان القادم + اقتراحات لك بدلها */
 o.X_dashLayoutUntouched=QA('#dashboard > [data-dsec]').map(e=>e.dataset.dsec).join()===orderBefore;
 w.space.exams=[];

 /* ===== النسخة الاحتياطية ===== */
 o.B_lastBackupRecorded=(()=>{ w.localStorage.removeItem('ss_last_backup'); w.URL.createObjectURL=()=> 'blob:x'; w.URL.revokeObjectURL=()=>{}; w.HTMLAnchorElement.prototype.click=function(){}; w.downloadBackup(true); return Math.abs(Date.now()-parseInt(w.localStorage.getItem('ss_last_backup'),10))<5000; })();
 w.SB.showSyncPanel(); await sl(60); o.B_panelSection=!!Q('.sync-backup')&&!!Q('#syncBkExport')&&!!Q('#syncBkImport')&&/آخر نسخة: اليوم/.test(Q('#syncBkInfo').textContent);
 let exp=0; const od=w.downloadBackup; w.downloadBackup=()=>{exp++;}; Q('#syncBkExport').click(); o.B_panelExport=exp===1; w.downloadBackup=od;
 let imp=0; w.restoreFromFile=()=>{imp++;}; Q('#syncBkImport').click(); o.B_panelImport=imp===1&&!Q('.sync-modal');
 w.localStorage.removeItem('ss_last_backup'); w.SB.showSyncPanel(); o.B_neverInfo=/ما أخذت نسخة بعد/.test(Q('#syncBkInfo').textContent); Q('#syncClose').click();
 /* التذكير */
 const day=86400000; const set=(k,v)=>w.localStorage.setItem(k,String(v)); const del=k=>w.localStorage.removeItem(k); d.querySelectorAll('.modal-backdrop').forEach(m=>m.remove());
 del('ss_last_backup'); del('ss_backup_nag'); set('ss_first_seen',Date.now()-2*day); w.UX.maybeNag(); o.N_notBefore7Days=!Q('#backupNag');
 set('ss_first_seen',Date.now()-9*day); w.UX.maybeNag(); o.N_shownAfter7Days=!!Q('#backupNag')&&/ما أخذت نسخة/.test(Q('#backupNag').textContent);
 w.UX.maybeNag(); o.N_noDuplicate=QA('#backupNag').length===1;
 Q('[data-nag=later]').click(); o.N_laterDismisses=!Q('#backupNag')&&Math.abs(Date.now()-parseInt(w.localStorage.getItem('ss_backup_nag'),10))<5000; w.UX.maybeNag(); o.N_notAgainSoon=!Q('#backupNag');
 del('ss_backup_nag'); set('ss_last_backup',Date.now()-3*day); w.UX.maybeNag(); o.N_notIfRecentBackup=!Q('#backupNag');
 set('ss_last_backup',Date.now()-10*day); w.UX.maybeNag(); o.N_shownIfOld=!!Q('#backupNag')&&/قبل 10 يوم/.test(Q('#backupNag').textContent);
 let nowCalls=0; w.downloadBackup=()=>{nowCalls++;}; Q('[data-nag=now]').click(); o.N_nowBacksUp=nowCalls===1&&!Q('#backupNag');
 const keep=JSON.stringify(w.space); const sp0=w.space.courses; w.space.courses=[]; w.space.tasks=[]; w.space.exams=[]; w.space.budget=[]; w.notes=[]; del('ss_backup_nag'); set('ss_last_backup',Date.now()-30*day); w.UX.maybeNag(); o.N_notWhenNoData=!Q('#backupNag'); w.space.courses=sp0;
 o.N_noAutoBackupSideEffects=nowCalls===1;

 /* ===== محاضرات ICS الأسبوعية ===== */
 const d1=ds(1), dows=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const dayOf=s=>dows[new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10)).getDay()];
 const firstSun=(()=>{ let i=1; while(dayOf(ds(i))!=='Sun') i++; return ds(i); })(), firstMon=(()=>{ let i=1; while(dayOf(ds(i))!=='Mon') i++; return ds(i); })();
 w.space.timetable={'Sun-08:00':{name:'Existing',room:'A',end:'09:30'},'Mon-09:00':{name:'Other',room:'B',end:'10:00'}};
 const L=a=>a.join('\r\n');
 const ics=L(['BEGIN:VCALENDAR',
  'BEGIN:VEVENT','UID:l1@x','SUMMARY:Data Structures Lecture','DTSTART:'+cmp(firstSun)+'T100000','DTEND:'+cmp(firstSun)+'T113000','RRULE:FREQ=WEEKLY;COUNT=4','CATEGORIES:Data Structures (0110102)','LOCATION:Hall 5','END:VEVENT',
  'BEGIN:VEVENT','UID:l2@x','SUMMARY:Conflict Lecture','DTSTART:'+cmp(firstSun)+'T080000','DTEND:'+cmp(firstSun)+'T093000','RRULE:FREQ=WEEKLY;COUNT=2','END:VEVENT',
  'BEGIN:VEVENT','UID:l3@x','SUMMARY:Overlap Lecture','DTSTART:'+cmp(firstMon)+'T093000','DTEND:'+cmp(firstMon)+'T104500','RRULE:FREQ=WEEKLY;COUNT=2','END:VEVENT',
  'BEGIN:VEVENT','UID:l4@x','SUMMARY:No end time','DTSTART:'+cmp(firstMon)+'T130000','RRULE:FREQ=WEEKLY;COUNT=2','END:VEVENT',
  'BEGIN:VEVENT','UID:l5@x','SUMMARY:Exam week review','DTSTART:'+cmp(ds(3))+'T090000','DTEND:'+cmp(ds(3))+'T100000','END:VEVENT',
  'END:VCALENDAR']);
 const I=w.IcsImport, ev=I.parseIcs(ics,ds(0)); o.Z_endTimeParsed=ev.events.find(e=>e.uid==='l1@x').endTime==='11:30'&&ev.events.find(e=>e.uid==='l4@x').endTime==='';
 const an=I.analyze(ev.events,ds(0)); const sl1=an.slots.find(s=>s.title==='Data Structures Lecture');
 o.Z_slotsFound=an.slots.length===3&&sl1&&sl1.day==='Sun'&&sl1.time==='10:00'&&sl1.end==='11:30'&&sl1.status==='new'&&sl1.match.course==='Data Structures'&&sl1.key==='Sun-10:00';
 o.Z_conflict=an.slots.find(s=>s.title==='Conflict Lecture').status==='conflict';
 o.Z_overlap=an.slots.find(s=>s.title==='Overlap Lecture').status==='overlap'&&/تتداخل/.test(an.slots.find(s=>s.title==='Overlap Lecture').note);
 o.Z_noEndNotSlot=!an.slots.some(s=>s.title==='No end time')&&!an.rows.find(r=>r.ev.title==='No end time').slotId;
 o.Z_oneOffNotSlot=!an.rows.find(r=>r.ev.title==='Exam week review').slotId;
 o.Z_seriesDefaultOff=an.rows.filter(r=>r.slotId).every(r=>!(r.status==='new'&&!r.past&&!r.slotId));
 /* واجهة */
 const ttBefore=JSON.stringify(w.space.timetable), tasksBefore=w.space.tasks.length;
 I.preview(ics,'lectures.ics'); await sl(80);
 o.Z_uiSection=!!Q('.ics-slots')&&QA('.ics-backdrop .ics-slot').length===3&&/محاضرات أسبوعية مكتشفة/.test(Q('.ics-slots').textContent);
 o.Z_uiDefaults=QA('.ics-backdrop .ics-slot input').every(c=>!c.checked)&&QA('.ics-backdrop .ics-slot input')[1].disabled&&!QA('.ics-backdrop .ics-slot input')[0].disabled&&!QA('.ics-backdrop .ics-slot input')[2].disabled;
 o.Z_seriesRowsOff=QA('.ics-backdrop .ics-row').filter(r=>/Data Structures Lecture/.test(r.textContent)).every(r=>!r.querySelector('input').checked)&&/جزء من محاضرة أسبوعية/.test(Q('.ics-backdrop').textContent);
 const sc=QA('.ics-backdrop .ics-slot input')[0]; sc.click(); await sl(30);
 o.Z_pickDisablesSeries=QA('.ics-backdrop .ics-row').filter(r=>/Data Structures Lecture/.test(r.textContent)).every(r=>r.querySelector('input').disabled&&!r.querySelector('input').checked);
 o.Z_noChangeBeforeConfirm=JSON.stringify(w.space.timetable)===ttBefore&&w.space.tasks.length===tasksBefore;
 Q('#icsCancel').click(); await sl(40); o.Z_cancelNoChange=JSON.stringify(w.space.timetable)===ttBefore;
 I.preview(ics,'lectures.ics'); await sl(80); QA('.ics-backdrop .ics-slot input')[0].click(); QA('.ics-backdrop .ics-slot input')[2].click(); await sl(20); const cnt=Q('#icsGo').textContent; Q('#icsGo').click(); await sl(80);
 const tt=w.space.timetable;
 o.Z_added=tt['Sun-10:00']&&tt['Sun-10:00'].name==='Data Structures'&&tt['Sun-10:00'].room==='Hall 5'&&tt['Sun-10:00'].end==='11:30';
 o.Z_overlapAddedByChoice=!!tt['Mon-09:30']&&tt['Mon-09:30'].name==='Overlap Lecture';
 o.Z_existingKept=tt['Sun-08:00'].name==='Existing'&&tt['Mon-09:00'].name==='Other'&&Object.keys(tt).length===4;
 o.Z_conflictNotWritten=!Object.values(tt).some(v=>v.name==='Conflict Lecture');
 o.Z_noSeriesTasks=!w.space.tasks.some(t=>/Data Structures Lecture|Overlap Lecture/.test(t.title));
 o.Z_conflictsVisible=w.getTimetableConflicts().list.length>=1;
 /* إعادة الاستيراد */
 const snapT=JSON.stringify(w.space.timetable); I.preview(ics,'lectures.ics'); await sl(80);
 const st=QA('.ics-backdrop .ics-slot').map(x=>x.textContent); o.Z_reimportSame=/موجودة بجدولك/.test(st[0])&&QA('.ics-backdrop .ics-slot input')[0].disabled; Q('#icsCancel').click(); await sl(40); o.Z_reimportNoChange=JSON.stringify(w.space.timetable)===snapT;
  /* ===== ترويسة x-space-code لسياسات التخزين ===== */
 { w.SB.init(); const opts=w.__sbOpts; let seen=null; w.fetch=(i,init)=>{ seen={url:String(i),h:new w.Headers(init.headers)}; return Promise.resolve({ok:true}); };
   o.H_optionsPassed=!!opts&&!!opts.global&&typeof opts.global.fetch==='function'&&opts.auth&&opts.auth.persistSession===false;
   await opts.global.fetch('http://x/storage',{method:'POST',headers:{apikey:'k',a:'b'}}); o.H_headerAdded=seen&&seen.h.get('x-space-code')===w.SB.getCode()&&/^[A-Z0-9]{6,32}$/.test(seen.h.get('x-space-code'))&&seen.h.get('apikey')==='k'&&seen.h.get('a')==='b';
   w.SB.setCode('abc123'); await opts.global.fetch('http://x/y',{}); o.H_followsCodeChange=seen.h.get('x-space-code')==='ABC123';
   await opts.global.fetch('http://x/z'); o.H_noInitSafe=seen.h.get('x-space-code')==='ABC123'; } o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse|navigation/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
