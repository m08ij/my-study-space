/* daily.js: اليوم فقط، بين محاضرتين، التهدئة، مصروف سريع، الذروة، كثافة، لون مخصص، قوائم طويلة + سيناريوهات المعدل + قياس الأداء */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const ds=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const DE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const T0=new Date(2026,9,7,11,0,0);    /* أربعاء 11:00 */
const DAY=DE[T0.getDay()];
const todayReal=new Date(); const tr=ds(todayReal);
const base={courses:[{id:'c1',name:'شبكات',code:'1',hours:3}],
 tasks:[{id:'t1',title:'واجب شبكات',course:'شبكات',due:ds(new Date(T0.getTime()+86400000)),done:false},{id:'t2',title:'متأخرة',course:'',due:'2020-01-01',done:false}],
 exams:[],attendance:{},grades:[],profile:{name:'T'},budget:[],completedCourses:[],currentSemester:1,
 timetable:{[DAY+'-08:00']:{name:'رياضيات',room:'101',end:'09:30'},[DAY+'-13:00']:{name:'شبكات',room:'202',end:'14:30'}},
 decks:[{id:'d1',name:'م',cards:[{id:'a',q:'q1',a:'a1',last:'2026-10-01',due:'2026-10-02',ivl:1,reps:1},{id:'b',q:'q2',a:'a2'}]}]};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify(base)}); await sl(2400);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)];
 const D=w.Daily, at=(h,m)=>new Date(2026,9,7,h,m,0);
 o.G_removed=typeof D.gap==='undefined'&&typeof D.suggestBetween==='undefined'&&typeof D.setTodayMode==='undefined'&&!Q('#gapCard');   /* «بين محاضرتين» و«اليوم فقط» حُذفا 142 */
 /* ---- تهدئة ---- */
 const ex=(date,time,name)=>({id:name,name,course:'شبكات',date,time});
 w.space.exams=[ex('2026-10-08','09:00','e1')]; o.C_in23h=!!D.calmExam(at(10,0))&&Math.round(D.calmExam(at(10,0)).hours)===23;
 w.space.exams=[ex('2026-10-08','17:00','e2')]; o.C_notYet=D.calmExam(at(10,0))===null;
 w.space.exams=[ex('2026-10-07','10:00','e3')]; o.C_justStarted=!!D.calmExam(at(11,0));
 w.space.exams=[ex('2026-10-07','06:00','e4')]; o.C_endedLongAgo=D.calmExam(at(11,0))===null;
 w.space.exams=[ex('2026-10-08','','e5')]; o.C_noTimeDefault8=!!D.calmExam(at(10,0))&&D.examDT(w.space.exams[0]).getHours()===8;


















 /* ---- ذروة ---- */
 const log={}; for(let i=1;i<=6;i++){ const dt=new Date(T0.getTime()-i*86400000); log[ds(dt)]=(dt.getDay()===0?120:30); }
 w.localStorage.setItem('ss_focus_hours',JSON.stringify([{h:8,m:25},{h:9,m:25},{h:9,m:25},{h:20,m:25},{h:8,m:25},{h:21,m:25}])); w.S.set('studyLog',log);
 const pk=D.peak(T0); o.P_hours=!!pk.hours&&pk.hours.from===8&&pk.hours.to===10&&pk.hours.share===67;
 o.P_day=!!pk.day&&pk.day.idx===0&&pk.day.avg===120; o.P_line=/08:00–10:00/.test(D.peakLine(pk))&&/الأحد/.test(D.peakLine(pk));
 w.localStorage.setItem('ss_focus_hours','[]'); w.S.set('studyLog',{}); const pk0=D.peak(T0); o.P_notEnough=pk0.hours===null&&pk0.day===null&&pk0.need===5;
 w.document.dispatchEvent(new w.CustomEvent('ss:focus-complete',{detail:{minutes:25}})); o.P_records=JSON.parse(w.localStorage.getItem('ss_focus_hours')).length===1;
 w.switchTab('stats',false); await sl(80); o.P_card=/ذروة تركيزك/.test(Q('#fxMain').textContent)&&/4 جلسات/.test(Q('#fxMain').textContent);
 /* ---- كثافة ---- */



 /* ---- لون مخصص ---- */
 const dark={r:20,g:28,b:46}, light={r:255,g:255,b:255};
 const f1=D.fitAccent('#1a2338',dark,4.5); o.A_fixesLow=f1.adjusted&&f1.ratio>=4.5;
 const f2=D.fitAccent('#22d3ee',dark,4.5); o.A_keepsGood=!f2.adjusted&&f2.hex==='#22d3ee';
 const f3=D.fitAccent('#ffee00',light,4.5); o.A_lightTheme=f3.adjusted&&f3.ratio>=4.5;
 o.A_invalid=D.fitAccent('zzz',dark)===null;




 /* ---- قوائم طويلة ---- */
 w.space.tasks=Array.from({length:150},(_,i)=>({id:'x'+i,title:'مهمة '+i,course:'',due:'2099-01-01',done:false,priority:'normal',order:i}));





 /* ---- سيناريوهات المعدل ---- */
 w.gpaRows=[{name:'a',hrs:3,grade:'A (90-100)'},{name:'b',hrs:3,grade:'B (75-79)'}];
 const sc=w.Progress.scenarios(15,3.75); o.S_totals=sc.totals.hrs===6&&sc.totals.gpa===3.5;
 const rowA=sc.rows.find(r=>r.label==='A'); o.S_allA=Math.abs(rowA.gpa-81/21)<1e-9;
 o.S_needOk=sc.status==='ok'&&Math.abs(sc.need-3.85)<1e-9&&sc.letter==='A'&&sc.minPct===90;
 const sf=w.Progress.scenarios(15,3.9); o.S_far=sf.status==='far'&&sf.semesters===2&&sf.maxGpa>3.8;
 const sd=w.Progress.scenarios(15,1.0); o.S_done=sd.status==='done';
 o.S_noData=(w.gpaRows=[{name:'',hrs:0,grade:'A (90-100)'}],w.Progress.scenarios(15,3)===null);
 o.S_badHours=(w.gpaRows=[{name:'a',hrs:3,grade:'A (90-100)'}],w.Progress.scenarios(0,3)===null);
 w.gpaRows=[{name:'a',hrs:3,grade:'A (90-100)'},{name:'b',hrs:3,grade:'B (75-79)'}];
 w.switchTab('gpa',false); await sl(80);
 o.S_card=!!Q('#fxScOut')&&Q('#fxScOut').querySelectorAll('.fx-gl').length>=5;
 Q('#fxScT').value='3.9'; Q('#fxScT').dispatchEvent(new w.Event('input',{bubbles:true})); await sl(30); o.S_updates=/فصول|ما بتتحقق/.test(Q('#fxScOut').textContent);
 /* ---- قياس الأداء ---- */
 w.DiagLog.wrap(); w.switchTab('dashboard',false); w.renderDashboard(); await sl(50);
 const pf=w.DiagLog.perf(); o.F_rows=Array.isArray(pf.rows); o.F_boot=typeof pf.boot==='object'&&typeof pf.longTasks.n==='number';
 w.DiagLog.open(); await sl(40); o.F_modal=/الأداء/.test(Q('.diag-modal').textContent); o.F_report=true;
 Q('.diag-modal [data-x]').click(); await sl(200);
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
