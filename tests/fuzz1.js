/* متانة محلل ICS: ملفات واقعية غريبة/تالفة لا ترمي أخطاء، ولا تتجاوز الحدود، ولا تأخذ وقتاً طويلاً */
const {boot}=require('./e2elib'); const sl=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify({courses:[],tasks:[],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'T'},decks:[],budget:[],completedCourses:[],currentSemester:1})}); await sl(2300);
 const I=w.IcsImport,o={}; const pad=n=>String(n).padStart(2,'0'); const ds=off=>{const x=new Date(); x.setDate(x.getDate()+off); return x.getFullYear()+'-'+pad(x.getMonth()+1)+'-'+pad(x.getDate());}; const c=s=>s.replace(/-/g,'');
 const run=(name,txt,check)=>{ const t0=Date.now(); let r,ex=null; try{ r=I.parseIcs(txt,ds(0)); }catch(e){ ex=e; } const ms=Date.now()-t0; o[name]=!ex&&ms<1500&&(check?check(r):true); if(ex) o[name+'__err']=String(ex.message).slice(0,80); if(ms>=1500) o[name+'__ms']=ms; return r; };
 const ev=(lines)=>['BEGIN:VCALENDAR','VERSION:2.0'].concat(lines,['END:VCALENDAR']).join('\r\n');
 const one=(extra)=>ev(['BEGIN:VEVENT','UID:u@x','SUMMARY:S','DTSTART:'+c(ds(2))+'T100000Z'].concat(extra||[],['END:VEVENT']));
 /* واقعي: Moodle */
 run('F_moodleLike','﻿'+ev(['X-WR-CALNAME:Moodle','BEGIN:VEVENT','DTSTAMP:20261001T080000Z','DTSTART:'+c(ds(3))+'T090000Z','DTEND:'+c(ds(3))+'T090000Z','SUMMARY:Assignment 1 is due','UID:12345@lms.hu.edu.jo','CLASS:PUBLIC','DESCRIPTION:<p>Open the <a href="x">link</a></p>\\nSecond line','CATEGORIES:Course A','LAST-MODIFIED:20261001T080000Z','END:VEVENT']),r=>r.valid&&r.events.length===1&&r.events[0].title==='Assignment 1 is due'&&r.events[0].span===1);
 run('F_bomAndLfOnly','﻿BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:LF\nDTSTART:'+c(ds(1))+'T100000Z\nEND:VEVENT\nEND:VCALENDAR',r=>r.valid&&r.events.length===1);
 run('F_crOnly','BEGIN:VCALENDAR\rBEGIN:VEVENT\rSUMMARY:CR\rDTSTART:'+c(ds(1))+'T100000Z\rEND:VEVENT\rEND:VCALENDAR',r=>r.valid&&r.events.length===1);
 run('F_arabic',ev(['BEGIN:VEVENT','UID:a','SUMMARY:واجب الفصل الثالث — برمجة','DTSTART:'+c(ds(1))+'T100000Z','CATEGORIES:هياكل البيانات','END:VEVENT']),r=>r.events[0].title==='واجب الفصل الثالث — برمجة'&&r.events[0].categories==='هياكل البيانات');
 run('F_tabFolded',ev(['BEGIN:VEVENT','SUMMARY:Tab','\tfolded','DTSTART:'+c(ds(1))+'T100000Z','END:VEVENT']),r=>r.events[0].title==='Tabfolded');
 /* تالف */
 run('F_missingEnd',ev(['BEGIN:VEVENT','SUMMARY:No end','DTSTART:'+c(ds(1))+'T100000Z']),r=>r.valid===false||r.events.length===0);
 run('F_nestedBegin',ev(['BEGIN:VEVENT','SUMMARY:A','BEGIN:VEVENT','SUMMARY:B','DTSTART:'+c(ds(1))+'T100000Z','END:VEVENT','END:VEVENT']),r=>r.events.length<=1);
 run('F_garbageLines',ev(['BEGIN:VEVENT',':::','=====','SUMMARY','DTSTART','SUMMARY:ok','DTSTART:'+c(ds(1))+'T100000Z','\u0001\u0002','END:VEVENT']),r=>r.events.length===1&&r.events[0].title==='ok');
 run('F_emptySummary',one([]).replace('SUMMARY:S','SUMMARY:'),r=>r.events.length===0&&r.warnings.length>=1);
 run('F_badDates',ev(['BEGIN:VEVENT','SUMMARY:x','DTSTART:99999999T999999Z','END:VEVENT','BEGIN:VEVENT','SUMMARY:y','DTSTART:20261301','END:VEVENT','BEGIN:VEVENT','SUMMARY:z','DTSTART:20260230T100000','END:VEVENT']),r=>r.events.length<=1);
 run('F_endBeforeStart',one(['DTEND:'+c(ds(1))+'T080000Z']),r=>r.events.length===1&&r.events[0].span>=1);
 run('F_unknownTz',ev(['BEGIN:VEVENT','SUMMARY:tz','DTSTART;TZID=Mars/Olympus:'+c(ds(1))+'T100000','END:VEVENT']),r=>r.events.length===1&&r.events[0].notes.some(n=>/غير معروفة/.test(n)));
 run('F_binaryLike','BEGIN:VCALENDAR\u0000\u0000',r=>r.valid===false);
 run('F_hugeLine',ev(['BEGIN:VEVENT','SUMMARY:'+'x'.repeat(2000000),'DTSTART:'+c(ds(1))+'T100000Z','END:VEVENT']),r=>r.valid&&r.events.length===1);
 /* RRULE عدائية: لا حلقات طويلة */
 run('R_countHuge',one(['RRULE:FREQ=DAILY;COUNT=99999999']),r=>r.events.length<=52+1);
 run('R_intervalZero',one(['RRULE:FREQ=WEEKLY;INTERVAL=0;COUNT=3']),r=>r.events.length>=1&&r.events.length<=5);
 run('R_intervalNegativeText',one(['RRULE:FREQ=DAILY;INTERVAL=abc;COUNT=2']),r=>r.events.length>=1);
 run('R_untilBeforeStart',one(['RRULE:FREQ=DAILY;UNTIL='+c(ds(-5))+'T000000Z']),r=>r.events.length<=1);
 run('R_badByday',one(['RRULE:FREQ=WEEKLY;BYDAY=XX,YY;COUNT=3']),r=>r.events.length>=1&&r.events.length<=4);
 run('R_monthlyDay31',ev(['BEGIN:VEVENT','UID:m','SUMMARY:m31','DTSTART:20260131T100000Z','RRULE:FREQ=MONTHLY;COUNT=5','END:VEVENT']),r=>r.events.length<=6);
 run('R_yearly',one(['RRULE:FREQ=YEARLY']),r=>r.events.length===1);
 run('R_garbageRule',one(['RRULE:%%%;;;=;FREQ']),r=>r.events.length===1);
 run('R_farPastWeekly',ev(['BEGIN:VEVENT','UID:p','SUMMARY:old weekly','DTSTART:20150101T100000Z','RRULE:FREQ=WEEKLY','END:VEVENT']),r=>r.events.length<=53);
 /* كثرة الأحداث */
 const many=[]; for(let i=0;i<3000;i++) many.push('BEGIN:VEVENT','UID:e'+i,'SUMMARY:E'+i,'DTSTART:'+c(ds(1+(i%300)))+'T100000Z','END:VEVENT');
 run('M_manyEvents',ev(many),r=>r.valid&&r.events.length<=400&&r.warnings.some(x=>/الملف كبير/.test(x)));
 /* التحليل والمعاينة على مدخلات غريبة لا ترمي */
 try{ const r=I.parseIcs(ev(many),ds(0)); const an=I.analyze(r.events,ds(0)); o.M_analyzeBounded=an.rows.length<=400; }catch(e){ o.M_analyzeBounded=false; o.M_analyzeErr=e.message; }
 let threw=false; try{ I.preview(one([]).replace('SUMMARY:S','SUMMARY:<script>alert(1)</script>'),'x.ics'); await sl(60); o.P_scriptEscaped=!w.document.querySelector('.ics-backdrop script')&&/&lt;|<script>/.test(w.document.querySelector('.ics-title').innerHTML); }catch(e){ threw=true; }
 o.P_previewNoThrow=!threw;
 /* تطابق المواد مع بيانات تالفة */
 w.space.courses=[{id:'1',name:null,code:undefined},{id:'2',name:'  ',code:'  '},{id:'3'},{id:'4',name:'Valid Course Name',code:'0123456'}];
 let mt; try{ mt=I.matchCourse({title:'Valid Course Name hw',categories:''}); }catch(e){ mt=null; } o.C_badCoursesSafe=!!mt&&mt.course==='Valid Course Name';
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1)); process.exit(0);
})();
