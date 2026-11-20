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
  w.supabase={createClient(){return {rpc:(n,a)=>global.RPC?global.RPC(n,a):Promise.resolve({data:null,error:{code:'PGRST202',message:'Could not find the function'}}), from(){return {select(){return {eq(){return {maybeSingle:async()=>{
      if(sbMode==='error') return {error:{message:'net'},data:null};
      if(sbMode==='empty') return {data:null,error:null};
      return {data:state,error:null};}};}};},
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async(prefix)=>{ if(global.STORE_FAIL) return {data:null,error:{message:'StorageUnknownError'}}; const seen={},out=[]; Object.keys(global.STORE).forEach(k=>{ if(!k.startsWith(prefix+'/')) return; const rest=k.slice(prefix.length+1); const nm=rest.split('/')[0]; if(seen[nm]) return; seen[nm]=1; out.push(rest.includes('/')?{name:nm,id:null}:{name:nm,id:'x',metadata:{size:global.STORE[k].size,mimetype:'application/pdf'},created_at:'t'}); }); return {data:out,error:null}; }, upload:async(path,file)=>{ global.STORE[path]={size:file.size||1}; return {error:null}; }, remove:async(paths)=>{ paths.forEach(p=>{delete global.STORE[p];}); return {error:null}; }, getPublicUrl:(p)=>({data:{publicUrl:'http://x/'+p}})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={}; const sl=ms=>new Promise(r=>setTimeout(r,ms)); global.STORE={};
 const calls=[]; global.RPC=null; const SB=w.SB; const tableSavesBefore=saves.length;
 /* الافتراضي: RPC معطّل (لا طلبات rpc ولا أخطاء 404 بالـ Console). عند تفعيله والدوال غير موجودة → رجوع تلقائي للجدول وتذكّر ذلك بالجلسة */
 o.R_defaultIsRpcFallbackIfServerLacksIt = SB.rpcMode()==='fallback'&&w.sessionStorage.getItem('ss_rpc_missing')==='1';
 SB.setUseRpc(true); o.R_enabledIsRpc = SB.rpcMode()==='rpc';
 global.RPC=null; const t0=await SB.load();
 o.R_defaultFallsBack = !!t0&&!!t0.data&&!!t0.updated_at&&SB.lastLoadStatus==='ok'&&SB.rpcMode()==='fallback'&&w.sessionStorage.getItem('ss_rpc_missing')==='1';
 global.RPC=async(n,a)=>{ calls.push(n); return {data:null,error:null}; };
 calls.length=0; await SB.load(); await SB.peekUpdatedAt(); o.R_fallbackNoMoreRpcCalls = calls.length===0;
 /* تفعيل RPC */
 SB.setUseRpc(true); o.R_modeRpc = SB.rpcMode()==='rpc';
 const row={data:{version:7,space:{courses:[{id:'r1',name:'من الدالة'}]}},updated_at:'2026-10-04T10:00:00+00:00'};
 global.RPC=async(n,a)=>{ calls.push(n+':'+JSON.stringify(Object.keys(a))); return {data:{data:row.data,updated_at:row.updated_at},error:null}; };
 calls.length=0; const l1=await SB.load();
 o.R_loadViaRpc = calls.length===1&&calls[0]==='get_space:["p_code"]'&&l1.data.space.courses[0].name==='من الدالة'&&l1.updated_at===row.updated_at&&SB.lastLoadStatus==='ok';
 global.RPC=async(n,a)=>{ calls.push(n); return {data:null,error:null}; }; const l2=await SB.load(); o.R_loadEmpty = l2===null&&SB.lastLoadStatus==='empty';
 global.RPC=async(n,a)=>({data:null,error:{message:'boom',code:'XX000'}}); const tableCallsBefore=0; const l3=await SB.load(); o.R_loadErrorNoFallback = l3===null&&SB.lastLoadStatus==='error'&&SB.rpcMode()==='rpc';
 /* peek */
 global.RPC=async(n,a)=>{ calls.push(n+':'+a.p_code); return {data:'2026-10-04T11:00:00+00:00',error:null}; }; calls.length=0; const p1=await SB.peekUpdatedAt(); o.R_peekViaRpc = p1.status==='ok'&&p1.updated_at==='2026-10-04T11:00:00+00:00'&&/^peek_space:[A-Z0-9]{6,32}$/.test(calls[0]);
 global.RPC=async()=>({data:null,error:null}); const p2=await SB.peekUpdatedAt(); o.R_peekEmpty = p2.status==='empty';
 global.RPC=async()=>({data:null,error:{message:'x',code:'XX000'}}); const p3=await SB.peekUpdatedAt(); o.R_peekError = p3.status==='error';
 /* save */
 let got=null; global.RPC=async(n,a)=>{ got={n,a}; return {data:null,error:null}; }; const s1=await SB.save({version:7,space:{courses:[]}});
 o.R_saveViaRpc = s1===true&&got.n==='put_space'&&Object.keys(got.a).sort().join()==='p_code,p_data,p_updated_at'&&/^[A-Z0-9]{6,32}$/.test(got.a.p_code)&&!isNaN(Date.parse(got.a.p_updated_at))&&saves.length===tableSavesBefore;
 global.RPC=async()=>({data:null,error:{message:'denied',code:'42501'}}); const s2=await SB.save({space:{}}); o.R_saveErrorNoFallback = s2===false&&saves.length===tableSavesBefore;
 /* الدالة غير موجودة بالخادم: رجوع للجدول مرة واحدة وتذكّر ذلك */
 SB.setUseRpc(true); calls.length=0; global.RPC=async(n)=>{ calls.push(n); return {data:null,error:{code:'PGRST202',message:'Could not find the function public.put_space(p_code, p_data, p_updated_at) in the schema cache'}}; };
 const s3=await SB.save({version:7,space:{courses:[]}}); o.R_missingFallsBackToTable = s3===true&&calls.length===1&&saves.length===tableSavesBefore+1&&SB.rpcMode()==='fallback';
 const l4=await SB.load(); const p4=await SB.peekUpdatedAt(); o.R_fallbackRemembered = calls.length===1&&l4&&p4.status==='ok';
 SB.setUseRpc(true); o.R_resetClearsFallback = SB.rpcMode()==='rpc';
 /* 404 بدون كود */
 global.RPC=async(n)=>({data:null,status:404,error:{message:'Not Found',status:404}}); const l5=await SB.load(); o.R_404Fallback = l5&&SB.rpcMode()==='fallback';
 /* إيقاف الوضع */
 SB.setUseRpc(false); calls.length=0; global.RPC=async(n)=>{ calls.push(n); return {data:null,error:null}; }; await SB.load(); await SB.save({space:{}}); o.R_disableBackToTable = SB.rpcMode()==='table'&&calls.length===0;
 /* ===== قائمة الملفات عبر RPC (بدل list المباشر) ===== */
 SB.setUseRpc(true); { const rc=[]; global.RPC=async(n,a)=>{ rc.push([n,a]); return {data:[{name:'1_a.pdf',id:'x',created_at:'2026-01-02T00:00:00Z',metadata:{size:12,mimetype:'application/pdf'}}],error:null}; }; const fl=await SB.listCourseFiles('c1',true);
  o.R_listUsesRpc = rc.length===1&&rc[0][0]==='list_course_files'&&rc[0][1].p_course==='c1'&&rc[0][1].p_code===SB.getCode()&&rc[0][1].p_limit===100&&fl.length===1&&fl[0].name==='1_a.pdf'&&fl[0].size===12&&/c1\/1_a\.pdf$/.test(fl[0].path)&&/^http/.test(fl[0].url);
  global.RPC=async()=>({data:null,error:{message:'boom',code:'XX000'}}); const fe=await SB.listCourseFiles('c2',true); o.R_listErrorIsNull = fe===null;
  global.RPC=async()=>({data:null,error:{code:'PGRST202',message:'Could not find the function public.list_course_files'}}); const ff=await SB.listCourseFiles('c3',true); o.R_listMissingFallsBackToStorage = Array.isArray(ff)&&SB.rpcMode()==='rpc'; } o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
