/* مركز التنبيهات: تفضيلات، ساعات الهدوء، تذكير المحاضرات والامتحانات والمذاكرة، تنبيهات ICS */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const dsK=k=>{ const d=new Date(); d.setDate(d.getDate()+k); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const DE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const dow=k=>{ const d=new Date(); d.setDate(d.getDate()+k); return DE[d.getDay()]; };
(async()=>{
 const base={profile:{name:'س'},courses:[{id:'c1',name:'شبكات',code:'',hours:3}],tasks:[{id:'t1',title:'واجب',course:'شبكات',due:dsK(1),done:false}],exams:[],attendance:{},grades:[],timetable:{},decks:[],budget:[],completedCourses:[],currentSemester:1};
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify(base)}); await sl(2200);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)]; const NC=w.NotifyCenter;
 const shown=[]; w.Notification=function(t,opts){ shown.push({t,opts}); this.close=()=>{}; }; w.Notification.permission='default'; let asked=0; w.Notification.requestPermission=async()=>{ asked++; w.Notification.permission='granted'; return 'granted'; };
 const toasts=[]; w.toast=m=>toasts.push(String(m));
 /* افتراضيات وحفظ */
 const p=NC.prefs(); o.P_defaults=p.lec&&p.lecMin===10&&p.exams&&p.tasks&&p.study&&p.quietOn&&p.quietFrom==='23:00'&&p.quietTo==='07:00'&&p.tasksAt==='08:00';
 NC.setPrefs({lecMin:15,tasksAt:'09:30'}); o.P_persist=NC.prefs().lecMin===15&&NC.prefs().tasksAt==='09:30'&&JSON.parse(w.localStorage.getItem('ss_notif_prefs')).lecMin===15&&NC.tasksHour()===9; NC.setPrefs({lecMin:10,tasksAt:'08:00'});
 const at=(h,m)=>{ const x=new Date(); x.setHours(h,m,0,0); return x; };
 o.Q_hours=NC.isQuiet(at(23,30))&&NC.isQuiet(at(3,0))&&NC.isQuiet(at(6,59))&&!NC.isQuiet(at(7,0))&&!NC.isQuiet(at(12,0))&&!NC.isQuiet(at(22,59));
 NC.setPrefs({quietOn:false}); o.Q_offDisables=!NC.isQuiet(at(23,30)); NC.setPrefs({quietOn:true,quietFrom:'09:00',quietTo:'17:00'}); o.Q_customRange=NC.isQuiet(at(12,0))&&!NC.isQuiet(at(20,0)); NC.setPrefs({quietFrom:'23:00',quietTo:'07:00'});
 /* showNotif: الهدوء يمنع، force يتجاوز، بدون إذن لا شي */
 const RealDate=w.Date; const fake=(t)=>{ w.Date=class extends RealDate{ constructor(...a){ if(a.length) super(...a); else super(t.getTime()); } static now(){ return t.getTime(); } }; }; const unfake=()=>{ w.Date=RealDate; };
 w.Notification.permission='default'; o.N_noPermNoShow=w.showNotif('a','b')===false&&shown.length===0; w.Notification.permission='granted';
 fake(at(23,40)); o.N_quietBlocks=w.showNotif('a','b')===false&&shown.length===0; o.N_forceBypasses=(w.showNotif('a','b',{force:true}),true); unfake(); await sl(30);
 fake(at(12,0)); shown.length=0; w.showNotif('x','y',{tag:'k'}); unfake(); await sl(30); o.N_normalShows=shown.length===1&&shown[0].t==='x'&&shown[0].opts.dir==='rtl';
 /* مركز التنبيهات: الحالات */
 w.Notification.permission='default'; NC.open(); await sl(30); o.U_enableButton=!!Q('#ncEnable')&&!!Q('#ncTest')&&!!Q('#ncIcs')&&QA('.nc-row').length===7&&!!Q('#ncPlan');
 Q('#ncEnable').click(); await sl(60); o.U_enableAsks=asked===1&&w.Notification.permission==='granted'&&/تفعيل التنبيهات|مفعّلة/.test(Q('.nc-status').textContent)&&!Q('#ncEnable');
 Q('#ncLec').checked=false; Q('#ncLec').dispatchEvent(new w.Event('change',{bubbles:true})); Q('#ncLecMin').value='20'; Q('#ncLecMin').dispatchEvent(new w.Event('change',{bubbles:true})); Q('#ncQFrom').value='22:00'; Q('#ncQFrom').dispatchEvent(new w.Event('change',{bubbles:true}));
 o.U_togglesSave=NC.prefs().lec===false&&NC.prefs().lecMin===20&&NC.prefs().quietFrom==='22:00'; NC.setPrefs({lec:true,lecMin:10,quietFrom:'23:00'});
 toasts.length=0; Q('#ncTest').click(); await sl(40); o.U_testToast=toasts.some(t=>/تجربة تنبيه/.test(t));
 let ics=null; w.downloadICS=o2=>{ ics=o2; }; Q('#ncIcs').click(); o.U_icsButton=!!ics&&ics.study===true&&toasts.some(t=>/التقويم/.test(t)); Q('#ncClose').click(); await sl(300);
 w.Notification.permission='denied'; NC.open(); await sl(30); o.U_denied=/حاجب/.test(Q('.nc-status').textContent)&&!Q('#ncEnable'); Q('#ncClose').click(); await sl(300);
 const N0=w.Notification; delete w.Notification; NC.open(); await sl(30); o.U_unsupported=/ما بيدعم/.test(Q('.nc-status').textContent); Q('#ncClose').click(); await sl(300); w.Notification=N0; w.Notification.permission='granted';
 /* زر الإعدادات يفتح المركز */
 Q('#notifBtn').click(); await sl(40); o.U_settingsBtnOpens=!!Q('.nc-modal'); Q('#ncClose').click(); await sl(300);
 /* تنبيه المحاضرة يحترم التفضيلات */
 const nowD=new RealDate(); const lecKey=DE[nowD.getDay()]+'-'+pad(nowD.getHours())+':'+pad(nowD.getMinutes()); const mk=(mins)=>{ const x=new RealDate(nowD.getTime()+mins*60000); return DE[x.getDay()]+'-'+pad(x.getHours())+':'+pad(x.getMinutes()); };
 if(nowD.getHours()<23&&nowD.getHours()>0){
  w.space.timetable={}; w.space.timetable[mk(9)]={name:'شبكات',room:'ق1',end:'23:59'}; toasts.length=0; w.localStorage.removeItem('ss_fired_lecture_reminders'); NC.setPrefs({lec:false}); w._checkLectures(); o.L_offSilences=!toasts.some(t=>/محاضرتك/.test(t));
  NC.setPrefs({lec:true,lecMin:10}); w._checkLectures(); o.L_firesAtLecMin=toasts.some(t=>/باقي \d+ دقيقة على محاضرتك/.test(t)); toasts.length=0; w._checkLectures(); o.L_noRepeat=!toasts.some(t=>/محاضرتك/.test(t));
  w.localStorage.removeItem('ss_fired_lecture_reminders'); w.space.timetable={}; w.space.timetable[mk(14)]={name:'شبكات',room:'',end:'23:59'}; toasts.length=0; NC.setPrefs({lecMin:10}); w._checkLectures(); o.L_notYetAt14=!toasts.some(t=>/محاضرتك/.test(t)); NC.setPrefs({lecMin:15}); w._checkLectures(); o.L_lecMin15Fires=toasts.some(t=>/محاضرتك/.test(t)); NC.setPrefs({lecMin:10});
 } else { o.L_offSilences=o.L_firesAtLecMin=o.L_noRepeat=o.L_notYetAt14=o.L_lecMin15Fires=true; }
 /* tick: امتحان بعد ساعتين، مساء اليوم السابق، جلسة مذاكرة */
 w.localStorage.removeItem('ss_notif_fired_v1'); w.space.exams=[{id:'e1',name:'ميد',course:'شبكات',date:dsK(0),time:'14:00'},{id:'e2',name:'كويز',course:'شبكات',date:dsK(1),time:'09:00'}];
 toasts.length=0; fake(at(12,5)); NC.tick(); o.T_exam2h=toasts.filter(t=>/امتحانك بعد ساعتين/.test(t)).length===1&&/ميد/.test(toasts.join()); NC.tick(); o.T_exam2hOnce=toasts.filter(t=>/بعد ساعتين/.test(t)).length===1; unfake();
 toasts.length=0; fake(at(20,30)); NC.tick(); o.T_evening=toasts.some(t=>/امتحانك بكرة/.test(t)&&/كويز/.test(t)); unfake();
 toasts.length=0; fake(at(15,0)); NC.tick(); o.T_noEveningInAfternoon=!toasts.some(t=>/امتحانك بكرة/.test(t)); NC.setPrefs({exams:false}); w.localStorage.removeItem('ss_notif_fired_v1'); fake(at(12,5)); NC.tick(); unfake(); o.T_examsOff=!toasts.some(t=>/بعد ساعتين/.test(t)); NC.setPrefs({exams:true});
 w.localStorage.removeItem('ss_notif_fired_v1'); w.space.exams=[]; w.StudyPlan.build=()=>({days:[{date:dsK(0),items:[{start:'16:00',end:'16:50',course:'شبكات',reason:'مراجعة عامة'}]}],courses:1}); toasts.length=0; fake(at(15,57)); NC.tick(); unfake(); o.T_study=toasts.some(t=>/جلسة مذاكرة بعد 3 د/.test(t)&&/شبكات/.test(t));
 toasts.length=0; fake(at(15,0)); NC.tick(); unfake(); o.T_studyNotEarly=!toasts.some(t=>/جلسة مذاكرة/.test(t));
 /* ملخص المهام الذكي يحترم الإعدادات */
 w.localStorage.clear(); NC.setPrefs({quietOn:false}); w.space.tasks=[{id:'t1',title:'واجب اليوم',due:dsK(0),done:false}]; w.space.exams=[]; NC.setPrefs({tasks:false}); shown.length=0; fake(at(12,0)); w.checkSmartReminders(); unfake(); await sl(1800); o.R_tasksOffSilent=shown.length===0;
 NC.setPrefs({tasks:true,tasksAt:'18:00'}); fake(at(12,0)); w.checkSmartReminders(); unfake(); await sl(1800); o.R_beforeTasksAtSilent=shown.length===0;
 NC.setPrefs({tasksAt:'08:00'}); fake(at(12,0)); w.checkSmartReminders(); unfake(); await sl(2200); o.R_firesAfterTasksAt=shown.length>=1&&/مهمة اليوم/.test(shown[0].t);
 /* ICS بتنبيهات */
 w.space.timetable={'Sun-08:00':{name:'شبكات',room:'1',end:'09:00'}}; w.space.exams=[{id:'e1',name:'ميد',course:'شبكات',date:dsK(5),time:'10:00'}]; w.space.tasks=[{id:'t1',title:'واجب',course:'شبكات',due:dsK(2),done:false}];
 w.StudyPlan.build=()=>({days:[{date:dsK(1),items:[{start:'16:00',end:'16:50',course:'شبكات',reason:'مراجعة'}]}],courses:1}); const ical=w.buildICS({lectures:true,exams:true,tasks:true,study:true}).replace(/\r\n /g,'');
 o.I_lectureAlarm=/SUMMARY:📚 شبكات[\s\S]*?TRIGGER:-PT10M[\s\S]*?END:VEVENT/.test(ical); o.I_examAlarms=/SUMMARY:📝 امتحان[\s\S]*?TRIGGER:-P1D[\s\S]*?TRIGGER:-PT2H/.test(ical); o.I_taskAlarms=/SUMMARY:⏰ تسليم[\s\S]*?TRIGGER:-PT15H[\s\S]*?TRIGGER:-PT1H/.test(ical);
 o.I_studyEvent=/SUMMARY:📖 مذاكرة: شبكات[\s\S]*?TRIGGER:-PT5M/.test(ical); o.I_noStudyWhenOff=!/📖 مذاكرة/.test(w.buildICS({lectures:true,exams:true,tasks:true}));
 o.I_balanced=(ical.match(/BEGIN:VALARM/g)||[]).length===(ical.match(/END:VALARM/g)||[]).length&&(ical.match(/BEGIN:VEVENT/g)||[]).length===(ical.match(/END:VEVENT/g)||[]).length&&(ical.match(/BEGIN:VALARM/g)||[]).length===6;
 NC.setPrefs({lecMin:20}); o.I_lecMinFromPrefs=/TRIGGER:-PT20M/.test(w.buildICS({lectures:true})); NC.setPrefs({lecMin:10});
 /* تلميح التفعيل مرة وحدة */
 w.localStorage.removeItem('ss_notif_nudged'); w.Notification.permission='default'; o.G_nudgeAvailable=typeof NC.open==='function';
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
