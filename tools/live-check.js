/* فحص شامل للموقع (الحي أو المحلي) بمتصفح حقيقي: node tools/live-check.js [url=الموقع الحي] [build]
   كل الشاشات × 3 عروض × غامق/فاتح (تداخل/تمرير أفقي/أخطاء) + المساعد الحقيقي عبر n8n + قراءة الصور + الخريطة + أوفلاين. Supabase محجوب. */
const cdp = require('./cdp.js');
const URL0 = process.argv[2] || 'https://m08ij.github.io/my-study-space/', BUILD = process.argv[3] || '';
const VIEWS = ['today','timetable','tasks','grades','courses','exams','attendance','budget','timer','plan','tree','gpa','stats','prayer','more','settings','campus','hulinks'];
const SEED = `(function(){ var pad=function(x){return ('0'+x).slice(-2)}; function d(k){var x=new Date(); x.setDate(x.getDate()+k); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate())}
  var C=['تفاضل وتكامل (1)','فيزياء عامة (1)','برمجة الحاسوب','مهارات الاتصال','لغة عربية'].map(function(n,i){return {id:'c'+i,name:n,code:'10'+i,hours:3}});
  var tt={}; ['Sun','Mon','Tue','Wed','Thu'].forEach(function(dy,di){ [8,10,12].forEach(function(h,j){ tt[dy+'-'+pad(h)+':00']={name:C[(di+j)%5].name,room:'ح.ب 10'+j,end:pad(h)+':50'}; }); });
  var T=[]; for(var j=0;j<10;j++) T.push({id:'t'+j,title:'مهمة '+j,due:d((j%8)-2),course:C[j%5].name,priority:['high','normal'][j%2],done:j%4===0});
  var E=[{id:'e1',name:'ميد تفاضل',course:C[0].name,date:d(3),time:'10:00'},{id:'e2',name:'كويز برمجة',course:C[2].name,date:d(6)}];
  var att={}; C.forEach(function(c,i){att[c.name]={present:6+i,absent:i%3}});
  localStorage.clear(); localStorage.setItem('space',JSON.stringify({profile:{name:'فاحص'},courses:C,tasks:T,exams:E,budget:[{id:'b1',type:'income',category:'salary',amount:200,date:d(-3)},{id:'b2',type:'expense',category:'food',amount:12,date:d(-1)}],timetable:tt,attendance:att,grades:[],completedCourses:[],currentSemester:3}));
  localStorage.setItem('welcomeDone','true'); localStorage.setItem('ss_onboarding_done_v1','true'); localStorage.setItem('ss_seen_news','"999"'); localStorage.setItem('ss_dp_seen', d(0)); return 'seeded'; })()`;
const CHECK = v => `(function(){ var m=document.getElementById('fxMain'); if(!m) return {v:'${v}',err:'no main'};
  var de=document.documentElement, hs=de.scrollWidth>de.clientWidth+2 || m.scrollWidth>m.clientWidth+2;
  var els=[].slice.call(m.querySelectorAll('button,a,input,select,.fx-glass,.fx-sec,.fx-tools,.fx-actions')).filter(function(e){var s=getComputedStyle(e);var cd=e.closest('details:not([open])'); if(cd&&!(e.tagName==='SUMMARY'||e===cd||e.closest('summary'))) return false; return e.offsetParent!==null&&s.position!=='absolute'&&s.position!=='fixed'&&e.getBoundingClientRect().width>0;});
  var ov=[]; for(var i=0;i<els.length;i++)for(var j=i+1;j<els.length;j++){var a=els[i],c=els[j]; if(a.contains(c)||c.contains(a))continue; var A=a.getBoundingClientRect(),B=c.getBoundingClientRect(); var ox=Math.min(A.right,B.right)-Math.max(A.left,B.left),oy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top); if(ox>2&&oy>2) ov.push((a.textContent||a.className).trim().slice(0,14)+' ✕ '+(c.textContent||c.className).trim().slice(0,14)); }
  var off=[].slice.call(m.querySelectorAll('button,a')).filter(function(e){ if(e.offsetParent===null) return false; for(var q=e.parentNode;q&&q!==m;q=q.parentNode){ var ox=getComputedStyle(q).overflowX; if(ox==='auto'||ox==='scroll') return false; } var r=e.getBoundingClientRect(); return r.width>0&&(r.right>innerWidth+1||r.left<-1); }).length;
  var empty=(m.textContent||'').trim().length<20;
  return {v:'${v}',hscroll:hs,overlaps:ov.slice(0,3),offscreen:off,empty:empty}; })()`;
