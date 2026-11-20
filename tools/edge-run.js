/* أداة تطوير (لا تُنشر): فحص حالات حدّية بمتصفح حقيقي — مستخدم جديد فاضي، شاشة 320px، وبيانات ضخمة (أداء + تمرير أفقي + أخطاء Console).
   node tools/edge-run.js [port] */
const cdp = require('./cdp.js');
const port = process.argv[2] || '8770', base = 'http://127.0.0.1:' + port + '/';
const TABS = ['dashboard', 'timetable', 'courses', 'tasks', 'exams', 'attendance', 'timer', 'gradecalc', 'budget', 'plan', 'campus', 'hulinks'];
async function sweep(b, label){
  const r = await b.eval(`(async()=>{ var out={over:[],empty:[],ms:{}}; var tabs=${JSON.stringify(TABS)};
    for(var i=0;i<tabs.length;i++){ var t0=performance.now(); window.switchTab(tabs[i],false); await new Promise(r=>setTimeout(r,350)); out.ms[tabs[i]]=Math.round(performance.now()-t0-350);
      var de=document.documentElement; if(de.scrollWidth>de.clientWidth+1) out.over.push(tabs[i]+':'+de.scrollWidth+'>'+de.clientWidth);
      var s=document.getElementById(tabs[i]); if(!s||s.getBoundingClientRect().height<60) out.empty.push(tabs[i]); }
    return JSON.stringify(out); })()`);
  console.log(label, r);
}
(async () => {
  /* 1) مستخدم جديد بعرض 320 */
  let b = await cdp.launch({ w: 320, h: 640, mobile: true });
  await b.goto(base); await b.sleep(1500);
  console.log('welcome shown', await b.eval(`getComputedStyle(document.getElementById('welcomeOverlay')).display !== 'none'`),
    'overflow', await b.eval(`document.documentElement.scrollWidth + '/' + document.documentElement.clientWidth`));
  await b.eval(`(()=>{var e=document.getElementById('welcomeName'); e.value='سارة'; e.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('welcomeBtn').click();})()`);
  await b.sleep(2500);
  await b.eval(`(()=>{ var s=[...document.querySelectorAll('button')].filter(e=>e.offsetParent&&/تخطي|تخطّي/.test(e.textContent))[0]; if(s) s.click(); })()`);
  await sweep(b, 'EMPTY@320');
  console.log('EMPTY logs', JSON.stringify(b.logs.filter(l => !/Service Worker/.test(l))));
  await b.close();

  /* 2) بيانات ضخمة: 25 مادة، 300 مهمة، 60 امتحان، 400 بند ميزانية */
  b = await cdp.launch({ w: 1366, h: 800 });
  await b.goto(base); await b.sleep(1200);
  await b.eval(`(()=>{ var pad=function(x){return ('0'+x).slice(-2)}; function d(k){var x=new Date(); x.setDate(x.getDate()+k); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())}
    var C=[]; for(var i=0;i<25;i++) C.push({id:'c'+i,name:'مادة رقم '+i+' بعنوان طويل جداً للاختبار',code:'011'+i,hours:3,instructor:'د. '+i,room:'ح.ب '+(100+i)});
    var T=[]; for(var j=0;j<300;j++) T.push({id:'t'+j,title:'مهمة '+j+' — نص طويل قليلاً لاختبار الالتفاف',due:d((j%40)-10),course:C[j%25].name,priority:['high','normal','low'][j%3],done:j%5===0});
    var E=[]; for(var k=0;k<60;k++) E.push({id:'e'+k,name:'امتحان '+k,date:d(k-5),time:'10:00',course:C[k%25].name});
    var B=[]; for(var m=0;m<400;m++) B.push({id:'b'+m,type:m%7?'expense':'income',title:'بند '+m,amount:(m%50)+1,date:d(-(m%60)),category:['food','transport','other'][m%3]});
    var tt={}; ['Sun','Mon','Tue','Wed','Thu'].forEach(function(dy,di){ for(var h=8;h<17;h++) tt[dy+'-'+pad(h)+':00']={name:C[(di*9+h)%25].name,room:'م.ش '+h,end:pad(h)+':50'}; });
    var att={}; C.forEach(function(c,i){att[c.name]={present:i,absent:i%4}});
    localStorage.clear(); localStorage.setItem('space',JSON.stringify({profile:{name:'ضغط'},courses:C,tasks:T,exams:E,budget:B,timetable:tt,attendance:att,grades:[]}));
    localStorage.setItem('welcomeDone','true'); localStorage.setItem('ss_onboarding_done_v1','true'); localStorage.setItem('ss_seen_news','999'); location.reload(); })()`);
  await b.sleep(4500);
  console.log('BIG boot', await b.eval(`JSON.stringify({tasks:space.tasks.length, dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd)})`));
  await sweep(b, 'BIG@1366');
  const lt = await b.eval(`(async()=>{ var n=0,max=0; try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ n++; if(e.duration>max) max=e.duration; }); }).observe({type:'longtask',buffered:true}); }catch(e){} await new Promise(r=>setTimeout(r,500)); return JSON.stringify({longTasks:n, maxMs:Math.round(max)}); })()`);
  console.log('BIG longtasks', lt);
  console.log('BIG logs', JSON.stringify(b.logs.filter(l => !/Service Worker/.test(l))));
  await b.close();
})();
