const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/(^|\/)vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const saves=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}}));
  w.scrollTo=()=>{}; w.fetch=()=>Promise.reject(new Error('offline'));
  if(mode!=='nolocal'){}
  const sbMode=mode;
  const state={data:{version:7,space:{courses:[{id:'1',name:'سحابة',code:'1',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'سحابي'}},welcomeDone:true},updated_at:sbMode==='cloudOld'?'2020-01-01T00:00:00Z':new Date(Date.now()+3600e3).toISOString()};
  w.supabase={createClient(){return {from(){return {select(){return {eq(){return {maybeSingle:async()=>{
      if(sbMode==='error') return {error:{message:'net'},data:null};
      if(sbMode==='empty') return {data:null,error:null};
      return {data:state,error:null};}};}};},
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async()=>({data:[],error:null})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={}; const sl=ms=>new Promise(r=>setTimeout(r,ms));
 w.addCourseEverywhere('حالية','111',3,{silent:true}); w.toast=()=>{}; let toasts=[]; w.toast=(m)=>toasts.push(m);
 let conf=true, confMsgs=[]; w.confirm=(m)=>{confMsgs.push(m);return conf;}; w.customConfirm=(m,run)=>{confMsgs.push(m); if(conf) run();}; w.location.reload=()=>{};
 let inp; const oc=w.document.createElement.bind(w.document); w.document.createElement=function(t){const e=oc(t); if(t==='input') inp=e; return e;};
 async function pick(text){ w.restoreFromFile(); inp.onchange({target:{files:[new w.File([text],'b.json')]}}); await sl(150); }
 o.btnHiddenInitially = w.document.getElementById('restorePrevBtn').style.display==='none';
 toasts=[]; await pick('{"a":1}'); o.rejectNoSpace = toasts.some(t=>t.includes('غير صالح')) && confMsgs.length===0;
 toasts=[]; await pick('not json'); o.rejectCorrupt = toasts.some(t=>t.includes('تالف'));
 conf=false; await pick(JSON.stringify({space:{courses:[{id:'x',name:'مستورد',code:'1',hours:3}],tasks:[]}})); o.cancelKeepsData = w.space.courses.some(c=>c.name==='حالية') && !w.space.courses.some(c=>c.name==='مستورد') && w.localStorage.getItem('ss_pre_restore_backup')===null;
 conf=true; await pick(JSON.stringify({space:{courses:[{id:'x',name:'مستورد',code:'1',hours:3}],tasks:[]},notes:[]})); 
 o.restoredApplied = w.space.courses.some(c=>c.name==='مستورد') && !w.space.courses.some(c=>c.name==='حالية');
 const pre=JSON.parse(w.localStorage.getItem('ss_pre_restore_backup')||'null'); o.preBackupHasOld = !!pre && pre.snapshot.space.courses.some(c=>c.name==='حالية');
 o.confirmShowedCounts = /1 مادة/.test(confMsgs[0]||'');
 w.refreshRestorePrevBtn(); o.btnShownAfter = w.document.getElementById('restorePrevBtn').style.display==='';
 let cb,fields; w.showModal=function(t,f,v,c){fields=f;cb=c;}; w.restorePreviousBackup();
 o.optionsCount = fields[0].options.length;
 cb({v:'pr'}); o.undoRestoreBringsBack = w.space.courses.some(c=>c.name==='حالية') && !w.space.courses.some(c=>c.name==='مستورد');
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
