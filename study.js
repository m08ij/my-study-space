/* ============================================================
   📈 study.js — الملخص الأسبوعي + خطة مراجعة الامتحانات
   - يعتمد فقط على بيانات المستخدم الحقيقية (studyLog / tasks / exams / timetable). لا أرقام وهمية.
   - الأيام بتوقيت الجهاز المحلي، والأسبوع يبدأ الأحد (مثل بقية التطبيق).
   - يُحمَّل بعد hub.js (يستخدم HubUI.openSheet).
   ============================================================ */
(function(){
  'use strict';
  if(window._studyLoaded) return;
  window._studyLoaded = true;

  function sp(){ return window.space || {}; }
  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n){ return String(n).padStart(2, '0'); }
  function ds(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayStart(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n){ var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function toast(m, t, d){ if(window.toast) window.toast(m, t, d); }
  var DAYS_AR = window.DAYS_AR || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var SHORT_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  function fmtMin(m){ m = Math.round(m); if(m < 60) return m + ' د'; var h = Math.floor(m / 60), r = m % 60; return h + ' س' + (r ? ' ' + r + ' د' : ''); }

  /* ============================================================
     1) الملخص الأسبوعي
     ============================================================ */
  function weeklyData(now){
    now = now || new Date();
    var today = dayStart(now), start = addDays(today, -today.getDay()), prevStart = addDays(start, -7), end = addDays(start, 6);
    var log = {}; try{ log = window.S.get('studyLog', {}) || {}; }catch(e){}
    if(typeof log !== 'object' || Array.isArray(log)) log = {};
    function week(from){ var a = []; for(var i = 0; i < 7; i++){ var d = addDays(from, i); a.push({ date: ds(d), dow: d.getDay(), min: Math.max(0, +log[ds(d)] || 0) }); } return a; }
    var cur = week(start), prev = week(prevStart);
    var sum = function(a){ return a.reduce(function(t, x){ return t + x.min; }, 0); };
    var tasks = sp().tasks || [], s0 = ds(start), s1 = ds(end), t0 = ds(today), t7 = ds(addDays(today, 7));
    var du = window.daysUntil || function(){ return null; };
    var exams = (sp().exams || []).filter(function(e){ var d = du(e.date); return d !== null && d >= 0 && d <= 14; })
      .sort(function(a, b){ return (a.date + ' ' + (a.time || '')).localeCompare(b.date + ' ' + (b.time || '')); });
    return {
      start: start, end: end, todayIdx: today.getDay(), cur: cur, prevTotal: sum(prev), total: sum(cur),
      daysStudied: cur.filter(function(x){ return x.min > 0; }).length,
      done: tasks.filter(function(t){ return t.done && t.completedAt && t.completedAt >= s0 && t.completedAt <= s1; }).length,
      overdue: tasks.filter(function(t){ return !t.done && t.due && t.due < t0; }).length,
      dueSoon: tasks.filter(function(t){ return !t.done && t.due && t.due >= t0 && t.due <= t7; }).length,
      exams: exams, lectures: Object.keys(sp().timetable || {}).length
    };
  }
  window.weeklyData = weeklyData;

  var lastHtml = '';
  function renderWeekly(){
    var el = document.getElementById('weeklySummary'); if(!el) return;
    var w = weeklyData();
    var max = Math.max.apply(null, w.cur.map(function(x){ return x.min; }).concat([60]));
    var empty = !w.total && !w.done && !w.overdue && !w.dueSoon && !w.exams.length;
    var delta = '';
    if(w.prevTotal > 0 && w.total > 0){
      var pct = Math.round((w.total - w.prevTotal) / w.prevTotal * 100);
      delta = '<span class="wk-delta ' + (pct >= 0 ? 'up' : 'down') + '">' + (pct >= 0 ? '▲' : '▼') + ' <bdi dir="ltr">' + Math.abs(pct) + '%</bdi> عن الأسبوع الماضي</span>';
    } else if(w.prevTotal > 0){ delta = '<span class="wk-delta">الأسبوع الماضي: ' + fmtMin(w.prevTotal) + '</span>'; }
    var range = '<bdi dir="ltr">' + w.start.getDate() + '/' + (w.start.getMonth() + 1) + ' – ' + w.end.getDate() + '/' + (w.end.getMonth() + 1) + '</bdi>';
    var html = '<div class="card-head"><h3>📈 ملخصك الأسبوعي</h3><span class="wk-range">' + range + '</span></div>';
    if(empty){
      html += '<div class="wk-empty">ما في نشاط مسجّل هذا الأسبوع بعد. ابدأ جلسة تركيز أو أكمل مهمة، وبيظهر ملخصك هنا.</div>';
    } else {
      html += '<div class="wk-tiles">' +
        '<div class="wk-tile"><b>' + (w.total ? fmtMin(w.total) : '0') + '</b><span>وقت الدراسة</span>' + (delta ? '<small>' + delta + '</small>' : '') + '</div>' +
        '<div class="wk-tile"><b>' + w.daysStudied + ' / 7</b><span>أيام دراسة</span></div>' +
        '<div class="wk-tile"><b>' + w.done + '</b><span>مهام أُنجزت</span></div>' +
        '</div>' +
        '<div class="wk-bars" role="img" aria-label="دقائق الدراسة لكل يوم هذا الأسبوع">' + w.cur.map(function(x){
          var h = x.min ? Math.max(8, Math.round(x.min / max * 100)) : 4;
          return '<div class="wk-bar' + (x.dow === w.todayIdx ? ' today' : '') + (x.min ? '' : ' zero') + '" title="' + esc(DAYS_AR[x.dow]) + ': ' + (x.min ? fmtMin(x.min) : 'لا دراسة') + '"><i style="height:' + h + '%"></i><span>' + SHORT_DAYS[x.dow] + '</span></div>';
        }).join('') + '</div>';
      var next = [];
      if(w.dueSoon) next.push('📝 ' + w.dueSoon + ' مهمة مستحقة خلال 7 أيام');
      if(w.exams[0]){ var r = window.examRemaining ? window.examRemaining(w.exams[0]) : { label: '' }; next.push('⏳ أقرب امتحان: ' + esc(w.exams[0].name) + (r.label ? ' (' + esc(r.label) + ')' : '')); }
      if(w.exams.length > 1) next.push(w.exams.length + ' امتحانات خلال أسبوعين');
      if(next.length) html += '<div class="wk-next">' + next.join(' · ') + '</div>';
    }
    if(html !== lastHtml){ el.innerHTML = html; lastHtml = html; }
  }
  window.renderWeekly = renderWeekly;

  var wkTimer = null;
  function scheduleWeekly(){ if(wkTimer) clearTimeout(wkTimer); wkTimer = setTimeout(function(){ wkTimer = null; try{ renderWeekly(); }catch(e){ console.error('[study] weekly', e); } }, 120); }

  /* ============================================================
     2) خطة مراجعة الامتحانات
     اقتراح آلي: كل يوم يُسند للامتحان الأقرب (مع عدالة توزيع)، ويوم المراجعة النهائية قبل كل امتحان مضمون.
     ============================================================ */
  function planExams(now, opts){
    opts = opts || {}; now = now || new Date();
    var perDay = opts.perDay === 2 ? 2 : 1, horizon = opts.horizon || 30;
    var du = window.daysUntil || function(){ return null; };
    var list = (sp().exams || []).map(function(e){ return { e: e, D: du(e.date), n: 0 }; })
      .filter(function(x){ return x.D !== null && x.D >= 1 && x.D <= horizon; }).sort(function(a, b){ return a.D - b.D; });
    if(!list.length) return { days: [], exams: [] };
    var maxD = list[list.length - 1].D, days = [];
    for(var d = 0; d < maxD; d++){
      var cands = list.filter(function(x){ return x.D > d; }); if(!cands.length) continue;
      var picked = cands.map(function(x){ return { x: x, w: 1 / (x.D - d) + 0.15 / (x.n + 1) }; })
        .sort(function(a, b){ return b.w - a.w; }).slice(0, perDay).map(function(p){ return p.x; });
      picked.forEach(function(x){ x.n++; });
      days.push({ offset: d, items: picked.map(function(x){ return { exam: x.e, D: x.D, final: d === x.D - 1 }; }) });
    }
    /* ضمان: يوم المراجعة النهائية قبل كل امتحان موجود دائماً */
    list.forEach(function(x){
      var fd = x.D - 1, row = days.filter(function(r){ return r.offset === fd; })[0];
      if(!row){ row = { offset: fd, items: [] }; days.push(row); }
      var has = row.items.some(function(it){ return it.exam === x.e; });
      if(!has){ row.items.push({ exam: x.e, D: x.D, final: true }); x.n++; }
      else row.items.forEach(function(it){ if(it.exam === x.e) it.final = true; });
    });
    days.sort(function(a, b){ return a.offset - b.offset; });
    var base = dayStart(now);
    days.forEach(function(r){ var dt = addDays(base, r.offset); r.date = ds(dt); r.dow = dt.getDay(); });
    return { days: days, exams: list.map(function(x){ return { exam: x.e, D: x.D, sessions: x.n }; }) };
  }
  window.planExams = planExams;

  function taskTitle(it){ return (it.final ? 'مراجعة نهائية: ' : 'مراجعة: ') + it.exam.name; }
  function addPlanTasks(plan){
    if(!sp().tasks) window.space.tasks = [];
    var exist = {}; window.space.tasks.forEach(function(t){ exist[(t.title || '') + '|' + (t.due || '')] = true; });
    var maxOrder = -1; window.space.tasks.forEach(function(t){ if(typeof t.order === 'number' && t.order > maxOrder) maxOrder = t.order; });
    var added = 0, skipped = 0;
    plan.days.forEach(function(r){
      r.items.forEach(function(it){
        var key = taskTitle(it) + '|' + r.date;
        if(exist[key]){ skipped++; return; }
        exist[key] = true; added++;
        window.space.tasks.push({ id: window.uid ? window.uid() : Date.now().toString(36) + added, title: taskTitle(it), type: 'task', course: it.exam.course || '', due: r.date,
          done: false, priority: (it.final || it.D <= 3) ? 'high' : 'normal', order: ++maxOrder });
      });
    });
    if(added){ window.saveSpace(); if(window.renderTasks) window.renderTasks(); if(window.renderDashboard) window.renderDashboard(); }
    return { added: added, skipped: skipped };
  }
  window.addExamPlanTasks = function(opts){ return addPlanTasks(planExams(new Date(), opts)); };

  function dayLabel(r){
    var off = r.offset;
    return (off === 0 ? 'اليوم' : off === 1 ? 'غدًا' : DAYS_AR[r.dow]) + ' · <bdi dir="ltr">' + r.date + '</bdi>';
  }
  var planUI = { perDay: 1, horizon: 30 };
  window.openExamPlan = function(){
    if(!window.HubUI || !window.HubUI.openSheet){ toast('تعذّر فتح الخطة', 'warn'); return; }
    var sheet = window.HubUI.openSheet({ title: '🧠 خطة مراجعة الامتحانات' });
    function draw(){
      var plan = planExams(new Date(), planUI);
      var h = '<p class="dl-note">اقتراح آلي من مواعيد امتحاناتك: الامتحان الأقرب يأخذ أولوية أكبر، ويوم قبل كل امتحان مخصّص للمراجعة النهائية. تقدر تعدّل المهام بعد إضافتها.</p>' +
        '<div class="plan-opts"><label>جلسات باليوم <select data-po="perDay"><option value="1"' + (planUI.perDay === 1 ? ' selected' : '') + '>جلسة</option><option value="2"' + (planUI.perDay === 2 ? ' selected' : '') + '>جلستان</option></select></label>' +
        '<label>تغطية <select data-po="horizon">' + [14, 30, 45].map(function(n){ return '<option value="' + n + '"' + (planUI.horizon === n ? ' selected' : '') + '>' + n + ' يوم</option>'; }).join('') + '</select></label></div>';
      if(!plan.days.length){
        h += '<div class="hub-empty">ما عندك امتحانات قادمة ضمن ' + planUI.horizon + ' يوم. أضف امتحاناً (بتاريخ بعد اليوم) وبتظهر الخطة هنا.</div>' +
          '<div class="hub-actions"><button type="button" class="btn" data-pa="addexam">+ إضافة امتحان</button></div>';
      } else {
        h += '<div class="plan-sum">' + plan.exams.map(function(x){ return '<span class="plan-chip">' + esc(x.exam.name) + ' · ' + (x.D === 1 ? 'غدًا' : x.D + ' يوم') + ' · ' + x.sessions + ' جلسة</span>'; }).join('') + '</div>' +
          '<div class="plan-days">' + plan.days.map(function(r){
            return '<div class="plan-day"><div class="plan-date">' + dayLabel(r) + '</div><div class="plan-items">' + r.items.map(function(it){
              return '<div class="plan-item' + (it.final ? ' final' : '') + '">' + (it.final ? '🎯 ' : '📖 ') + esc(it.exam.name) + (it.final ? '<small>مراجعة نهائية</small>' : '') + '</div>';
            }).join('') + '</div></div>';
          }).join('') + '</div>' +
          '<div class="dl-foot"><div class="grp"><button type="button" class="btn" data-pa="tasks">➕ أضف الخطة كمهام</button><button type="button" class="btn btn-ghost" data-pa="close">إغلاق</button></div></div>';
      }
      sheet.body.innerHTML = h;
    }
    draw();
    sheet.body.addEventListener('change', function(e){
      var s = e.target.closest ? e.target.closest('[data-po]') : null; if(!s) return;
      planUI[s.getAttribute('data-po')] = parseInt(s.value, 10); draw();
    });
    sheet.body.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('[data-pa]') : null; if(!b || b.disabled) return;
      var a = b.getAttribute('data-pa');
      if(a === 'close') sheet.close();
      else if(a === 'addexam'){ sheet.close(); if(window.addExam) window.addExam(); }
      else if(a === 'tasks'){
        b.disabled = true;                                   /* لا نقر مزدوج */
        var r = addPlanTasks(planExams(new Date(), planUI));
        toast(r.added ? '✓ أُضيفت ' + r.added + ' مهمة مراجعة' + (r.skipped ? ' (تخطّيت ' + r.skipped + ' موجودة أصلاً)' : '') : 'كل مهام الخطة موجودة أصلاً', r.added ? 'success' : 'info', 3000);
        sheet.close(); if(r.added && window.switchTab) window.switchTab('tasks');
      }
    });
  };

  /* ============================================================
     الربط مع التطبيق
     ============================================================ */
  if(typeof window.renderDashboard === 'function' && !window._studyDashWrapped){
    var origDash = window.renderDashboard;
    window.renderDashboard = function(){ var r = origDash.apply(this, arguments); scheduleWeekly(); return r; };
    window._studyDashWrapped = true;
  }
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) scheduleWeekly(); });

  function init(){
    var b = document.getElementById('btnExamPlan');
    if(b && !b._studyBound){ b._studyBound = true; b.addEventListener('click', function(){ window.openExamPlan(); }); }
    scheduleWeekly();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  console.log('[Study] loaded');
})();
