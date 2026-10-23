/* ============================================================
   📚 dayplan.js — «خطتي اليوم»: شو بدك تدرس من كل مادة اليوم (تشيك ليست ذكية) + سلسلة أيام بإعفاء أسبوعي + مراجعة أسبوعية + تذكيرات صارمة
   - البنود الذكية تُحسب كل مرة من بياناتك: محاضرات اليوم بالجدول (+ موضوع الأسبوع من خطة المادة)، امتحانات خلال 7 أيام (+ أقسام اليوم
     من خطة المراجعة)، مهام المادة المتأخرة/اليوم/بكرة (تشييكها ينجز المهمة نفسها)، ومراجعة محاضرة أمس اللي ما انعملت.
   - ما بنكتب بـspace إلا بإجراء منك (تشييك/إضافة/تأجيل/إعدادات/مراجعة) — فتح التطبيق لحاله ما بيعمل تعديل ولا تعارض مزامنة بين جهازين.
   - المحفوظ (يتزامن مع السحابة): space.dayPlan = { v:1, since, cfg:{lite,strict,auto,morning},
       days:{ymd:{d:{مفتاح:مادة}, hid:[مفاتيح مخفية/مؤجلة], u:[{k,t,c,pp}], n, ok}}, rev:{بداية الأسبوع:{why,goal,at,done,exp}} }
   - اليوم «منجز» = كل مادة بخطة اليوم إلها بند منجز واحد على الأقل. السلسلة = أيام منجزة متتالية؛ يوم دراسة فائت بيكسرها إلا إذا غطّاه
     إعفاء الأسبوع (واحد لكل أسبوع يبدأ الأحد، بيتطبّق لحاله). يوم بلا محاضرات ولا امتحان قريب = راحة (ما بيكسر ولا بيزيد).
   - الدوال النقية (suggest/view/streak/weekSummary/expected) تُصدَّر لـNode للاختبار.
   ============================================================ */
