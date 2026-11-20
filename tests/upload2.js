/* رفع الملفات: عدة ملفات، تخطي غير الصالح، سحب وإفلات، زر على البطاقة، نافذة «رفع ملفات» */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
const base={profile:{name:'س'},courses:[{id:'c1',name:'شبكات الحاسوب',code:'0110102101',hours:3},{id:'c2',name:'فيزياء عامة',code:'0110108101',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},decks:[],budget:[],completedCourses:[],currentSemester:1};
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',ss_onboarding_done_v1:'true',space:JSON.stringify(base)}); await sl(2300);
 const d=w.document,o={},Q=s=>d.querySelector(s),QA=s=>[...d.querySelectorAll(s)];
 const F=(name,size)=>{ const f=new w.File(['x'],name); Object.defineProperty(f,'size',{value:size,configurable:true}); return f; };
 const up=[]; let toasts=[]; w.toast=m=>toasts.push(String(m));
 w.SB.uploadCourseFile=async(id,f)=>{ await sl(5); if(/fail/.test(f.name)) return {error:'x'}; up.push(id+'/'+f.name); return {}; };
 let listed=0; w.SB.listCourseFilesMulti=async()=>{ listed++; return up.map((u,i)=>({name:u.split('/')[1],size:100,path:u,url:'http://x/'+i,createdAt:'2026-01-01T00:00:00Z'})); };
 const asInput=(el,files)=>{ Object.defineProperty(el,'files',{value:files,configurable:true}); el.dispatchEvent(new w.Event('change',{bubbles:true})); };
 w.switchTab('courses'); await sl(200);
 /* ---- البطاقة: زر رفع مباشر لكل مادة ---- */
 o.C_globalBtn=!!Q('#fxMain [data-v="openUploadHub"]');



 /* عدة ملفات دفعة واحدة */
 toasts=[]; w.handleCourseFiles('c1',[F('a.pdf',100),F('b.docx',200),F('c.png',300)]); await sl(300);
 o.M_allUploaded=['c1/a.pdf','c1/b.docx','c1/c.png'].every(x=>up.includes(x))&&up.length===3;
 o.M_summaryToast=toasts.some(t=>/رُفع 3 من 3/.test(t));

 /* تخطي: فارغ/كبير/مكرر بالدفعة/موجود مسبقاً + فشل جزئي */
 toasts=[]; up.length=0; w.__cfFiles.c1=[{name:'old.pdf',size:50}];
 const big=F('big.bin',10); Object.defineProperty(big,'size',{value:26*1024*1024,configurable:true});
 w.handleCourseFiles('c1',[F('empty.txt',0),big,F('old.pdf',50),F('ok1.pdf',10),F('ok1.pdf',10),F('fail.pdf',10),F('ok2.pdf',20)]); await sl(400);
 o.S_onlyValid=up.includes('c1/ok1.pdf')&&up.includes('c1/ok2.pdf')&&up.filter(x=>/ok1/.test(x)).length===1&&!up.some(x=>/empty|big|old/.test(x));
 o.S_summary=toasts.some(t=>/رُفع 2 من 3/.test(t)&&/فشل 1/.test(t)&&/تخطّيت 4/.test(t));
 /* لا ملف صالح */
 toasts=[]; up.length=0; w.handleCourseFiles('c1',[F('e1.txt',0),F('e2.txt',0)]); await sl(120); o.S_noneValid=up.length===0&&toasts.some(t=>/ما في ملفات صالحة/.test(t));
 /* ملف واحد = المسار القديم (تأكيد التكرار/رسائل) */
 up.length=0; toasts=[]; w.handleCourseFiles('c1',[F('single.pdf',10)]); await sl(120); o.O_singleUsesOldPath=up.includes('c1/single.pdf')&&toasts.some(t=>/تم الرفع/.test(t));
 /* دفعتان متزامنتان لنفس المادة: الثانية تُرفض */
 up.length=0; toasts=[]; const p1=w.handleCourseFiles('c2',[F('p1.pdf',1),F('p2.pdf',1),F('p3.pdf',1)]); const p2=w.handleCourseFiles('c2',[F('q1.pdf',1),F('q2.pdf',1)]); await Promise.all([p1,p2]); await sl(50);
 o.B_noOverlap=toasts.some(t=>/دفعة رفع شغّالة/.test(t))&&!up.some(x=>/q1|q2/.test(x))&&up.length===3;
 /* ---- سحب وإفلات على البطاقة ---- */






 /* ---- نافذة المادة: input متعدد + قائمة الحالة + السحب ---- */
 w.Hub.openCourse('c1'); await sl(150);
 o.H_sheetInputMultiple=!!Q('#hs-files [data-file-input="c1"][multiple]')&&!!Q('#hs-files .cf-drop-hint');
 up.length=0; asInput(Q('#hs-files [data-file-input="c1"]'),[F('s1.pdf',1),F('s2.pdf',1)]); await sl(60);
 o.H_queueShown=QA('#hs-files .cf-q').length===2; await sl(250);
 o.H_queueDone=QA('#hs-files .cf-q[data-s="ok"]').length===2&&up.length===2&&Q('#hs-files [data-upload-course="c1"]').disabled===false;
 const mkDrag=(type,files)=>{ const e=new w.Event(type,{bubbles:true,cancelable:true}); e.dataTransfer={types:files?['Files']:['text/plain'],files:files||[],dropEffect:''}; return e; };
 const sec=Q('#hs-files'); sec.dispatchEvent(mkDrag('dragenter',[F('x',1)])); o.H_sectionDrop=sec.classList.contains('cf-drop'); sec.dispatchEvent(mkDrag('dragleave',[F('x',1)]));
 w.HubUI.closeTop(); await sl(50);
 /* ---- نافذة «رفع ملفات» العامة ---- */
 w.switchTab('courses'); await sl(150); Q('#fxMain [data-v="openUploadHub"]').click(); await sl(150);
 o.G_dialog=!!Q('.modal #uhCourse')&&!!Q('#uhDrop')&&Q('#uhCourse').options.length===2&&Q('#uhInput').multiple;
 let pick=false; Q('#uhInput').addEventListener('click',()=>{ pick=true; },true); Q('#uhDrop').click(); o.G_dropOpensPicker=pick;
 let confirmed=null; w.customConfirm=(m,ok,opt)=>{ confirmed={m,ok,opt}; };
 up.length=0; Q('#uhCourse').value='c1'; asInput(Q('#uhInput'),[F('0110108101_lecture1.pdf',10)]); await sl(60);
 o.G_suggestsMatchingCourse=!!confirmed&&/فيزياء عامة/.test(confirmed.m)&&up.length===0;
 confirmed.ok(); await sl(500); o.G_suggestionUploads=up.includes('c2/0110108101_lecture1.pdf')&&!Q('.modal #uhDrop');
 w.switchTab('courses'); await sl(150); Q('#fxMain [data-v="openUploadHub"]').click(); await sl(100); up.length=0; Q('#uhCourse').value='c2'; asInput(Q('#uhInput'),[F('notes.pdf',10),F('notes2.pdf',10)]); await sl(500);
 o.G_directUpload=up.includes('c2/notes.pdf')&&up.includes('c2/notes2.pdf')&&!Q('.modal #uhDrop'); o.G_goesToCourses=(w.FocusUI.view()==='courses');
 w.switchTab('courses'); await sl(150); Q('#fxMain [data-v="openUploadHub"]').click(); await sl(80); Q('#uhClose').click(); await sl(30); o.G_closes=!Q('.modal #uhDrop');
 w.space.courses=[]; w.openUploadHub(); await sl(30); o.G_noCourses=!Q('#uhDrop')&&toasts.some(t=>/أضف مادة/.test(t));
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e));
 console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
