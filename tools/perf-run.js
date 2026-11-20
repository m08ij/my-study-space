/* أداة تطوير (لا تُنشر): قياس سرعة الفتح على «جوال متوسط» بمتصفح Edge حقيقي: شبكة 4G بطيئة + معالج أبطأ ×4.
   node tools/perf-run.js [url=https://m08ij.github.io/my-study-space/] [runs=2]
   - طلبات Supabase محجوبة دائماً (ما بنرفع بيانات تجريبية لسحابة الإنتاج).
   - يزرع طالباً تجريبياً (6 مواد + جدول + مهام + امتحانات) ثم يقيس: فتح بارد (بلا كاش) وفتح دافئ (كاش/SW).
   - المقاييس: FCP، LCP، DCL، «جاهز» = لحظة رسم لوحة اليوم (#myDay فيها بطاقات)، مجموع المهام الطويلة (TBT تقريبي)، حجم المنقول، وذاكرة JS. */
const cdp = require('./cdp.js');
const url = process.argv[2] || 'https://m08ij.github.io/my-study-space/', runs = +(process.argv[3] || 2);
const SEED = `(function(){ var pad=function(x){return ('0'+x).slice(-2)}; function d(k){var x=new Date(); x.setDate(x.getDate()+k); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())}
  var C=['تفاضل وتكامل 2','برمجة كينونية','دوائر كهربائية','فيزياء عامة 2','تراكيب منفصلة','مهارات اتصال'].map(function(n,i){return {id:'c'+i,name:n,code:'CE10'+i,hours:3,instructor:'د. '+i,room:'ح.ب 10'+i}});
  var tt={}; ['Sun','Mon','Tue','Wed','Thu'].forEach(function(dy,di){ [8,10,12].forEach(function(h,j){ tt[dy+'-'+pad(h)+':00']={name:C[(di+j)%6].name,room:'ح.ب 10'+j,end:pad(h)+':50'}; }); });
  var T=[]; for(var j=0;j<24;j++) T.push({id:'t'+j,title:'مهمة '+j,due:d((j%10)-3),course:C[j%6].name,priority:['high','normal','low'][j%3],done:j%4===0,completedAt:j%4===0?d(0):null});
  var E=[{id:'e1',name:'ميد تفاضل',course:C[0].name,date:d(3),time:'10:00'},{id:'e2',name:'كويز برمجة',course:C[1].name,date:d(6)}];
  var att={}; C.forEach(function(c,i){att[c.name]={present:6+i,absent:i%3}});
  localStorage.clear(); localStorage.setItem('space',JSON.stringify({profile:{name:'طالب'},courses:C,tasks:T,exams:E,budget:[],timetable:tt,attendance:att,grades:[],completedCourses:[],currentSemester:3}));
  localStorage.setItem('welcomeDone','true'); localStorage.setItem('ss_onboarding_done_v1','true'); localStorage.setItem('ss_seen_news','"999"'); localStorage.setItem('ss_dp_seen', d(0)); return 'seeded'; })()`;
const METRICS = `new Promise(function(done){ var out={}, lcp=0, tbt=0;
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ lcp=Math.max(lcp,e.startTime); }); }).observe({type:'largest-contentful-paint',buffered:true}); }catch(e){}
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ tbt+=Math.max(0,e.duration-50); }); }).observe({type:'longtask',buffered:true}); }catch(e){}
  setTimeout(function(){ var n=performance.getEntriesByType('navigation')[0]||{}, p=performance.getEntriesByName('first-contentful-paint')[0];
    var res=performance.getEntriesByType('resource'), bytes=res.reduce(function(a,r){return a+(r.transferSize||0)},0)+(n.transferSize||0);
    out={ fcp:p?Math.round(p.startTime):null, lcp:Math.round(lcp), dcl:Math.round(n.domContentLoadedEventEnd||0), load:Math.round(n.loadEventEnd||0), ready:window.__ready||null, tbt:Math.round(tbt),
      kb:Math.round(bytes/1024), req:res.length+1, heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null, build:window.APP_BUILD };
    res.slice().sort(function(a,b){return b.duration-a.duration}).slice(0,4).forEach(function(r,i){ out['slow'+i]=r.name.split('/').pop().split('?')[0]+':'+Math.round(r.duration)+'ms/'+Math.round((r.transferSize||0)/1024)+'KB'; });
    done(JSON.stringify(out)); }, 2500); })`;
/* «جاهز»: أول لحظة تظهر فيها بطاقات لوحة اليوم — يُحقن قبل تحميل الصفحة */
const READY = `(function(){ var t0=performance.now(); var iv=setInterval(function(){ var m=document.querySelector('#fxMain .fx-next,#fxMain .fx-hello'); if(m){ window.__ready=Math.round(performance.now()); clearInterval(iv); } }, 16); setTimeout(function(){ clearInterval(iv); }, 30000); })();`;
(async () => { try {
  for(let r = 0; r < runs; r++){
    const b = await cdp.launch({ w: 390, h: 844, mobile: true });
    await b.send('Network.enable');
    /* ممنوع نلمس سحابة الإنتاج: أي طلب لـSupabase بيتحجب (القياس ببيانات تجريبية كان بيرفعها كمساحات جديدة) */
    await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*'] });
    await b.goto(url); await b.sleep(2500); await b.eval(SEED);
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: READY });
    await b.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await b.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await b.send('Network.clearBrowserCache'); await b.send('Network.setCacheDisabled', { cacheDisabled: true });
    await b.send('Page.navigate', { url: url + (url.indexOf('?') < 0 ? '?' : '&') + 'p=' + Date.now() }); await b.sleep(9000);
    console.log('cold', await b.eval(METRICS));
    await b.send('Network.setCacheDisabled', { cacheDisabled: false });
    await b.send('Page.navigate', { url: url + (url.indexOf('?') < 0 ? '?' : '&') + 'q=' + Date.now() }); await b.sleep(7000);
    console.log('warm', await b.eval(METRICS));
    const logs = b.logs.filter(l => !/Service Worker/.test(l)); if(logs.length) console.log('logs', JSON.stringify(logs.slice(0, 6)));
    await b.close();
  }
} catch(e){ console.log("ERR", e && e.stack); } })();
