/* خريطة الجامعة: ربط القاعات بالمباني، الدبابيس، الإسناد اليدوي، البحث والاختيار */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const tt = {
    'Sun-09:30': { name: 'تفاضل', room: 'ح.ب 104', end: '10:30' },
    'Mon-08:30': { name: 'لغة عربية', room: 'م.غ 203', end: '10:00' },
    'Mon-11:30': { name: 'كيمياء', room: 'م.ش 105', end: '13:00' },
    'Sun-18:30': { name: 'مهارات', room: 'عن بعد', end: '19:30' },
    'Tue-10:30': { name: 'فيزياء', room: 'ابن سينا', end: '11:30' },
    'Wed-10:30': { name: 'مادة غامضة', room: 'ق 55', end: '11:30' },
    'Thu-10:30': { name: 'حاسوب', room: '305', building: 'الهندسة', end: '11:30' },
    'Thu-12:30': { name: 'مكتبة', room: '', building: '', end: '' }
  };
  const { w, errs } = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify({ profile: { name: 'س' }, courses: [], tasks: [], exams: [], timetable: tt }) });
  await sl(2300);
  const d = w.document, Q = s => d.querySelector(s), QA = s => [...d.querySelectorAll(s)];
  const M = w.CampusMap;
  o.C_api = !!M && typeof w.renderCampus === 'function' && M.buildings.length > 30;
  const rs = (room, building) => { const r = M.resolve({ room, building: building || '' }); return r.remote ? 'remote' : (r.b ? r.b.id + ':' + r.fl : null); };
  o.R_abbr = rs('ح.ب 104') === 'hb:1' && rs('م.غ 203') === 'west:2' && rs('م.ش 105') === 'east:1' && rs('ح . ب 310') === 'hb:3';
  o.R_arabicDigitsAndSpacing = rs('م.غ203') === 'west:2' && rs('ح.ب ١٠٤') === 'hb:1';
  o.R_labAndName = rs('ابن سينا') === 'eng:1' && rs('', 'المكتبة') === 'lib:0' && rs('305', 'الهندسة') === 'eng:3' && rs('', 'كلية الصيدلة') === 'pharm:0';
  o.R_remoteAndUnknown = rs('عن بعد') === 'remote' && rs('ق 55') === null && rs('') === null;
  /* التبويب: يظهر بالقائمة ويرسم الخريطة */
  o.N_navItem = !!Q('#campusRoot');
  w.switchTab('campus'); await sl(300);
  o.V_rendered = !!Q('#cmSvg') && QA('#cmSvg [data-b]').length === M.buildings.length && w.FocusUI.view() === 'campus';
  const pins = QA('#cmSvg .cm-pin');
  o.V_pins = pins.length === 4;
  const pinIds = pins.map(p => p.getAttribute('data-pin')).sort().join();
  o.V_pinBuildings = pinIds === 'east,eng,hb,west';
  /* عدد دبوس المبنى = عدد المواد فيه */
  const engPin = QA('#cmSvg .cm-pin').find(p => p.getAttribute('data-pin') === 'eng');
  o.V_pinCount = !!engPin && engPin.querySelector('text').textContent === '2';
  /* المواد بلا موقع تظهر بقائمة اختيار؛ والعن بعد بشارة */
  const assignSel = Q('select.cm-assign');
  o.U_unknownHasSelect = !!assignSel && assignSel.getAttribute('data-assign') === 'مادة غامضة' && /💻 عن بعد/.test(Q('.cm-panel').textContent);
  /* الإسناد اليدوي: يكتب حقل building بكل محاضرات المادة ويحدّث الدبابيس */
  assignSel.value = 'lib'; assignSel.dispatchEvent(new w.Event('change', { bubbles: true })); await sl(150);
  o.U_assigned = w.space.timetable['Wed-10:30'].building === 'المكتبة' && !QA('select.cm-assign').some(s => s.getAttribute('data-assign') === 'مادة غامضة') && QA('#cmSvg .cm-pin').some(p => p.getAttribute('data-pin') === 'lib');
  o.U_selectedAfter = M.state.sel === 'lib' && !!Q('.cm-info') && /المكتبة/.test(Q('.cm-info').textContent);
  /* اختيار مبنى بالنقر: بطاقة معلومات + أقرب بوابة + موادي هنا */
  Q('#cmSvg [data-b="hb"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true })); await sl(400);
  o.S_infoCard = M.state.sel === 'hb' && /الحسين الباني/.test(Q('.cm-info').textContent) && /أقرب بوابة/.test(Q('.cm-info').textContent) && /تفاضل/.test(Q('.cm-info').textContent) && !!Q('#cmSvg .cm-route');
  Q('.cm-x').click(); await sl(80);
  o.S_cleared = M.state.sel === null && !Q('.cm-info') && !Q('#cmSvg .cm-route');
  /* البحث: يميّز النتائج ويعتّم الباقي، ويحوّل لقائمة المباني */
  const qi = Q('#cmQ'); qi.value = 'مكتبه'; qi.dispatchEvent(new w.Event('input', { bubbles: true })); await sl(150);
  o.F_searchHits = QA('#cmSvg .cm-b.hit').length === 1 && QA('#cmSvg .cm-b.dim').length === M.buildings.length - 1;
  Q('#cmQ').value = 'ابن سينا'; Q('#cmQ').dispatchEvent(new w.Event('input', { bubbles: true })); await sl(150);
  o.F_labSearch = QA('#cmSvg .cm-b.hit').map(b => b.getAttribute('data-b')).join() === 'eng';
  Q('#cmQ').value = ''; Q('#cmQ').dispatchEvent(new w.Event('input', { bubbles: true })); await sl(100);
  /* تصفية الكلية من الدليل */
  Q('.cm-tab[data-tab="legend"]').click(); await sl(60);
  Q('.cm-leg[data-fac="eng"]').click(); await sl(60);
  o.F_facFilter = QA('#cmSvg .cm-b:not(.dim)').every(b => ['eng', 'annex'].indexOf(b.getAttribute('data-b')) > -1);
  Q('.cm-leg[data-fac="eng"]').click(); await sl(60);
  o.F_facClear = QA('#cmSvg .cm-b.dim').length === 0;
  /* تكبير */
  const w0 = M.state.vb.w; Q('[data-z="in"]').click(); o.Z_zoomIn = M.state.vb.w < w0;
  Q('[data-z="reset"]').click(); await sl(500); o.Z_reset = Math.abs(M.state.vb.w - 740) < 2;
  /* حماية: اسم مادة فيه علامات اقتباس */
  w.space.timetable['Fri-09:30'] = { name: 'مادة "x" <b>', room: 'ق 1', end: '10:30' }; M.state.tab = 'mine'; w.renderCampus(); await sl(50);
  o.X_escaped = !Q('.cm-panel b[x]') && QA('select.cm-assign').some(s => s.getAttribute('data-assign') === 'مادة "x" <b>');
  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
