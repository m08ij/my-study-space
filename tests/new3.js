/* سجل الأخطاء، حالة المزامنة، ملخص الصباح، توقع الحضور الأسبوعي، أيام الامتحانات بالجدول، تركيز المادة */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const ds=off=>{const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());};
const DE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const todayKey=DE[new Date().getDay()];
const base={courses:[{id:'c1',name:'Data Structures',code:'0110102',hours:3},{id:'c2',name:'Databases',code:'0110200',hours:3}],tasks:[{id:'t1',title:'واجب قريب',course:'Data Structures',due:ds(2),done:false},{id:'t2',title:'متأخر',due:ds(-3),done:false}],exams:[],attendance:{'Data Structures':{present:9,absent:3}},grades:[],timetable:{},profile:{name:'سارة'},decks:[],budget:[],completedCourses:[],currentSemester:1};
base.timetable[todayKey+'-08:00']={name:'Data Structures',room:'A1',end:'09:30'}; base.timetable[todayKey+'-11:00']={name:'Databases',room:'B2',end:'12:00'};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify(base)}); await sl(2500);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)]; w.toast=m=>{ w.__t=m; };
 let fetches=0; const of=w.fetch; w.fetch=(...a)=>{ fetches++; return of(...a); };

 /* ===== سجل الأخطاء ===== */
 const DL=w.DiagLog; DL.clear();
 o.D_present=!!DL&&!!Q('#diagBtn')&&QA('#settingsMenu .settings-item').some(b=>b.id==='diagBtn');
 DL.add('error','خطأ تجريبي','app.js:10:5'); DL.add('error','خطأ تجريبي','app.js:10:5'); DL.add('promise','رفض وعد','x.js:1');
 let L=DL.list(); o.D_dedupe=L.length===2&&L[0].n===2&&L[1].k==='promise';
 DL.add('error','Failed to fetch','a.js'); DL.add('error','ResizeObserver loop limit exceeded','b'); DL.add('error','Script error.',''); DL.add('error','','x'); o.D_noiseIgnored=DL.list().length===2;
 DL.clear(); for(let i=0;i<30;i++) DL.add('error','e'+i,'f.js:'+i); L=DL.list(); o.D_capped=L.length===20&&L[19].m==='e29'&&L[0].m==='e10';
 DL.clear(); w.dispatchEvent(new w.ErrorEvent('error',{message:'boom حقيقي',filename:'http://x/y/app.js?v=1',lineno:7,colno:3})); o.D_windowError=DL.list().some(x=>x.m==='boom حقيقي'&&x.s==='app.js:7:3');
 const pe=new w.Event('unhandledrejection'); pe.reason=new Error('وعد مرفوض'); w.dispatchEvent(pe); o.D_rejection=DL.list().some(x=>x.k==='promise'&&x.m==='وعد مرفوض');
 o.D_badgeCount=Q('#diagBtn .diag-count')&&Q('#diagBtn .diag-count').textContent==='2'&&!Q('#diagBtn .diag-count').hidden;
 o.D_storedLocalOnly=!!w.localStorage.getItem('ss_error_log')&&!JSON.stringify(w.gatherSnapshot()).includes('boom حقيقي');
 Q('#settingsBtn').click(); Q('#diagBtn').click(); await sl(60);
 o.D_modal=!!Q('.diag-modal')&&QA('.diag-row').length===2&&/محلياً فقط/.test(Q('.diag-modal').textContent)&&!Q('.settings-menu.show');
 let copied=null; Object.defineProperty(w.navigator,'clipboard',{value:{writeText:t=>{copied=t;return Promise.resolve();}},configurable:true});
 Q('#diagCopy').click(); await sl(30); o.D_copyReport=/الإصدار: /.test(copied||'')&&/boom حقيقي/.test(copied)&&/وعد مرفوض/.test(copied);
 Q('#diagClear').click(); await sl(40); o.D_clear=DL.list().length===0&&!Q('.diag-modal')&&(!Q('#diagBtn .diag-count')||Q('#diagBtn .diag-count').hidden);
 DL.open(); await sl(40); o.D_emptyState=/ما في أخطاء/.test(Q('.diag-modal').textContent)&&Q('#diagClear').disabled; Q('.diag-modal [data-x]').click(); await sl(40);
 DL.add('error','<img src=x onerror=alert(1)>','z.js'); DL.open(); await sl(40); o.D_xss=!Q('.diag-modal img'); Q('.diag-modal [data-x]').click(); DL.clear();
 o.D_noNetwork=fetches===0;

 /* ===== حالة المزامنة ===== */
 const reset=()=>{ w._conflictOpen=false; w.cloudLoadFailed=false; w.serverSaveInFlight=false; w.serverOnline=false; w._saveRetryN=0; Object.defineProperty(w.navigator,'onLine',{value:true,configurable:true}); };
 reset(); let s=w.getSyncStatus(); o.S_local=s.state==='local'&&s.level==='muted'&&s.icon==='💾';
 w.serverOnline=true; w.localStorage.setItem('ss_cloud_ver',String(Date.now()-5*60000)); s=w.getSyncStatus(); o.S_ok=s.state==='ok'&&s.level==='ok'&&/قبل 5 د/.test(s.text);
 w.serverSaveInFlight=true; s=w.getSyncStatus(); o.S_syncing=s.state==='syncing'; w.serverSaveInFlight=false;
 w.serverOnline=false; w._saveRetryN=1; s=w.getSyncStatus(); o.S_retry=s.state==='retry'&&s.level==='warn'; w._saveRetryN=0;
 w.cloudLoadFailed=true; s=w.getSyncStatus(); o.S_error=s.state==='error'&&s.level==='warn'; w.cloudLoadFailed=false;
 Object.defineProperty(w.navigator,'onLine',{value:false,configurable:true}); s=w.getSyncStatus(); o.S_offline=s.state==='offline'&&s.icon==='📴'; Object.defineProperty(w.navigator,'onLine',{value:true,configurable:true});
 w._conflictOpen=true; w.serverOnline=true; s=w.getSyncStatus(); o.S_conflictWins=s.state==='conflict'&&/بانتظار قرارك/.test(s.text); w._conflictOpen=false;
 w.serverOnline=true; w.FocusUI.render(true); const el=Q('#fxSync'); o.S_iconUpdated=!!el&&/lv-ok/.test(el.className)&&!!el.title;
 w._saveRetryN=2; w.serverOnline=false; w.FocusUI.render(true); o.S_warnColor=/lv-(warn|error)/.test(el.className)||/lv-(warn|error)/.test(Q('#fxSync').className);
 w.SB.showSyncPanel(); await sl(30); o.S_panelStatus=/فشل آخر حفظ|يعيد المحاولة/.test(Q('#syncSub').textContent)&&/st-warn/.test(Q('#syncSub').className); Q('#syncClose').click(); reset();
 Q('#fxSync').click(); await sl(30); o.S_clickOpensPanel=!!Q('.sync-modal'); Q('#syncClose')&&Q('#syncClose').click(); reset();

 /* ===== توقع الحضور الأسبوعي ===== */
 o.W_count=w.weeklyLectures('Data Structures')===1&&w.weeklyLectures('Databases')===1&&w.weeklyLectures('x')===0;
 const H=w.attendanceHint;
 o.W_unchangedWithout=H(9,2).text===H(9,2,0).text&&!/أسبوعاً كاملاً/.test(H(9,2).text);
 const h1=H(9,2,3); o.W_appended=h1.level==='warn'&&/تقدر تغيب 1 مرة/.test(h1.text)&&/لو غبت أسبوعاً كاملاً \(3 محاضرات/.test(h1.text)&&/64%/.test(h1.text);  /* 9/(11+3)=64.3% */
 const h2=H(30,1,2); o.W_noBaseNoWarn=H(30,1,2)===null;
 const h3=H(12,1,3); const h4=H(18,2,6); o.W_weekWouldDrop=!!h4&&h4.level==='warn'&&/تحت 75%/.test(h4.text)&&/69%/.test(h4.text);
 o.W_exactBoundaryNoWarn=H(12,1,3)===null&&H(15,1,4)===null;   /* 75% بالضبط ليس تحت الحد */
 o.W_dangerStays=H(9,4,3).level==='danger'&&!/أسبوعاً/.test(H(9,4,3).text);
 o.W_safeNull=H(40,1,2)===null;
 w.switchTab('attendance',false); await sl(80); o.W_cardShowsWeekly=/لو غبت أسبوعاً كاملاً .1 محاضرة/.test(Q('#fxMain').textContent);

 /* ===== ملخص الصباح القديم انحذف (صفحة «اليوم» بتعرض نفس المعلومات): ما لازم يطلع ===== */
 o.M_removed=!w.UX.maybeMorning&&!w.startupBrief&&!d.querySelector('#morningCard');









 /* ===== تركيز المادة: جلسة الواجهة الجديدة، دقائقها للمادة ===== */
 w.Progress.focusCourse('Data Structures'); await sl(80); o.F_focusCourseStarts=!!Q('.fx-study')&&JSON.parse(w.localStorage.getItem('ss_dp_focus')).c==='Data Structures';
 Q('.fx-study [data-st="stop"]').click(); await sl(40); o.F_stopCloses=!Q('.fx-study');
 w.Hub.openCourse('Data Structures'); await sl(150); const fb=Q('.hub-course-sheet [data-act="focus"]'); o.F_hubButton=!!fb&&/جلسة تركيز/.test(fb.textContent);
 fb.click(); await sl(150); o.F_hubButtonStarts=!!Q('.fx-study'); const st=Q('.fx-study [data-st="stop"]'); st&&st.click();
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse|navigation/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
