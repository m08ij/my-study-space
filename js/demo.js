/* الوضع التجريبي (?demo=1): طالب تجريبي جاهز عشان أي حد يجرّب الموقع مليان بدل فاضي.
   - بيتحمّل بس من سكربت صغير بـindex.html قبل الإقلاع، ولما ما يكون بالمتصفح بيانات حقيقية (ما بيمسح بيانات حد).
   - ss_demo=1 بيوقف المزامنة السحابية كلياً (supabase.js) فما بينرفع ولا إشي لقاعدة البيانات.
   - شريط صغير فوق: «بيانات تجريبية» + زر «امسحها وابدأ ببياناتي». */
(function(){
  var W = window, LS = W.localStorage;
  function pad(x){ return ('0' + x).slice(-2); }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function add(k){ var x = new Date(); x.setDate(x.getDate() + k); return ymd(x); }
  function hm(m){ return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function seed(){
    var n = new Date();
    var C = ['تفاضل وتكامل (1)', 'فيزياء عامة (1)', 'برمجة الحاسوب', 'أخلاقيات ومهارات اتصال', 'مهارات التواصل باللغة العربية'];
    var CODE = ['0110108101', '0110102101', '0110400102', '0110400203', '2116011101'], ROOM = ['ح.ب 104', 'م.غ 301', 'م.ش 205', 'ح.ب 210', 'م.ش 110'];
    var INS = ['د. أحمد الخطيب', 'د. ليلى حداد', 'د. سامر العمري', 'د. خالد النعيمي', 'د. رنا القاسم'], DE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], tt = {};
    function slot(days, from, to, i){ days.forEach(function(d){ tt[d + '-' + from] = { name: C[i], room: ROOM[i], end: to, instructor: INS[i] }; }); }
    slot(['Sun', 'Tue', 'Thu'], '08:00', '09:00', 0); slot(['Sun', 'Tue', 'Thu'], '10:00', '11:00', 1); slot(['Mon', 'Wed'], '09:30', '11:00', 2); slot(['Mon', 'Wed'], '11:30', '12:45', 3); slot(['Sun', 'Tue', 'Thu'], '12:00', '13:00', 4);
    /* محاضرة «جارية الآن» عشان يبيّن العدّاد وزر «حضرت» */
    var m = Math.max(15, Math.min(1300, n.getHours() * 60 + n.getMinutes())); tt[DE[n.getDay()] + '-' + hm(m - 10)] = { name: C[2], room: ROOM[2], end: hm(m + 50), instructor: INS[2] };
    var sp = { profile: { name: 'طالب تجريبي' }, semesterStart: add(-35), currentSemester: 1,
      courses: C.map(function(c, i){ return { id: 'c' + i, name: c, code: CODE[i], hours: 3, instructor: INS[i], room: ROOM[i] }; }),
      tasks: [{ id: 't1', title: 'واجب التكامل رقم 2', due: ymd(n), course: C[0], priority: 'high', type: 'assignment' }, { id: 't2', title: 'مشروع برمجة — مرحلة 1', due: add(4), course: C[2], priority: 'high', type: 'project' },
        { id: 't3', title: 'تقرير مختبر الفيزياء', due: add(-2), course: C[1], priority: 'medium', type: 'assignment' }, { id: 't4', title: 'عرض تقديمي — مهارات اتصال', due: add(9), course: C[3], priority: 'medium', type: 'project' }],
      exams: [{ id: 'e1', name: 'امتحان منتصف — التفاضل 1', date: add(6), time: '10:00', room: 'قاعة 3', course: C[0] }, { id: 'e2', name: 'امتحان قصير — الفيزياء', date: add(3), time: '09:00', room: 'م.غ 301', course: C[1] },
        { id: 'e3', name: 'امتحان منتصف — البرمجة', date: add(13), time: '12:00', room: 'مختبر 2', course: C[2] }],
      timetable: tt, attendance: {}, grades: [], decks: [],
      budget: [{ id: 'b1', type: 'income', title: 'مصروف الشهر', amount: 200, date: add(-10), category: 'salary' }, { id: 'b2', type: 'expense', title: 'غداء', amount: 3.5, date: add(-1), category: 'food' },
        { id: 'b3', type: 'expense', title: 'مواصلات الأسبوع', amount: 12, date: add(-2), category: 'transport' }, { id: 'b4', type: 'expense', title: 'قرطاسية', amount: 6, date: add(-4), category: 'other' }] };
    C.forEach(function(c, i){ sp.attendance[c] = { present: 5 + i, absent: i % 3 }; });
    sp.grades = C.slice(0, 3).map(function(c, i){ return { name: c, items: [{ name: 'منتصف', score: 22 - i, weight: 30 }, { name: 'واجب 1', score: 8, weight: 10 }, { name: 'كويز', score: 4, weight: 5 }] }; });
    LS.setItem('space', JSON.stringify(sp)); LS.setItem('ss_demo', '1');
    LS.setItem('welcomeDone', 'true'); LS.setItem('ss_onboarding_done_v1', 'true'); LS.setItem('ss_seen_news', '999');
  }
  try{
    var q = /[?&]demo=1\b/.test(W.location.search), has = false;
    try{ var s = JSON.parse(LS.getItem('space') || 'null'); has = !!(s && ((s.courses && s.courses.length) || (s.tasks && s.tasks.length))); }catch(e){}
    if(q && (!has || LS.getItem('ss_demo') === '1')) seed();
    if(q && W.history && W.history.replaceState) W.history.replaceState(null, '', W.location.pathname + W.location.hash);
  }catch(e){}
  /* شريط الوضع التجريبي */
  function bar(){
    if(LS.getItem('ss_demo') !== '1' || document.getElementById('demoBar')) return;
    var b = document.createElement('div'); b.id = 'demoBar'; b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;z-index:9999;top:calc(env(safe-area-inset-top,0px) + 8px);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;border-radius:999px;background:linear-gradient(135deg,#8b5cf6,#22c3ee);color:#fff;font:600 13px Tajawal,system-ui,sans-serif;box-shadow:0 10px 30px -10px rgba(0,0,0,.6);direction:rtl;max-width:calc(100vw - 24px)';
    b.innerHTML = '<span>وضع تجريبي · بيانات طالب وهمي</span><button type="button" style="border:0;border-radius:999px;padding:6px 12px;background:rgba(255,255,255,.22);color:#fff;font:inherit;cursor:pointer;white-space:nowrap">ابدأ ببياناتي</button>';
    b.querySelector('button').addEventListener('click', function(){ if(!W.confirm('بنمسح البيانات التجريبية من هالمتصفح وبتبدأ فاضي. متأكد؟')) return; try{ LS.clear(); }catch(e){} W.location.replace(W.location.pathname); });
    document.body.appendChild(b);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bar); else bar();
})();
