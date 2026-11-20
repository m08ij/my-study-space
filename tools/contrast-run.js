/* أداة تطوير (لا تُنشر): تدقيق تباين النصوص الفعلي بمتصفح حقيقي لكل الثيمات وكل التبويبات والحالات التفاعلية
   (نوافذ الإضافة، ورقة المادة، التبويبات الفرعية، FAB، المساعد، البحث، الإعدادات) — يشمل الخلفيات المتدرّجة ويتخطّى النص المقصوص بتدرّج (background-clip:text).
   الاستعمال: شغّل خادماً محلياً (node tools/compare-server.js . 8770) ثم: node tools/contrast-run.js [port] [out.json] [w] [h] */
const cdp = require('./cdp.js'), fs = require('fs');
const port = process.argv[2] || '8770', OUT = process.argv[3] || '', W = +(process.argv[4] || 1440), H = +(process.argv[5] || 900);
const AUDIT = `(function(){
  function parse(c){ var cm=/color\\(srgb ([\\d.]+) ([\\d.]+) ([\\d.]+)(?: \\/ ([\\d.]+))?\\)/.exec(c); if(cm) return {r:cm[1]*255,g:cm[2]*255,b:cm[3]*255,a:cm[4]==null?1:+cm[4]}; var m=/rgba?\\(([^)]+)\\)/.exec(c); if(!m) return null; var p=m[1].split(/[ ,\\/]+/).filter(Boolean).map(parseFloat); return {r:p[0],g:p[1],b:p[2],a:p[3]==null?1:p[3]}; }
  function over(t,b){ var a=t.a; return {r:t.r*a+b.r*(1-a),g:t.g*a+b.g*(1-a),b:t.b*a+b.b*(1-a),a:1}; }
  function lum(c){ function f(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);} return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); }
  function ratio(a,b){ var l1=lum(a),l2=lum(b); if(l1<l2){var t=l1;l1=l2;l2=t;} return (l1+0.05)/(l2+0.05); }
  function solidBelow(el){ var stack=[], n=el; while(n&&n.nodeType===1){ var bg=parse(getComputedStyle(n).backgroundColor); if(bg&&bg.a>0){ stack.push(bg); if(bg.a>=1) break; } n=n.parentElement; } var base=parse(getComputedStyle(document.body).backgroundColor)||{r:0,g:0,b:0,a:1}; if(base.a<1) base={r:11,g:15,b:26,a:1}; var cur=(stack.length&&stack[stack.length-1].a>=1)?stack.pop():base; while(stack.length) cur=over(stack.pop(),cur); return cur; }
  function stops(img){ var out=[], re=/rgba?\\([^)]+\\)|color\\(srgb [^)]+\\)/g, m; while((m=re.exec(img))) out.push(parse(m[0])); return out; }
  function effBg(el){ var n=el; while(n&&n.nodeType===1){ var cs=getComputedStyle(n); if(cs.backgroundImage&&/gradient/.test(cs.backgroundImage)&&cs.backgroundClip!=='text'&&n!==document.body&&n!==document.documentElement){   /* تدرّجات خلفية الصفحة زخرفية بالأطراف: نقيس على لونها الأساسي */ var base=solidBelow(n.parentElement||n); var st=stops(cs.backgroundImage).map(function(s){ return over(s,base); }); if(st.length) return st; } var bg=parse(cs.backgroundColor); if(bg&&bg.a>=1) return [bg]; if(bg&&bg.a>0) return [over(bg,solidBelow(n.parentElement||n))]; n=n.parentElement; } return [solidBelow(el)]; }
  return function(){ var res={}; document.body.querySelectorAll('*').forEach(function(el){
    if(el.closest('[hidden],.sr-only,.modal-ghost')||/^(SCRIPT|STYLE|SVG|PATH|OPTION|TEXT)$/i.test(el.tagName)) return;
    var r=el.getBoundingClientRect(); if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) return;
    var own=''; for(var k=0;k<el.childNodes.length;k++) if(el.childNodes[k].nodeType===3) own+=el.childNodes[k].textContent; own=own.trim(); if(own.length<2||!/[؀-ۿa-zA-Z0-9]/.test(own)) return;
    var cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none'||cs.webkitTextFillColor==='rgba(0, 0, 0, 0)') return;
    var op=1,pp=el; while(pp&&pp.nodeType===1){ op*=parseFloat(getComputedStyle(pp).opacity); pp=pp.parentElement; } if(op<0.3) return;
    if(el.disabled||el.closest('[disabled],[aria-disabled="true"]')) return;   /* المعطّل مستثنى من معيار WCAG */
    var fg=parse(cs.color); if(!fg) return; var worst=99;
    effBg(el).forEach(function(s){ var ra=ratio(over({r:fg.r,g:fg.g,b:fg.b,a:fg.a*op},s),s); if(ra<worst) worst=ra; });
    var fs=parseFloat(cs.fontSize), bold=parseInt(cs.fontWeight,10)>=700, need=(fs>=24||(fs>=18.66&&bold))?3:4.5;
    if(worst<need){ var key=el.tagName.toLowerCase()+'.'+(typeof el.className==='string'?el.className.split(' ').slice(0,2).join('.'):''); res[key]=res[key]||{n:0,min:99,ex:own.slice(0,24)}; res[key].n++; if(worst<res[key].min) res[key].min=+worst.toFixed(2); }
  }); return res; };
})()`;
(async () => {
  const b = await cdp.launch({ w: W, h: H, mobile: W < 760 });
  await b.goto('http://127.0.0.1:' + port + '/__seed'); await b.sleep(3500);
  await b.eval(`window.__A=${AUDIT}; (function(){var st=document.createElement('style'); st.textContent='*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st);})()`);
  const out = await b.eval(`(async function(){
    var sl=function(ms){return new Promise(function(r){setTimeout(r,ms)})}, rows={}, themes=window.THEMES.map(function(t){return t.id});
    function Q(s){return document.querySelector(s)} function clk(s){var e=typeof s==='string'?Q(s):s; if(e){ e.click(); return true;} return false;}
    function txtBtn(root,t){ var e=[].slice.call(document.querySelectorAll(root+' button,'+root+' [role=tab]')).filter(function(x){return x.offsetParent&&x.textContent.indexOf(t)>-1})[0]; if(e){e.click();return true;} return false; }
    function esc(){ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); ['mCancel','cCancel'].forEach(function(i){var e=document.getElementById(i); if(e) e.click();}); }
    async function rec(theme,state){ await sl(120); var a=window.__A(); Object.keys(a).forEach(function(k){ rows[theme+'|'+state+'|'+k]=a[k]; }); }
    for(var t=0;t<themes.length;t++){ var th=themes[t]; window.applyTheme(th,false); await sl(150);
      var secs=['dashboard','timetable','courses','tasks','exams','attendance','timer','gradecalc','budget','plan','campus','hulinks'];
      for(var s=0;s<secs.length;s++){ window.switchTab(secs[s],false); await sl(90); window.scrollTo(0,0); await rec(th,'tab:'+secs[s]); window.scrollTo(0,document.body.scrollHeight); await rec(th,'tab:'+secs[s]+':bottom'); window.scrollTo(0,0); }
      var adds=[['tasks','#btnAddTask'],['exams','#btnAddExam'],['courses','#btnAddCourse'],['budget','#btnAddIncome'],['timetable','#btnAddClass']];
      for(var i=0;i<adds.length;i++){ window.switchTab(adds[i][0],false); await sl(90); if(clk(adds[i][1])) await rec(th,'modal:'+adds[i][0]); esc(); await sl(120); }
      window.switchTab('courses',false); await sl(90); var op=Q('#courses .hub-open'); if(op){ op.click(); await sl(200); var ct=[].slice.call(document.querySelectorAll('.hub-ctab')).filter(function(e){return e.offsetParent}); for(var c=0;c<ct.length;c++){ ct[c].click(); await rec(th,'sheet:'+c); } esc(); await sl(150); }
      window.switchTab('plan',false); await sl(90); var pl=['الخطة الشجرية','وصف المواد','محاكي']; for(var p=0;p<pl.length;p++){ if(txtBtn('#plan',pl[p])) await rec(th,'plan:'+pl[p]); }
      window.switchTab('gradecalc',false); await sl(90); var gl=['علاماتي','حاسبة المعدل']; for(var g=0;g<gl.length;g++){ if(txtBtn('#gradecalc',gl[g])) await rec(th,'gc:'+gl[g]); }
      window.switchTab('budget',false); await sl(90); var bl=['التوقعات','أهداف','المتكرر']; for(var q=0;q<bl.length;q++){ if(txtBtn('#budget',bl[q])) await rec(th,'bp:'+bl[q]); }
      window.switchTab('dashboard',false); await sl(90);
      if(clk('.fab-main')){ await rec(th,'fab'); clk('.fab-main'); await sl(100); }
      if(clk('.ai-fab')){ await rec(th,'ai'); clk('.ai-fab'); await sl(100); esc(); }
      clk('#navSettings'); await sl(250); var tabs=document.querySelectorAll('.sm-tab'); for(var z=0;z<tabs.length;z++){ tabs[z].click(); await rec(th,'settings:'+z); } esc(); await sl(200);
      if(window.DayPlan){ window.switchTab('dashboard',false); await sl(90); window.DayPlan.openSheet(); await sl(150); await rec(th,'dayplan'); var dps=Q('.dp-sheet .dp-set'); if(dps){ dps.open=true; await rec(th,'dayplan:set'); }
        document.querySelectorAll('.hub-sheet-backdrop .hub-x').forEach(function(x){ x.click(); }); await sl(120);
        window.DayPlan.openReview(); await sl(150); var pk=Q('.dp-review [data-rv="why"]'); if(pk) pk.click(); await rec(th,'review'); document.querySelectorAll('.hub-sheet-backdrop .hub-x').forEach(function(x){ x.click(); }); await sl(120); }
    }
    return JSON.stringify(rows);
  })()`);
  const rows = JSON.parse(out);
  if (OUT) fs.writeFileSync(OUT, out);
  const list = Object.keys(rows).map(k => ({ k, ...rows[k] })).sort((a, b) => a.min - b.min);
  console.log('issues', list.length, 'logs', b.logs.slice(0, 5).join(' | '));
  list.slice(0, 60).forEach(x => console.log(x.min, x.k, '×' + x.n, '«' + x.ex + '»'));
  await b.close();
})();