(async () => {
  const report = { problems: [], info: [] };
  const P = (s) => { report.problems.push(s); console.log('✗ ' + s); }, I = (s) => { report.info.push(s); console.log('· ' + s); };
  for (const [W, H, mob] of [[390, 844, true], [768, 1024, true], [1440, 900, false]]) {
    for (const mode of ['dark', 'light']) {
      const b = await cdp.launch({ w: W, h: H, mobile: mob });
      await b.goto(URL0); await b.sleep(3500); await b.eval(SEED); await b.eval(`localStorage.setItem('ss_fx_mode','${mode}');location.reload()`); await b.sleep(5000);
      const build = await b.eval('window.APP_BUILD'); if (BUILD && build !== BUILD) P(W + ' ' + mode + ': build ' + build + ' بدل ' + BUILD);
      let bad = 0;
      for (const v of VIEWS) {
        await b.eval(`FocusUI.go('${v}')`); await b.sleep(v === 'campus' ? 1500 : 700);
        const r = await b.eval(CHECK(v));
        if (typeof r === 'string') { P(W + ' ' + mode + ' ' + v + ': ' + r); bad++; continue; }
        if (r.err || r.hscroll || r.overlaps.length || r.offscreen || r.empty) { P(W + ' ' + mode + ' ' + v + ': ' + JSON.stringify(r)); bad++; }
      }
      const errs = b.logs.filter(l => /error|Uncaught|TypeError|ReferenceError/i.test(l) && !/Supabase|supabase|net::ERR_BLOCKED|Failed to load resource|favicon/i.test(l));
      if (errs.length) P(W + ' ' + mode + ' أخطاء console: ' + JSON.stringify(errs.slice(0, 4)));
      I(W + 'px ' + mode + ': ' + VIEWS.length + ' شاشة، مشاكل ' + bad + '، build ' + build);
      if (W === 1440 && mode === 'dark') {
        /* المساعد الحقيقي من الواجهة */
        await b.eval("FocusUI.go('today')"); await b.sleep(500);
        await b.eval("localStorage.removeItem('ss_asst_consent'); Assistant.open('')"); await b.sleep(600);
        await b.eval("document.getElementById('aiInput').value='شو امتحاناتي الجاية؟'; document.getElementById('aiSend').click()"); await b.sleep(700);
        const consent = await b.eval("!!document.querySelector('.modal-backdrop')");
        await b.eval("(function(){var bs=[].slice.call(document.querySelectorAll('.modal-backdrop button'));var ok=bs.filter(function(x){return /موافق/.test(x.textContent)})[0];if(ok)ok.click();})()");
        let ans = ''; for (let i = 0; i < 40 && !ans; i++) { await b.sleep(1500); ans = await b.eval("(function(){var m=[].slice.call(document.querySelectorAll('#aiMessages .ai-msg.bot:not(.ai-typing)')).pop();return m?m.textContent.trim():''})()"); }
        if (!consent) P('المساعد: نافذة الموافقة ما ظهرت');
        if (!ans || /⚠️/.test(ans)) P('المساعد: ' + (ans || 'ما وصل رد')); else I('المساعد (n8n حقيقي): «' + ans.slice(0, 90) + '»');
        await b.eval("Assistant.close()");
        /* قراءة الصور عبر n8n: موافقة n8n بدل طلب مفتاح */
        const ocr = await b.eval("(function(){ localStorage.removeItem('ocr_consent'); return JSON.stringify({engine:OcrImport.engine&&OcrImport.engine(), n8n:N8n.enabled(), base:N8n.base()}); })()");
        I('قراءة الصور: ' + ocr);
        const g = await b.eval("N8n.gemini('gemini-flash-lite-latest',{contents:[{parts:[{text:'Reply with the single word OK'}]}]}).then(function(j){return 'OK '+j.candidates[0].content.parts[0].text.trim()},function(e){return 'ERR '+N8n.explain(e)})");
        if (!/^OK/.test(g)) P('n8n /gemini: ' + g); else I('n8n /gemini: ' + g);
        /* الخريطة */
        await b.eval("FocusUI.go('campus')"); await b.sleep(1500);
        const map = await b.eval("JSON.stringify({svg:!!document.getElementById('cmSvg'),campus:!!document.querySelector('.cm-campus'),buildings:document.querySelectorAll('.cm-b').length,trees:document.querySelectorAll('.cm-tree').length})");
        I('الخريطة: ' + map); if (!/"svg":true/.test(map) || /"buildings":0/.test(map)) P('الخريطة: ' + map);
        /* أوفلاين: SW + إعادة تحميل بدون شبكة */
        const sw = await b.eval("navigator.serviceWorker&&navigator.serviceWorker.controller?'controlled':'none'");
        await b.eval("location.reload()"); await b.sleep(4000);
        const sw2 = await b.eval("navigator.serviceWorker&&navigator.serviceWorker.controller?'controlled':'none'");
        await b.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        await b.eval("location.reload()"); await b.sleep(4000);
        const off = await b.eval("JSON.stringify({main:!!document.getElementById('fxMain'),txt:(document.getElementById('fxMain')||{textContent:''}).textContent.length,build:window.APP_BUILD})");
        I('أوفلاين: SW ' + sw + '→' + sw2 + ' · ' + off); if (!/"main":true/.test(off)) P('أوفلاين: الموقع ما فتح بدون نت ' + off);
        await b.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      }
      await b.close();
    }
  }
  console.log('\n==== ' + (report.problems.length ? report.problems.length + ' مشكلة' : 'ولا مشكلة') + ' ====');
})();
