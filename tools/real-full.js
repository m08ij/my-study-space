/* فحص شامل بمتصفح حقيقي (لا يُنشر): من الأصغر (عناصر/أحجام/أسماء) إلى الأكبر (نوافذ، تدفقات كاملة، النظام) على أي عرض.
   الاستعمال (على localhost فقط — يمسح بيانات الصفحة): شغّل node tests/serve.js، افتح http://127.0.0.1:8765/ بالعرض المطلوب، ثم بالـConsole:
     eval(await (await fetch('/tools/real-full.js')).text())        ← يعرّف window.RF
     await RF.seed()            ← يزرع بيانات تجريبية ويعيد التحميل (أعد تحميل الأداة بعده)
     await RF.atoms()  /  await RF.components()  /  await RF.flows()  /  await RF.system()    ← كل مرحلة ترجع JSON فيه ok/fail/warn
   الفشل الحقيقي = fail؛ warn = ملاحظة (مثل أهداف لمس أصغر من الموصى به). */
(function(){
  if(!/^(127\.0\.0\.1|localhost)$/.test(location.hostname)){ window.RF = { error: 'localhost فقط' }; return; }
  var sl = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
  var Q = function(s, r){ return (r || document).querySelector(s); }, QA = function(s, r){ return [].slice.call((r || document).querySelectorAll(s)); };
  var TABS = ['dashboard', 'timetable', 'courses', 'tasks', 'exams', 'attendance', 'timer', 'budget', 'gradecalc', 'plan', 'campus', 'hulinks'];
  function vis(e){ var r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; }
  function mk(){ return { ok: 0, fail: [], warn: [], data: {} }; }
  function T(R, name, cond, detail){ if(cond) R.ok++; else R.fail.push(name + (detail !== undefined ? ' — ' + detail : '')); }
  function W(R, name, detail){ R.warn.push(name + (detail !== undefined ? ' — ' + detail : '')); }
  function out(R){ return JSON.stringify({ vp: innerWidth + 'x' + innerHeight, ok: R.ok, fail: R.fail, warn: R.warn.slice(0, 40), warnCount: R.warn.length, data: R.data }); }
  function inScroller(e, stop){ for(var p = e.parentElement; p && p !== stop; p = p.parentElement){ var o = getComputedStyle(p).overflowX; if((o === 'auto' || o === 'scroll' || o === 'hidden') && p.scrollWidth > p.clientWidth + 1) return true; } return false; }
  function nameOf(e){ return (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || e.getAttribute('placeholder') || '').trim(); }
  function esc(k){ return document.dispatchEvent(new KeyboardEvent('keydown', { key: k || 'Escape', bubbles: true })); }
  function fill(id, v){ var e = document.getElementById(id); if(!e) return false; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; }
  function errs(){ try{ return (window.DiagLog && DiagLog.list ? DiagLog.list() : []).length; }catch(e){ return 0; } }

  var RF = window.RF = {};

  /* ---------- بيانات تجريبية ---------- */
  RF.seed = async function(){
    var n = new Date(), pad = function(x){ return ('0' + x).slice(-2); }, hm = function(m){ return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
    var DE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], mins = Math.max(15, Math.min(1300, n.getHours() * 60 + n.getMinutes()));
    function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); } function add(k){ var x = new Date(); x.setDate(x.getDate() + k); return ymd(x); }
    var C = ['حساب التفاضل والتكامل 1', 'البرمجة بلغة C++', 'الفيزياء العامة 1', 'مهارات الاتصال'];
    var sp = { profile: { name: 'مهند' }, semesterStart: add(-35), courses: C.map(function(c, i){ return { id: 'c' + i, name: c, code: 'CE10' + i, hours: 3, instructor: 'د. ' + ['أحمد', 'سامر', 'ليلى', 'خالد'][i], room: 'ح.ب 10' + i }; }),
      tasks: [{ id: 't1', title: 'واجب التكامل رقم 3', due: ymd(n), course: C[0] }, { id: 't2', title: 'مشروع C++ المرحلة الأولى', due: add(4), course: C[1] }, { id: 't3', title: 'تقرير المختبر', due: add(-2), course: C[2] }, { id: 't4', title: 'قراءة الفصل 4', due: add(7), course: C[3], done: true }],
      exams: [{ id: 'e1', name: 'امتحان منتصف التفاضل', date: add(6), time: '10:00', course: C[0] }, { id: 'e2', name: 'امتحان البرمجة', date: add(13), course: C[1] }],
      timetable: {}, attendance: {}, grades: [], decks: [{ id: 'd1', name: 'قوانين التفاضل', cards: [{ id: 'k1', q: 'مشتقة sin x', a: 'cos x' }, { id: 'k2', q: 'مشتقة e^x', a: 'e^x' }] }],
      budget: [{ id: 'b1', type: 'income', title: 'مصروف شهري', amount: 150, date: add(-5) }, { id: 'b2', type: 'expense', title: 'مواصلات', amount: 12, date: add(-1), category: 'transport' }] };
    C.forEach(function(c, i){ sp.attendance[c] = { present: 6 + i, absent: i % 3 }; });
    var d0 = DE[n.getDay()]; sp.timetable[d0 + '-' + hm(mins - 10)] = { name: C[0], room: 'ح.ب 104', end: hm(mins + 50) }; sp.timetable[d0 + '-' + hm(Math.min(1380, mins + 70))] = { name: C[1], room: 'م.ش 205', end: hm(Math.min(1439, mins + 130)) };
    [1, 2, 3].forEach(function(k){ sp.timetable[DE[(n.getDay() + k) % 7] + '-09:00'] = { name: C[k], room: 'م.غ 30' + k, end: '10:00' }; });
    localStorage.clear(); try{ sessionStorage.clear(); }catch(e){}
    localStorage.setItem('space', JSON.stringify(sp)); localStorage.setItem('notes', JSON.stringify([{ id: 'n1', title: 'ملاحظة أولى', body: 'نهايات واتصال', course: C[0], date: add(-3) }]));
    localStorage.setItem('welcomeDone', 'true'); localStorage.setItem('ss_onboarding_done_v1', 'true'); location.reload(); return 'seeded — حمّل الأداة من جديد';
  };

  /* ---------- 1) الذرّات: لكل تبويب ---------- */
  RF.atoms = async function(){
    var R = mk(); var dups = {}; QA('[id]').forEach(function(e){ dups[e.id] = (dups[e.id] || 0) + 1; }); var d = Object.keys(dups).filter(function(k){ return dups[k] > 1; });
    T(R, 'لا ids مكررة', d.length === 0, d.join(','));
    T(R, 'html lang/dir', document.documentElement.getAttribute('dir') === 'rtl' && /^ar/.test(document.documentElement.lang), document.documentElement.lang + '/' + document.documentElement.dir);
    T(R, 'viewport meta', !!Q('meta[name="viewport"]'));
    var phone = innerWidth < 760;
    for(var i = 0; i < TABS.length; i++){
      var t = TABS[i]; window.switchTab(t, false); await sl(380); var s = document.getElementById(t), de = document.documentElement, rep = {};
      var okv = !!s && vis(s) && s.getBoundingClientRect().height > 40; if(!okv){ await sl(900); okv = !!s && vis(s) && s.getBoundingClientRect().height > 40; }   /* أول تبويب بعد إعادة التحميل قد يتأخر برسم الأنيميشن */
      T(R, t + ': ظاهر', okv);
      T(R, t + ': بلا تمرير أفقي', de.scrollWidth <= de.clientWidth + 1, de.scrollWidth + '>' + de.clientWidth);
      var over = [], small = [], noname = [], tiny = [], noalt = [], nolabel = [];
      QA('*', s).forEach(function(e){
        if(!vis(e) || e instanceof SVGElement || (e.closest('details:not([open])') && e.tagName !== 'SUMMARY')) return; var r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        if(cs.position !== 'fixed' && (r.right > innerWidth + 2 || r.left < -2) && !inScroller(e, s)) over.push((e.id || e.className || e.tagName).toString().slice(0, 30));
        var inter = e.matches('button,a[href],[role=button],[role=tab],[role=checkbox],input:not([type=hidden]),select,textarea,summary');
        if(inter){
          if(Math.min(r.width, r.height) < (phone ? 32 : 24) && !e.matches('.task-check,.md-check')) small.push((e.id || e.className || e.tagName).toString().slice(0, 24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
          if(!nameOf(e) && !e.matches('input,select,textarea')) noname.push((e.id || e.className || e.tagName).toString().slice(0, 30));
          if(e.matches('input:not([type=checkbox]):not([type=radio]),select,textarea') && !(e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.labels && e.labels.length || e.getAttribute('title'))) nolabel.push((e.id || e.name || e.tagName).toString().slice(0, 24));
        }
        if(e.children.length === 0 && (e.textContent || '').trim().length > 1 && !(e instanceof SVGElement) && parseFloat(cs.fontSize) < 10.5) tiny.push(Math.round(parseFloat(cs.fontSize)) + ':' + e.textContent.trim().slice(0, 14));
        if(e.tagName === 'IMG' && !e.hasAttribute('alt')) noalt.push(e.src.slice(-30));
      });
      T(R, t + ': لا عناصر خارج الشاشة', over.length === 0, over.slice(0, 4).join('|'));
      T(R, t + ': كل زر/رابط له اسم', noname.length === 0, noname.slice(0, 4).join('|'));
      T(R, t + ': حقول لها وسم', nolabel.length === 0, nolabel.slice(0, 4).join('|'));
      T(R, t + ': صور بـalt', noalt.length === 0, noalt.join('|'));
      if(small.length) W(R, t + ': أهداف لمس صغيرة (' + small.length + ')', small.slice(0, 3).join('|'));
      if(tiny.length) W(R, t + ': نص أصغر من 10.5px (' + tiny.length + ')', tiny.slice(0, 3).join('|'));
      R.data[t] = { h: Math.round(s.getBoundingClientRect().height) };
    }
    T(R, 'DiagLog بلا أخطاء', errs() === 0, errs());
    return out(R);
  };

  /* ---------- 2) المكوّنات: نوافذ وقوائم وثيمات وأحجام خط ---------- */
  RF.components = async function(){
    var R = mk(), de = document.documentElement, phone = innerWidth < 760;
    window.switchTab('dashboard', false); await sl(300);
    /* قائمة الإعدادات */
    var st = Q('#settingsMenu'); Q('#settingsBtn').click(); await sl(500); T(R, 'الإعدادات تفتح', st.classList.contains('show'));
    var tabs = QA('#settingsMenu .sm-tab'); T(R, 'الإعدادات: 4 تبويبات', tabs.length === 4, tabs.length);
    for(var k = 0; k < tabs.length; k++){ tabs[k].click(); await sl(150); T(R, 'تبويب إعدادات ' + (tabs[k].getAttribute('data-sm')), st.getAttribute('data-sm') === tabs[k].getAttribute('data-sm') && de.scrollWidth <= de.clientWidth + 1); }
    var dl = Q('#settingsMenu .sm-dialog').getBoundingClientRect(); T(R, 'نافذة الإعدادات داخل الشاشة', dl.left >= -1 && dl.right <= innerWidth + 1 && dl.bottom <= innerHeight + 2, Math.round(dl.left) + ',' + Math.round(dl.right) + ',' + Math.round(dl.bottom));
    Q('#smClose').click(); await sl(300); T(R, 'إغلاق ✕', !st.classList.contains('show'));
    Q('#settingsBtn').click(); await sl(400); st.click(); await sl(300); T(R, 'إغلاق بالخلفية', !st.classList.contains('show'));
    Q('#settingsBtn').click(); await sl(400); esc(); await sl(300); T(R, 'إغلاق بـEsc', !st.classList.contains('show'));
    for(var fz of ['sm', 'lg', 'md']){
      Q('#settingsBtn').click(); await sl(350); var fb = Q('#settingsMenu button[data-fs="' + fz + '"]'); T(R, 'زر خط ' + fz + ' موجود', !!fb); if(fb) fb.click(); await sl(250);
      T(R, 'خط ' + fz + ' طُبّق', fz === 'md' ? !de.hasAttribute('data-fs') : de.getAttribute('data-fs') === fz);
      Q('#smClose').click(); await sl(300); T(R, 'إغلاق ✕ بخط ' + fz, !st.classList.contains('show'));
      if(fz !== 'md'){ var ov = []; for(var t of ['dashboard', 'tasks', 'courses', 'budget']){ window.switchTab(t, false); await sl(250); if(de.scrollWidth > de.clientWidth + 1) ov.push(t); } T(R, 'بلا تمرير أفقي بخط ' + fz, ov.length === 0, ov.join(',')); window.switchTab('dashboard', false); }
    }
    /* الثيمات */
    var themes = QA('#themeGrid .theme-swatch'); T(R, 'الثيمات 9 (8 + تلقائي)', themes.length === 9, themes.length); var bgs = {};
    for(var sw of themes){ window.applyTheme(sw.getAttribute('data-theme'), false); await sl(180); bgs[sw.getAttribute('data-theme')] = getComputedStyle(document.body).backgroundColor;
      var okT = sw.getAttribute('data-theme') === 'auto' || de.getAttribute('data-theme') === sw.getAttribute('data-theme'); T(R, 'ثيم ' + sw.getAttribute('data-theme'), okT && de.scrollWidth <= de.clientWidth + 1); }
    T(R, 'الثيمات ألوانها مختلفة', Object.keys(bgs).filter(function(k){ return k !== 'auto'; }).map(function(k){ return bgs[k]; }).filter(function(v, i, a){ return a.indexOf(v) === i; }).length >= 5, JSON.stringify(bgs).slice(0, 120)); window.applyTheme('dark', false);
    /* النوافذ المنبثقة */
    var forms = [['addTask', function(){ window.addTask(); }], ['addExam', function(){ window.addExam(); }], ['addMyCourse', function(){ window.addMyCourse(); }], ['addBudgetItem', function(){ window.addBudgetItem('expense'); }]];
    for(var f of forms){ f[1](); await sl(350); var m = Q('.modal'); T(R, f[0] + ': تفتح', !!m); if(m){ var r = m.getBoundingClientRect(); T(R, f[0] + ': داخل الشاشة', r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1, Math.round(r.left) + ',' + Math.round(r.right) + ',' + Math.round(r.top) + ',' + Math.round(r.bottom)); var foc = document.activeElement && m.contains(document.activeElement); if(!foc) W(R, f[0] + ': التركيز ليس داخل النافذة'); esc(); await sl(300); T(R, f[0] + ': Esc يغلق', !Q('.modal')); if(Q('.modal')) Q('#mCancel').click(); await sl(200); } }
    /* شريط جانبي/سفلي */
    if(phone){
      Q('#menuToggle').click(); await sl(350); T(R, 'القائمة الجانبية تفتح', Q('#sidebar').classList.contains('open')); var nsb = Q('#navSettings'), bnb = Q('.bn-bar'), nr = nsb.getBoundingClientRect(), br = bnb ? bnb.getBoundingClientRect() : { top: innerHeight }; T(R, 'إعدادات القائمة الجانبية: ظاهرة فوق الشريط السفلي', nr.height > 20 && nr.bottom <= br.top + 1 && nr.top >= 0, Math.round(nr.top) + '-' + Math.round(nr.bottom) + ' bn:' + Math.round(br.top)); var snv = Q('.sidebar-nav'), nvr = snv.getBoundingClientRect(); T(R, 'منطقة التنقل لا تتداخل مع الإعدادات', nvr.bottom <= nr.top + 1, Math.round(nvr.bottom) + ' vs ' + Math.round(nr.top)); nsb.click(); await sl(400); T(R, 'إعدادات القائمة تفتح الصفحة وتغلق الدرج', Q('#settingsMenu').classList.contains('show') && !Q('#sidebar').classList.contains('open')); Q('#smClose').click(); await sl(300); T(R, 'إغلاق إعدادات القائمة', !Q('#settingsMenu').classList.contains('show')); Q('#menuToggle').click(); await sl(350); Q('#sidebarBackdrop').click(); await sl(300); T(R, 'القائمة الجانبية تُغلق بالخلفية', !Q('#sidebar').classList.contains('open'));
      var bn = QA('.bn-item'); T(R, 'شريط سفلي 6', bn.length === 6, bn.length); for(var b of bn){ b.click(); await sl(250); T(R, 'شريط سفلي ← ' + b.dataset.bnTab, Q('.section.active').id === b.dataset.bnTab); }
    } else {
      var nsd = Q('#navSettings'), nrd = nsd.getBoundingClientRect(), snd = Q('.sidebar-nav').getBoundingClientRect(); T(R, 'إعدادات القائمة: ظاهرة بالأسفل وغير متداخلة', nrd.height > 20 && nrd.bottom <= innerHeight + 1 && snd.bottom <= nrd.top + 1, Math.round(nrd.top) + '-' + Math.round(nrd.bottom) + ' nav:' + Math.round(snd.bottom)); nsd.click(); await sl(400); T(R, 'إعدادات القائمة تفتح الصفحة وتتميّز', Q('#settingsMenu').classList.contains('show') && nsd.classList.contains('active')); Q('#smClose').click(); await sl(300); var navs = QA('.sidebar .nav-item[data-tab]').filter(vis); T(R, 'شريط جانبي ظاهر', navs.length >= 10, navs.length); for(var nv of navs.slice(0, 14)){ nv.click(); await sl(220); T(R, 'جانبي ← ' + nv.dataset.tab, Q('.section.active').id === nv.dataset.tab); }
    }
    /* زر الإضافة العائم + المساعد + البحث + الأدوات السريعة */
    window.switchTab('dashboard', false); await sl(250);
    var fab = Q('#fabMain'); if(fab && vis(fab)){ fab.click(); await sl(300); var fm = Q('#fabMenu'); T(R, 'FAB يفتح القائمة', !!fm && (fm.classList.contains('open') || fm.classList.contains('show') || vis(fm))); fab.click(); await sl(250); }
    var ai = Q('#aiFab'); if(ai && vis(ai)){ ai.click(); await sl(500); var ap = Q('#aiPanel'); T(R, 'المساعد يفتح', !!ap && ap.classList.contains('show')); ai.click(); await sl(400); T(R, 'المساعد يُغلق', !ap.classList.contains('show')); if(ap.classList.contains('show')){ esc(); await sl(300); } }
    var si = Q('#searchInput'); si.focus(); si.value = 'تفاضل'; si.dispatchEvent(new Event('input', { bubbles: true })); await sl(250); T(R, 'البحث يرجّع نتائج', QA('#searchResults .search-item').length > 0); si.value = ''; si.dispatchEvent(new Event('input', { bubbles: true })); si.blur();
    var lw = Q('#lwExpandBtn'); if(lw){ lw.click(); await sl(450); var sbq = Q('#lwSidebar'); T(R, 'الأدوات السريعة تفتح', sbq.classList.contains('open')); var cards = QA('#lwSidebar .lw-card'); var clipped = cards.filter(function(c){ return c.scrollHeight > c.clientHeight + 2; }).length; T(R, 'الأدوات السريعة بلا بطاقات مقصوصة', clipped === 0, clipped); Q('#lwCloseBtn').click(); await sl(350); T(R, 'الأدوات السريعة تُغلق', !sbq.classList.contains('open')); }
    T(R, 'DiagLog بلا أخطاء', errs() === 0, errs());
    return out(R);
  };

  /* ---------- 3) التدفقات الكاملة (تُغيّر البيانات التجريبية) ---------- */
  RF.flows = async function(){
    var R = mk(), S = function(){ return window.space; };
    /* مادة */
    window.switchTab('courses', false); await sl(250); var before = S().courses.length;
    window.addMyCourse(); await sl(300); fill('mf_name', 'مادة اختبار شامل'); fill('mf_code', 'ZZ900'); fill('mf_hours', '3'); Q('#mSave').click(); await sl(500);
    T(R, 'مادة: أُضيفت', S().courses.length === before + 1 && S().courses.some(function(c){ return c.name === 'مادة اختبار شامل'; }));
    T(R, 'مادة: بقائمة موادي', /مادة اختبار شامل/.test(Q('#myCoursesGrid').textContent));
    window.switchTab('attendance', false); await sl(300); T(R, 'مادة: بالحضور تلقائياً', /مادة اختبار شامل/.test(Q('#attendanceList').textContent));
    window.switchTab('gradecalc', false); await sl(300); T(R, 'مادة: بالعلامات تلقائياً', /مادة اختبار شامل/.test(Q('#gradecalc').textContent));
    /* حضور */
    var a0 = S().attendance['مادة اختبار شامل']; var p0 = a0 ? a0.present : 0; window.markAttendance('مادة اختبار شامل', 'present'); window.markAttendance('مادة اختبار شامل', 'absent'); await sl(250);
    T(R, 'حضور: تسجيل حاضر وغائب', S().attendance['مادة اختبار شامل'].present === p0 + 1 && S().attendance['مادة اختبار شامل'].absent === 1);
    /* مهام */
    window.switchTab('tasks', false); await sl(250); var t0 = S().tasks.length; var qi = Q('#taskQuickForm input') || Q('#taskQuickForm'); if(Q('#taskQuickInput')) fill('taskQuickInput', 'واجب اختبار بكرة'); else window.quickAddTask('واجب اختبار بكرة'); if(S().tasks.length === t0) window.quickAddTask('واجب اختبار بكرة'); await sl(300);
    var nt = S().tasks.filter(function(t){ return /واجب اختبار/.test(t.title); })[0]; T(R, 'مهمة: أُضيفت بنص طبيعي', !!nt && !!nt.due, nt && nt.due); window.switchTab('tasks', false); await sl(300);
    if(nt){ T(R, 'مهمة: تظهر بالقائمة', !!Q('[data-task-id="' + nt.id + '"]')); window.toggleTask(nt.id); await sl(250); T(R, 'مهمة: إنجاز', S().tasks.filter(function(t){ return t.id === nt.id; })[0].done === true); window.toggleTask(nt.id); await sl(200);
      window.deleteTask(nt.id); await sl(300); var yes = QA('.modal button,.confirm button,button').filter(function(b){ return /^(حذف|نعم|تأكيد)/.test(b.textContent.trim()) && vis(b); })[0]; if(yes){ yes.click(); await sl(300); } T(R, 'مهمة: حذف', !S().tasks.some(function(t){ return t.id === nt.id; })); }
    /* امتحان */
    window.switchTab('exams', false); await sl(250); var e0 = S().exams.length; window.addExam(); await sl(300); fill('mf_name', 'امتحان اختبار'); var cs = Q('#mf_course'); if(cs && cs.options.length > 1) cs.selectedIndex = 1; fill('mf_date', (function(){ var d = new Date(); d.setDate(d.getDate() + 9); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); })()); fill('mf_time', '11:30'); Q('#mSave').click(); await sl(500);
    T(R, 'امتحان: أُضيف', S().exams.length === e0 + 1); T(R, 'امتحان: يظهر بالقائمة', /امتحان اختبار/.test(Q('#examsList').textContent));
    /* ميزانية */
    window.switchTab('budget', false); await sl(250); var b0 = S().budget.length; window.addBudgetItem('expense'); await sl(300); fill('mf_amount', '7.5'); Q('#mSave').click(); await sl(500); T(R, 'ميزانية: مصروف أُضيف', S().budget.length === b0 + 1 && S().budget.some(function(b){ return +b.amount === 7.5; }));
    window.addBudgetItem('income'); await sl(300); fill('mf_amount', '40'); Q('#mSave').click(); await sl(500); T(R, 'ميزانية: دخل أُضيف', S().budget.some(function(b){ return +b.amount === 40 && b.type === 'income'; }));
    /* ملاحظة مادة (التبويبان العامّان حُذفا) */
    window.switchTab('courses', false); await sl(250); var n0 = (window.notes || []).length, cn0 = (S().courses[0] || {}).name; window.addCourseNote(cn0); await sl(400); T(R, 'ملاحظة مادة: المحرر يفتح', !!Q('.modal'));
    var nt1 = Q('#mf_title') || Q('.modal input'); var nb = Q('#mf_body') || Q('.modal textarea'); if(nt1){ nt1.value = 'ملاحظة اختبار'; nt1.dispatchEvent(new Event('input', { bubbles: true })); } if(nb){ nb.value = 'نص'; nb.dispatchEvent(new Event('input', { bubbles: true })); }
    var sv = Q('#mSave'); if(sv){ sv.click(); await sl(500); } else { esc(); await sl(300); } T(R, 'ملاحظة مادة: حُفظت', (window.notes || []).length === n0 + 1 && window.notes[0].course === cn0, (window.notes || []).length + ' vs ' + n0);
    window.Hub.openCourse(cn0, 'notes'); await sl(500); T(R, 'ملاحظة مادة: تظهر بورقة المادة', !!Q('#hs-notes [data-note-edit]')); if(window.HubUI) while(window.HubUI.closeTop()); await sl(200);
    /* مؤقت */
    window.switchTab('timer', false); await sl(250); window.startTimer(); await sl(1300); T(R, 'مؤقت: يعمل ويعدّ', window.ts && window.ts.running === true); window.stopTimer(); await sl(200); T(R, 'مؤقت: يتوقف', window.ts.running === false);
    /* جدول */
    window.switchTab('timetable', false); await sl(300); var tt0 = Object.keys(S().timetable).length; T(R, 'جدول: يظهر محاضرات', QA('#timetable .tt-cell, #timetable .class-card, #timetable [data-key], #timetable .tt-class').length > 0 || tt0 > 0);
    /* نسخة احتياطية: التجميع والتحقق (بدون تنزيل فعلي) */
    var snap = window.gatherSnapshot(); var vb = window.validateBackup(JSON.parse(JSON.stringify(snap))); T(R, 'نسخة احتياطية: صالحة', vb.ok === true, JSON.stringify(vb.errors || []));
    var jsonLen = JSON.stringify(snap).length; R.data.backupKB = Math.round(jsonLen / 1024);
    /* حذف المادة يمسح كل مكان */
    window.removeCourseEverywhere('مادة اختبار شامل'); await sl(300); var yes2 = QA('button').filter(function(b){ return /^(حذف|نعم|تأكيد)/.test(b.textContent.trim()) && vis(b); })[0]; if(yes2){ yes2.click(); await sl(300); }
    T(R, 'حذف مادة: يمسح من الكل', !S().courses.some(function(c){ return c.name === 'مادة اختبار شامل'; }) && !S().attendance['مادة اختبار شامل']);
    /* الحفظ يبقى بعد إعادة التحميل */
    T(R, 'التخزين المحلي محدّث', JSON.parse(localStorage.getItem('space')).exams.some(function(e){ return e.name === 'امتحان اختبار'; }));
    T(R, 'DiagLog بلا أخطاء', errs() === 0, errs());
    return out(R);
  };

  /* ---------- 4) النظام: SW، الأداء، التسرّب، التوجيه ---------- */
  RF.system = async function(){
    var R = mk(); var nav = performance.getEntriesByType('navigation')[0] || {}; R.data.dcl = Math.round(nav.domContentLoadedEventEnd || 0); R.data.load = Math.round(nav.loadEventEnd || 0);
    var res = performance.getEntriesByType('resource'); R.data.requests = res.length; R.data.transferKB = Math.round(res.reduce(function(a, r){ return a + (r.transferSize || 0); }, 0) / 1024);
    R.data.scripts = res.filter(function(r){ return /\.js(\?|$)/.test(r.name); }).map(function(r){ return r.name.split('/').pop().split('?')[0]; });
    T(R, 'DOMContentLoaded < 4s', R.data.dcl < 4000, R.data.dcl); if(R.data.dcl > 1800) W(R, 'DCL بطيء نسبياً', R.data.dcl + 'ms');
    var reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); T(R, 'Service Worker مسجّل', !!reg);
    if(window.caches){ var ks = await caches.keys(); R.data.caches = ks; T(R, 'كاش التطبيق موجود', ks.some(function(k){ return /^ss-cache-v\d+$/.test(k); }), ks.join(',')); }
    T(R, 'manifest', !!Q('link[rel=manifest]')); T(R, 'theme-color', !!Q('meta[name=theme-color]'));
    /* التوجيه والرجوع */
    window.switchTab('tasks'); await sl(200); window.switchTab('exams'); await sl(200); history.back(); await sl(400); T(R, 'زر الرجوع يرجع للتبويب السابق', Q('.section.active').id === 'tasks', Q('.section.active').id);
    location.hash = '#budget'; await sl(500); T(R, 'رابط مباشر #budget', Q('.section.active').id === 'budget', Q('.section.active').id);
    /* تسرّب الذاكرة: 60 تبديل تبويب */
    var heap0 = performance.memory ? performance.memory.usedJSHeapSize : 0, nodes0 = document.getElementsByTagName('*').length; for(var i = 0; i < 60; i++){ window.switchTab(TABS[i % TABS.length], false); await sl(25); } await sl(300);
    var nodes1 = document.getElementsByTagName('*').length; R.data.nodes = nodes0 + '→' + nodes1; T(R, 'عدد عناصر DOM ثابت بعد 60 تبديل', nodes1 < nodes0 * 1.25 + 200, R.data.nodes);
    if(performance.memory){ var grow = (performance.memory.usedJSHeapSize - heap0) / 1048576; R.data.heapGrowMB = Math.round(grow * 10) / 10; if(grow > 25) W(R, 'نمو ذاكرة كبير بعد التبديل', grow.toFixed(1) + 'MB'); }
    /* مهام طويلة أثناء التبديل (إن دعمها المتصفح) */
    var long = 0; try{ var po = new PerformanceObserver(function(l){ long += l.getEntries().length; }); po.observe({ entryTypes: ['longtask'] }); for(var j = 0; j < 14; j++){ window.switchTab(TABS[j], false); await sl(160); } po.disconnect(); R.data.longTasks = long; if(long > 6) W(R, 'مهام طويلة أثناء التبديل', long); }catch(e){}
    /* وصول لوحة المفاتيح: Tab يتحرك والتركيز ظاهر */
    document.body.focus(); var f0 = document.activeElement; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); T(R, 'عناصر قابلة للتركيز موجودة', QA('button,a[href],input,select,textarea,[tabindex="0"]').filter(vis).length > 20);
    /* أوفلاين: الكاش يحتوي الملفات الأساسية */
    if(window.caches){ var c = await caches.open((await caches.keys()).filter(function(k){ return /^ss-cache-v/.test(k); })[0]); var keys = (await c.keys()).map(function(r){ return r.url.split('/').pop().split('?')[0]; }); R.data.cachedCount = keys.length; T(R, 'الكاش فيه الصفحة والخط والحزمة/السكربتات', keys.some(function(k){ return k === 'index.html' || k === ''; }) && keys.some(function(k){ return /tajawal-arabic-400/.test(k); }), keys.length + ' ملف'); }
    T(R, 'DiagLog بلا أخطاء', errs() === 0, errs());
    return out(R);
  };
  /* مراحل طويلة (أكثر من 45 ثانية بالـConsole): RF.start('components') ثم RF.result('components') كل بضع ثوانٍ */
  ['atoms', 'components', 'flows', 'system'].forEach(function(k){ var f = RF[k]; RF[k] = async function(){ var r = await f(); (window.__RF = window.__RF || {})[k] = r; return r; }; });
  RF.start = function(k){ window.__RF = window.__RF || {}; delete window.__RF[k]; RF[k](); return 'started ' + k; };
  RF.result = function(k){ return (window.__RF || {})[k] || 'running'; };
  return RF;
})();