(function(root, factory){
  var api = factory(root);
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root && root.document) root.DayPlan = api;
})(typeof window !== 'undefined' ? window : this, function(W){
  'use strict';
  var DE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DA = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function pad(n){ return ('0' + n).slice(-2); }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function toD(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDays(s, n){ var d = toD(s); d.setDate(d.getDate() + n); return ymd(d); }
  function diffDays(a, b){ return Math.round((toD(a) - toD(b)) / 864e5); }
  function toMin(t){ var m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? +m[1] * 60 + +m[2] : null; }
  function hm(m){ return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); }
  function atMin(day, m){ return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60, 0, 0); }
  function weekStart(s){ return addDays(s, -toD(s).getDay()); }
  function dayWord(n){ return n <= 0 ? 'اليوم' : n === 1 ? 'بكرة' : n === 2 ? 'بعد بكرة' : 'بعد ' + n + ' أيام'; }
  function nCourses(n){ return n === 1 ? 'مادة وحدة' : n === 2 ? 'مادتين' : n + (n <= 10 ? ' مواد' : ' مادة'); }
  function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }

  /* ==================== (1) منطق نقي ==================== */
  /* محاضرات الجدول من مفاتيح «Sun-10:00» (نفس قاعدة Schedule.entries: بلا نهاية = ساعة) */
  function entriesOf(sp){
    var tt = (sp && sp.timetable) || {}, out = [];
    Object.keys(tt).forEach(function(k){
      var i = k.indexOf('-'), c = tt[k]; if(i < 0 || !c || !c.name) return;
      var di = DE.indexOf(k.slice(0, i)), s = toMin(k.slice(i + 1)); if(di < 0 || s === null) return;
      var e = toMin(c.end); out.push({ dayIdx: di, start: s, end: e !== null && e > s ? e : s + 60, name: String(c.name) });
    });
    return out.sort(function(a, b){ return a.start - b.start; });
  }
  function skipSet(sp){ var o = {}; ((sp && sp.courses) || []).forEach(function(c){ if(c && c.name && c.completed === true) o[c.name] = 1; }); return o; }
  /* يوم دراسة «متوقّع» (للأيام اللي ما انفتحت فيها الخطة): فيه محاضرة بالجدول أو امتحان خلال 7 أيام */
  function expected(sp, date){
    var dow = toD(date).getDay(), sk = skipSet(sp);
    if(entriesOf(sp).some(function(e){ return e.dayIdx === dow && !sk[e.name]; })) return true;
    return ((sp && sp.exams) || []).some(function(x){ if(!x || !x.course || sk[x.course] || !/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) return false; var d = diffDays(x.date, date); return d >= 0 && d <= 7; });
  }
  var KIND_W = { exam: 0, task: 1, rev: 2, carry: 3, user: 4 };
  /* اقتراحات يوم معيّن: [{name, pri, why[], at, first, items:[{k,t,c,kind,task?,d?,late?}]}] مرتّبة بالأولوية.
     o: { date, now?, space, lite?, slots?:{مادة:'16:00'}, weekTopic?(مادة,date)->نص, examSections?(امتحان,date)->[نصوص] } */
  function suggest(o){
    var sp = o.space || {}, date = o.date, dow = toD(date).getDay(), tom = addDays(date, 1), map = {}, list = [], sk = skipSet(sp);
    var nowMin = o.now && ymd(o.now) === date ? o.now.getHours() * 60 + o.now.getMinutes() : null;
    function C(name){ if(!map[name]){ map[name] = { name: name, pri: 0, why: [], items: [], at: (o.slots && o.slots[name]) || null, first: 9999 }; list.push(map[name]); } return map[name]; }
    function why(c, w){ if(c.why.indexOf(w) < 0) c.why.push(w); }
    entriesOf(sp).forEach(function(e){
      if(e.dayIdx !== dow || sk[e.name]) return;
      var c = C(e.name); if(e.start < c.first) c.first = e.start;
      why(c, '📚 محاضرة ' + hm(e.start)); c.pri = Math.max(c.pri, 50);
      if(c.items.some(function(x){ return x.k === 'rev:' + e.name; })) return;
      var tp = o.weekTopic ? o.weekTopic(e.name, date) : null;
      c.items.push({ k: 'rev:' + e.name, t: 'راجع محاضرة اليوم' + (tp ? ': ' + tp : ''), c: e.name, kind: 'rev' });
    });
    (sp.exams || []).forEach(function(x){
      if(!x || !x.course || sk[x.course] || !/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) return;
      var d = diffDays(x.date, date), xt = toMin(x.time); if(d < 0 || d > 7) return;
      if(d === 0 && nowMin !== null && xt !== null && nowMin >= xt) return;   /* امتحان اليوم وخلص */
      var c = C(String(x.course)), id = String(x.id || x.name || x.date), nm = String(x.name || 'الامتحان'), secs = o.examSections ? o.examSections(x, date) : null;
      c.items.push({ k: 'exam:' + id, t: (d === 0 ? 'مراجعة أخيرة سريعة لـ«' : 'راجع لـ«') + nm + '»' + (secs && secs.length ? ': ' + secs.slice(0, 2).join('، ') : ''), c: c.name, kind: 'exam' });
      if(d === 1 || d === 2) c.items.push({ k: 'exam2:' + id, t: 'حلّ أسئلة سابقة/تدريب لـ«' + nm + '»', c: c.name, kind: 'exam' });
      c.why.unshift('🎯 ' + nm + ' ' + dayWord(d)); c.pri = Math.max(c.pri, (d <= 2 ? 100 : 90) - d);
    });
    (sp.tasks || []).forEach(function(t){
      if(!t || !t.course || t.id == null || !t.title || sk[t.course] || !/^\d{4}-\d{2}-\d{2}$/.test(t.due || '') || t.due > tom) return;
      if(t.done && t.completedAt !== date) return;
      var c = C(String(t.course)), late = !t.done && t.due < date;
      c.items.push({ k: 'task:' + t.id, t: String(t.title), c: c.name, kind: 'task', task: String(t.id), d: !!t.done, late: late });
      if(!t.done){ why(c, late ? '⚠️ مهمة متأخرة' : t.due === date ? '📌 تسليم اليوم' : '📌 تسليم بكرة'); c.pri = Math.max(c.pri, late ? 70 : t.due === date ? 60 : 45); }
    });
    list.forEach(function(c){ c.items.sort(function(a, b){ return KIND_W[a.kind] - KIND_W[b.kind]; }); c.items = c.items.slice(0, o.lite ? 1 : 4); });
    return list.sort(function(a, b){ return b.pri - a.pri || a.first - b.first; });
  }
  /* خطة يوم كاملة = الاقتراحات + حالة التشييك المحفوظة + بنودك + المؤجّل + مراجعة محاضرة أمس اللي ما انعملت
     o = خيارات suggest + { rec: سجل اليوم, prevRec: سجل أمس, since } */
  function view(o){
    var rec = o.rec || {}, dm = isObj(rec.d) ? rec.d : {}, hid = Array.isArray(rec.hid) ? rec.hid : [], y = addDays(o.date, -1), out = [], map = {};
    function C(name, base){ if(!map[name]){ map[name] = { name: name, pri: base ? base.pri : 0, why: base ? base.why : [], at: base ? base.at : null, items: [] }; out.push(map[name]); } return map[name]; }
    function has(name, k){ return !!map[name] && map[name].items.some(function(x){ return x.k === k; }); }
    suggest(o).forEach(function(sc){ var c = C(sc.name, sc); sc.items.forEach(function(it){ if(hid.indexOf(it.k) > -1) return; if(it.kind !== 'task') it.d = !!dm[it.k]; c.items.push(it); }); });
    /* من أمس (بس بعد ما تبدأ تستعمل الخطة، ومش بالخطة الأخف): مراجعة محاضرة ما انعملت لمادة ما إلها محاضرة اليوم + بنودك اللي ما خلصت */
    if(!o.lite && o.since && y >= o.since){
      var pr = o.prevRec || {}, pd = isObj(pr.d) ? pr.d : {}, ph = Array.isArray(pr.hid) ? pr.hid : [], ydow = toD(y).getDay(), seen = {}, sk = skipSet(o.space);
      entriesOf(o.space).forEach(function(e){
        if(e.dayIdx !== ydow || seen[e.name] || sk[e.name]) return; seen[e.name] = 1;
        var k0 = 'rev:' + e.name, k = k0 + '@' + y;
        if(pd[k0] || ph.indexOf(k0) > -1 || hid.indexOf(k) > -1 || has(e.name, k0)) return;
        C(e.name).items.push({ k: k, t: 'راجع محاضرة أمس (' + DA[ydow] + ')', c: e.name, kind: 'carry', d: !!dm[k] });
      });
      (Array.isArray(pr.u) ? pr.u : []).forEach(function(u){
        if(!u || !u.k || !u.c || !u.t || pd[u.k] || ph.indexOf(u.k) > -1) return;
        var k = u.k + '@' + y; if(hid.indexOf(k) > -1) return;
        C(String(u.c)).items.push({ k: k, t: String(u.t).replace(/ \(من أمس\)$/, '') + ' (من أمس)', c: String(u.c), kind: 'carry', d: !!dm[k] });
      });
    }
    (Array.isArray(rec.u) ? rec.u : []).forEach(function(u){ if(u && u.k && u.c && u.t && hid.indexOf(u.k) < 0) C(String(u.c)).items.push({ k: u.k, t: String(u.t), c: String(u.c), kind: 'user', d: !!dm[u.k], pp: !!u.pp }); });
    var res = out.filter(function(c){ return c.items.length; }), okN = 0, all = 0, allDone = 0;
    res.forEach(function(c){ c.n = c.items.length; c.done = c.items.filter(function(x){ return x.d; }).length; c.ok = c.done > 0; if(c.ok) okN++; all += c.n; allDone += c.done; });
    return { date: o.date, courses: res, n: res.length, okN: okN, ok: res.length > 0 && okN === res.length, items: all, doneItems: allDone, full: all > 0 && allDone === all };
  }
  /* السلسلة: o = { today, since, days, todayOk, expected(date)->bool } → { cur, best, hist:{date:'done'|'miss'|'freeze'|'rest'|'today'}, freezeWeek } */
  function streak(o){
    var out = { cur: 0, best: 0, hist: {}, freezeWeek: null }, dt = o.since, run = 0, best = 0, used = {}, guard = 0, days = o.days || {};
    if(!dt || !toD(dt)) return out;
    if(diffDays(o.today, dt) > 400) dt = addDays(o.today, -400);
    while(dt < o.today && guard++ < 420){
      var r = days[dt], st;
      if(isObj(r) && r.ok) st = 'done';
      else if(isObj(r) ? (r.n > 0) : o.expected(dt)) st = 'miss';
      else st = 'rest';
      if(st === 'miss'){ var wk = weekStart(dt); if(!used[wk]){ used[wk] = dt; st = 'freeze'; } }
      if(st === 'done'){ run++; if(run > best) best = run; } else if(st === 'miss') run = 0;
      out.hist[dt] = st; dt = addDays(dt, 1);
    }
    if(o.todayOk){ run++; if(run > best) best = run; out.hist[o.today] = 'done'; } else out.hist[o.today] = 'today';
    out.cur = run; out.best = best; out.freezeWeek = used[weekStart(o.today)] || null;
    return out;
  }
  /* ملخّص أسبوع (الأحد ← السبت) للمراجعة الأسبوعية */
  function weekSummary(o){
    var out = { days: [], exp: 0, done: 0, frz: 0, per: {}, focus: 0, tasks: 0, neglect: [] }, end = addDays(o.ws, 6), days = o.days || {}, log = o.log || {};
    for(var i = 0; i < 7; i++){
      var dt = addDays(o.ws, i), st = dt > o.today ? 'future' : (o.hist[dt] || 'rest');
      out.days.push({ date: dt, st: st });
      if(st === 'done'){ out.done++; out.exp++; } else if(st === 'miss') out.exp++; else if(st === 'freeze'){ out.frz++; out.exp++; }
      var r = days[dt]; if(isObj(r) && isObj(r.d)) Object.keys(r.d).forEach(function(k){ var c = r.d[k]; if(k.indexOf('task:') !== 0 && typeof c === 'string' && c) out.per[c] = (out.per[c] || 0) + 1; });
      out.focus += parseInt(log[dt], 10) || 0;
    }
    ((o.space && o.space.tasks) || []).forEach(function(t){ if(t && t.done && t.completedAt >= o.ws && t.completedAt <= end){ out.tasks++; if(t.course) out.per[t.course] = (out.per[t.course] || 0) + 1; } });
    var names = [], sk = skipSet(o.space); entriesOf(o.space).forEach(function(e){ if(names.indexOf(e.name) < 0 && !sk[e.name]) names.push(e.name); });
    out.neglect = names.filter(function(n){ return !out.per[n]; });
    return out;
  }
  var pure = { suggest: suggest, view: view, streak: streak, weekSummary: weekSummary, expected: expected, entriesOf: entriesOf, weekStart: weekStart, addDays: addDays };
  if(!W || !W.document) return pure;

  /* ==================== (2) وقت التشغيل ==================== */
  var d = W.document;
  function esc(s){ return W.esc ? W.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m, t, ms){ if(W.toast) W.toast(m, t, ms); }
  function lsGet(k){ try{ return W.localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ W.localStorage.setItem(k, v); }catch(e){} }
  function lsDel(k){ try{ W.localStorage.removeItem(k); }catch(e){} }
  function uidv(){ return W.uid ? W.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function P(){ var p = W.space && W.space.dayPlan; return isObj(p) ? p : null; }
  function days(){ var p = P(); return p && isObj(p.days) ? p.days : {}; }
  function cfg(){ var p = P(), c = (p && isObj(p.cfg)) ? p.cfg : {}; return { lite: c.lite === true, strict: c.strict !== false, auto: c.auto !== false, morning: /^\d{2}:\d{2}$/.test(c.morning || '') ? c.morning : '08:00' }; }
  /* إنشاء/إصلاح الحاوية — فقط عند إجراء من المستخدم */
  function store(){
    var s = W.space; if(!isObj(s)) return null;
    if(!isObj(s.dayPlan)) s.dayPlan = { v: 1 };
    var p = s.dayPlan; ['days', 'rev', 'cfg'].forEach(function(k){ if(!isObj(p[k])) p[k] = {}; });
    return p;
  }
  function touch(date){
    var p = store(); if(!p) return null;
    var r = p.days[date]; if(!isObj(r)) r = p.days[date] = {};
    if(!isObj(r.d)) r.d = {}; if(!Array.isArray(r.hid)) r.hid = []; if(!Array.isArray(r.u)) r.u = [];
    if(!p.since || p.since > date) p.since = date;
    var cut = addDays(date, -120); Object.keys(p.days).forEach(function(k){ if(k < cut) delete p.days[k]; });
    var rcut = addDays(date, -190); Object.keys(p.rev).forEach(function(k){ if(k < rcut) delete p.rev[k]; });
    return r;
  }
  function courseByName(n){ return ((W.space || {}).courses || []).filter(function(c){ return c && c.name === n; })[0] || null; }
  function weekTopic(name, date){
    var Sy = W.Syllabus, c = courseByName(name), start = (W.space || {}).semesterStart;
    if(!Sy || !Sy.weekNumber || !Sy.weekEntry || !c || !isObj(c.syllabus) || !start) return null;
    try{ var wk = Sy.weekNumber(start, toD(date)), e = wk ? Sy.weekEntry(c.syllabus, wk) : null; return e && e.topics && e.topics[0] && e.topics[0].title ? String(e.topics[0].title).slice(0, 60) : null; }catch(e){ return null; }
  }
  function examSections(x, date){
    var Sy = W.Syllabus, c = courseByName(x.course); if(!Sy || !Sy.reviewPlan || !c || !isObj(c.syllabus)) return null;
    try{
      var rp = Sy.reviewPlan(c.syllabus, (W.space || {}).semesterStart, x.date, date), dd = (rp.days || []).filter(function(z){ return z.date === date; })[0];
      return dd ? dd.items.map(function(it){ return ((it.sec ? it.sec + ' ' : '') + it.title).slice(0, 50); }) : null;
    }catch(e){ return null; }
  }
  /* الوقت المقترح لكل مادة اليوم من «جدول المذاكرة المقترح» (daily.js) */
  function slots(){
    var out = {}; try{ var day = W.StudyPlan && W.StudyPlan.build().days[0]; ((day && !day.off && day.items) || []).forEach(function(it){ if(!out[it.course]) out[it.course] = it.start; }); }catch(e){}
    return out;
  }
  function viewFor(date, now){
    now = now || new Date(); date = date || ymd(now);
    var p = P(), dd = days();
    return view({ date: date, now: now, space: W.space || {}, lite: cfg().lite, since: p && p.since, rec: dd[date], prevRec: dd[addDays(date, -1)],
      slots: date === ymd(now) ? slots() : null, weekTopic: weekTopic, examSections: examSections });
  }
  function streakInfo(now, v){
    var p = P(), t = ymd(now), sp = W.space || {};
    v = v || viewFor(t, now);
    return streak({ today: t, since: p && p.since, days: days(), todayOk: v.ok, expected: function(dt){ return expected(sp, dt); } });
  }
  function findItem(v, k){ var hit = null; v.courses.forEach(function(c){ c.items.forEach(function(x){ if(x.k === k) hit = x; }); }); return hit; }
  function courseOf(v, n){ return v.courses.filter(function(c){ return c.name === n; })[0] || null; }
  /* يسجّل حالة اليوم بالسجل (n = أكبر عدد مواد شافه اليوم: تأجيل كل شي ما بيحوّل يوم الدراسة لراحة) */
  function stamp(date, now, before){
    var v = viewFor(date, now), r = touch(date); if(!r) return v;
    r.n = Math.max(+r.n || 0, before ? before.n : 0, v.n);
    r.ok = (v.n ? v.ok : (r.n > 0 && Object.keys(r.d).length > 0)) ? 1 : 0;
    return v;
  }
  function save(){ if(W.saveSpace) W.saveSpace(); refresh(); }
  function refresh(){ try{ if(W.renderMyDay) W.renderMyDay(); }catch(e){} draw(); }
  function reviewDue(now){
    var p = P(), t = ymd(now), dow = now.getDay();
    if(!p || !p.since || p.since > addDays(t, -2)) return false;
    if(!((dow === 4 && now.getHours() >= 18) || dow === 5 || dow === 6)) return false;
    return !(isObj(p.rev) && p.rev[weekStart(t)]);
  }

  /* ---------- الإجراءات ---------- */
  function toggle(k){
    var now = new Date(), t = ymd(now), v = viewFor(t, now), it = findItem(v, k); if(!it) return false;
    var c0 = courseOf(v, it.c), wasCourse = c0 && c0.ok, wasOk = v.ok;
    if(it.kind === 'task' && W.toggleTask) W.toggleTask(it.task);
    var r = touch(t); if(!r) return false;
    if(it.d) delete r.d[k]; else r.d[k] = it.c;
    var v2 = stamp(t, now, v); save();
    if(!it.d){
      var c2 = courseOf(v2, it.c), left = v2.courses.filter(function(c){ return !c.ok; });
      if(!wasOk && v2.ok){ if(W.celebrate) W.celebrate(2); toast('✅ يومك منجز! 🔥 السلسلة: ' + streakInfo(now, v2).cur + (v2.full ? ' — وخلصت كل البنود 🏆' : ''), 'success', 4500); }
      else if(!wasCourse && c2 && c2.ok && left.length) toast('👏 «' + it.c + '» خلصت لليوم — باقي ' + nCourses(left.length) + ': ' + left.map(function(c){ return c.name; }).slice(0, 3).join('، '), 'success', 3000);
    }
    return true;
  }
  function addItem(course, text){
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80); course = String(course || '').trim();
    if(!text || !course) return false;
    var now = new Date(), t = ymd(now), v = viewFor(t, now), r = touch(t); if(!r) return false;
    r.u.push({ k: 'u:' + uidv(), t: text, c: course }); stamp(t, now, v); save(); return true;
  }
  function delItem(k){
    var now = new Date(), t = ymd(now), v = viewFor(t, now), r = touch(t); if(!r) return false;
    var n = r.u.length; r.u = r.u.filter(function(u){ return u && u.k !== k; }); delete r.d[k];
    if(r.u.length === n) return false;
    stamp(t, now, v); save(); return true;
  }
  function later(k){
    var now = new Date(), t = ymd(now), v = viewFor(t, now), it = findItem(v, k); if(!it || it.kind === 'task') return false;
    var r = touch(t); if(r.hid.indexOf(k) < 0) r.hid.push(k); delete r.d[k];
    var rt = touch(addDays(t, 1)); rt.u.push({ k: 'u:' + uidv(), t: String(it.t).replace(/ \(من أمس\)$/, ''), c: it.c, pp: 1 });
    stamp(t, now, v); save(); toast('⏭ تأجّل لبكرة: «' + it.t + '»', 'info', 2500); return true;
  }
  function setCfg(key, val){ var p = store(); if(!p) return; p.cfg[key] = val; if(W.saveSpace) W.saveSpace(); refresh(); }
  function startFocus(k, c){
    lsSet('ss_dp_focus', JSON.stringify({ d: ymd(new Date()), k: k, c: c }));
    if(sheet && !sheet.closed) sheet.close();
    if(W.Progress && W.Progress.focusCourse) W.Progress.focusCourse(c); else if(W.switchTab) W.switchTab('timer');
  }
  /* جلسة تركيز كاملة: تسكّر البند اللي ضغطت ▶ عليه، أو أول بند مفتوح للمادة المختارة بالمؤقت */
  d.addEventListener('ss:focus-complete', function(){
    try{
      var now = new Date(), t = ymd(now), v = viewFor(t, now), pend = null, it = null;
      try{ pend = JSON.parse(lsGet('ss_dp_focus') || 'null'); }catch(e){}
      var sel = d.getElementById('timerTask'), val = sel ? String(sel.value || '') : '', cn = val.indexOf('course:') === 0 ? val.slice(7) : null;
      if(pend && pend.d === t && (!cn || cn === pend.c)) it = findItem(v, pend.k);
      if(!it && cn){ var c = courseOf(v, cn); if(c) it = c.items.filter(function(x){ return !x.d && x.kind !== 'task'; })[0] || null; }
      lsDel('ss_dp_focus');
      if(it && !it.d && it.kind !== 'task'){ toggle(it.k); toast('✓ «' + it.t + '» — سجّلتها من جلسة التركيز', 'success', 3500); }
    }catch(e){ console.warn('dayplan focus', e); }
  });

  /* ---------- الواجهة ---------- */
  var ST_LBL = { done: 'منجز', miss: 'فائت', freeze: 'إعفاء', rest: 'راحة', today: 'اليوم', future: 'جاي', none: '—' };
  function streakChip(sx){ return '<span class="dp-streak' + (sx.cur ? '' : ' zero') + '" title="أيام منجزة متتالية · أفضل: ' + sx.best + '">' + (sx.cur ? '🔥 ' : '💤 ') + sx.cur + '</span>'; }
  function empty(ic, title, hint, extra){ return '<div class="md-empty-state"><span class="md-empty-ic" aria-hidden="true">' + ic + '</span><b>' + title + '</b>' + (hint ? '<small>' + hint + '</small>' : '') + (extra || '') + '</div>'; }
  function summary(v, sx, now){
    var pct = v.n ? Math.round(v.okN / v.n * 100) : 0, left = v.courses.filter(function(c){ return !c.ok; }), late = !v.ok && now.getHours() >= 20, txt;
    if(v.ok && v.full) txt = '<b>🏆 يوم كامل!</b><small>خلصت كل بنود اليوم</small>';
    else if(v.ok) txt = '<b>✅ يومك منجز</b><small>كل مادة إلها بند — والباقي (' + (v.items - v.doneItems) + ') بونص</small>';
    else if(!v.doneItems) txt = '<b>' + (late ? '⏰ لسا ما بدأت — ' : '') + 'ابدأ بأول بند</b><small>' + nCourses(v.n) + ' اليوم · بند واحد من كل مادة وبيتسجّل يومك ✅</small>';
    else txt = '<b>' + (late ? '⏰ ' : '') + 'باقي ' + nCourses(left.length) + '</b><small>' + esc(left.map(function(c){ return c.name; }).slice(0, 3).join('، ')) + '</small>';
    var fz = sx.freezeWeek ? '❄️ استُعمل إعفاء هالأسبوع' : '❄️ إعفاء الأسبوع متاح';
    return '<div class="dp-sum"><div class="dp-ring" style="--p:' + pct + '" role="img" aria-label="' + v.okN + ' من ' + v.n + ' مواد"><b><bdi dir="ltr">' + v.okN + '/' + v.n + '</bdi></b></div>' +
      '<div class="dp-sum-t">' + txt + '<span class="dp-fz">' + fz + (sx.best > 1 ? ' · أفضل سلسلة ' + sx.best : '') + '</span></div></div>';
  }
  function itemHtml(it, full){
    var ic = it.kind === 'task' ? '📌 ' : it.kind === 'exam' ? '🎯 ' : it.kind === 'carry' ? '↩ ' : it.pp ? '⏭ ' : '';
    return '<div class="dp-item' + (it.d ? ' done' : '') + (it.late ? ' late' : '') + '">' +
      '<button type="button" class="md-check" role="checkbox" aria-checked="' + (it.d ? 'true' : 'false') + '" data-dp="tog" data-k="' + esc(it.k) + '" aria-label="' + esc((it.d ? 'إلغاء إنجاز: ' : 'إنجاز: ') + it.t) + '"></button>' +
      '<span class="dp-t">' + ic + esc(it.t) + '</span>' +
      (it.d ? '' : '<button type="button" class="dp-ic" data-dp="focus" data-k="' + esc(it.k) + '" data-c="' + esc(it.c) + '" aria-label="ابدأ جلسة تركيز: ' + esc(it.t) + '" title="ابدأ جلسة تركيز">▶</button>') +
      (full && !it.d && it.kind !== 'task' ? '<button type="button" class="dp-ic" data-dp="later" data-k="' + esc(it.k) + '" aria-label="أجّل لبكرة: ' + esc(it.t) + '" title="أجّل لبكرة">⏭</button>' : '') +
      (full && it.kind === 'user' ? '<button type="button" class="dp-ic" data-dp="del" data-k="' + esc(it.k) + '" aria-label="حذف: ' + esc(it.t) + '" title="حذف">✕</button>' : '') + '</div>';
  }
  var QUICK = ['حلّ تمارين', 'لخّص المحاضرة', 'اقرأ الفصل', 'حضّر للمحاضرة الجاية'];
  function courseHtml(c, max, full){
    var hue = W.courseHue ? W.courseHue(c.name) : 210, items = full ? c.items : c.items.slice(0, max), meta = c.why.slice(0, 2).join(' · ');
    return '<div class="dp-course' + (c.ok ? ' ok' : '') + '" style="--h:' + (+hue || 0) + '">' +
      '<div class="dp-ch"><b>' + esc(c.name) + '</b><span class="dp-cp' + (c.ok ? ' ok' : '') + '"><bdi dir="ltr">' + c.done + '/' + c.n + '</bdi></span>' +
      (meta || c.at ? '<small>' + esc(meta) + (c.at ? (meta ? ' · ' : '') + '⏰ مقترح <bdi dir="ltr">' + esc(c.at) + '</bdi>' : '') + '</small>' : '') + '</div>' +
      '<div class="dp-items">' + items.map(function(it){ return itemHtml(it, full); }).join('') +
      (c.items.length > items.length ? '<button type="button" class="dp-more" data-dp="open">+' + (c.items.length - items.length) + ' بنود</button>' : '') + '</div>' +
      (full ? '<form class="dp-add" data-dpc="' + esc(c.name) + '"><input type="text" maxlength="80" enterkeyhint="done" autocomplete="off" placeholder="أضف بند…" aria-label="أضف بند لـ' + esc(c.name) + '"><button type="submit" class="btn btn-sm" aria-label="إضافة">＋</button></form>' +
        '<div class="dp-chips">' + QUICK.map(function(q){ return '<button type="button" class="dp-chip" data-dp="quick" data-c="' + esc(c.name) + '" data-t="' + esc(q) + '">＋ ' + esc(q) + '</button>'; }).join('') + '</div>' : '') + '</div>';
  }
  function reviewRow(){ return '<button type="button" class="dp-review-cta" data-dp="review"><span aria-hidden="true">📊</span><span><b>مراجعتك الأسبوعية جاهزة</b><small>دقيقتين: شو التزمت، شو قطعك، وهدف الأسبوع الجاي</small></span></button>'; }
  function histHtml(sx, t){
    var p = P(), since = p && p.since, h = '';
    for(var i = 13; i >= 0; i--){
      var dt = addDays(t, -i), st = (!since || dt < since) ? 'none' : (sx.hist[dt] || 'rest'), dd = toD(dt);
      h += '<i class="dp-dot s-' + st + '" title="' + DA[dd.getDay()] + ' ' + dd.getDate() + '/' + (dd.getMonth() + 1) + ': ' + ST_LBL[st] + '"></i>';
    }
    return '<div class="dp-hist" role="img" aria-label="آخر 14 يوم: ' + Object.keys(sx.hist).filter(function(k){ return sx.hist[k] === 'done'; }).length + ' منجز"><div class="dp-dots">' + h + '</div><small>🔥 السلسلة ' + sx.cur + ' · أفضل ' + sx.best + ' · 🟩 منجز 🟥 فائت 🟦 إعفاء ⬜ راحة</small></div>';
  }
  /* بطاقة «خطتي اليوم» بلوحة اليوم (تُركَّب بـrenderMyDay). تزامن صامت لحالة اليوم إذا كان في سجل أصلاً (مثلاً أنجزت مهمة من تبويب المهام) */
  function cardHtml(now){
    now = now || new Date();
    var sp = W.space || {}, t = ymd(now), v = viewFor(t, now), sx = streakInfo(now, v);
    var r = days()[t];
    if(isObj(r) && !W.bootSyncing && (!!r.ok !== v.ok || (+r.n || 0) < v.n)){ r.n = Math.max(+r.n || 0, v.n); r.ok = v.ok ? 1 : 0; if(W.saveSpace) setTimeout(function(){ W.saveSpace(); }, 0); }
    var late = v.n && !v.ok && now.getHours() >= 20;
    var head = '<div class="md-card-head"><h4>📚 خطتي اليوم</h4><div class="dp-head-r">' + streakChip(sx) + '<button type="button" class="md-link" data-dp="open">الخطة كاملة ←</button></div></div>', body;
    if(!v.n){
      body = !Object.keys(sp.timetable || {}).length && !(sp.courses || []).length
        ? empty('📅', 'خطتك اليومية بتطلع من جدولك', 'أضف محاضراتك (الزر بالبطاقة الزرقاء) وكل يوم بيطلع لك شو تدرس من كل مادة')
        : empty('🌴', 'ما في دراسة مطلوبة اليوم', 'ما عندك محاضرات ولا امتحان قريب — بدك تضيف بند لمادة؟', '<button type="button" class="btn btn-sm btn-ghost" data-dp="open">＋ أضف بند</button>');
    } else {
      body = summary(v, sx, now) + '<div class="dp-courses">' + v.courses.slice(0, 4).map(function(c){ return courseHtml(c, 3, false); }).join('') + '</div>' +
        (v.courses.length > 4 ? '<button type="button" class="md-more" data-dp="open">+' + (v.courses.length - 4) + ' مواد كمان</button>' : '');
    }
    return '<section class="md-card md-plan' + (late ? ' late' : '') + (v.ok ? ' ok' : '') + '" aria-label="خطتي اليوم">' + head + body + (reviewDue(now) ? reviewRow() : '') + '</section>';
  }
  function courseNames(sp){
    var names = [], sk = skipSet(sp);
    entriesOf(sp).forEach(function(e){ if(names.indexOf(e.name) < 0 && !sk[e.name]) names.push(e.name); });
    (sp.courses || []).forEach(function(c){ if(c && c.name && names.indexOf(c.name) < 0 && !sk[c.name]) names.push(c.name); });
    return names;
  }
  var sheet = null;
  function openSheet(){
    if(!W.HubUI || !W.HubUI.openSheet){ toast('تعذّر فتح الخطة', 'warn'); return null; }
    if(sheet && !sheet.closed && d.body.contains(sheet.el)){ draw(); return sheet; }
    sheet = W.HubUI.openSheet({ title: '📚 خطتي اليوم', onClose: function(){ sheet = null; } });
    sheet.panel.classList.add('dp-sheet');
    draw();
    return sheet;
  }
  function toggleRow(key, label, on){ return '<label class="dp-row"><span>' + label + '</span><input type="checkbox" data-dpset="' + key + '"' + (on ? ' checked' : '') + '></label>'; }
  function draw(){
    if(!sheet || sheet.closed || !d.body.contains(sheet.el)) return;
    var fa = d.activeElement, fk = fa && sheet.body.contains(fa) ? (fa.getAttribute('data-dp') || '') + '|' + (fa.getAttribute('data-k') || '') : '', fForm = fa && fa.closest ? fa.closest('form.dp-add') : null, fc = fForm ? fForm.getAttribute('data-dpc') : null;
    var now = new Date(), t = ymd(now), v = viewFor(t, now), sx = streakInfo(now, v), c = cfg(), sp = W.space || {}, dd = toD(t);
    var h = '<div class="dp-date">' + DA[dd.getDay()] + ' ' + dd.getDate() + '/' + (dd.getMonth() + 1) + (c.lite ? ' · <span class="dp-lite">خطة أخف</span>' : '') + '</div>' + summary(v, sx, now) + histHtml(sx, t);
    if(reviewDue(now)) h += reviewRow();
    h += v.n ? '<div class="dp-courses">' + v.courses.map(function(x){ return courseHtml(x, 99, true); }).join('') + '</div>'
      : '<div class="hub-empty">ما في بنود مقترحة اليوم (ما في محاضرات ولا امتحان قريب ولا مهام مستحقة). بدك تدرس إشي؟ اختار مادة تحت.</div>';
    var others = courseNames(sp).filter(function(n){ return !courseOf(v, n); });
    if(others.length) h += '<form class="dp-add dp-add-course" data-dpc=""><select aria-label="اختر مادة">' + others.map(function(n){ return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('') + '</select>' +
      '<input type="text" maxlength="80" autocomplete="off" placeholder="شو بدك تدرس منها؟" aria-label="البند"><button type="submit" class="btn btn-sm">＋ أضف لليوم</button></form>';
    var times = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '10:00', '11:00'];
    if(times.indexOf(c.morning) < 0) times.push(c.morning);
    h += '<details class="dp-set"><summary>⚙️ إعدادات الخطة</summary>' +
      toggleRow('lite', '🪶 خطة أخف: بند واحد لكل مادة (بدون ترحيل من أمس)', c.lite) +
      toggleRow('strict', '⏰ تذكيرات صارمة بالتطبيق: الصبح + 4 م + 8 م + 10 م لحد ما تخلص', c.strict) +
      toggleRow('auto', '📲 افتح الخطة لحالها أول ما أفتح التطبيق كل يوم', c.auto) +
      '<label class="dp-row"><span>☀️ إشعار خطة الصبح</span><select data-dpset="morning" aria-label="وقت إشعار الصبح">' + times.map(function(x){ return '<option value="' + x + '"' + (x === c.morning ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<div class="dp-set-acts"><button type="button" class="btn btn-sm btn-ghost" data-dp="review">📊 المراجعة الأسبوعية</button><button type="button" class="btn btn-sm btn-ghost" data-dp="notif">🔔 مركز التنبيهات</button></div></details>' +
      '<p class="dl-note">📎 البنود الذكية من جدولك وامتحاناتك ومهامك وخطة المادة. ▶ بتبدأ جلسة تركيز وبتسكّر البند لما تخلص. يومك بينحسب «منجز» لما تسكّر بند واحد على الأقل من كل مادة؛ ويوم دراسة فائت بيكسر السلسلة إلا لو غطّاه إعفاء الأسبوع.</p>';
    var keepOpen = sheet.body.querySelector('.dp-set') && sheet.body.querySelector('.dp-set').open;
    sheet.body.innerHTML = h;
    if(keepOpen){ var ds = sheet.body.querySelector('.dp-set'); if(ds) ds.open = true; }
    var tgt = null;
    if(fc !== null) tgt = Array.prototype.filter.call(sheet.body.querySelectorAll('form.dp-add'), function(f){ return f.getAttribute('data-dpc') === fc; }).map(function(f){ return f.querySelector('input'); })[0];
    else if(fk) tgt = Array.prototype.filter.call(sheet.body.querySelectorAll('[data-dp]'), function(b){ return (b.getAttribute('data-dp') || '') + '|' + (b.getAttribute('data-k') || '') === fk; })[0];
    if(tgt) try{ tgt.focus(); }catch(e){}
  }

  /* ---------- المراجعة الأسبوعية ---------- */
  var WHY = [['time', '⏰ ما في وقت'], ['tired', '😴 تعب/نوم'], ['phone', '📱 جوال وسوشال'], ['big', '📚 الخطة كبيرة'], ['hard', '🤯 ما فهمت المادة'], ['none', '👌 ولا إشي — كان منيح']];
  var GOALS = [['all', '🔥 كل أيام الدراسة'], ['four', '💪 4 أيام على الأقل'], ['lite', '🪶 خطة أخف']];
  var TIPS = { time: 'جلسة 25 دقيقة بين محاضرتين بتكفي لبند — شوف «⏰ مقترح» جنب كل مادة.', tired: 'خلّي البند الصعب بعد المحاضرة مباشرة وهي طازة، والسهل بالليل.',
    phone: 'وقت جلسة التركيز حط الجوال بعيد أو اقلبه على وجهه — 25 دقيقة بس.', big: 'فعّلت لك «الخطة الأخف»: بند واحد لكل مادة. لما تتعوّد رجّعها من الإعدادات.',
    hard: 'افتح المادة واسأل المساعد عن الجزء الصعب، أو جهّز سؤال للدكتور بساعات المكتب.', none: 'كمّل هيك 👌 أسبوع زي هاد بيفرق بالعلامة.' };
  function openReview(){
    if(!W.HubUI || !W.HubUI.openSheet) return null;
    var now = new Date(), t = ymd(now), ws = weekStart(t), sx = streakInfo(now), p = P(), old = (p && isObj(p.rev) && p.rev[ws]) || {};
    var log = {}; try{ log = (W.S && W.S.get('studyLog', {})) || {}; }catch(e){}
    var sum = weekSummary({ ws: ws, today: t, hist: sx.hist, days: days(), space: W.space || {}, log: log }), pick = { why: old.why || '', goal: old.goal || '' };
    var s = W.HubUI.openSheet({ title: '📊 مراجعة الأسبوع' }); s.panel.classList.add('dp-review');
    var per = Object.keys(sum.per).sort(function(a, b){ return sum.per[b] - sum.per[a]; });
    var head = !sum.exp ? 'ما كان في أيام دراسة محسوبة هالأسبوع لسا.' : sum.done === sum.exp ? '💪 أسبوع كامل: ' + sum.done + ' من ' + sum.exp + ' أيام — هيك الشغل.' :
      sum.done / sum.exp >= 0.6 ? 'منيح: التزمت ' + sum.done + ' من ' + sum.exp + ' أيام دراسة. في مجال تكمّلها.' : 'بصراحة: التزمت ' + sum.done + ' من ' + sum.exp + ' أيام بس. مش مشكلة — الأسبوع الجاي نبدأ أصغر ونثبت.';
    function chips(list, key){ return '<div class="dp-chips" role="group">' + list.map(function(x){ return '<button type="button" class="dp-chip" data-rv="' + key + '" data-v="' + x[0] + '" aria-pressed="' + (pick[key] === x[0] ? 'true' : 'false') + '">' + x[1] + '</button>'; }).join('') + '</div>'; }
    s.body.innerHTML = '<div class="dp-rv-days">' + sum.days.map(function(x){ var dd = toD(x.date); return '<span class="dp-rv-day s-' + x.st + '"><i class="dp-dot s-' + x.st + '"></i>' + DA[dd.getDay()].replace('ال', '') + '<small>' + ST_LBL[x.st] + '</small></span>'; }).join('') + '</div>' +
      '<p class="dp-rv-head">' + head + '</p>' +
      '<div class="dp-rv-stats"><span><b>' + sx.cur + '</b><small>🔥 السلسلة</small></span><span><b>' + sum.focus + '</b><small>⏱️ دقيقة تركيز</small></span><span><b>' + sum.tasks + '</b><small>✅ مهام خلصت</small></span><span><b>' + sum.frz + '</b><small>❄️ إعفاء</small></span></div>' +
      (per.length ? '<div class="dp-rv-per">' + per.slice(0, 6).map(function(n){ return '<span>' + esc(n) + ' <b>' + sum.per[n] + '</b></span>'; }).join('') + '</div>' : '') +
      (sum.neglect.length ? '<p class="dp-rv-warn">⚠️ ما لمست هالأسبوع: <b>' + esc(sum.neglect.slice(0, 4).join('، ')) + '</b></p>' : '') +
      '<h4 class="dp-rv-q">شو أكثر إشي قطعك هالأسبوع؟</h4>' + chips(WHY, 'why') +
      '<h4 class="dp-rv-q">هدفك الأسبوع الجاي؟</h4>' + chips(GOALS, 'goal') +
      '<div class="dl-foot"><div class="grp"><button type="button" class="btn" data-rv-save="1">💾 احفظ المراجعة</button><button type="button" class="btn btn-ghost" data-rv-close="1">لاحقاً</button></div></div>';
    s.body.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('[data-rv],[data-rv-save],[data-rv-close]') : null; if(!b) return;
      if(b.hasAttribute('data-rv-close')){ s.close(); return; }
      if(b.hasAttribute('data-rv')){
        var k = b.getAttribute('data-rv'); pick[k] = b.getAttribute('data-v');
        s.body.querySelectorAll('[data-rv="' + k + '"]').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        return;
      }
      if(!pick.why || !pick.goal){ toast('اختار سبب وهدف للأسبوع الجاي', 'warn', 2500); return; }
      var st = store(); if(!st) return;
      st.rev[ws] = { why: pick.why, goal: pick.goal, at: t, done: sum.done, exp: sum.exp };
      if(pick.why === 'big' || pick.goal === 'lite') st.cfg.lite = true;
      if(!st.since) st.since = t;
      if(W.saveSpace) W.saveSpace(); s.close(); refresh();
      toast('📊 حفظت مراجعتك. ' + (TIPS[pick.why] || ''), 'success', 8000);
    });
    return s;
  }

  /* ---------- التذكيرات (تُستدعى من native-bridge للإشعارات المحلية، ومن NotifyCenter.tick والموقع مفتوح) ---------- */
  function notifs(day, now){
    now = now || new Date();
    var out = [], c = cfg(), p = P(), date = ymd(day), t = ymd(now); if(date < t) return out;
    var v = viewFor(date, now), names = v.courses.map(function(x){ return x.name; }), left = v.courses.filter(function(x){ return !x.ok; }).map(function(x){ return x.name; });
    if(date === t && v.ok) left = [];
    if(v.n && !(date === t && v.ok)){
      var mm = toMin(c.morning); if(mm === null) mm = 480;
      var first = v.courses[0] && v.courses[0].items[0];
      out.push({ key: date + '|dp-am', at: atMin(day, mm), title: '📚 خطتك اليوم: ' + nCourses(v.n), body: names.slice(0, 4).join(' · ') + (first ? ' — ابدأ بـ«' + first.t + '»' : '') });
      var sx = date === t ? streakInfo(now, v) : null, list = left.slice(0, 3).join('، ');
      var R = c.strict ? [[16 * 60, '⏳ خطتك لسا ما خلصت', 'باقي: ' + list + ' — جلسة 25 دقيقة بتسكّر أول مادة'],
        [20 * 60, sx && sx.cur >= 2 ? '🔥 سلسلتك ' + sx.cur + ' أيام بخطر' : '📚 باقي ' + nCourses(left.length) + ' من خطة اليوم', 'سكّر بند واحد لكل مادة: ' + list],
        [22 * 60, '⚠️ آخر فرصة اليوم', 'بند واحد لكل مادة ويتسجّل يومك منجز ✅ (باقي: ' + list + ')']]
        : [[20 * 60, '📚 باقي ' + nCourses(left.length) + ' من خطة اليوم', 'سكّر بند واحد لكل مادة: ' + list]];
      if(left.length) R.forEach(function(x){ out.push({ key: date + '|dp-' + x[0], at: atMin(day, x[0]), title: x[1], body: x[2] }); });
    }
    if(day.getDay() === 4 && p && p.since && !(isObj(p.rev) && p.rev[weekStart(date)])) out.push({ key: date + '|dp-rev', at: atMin(day, 19 * 60), title: '📊 مراجعتك الأسبوعية جاهزة', body: 'دقيقتين: شو التزمت، شو اللي قطعك، وهدف الأسبوع الجاي' });
    return out;
  }
  /* لقطة لودجت «خطتي اليوم» (تطبيق أندرويد) */
  function widget(now){
    now = now || new Date();
    var t = ymd(now), v = viewFor(t, now), sx = streakInfo(now, v), picks = [], round = 0;
    /* حتى 10 بنود بالتناوب بين المواد (أول بند مفتوح لكل مادة قبل البقية) عشان كل مادة تظهر وتنشيّك من الودجت */
    var per = v.courses.map(function(c){ return c.items.filter(function(x){ return !x.d; }).concat(c.items.filter(function(x){ return x.d; })); });
    while(picks.length < 10){ var added = false; per.forEach(function(list, ci){ if(picks.length < 10 && list[round]){ picks.push({ ci: ci, r: round, x: list[round] }); added = true; } }); if(!added) break; round++; }
    picks.sort(function(a, b){ return a.ci - b.ci || a.r - b.r; });
    var it = picks.map(function(p){ var c = v.courses[p.ci], hue = W.courseHue ? W.courseHue(c.name) : 210; return { k: String(p.x.k).slice(0, 120), t: String(p.x.t).slice(0, 60), c: String(c.name).slice(0, 40), h: +hue || 0, x: p.x.d ? 1 : 0 }; });
    return { d: t, n: v.n, k: v.okN, ok: v.ok ? 1 : 0, st: sx.cur, it: it };
  }

  /* ---------- الربط ---------- */
  function overlayOpen(){
    if(d.querySelector('.modal-backdrop,.hub-sheet-backdrop,.ocri-overlay')) return true;
    if(d.documentElement.classList.contains('is-new')) return true;
    var ob = d.getElementById('onbOverlay'); if(ob && ob.innerHTML && W.getComputedStyle(ob).display !== 'none') return true;
    var wo = d.getElementById('welcomeOverlay'); return !!(wo && wo.classList.contains('show') && W.getComputedStyle(wo).display !== 'none');
  }
  /* «صارم»: أول فتح للتطبيق باليوم بتنفتح الخطة لحالها لو في دراسة مطلوبة وما خلصت (مرة وحدة باليوم) */
  function maybeAutoOpen(force){
    try{
      var now = new Date(), t = ymd(now), h = W.location.hostname;
      if(!force && (/jsdom/i.test(W.navigator.userAgent || '') || h === 'localhost' || h === '127.0.0.1')) return false;
      if(!cfg().auto || now.getHours() < 5 || lsGet('ss_dp_seen') === t || overlayOpen()) return false;
      var dash = d.getElementById('dashboard'); if(!dash || !dash.classList.contains('active')) return false;
      var v = viewFor(t, now); if(!v.n || v.ok) return false;
      lsSet('ss_dp_seen', t); openSheet(); return true;
    }catch(e){ console.warn('dayplan auto-open', e); return false; }
  }
  function within(el){ return !!(el && el.closest && el.closest('.md-plan,.dp-sheet')); }
  d.addEventListener('click', function(e){
    var b = e.target && e.target.closest ? e.target.closest('[data-dp]') : null; if(!b || !within(b)) return;
    var a = b.getAttribute('data-dp'), k = b.getAttribute('data-k');
    e.stopPropagation();
    if(a === 'tog') toggle(k);
    else if(a === 'open') openSheet();
    else if(a === 'focus') startFocus(k, b.getAttribute('data-c'));
    else if(a === 'later') later(k);
    else if(a === 'del') delItem(k);
    else if(a === 'quick'){ if(addItem(b.getAttribute('data-c'), b.getAttribute('data-t'))) toast('＋ «' + b.getAttribute('data-t') + '» لـ' + b.getAttribute('data-c'), 'success', 1800); }
    else if(a === 'review') openReview();
    else if(a === 'notif'){ if(W.NotifyCenter) W.NotifyCenter.open(); }
    else if(a === 'addclass'){ if(W.openSmartTimetable) W.openSmartTimetable(); }
  });
  d.addEventListener('submit', function(e){
    var f = e.target; if(!f || !f.classList || !f.classList.contains('dp-add') || !within(f)) return;
    e.preventDefault();
    var inp = f.querySelector('input'), sel = f.querySelector('select'), course = sel ? sel.value : f.getAttribute('data-dpc'), txt = inp ? inp.value : '';
    if(!String(txt).trim()){ if(inp) inp.focus(); toast('اكتب شو بدك تدرس', 'warn', 1800); return; }
    if(addItem(course, txt) && inp){ inp.value = ''; }
  });
  d.addEventListener('change', function(e){
    var el = e.target; if(!el || !el.getAttribute || !el.getAttribute('data-dpset') || !within(el)) return;
    var key = el.getAttribute('data-dpset');
    setCfg(key, key === 'morning' ? el.value : !!el.checked);
  });
  /* ?open=plan (من ودجت/إشعار التطبيق والتطبيق مسكّر) يفتح الخطة مباشرة */
  function boot(){
    var q = null; try{ q = new W.URLSearchParams(W.location.search); }catch(e){}
    if(q && q.get('open') === 'plan'){
      try{ var u = new W.URL(W.location.href); u.searchParams.delete('open'); W.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); }catch(e){}
      lsSet('ss_dp_seen', ymd(new Date()));
      setTimeout(function(){ if(W.switchTab) W.switchTab('dashboard'); openSheet(); }, 900);
      return;
    }
    setTimeout(function(){ maybeAutoOpen(false); }, 5000);
  }
  d.addEventListener('visibilitychange', function(){ if(d.visibilityState === 'visible') setTimeout(function(){ maybeAutoOpen(false); }, 1500); });
  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();

  return Object.assign(pure, { cardHtml: cardHtml, viewFor: viewFor, streakInfo: streakInfo, toggle: toggle, addItem: addItem, delItem: delItem, later: later, setCfg: setCfg, cfg: cfg,
    openSheet: openSheet, openReview: openReview, reviewDue: reviewDue, notifs: notifs, widget: widget, maybeAutoOpen: maybeAutoOpen, startFocus: startFocus });
});
