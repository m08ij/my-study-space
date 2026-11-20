/* ============================================================
   daily.js — يومك الدراسي: وضع التهدئة قبل الامتحان، مصروف سريع،
   أوقات الذروة، + كثافة الواجهة، لون تمييز مخصص، وتقسيم القوائم الطويلة
   - لا يغيّر شكل space. الكتابة الوحيدة: مصروف سريع (نفس بنية addBudgetItem) بإجراء المستخدم وزر تراجع.
   - تفضيلات محلية فقط (خارج المزامنة): ss_density, ss_custom_accent, ss_focus_hours, ss_qs_last
   - الاقتراحات كلها من بيانات موجودة؛ لا شيء يُخترع، والافتراضات مكتوبة بجانب كل اقتراح
   ============================================================ */
(function(){
  'use strict';
  if(window._dailyLoaded) return;
  window._dailyLoaded = true;

  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function sp(){ return window.space || {}; }
  function $(id){ return document.getElementById(id); }
  function toast(m, t, d){ if(window.toast) window.toast(m, t, d); }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function lsJSON(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function ssSet(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
  function pad(n){ return String(n).padStart(2, '0'); }
    function hhmm(min){ min = Math.round(min); return pad(Math.floor(min / 60) % 24) + ':' + pad(min % 60); }
  function dur(min){ min = Math.max(1, Math.round(min)); return min >= 60 ? Math.floor(min / 60) + ' س' + (min % 60 ? ' ' + (min % 60) + ' د' : '') : min + ' د'; }
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  /* ============================================================
     بيانات (دوال نقية قابلة للاختبار)
     ============================================================ */
  function examDT(e){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(e && e.date || '')); if(!m) return null;
    var hh = 8, mm = 0, t = /^(\d{1,2}):(\d{2})/.exec(String(e.time || ''));   /* امتحان بلا وقت: نفترض 8:00 صباحاً */
    if(t){ hh = +t[1]; mm = +t[2]; }
    return new Date(+m[1], +m[2] - 1, +m[3], hh, mm, 0);
  }
  function calmExam(now){
    now = now || new Date(); var best = null;
    (sp().exams || []).forEach(function(e){
      var dt = examDT(e); if(!dt) return;
      var diffH = (dt - now) / 3600000;
      if(diffH > 24 || diffH < -3) return;
      if(!best || dt < best.dt) best = { e: e, dt: dt, hours: diffH };
    });
    return best;
  }
  
  /* أوقات الذروة: سجل ساعة بدء كل جلسة تركيز (محلي) + أيام الأسبوع من studyLog الموجود */
  var FH = 'ss_focus_hours';
  document.addEventListener('ss:focus-complete', function(ev){
    var m = (ev && ev.detail && ev.detail.minutes) || 25, now = Date.now(), a = lsJSON(FH, []);
    if(!Array.isArray(a)) a = [];
    a.push({ h: new Date(now - m * 60000).getHours(), m: m, t: now });
    lsSet(FH, JSON.stringify(a.slice(-300)));
    renderPeak();
  });
  function peak(now){
    now = now || new Date();
    var a = lsJSON(FH, []); if(!Array.isArray(a)) a = [];
    var out = { n: a.length, hours: null, day: null, need: Math.max(0, 5 - a.length) };
    if(a.length >= 5){
      var blocks = {}, total = 0; a.forEach(function(x){ var b = Math.floor((+x.h || 0) / 2) * 2; blocks[b] = (blocks[b] || 0) + (+x.m || 0); total += (+x.m || 0); });
      var best = null; Object.keys(blocks).forEach(function(b){ if(best === null || blocks[b] > blocks[best]) best = b; });
      if(best !== null && total > 0) out.hours = { from: +best, to: +best + 2, share: Math.round(blocks[best] / total * 100) };
    }
    var log = window.S ? window.S.get('studyLog', {}) : {}, sums = [0, 0, 0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0, 0, 0], days = 0;
    Object.keys(log || {}).forEach(function(k){
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k); if(!m) return;
      var d = new Date(+m[1], +m[2] - 1, +m[3]); if((now - d) / 86400000 > 56 || d > now) return;
      var v = +log[k] || 0; if(v <= 0) return; sums[d.getDay()] += v; cnt[d.getDay()]++; days++;
    });
    if(days >= 3){
      var bi = -1, bv = 0; for(var i = 0; i < 7; i++){ if(cnt[i] && sums[i] / cnt[i] > bv){ bv = sums[i] / cnt[i]; bi = i; } }
      if(bi > -1) out.day = { idx: bi, name: DAYS[bi], avg: Math.round(bv) };
    }
    return out;
  }
  function peakLine(p){
    var parts = [];
    if(p.hours) parts.push('أفضل وقت لتركيزك: ' + hhmm(p.hours.from * 60) + '–' + hhmm(p.hours.to * 60) + ' (' + p.hours.share + '% من جلساتك)');
    if(p.day) parts.push('أنشط أيامك: ' + p.day.name + ' (~' + dur(p.day.avg) + ')');
    return parts.join(' · ');
  }
  function renderPeak(){
    var sec = $('timer'); if(!sec) return;
    var box = $('peakCard'), p = peak(), line = peakLine(p);
    var html = '<div class="card-head"><h3>⏰ أوقات ذروتك</h3></div>' +
      (line ? '<p class="pk-line">' + esc(line) + '</p>' : '') +
      (!p.hours ? '<p class="u-note">' + (p.n ? 'سُجّلت ' + p.n + ' جلسة؛ ' : 'ما في جلسات مسجّلة بعد؛ ') + 'يلزم ' + (p.need || 0) + ' جلسات تركيز إضافية لتظهر ساعاتك الأفضل (تُسجَّل ساعة بدء كل جلسة على جهازك فقط).</p>' : '') +
      (!p.day ? '<p class="u-note">أيام الأسبوع تظهر بعد 3 أيام دراسة على الأقل (من سجل الدراسة).</p>' : '') +
      '<p class="u-note">الافتراض: الذروة = أكثر كتلة ساعتين فيها دقائق تركيز. لا يُرسل أي شيء خارج جهازك.</p>';
    if(!box){ box = document.createElement('div'); box.id = 'peakCard'; box.className = 'card pk-card'; sec.appendChild(box); }
    if(box._h !== html){ box._h = html; box.innerHTML = html; }
  }

  /* ============================================================
     عرض اللوحة: تهدئة + مصروف سريع
     ============================================================ */
  function ensure(dash, id, html, cls, afterNode){
    var n = $(id);
    if(html === null){ if(n) n.remove(); return null; }
    if(!n){
      n = document.createElement('section'); n.id = id; n.className = 'card ' + cls;
      var head = afterNode || dash.querySelector(':scope > .page-head');
      if(head && head.nextSibling) dash.insertBefore(n, head.nextSibling); else dash.appendChild(n);
    }
    if(n._h !== html){ n._h = html; n.innerHTML = html; }
    return n;
  }
  function calmHtml(c, now){
    var e = c.e, hrs = c.hours, when = hrs <= 0 ? 'بدأ قبل قليل' : hrs < 1 ? 'بعد ' + Math.max(1, Math.round(hrs * 60)) + ' دقيقة' : 'بعد ' + Math.round(hrs) + ' ساعة تقريباً';
    var pend = e.course ? (sp().tasks || []).filter(function(t){ return !t.done && t.course === e.course; }).length : 0;
    return '<div class="card-head"><h3>🧘 وضع التهدئة</h3><button class="btn btn-sm btn-ghost" type="button" data-calm="all">إظهار كل اللوحة</button></div>' +
      '<p class="calm-main"><b>' + esc(e.name || 'امتحان') + '</b>' + (e.course ? ' · ' + esc(e.course) : '') + ' — ' + when + (e.room ? ' · ' + esc(e.room) : '') + '</p>' +
      '<div class="calm-acts">' + (e.course ? '<button class="btn btn-sm" type="button" data-calm="focus" data-course="' + esc(e.course) + '">⏱️ جلسة تركيز</button>' : '') +
      '<button class="btn btn-sm btn-ghost" type="button" data-calm="exams">كل الامتحانات</button></div>' +
      (pend ? '<p class="u-note">📝 عندك ' + pend + ' مهمة مفتوحة بهذه المادة (مخفية الآن للتركيز).</p>' : '') +
      '<p class="u-note">اللوحة مبسّطة قبل الامتحان بـ24 ساعة. تقدر ترجع للوضع الكامل بأي وقت.</p>';
  }

  var QS = [['food', '🍔', 'طعام'], ['transport', '🚌', 'مواصلات'], ['books', '📚', 'قرطاسية'], ['entertainment', '🎮', 'ترفيه'], ['other-expense', '➖', 'آخر']];
    var qsSel = '';
  function renderQuickSpend(dash){}
  
  function renderDaily(){
    var dash = $('dashboard'); if(!dash || !window.space) return;
    var now = new Date();
    var calm = calmExam(now), calmOn = !!calm && ssGet('ss_calm_off') !== String(calm.e.id || calm.e.name);
    document.body.classList.toggle('focus-calm', calmOn);
    /* الترتيب بعد العنوان: تهدئة ← مصروف سريع (نُنشئ بالعكس) */
    renderQuickSpend(dash);
    ensure(dash, 'calmCard', calmOn ? calmHtml(calm, now) : null, 'calm-card');
    ['calmCard'].forEach(function(id){ var n = $(id); if(n && !n._bound){ n._bound = true; n.addEventListener('click', onClick); } });
  }
  function onClick(ev){
    var t = ev.target; if(!t.closest) return;
    var b = t.closest('[data-calm]');
    if(b){
      var c = b.getAttribute('data-calm');
      if(c === 'all'){ var cx = calmExam(new Date()); if(cx) ssSet('ss_calm_off', String(cx.e.id || cx.e.name)); renderDaily(); }
      else if(c === 'focus' && window.Progress && window.Progress.focusCourse) window.Progress.focusCourse(b.getAttribute('data-course'));
      else if(c === 'exams' && window.switchTab) window.switchTab('exams');
    }
  }

  /* ============================================================
     كثافة الواجهة
     ============================================================ */
  function applyDensity(v){
    if(v === 'compact') document.documentElement.setAttribute('data-density', 'compact'); else document.documentElement.removeAttribute('data-density');
    var b = $('densityBtn'); if(b){ var t = b.querySelector('.db-t'); if(t) t.textContent = v === 'compact' ? 'مضغوطة' : 'مريحة'; b.setAttribute('aria-checked', v === 'compact' ? 'true' : 'false'); }
  }
  function toggleDensity(){
    var next = lsGet('ss_density') === 'compact' ? 'comfy' : 'compact';
    lsSet('ss_density', next); applyDensity(next); toast(next === 'compact' ? '📏 كثافة مضغوطة' : '📏 كثافة مريحة', 'info', 1500);
  }

  /* ============================================================
     لون تمييز مخصص: يُصحَّح تلقائياً ليبقى مقروءاً (4.5:1) على بطاقة الثيم الحالي
     ============================================================ */
  function hex2rgb(h){ h = String(h || '').replace('#', ''); if(h.length === 3) h = h.split('').map(function(x){ return x + x; }).join(''); if(!/^[0-9a-f]{6}$/i.test(h)) return null; return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }; }
  function rgb2hex(c){ return '#' + [c.r, c.g, c.b].map(function(v){ return pad(Math.max(0, Math.min(255, Math.round(v))).toString(16)); }).join(''); }
  function lum(c){ var f = function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); }
  function ratio(a, b){ var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function mix(c, t, k){ return { r: c.r + (t.r - c.r) * k, g: c.g + (t.g - c.g) * k, b: c.b + (t.b - c.b) * k }; }
  function parseCssColor(s){
    s = String(s || '').trim(); var c = hex2rgb(s); if(c) return c;
    var m = /^rgba?\(([^)]+)\)$/.exec(s); if(m){ var p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2] }; }
    return null;
  }
  /* يقرّب اللون من الأبيض/الأسود حتى يبلغ نسبة التباين المطلوبة؛ يرجع {hex, adjusted, ratio} */
  function fitAccent(hex, bg, min){
    var c = hex2rgb(hex); if(!c) return null; bg = bg || { r: 20, g: 28, b: 46 }; min = min || 4.5;
    var toward = lum(bg) > .5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 }, k = 0, cur = c, adjusted = false;
    while(ratio(cur, bg) < min && k < 1){ k += .04; cur = mix(c, toward, k); adjusted = true; }
    return { hex: rgb2hex(cur), adjusted: adjusted, ratio: Math.round(ratio(cur, bg) * 100) / 100 };
  }
  function applyCustomAccent(){
    var root = document.documentElement, hex = lsGet('ss_custom_accent');
    ['--accent', '--accent-2', '--glow', '--on-accent', '--grad', '--brand-grad', '--on-brand'].forEach(function(p){ root.style.removeProperty(p); });
    if(!hex || !hex2rgb(hex)) return null;
    root.style.removeProperty('--accent');   /* نقرأ لون البطاقة الأصلي للثيم بدون تأثير تخصيصنا */
    var cs = getComputedStyle(root), card = parseCssColor(cs.getPropertyValue('--card')) || { r: 20, g: 28, b: 46 };
    var f = fitAccent(hex, card, 4.5); if(!f) return null;
    var a = hex2rgb(f.hex), second = rgb2hex(mix(a, lum(card) > .5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 }, .25));
    root.style.setProperty('--accent', f.hex); root.style.setProperty('--accent-2', second);
    root.style.setProperty('--glow', 'rgba(' + a.r + ',' + a.g + ',' + a.b + ',.35)');
    root.style.setProperty('--on-accent', lum(a) > .4 ? '#0b0f1a' : '#ffffff');
    root.style.setProperty('--grad', 'linear-gradient(135deg,' + f.hex + ',' + second + ')');
    root.style.setProperty('--brand-grad', 'linear-gradient(135deg,' + f.hex + ',' + second + ')'); root.style.setProperty('--on-brand', lum(a) > .4 ? '#0b0f1a' : '#ffffff');   /* التصميم الملكي (08-royal.css) يقرأ --brand-grad لأزرار التمييز */
    return f;
  }
  window.applyCustomAccent = applyCustomAccent;
  function buildAccentRow(){
    var panel = $('themePanel'); if(!panel || $('accentRow')) return;
    var row = document.createElement('div'); row.id = 'accentRow'; row.className = 'accent-row';
    row.innerHTML = '<label for="accentPick">🎯 لون تمييز مخصص</label><div class="accent-ctl"><input type="color" id="accentPick" value="#6c97ff" aria-label="اختيار لون التمييز"><button class="btn btn-sm btn-ghost" type="button" id="accentReset">إعادة</button></div><div class="u-note" id="accentNote"></div>';
    panel.appendChild(row);
    var pick = $('accentPick'), note = $('accentNote'), saved = lsGet('ss_custom_accent'); if(saved && hex2rgb(saved)) pick.value = saved;
    pick.addEventListener('input', function(){
      lsSet('ss_custom_accent', pick.value); var f = applyCustomAccent();
      note.textContent = f && f.adjusted ? 'عدّلنا اللون قليلاً ليبقى مقروءاً (تباين ' + f.ratio + ':1)' : '';
    });
    $('accentReset').addEventListener('click', function(){ try{ localStorage.removeItem('ss_custom_accent'); }catch(e){} applyCustomAccent(); note.textContent = ''; });
  }

  /* ============================================================
     قوائم طويلة: أول 60 عنصراً ثم «عرض المزيد» (يمنع بطء الرسم مع مئات العناصر)
     ============================================================ */
  var LIMIT = 60, LIST_SEL = '#tasksList,#examsList,#budgetList,.cd-list';
  function limitList(c){
    var kids = Array.prototype.filter.call(c.children, function(k){ return !k.classList.contains('lz-more'); });
    var more = c.querySelector(':scope > .lz-more');
    if(kids.length <= LIMIT + 9 || c.getAttribute('data-lz') === 'all'){
      kids.forEach(function(k){ k.classList.remove('lz-hidden'); }); if(more) more.remove(); return;
    }
    kids.forEach(function(k, i){ k.classList.toggle('lz-hidden', i >= LIMIT); });
    var left = kids.length - LIMIT;
    if(!more){
      more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost lz-more';
      more.addEventListener('click', function(){ c.setAttribute('data-lz', 'all'); limitList(c); });
      c.appendChild(more);
    }
    var txt = 'عرض المزيد (' + left + ')'; if(more.textContent !== txt) more.textContent = txt;
  }
  function limitAll(){ document.querySelectorAll(LIST_SEL).forEach(function(c){ try{ limitList(c); }catch(e){} }); }

  /* ============================================================
     تشغيل: يُعاد الرسم مع renderDashboard وكل دقيقة (للحالة الزمنية) وعند تغيّر الرؤية
     ============================================================ */
  var raf = false;
  function schedRender(){ if(raf) return; raf = true; (window.requestAnimationFrame || setTimeout)(function(){ raf = false; try{ limitAll(); }catch(e){} }); }
  function init(){
    applyDensity(lsGet('ss_density') === 'compact' ? 'compact' : 'comfy');
    var db = $('densityBtn'); if(db && !db._d){ db._d = true; db.addEventListener('click', function(){ toggleDensity(); });   /* مفتاح تبديل: تبقى القائمة مفتوحة لرؤية الأثر */ }
    buildAccentRow(); applyCustomAccent(); renderPeak();
    var main = document.querySelector('main');
    if(main && typeof MutationObserver !== 'undefined') new MutationObserver(schedRender).observe(main, { childList: true, subtree: true });
    schedRender();
  }
  if(typeof window.renderDashboard === 'function' && !window._dailyDashWrapped){
    window._dailyDashWrapped = true;
    var orig = window.renderDashboard;
      }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setInterval(function(){ if(!document.hidden && document.getElementById('dashboard') && document.getElementById('dashboard').classList.contains('active')) try{ renderDaily(); }catch(e){} }, 60000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) try{ renderDaily(); }catch(e){} });

  window.Daily = { calmExam: calmExam, peak: peak, peakLine: peakLine, render: renderDaily,
    fitAccent: fitAccent, ratio: ratio, hex2rgb: hex2rgb, limitList: limitList, examDT: examDT };
})();

