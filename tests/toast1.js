/* التنبيهات (toast) الجديدة + كرت ملخص بدء التشغيل — بوقت مزيّف ثابت (الأربعاء 7/10/2026) */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0'); const ds=(base,k)=>{const x=new Date(base.getTime()+k*86400000);return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());};
const NOW=new Date(2026,9,7,14,0,0);
const base={courses:[],tasks:[{id:'a',title:'م1',due:ds(NOW,-1),done:false},{id:'b',title:'م2',due:ds(NOW,0),done:false},{id:'c',title:'م3',due:ds(NOW,1),done:false,priority:'high'}],
 exams:[{id:'e',name:'ميد',date:ds(NOW,2),time:'10:00'}],attendance:{},grades:[],timetable:{},profile:{name:'سارة علي'},budget:[],completedCourses:[],currentSemester:1,
 decks:[{id:'d',name:'م',cards:[{id:'k',q:'q',a:'a',last:'2026-10-01',due:'2026-10-02'}]}]};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify(base)}); await sl(7800);   /* ننتظر مرور تنبيهات الإقلاع الذاتية (4s + 1.5s) قبل القياس */
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)];
 const clear=()=>QA('.toast').forEach(x=>x.remove());
 const RealDate=w.Date; const at=(h,m)=>{ w.Date=class extends RealDate{ constructor(...a){ if(a.length) super(...a); else super(2026,9,7,h,m||0,0); } static now(){ return new RealDate(2026,9,7,h,m||0,0).getTime(); } }; };
 at(14,0);
 /* ---- التوست العادي ---- */
 clear(); w.toast('تم الحفظ','success',3000);
 const t=Q('.toast'); o.T_structure=!!t&&t.classList.contains('success')&&!!t.querySelector('.t-ic')&&t.querySelector('.t-msg').textContent==='تم الحفظ'&&!!t.querySelector('.t-x')&&!!t.querySelector('.t-bar')&&t.querySelector('.t-ic').textContent==='✓';
 o.T_noHtmlInjection=(clear(),w.toast('<img src=x onerror=1>','info',3000),!Q('.toast img')&&/<img/.test(Q('.toast .t-msg').textContent));
 clear(); w.toast('مكرر','info',3000); w.toast('مكرر','info',3000); w.toast('مكرر','info',3000); o.T_dedupe=QA('.toast').length===1&&Q('.t-count').textContent==='×3'&&!Q('.t-count').hidden;
 clear(); ['1','2','3','4','5'].forEach(x=>w.toast('رسالة '+x,'info',5000)); o.T_max3=QA('.toast:not(.out)').length===3; o.T_oldestDropped=!QA('.toast:not(.out) .t-msg').some(m=>m.textContent==='رسالة 1')&&QA('.toast:not(.out) .t-msg').some(m=>m.textContent==='رسالة 5');
 await sl(400); o.T_removedFromDom=QA('.toast').length===3;
 clear(); w.toast('اضغط عليّ','info',5000); Q('.toast').click(); await sl(400); o.T_clickDismiss=QA('.toast').length===0;
 clear(); w.toast('س','warn',5000); Q('.toast .t-x').click(); await sl(400); o.T_closeBtn=QA('.toast').length===0;
 clear(); w.toast('قصير','info',200); await sl(700); o.T_autoDismiss=QA('.toast').length===0;
 /* إيقاف مؤقت بالتحويم */
 clear(); w.toast('معلّق','info',400); const hv=Q('.toast'); hv.dispatchEvent(new w.MouseEvent('mouseenter')); await sl(700); o.T_pausedOnHover=QA('.toast').length===1&&hv.classList.contains('paused');
 hv.dispatchEvent(new w.MouseEvent('mouseleave')); await sl(1300); o.T_resumesAfterLeave=QA('.toast').length===0;
 /* تراجع */
 clear(); let n=0; w.toastUndo('حُذف',()=>{n++;},3000); const ub=Q('.toast-undo'); o.U_button=!!ub&&ub.textContent==='تراجع'&&Q('.toast .t-ic').textContent==='↶'; ub.click(); ub.click(); await sl(350); o.U_once=n===1&&QA('.toast').length===0;
 /* ملخص بدء التشغيل (toast) أُلغي بالواجهة الجديدة — «اليوم» بيعرض الخطوة الجاية بداله */
 /* تحية الليل */
 o.G_night=w.greetWord(2)==='مساء الخير'&&w.greetWord(5)==='صباح الخير'&&w.greetWord(11)==='صباح الخير'&&w.greetWord(12)==='مساء الخير'&&w.greetWord(23)==='مساء الخير';
 /* ---- copyText: مسار بديل ورسالة صادقة ---- */
 let copied=null; d.execCommand=(c)=>{ copied=c; return true; };
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('Document is not focused'))},configurable:true});
 clear(); w.copyText('نص','📋 نُسخ'); await sl(60); o.C_fallbackCopies=copied==='copy'&&/نُسخ/.test(Q('.toast .t-msg').textContent)&&Q('.toast').classList.contains('success');
 clear(); d.execCommand=()=>false; w.copyText('نص','📋 نُسخ'); await sl(60); o.C_honestFailure=/تعذّر النسخ/.test(Q('.toast .t-msg').textContent)&&Q('.toast').classList.contains('warn')&&!QA('.toast .t-msg').some(x=>/^📋 نُسخ$/.test(x.textContent));
 clear(); d.execCommand=()=>true; Object.defineProperty(w.navigator,'clipboard',{value:{writeText:()=>Promise.resolve()},configurable:true}); w.copyText('x','📋 تم'); await sl(60); o.C_primaryOk=/تم/.test(Q('.toast .t-msg').textContent)&&QA('.toast').length===1;
 o.C_noLeftoverTextarea=QA('textarea[readonly]').length===0;
 clear(); Object.defineProperty(w.navigator,'clipboard',{value:undefined,configurable:true}); d.execCommand=()=>true; w.copyText('x','📋 نُسخ بدون API'); await sl(30); o.C_noClipboardApi=/بدون API/.test(Q('.toast .t-msg').textContent);
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
