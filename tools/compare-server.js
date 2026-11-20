/* خادم محلي للمقارنة (لا يُنشر): node tools/compare-server.js <مجلد> <منفذ>
   يخدم ملفات المجلد كما هي (للقراءة فقط) + صفحة /__seed تزرع بيانات طالب تجريبي بذاك المنفذ فقط ثم تفتح الموقع.
   كل منفذ = أصل (origin) مستقل بتخزينه المحلي، فبيانات الأصل التجريبية لا تختلط بالتجريبية ولا ببياناتك الحقيقية. */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || '.'), port = +(process.argv[3] || 8770);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const SEED = `<!doctype html><meta charset="utf-8"><title>تهيئة بيانات تجريبية</title><body style="font-family:sans-serif;background:#0b1020;color:#fff;display:grid;place-items:center;height:100vh"><p>جارٍ تجهيز بيانات طالب تجريبي…</p><script>
(function(){
  var n=new Date(),pad=function(x){return ('0'+x).slice(-2)},hm=function(m){return pad(Math.floor(m/60))+':'+pad(m%60)};
  function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())} function add(k){var x=new Date();x.setDate(x.getDate()+k);return ymd(x)}
  var C=['تفاضل وتكامل (1)','فيزياء عامة (1)','برمجة الحاسوب','أخلاقيات و مهارات اتصال','مهارات التواصل باللغة العربية'];
  var CODE=['0110108101','0110102101','0110400102','0110400203','2116011101'], INS=['د. أحمد الخطيب','د. ليلى حداد','د. سامر العمري','د. خالد النعيمي','د. رنا القاسم'], ROOM=['ح.ب 104','م.غ 301','م.ش 205','ح.ب 210','م.ش 110'], H=[3,3,3,3,3];
  var DE=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], tt={};
  function slot(days,from,to,i){days.forEach(function(d){tt[d+'-'+from]={name:C[i],room:ROOM[i],end:to,instructor:INS[i]}})}
  slot(['Sun','Tue','Thu'],'08:00','09:00',0); slot(['Sun','Tue','Thu'],'10:00','11:00',1); slot(['Mon','Wed'],'09:30','11:00',2); slot(['Mon','Wed'],'11:30','12:45',3); slot(['Sun','Tue','Thu'],'12:00','13:00',4);
  var m=Math.max(15,Math.min(1300,n.getHours()*60+n.getMinutes())); tt[DE[n.getDay()]+'-'+hm(m-10)]={name:C[0],room:ROOM[0],end:hm(m+50),instructor:INS[0]};
  var sp={profile:{name:'مهند'},semesterStart:add(-35),currentSemester:1,
    courses:C.map(function(c,i){return {id:'c'+i,name:c,code:CODE[i],hours:H[i],instructor:INS[i],room:ROOM[i]}}),
    tasks:[{id:'t1',title:'واجب التكامل رقم 2',due:ymd(n),course:C[0],priority:'high',type:'assignment'},{id:'t2',title:'مشروع برمجة — مرحلة 1',due:add(4),course:C[2],priority:'high',type:'project'},{id:'t3',title:'تقرير مختبر الفيزياء',due:add(-2),course:C[1],priority:'medium',type:'assignment'},{id:'t4',title:'عرض تقديمي — مهارات الاتصال',due:add(9),course:C[3],priority:'low',type:'assignment'},{id:'t5',title:'قراءة الفصل 4',due:add(7),course:C[4],done:true,type:'assignment'}],
    exams:[{id:'e1',name:'امتحان منتصف — التفاضل 1',date:add(6),time:'10:00',room:'قاعة 3',course:C[0]},{id:'e2',name:'امتحان قصير — الفيزياء',date:add(3),time:'09:00',room:'م.غ 301',course:C[1]},{id:'e3',name:'امتحان منتصف — البرمجة',date:add(13),time:'12:00',room:'مختبر 2',course:C[2]}],
    timetable:tt,attendance:{},grades:[],decks:[],
    budget:[{id:'b1',type:'income',title:'مصروف الشهر',amount:200,date:add(-10),category:'salary'},{id:'b2',type:'expense',title:'غداء',amount:3.5,date:add(-1),category:'food'},{id:'b3',type:'expense',title:'مواصلات الأسبوع',amount:12,date:add(-2),category:'transport'},{id:'b4',type:'expense',title:'قرطاسية',amount:6,date:add(-4),category:'other'}]};
  C.forEach(function(c,i){sp.attendance[c]={present:5+i,absent:i%3}});
  sp.grades=C.slice(0,3).map(function(c,i){return {name:c,items:[{name:'منتصف',score:22-i,weight:30},{name:'واجب 1',score:8,weight:10},{name:'كويز',score:4,weight:5}]}});
  try{ localStorage.clear(); localStorage.setItem('space',JSON.stringify(sp)); localStorage.setItem('welcomeDone','true'); localStorage.setItem('ss_onboarding_done_v1','true'); localStorage.setItem('ss_seen_news','999'); }catch(e){}
  location.replace('/');
})();
</script>`;
http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if(p === '/__seed'){ s.setHeader('Content-Type', 'text/html; charset=utf-8'); s.setHeader('Cache-Control', 'no-store'); return s.end(SEED); }
  if(p === '/') p = '/index.html';
  const f = path.resolve(path.join(root, p));
  if(!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ s.statusCode = 404; return s.end('nf'); }
  s.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); s.setHeader('Cache-Control', 'no-store'); fs.createReadStream(f).pipe(s);
}).listen(port, '127.0.0.1', () => console.log('serving', root, 'on', port));
