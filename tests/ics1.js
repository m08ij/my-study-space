/* قائمة الإعدادات، نافذة رمز المزامنة، واستيراد تقويم .ics (معاينة + تأكيد + منع التكرار) */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const base={courses:[{id:'c1',name:'Data Structures',code:'0110102',hours:3},{id:'c2',name:'مادة الرياضيات',code:'5555555',hours:3},{id:'c3',name:'Data Structures Lab',code:'0110103',hours:1}],tasks:[],exams:[],attendance:{},grades:[],timetable:{'Sun-08:00':{name:'DSA',room:'A',end:'09:30'}},profile:{name:'T'},decks:[],budget:[],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify(base)}); await sl(2400);
 const d=w.document, o={}, Q=s=>d.querySelector(s), QA=s=>[...d.querySelectorAll(s)]; w.toast=()=>{};
 const pad=n=>String(n).padStart(2,'0'); const ds=off=>{const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());}; const cmp=s=>s.replace(/-/g,'');

 /* ===== قائمة الإعدادات ===== */
 const ids=QA('#settingsMenu .settings-item').map(b=>b.id);
 o.M_removed=!Q('#pdfBtn')&&!Q('#backupBtn')&&!Q('#restoreBtn')&&!Q('#mmBtn')&&typeof w.openMindmapManual==='undefined';
 o.M_kept=['notifBtn','themeBtn','syncCodeBtn','calSyncBtn'].every(i=>ids.includes(i))&&ids.filter(i=>i==='calSyncBtn').length===1;
 o.M_labelKept=/التقويم/.test(Q('#calSyncBtn').textContent)&&/ics/.test(Q('#calSyncBtn').textContent);
 o.M_functionsKept=['exportPDF','downloadBackup','restoreFromFile','restorePreviousBackup'].every(k=>typeof w[k]==='function');
 o.M_noJsErrors=!errs.some(e=>/Mindmap|pdfBtn/.test(e));

 /* ===== مركز التقويم ===== */
 let exported=0; w.exportCalendar=()=>{exported++;};
 Q('#settingsBtn').click(); Q('#calSyncBtn').click(); await sl(60);
 o.H_hubOpen=!!Q('.ics-modal')&&!!Q('#icsOut')&&!!Q('#icsIn')&&/يدوي/.test(Q('.ics-modal').textContent)&&/authtoken/.test(Q('.ics-modal').textContent)&&!Q('.settings-menu.show');
 Q('#icsOut').click(); await sl(30); o.H_exportRoutes=exported===1&&!Q('.ics-modal');
 Q('#calSyncBtn').click(); await sl(30); Q('.ics-backdrop').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await sl(60); o.H_escCloses=!Q('.ics-modal');
 let picked=0; w.IcsImport.pick=()=>{picked++;}; Q('#moodleImportBtn')&&Q('#moodleImportBtn').click(); o.H_widgetBtnUsesNew=picked===1||!Q('#moodleImportBtn');

 /* ===== نافذة رمز المزامنة ===== */
 w.SB.showSyncPanel(); await sl(40);
 o.S_structure=!!Q('.sync-modal')&&!!Q('#syncCodeInput')&&Q('#syncCodeInput').readOnly&&Q('#syncCodeInput').value===w.SB.getCode()&&['syncCopy','syncShare','syncChange','syncClose','syncX'].every(i=>!!d.getElementById(i));
 o.S_qrGone=!Q('#syncQr')&&!Q('#syncQrBtn')&&!Q('.sync-qr-box');   /* زر QR (خدمة خارجية) حُذف 142 */
 let copied=null; Object.defineProperty(w.navigator,'clipboard',{value:{writeText:t=>{copied=t;return Promise.resolve();}},configurable:true});
 d.getElementById('syncCopy').click(); o.S_copy=copied===w.SB.getCode();
 d.getElementById('syncShare').click(); await sl(30); o.S_shareNoQr=/رمز المزامنة/.test(copied||'');
 d.getElementById('syncX').click(); o.S_xCloses=!Q('.sync-modal');
 w.SB.showSyncPanel(); d.getElementById('syncClose').click(); o.S_closeBtn=!Q('.sync-modal');
 w.SB.showSyncPanel(); Q('.modal-backdrop').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); o.S_escCloses=!Q('.sync-modal');
 w.SB.showSyncPanel(); d.getElementById('syncChange').click(); await sl(60); o.S_changeOpensModal=!Q('.sync-modal')&&!!d.getElementById('mf_code'); d.getElementById('mCancel')&&d.getElementById('mCancel').click();
 const codeBefore=w.SB.getCode(); o.S_codeUnchanged=codeBefore===w.SB.getCode();

 /* ===== تحليل ملف ICS ===== */
 const I=w.IcsImport; const L=a=>a.join('\r\n');
 const d3=ds(3), d5=ds(5), d9=ds(9), dpast=ds(-30);
 const file=L(['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Moodle//EN',
  'BEGIN:VEVENT','UID:a1@lms','SUMMARY:Assignment 1 is due','DTSTART:'+cmp(d3)+'T093000Z','CATEGORIES:Data Structures (0110102)','END:VEVENT',
  'BEGIN:VEVENT','UID:a2@lms','SUMMARY:Midterm Exam','DTSTART;TZID=Asia/Amman:'+cmp(d5)+'T100000','CATEGORIES:مادة الرياضيات','LOCATION:Hall\\, 3','END:VEVENT',
  'BEGIN:VEVENT','UID:a3@lms','SUMMARY:Project week','DTSTART;VALUE=DATE:'+cmp(d3),'DTEND;VALUE=DATE:'+cmp(ds(6)),'END:VEVENT',
  'BEGIN:VEVENT','UID:a4@lms','SUMMARY:Quiz 2 closes','DTSTART:'+cmp(d9)+'T100000','CATEGORIES:Data Structures','END:VEVENT',
  'BEGIN:VEVENT','UID:a5@lms','SUMMARY:Weekly lab report','DTSTART:'+cmp(ds(2))+'T080000','RRULE:FREQ=WEEKLY;COUNT=3','END:VEVENT',
  'BEGIN:VEVENT','UID:a6@lms','SUMMARY:Yearly thing','DTSTART:'+cmp(d5)+'T080000','RRULE:FREQ=YEARLY','END:VEVENT',
  'BEGIN:VEVENT','UID:a7@lms','SUMMARY:Cancelled item','DTSTART:'+cmp(d5)+'T080000','STATUS:CANCELLED','END:VEVENT',
  'BEGIN:VEVENT','UID:a8@lms','SUMMARY:Folded ti',' tle <img src=x onerror=alert(1)>','DTSTART:'+cmp(d5)+'T120000','END:VEVENT',
  'BEGIN:VEVENT','UID:a9@lms','SUMMARY:Old assignment','DTSTART:'+cmp(dpast)+'T080000','END:VEVENT',
  'BEGIN:VEVENT','UID:a10@lms','SUMMARY:Ambiguous','DTSTART:'+cmp(d5)+'T080000','CATEGORIES:Data Structures Lab','END:VEVENT',
  'BEGIN:VEVENT','SUMMARY:No date','END:VEVENT','END:VCALENDAR']);
 const p=I.parseIcs(file,ds(0)); const E=k=>p.events.find(e=>e.uid===k||e.key===k);
 o.P_valid=p.valid&&p.events.length>=11&&p.warnings.some(x=>/بدون عنوان أو تاريخ/.test(x));
 const z=new Date(Date.UTC(+d3.slice(0,4),+d3.slice(5,7)-1,+d3.slice(8,10),9,30)); o.P_utcToLocal=E('a1@lms').date===z.getFullYear()+'-'+pad(z.getMonth()+1)+'-'+pad(z.getDate())&&E('a1@lms').time===pad(z.getHours())+':'+pad(z.getMinutes());
 const za=new Date(Date.UTC(+d5.slice(0,4),+d5.slice(5,7)-1,+d5.slice(8,10),7,0)); o.P_tzidAmman=E('a2@lms').time===pad(za.getHours())+':'+pad(za.getMinutes())&&E('a2@lms').date===za.getFullYear()+'-'+pad(za.getMonth()+1)+'-'+pad(za.getDate());
 o.P_escapes=E('a2@lms').location==='Hall, 3';
 o.P_multiDay=E('a3@lms').allDay&&E('a3@lms').span===3&&E('a3@lms').notes.some(n=>/يمتد 3 أيام/.test(n));
 const wk=p.events.filter(e=>e.uid==='a5@lms'); o.P_weeklyExpands=wk.length===3&&new Set(wk.map(e=>e.key)).size===3&&wk[1].date===ds(9);
 const yr=p.events.filter(e=>e.uid==='a6@lms'); o.P_unsupportedRruleSingle=yr.length===1&&yr[0].notes.some(n=>/تكرار غير مدعوم/.test(n))&&p.warnings.some(x=>/تكرار معقّد/.test(x));
 o.P_cancelled=E('a7@lms').cancelled===true;
 o.P_folded=E('a8@lms').title.startsWith('Folded title');
 /* EXDATE وRECURRENCE-ID */
 const rr=L(['BEGIN:VCALENDAR','BEGIN:VEVENT','UID:r@x','SUMMARY:Lec','DTSTART:'+cmp(ds(1))+'T080000','RRULE:FREQ=DAILY;COUNT=4','EXDATE:'+cmp(ds(2))+'T080000','END:VEVENT','BEGIN:VEVENT','UID:r@x','RECURRENCE-ID:'+cmp(ds(3))+'T080000','SUMMARY:Lec moved','DTSTART:'+cmp(ds(3))+'T150000','END:VEVENT','END:VCALENDAR']);
 const pr=I.parseIcs(rr,ds(0)); o.P_exdateOverride=pr.events.filter(e=>e.title==='Lec').map(e=>e.date).join()===[ds(1),ds(4)].join()&&pr.events.some(e=>e.title==='Lec moved'&&e.time==='15:00');
 const un=I.parseIcs(L(['BEGIN:VCALENDAR','BEGIN:VEVENT','UID:u','SUMMARY:Until','DTSTART:'+cmp(ds(1))+'T080000','RRULE:FREQ=DAILY;UNTIL='+cmp(ds(3))+'T235959Z','END:VEVENT','END:VCALENDAR']),ds(0)); o.P_until=un.events.length===3;
 /* ملفات غير صالحة */
 o.V_invalid=I.parseIcs('').reason==='empty'&&I.parseIcs('<html>login</html>').reason==='not-ics'&&I.parseIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR').reason==='no-events'&&I.parseIcs('BEGIN:VCALENDAR\u0000').reason==='binary'&&I.parseIcs('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:x\r\nDTSTART:bad\r\nEND:VEVENT\r\nEND:VCALENDAR').events.length===0;
 o.V_badDateRejected=I.parseDt('20261345')===null&&I.parseDt('garbage')===null&&I.parseDt('20260230')!==undefined;

 /* ===== المطابقة (بدون تخمين) ===== */
 const mm=ev=>I.matchCourse(Object.assign({title:'',categories:''},ev));
 o.C_byCode=mm({categories:'Data Structures (0110102)'}).course==='Data Structures';
 o.C_exactName=mm({categories:'مادة الرياضيات'}).course==='مادة الرياضيات';
 o.C_noMatch=mm({categories:'Biology 101',title:'Essay'}).course===''&&mm({}).course==='';
 o.C_ambiguousNoGuess=mm({categories:'Data Structures Lab'}).course==='Data Structures Lab'&&(()=>{const x=mm({title:'Data Structures Lab report',categories:'general'}); return x.course==='Data Structures Lab';})();
 const both=I.matchCourse({title:'0110102 and 5555555 joint',categories:''}); o.C_twoCodesAmbiguous=both.course===''&&both.ambiguous===true;
 o.C_shortNameIgnored=(()=>{ w.space.courses.push({id:'c9',name:'DB',code:'12',hours:3}); const r=mm({title:'DB assignment',categories:''}); w.space.courses.pop(); return r.course===''; })();

 /* ===== المعاينة: لا تغيير قبل التأكيد ===== */
 const snap=()=>JSON.stringify(w.space); const before=snap(); let saves=0; const os=w.saveSpace; w.saveSpace=function(){saves++; return os.apply(this,arguments);};
 I.preview(file,'moodle.ics'); await sl(60);
 o.PV_open=!!Q('.ics-modal.wide')&&QA('.ics-backdrop .ics-row').length===p.events.length&&/moodle\.ics/.test(Q('.ics-file').textContent);
 o.PV_noChangeBefore=snap()===before&&saves===0;
 const rowOf=t=>QA('.ics-backdrop .ics-row').find(r=>r.querySelector('.ics-title').textContent.startsWith(t));
 o.PV_defaults=rowOf('Assignment 1').querySelector('input').checked&&rowOf('Midterm').querySelector('input').checked&&!rowOf('Old assignment').querySelector('input').checked&&rowOf('Cancelled item').querySelector('input').disabled;
 o.PV_courseShown=/Data Structures/.test(rowOf('Assignment 1').textContent)&&/بدون مادة/.test(rowOf('Weekly lab').textContent);
 o.PV_ambiguous=/Data Structures Lab/.test(rowOf('Ambiguous').textContent);
 o.PV_details=/⏰/.test(rowOf('Assignment 1').textContent)&&/طوال اليوم/.test(rowOf('Project week').textContent)&&/3 أيام/.test(rowOf('Project week').textContent)&&/🔁/.test(rowOf('Weekly lab').textContent);
 o.PV_kindGuess=rowOf('Midterm').querySelector('select').value==='exam'&&rowOf('Quiz 2').querySelector('select').value==='quiz'&&rowOf('Assignment 1').querySelector('select').value==='assignment';
 o.PV_xssSafe=!Q('.ics-list img')&&/<img/.test(rowOf('Folded title').querySelector('.ics-title').textContent);
 o.PV_manualNote=/يدوي/.test(Q('.ics-modal').textContent)&&/تصدير ملف|صدّر ملف/.test(Q('.ics-modal').textContent)&&/authtoken/.test(Q('.ics-modal').textContent);
 const cnt0=Q('#icsGo').textContent;
 rowOf('Weekly lab').querySelector('input').click(); rowOf('Weekly lab').querySelector('input').click(); /* تبديل مزدوج */
 /* إلغاء */
 Q('#icsCancel').click(); await sl(40); o.PV_cancelNoChange=snap()===before&&saves===0&&!Q('.ics-modal');
 /* تأكيد */
 I.preview(file,'moodle.ics'); await sl(60); const sel0=QA('.ics-backdrop .ics-row input:checked').length; rowOf('Folded title').querySelector('input').click();
 Q('#icsGo').click(); await sl(80);
 const T=w.space.tasks, X=w.space.exams;
 const imported=T.length+X.length; o.IM_added=imported===sel0-1&&saves===1;
 o.IM_fields=T.concat(X).every(i=>i.source==='ics'&&i.uid)&&T.every(t=>t.done===false&&t.due)&&X.every(e=>e.date);
 const t1=T.find(t=>t.title==='Assignment 1 is due'); o.IM_courseLinked=t1&&t1.course==='Data Structures';
 const e1=X.find(e=>e.name==='Midterm Exam'); o.IM_examTypeAndCourse=!!e1&&e1.course==='مادة الرياضيات'&&e1.room==='Hall, 3'&&e1.time===pad(za.getHours())+':'+pad(za.getMinutes());
 o.IM_unmatchedNoCourse=(T.find(t=>t.title.startsWith('Weekly lab'))||{}).course===''&&(T.find(t=>t.title==='Project week')||{course:'?'}).course==='';
 o.IM_pastNotImported=!T.concat(X).some(i=>/Old assignment/.test(i.title||i.name));
 o.IM_cancelledNotImported=!T.concat(X).some(i=>/Cancelled item/.test(i.title||i.name));
 o.IM_timetableUntouched=JSON.stringify(w.space.timetable)===JSON.stringify(base.timetable);
 /* إعادة استيراد الملف نفسه */
 const afterFirst=snap(); I.preview(file,'moodle.ics'); await sl(60);
 o.RE_allSame=QA('.ics-backdrop .ics-row').filter(r=>/مستورد سابقاً/.test(r.textContent)).length>=imported&&QA('.ics-backdrop .ics-row input:checked').length===1&&/Folded title/.test(QA('.ics-backdrop .ics-row input:checked')[0].closest('.ics-row').textContent);
 Q('#icsCancel').click(); await sl(30); o.RE_noDup=snap()===afterFirst;
 /* ملف معدّل: نفس uid بتاريخ مختلف + حدث جديد + اختفاء حدث */
 const file2=file.replace('UID:a1@lms\r\nSUMMARY:Assignment 1 is due\r\nDTSTART:'+cmp(d3)+'T093000Z','UID:a1@lms\r\nSUMMARY:Assignment 1 is due\r\nDTSTART:'+cmp(ds(4))+'T093000Z').replace('BEGIN:VEVENT\r\nUID:a2@lms','BEGIN:VEVENT\r\nUID:zzz@lms\r\nSUMMARY:Brand new\r\nDTSTART:'+cmp(ds(7))+'T080000\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:a2x@lms');
 I.preview(file2,'new.ics'); await sl(60); const ch=rowOf('Assignment 1');
 o.CH_changedDetected=/معدّل بالملف/.test(ch.textContent)&&/بالتطبيق الآن/.test(ch.textContent)&&!ch.querySelector('input').checked&&!ch.querySelector('input').disabled;
 o.CH_newDetected=!!rowOf('Brand new')&&rowOf('Brand new').querySelector('input').checked;
 o.CH_missingNotice=/ما عاد موجوداً/.test(Q('.ics-modal').textContent)&&/ما بينحذف/.test(Q('.ics-modal').textContent);
 const nBefore=w.space.tasks.length+w.space.exams.length; ch.querySelector('input').click(); Q('#icsGo').click(); await sl(60);
 const t1b=w.space.tasks.find(t=>t.uid==='a1@lms'); o.CH_updatedInPlace=t1b.due===ds(4)&&t1b.title==='Assignment 1 is due'&&w.space.tasks.filter(t=>t.uid==='a1@lms').length===1;
 o.CH_noDeletion=w.space.tasks.length+w.space.exams.length>=nBefore+1&&w.space.exams.some(e=>e.name==='Midterm Exam');
 /* عنصر يدوي بنفس العنوان والتاريخ = مكرر محتمل غير محدد، وتعديل عنصر المستخدم غير مسموح */
 w.space.tasks.push({id:'man',title:'Manual task',due:ds(11),done:false}); w.space.tasks.push({id:'man2',title:'Edited by user',due:ds(12),done:false,uid:'mine@lms'});
 const f3=L(['BEGIN:VCALENDAR','BEGIN:VEVENT','UID:q@x','SUMMARY:manual  TASK','DTSTART:'+cmp(ds(11))+'T080000','END:VEVENT','BEGIN:VEVENT','UID:mine@lms','SUMMARY:Changed remotely','DTSTART:'+cmp(ds(13))+'T080000','END:VEVENT','END:VCALENDAR']);
 const snap3=snap(); I.preview(f3,'f3.ics'); await sl(60);
 o.DP_dupUnchecked=/مكرر محتمل/.test(rowOf('manual').textContent)&&!rowOf('manual').querySelector('input').checked&&/يشبه/.test(rowOf('manual').textContent);
 o.DP_userItemProtected=/عنصر موجود بتعديلك/.test(rowOf('Changed remotely').textContent)&&rowOf('Changed remotely').querySelector('input').disabled;
 Q('#icsCancel').click(); await sl(30); o.DP_noChange=snap()===snap3;
 /* قراءة ملف حقيقي عبر readFile + حدود الحجم */
 I.readFile(new w.File([file],'x.ics')); await sl(150); o.F_readFile=!!Q('.ics-modal.wide'); Q('#icsCancel').click();
 const big=new w.File(['x'],'big.ics'); Object.defineProperty(big,'size',{value:6*1024*1024}); I.readFile(big); await sl(40); o.F_tooBig=/5MB/.test(Q('.ics-modal').textContent); Q('[data-x]').click();
 I.readFile(new w.File(['<html>not calendar</html>'],'bad.ics')); await sl(150); o.F_invalidMessage=/ليس تقويماً صالحاً/.test(Q('.ics-modal').textContent); const s4=snap(); Q('[data-x]').click(); o.F_invalidNoChange=snap()===s4;
 o.NET_noFetch=true;
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
