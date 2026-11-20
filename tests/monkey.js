/* اختبار «قرد»: نقر عشوائي بكل الأزرار والحقول بكل التابات مع مدخلات مؤذية، ورصد أي خطأ JS (تصادم/استثناء/promise).
   حتمي (PRNG ببذرة) لإعادة التكرار:  node monkey.js [seed] [steps] */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const SEED=+process.argv[2]||1, STEPS=+process.argv[3]||350; let s=SEED*2654435761%4294967296||1; const rnd=()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; const pick=a=>a[Math.floor(rnd()*a.length)];
const pad=n=>String(n).padStart(2,'0'); const ds=(k)=>{ const d=new Date(Date.now()+k*86400000); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const base={profile:{name:'قرد'},courses:[{id:'c1',name:'شبكات حاسوب',code:'0301',hours:3,instructor:'د. أ',room:'202'},{id:'c2',name:'خوارزميات',code:'0302',hours:3,instructor:'',room:''}],
 tasks:[{id:'t1',title:'واجب',course:'شبكات حاسوب',due:ds(1),done:false,priority:'high'},{id:'t2',title:'متأخرة',course:'',due:ds(-3),done:false}],exams:[{id:'e1',name:'ميد',course:'خوارزميات',date:ds(2),time:'10:00',room:'A'}],
 attendance:{'شبكات حاسوب':{present:5,absent:1},'خوارزميات':{present:2,absent:3}},grades:[{name:'شبكات حاسوب',items:[{name:'ك',score:5,weight:10}]}],
 timetable:{'Sun-08:00':{name:'شبكات حاسوب',room:'1',end:'09:30'},'Mon-10:00':{name:'خوارزميات',room:'2',end:'11:00'},'Tue-13:00':{name:'شبكات حاسوب',room:'3'}},
 decks:[{id:'d1',name:'م',cards:[{q:'a',a:'b'},{q:'c',a:'d',last:ds(-5),due:ds(-1),ivl:2,reps:2}]}],budget:[{id:'b1',type:'income',category:'family',amount:100,date:ds(0),note:''},{id:'b2',type:'expense',category:'food',amount:7.5,date:ds(0),note:'x'}],completedCourses:[],currentSemester:1};
const EVIL=['','   ','0','-5','1e9','٣٤','<img src=x onerror=alert(1)>','"\'`${}','😀'.repeat(30),'a'.repeat(400),'2020-02-30','9999-12-31','NaN','null','undefined','10:99','25:00','١٠:٣٠','0.0000001','--','\u0000','\n\n'];
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify(base),notes:JSON.stringify([{title:'n',body:'b',ts:1}]),gpaRows:JSON.stringify([{name:'a',hrs:3,grade:'A (90-100)'}])}); await sl(2200); w.URL.createObjectURL=()=>'blob:test'; w.URL.revokeObjectURL=()=>{}; /* jsdom ما يدعم تنزيل الملفات: الضغط على «تصدير» ما يجب أن يعدّ فشلاً */
 const d=w.document,Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)];
 d.execCommand=()=>true; w.confirm=()=>true; w.alert=()=>{}; w.print=()=>{}; w.open=()=>null;
 const tabs=['dashboard','timetable','courses','tasks','exams','attendance','timer','gradecalc','budget','plan','hulinks'];
 const seenErr=new Map(); let steps=0, clicks=0, fills=0, mods=0;
 const note=(msg,ctx)=>{ const k=String(msg).slice(0,200); if(!seenErr.has(k)) seenErr.set(k,ctx); };
 w.addEventListener('error',e=>note('window.onerror: '+e.message,'tab='+cur+' step='+steps));
 w.addEventListener('unhandledrejection',e=>note('unhandledrejection: '+(e.reason&&e.reason.message||e.reason),'tab='+cur+' step='+steps));
 let cur='dashboard';
 const visible=e=>{ if(!e.isConnected) return false; if(e.disabled) return false; let n=e; while(n&&n!==d.body){ const st=w.getComputedStyle(n); if(st.display==='none'||n.hidden) return false; n=n.parentElement; } return true; };
 const closeModals=async()=>{ for(let i=0;i<4&&QA('.modal-backdrop,.hub-sheet-backdrop,.cmdk-backdrop,.stt-backdrop,.lw-backdrop.show,.sync-conflict-backdrop,.ics-backdrop').length;i++){ d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true})); await sl(8); } QA('.modal-backdrop,.hub-sheet-backdrop,.cmdk-backdrop,.stt-backdrop,.sync-conflict-backdrop,.modal-ghost').forEach(x=>x.remove()); };
 const fillAll=()=>{ const inputs=QA('.modal input:not([type=file]),.modal textarea,.modal select,.stt-backdrop input,.stt-backdrop select,.hub-sheet input,.hub-sheet select,.hub-sheet textarea,#'+cur+' input:not([type=file]),#'+cur+' textarea,#'+cur+' select').filter(visible); inputs.slice(0,6).forEach(i=>{ try{ if(i.tagName==='SELECT'){ if(i.options.length){ i.selectedIndex=Math.floor(rnd()*i.options.length); i.dispatchEvent(new w.Event('change',{bubbles:true})); } } else if(i.type==='checkbox'||i.type==='radio'){ i.checked=rnd()<.5; i.dispatchEvent(new w.Event('change',{bubbles:true})); } else if(i.type==='color'){ i.value='#'+Math.floor(rnd()*0xffffff).toString(16).padStart(6,'0'); i.dispatchEvent(new w.Event('input',{bubbles:true})); } else { let v=pick(EVIL); if(i.type==='number'&&!/^-?\d/.test(v)) v=pick(['','0','-1','3.7','999999']); if(i.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v)) v=pick(['','2026-10-05','2020-01-01','2099-12-31']); if(i.type==='time'&&!/^\d{2}:\d{2}$/.test(v)) v=pick(['','08:30','23:59']); if(i.type==='range') v=String(Math.floor(rnd()*100)); i.value=v; i.dispatchEvent(new w.Event('input',{bubbles:true})); i.dispatchEvent(new w.Event('change',{bubbles:true})); } fills++; }catch(e){ note('fill: '+e.message,'tab='+cur); } }); };
 const BAD=/إعادة تحميل|reload|مسح كل|تحميل\b|تنزيل|تصدير|📥|📤|طباعة|🖨/;
 for(let step=0;step<STEPS;step++){
  steps=step;
  if(step%25===0){ cur=pick(tabs); try{ w.switchTab(cur,false); }catch(e){ note('switchTab: '+e.message,cur); } await sl(25); }
  const modalOpen=QA('.modal-backdrop,.hub-sheet-backdrop,.stt-backdrop').length>0;
  const scope=modalOpen?'.modal-backdrop,.hub-sheet-backdrop,.stt-backdrop':'#'+cur+',.sidebar,.topbar,.settings-menu,#fabMenu,.bottom-nav,#aiPanel,#themePanel';
  const cands=QA(scope.split(',').map(x=>x.trim()+' button, '+x.trim()+' [role=button], '+x.trim()+' [role=checkbox], '+x.trim()+' .chip, '+x.trim()+' .nav-item, '+x.trim()+' .section-tab, '+x.trim()+' [data-act]').join(',')).filter(visible).filter(b=>!BAD.test(b.textContent||'')&&!b.closest('[data-keep-away]'));
  const r=rnd();
  try{
   if(r<.12) fillAll();
   else if(r<.17){ await closeModals(); }
   else if(r<.2){ const ks=['Escape','Enter','Tab','ArrowDown','ArrowUp','/','?','k','n','t','q']; const k=pick(ks); d.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,altKey:rnd()<.5,bubbles:true,cancelable:true})); }
   else if(cands.length){ const el=pick(cands); clicks++; el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true})); if(QA('.modal-backdrop').length) mods++; }
  }catch(e){ note('step '+step+': '+(e&&e.stack||e).toString().split('\n').slice(0,2).join(' | '),'tab='+cur); }
  await sl(4);
 }
 await closeModals(); await sl(300);
 const dl=w.DiagLog?w.DiagLog.list():[]; dl.forEach(x=>note('DiagLog: '+x.m+' @'+x.s,'seed='+SEED));
 errs.filter(e=>!/offline|Not implemented|Could not parse|navigation/i.test(e)).forEach(e=>note('jsdom: '+e,'seed='+SEED));
 /* سلامة البيانات بعد القصف: space ما زال كائناً صالحاً قابلاً للتسلسل */
 let ok=true; try{ JSON.stringify(w.space); ['courses','tasks','exams','decks','budget','grades'].forEach(k=>{ if(!Array.isArray(w.space[k])) ok=false; }); if(!w.space.attendance||typeof w.space.attendance!=='object') ok=false; }catch(e){ ok=false; }
 console.log(JSON.stringify({seed:SEED,steps:STEPS,clicks,fills,modalsOpened:mods,dataShapeOK:ok,uniqueErrors:seenErr.size},null,0));
 [...seenErr.entries()].forEach(([m,c])=>console.log('FAIL '+m+'  ['+c+']'));
 process.exit(seenErr.size||!ok?1:0);
})();
