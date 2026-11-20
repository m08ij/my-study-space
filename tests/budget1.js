const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/(^|\/)vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const saves=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}}));
  w.scrollTo=()=>{}; w.__ioInstances=[]; w.IntersectionObserver=class{constructor(cb){this.cb=cb;this.targets=[];this.disc=false;w.__ioInstances.push(this);} observe(t){this.targets.push(t);} unobserve(t){this.targets=this.targets.filter(x=>x!==t);} disconnect(){this.disc=true;this.targets=[];} fire(idx){const ts=idx.map(i=>this.targets[i]).filter(Boolean); this.cb(ts.map(t=>({isIntersecting:true,target:t})),this);} }; w.fetch=()=>Promise.reject(new Error('offline'));
  if(mode!=='nolocal'){}
  const sbMode=mode;
  const state={data:{version:7,space:{courses:[{id:'1',name:'سحابة',code:'1',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'سحابي'}},welcomeDone:true},updated_at:sbMode==='cloudOld'?'2020-01-01T00:00:00Z':new Date(Date.now()+3600e3).toISOString()};
  w.supabase={createClient(){return {from(){return {select(){return {eq(){return {maybeSingle:async()=>{
      if(sbMode==='error') return {error:{message:'net'},data:null};
      if(sbMode==='empty') return {data:null,error:null};
      return {data:state,error:null};}};}};},
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async(prefix)=>{ if(global.STORE_FAIL) return {data:null,error:{message:'StorageUnknownError'}}; const seen={},out=[]; Object.keys(global.STORE).forEach(k=>{ if(!k.startsWith(prefix+'/')) return; const rest=k.slice(prefix.length+1); const nm=rest.split('/')[0]; if(seen[nm]) return; seen[nm]=1; out.push(rest.includes('/')?{name:nm,id:null}:{name:nm,id:'x',metadata:{size:global.STORE[k].size,mimetype:'application/pdf'},created_at:'t'}); }); return {data:out,error:null}; }, upload:async(path,file)=>{ global.STORE[path]={size:file.size||1}; return {error:null}; }, remove:async(paths)=>{ paths.forEach(p=>{delete global.STORE[p];}); return {error:null}; }, getPublicUrl:(p)=>({data:{publicUrl:'http://x/'+p}})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={}; const d=w.document; const sl=ms=>new Promise(r=>setTimeout(r,ms)); global.STORE={};
 let toasts=[]; w.toast=m=>toasts.push(m); const Q=s=>d.querySelector(s), QA=s=>Array.from(d.querySelectorAll(s));
 const pad=n=>String(n).padStart(2,'0'); const ds=off=>{const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());};
 const C=w.BudgetPlan._calc; const mk=(type,category,amount,date)=>({id:Math.random().toString(36).slice(2),type,category,amount,date});
 const now=ds(0), nowD=C.parseDate(now);
 /* --- دوال نقيّة --- */
 o.N_num = C.num('abc')===0 && C.num(undefined)===0 && C.num('12.5')===12.5 && C.num(NaN)===0;
 o.N_badDates = C.parseDate('2026-02-30')===null && C.parseDate('')===null && C.parseDate(null)===null && !!C.parseDate('2026-02-28');
 o.N_cleanZero = C.cleanTx([mk('expense','food',0,now),mk('expense','food','x',now),mk('income','salary',100,now),null,{}]).length===1;
 /* الرصيد: افتتاحي + معاملات من تاريخ الرصيد؛ المستقبلية والأقدم لا تُحتسب */
 const tx=[mk('income','salary',500,ds(-5)),mk('expense','food',100,ds(-3)),mk('expense','food',999,ds(-40)),mk('expense','food',50,ds(+10)),mk('expense','food',20,'')];
 const bal=C.currentBalance({openingBalance:1000,balanceDate:ds(-10)},C.cleanTx(tx),now);
 o.B_balance = bal.balance===1000+500-100-20 && bal.future===1;
 o.B_balanceNoDate = C.currentBalance({openingBalance:0,balanceDate:''},C.cleanTx(tx),now).balance===500-100-999-20;
 o.B_emptyBalance = C.currentBalance({openingBalance:0,balanceDate:''},[],now).balance===0;
 /* المتوسطات */
 const none=C.averages([],now); o.A_none = none.days===0 && none.expMonthly===0 && none.enough===false;
 const av=C.averages(C.cleanTx([mk('expense','food',300,ds(-60)),mk('expense','food',300,ds(-1)),mk('income','salary',900,ds(-30))]),now);
 o.A_avg = av.days===61 && Math.abs(av.expMonthly-600*30.4375/61)<0.01 && Math.abs(av.incMonthly-900*30.4375/61)<0.01 && !!av.enough;
 const avShort=C.averages(C.cleanTx([mk('expense','food',70,ds(-2))]),now); o.A_shortMin14 = avShort.days===14 && !avShort.enough && Math.abs(avShort.expMonthly-70*30.4375/14)<0.01;
 /* المتكرر: لا ازدواج مع معاملة فعلية بنفس النوع/التصنيف بنفس الشهر */
 const ym=now.slice(0,7); const plan={recurring:[{type:'expense',category:'housing',amount:200,name:'إيجار'},{type:'income',category:'family',amount:300},{type:'expense',category:'internet',amount:20,end:'2000-01-01'}]};
 const rm=C.recurringMonthly(plan,C.cleanTx([mk('expense','housing',200,now)]),ym); o.R_noDouble = rm.expense===0 && rm.income===300 && rm.skipped.length===1;
 const rm2=C.recurringMonthly(plan,[],ym); o.R_counted = rm2.expense===200 && rm2.income===300;
 /* الأساس: المتكرر يرفع الحد الأدنى للإنفاق؛ الدخل من المتكرر إن وُجد */
 const b1=C.baseline({recurring:plan.recurring},[],now); o.R_baselineFromRecurring = b1.income===300 && b1.expense===220 && b1.incomeSource==='recurring';
 /* السيناريو */
 const base={income:1000,expense:800,byCat:{food:300,entertainment:100}};
 const s1=C.applyScenario(base,{expensePct:-10,extraIncome:50}); o.S_pct = Math.abs(s1.expense-720)<1e-9 && s1.income===1050 && Math.abs(s1.net-330)<1e-9;
 const s2=C.applyScenario(base,{catCuts:{food:50,entertainment:100,ghost:50}}); o.S_cats = Math.abs(s2.expense-(800-150-100))<1e-9;
 const s3=C.applyScenario(base,{expensePct:-500,incomePct:-500}); o.S_floor = s3.expense===0 && s3.income===0;
 o.S_noChange = C.applyScenario(base,{}).net===200 && C.applyScenario(base,null).net===200;
 /* التوقع */
 const f1=C.forecast(1000,{net:-250},6); o.F_burn = f1.state==='burning' && f1.runwayMonths===4 && f1.after===-500 && f1.runwayDays===121;
 const f2=C.forecast(1000,{net:100},6); o.F_sustain = f2.state==='sustainable' && f2.runwayMonths===null && f2.after===1600;
 const f3=C.forecast(0,{net:-50},6); o.F_zeroBal = f3.state==='depleted';
 const f4=C.forecast(100,{net:0},6); o.F_zeroNet = f4.state==='sustainable';
 /* حالة الشهر والتنبيهات */
 const planM={monthlyBudget:200,limits:{food:100},recurring:[]}; const txm=C.cleanTx([mk('expense','food',120,now),mk('expense','transport',90,now),mk('income','salary',1000,now)]);
 const st=C.monthStatus(planM,txm,now); o.M_status = st.expense===210 && st.left===-10 && Math.round(st.pct)===105 && st.rows[0].cat==='food' && st.rows[0].left===-20;
 const al=C.buildAlerts(planM,st,{balance:50},{},C.forecast(50,{net:-100},6),6); o.M_alerts = al.some(a=>/تجاوزت ميزانية الشهر/.test(a.t)) && al.some(a=>/حد «/.test(a.t)) && al.some(a=>/ينفد/.test(a.t));
 const stZero=C.monthStatus({monthlyBudget:0,limits:{},recurring:[]},[],now); o.M_zeroSafe = stZero.pct===null && stZero.left===null && stZero.expense===0 && stZero.projected===0;
 /* --- الواجهة والفصل عن البيانات الفعلية --- */
 w.space.budget=[{id:'a',type:'expense',category:'food',amount:40,date:now,note:''},{id:'b',type:'income',category:'salary',amount:500,date:now,note:''}];
 const before=JSON.stringify(w.space.budget);
 w.switchTab('budget'); w.renderBudget(); await sl(100);
 o.U_rendered = !!Q('#budgetPlan .bp-tabs') && QA('#budgetPlan .bp-limit').length>5;
 const set=(id,v)=>{ const e=Q('#'+id); e.value=v; e.dispatchEvent(new w.Event('change',{bubbles:true})); };
 set('bpOpen','100'); set('bpBudget','300'); await sl(30);
 const plan2=JSON.parse(w.localStorage.getItem('budgetPlan')||'null'); o.U_saved = !!plan2 && plan2.openingBalance===100 && plan2.monthlyBudget===300;
 o.U_kpi = /560/.test(Q('#budgetPlan .bp-kpis').textContent) && /260/.test(Q('#budgetPlan .bp-kpis').textContent);
 Q('[data-bp-tab=forecast]').click(); await sl(30);
 set('bpSimExp','-50'); await sl(30);
 o.U_simShown = /المحاكاة/.test(Q('#budgetPlan').textContent) && /الفرق بعد/.test(Q('#budgetPlan').textContent);
 o.U_simNoWrite = JSON.stringify(w.space.budget)===before && !/-50/.test(w.localStorage.getItem('budgetPlan')||'');
 Q('#bpScName').value='توفير'; Q('#bpScSave').click(); await sl(30);
 const plan3=JSON.parse(w.localStorage.getItem('budgetPlan')); o.U_scSaved = plan3.scenarios.length===1 && plan3.scenarios[0].expensePct===-50 && JSON.stringify(w.space.budget)===before;
 o.U_compare = QA('#budgetPlan .bp-tr').length>=2;
 Q('[data-bp-tab=recurring]').click(); await sl(30);
 Q('#bpRAmt').value='25'; Q('#bpRCat').value='internet'; Q('#bpRAdd').click(); await sl(30);
 o.U_recAdded = JSON.parse(w.localStorage.getItem('budgetPlan')).recurring.length===1 && JSON.stringify(w.space.budget)===before;
 toasts=[]; Q('#bpRAmt').value='0'; Q('#bpRAdd').click(); await sl(30); o.U_recZeroRejected = JSON.parse(w.localStorage.getItem('budgetPlan')).recurring.length===1;
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
