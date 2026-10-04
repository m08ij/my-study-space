/* ============================================================
   progress.js — (1) توقع التقدم الأكاديمي من العلامات (2) ربط جلسات التركيز بالمهام والمواد
   - لا يعدّل space: القراءة فقط من space.grades/courses/tasks
   - وقت التركيز المرتبط يُحفظ بمفتاح منفصل: focusLinks
   ============================================================ */
(function(){
  'use strict';
  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function num(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function sp(){ return window.space || {}; }
  function S(){ return window.S; }

  /* ---------- 1) توقع التقدم الأكاديمي ---------- */
  /* مقياس التقدير من window.GRADES (مفاتيح مثل 'A (90-100)') */
  function scale(){
    var G = window.GRADES || {}, out = [];
    Object.keys(G).forEach(function(k){
      var m = /\((\d+)\s*-\s*(\d+)\)/.exec(k);
      if(m) out.push({ key: k, min: +m[1], max: +m[2], pts: G[k], label: k.split(' ')[0] });
    });
    return out.sort(function(a, b){ return b.min - a.min; });
  }
  function letterFor(pct){
    var s = scale(); if(!s.length) return null;
    var p = Math.floor(Math.max(0, Math.min(100, pct)) + 1e-9);
    for(var i = 0; i < s.length; i++) if(p >= s[i].min) return s[i];
    return s[s.length - 1];
  }

  /* لكل مادة لها علامات: ما تحقق، وزن ما أُنجز، الأداء الحالي، ونطاق نهائي ممكن (الأدنى: باقي الأوزان صفر، الأعلى: كاملة) */
  function courseProjection(g){
    var items = (g.items || []).filter(function(i){ return num(i.weight) > 0; });
    var earned = 0, done = 0;
    items.forEach(function(i){ earned += Math.min(num(i.score), num(i.weight)); done += num(i.weight); });
    if(done <= 0) return null;
    var doneCapped = Math.min(done, 100);
    var cur = earned / done * 100;
    var remaining = Math.max(0, 100 - doneCapped);
    return { name: g.name, earned: earned, done: done, cur: cur, min: Math.min(100, earned), max: Math.min(100, earned + remaining), remaining: remaining, complete: done >= 100 };
  }
  function hoursOf(name){
    var c = (sp().courses || []).filter(function(x){ return x.name === name; })[0];
    var h = c ? num(c.hours) : 0;
    return h > 0 ? h : 3;
  }
  function report(){
    var rows = [], sumPts = 0, sumHrs = 0, sumMin = 0, sumMax = 0;
    (sp().grades || []).forEach(function(g){
      var p = courseProjection(g); if(!p) return;
      var L = letterFor(p.cur), Lmin = letterFor(p.min), Lmax = letterFor(p.max), h = hoursOf(g.name);
      p.letter = L; p.letterMin = Lmin; p.letterMax = Lmax; p.hours = h; rows.push(p);
      if(L){ sumPts += L.pts * h; sumHrs += h; }
      if(Lmin) sumMin += Lmin.pts * h; if(Lmax) sumMax += Lmax.pts * h;
    });
    return { rows: rows, gpa: sumHrs ? sumPts / sumHrs : null, gpaMin: sumHrs ? sumMin / sumHrs : null, gpaMax: sumHrs ? sumMax / sumHrs : null, hours: sumHrs };
  }

  function renderForecast(){
    var host = document.querySelector('#gradecalc .subsection[data-gc-sub="tracker"]'); if(!host) return;
    var box = document.getElementById('gcForecast');
    if(!box){ box = document.createElement('div'); box.id = 'gcForecast'; box.className = 'card pg-card'; host.appendChild(box); }
    var r = report();
    if(!r.rows.length){
      box.innerHTML = '<div class="card-head"><h3>🔮 توقع تقدمك الأكاديمي</h3></div><div class="u-empty">أضف علامات لموادك (علامة بوزنها) وبظهر هون توقع المعدل والتقدير لكل مادة.</div>';
      return;
    }
    var h = '<div class="card-head"><h3>🔮 توقع تقدمك الأكاديمي</h3></div>';
    h += '<div class="pg-kpis"><div class="pg-kpi"><b>' + r.gpa.toFixed(2) + '</b><span>معدل الفصل المتوقع (على أدائك الحالي)</span></div>' +
      '<div class="pg-kpi"><b>' + r.gpaMin.toFixed(2) + ' – ' + r.gpaMax.toFixed(2) + '</b><span>النطاق الممكن (أسوأ/أفضل حالة)</span></div>' +
      '<div class="pg-kpi"><b>' + r.hours + '</b><span>ساعات محتسبة</span></div></div>';
    h += '<div class="pg-rows">' + r.rows.map(function(p){
      return '<div class="pg-row"><div class="pg-top"><b>' + esc(p.name) + '</b><span>' + (p.letter ? p.letter.label : '—') + ' · ' + p.cur.toFixed(1) + '%</span></div>' +
        '<div class="pg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(p.cur) + '"><i style="width:' + Math.min(100, p.cur).toFixed(1) + '%"></i></div>' +
        '<div class="pg-sub">أُنجز ' + p.done + '% من وزن المادة · النهائي بين ' + p.min.toFixed(1) + '% و' + p.max.toFixed(1) + '%' + (p.complete ? ' (اكتملت)' : '') +
        (p.letterMin && p.letterMax && p.letterMin.label !== p.letterMax.label ? ' (' + p.letterMin.label + ' إلى ' + p.letterMax.label + ')' : '') + '</div></div>';
    }).join('') + '</div>';
    h += '<p class="pg-note">الافتراضات: المتوقع = أدائك الحالي مستمر على باقي الأوزان؛ الأدنى = باقي الأوزان صفر؛ الأعلى = باقيها كاملة. الساعات من «موادي» (3 إن لم تُحدَّد). هذا معدل الفصل من المواد اللي أدخلت علاماتها فقط، وليس معدلك التراكمي.</p>';
    box.innerHTML = h;
  }

  /* ---------- 2) ربط التركيز بالمهام والمواد ---------- */
  var FKEY = 'focusLinks';
  function loadLinks(){ var v = S() && S().get(FKEY, null); return (v && typeof v === 'object') ? { tasks: v.tasks || {}, courses: v.courses || {} } : { tasks: {}, courses: {} }; }
  function selectedTask(){
    var sel = document.getElementById('timerTask'); if(!sel || !sel.value) return null;
    return (sp().tasks || []).filter(function(t){ return t.id === sel.value; })[0] || null;
  }
  function fmtMin(m){ m = Math.round(m); return m >= 60 ? Math.floor(m / 60) + 'س ' + (m % 60) + 'د' : m + ' د'; }

  function buildPicker(){
    var main = document.querySelector('#timer .timer-main'); if(!main) return;
    var wrap = document.getElementById('timerLink');
    if(!wrap){
      wrap = document.createElement('div'); wrap.id = 'timerLink'; wrap.className = 'timer-link';
      wrap.innerHTML = '<label for="timerTask">🎯 جلسة التركيز لـ:</label><select id="timerTask"></select>';
      var controls = main.querySelector('.timer-controls'); main.insertBefore(wrap, controls);
      var stats = document.createElement('div'); stats.id = 'focusByCourse'; stats.className = 'focus-by-course'; main.appendChild(stats);
      wrap.querySelector('select').addEventListener('change', function(){ try{ S().set('focusSel', this.value); }catch(e){} });
    }
    var sel = document.getElementById('timerTask'), keep = sel.value || (S() && S().get('focusSel', '')) || '';
    var open = (sp().tasks || []).filter(function(t){ return !t.done; });
    sel.innerHTML = '<option value="">بدون ربط</option>' + open.map(function(t){ return '<option value="' + esc(t.id) + '">' + esc(t.title) + (t.course ? ' — ' + esc(t.course) : '') + '</option>'; }).join('');
    if(open.some(function(t){ return t.id === keep; })) sel.value = keep;
    renderFocusStats();
  }
  function renderFocusStats(){
    var el = document.getElementById('focusByCourse'); if(!el) return;
    var L = loadLinks(), names = Object.keys(L.courses).filter(function(k){ return L.courses[k] > 0; }).sort(function(a, b){ return L.courses[b] - L.courses[a]; });
    if(!names.length){ el.innerHTML = '<div class="u-note">اربط جلسة تركيز بمهمة لها مادة، وبتظهر هون ساعات دراستك لكل مادة.</div>'; return; }
    var max = L.courses[names[0]];
    el.innerHTML = '<h4 class="pg-h">⏳ وقت التركيز حسب المادة</h4>' + names.slice(0, 6).map(function(k){
      return '<div class="pg-row"><div class="pg-top"><span>' + esc(k) + '</span><b>' + fmtMin(L.courses[k]) + '</b></div><div class="pg-bar"><i style="width:' + (L.courses[k] / max * 100).toFixed(1) + '%"></i></div></div>';
    }).join('');
  }

  /* app.js يطلق ss:focus-complete عند انتهاء جلسة تركيز كاملة (لا راحة ولا عدّاد تصاعدي) */
  document.addEventListener('ss:focus-complete', function(e){
    try{
      var task = selectedTask(); if(!task) { renderFocusStats(); return; }
      var mins = num(e && e.detail && e.detail.minutes) || 25, L = loadLinks();
      L.tasks[task.id] = (L.tasks[task.id] || 0) + mins;
      var c = task.course || 'بدون مادة'; L.courses[c] = (L.courses[c] || 0) + mins;
      S().set(FKEY, L); renderFocusStats();
    }catch(err){ console.warn('progress focus link', err); }
  });
  /* ---------- ربط بالتصيير ---------- */
  var prevGrade = window.renderGradeCalc;
  window.renderGradeCalc = function(){ var r = prevGrade ? prevGrade.apply(this, arguments) : undefined; try{ renderForecast(); }catch(e){ console.warn('progress forecast', e); } return r; };
  /* app.js يُحمَّل بعد هذا الملف ويعرّف switchTab من جديد، فنراقب ظهور القسم نفسه بدل تغليف الدالة */
  function onShown(id, fn){
    var el = document.getElementById(id); if(!el || typeof MutationObserver === 'undefined') return;
    var was = el.classList.contains('active');
    new MutationObserver(function(){ var now = el.classList.contains('active'); if(now && !was){ try{ fn(); }catch(e){ console.warn(id, e); } } was = now; }).observe(el, { attributes: true, attributeFilter: ['class'] });
    if(was) setTimeout(fn, 0);
  }  onShown('timer', buildPicker);
  buildPicker();

  window.Progress = { report: report, letterFor: letterFor, courseProjection: courseProjection, loadLinks: loadLinks, render: renderForecast, buildPicker: buildPicker };
})();
