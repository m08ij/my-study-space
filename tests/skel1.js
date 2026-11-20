/* هيكل التحميل الأول: موجود بالـHTML، مخفي عن قارئات الشاشة وللمستخدم الجديد، ويُزال بعد التحميل */
const fs=require('fs'),path=require('path'); const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const o={}; const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'), css=fs.readFileSync(path.join(root,'css/09-focus.css'),'utf8');
 o.S_markup=/id="bootSkel"[^>]*aria-hidden="true"/.test(html)&&html.indexOf('id="bootSkel"')<html.indexOf('<script src="core.js">');
 o.S_cssHidesForNew=/html\.is-new \.boot-skel\{display:none\}/.test(css)&&/@keyframes bsShimmer/.test(css)&&/prefers-reduced-motion:reduce\)\{\.bs-logo/.test(css);
 o.S_newShape=/class="bs-nav"/.test(html)&&/class="bs-bnav"/.test(html)&&!/bs-hero|bs-card/.test(html)&&/ss_fx_boot/.test(html);
 o.S_failsafe=/setTimeout\(hide, 8000\)/.test(html);
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify({profile:{name:'س'},courses:[],tasks:[],exams:[]})}); await sl(2300);
 o.S_removedAfterLoad=!w.document.getElementById('bootSkel');
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
