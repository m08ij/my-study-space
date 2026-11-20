/* أداة تطوير (لا تُنشر): يشغّل tools/real-full.js بمتصفح Edge حقيقي بلا واجهة (عبر cdp.js) + فحص تخطيط «خطتي اليوم».
   شغّل خادماً محلياً أولاً (node tools/compare-server.js . 8770)، ثم: node tools/rf-run.js [port] [w] [h] [stages=atoms,components,flows]
   HOST=localhost لمرحلة system (الـSW ما بيتسجّل على 127.0.0.1). */
const cdp = require('./cdp.js');
const port = process.argv[2] || '8770', W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900);
const stages = (process.argv[5] || 'atoms,components,flows').split(',');
const base = 'http://' + (process.env.HOST || '127.0.0.1') + ':' + port + '/';
const inject = `(async()=>{ eval(await (await fetch('/tools/real-full.js?'+Date.now())).text()); return !!window.RF && !window.RF.error; })()`;
/* خطتي اليوم: البطاقة والورقة بلا تمرير أفقي، وأهداف اللمس ≥36px (مربع .md-check منطقة ضغطه ممدودة بـ::after)، والنص داخل حدود البطاقة */
const PLAN = `(async()=>{ var sl=ms=>new Promise(r=>setTimeout(r,ms)), out={};
  window.switchTab('dashboard',false); window.renderMyDay(); await sl(200);
  var de=document.documentElement, card=document.querySelector('#myDay .md-plan');
  out.card=!!card; out.cardOverflow=de.scrollWidth>de.clientWidth+1;
  function small(root){ return [].slice.call(root.querySelectorAll('.dp-ic,.dp-chip,.md-link,.dp-more')).filter(function(e){ var r=e.getBoundingClientRect(); return r.width&&r.height&&(Math.max(r.width,r.height)<36||Math.min(r.width,r.height)<22); }).map(function(e){ return e.className+':'+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height); }); }
  function spill(root){ var rr=root.getBoundingClientRect(); return [].slice.call(root.querySelectorAll('*')).filter(function(e){ var r=e.getBoundingClientRect(); return r.width&&(r.right>rr.right+1||r.left<rr.left-1); }).map(function(e){ return e.tagName+'.'+String(e.className).split(' ')[0]; }).slice(0,5); }
  if(card){ out.cardSmall=small(card); out.cardSpill=spill(card); }
  window.DayPlan.openSheet(); await sl(250);
  var sh=document.querySelector('.dp-sheet'); out.sheet=!!sh;
  if(sh){ var ds=sh.querySelector('.dp-set'); if(ds) ds.open=true; await sl(80); out.sheetSmall=small(sh); out.sheetSpill=spill(sh); out.sheetHScroll=sh.scrollWidth>sh.clientWidth+1; }
  document.querySelectorAll('.hub-sheet-backdrop .hub-x').forEach(function(x){ x.click(); }); await sl(150);
  window.DayPlan.openReview(); await sl(250); var rv=document.querySelector('.dp-review'); if(rv){ out.reviewSpill=spill(rv); out.reviewHScroll=rv.scrollWidth>rv.clientWidth+1; }
  document.querySelectorAll('.hub-sheet-backdrop .hub-x').forEach(function(x){ x.click(); }); await sl(100);
  return JSON.stringify(out); })()`;
(async () => {
  const b = await cdp.launch({ w: W, h: H, mobile: W < 760 });
  await b.goto(base); await b.sleep(1500);
  if(!(await b.eval(inject))){ console.log('real-full غير متاح', await b.eval('JSON.stringify(window.RF)')); await b.close(); return; }
  await b.eval(`RF.seed()`); await b.sleep(4000);
  await b.eval(inject); await b.sleep(300);
  console.log('PLAN@' + W, await b.eval(PLAN));
  for(const st of stages){
    const r = await b.eval(`(async()=>{ var r = await RF.${st}(); return JSON.stringify(r); })()`);
    let j = {}; try{ j = JSON.parse(r); if(typeof j === 'string') j = JSON.parse(j); }catch(e){ console.log(st, 'parse error', String(r).slice(0, 300)); continue; }
    const cnt = k => Array.isArray(j[k]) ? j[k].length : (typeof j[k] === 'number' ? j[k] : 0);
    console.log(st + '@' + W, 'ok', cnt('ok'), 'fail', cnt('fail'), 'warn', cnt('warn'));
    (Array.isArray(j.fail) ? j.fail : []).slice(0, 12).forEach(f => console.log('  ✗', typeof f === 'string' ? f : JSON.stringify(f)));
    (Array.isArray(j.warn) ? j.warn : []).slice(0, 6).forEach(f => console.log('  ⚠', typeof f === 'string' ? f : JSON.stringify(f)));
  }
  const logs = b.logs.filter(l => !/Service Worker|SW /.test(l));
  if(logs.length) console.log('logs', JSON.stringify(logs.slice(0, 8)));
  await b.close();
})();