/* ============================================================
   جدول المذاكرة الأسبوعي المقترح — يوزّع جلسات المراجعة على فراغاتك بين المحاضرات حسب قرب الامتحانات والمهام.
   يُحسب من البيانات كل مرة (فيتحدّث لحاله مع أي تغيير بالجدول/الامتحانات/المهام). إعداداته محلية (ss_study_plan) ولا تدخل المزامنة.
   ============================================================ */
(function(){
  'use strict';
  var KEY = 'ss_study_plan';
  function sp(){ return window.space || {}; }
  function pad(n){ return n < 10 ? '0' + n : '' + n; }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function toD(s){ var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function mins(t){ var p = String(t || '').split(':'), h = parseInt(p[0], 10), m = parseInt(p[1], 10) || 0; return isNaN(h) ? null : h * 60 + m; }
  function hhmm(m){ return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function cfg(){
    var c = {}; try{ c = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }catch(e){}
    return { on: c.on !== false, from: c.from || '08:00', to: c.to || '21:00', len: Math.min(120, Math.max(20, +c.len || 50)), perDay: Math.min(8, Math.max(1, +c.perDay || 3)), off: Array.isArray(c.off) ? c.off : ['Fri'] };
  }
    function dayDiff(a, b){ return Math.round((toD(a) - toD(b)) / 864e5); }

  /* وزن كل مادة: قرب امتحانها (الأقرب = أثقل) + مهامها المفتوحة + حدّ أدنى للمراجعة العامة */
  function demand(today){
    var done = window.getCompletedCourses ? window.getCompletedCourses() : {}, out = [];
    (sp().courses || []).forEach(function(c){
      if(!c || !c.name || c.completed === true || done[c.name]) return;
      var w = 1, reason = 'مراجعة عامة', cut = null, urgent = false;
      (sp().exams || []).forEach(function(e){
        if(e.course !== c.name || !e.date) return;
        var d = dayDiff(e.date, today); if(d < 0 || d > 30) return;
        w += 30 / Math.max(1, d); if(cut === null || e.date < cut){ cut = e.date; reason = (e.name || 'امتحان') + ' ' + (d === 0 ? 'اليوم' : d === 1 ? 'بكرة' : 'بعد ' + d + ' يوم'); urgent = d <= 3; }
      });
      var tk = (sp().tasks || []).filter(function(t){ return !t.done && t.course === c.name; });
      tk.forEach(function(t){ w += 1.5; if(t.due && dayDiff(t.due, today) <= 3) w += 1.5; });
      if(tk.length && cut === null) reason = tk.length + ' مهمة مفتوحة';
      out.push({ name: c.name, w: w, cut: cut, reason: reason, urgent: urgent, n: 0 });
    });
    return out;
  }
  function busyOn(date, DE){
    var d = toD(date), key = DE[d.getDay()], tt = sp().timetable || {}, out = [];
    Object.keys(tt).forEach(function(k){
      var i = k.indexOf('-'); if(i < 0 || k.slice(0, i) !== key || !tt[k]) return;
      var s = mins(k.slice(i + 1)); if(s === null) return; var e = mins(tt[k].end); if(e === null || e <= s) e = s + 60;
      out.push([s - 10, e + 10]);
    });
    (sp().exams || []).forEach(function(x){ if(x.date === date){ var s = mins(x.time); if(s !== null) out.push([s - 30, s + 150]); } });
    return out.sort(function(a, b){ return a[0] - b[0]; });
  }
  function build(){
    var c = cfg(), today = window.today ? window.today() : ymd(new Date()), DE = window.DAYS_EN || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], now = new Date();
    var dem = demand(today), days = [], i;
    for(i = 0; i < 7; i++){
      var d = new Date(toD(today).getTime()); d.setDate(d.getDate() + i); var date = ymd(d), dk = DE[d.getDay()];
      var day = { date: date, dow: d.getDay(), items: [], off: c.off.indexOf(dk) > -1 };
      if(!day.off && dem.length){
        var from = mins(c.from), to = mins(c.to);
        if(i === 0){ var nowM = Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 15) * 15; from = Math.max(from, nowM); }
        var busy = busyOn(date, DE), gaps = [], cur = from;
        busy.forEach(function(b){ if(b[0] > cur) gaps.push([cur, Math.min(b[0], to)]); cur = Math.max(cur, b[1]); });
        if(cur < to) gaps.push([cur, to]);
        var placed = 0, last = null;
        gaps.forEach(function(g){
          var t = g[0];
          while(placed < c.perDay && t + c.len <= g[1]){
            var cand = dem.filter(function(x){ return !x.cut || date < x.cut; }); if(!cand.length) break;
            cand.sort(function(a, b){ return (b.w / (b.n + 1)) - (a.w / (a.n + 1)); });
            var pick = (cand[0].name === last && cand.length > 1) ? cand[1] : cand[0];
            pick.n++; last = pick.name; placed++;
            day.items.push({ start: hhmm(t), end: hhmm(t + c.len), course: pick.name, reason: pick.reason, urgent: pick.urgent });
            t += c.len + 10;
          }
        });
      }
      days.push(day);
    }
    return { cfg: c, days: days, courses: dem.length };
  }
    function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  /* مطويّ؟ اختيار المستخدم (ss_sp_fold) وإلا الافتراضي: مطويّ على الشاشات الصغيرة (الجدول طويل ويدفع الباقي لتحت) */
    function render(){}
  function saveCfg(c){ try{ localStorage.setItem(KEY, JSON.stringify(c)); }catch(e){} }
  function setOn(v){ var c = cfg(); c.on = !!v; saveCfg(c); }
  /* إعدادات الجدول (نافذة): نفس التحقق القديم */
  function openConfig(done){
    var c = cfg();
    window.showModal('إعدادات جدول المذاكرة', [
      { key: 'from', label: 'من الساعة', type: 'time' }, { key: 'to', label: 'إلى الساعة', type: 'time' },
      { key: 'len', label: 'مدة الجلسة (دقيقة)', type: 'number' }, { key: 'perDay', label: 'أقصى جلسات باليوم', type: 'number' },
      { key: 'off', label: 'أيام الراحة', type: 'select', options: [{ v: 'Fri', l: 'الجمعة' }, { v: 'Fri,Sat', l: 'الجمعة والسبت' }, { v: '', l: 'لا يوجد' }] }
    ], { from: c.from, to: c.to, len: c.len, perDay: c.perDay, off: c.off.join(',') }, function(d){
      var f = mins(d.from), to = mins(d.to);
      if(f === null || to === null || to - f < 30){ window.toast('الوقت غير صحيح: لازم تكون النهاية بعد البداية بنص ساعة على الأقل', 'warn', 3000); return { field: 'to' }; }
      var len = parseInt(d.len, 10), per = parseInt(d.perDay, 10);
      if(!(len >= 20 && len <= 120)){ window.toast('مدة الجلسة بين 20 و120 دقيقة', 'warn', 2500); return { field: 'len' }; }
      if(!(per >= 1 && per <= 8)){ window.toast('عدد الجلسات بين 1 و8', 'warn', 2500); return { field: 'perDay' }; }
      saveCfg({ on: true, from: hhmm(f), to: hhmm(to), len: len, perDay: per, off: d.off ? d.off.split(',') : [] }); if(done) done(); return true;
    });
  }
    window.StudyPlan = { build: build, render: render, config: cfg, openConfig: openConfig, setOn: setOn };
  function hook(){
    if(typeof window.renderTimetable === 'function' && !window._spWrapped){
      window._spWrapped = true; var orig = window.renderTimetable;
          }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
  setTimeout(hook, 600);
})();