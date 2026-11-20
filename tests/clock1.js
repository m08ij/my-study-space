/* مسح ساعة/تواريخ: حدود الشهر والسنة والسنة الكبيسة ومنتصف الليل والجمعة/السبت — لا استثناءات، وحسابات الأيام صحيحة */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const mk=(base,k)=>{ const d=new Date(base.getFullYear(),base.getMonth(),base.getDate()+k); return ymd(d); };
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify({profile:{name:'س'},courses:[{id:'c',name:'م',code:'1',hours:3}],tasks:[],exams:[],attendance:{'م':{present:3,absent:1}},grades:[],timetable:{},decks:[{id:'d',name:'م',cards:[{q:'a',a:'b',last:'2026-01-01',due:'2026-01-02'}]}],budget:[],completedCourses:[],currentSemester:1})}); await sl(2200);
 const d=w.document,o={},Q=s=>d.querySelector(s); const Real=w.Date;
 const fake=(y,mo,da,h,mi,s)=>{ const T=new Real(y,mo,da,h,mi||0,s||0).getTime(); w.Date=class extends Real{ constructor(...a){ if(a.length) super(...a); else super(T); } static now(){ return T; } }; return new Real(T); };
 const DE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
 const cases=[['monthEnd',2026,0,31,23,59,59],['yearEnd',2026,11,31,23,30],['newYear',2027,0,1,0,0,1],['leapDay',2028,1,29,12,0],['afterLeap',2028,2,1,0,5],['midnight',2026,9,7,0,0,0],['friday',2026,9,9,10,0],['saturday',2026,9,10,15,0],['feb28nonLeap',2027,1,28,22,0],['oct25',2026,9,25,2,0]];
 const bad=[]; let n=0;
 for(const c of cases){
  const now=fake(c[1],c[2],c[3],c[4],c[5],c[6]); const key=c[0]; n++;
  const T=w.today(); const exp=ymd(now);
  if(T!==exp) bad.push(key+': today() '+T+' != '+exp);
  const tm=mk(now,1), yd=mk(now,-1), p3=mk(now,3);
  const dd=[w.daysUntil(T),w.daysUntil(tm),w.daysUntil(yd),w.daysUntil(p3)];
  if(dd.join()!=='0,1,-1,3') bad.push(key+': daysUntil '+dd.join());
  /* بيانات نسبية للتاريخ المزيّف */
  const day=DE[now.getDay()], hh=pad(Math.max(6,Math.min(20,now.getHours()))), tt={}; tt[day+'-'+hh+':00']={name:'م',room:'1',end:pad(Math.min(21,+hh+1))+':30'}; tt[day+'-'+pad(Math.min(21,+hh+3))+':00']={name:'م',room:'2'};
  w.space.timetable=tt; w.space.tasks=[{id:'a',title:'أ',due:T,done:false},{id:'b',title:'ب',due:yd,done:false},{id:'c',title:'ج',due:tm,done:false,priority:'high'},{id:'f',title:'د',due:p3,done:false}];
  w.space.exams=[{id:'e1',name:'امتحان',course:'م',date:tm,time:'09:00'},{id:'e2',name:'بدون وقت',course:'',date:p3,time:''}];
  w.space.budget=[{id:'x',type:'expense',category:'food',amount:3,date:T,note:''},{id:'y',type:'expense',category:'food',amount:4,date:yd,note:''}];
  ['renderDashboard','renderTasks','renderExams','renderTimetable','renderAttendance','renderBudget','renderGradeCalc','renderCourses'].forEach(fn=>{ try{ w[fn](); }catch(e){ bad.push(key+': '+fn+' → '+e.message); } });
  try{ w.Daily.render(); const ex=w.Daily.calmExam(now); if(typeof ex==='undefined') bad.push(key+': calmExam'); }catch(e){ bad.push(key+': Daily → '+e.message); }
  try{ const st=w.Schedule.status(now); if(!st||!Array.isArray(st.today)||st.today.length!==2) bad.push(key+': Schedule.today '+(st&&st.today&&st.today.length)); }catch(e){ bad.push(key+': Schedule → '+e.message); }
  try{ const ce=w.Daily.calmExam(now); const e1=new Real(now.getFullYear(),now.getMonth(),now.getDate()+1,9,0).getTime()-now.getTime(); const should=e1/3600000<=24; if(should&&!ce) bad.push(key+': calmExam missing (hrs '+(e1/3600000).toFixed(1)+')'); if(!should&&ce&&ce.e.id==='e1') bad.push(key+': calmExam false positive'); }catch(e){ bad.push(key+': calmExam → '+e.message); }
  try{ const r=w.examRemaining(w.space.exams[0],now); if(!r||typeof r.days!=='number') bad.push(key+': examRemaining'); else if(r.days!==1&&r.days!==0) bad.push(key+': examRemaining days '+r.days); }catch(e){ bad.push(key+': examRemaining → '+e.message); }
  try{ w.checkSmartReminders(); w.checkReminders&&w.checkReminders(); }catch(e){ bad.push(key+': reminders → '+e.message); }
  d.querySelectorAll('.toast').forEach(x=>x.remove());
 }
 o.cases=n; o.problems=bad.length; if(bad.length) o.list=bad;
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); w.Date=Real;
 console.log(JSON.stringify(o,null,1)); process.exit(bad.length||o.errs.length?1:0);
})();
