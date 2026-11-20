const ROOT=require('path').resolve(process.env.SS_ROOT||require('path').join(__dirname,'..')).split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
exports.boot=function(ls){ const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,200)));
 let html=fs.readFileSync(ROOT+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/^vendor-/.test(s)?'':'<script>'+fs.readFileSync(ROOT+s.split('?')[0],'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}})); w.scrollTo=()=>{}; w.fetch=()=>Promise.reject(new Error('offline'));
  w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}}; w.HTMLElement.prototype.scrollIntoView=function(){};
  w.supabase={createClient(url,key,opts){ w.__sbOpts=opts; return {from(){return {select(){return {eq(){return {maybeSingle:async()=>({data:null,error:null})}}}},upsert:async()=>({error:null})}},storage:{from(){return {list:async()=>({data:[],error:null}),upload:async()=>({error:null}),remove:async()=>({error:null}),getPublicUrl:()=>({data:{publicUrl:'http://x'}})}}}}}};
  { let __sb=w.supabase, __ready=false; w.addEventListener('DOMContentLoaded',()=>{ __ready=true; }); Object.defineProperty(w,'supabase',{get:()=>__sb,set:v=>{ if(__ready) __sb=v; },configurable:true}); }   /* حزمة النشر تتضمّن مكتبة supabase الحقيقية؛ نثبّت المحاكي حتى تبقى الاختبارات معزولة عن الشبكة */
  if(ls) Object.keys(ls).forEach(k=>w.localStorage.setItem(k,ls[k]));
 }}); return {dom,w:dom.window,errs}; };
