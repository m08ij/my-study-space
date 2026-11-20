const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const P=ROOT;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SRC=fs.readFileSync(P+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/^vendor-/.test(s)?'':'<script>'+fs.readFileSync(P+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
function mkCloud(){ return {row:null,down:false,trigger:false,writes:0,loads:0}; }
function device(cloud,ls,name){ const errs=[];
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>{const m=(e.message||'');if(!/navigation|not implemented/i.test(m))errs.push(m.slice(0,150));});
  const dom=new JSDOM(SRC,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
    w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}}); w.scrollTo=()=>{}; w.fetch=()=>Promise.reject(new Error('x'));
    Object.keys(ls||{}).forEach(k=>w.localStorage.setItem(k,ls[k]));
    const fmt=d=>d.toISOString().replace('Z','+00:00');
    w.supabase={createClient(){return {from(){return {
      select(cols){return {eq(){return {maybeSingle:async()=>{ if(cloud.delayLoad&&cols.includes('data')) await sleep(cloud.delayLoad); if(cloud.down) return {error:{message:'net'},data:null};
        if(!cloud.row) return {data:null,error:null};
        return {error:null,data: cols.includes('data')?{data:JSON.parse(JSON.stringify(cloud.row.data)),updated_at:cloud.row.updated_at}:{updated_at:cloud.row.updated_at}}; }};}};},
      upsert:async(r)=>{ if(cloud.down) return {error:{message:'net'}}; cloud.writes++; cloud.row={data:JSON.parse(JSON.stringify(r.data)),updated_at:cloud.trigger?fmt(new Date()):fmt(new Date(r.updated_at))}; return {error:null}; }};},
      storage:{from(){return {list:async()=>({data:[],error:null})}}}};}};
  }});
  return {w:dom.window,errs,name,dump(){const o={};for(let i=0;i<dom.window.localStorage.length;i++){const k=dom.window.localStorage.key(i);o[k]=dom.window.localStorage.getItem(k);}return o;},close(){dom.window.close();}};
}
const res=[]; const T=(n,c,d)=>{res.push((c?'PASS ':'FAIL ')+n+(d?'  ['+d+']':''));};
const names=d=>d.w.space.courses.map(c=>c.name).join(',');
const cloudNames=c=>c.row?c.row.data.space.courses.map(x=>x.name).join(','):'(empty)';
const settle=()=>sleep(2600), saveWait=()=>sleep(2200);
module.exports={device,mkCloud,sleep,T,res,names,cloudNames,settle,saveWait};

