const ROOT=require('path').resolve(__dirname,'..').split('\\').join('/')+'/';
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=ROOT;
const mode=process.argv[2]||'error'; // error | empty | cloudOld | cloudNew
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push('JSDOMERR '+(e.detail&&e.detail.stack||e.message).split('\n')[0])); vc.on('error',m=>errs.push('console.error '+String(m).slice(0,160)));
let html=fs.readFileSync(path+'index.html','utf8').replace(/<script[^>]*src="https?:[^>]*><\/script>/g,'').replace(/<script src="([^"]+)"><\/script>/g,(m,s)=>/(^|\/)vendor-/.test(s)?'':'<script>'+fs.readFileSync(path+s,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
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
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async()=>({data:[],error:null})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={}; const d=w.document; w.toast=()=>{};
 w.addCourseEverywhere('قديم','111',3,{silent:true}); w.addCourseEverywhere('ثاني','222',3,{silent:true});
 const sp=w.space; const c=sp.courses.find(x=>x.name==='قديم'); const id=c.id;
 sp.attendance['قديم']={present:4,absent:1}; sp.grades.find(g=>g.name==='قديم').items.push({name:'q',score:8,weight:10});
 sp.exams.push({id:'e',name:'M',course:'قديم',date:'2030-01-01'}); sp.tasks.push({id:'t',title:'T',course:'قديم',due:'2030-01-01',done:false});
 sp.timetable['Sun-08:00']={name:'قديم',room:'R',end:'09:00',custom:1}; sp.completedCourses=['قديم','غيره'];
 w.Hub.openCourse(id); await new Promise(r=>setTimeout(r,200)); o.editBtnRendered=!!d.querySelector('[data-act="edit"]');
 let cb,vals; w.showModal=function(t,f,v,k){vals=v;cb=k;}; d.querySelector('[data-act="edit"]').click(); o.prefill=vals&&vals.name==='قديم'&&vals.code==='111';
 o.rejectDupName=cb({name:'ثاني',code:'111',hours:3})===false && c.name==='قديم';
 o.rejectDupCode=cb({name:'قديم',code:'0222',hours:3})===false;
 o.rejectEmpty=cb({name:'  ',code:'111',hours:3})===false;
 const ok=cb({name:'جديد',code:'111',hours:'4',instructor:'د.ع',room:'B2'});
 o.ok=ok===true; o.sameId=c.id===id;
 o.fields=c.name==='جديد'&&c.hours===4&&c.instructor==='د.ع'&&c.room==='B2';
 o.attMigrated=sp.attendance['جديد']&&sp.attendance['جديد'].present===4&&sp.attendance['جديد'].absent===1&&!sp.attendance['قديم'];
 const g=sp.grades.filter(x=>x.name==='جديد'); o.gradesMigrated=g.length===1&&g[0].items.length===1&&!sp.grades.some(x=>x.name==='قديم');
 o.examTask=sp.exams[0].course==='جديد'&&sp.tasks[0].course==='جديد';
 o.timetable=sp.timetable['Sun-08:00'].name==='جديد'&&sp.timetable['Sun-08:00'].custom===1&&sp.timetable['Sun-08:00'].room==='R';
 o.completed=sp.completedCourses.join(',')==='جديد,غيره';
 o.noDuplicateCourses=sp.courses.filter(x=>x.name==='جديد'||x.name==='قديم').length===1;
 w.FocusUI.go('courses'); o.cardShowsInstructor=w.space.courses.some(c=>c.instructor==='د.ع');
 /* orphan grade entry with the new name gets replaced, not duplicated */
 sp.grades.push({name:'هدف',items:[]}); const c2=sp.courses.find(x=>x.name==='ثاني'); sp.grades.find(x=>x.name==='ثاني').items.push({name:'a',score:1,weight:2}); 
 w.updateCourseEverywhere(c2.id,{name:'هدف'}); const g2=sp.grades.filter(x=>x.name==='هدف'); o.orphanMerged=g2.length===1&&g2[0].items.length===1;
 /* بيانات محفوظة بعد reload للـ localStorage */
 const raw=JSON.parse(w.localStorage.getItem('space')); o.persisted=raw.courses.some(x=>x.name==='جديد'&&x.instructor==='د.ع')&&raw.attendance['جديد'].present===4;
 /* الحذف بعد التعديل ما زال ينظف */
 w.removeCourseEverywhere('جديد'); o.deleteAfterRename=!sp.courses.some(x=>x.name==='جديد')&&!sp.attendance['جديد']&&!sp.timetable['Sun-08:00']&&!sp.exams.some(e=>e.course==='جديد');
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);
