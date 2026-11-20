const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/^vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
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
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async()=>{global.LC=(global.LC||0)+1; if(global.FAIL) return {data:null,error:{message:'StorageUnknownError'}}; return {data:[{name:'1_a.pdf',metadata:{size:2048,mimetype:'application/pdf'},created_at:'x'}],error:null};},getPublicUrl:()=>({data:{publicUrl:'http://x/y'}}),upload:async()=>({error:null}),remove:async()=>({error:null})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={};
 w.addCourseEverywhere('م1','111',3,{silent:true}); await new Promise(r=>setTimeout(r,300)); w.__perfClearFileCache(); const id=w.space.courses[0].id;
 /* فشل مؤقت ثم نجاح خلال مهلة إعادة المحاولة */
 global.FAIL=true; global.LC=0; const p=w.SB.listCourseFiles(id); setTimeout(()=>{global.FAIL=false;},500); const r=await p;
 o.transientRecovered=Array.isArray(r)&&r.length===1; o.callsTransient=global.LC;
 /* فشل دائم: محاولتان فقط ثم null (بدون حلقة) */
 w.__perfClearFileCache(); global.FAIL=true; global.LC=0; const r2=await w.SB.listCourseFiles(id); o.permanentNull=r2===null; o.callsPermanent=global.LC;
 /* بعد الفشل لا يُكاش: طلب جديد يُرسل */
 global.LC=0; global.FAIL=false; const r3=await w.SB.listCourseFiles(id); o.afterFailRefetch=Array.isArray(r3)&&global.LC===1;
 /* أثناء إغلاق الصفحة: لا إعادة محاولة */
 w.__perfClearFileCache(); w.dispatchEvent(new w.Event('pagehide')); global.FAIL=true; global.LC=0; const r4=await w.SB.listCourseFiles(id); o.noRetryWhenUnloading=(r4===null&&global.LC===1);
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
