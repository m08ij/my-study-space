/* فحص كل زر بالموقع بضغطة ماوس حقيقية: node tools/click-audit.js [url] [width]
   لكل شاشة: كل زر/رابط/ملخّص ظاهر ← نرجع للشاشة نظيفة ← ضغطة حقيقية بمركزه ← شو صار؟
   «ما صار إشي» (لا تغيّر بالصفحة ولا نافذة ولا تنقّل) أو «خطأ» (console/استثناء) أو «مغطّى» (عنصر ثاني فوقه) أو
   «انفتح بس مش ظاهر» (قائمة/نافذة انفتحت بس عنصر ثاني مغطّيها). confirm/prompt بيرجعوا «لا» فما في حذف فعلي. Supabase محجوب. */
const cdp = require('./cdp.js');
const URL0 = process.argv[2] || 'http://127.0.0.1:8773', W = +(process.argv[3] || 1440), H = W < 800 ? 844 : 900;
const VIEWS = ['today','timetable','tasks','grades','courses','exams','attendance','budget','timer','plan','tree','gpa','stats','prayer','more','settings','campus','hulinks'];
const SAFE = "(function(){ window.confirm=function(){return false}; window.prompt=function(){return null}; window.alert=function(){}; window.open=function(){ window.__opened=(window.__opened||0)+1; return null; }; window.print=function(){ window.__printed=1; };" +
  " document.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('a[href]'); if(a&&/^https?:/.test(a.href)&&a.host!==location.host){ e.preventDefault(); window.__ext=(window.__ext||0)+1; } },true);" +
  " window.__errs=[]; window.addEventListener('error',function(e){ __errs.push(String(e.message)); }); window.addEventListener('unhandledrejection',function(e){ __errs.push('rej:'+String(e.reason&&e.reason.message||e.reason)); }); })()";
