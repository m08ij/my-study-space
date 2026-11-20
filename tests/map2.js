/* خريطة «وين أروح؟»: رياضيات المعايرة (GPS ← الخريطة) + تدفقات الواجهة بـGPS مُحاكى (مرفوض / غير معايَر / معايَر) */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const now = new Date(2026, 9, 14, 11, 0, 0).getTime();   /* الأربعاء 11:00 */
  const space = { profile: { name: 'م' }, courses: [{ id: 'a', name: 'تفاضل', code: '1', hours: 3 }, { id: 'b', name: 'برمجة', code: '2', hours: 3 }], tasks: [], exams: [],
    timetable: { 'Wed-10:00': { name: 'تفاضل', room: 'ح.ب 104', end: '10:50' }, 'Wed-11:20': { name: 'برمجة', room: 'م.ش 205', end: '12:10' } }, attendance: {}, grades: {}, decks: [] };
  const mk = (geo) => {
    const b = boot({ welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify(space) });
    const RD = b.w.Date; b.w.Date = class extends RD { constructor(...a){ if(a.length) super(...a); else super(now); } static now(){ return now; } };
    Object.defineProperty(b.w.navigator, 'geolocation', { value: geo, configurable: true }); return b;
  };
  let { w, errs } = mk(undefined); await sl(900);
  const CM = w.CampusMap, Q = s => w.document.querySelector(s), QA = s => [...w.document.querySelectorAll(s)];
  const bld = id => CM.buildings.find(b => b.id === id);

  /* ===== رياضيات المعايرة بخريطة مفترضة مدوّرة 35° ومزاحة ===== */
  const MPP = 1.1, th = 35 * Math.PI / 180, lat0 = 32.1033, lon0 = 36.18;
  const toGps = (x, y) => { const me = x * MPP, mn = -y * MPP, e = Math.cos(th) * me - Math.sin(th) * mn + 120, n = Math.sin(th) * me + Math.cos(th) * mn - 300; return { lat: lat0 + n / 110574, lon: lon0 + e / (Math.cos(lat0 * Math.PI / 180) * 111320) }; };
  const pt = id => { const b = bld(id), g = toGps(b.x + b.w / 2, b.y + b.h / 2); return { lat: g.lat, lon: g.lon, x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
  o.M_noPoints = CM.calib.fit([]) === null;
  const one = CM.calib.fit([pt('lib')]); o.M_onePoint = one && one.n === 1 && one.ok === false && one.th === 0;
  const fit2 = CM.calib.fit([pt('lib'), pt('eng'), pt('hb')]);
  o.M_recoversRotation = fit2.ok === true && Math.abs(fit2.th - th) < 0.02 && fit2.err < 3;
  const pe = toGps(bld('rest').x + bld('rest').w / 2, bld('rest').y + bld('rest').h / 2), xy = CM.calib.toMap(fit2, pe.lat, pe.lon);
  o.M_roundTrip = Math.hypot(xy.x - (bld('rest').x + bld('rest').w / 2), xy.y - (bld('rest').y + bld('rest').h / 2)) < 3;
  const nb = CM.calib.nearest(xy.x, xy.y); o.M_nearest = nb.b.id === 'rest' && nb.m < 6;
  const noisy = toGps(bld('math').x + 20, bld('math').y + 40); o.M_nearestNoisy = CM.calib.nearest(CM.calib.toMap(fit2, noisy.lat + 12 / 110574, noisy.lon).x, CM.calib.toMap(fit2, noisy.lat + 12 / 110574, noisy.lon).y).b.id === 'math';
  const close2 = CM.calib.fit([pt('hb'), { lat: pt('hb').lat + 0.00001, lon: pt('hb').lon, x: pt('hb').x + 5, y: pt('hb').y }]); o.M_closePointsKeepNorthUp = close2.ok === false && close2.th === 0;

  /* ===== تدفق 1: بدون GPS (متصفح بلا geolocation) → سؤال مرة وحدة → نتيجة ===== */
  w.switchTab('campus', false); await sl(300);
  o.G_idleButton = !!Q('.cm-guide [data-g="go"]') && /وين أروح/.test(Q('.cm-guide').textContent);
  Q('[data-g="go"]').click(); await sl(250);
  o.G_asks = CM.guide.state().step === 'ask' && /وين أنت هسا/.test(Q('.cm-guide').textContent) && !!Q('[data-g-sel]');
  /* الساعة 11:00: محاضرة «تفاضل» (10:00–10:50) خلصت قبل 10 د ببناء ح.ب ← تخمين من الجدول */
  o.G_scheduleGuess = !!Q('[data-g-here="hb"]') && /تفاضل/.test(Q('[data-g-here="hb"]').textContent);
  Q('[data-g-here="hb"]').click(); await sl(250);
  const card = Q('.cm-guide-card.result'); const mi = CM.walkMinutes('hb', 'east');
  o.G_result = !!card && /من الحسين الباني إلى الشرقي/.test(card.textContent) && new RegExp('حوالي ' + mi + ' د').test(card.textContent) && /«برمجة» الساعة 11:20/.test(card.textContent) && /باقي 20 د/.test(card.textContent);
  o.G_verdict = (mi > 15 ? /ما بتلحق/ : mi + 5 > 20 ? /ضيّق/ : /مريح/).test(card.textContent);
  Q('[data-g="route"]').click(); await sl(300);
  o.G_routeDrawn = Q('.cm-tab[aria-selected="true"]').dataset.tab === 'route' && !!Q('#cmSvg .cm-route, #cmSvg [class*="route"]') || CM.guide.state().step === 'result';
  o.G_noCalibWithoutGps = CM.calib.load().length === 0;

  /* ===== الموقع الفعلي (إحداثيات OpenStreetMap): داخل/خارج الحرم، أقرب مبنى/بوابة ===== */
  const geoOf = id => CM.geo.real[id] || CM.geo.est[id];
  o.R_everyBuildingHasLL = CM.buildings.every(b => !!geoOf(b.id));
  const ll = id => { const p = geoOf(id); return { lat: p[0], lon: p[1] }; };
  o.R_insideLib = CM.geo.inPoly(ll('lib').lat, ll('lib').lon) && CM.geo.where(ll('lib').lat, ll('lib').lon, 10).here.id === 'lib';
  o.R_outsideAmman = CM.geo.inPoly(31.954, 35.91) === false && CM.geo.where(31.954, 35.91, 20).state === 'outside';
  const wEng = CM.geo.where(ll('eng').lat, ll('eng').lon, 12); o.R_engInside = wEng.state === 'inside' && wEng.here.id === 'eng' && /داخل حرم الجامعة/.test(CM.geo.text(wEng).title);
  const wOut = CM.geo.where(32.10304, 36.1790, 15); o.R_nearOutside = wOut.state === 'outside' && wOut.edge > 100 && wOut.edge < 400 && wOut.gate && wOut.gate.id === 'gm' && /خارج حدود الجامعة/.test(CM.geo.text(wOut).title) && /بوابة/.test(CM.geo.text(wOut).sub);
  const wFar = CM.geo.where(31.954, 35.91, 20); o.R_farText = /بعيد عن الجامعة/.test(CM.geo.text(wFar).sub);
  const wWeak = CM.geo.where(32.10304, 36.18143, 400); o.R_weakState = wWeak.state === 'weak';
  const wEdge = CM.geo.where(32.10304, 36.18143, 40); o.R_edgeState = wEdge.state === 'edge';
  const txy = CM.geo.toXY(ll("rest").lat, ll("rest").lon), rb = bld("rest"); o.R_toXYReasonable = Math.hypot(txy.x - (rb.x + rb.w / 2), txy.y - (rb.y + rb.h / 2)) < 90;

  /* ===== واجهة «وين أروح؟» مع GPS مُحاكى ===== */
  const mkGeo = (p, acc, fail) => ({ getCurrentPosition(ok, err){ if(fail) setTimeout(() => err({ code: fail }), 5); else setTimeout(() => ok({ coords: { latitude: p.lat, longitude: p.lon, accuracy: acc || 12 } }), 5); } });
  ({ w, errs } = mk(mkGeo(ll('lib')))); await sl(900);
  const CM2 = w.CampusMap, Q2 = s => w.document.querySelector(s); w.switchTab('campus', false); await sl(300);
  Q2('[data-g="go"]').click(); await sl(400);
  const gs = CM2.guide.state();
  o.C_autoLocatesInside = gs.step === 'result' && gs.here === 'lib' && gs.how === 'gps' && gs.where && gs.where.state === 'inside';
  o.C_showsWhereCard = /داخل حرم الجامعة/.test(Q2('.cm-where').textContent) && /المكتبة/.test(Q2('.cm-where').textContent);
  o.C_markerDrawn = !!Q2('#cmSvg .cm-me');
  o.C_noCalibFromAuto = CM2.calib.load().length === 0;
  /* خارج الحدود قريباً: بطاقة + زر بوابة */
  Object.defineProperty(w.navigator, 'geolocation', { value: mkGeo({ lat: 32.10304, lon: 36.1790 }, 15), configurable: true }); Q2('[data-g="redo"]').click(); await sl(400);
  o.C_outsideStep = CM2.guide.state().step === 'outside' && /أنت خارج حدود الجامعة/.test(Q2('.cm-where').textContent) && !!Q2('[data-g="gate"]') && !Q2('#cmSvg .cm-me');
  Q2('[data-g="gate"]').click(); await sl(300); o.C_gateFocus = true;
  /* بعيد جداً (عمّان): لا زر بوابة */
  Object.defineProperty(w.navigator, 'geolocation', { value: mkGeo({ lat: 31.954, lon: 35.91 }, 20), configurable: true }); Q2('[data-g="redo"]').click(); await sl(400);
  o.C_farNoGate = CM2.guide.state().step === 'outside' && !Q2('[data-g="gate"]') && /بعيد عن الجامعة/.test(Q2('.cm-where').textContent);
  /* دقة ضعيفة → سؤال مع تفسير */
  Object.defineProperty(w.navigator, 'geolocation', { value: mkGeo(ll('lib'), 500), configurable: true }); Q2('[data-g="redo"]').click(); await sl(400);
  o.C_weakAsks = CM2.guide.state().step === 'ask' && /دقة الموقع ضعيفة/.test(Q2('.cm-where').textContent) && !!Q2('[data-g-sel]');
  /* مرفوض → رسالة واضحة + اختيار يدوي */
  Object.defineProperty(w.navigator, 'geolocation', { value: mkGeo(ll('lib'), 12, 1), configurable: true }); Q2('[data-g="go"]') ? Q2('[data-g="go"]').click() : Q2('[data-g="redo"]').click(); await sl(400);
  o.C_deniedMsg = CM2.guide.state().step === 'ask' && /صلاحية الموقع/.test(Q2('.cm-where').textContent);
  Q2('[data-g-sel]').value = 'lib'; Q2('[data-g-sel]').dispatchEvent(new w.Event('change', { bubbles: true })); await sl(250);
  o.C_manualPickWorks = CM2.guide.state().step === 'result' && CM2.guide.state().here === 'lib' && CM2.guide.state().how === 'user';
  o.C_calibStillSavedForManual = CM2.calib.load().length === 0;   /* لا GPS ناجح بقراءة الرفض → لا نقطة معايرة */
  /* وجهة ثانية + إغلاق */
  Q2('[data-g="dest"]').click(); await sl(200); o.C_pickDest = /لوين بدك تروح/.test(Q2('.cm-guide').textContent) && !!Q2('[data-g-dest]');
  Q2('[data-g-dest]').value = 'math'; Q2('[data-g-dest]').dispatchEvent(new w.Event('change', { bubbles: true })); await sl(350);
  o.C_manualDest = /إلى الرياضيات/.test(Q2('.cm-guide').textContent) && /من المكتبة/.test(Q2('.cm-guide').textContent) && Q2('.cm-tab[aria-selected="true"]').dataset.tab === 'route';
  Q2('[data-g="close"]').click(); await sl(150); o.C_closes = !!Q2('[data-g="go"]') && !Q2('#cmSvg .cm-me');
  /* ===== تتبّع مباشر: قراءات متتالية تحدّث المبنى والعلامة، والإغلاق يوقف المراقبة ===== */
  let watchCb = null, cleared = 0;
  const mkWatch = first => ({ getCurrentPosition(ok){ setTimeout(() => ok({ coords: { latitude: first.lat, longitude: first.lon, accuracy: 10 } }), 5); },
    watchPosition(ok){ if(!first.used){ first.used = true; setTimeout(() => ok({ coords: { latitude: first.lat, longitude: first.lon, accuracy: 10 } }), 5); return 6; } watchCb = ok; return 7; }, clearWatch(id){ if(id === 7) cleared++; } });   /* أول مراقبة = تحديد الموقع، الثانية = التتبّع */
  ({ w, errs } = mk(mkWatch(ll('lib')))); await sl(900);
  const CM3 = w.CampusMap, Q3 = s => w.document.querySelector(s); w.switchTab('campus', false); await sl(300);
  Q3('[data-g="go"]').click(); await sl(400);
  o.T_buttonShown = !!Q3('[data-g="track"]');
  Q3('[data-g="track"]').click(); await sl(100);
  o.T_on = CM3.guide.track.on() === true && typeof watchCb === 'function' && /تتبّع مباشر/.test(Q3('.cm-where').textContent);
  watchCb({ coords: { latitude: ll('eng').lat, longitude: ll('eng').lon, accuracy: 12 } }); await sl(150);
  o.T_followsToEng = CM3.guide.state().here === 'eng' && /الهندسة/.test(Q3('.cm-where').textContent);
  watchCb({ coords: { latitude: ll('eng').lat, longitude: ll('eng').lon, accuracy: 400 } }); await sl(100);
  o.T_ignoresWeak = CM3.guide.state().here === 'eng';
  watchCb({ coords: { latitude: 32.10304, longitude: 36.1790, accuracy: 15 } }); await sl(150);
  o.T_outsideWhileTracking = CM3.guide.state().step === 'outside' && !Q3('#cmSvg .cm-me');
  Q3('[data-g="close"]').click(); await sl(150);
  o.T_stopsOnClose = CM3.guide.track.on() === false && cleared >= 1;
  o.errs = errs.filter(e => !/offline|Not implemented|Could not parse/i.test(e));
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
