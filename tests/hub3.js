const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/^vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const saves=[];
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},addEventListener(){}}));
  w.scrollTo=()=>{}; w.fetch=()=>Promise.reject(new Error('offline'));
  if(mode!=='nolocal'){}
  const sbMode=mode;
  const state={data:{version:7,space:{courses:[{id:'1',name:'سحابة',code:'1',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'سحابي'}},welcomeDone:true},updated_at:sbMode==='cloudOld'?'2020-01-01T00:00:00Z':new Date(Date.now()+3600e3).toISOString()};
  w.supabase={createClient(){return {from(){return {select(){return {eq(){return {maybeSingle:async()=>{
      if(sbMode==='error') return {error:{message:'net'},data:null};
      if(sbMode==='empty') return {data:null,error:null};
      return {data:state,error:null};}};}};},
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async(prefix)=>{ if(global.STORE_FAIL) return {data:null,error:{message:'StorageUnknownError'}}; const seen={},out=[]; Object.keys(global.STORE).forEach(k=>{ if(!k.startsWith(prefix+'/')) return; const rest=k.slice(prefix.length+1); const nm=rest.split('/')[0]; if(seen[nm]) return; seen[nm]=1; out.push(rest.includes('/')?{name:nm,id:null}:{name:nm,id:'x',metadata:{size:global.STORE[k].size,mimetype:'application/pdf'},created_at:'t'}); }); return {data:out,error:null}; }, upload:async(path,file)=>{ global.STORE[path]={size:file.size||1}; return {error:null}; }, remove:async(paths)=>{ paths.forEach(p=>{delete global.STORE[p];}); return {error:null}; }, getPublicUrl:(p)=>({data:{publicUrl:'http://x/'+p}})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={}; const d=w.document; const sl=ms=>new Promise(r=>setTimeout(r,ms)); global.STORE={};
 let toasts=[]; w.toast=m=>toasts.push(m);
 const Q=s=>d.querySelector(s), QA=s=>Array.from(d.querySelectorAll(s)); const sp=()=>w.space; const act=()=>{ const v=w.FocusUI.view(); return v==='today'?'dashboard':v==='gpa'?'gradecalc':v; };
 const key=(k,alt,target)=>{ const ev=new w.KeyboardEvent('keydown',{key:k,altKey:!!alt,bubbles:true,cancelable:true}); (target||d).dispatchEvent(ev); return ev; };
 const blurAll=()=>{ if(d.activeElement&&d.activeElement.blur) d.activeElement.blur(); };
 ['برمجة الحاسوب','كيمياء عامة'].forEach((n,i)=>w.addCourseEverywhere(n,'91'+i,3,{silent:true,noPrompt:true})); w.notes.length=0; w.notes.push({title:'مذكرة خاصة',body:'محتوى',ts:1,course:'برمجة الحاسوب'});
 blurAll();
 const si=Q('#searchInput'); key('k',true); await sl(100); o.F_removedAltK=!Q('.cmdk')&&typeof w.openCommandPalette==='undefined'; key('?'); await sl(80); o.F_removedHelp=!Q('.cmdk')&&!Q('.cmdk-help');
 /* ===== G: الإضافة السريعة ===== */
 const pq=w.parseQuickCapture('مادة رياضيات 2'); o.G_parseCourse=pq.type==='course'&&pq.title==='رياضيات 2'; o.G_parseTaskStill=w.parseQuickCapture('واجب شبكات غدًا').type==='task'; o.G_parseNoteStill=w.parseQuickCapture('ملاحظة: شي').type==='note';
 w.openQuickCapture(); await sl(150); const qc=Q('#qcInput'); qc.value='مادة تفاضل وتكامل (1)'; qc.dispatchEvent(new w.Event('input',{bubbles:true})); await sl(60); o.G_previewCourse=/مادة/.test(Q('#qcPreview').textContent); Q('#qcSave').click(); await sl(250);
 const dbc=sp().courses.find(c=>c.name==='تفاضل وتكامل (1)'); o.G_courseAdded=!!dbc&&dbc.code==='0110108101'&&!Q('.quick-capture-modal'); o.G_attGradesCreated=!!sp().attendance['تفاضل وتكامل (1)']&&!!sp().grades.find(g=>g.name==='تفاضل وتكامل (1)');
 w.openQuickCapture(); await sl(150); const qc2=Q('#qcInput'); qc2.value='مادة تفاضل وتكامل (1)'; qc2.dispatchEvent(new w.Event('input',{bubbles:true})); await sl(60); Q('#qcSave').click(); await sl(200); o.G_duplicateKeepsOpen=!!Q('.quick-capture-modal')&&sp().courses.filter(c=>c.name==='تفاضل وتكامل (1)').length===1&&toasts.some(t=>/موجودة أصلاً/.test(t)); Q('#qcCancel').click(); await sl(80);
 w.openQuickCapture(); await sl(150); const qc3=Q('#qcInput'); qc3.value='مادة مخصصة بلا قاعدة'; qc3.dispatchEvent(new w.Event('input',{bubbles:true})); await sl(60); Q('#qcSave').click(); await sl(200); const cc=sp().courses.find(c=>c.name==='مخصصة بلا قاعدة'); o.G_customCourse=!!cc&&cc.hours===3&&cc.code==='';
 /* زر لوحة الأوامر محذوف */ o.G_noCmdkBtn=!Q('#cmdkBtn');
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
