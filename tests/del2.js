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
      upsert:async(row)=>{saves.push(row);return {error:null};}};},storage:{from(){return {list:async()=>({data:[],error:null})}}}};}};
  if(process.argv[3]==='local'){ w.localStorage.setItem('space',JSON.stringify({courses:[{id:'L',name:'محلي',code:'2',hours:3}],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'محلي'},decks:[],budget:[],completedCourses:[],currentSemester:1})); w.localStorage.setItem('welcomeDone','true'); w.localStorage.setItem('ss_space_ts',String(Date.now()-1000)); }
}});
setTimeout(async()=>{ const w=dom.window,o={}; const d=w.document; w.toast=()=>{};
 w.addCourseEverywhere('م','111',3,{silent:true}); const sp=w.space;
 sp.attendance['م']={present:3,absent:2}; sp.grades.find(g=>g.name==='م').items.push({name:'q',score:1,weight:2}); sp.exams.push({id:'e',course:'م',name:'x',date:'2030-01-01'}); sp.timetable['Sun-08:00']={name:'م'}; sp.timetable['Mon-08:00']={name:'م'};
 let msg=null, run=null; w.customConfirm=(m,f)=>{msg=m;run=f;};
 w.confirmRemoveCourse('م'); await new Promise(r=>setTimeout(r,300)); o.msg=msg; o.listsAll=['3 حاضر','2 غائب','1 علامة','1 امتحان','2 محاضرة'].every(x=>msg.includes(x));
 o.notDeletedBeforeConfirm=sp.courses.some(c=>c.name==='م'); run(); o.deletedAfterConfirm=!sp.courses.some(c=>c.name==='م');
 w.addCourseEverywhere('نظيفة','222',3,{silent:true}); w.confirmRemoveCourse('نظيفة'); await new Promise(r=>setTimeout(r,300)); o.cleanMsg=msg; o.noExtraList=!msg.includes('سيُحذف معها');
 /* زر الحذف بورقة المادة (الواجهة الجديدة) يمر بنفس التأكيد */
 await new Promise(r=>setTimeout(r,600)); msg=null; w.Hub.openCourse((sp.courses.find(c=>c.name==='نظيفة')||{}).id); await new Promise(r=>setTimeout(r,250)); d.querySelector('[data-act="delete"]').click(); await new Promise(r=>setTimeout(r,300)); o.coursesTabBtn=!!msg&&msg.includes('نظيفة');
 o.errs=errs; console.log(JSON.stringify(o,null,1)); process.exit(0);},2500);