const SNAP = "(function(){ var m=document.getElementById('fxMain'); var html=document.body.innerHTML, ck=0; for(var i=0;i<html.length;i+=7) ck=(ck*31+html.charCodeAt(i))|0; var ls=0; try{ for(var k in localStorage) ls+=String(localStorage.getItem(k)||'').length; }catch(e){} return JSON.stringify({ h: html.length, ck: ck, ls: ls, sel: (window.getSelection&&String(window.getSelection()))||'', dlg: document.querySelectorAll('.modal-backdrop,.ocri-overlay,.fx-cmd,#aiPanel.show,[role=dialog]:not([hidden])').length, view: (location.hash||''), open: [].filter.call(document.querySelectorAll('details'),function(d){return d.open}).length, opened: window.__opened||0, ext: window.__ext||0, printed: window.__printed||0, toast: document.querySelectorAll('.toast,.ss-toast,[role=status]').length, act: (document.activeElement&&document.activeElement.tagName)||'' }); })()";
(async () => {
  const b = await cdp.launch({ w: W, h: H, mobile: W < 800 });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: SAFE });
  const LOCAL = /127\.0\.0\.1|localhost/.test(URL0);
  await b.goto(LOCAL ? URL0 + '/__seed' : URL0.replace(/\/?$/, '/') + '?demo=1'); await b.sleep(LOCAL ? 3500 : 6000);   /* الموقع الحي: الوضع التجريبي (بيانات وهمية بدون مزامنة) */
  await b.eval("localStorage.setItem('ss_asst_consent','1');localStorage.setItem('ocr_consent','1');location.reload()"); await b.sleep(5000);
  const problems = []; let total = 0;
  for (const v of VIEWS) {
    await b.eval(`FocusUI.go('${v}')`); await b.sleep(v === 'campus' ? 1500 : 600);
    const list = JSON.parse(await b.eval(`(function(){ var root=document.getElementById('fxMain'); var els=[].slice.call(root.querySelectorAll('button,a[href],summary,[data-fx],[role=button],input[type=checkbox]')).filter(function(e){ var r=e.getBoundingClientRect(); var cd=e.closest('details:not([open])'); if(cd&&e.tagName!=='SUMMARY'&&!e.closest('summary')) return false; if(e.closest('#cmSvg')) return false; return e.offsetParent!==null&&r.width>4&&r.height>4&&!e.disabled; });
      function sig(e){ return [e.tagName, e.getAttribute('data-fx')||'', e.getAttribute('data-v')||'', e.getAttribute('data-id')||'', e.getAttribute('data-n')||'', e.getAttribute('href')||'', (e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,40)].join('|'); } var seen={};
      return JSON.stringify(els.map(function(e,i){ var g=sig(e); seen[g]=(seen[g]||0)+1; return { i:i, g:g, n:seen[g]-1, t:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('data-fx')||e.tagName).trim().replace(/\\s+/g,' ').slice(0,28) }; })); })()`));
    for (const it of list) {
      total++;
      await b.eval("(function(){ try{ document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})); }catch(e){} document.querySelectorAll('.modal-backdrop,.ocri-overlay,.fx-cmd,.fx-study,.fx-sheet,.cm-guide-ov,#demoBar').forEach(function(x){x.remove()}); if(window.Assistant)Assistant.close(); if(window.FocusUI&&FocusUI.stopStudy) try{FocusUI.stopStudy()}catch(e){} [].forEach.call(document.querySelectorAll('details[open]'),function(d){d.open=false}); })()");
      await b.eval(`FocusUI.go('${v}')`); await b.sleep(250);
      /* نفس العنصر بعد إعادة الرسم: نعيد الترقيم بنفس الترتيب */
      const pos = JSON.parse(await b.eval(`(function(){ var root=document.getElementById('fxMain'); var els=[].slice.call(root.querySelectorAll('button,a[href],summary,[data-fx],[role=button],input[type=checkbox]')).filter(function(e){ var r=e.getBoundingClientRect(); var cd=e.closest('details:not([open])'); if(cd&&e.tagName!=='SUMMARY'&&!e.closest('summary')) return false; if(e.closest('#cmSvg')) return false; return e.offsetParent!==null&&r.width>4&&r.height>4&&!e.disabled; }); function sig(e){ return [e.tagName, e.getAttribute('data-fx')||'', e.getAttribute('data-v')||'', e.getAttribute('data-id')||'', e.getAttribute('data-n')||'', e.getAttribute('href')||'', (e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\\s+/g,' ').slice(0,40)].join('|'); } var same=els.filter(function(x){ return sig(x)===${JSON.stringify(it.g)}; }); var e=same[${it.n}]; if(!e) return 'null';
        e.scrollIntoView({block:'center'}); var r=e.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, t=document.elementFromPoint(x,y);
        return JSON.stringify({x:x,y:y,cover: t&&!(t===e||e.contains(t)||t.contains(e)) ? (t.tagName+'.'+String(t.className).slice(0,30)) : ''}); })()`));
      if (!pos) continue;
      if (pos.cover) { problems.push(`[${v}] «${it.t}»: مغطّى بـ ${pos.cover}`); continue; }
      const before = JSON.parse(await b.eval(SNAP));
      await b.eval("window.__errs=[]");
      for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: pos.x, y: pos.y, button: 'left', clickCount: 1 });
      await b.sleep(650);
      const after = JSON.parse(await b.eval(SNAP));
      const errs = JSON.parse(await b.eval("JSON.stringify(window.__errs||[])"));
      if (errs.length) problems.push(`[${v}] «${it.t}»: خطأ ${errs[0].slice(0, 90)}`);
      const changed = Object.keys(before).some(k => before[k] !== after[k]);
      if (!changed && !errs.length) problems.push(`[${v}] «${it.t}»: ما صار إشي`);
      /* قائمة/details انفتحت: محتواها ظاهر فعلاً؟ */
      if (after.open > before.open) {
        const vis = await b.eval("(function(){ var d=[].filter.call(document.querySelectorAll('details[open]'),function(x){return x.offsetParent!==null}).pop(); if(!d) return 'none'; var kids=[].slice.call(d.children).filter(function(c){return c.tagName!=='SUMMARY'}); if(!kids.length) return 'ok'; var c=kids[0]; c.scrollIntoView({block:'center'}); var r=c.getBoundingClientRect(); if(r.width<2||r.height<2) return 'zero'; var t=document.elementFromPoint(r.left+Math.min(r.width/2,40), r.top+Math.min(r.height/2,15)); return t&&(c===t||c.contains(t))?'ok':('covered by '+(t?t.tagName+'.'+String(t.className).slice(0,30):'?')); })()");
        if (vis !== 'ok') problems.push(`[${v}] «${it.t}»: انفتح بس مش ظاهر (${vis})`);
      }
    }
    process.stdout.write(v + ' ');
  }
  console.log('\nأزرار مفحوصة: ' + total + ' · مشاكل: ' + problems.length);
  problems.forEach(p => console.log('✗ ' + p));
  await b.close();
})();
