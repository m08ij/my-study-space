const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
/* اختبار منطق sw.js بمحاكاة (vm): هذا ليس تشغيلاً فعلياً داخل متصفح، بل تحقق من منطق معالج fetch */
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync((ROOT+'sw.js'),'utf8');
const listeners={}; const store={}; let netUp=true, netDelay=0; const netCalls=[];
const caches={ _open:{}, async open(n){ return this._open[n]||(this._open[n]={ async match(r){ return store[typeof r==='string'?r:r.url]; }, async put(r,res){ store[r.url]=res; }, async add(u){ store['./'+u]=1; } }); }, async match(r){ return store[typeof r==='string'?r:r.url]||store[typeof r==='string'?r:'']; }, async keys(){ return Object.keys(this._open); }, async delete(k){ delete this._open[k]; return true; } };
class Res{ constructor(b,s){ this.body=b; this.status=s||200; } clone(){ return new Res(this.body,this.status); } static error(){ const r=new Res('err',0); r.isError=true; return r; } }
const self={ addEventListener(t,f){ listeners[t]=f; }, skipWaiting(){}, clients:{ claim(){}, matchAll(){ return Promise.resolve([]); } }, location:{ origin:'https://x.github.io' } };
const ctx={ self, caches, Response:Res, fetch:async(req,opt)=>{ netCalls.push({url:req.url,opt}); if(netDelay) await new Promise(r=>setTimeout(r,netDelay)); if(!netUp) throw new Error('offline'); return new Res('net:'+req.url,200); }, console, Promise, setTimeout, clearTimeout };
ctx.global=ctx; vm.createContext(ctx); vm.runInContext(src,ctx);
const res={}; const T=(n,c)=>{ res[n]=!!c; };
async function fire(url,{mode='no-cors',accept='*/*',method='GET'}={}){ let responded=null; const e={ request:{url,method,mode,headers:{get:h=>h==='accept'?accept:null}}, respondWith(p){ responded=p; } }; listeners.fetch(e); return responded ? await responded : undefined; }
(async()=>{
  const css=await fire('https://x.github.io/app.css'); T('network_first_serves_fresh', css&&css.body==='net:https://x.github.io/app.css');
  T('revalidates_bypassing_http_cache', netCalls.some(c=>c.url.endsWith('app.css')&&c.opt&&c.opt.cache==='no-cache'));
  await new Promise(r=>setTimeout(r,20)); T('caches_after_success', !!store['https://x.github.io/app.css']);
  netUp=false; const off=await fire('https://x.github.io/app.css'); T('offline_serves_cache', off&&off.body==='net:https://x.github.io/app.css');
  const miss=await fire('https://x.github.io/never-cached.js'); T('offline_uncached_asset_errors', miss&&miss.isError===true);
  store['./index.html']={body:'shell',status:200}; store['https://x.github.io/']= {body:'rootshell'};
  const nav=await fire('https://x.github.io/somewhere',{mode:'navigate',accept:'text/html'}); T('offline_navigation_falls_back_to_html', !!nav);
  /* أيقونات: كاش أولاً + تحديث بالخلفية */
  netUp=true; netCalls.length=0; store['https://x.github.io/icons/icon-192.png']={body:'oldicon',status:200};
  const ic=await fire('https://x.github.io/icons/icon-192.png'); T('static_cache_first', ic&&ic.body==='oldicon');
  await new Promise(r=>setTimeout(r,20)); T('static_background_update', netCalls.some(c=>c.url.endsWith('icon-192.png'))&&store['https://x.github.io/icons/icon-192.png'].body==='net:https://x.github.io/icons/icon-192.png');
  /* شبكة بطيئة + نسخة مخزّنة: تُخدَم المخزّنة بعد NET_WAIT_MS ثم يتحدّث الكاش */
  vm.runInContext('NET_WAIT_MS=40',ctx); netDelay=250; store['https://x.github.io/slow.css']={body:'cached-copy',status:200};
  const t0=Date.now(); const slow=await fire('https://x.github.io/slow.css'); const dt=Date.now()-t0;
  T('slow_net_serves_cached', slow&&slow.body==='cached-copy'&&dt<200);
  await new Promise(r=>setTimeout(r,350)); T('slow_net_updates_cache_after', store['https://x.github.io/slow.css'].body==='net:https://x.github.io/slow.css');
  /* شبكة بطيئة بدون نسخة: ننتظر الشبكة */
  const slow2=await fire('https://x.github.io/new-file.js'); T('slow_net_no_cache_waits', slow2&&slow2.body==='net:https://x.github.io/new-file.js');
  netDelay=0;
  netUp=true; netCalls.length=0;
  const sb=await fire('https://abc.supabase.co/rest/v1/spaces'); T('supabase_not_intercepted', sb===undefined&&netCalls.length===0);
  const cdn=await fire('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'); T('cdn_not_intercepted', cdn===undefined);
  const post=await fire('https://x.github.io/api',{method:'POST'}); T('post_not_intercepted', post===undefined);
  console.log(JSON.stringify(res,null,1)); const bad=Object.entries(res).filter(([k,v])=>!v); process.exit(bad.length?1:0);
})();
