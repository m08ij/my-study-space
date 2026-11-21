/* ورقة المادة بتبويبات + «نظرة»، وخريطة v2 (مساري/اتجاهات/طبقات) */
const fs = require('fs'), path = require('path');
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  /* وقت ثابت (الأربعاء 10:30) حتى لا يتأثر الاختبار بساعة التشغيل (كان يفشل بعد ~19:30 لأن المحاضرات تُثبَّت قبل 20:00) */
  const FIXED = new Date(2026, 9, 14, 10, 30, 0).getTime(), now = new Date(FIXED), de = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], P = n => ('0' + n).slice(-2), ymd = d => d.getFullYear() + '-' + P(d.getMonth() + 1) + '-' + P(d.getDate());
  const today = de[now.getDay()], nm = now.getHours() * 60 + now.getMinutes();
  const at = m => P(Math.floor(m / 60) % 24) + ':' + P(m % 60);
  /* اليوم: محاضرتان متتاليتان بمبنيين بعيدين وفاصل 5 دقايق (ما بتلحق)، وثالثة بنفس المبنى؛ ثابتة بالنهار لتجنّب حدود منتصف الليل */
  const tt = {}; const base = Math.min(Math.max(nm + 30, 8 * 60), 20 * 60);
  tt[today + '-' + at(base)] = { name: 'A', room: 'ح.ب 104', end: at(base + 60) };
  tt[today + '-' + at(base + 65)] = { name: 'B', room: 'م.ش 105', end: at(base + 125) };
  tt[today + '-' + at(base + 130)] = { name: 'C', room: 'م.ش 201', end: at(base + 190) };
  const future = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5);
  const space = { profile: { name: 'س' }, courses: [{ id: 'c1', name: 'A', code: '1', hours: 3 }, { id: 'c2', name: 'B', code: '2', hours: 3 }], tasks: [{ id: 't1', title: 'واجب', course: 'A', due: ymd(future), type: 'task' }, { id: 't2', title: 'متأخرة', course: 'A', due: '2020-01-01', type: 'task' }], exams: [{ id: 'e1', name: 'امتحان A', course: 'A', date: ymd(future), time: '10:00' }], timetable: tt, attendance: { A: { present: 6, absent: 2 } }, grades: [{ name: 'A', items: [{ name: 'م1', score: 15, weight: 20 }] }] };
  const { w, errs } = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(space) });
  { const RD = w.Date; w.Date = class extends RD { constructor(...a){ if(a.length) super(...a); else super(FIXED); } static now(){ return FIXED; } }; }
  await sl(2300);
  const d = w.document, Q = s => d.querySelector(s), QA = s => [...d.querySelectorAll(s)];
  /* CSS يربط data-ctab بإظهار الأقسام (jsdom لا يطبّق CSS الخارجي فنفحص النص مباشرة) */
  const cssDir = path.join(__dirname, '..', 'css');
  const cssAll = fs.readdirSync(cssDir).map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');
  o.C_cssWiring = ['over', 'plan', 'files', 'work', 'marks', 'notes'].every(t => cssAll.indexOf('.hub-sheet-body[data-ctab="' + t + '"] [data-ctabs~="' + t + '"]') > -1) && cssAll.indexOf('.hub-sheet-body[data-ctab] [data-ctabs]{display:none}') > -1;
  /* ===== ورقة المادة ===== */
  w.Hub.openCourse('c1'); await sl(300);
  const body = Q('.hub-course-sheet .hub-sheet-body');
  o.C_defaultOverview = body.getAttribute('data-ctab') === 'over' && Q('.hub-ctab.active').getAttribute('data-jump') === 'over' && Q('.hub-ctab.active').getAttribute('aria-selected') === 'true';
  o.C_sixTabs = QA('.hub-ctab').map(b => b.getAttribute('data-jump')).join() === 'over,plan,work,marks,files,notes';   /* 168: المهام والعلامات قبل الملفات (أكثر استعمالاً) */
  const tabsOf = id => Q('#hs-' + id).getAttribute('data-ctabs');
  o.C_sectionTabs = tabsOf('over') === 'over' && tabsOf('plan') === 'plan' && tabsOf('sched') === 'plan' && tabsOf('files') === 'files' && tabsOf('tasks') === 'work' && tabsOf('exams') === 'work' && tabsOf('grades') === 'marks' && tabsOf('att') === 'marks' && tabsOf('notes') === 'notes';
  o.C_workBadge = /\d/.test(Q('.hub-ctab[data-jump="work"] .hub-ctab-n').textContent);
  const cards = QA('#hs-over .hub-ov-card').map(c => c.textContent.replace(/\s+/g, ' '));
  o.O_cards = cards.some(t => /المحاضرة الجاية|جارية الآن/.test(t)) && cards.some(t => /المهام.*متبقية/.test(t)) && cards.some(t => /1 متأخرة/.test(t)) && cards.some(t => /أقرب امتحان/.test(t)) && cards.some(t => /الحضور.*75%/.test(t)) && cards.some(t => /العلامات.*15 \/ 20/.test(t));
  o.O_mapCard = !!Q('#hs-over [data-ov-act="map"]') && /الحسين الباني/.test(Q('#hs-over [data-ov-act="map"]').textContent);
  o.O_noPlanHint = cards.some(t => /خطة المادة.*ما انرفعت/.test(t));
  /* تبديل التبويب بدون إعادة رسم */
  Q('.hub-ctab[data-jump="work"]').click(); await sl(60);
  o.T_switch = body.getAttribute('data-ctab') === 'work' && Q('.hub-ctab.active').getAttribute('data-jump') === 'work' && Q('.hub-ctab[data-jump="over"]').getAttribute('aria-selected') === 'false';
  w.Hub.refreshActive(); await sl(150);
  o.T_remembered = Q('.hub-course-sheet .hub-sheet-body').getAttribute('data-ctab') === 'work';
  Q('.hub-ctab[data-jump="over"]').click(); await sl(40);
  Q('#hs-over [data-go-tab="marks"]').click(); await sl(40);
  o.T_cardJumps = Q('.hub-course-sheet .hub-sheet-body').getAttribute('data-ctab') === 'marks';
  Q('.hub-ctab[data-jump="over"]').click(); await sl(40);
  Q('.hub-ct [data-ov-act="addtask"]').click(); await sl(150);   /* «+ مهمة» صار برأس النافذة */
  o.T_quickAddTask = !!Q('.modal, .modal-box, [role=dialog]:not(#settingsMenu)');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sl(150);
  /* فتح من مكان ثانٍ بقسم محدّد: الامتحانات -> تبويب work */
  w.Hub.openCourse('c1', 'exams'); await sl(250);
  o.T_openAtSection = Q('.hub-course-sheet .hub-sheet-body').getAttribute('data-ctab') === 'work';
  /* مادة بلا خطة وبلا محاضرات: لا أخطاء */
  w.Hub.openCourse('c2'); await sl(250);
  o.T_noCrash = !!Q('#hs-over') && QA('#hs-over .hub-ov-card').length >= 5;
  /* خطة محفوظة تظهر ببطاقة الأسبوع */
  const c1 = w.space.courses[0]; c1.syllabus = w.Syllabus.normalize({ instructor: 'د', weeks: [{ from: 1, to: 3, topics: [{ title: 'Limits', section: '2.2' }, { title: 'Laws', section: '2.3' }] }, { from: 4, to: 6, topics: [{ title: 'Derivatives', section: '3.1' }] }] }).plan;
  w.space.semesterStart = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)); w.Hub.openCourse('c1'); await sl(250);
  const wk = QA('#hs-over .hub-ov-card').map(c => c.textContent.replace(/\s+/g, ' ')).find(t => /أسبوع 2 من 6/.test(t));
  o.O_weekCard = !!wk && /Limits/.test(wk) && /\+1 مواضيع أخرى/.test(wk);

  /* ===== الخريطة v2 ===== */
  const M = w.CampusMap; w.switchTab('campus'); await sl(300);
  o.M_tabs = QA('.cm-tab').map(t => t.dataset.tab).join() === 'mine,route,places,legend';
  o.M_walk = M.walkMinutes('hb', 'east') >= 1 && M.walkMeters('hb', 'hb') === 0 && M.walkMeters('hb', 'east') > M.walkMeters('hb', 'nursery') && M.walkMinutes('g:gz', 'g:ga') > M.walkMinutes('hb', 'east');
  o.M_gateEndpoints = M.walkMeters('g:gz', 'eng') > 0 && M.walkMeters('nope', 'eng') === 0;
  o.M_visual = QA('#cmSvg .cm-face').length === M.buildings.length && !!Q('#cmSvg .cm-roads.out') && !Q('#cmSvg .cm-ext') && !Q('#cmSvg .cm-grass') && !Q('#cmSvg .cm-t-out') && QA('#cmSvg [data-b] .cm-t').length === M.buildings.length;
  Q('.cm-tab[data-tab="route"]').click(); await sl(100);
  const rows = QA('.cm-stop-row'), legs = QA('.cm-leg-row');
  o.R_stops = rows.length === 3 && rows[0].textContent.indexOf('A') > -1;
  o.R_legsWarn = legs.length === 2 && /ما بتلحق|ضيّق/.test(legs[0].textContent) && /نفس المبنى/.test(legs[1].textContent);
  Q('[data-route-day]').click(); await sl(120);
  o.R_pathDrawn = !!Q('#cmSvg .cm-path') && QA('#cmSvg .cm-stop').length >= 2 && /إخفاء المسار/.test(Q('.cm-route-btn').textContent);
  Q('[data-route-day]').click(); await sl(100); o.R_pathHidden = !Q('#cmSvg .cm-path');
  const f = Q('select[data-dir="from"]'); f.value = 'g:gz'; f.dispatchEvent(new w.Event('change', { bubbles: true })); await sl(60);
  const t2 = Q('select[data-dir="to"]'); t2.value = 'lib'; t2.dispatchEvent(new w.Event('change', { bubbles: true })); await sl(100);
  o.D_result = /حوالي \d+ د/.test(Q('.cm-dir-res').textContent) && !!Q('#cmSvg .cm-path') && Q('select[data-dir="from"]').value === 'g:gz' && Q('select[data-dir="to"]').value === 'lib';
  Q('[data-dir-swap]').click(); await sl(100); o.D_swap = Q('select[data-dir="from"]').value === 'lib' && Q('select[data-dir="to"]').value === 'g:gz';
  M.state.dir.from = ''; M.state.dir.to = ''; M.select('eng', false); await sl(100); Q('[data-dir-to="eng"]').click(); await sl(100);
  o.D_fromInfoCard = M.state.tab === 'route' && Q('select[data-dir="to"]').value === 'eng' && /^g:/.test(Q('select[data-dir="from"]').value) && !!Q('#cmSvg .cm-path');
  Q('[data-layer="park"]').click(); await sl(80); o.L_parkOff = QA('#cmSvg .cm-park').length === 0 && Q('[data-layer="park"]').getAttribute('aria-pressed') === 'false';
  Q('[data-layer="gates"]').click(); await sl(80); o.L_gatesOff = QA('#cmSvg .cm-gate').length === 0;
  Q('[data-layer="pins"]').click(); await sl(80); o.L_pinsOff = QA('#cmSvg .cm-pin').length === 0;
  ['park', 'gates', 'pins'].forEach(k => Q('[data-layer="' + k + '"]').click());
  await sl(80); o.L_backOn = QA('#cmSvg .cm-park').length > 0 && QA('#cmSvg .cm-gate').length > 0 && QA('#cmSvg .cm-pin').length > 0;
  o.Z_far = Q('#cmSvg').classList.contains('zfar'); Q('[data-z="in"]').click(); Q('[data-z="in"]').click(); Q('[data-z="in"]').click(); o.Z_near = !Q('#cmSvg').classList.contains('zfar');
  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
