/* فحص حيّ بمتصفح حقيقي (لا يُنشر): يزرع بيانات تجريبية ثم يتحقق من التنقل والتخطيط (بلا تمرير أفقي) وتبويبات ورقة المادة والبحث.
   الاستعمال: شغّل السيرفر (node tests/serve.js) وافتح http://127.0.0.1:8765/ بأي متصفح (أو بمتصفح التطبيق، بحجم تلفون ثم سطح مكتب)،
   ثم نفّذ بالـConsole:  eval(await (await fetch('/tools/real-check.js')).text())  — النتيجة JSON بآخرها، وفاشل = false.
   هذا الفحص يمسح localStorage للصفحة (بيانات تجريبية فقط؛ لا تشغّله على موقعك المنشور ببياناتك). */
(async function(){
  if(!/^(127\.0\.0\.1|localhost)$/.test(location.hostname)){ return JSON.stringify({ error: 'يعمل فقط على localhost حتى لا يمسح بياناتك' }); }
  var sl = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var errs = [];
  window.addEventListener('error', function(e){ errs.push('err: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', function(e){ errs.push('rej: ' + (e.reason && e.reason.message || e.reason)); });
  /* زرع بيانات ثم إعادة تحميل (نكمل بعد التحميل بمفتاح جلسة) */
  if(!sessionStorage.getItem('rc_seeded')){
    var plan = window.Syllabus.normalize({ weeks: [{ from: 1, to: 2, topics: [{ title: 'مخططات غانت' }, { title: 'إدارة المخاطر' }] }], grading: [{ item: 'نهائي', weight: 100 }], textbook: { title: 'Project Management' } }).plan;
    var sp = { profile: { name: 'تجربة' }, courses: [{ id: 'c1', name: 'إدارة مشاريع', code: 'CE101', hours: 3, instructor: 'د. أحمد', room: 'ح.ب 101', syllabus: plan, study: { '1.1': { flashcards: [{ q: 'ما هو المسار الحرج؟', a: 'x' }], definitions: [{ term: 'الاعتماديات', meaning: 'y' }] } } }],
      tasks: [{ id: 't1', title: 'تسليم المشروع', due: '2026-10-11', course: 'إدارة مشاريع' }], exams: [{ id: 'e1', name: 'امتحان منتصف', date: '2026-10-20', course: 'إدارة مشاريع' }], timetable: {}, attendance: {}, grades: {}, decks: [{ id: 'd1', name: 'مراجعة الشبكات', cards: [{ id: 'k1', q: 'ما هو بروتوكول TCP', a: 'z' }] }], semesterStart: '2026-09-06' };
    localStorage.clear(); localStorage.setItem('space', JSON.stringify(sp)); localStorage.setItem('welcomeDone', 'true'); localStorage.setItem('ss_onboarding_done_v1', 'true');
    sessionStorage.setItem('rc_seeded', '1'); location.reload(); return 'seeded — أعد تنفيذ الأمر بعد التحميل';
  }
  await sl(1200);
  var o = { build: window.APP_BUILD, viewport: innerWidth + 'x' + innerHeight, tabs: {}, overflow: [], course: [], search: {} };
  var de = document.documentElement;
  var tabs = ['dashboard', 'timetable', 'courses', 'tasks', 'exams', 'attendance', 'timer', 'flashcards', 'budget', 'notes', 'gradecalc', 'plan', 'campus', 'hulinks'];
  for(var i = 0; i < tabs.length; i++){
    var t = tabs[i]; window.switchTab(t); await sl(350);
    var s = document.getElementById(t), h = s ? s.getBoundingClientRect().height : 0;
    o.tabs[t] = !!s && getComputedStyle(s).display !== 'none' && h > 40;
    if(de.scrollWidth > de.clientWidth + 1) o.overflow.push(t + ' ' + de.scrollWidth + '>' + de.clientWidth);
  }
  window.switchTab('courses'); await sl(300); window.Hub.openCourse('c1'); await sl(600);
  var body = document.querySelector('.hub-sheet-body'), btns = [].slice.call(document.querySelectorAll('.hub-ctabs [data-ctab], .hub-ctab'));
  o.course_tabsFound = btns.length === 6;
  for(var k = 0; k < btns.length; k++){
    btns[k].click(); await sl(250);
    var vis = body ? [].slice.call(body.children).filter(function(c){ return getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().height > 4; }).length : 0;
    o.course.push(vis > 0);
  }
  o.course_allShow = o.course.length === 6 && o.course.every(Boolean);
  if(de.scrollWidth > de.clientWidth + 1) o.overflow.push('course-sheet');
  window.HubUI.closeTop(); await sl(300); window.switchTab('dashboard'); await sl(300);
  var inp = document.getElementById('searchInput');
  function q(v){ inp.focus(); inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); return [].map.call(document.querySelectorAll('#searchResults .search-item'), function(x){ return x.textContent; }); }
  o.search.course = q('اداره').some(function(x){ return /إدارة مشاريع/.test(x); });
  o.search.topic = q('غانت').some(function(x){ return /موضوع/.test(x); });
  o.search.deck = q('الشبكات').some(function(x){ return /بطاقات/.test(x); });
  o.search.building = q('حسين').some(function(x){ return /مبنى/.test(x); });
  q(''); inp.blur();
  o.noOverflow = o.overflow.length === 0;
  o.allTabsVisible = Object.keys(o.tabs).every(function(k){ return o.tabs[k]; });
  o.errs = errs;
  sessionStorage.removeItem('rc_seeded');
  return JSON.stringify(o);
})()
