/* ============================================================
   💡 coach.js — «اقتراحات لك» (الخطوة الجاية) + «صحة المادة» + «ما الجديد»
   - كله محسوب محلياً من بياناتك الموجودة (مهام/امتحانات/حضور/جدول/سجل التركيز)؛ لا بيانات وهمية ولا شبكة ولا كتابة بـspace.
   - الاقتراح = عنوان + سبب + زر إجراء واحد يستدعي دالة موجودة بالموقع؛ ✕ تخفيه لباقي اليوم (ss_coach_dismiss محلي فقط).
   - صحة المادة: 🟢 مستقرة / 🟡 تحتاج انتباه / 🔴 تحتاج تدخّل من الحضور والمهام المتأخرة وقرب الامتحان.
   ============================================================ */
(function(){
  'use strict';
  if(window.Coach) return;
  var DISMISS_KEY = 'ss_coach_dismiss', NEWS_KEY = 'ss_seen_news', NEWS_VER = '144';

  function sp(){ return window.space || {}; }
  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function pad(n){ return String(n).padStart(2, '0'); }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function ymdDate(s){ var q = String(s).split('-'); return new Date(+q[0], +q[1] - 1, +q[2]); }
  function dayDiff(dateStr, now){ var a = ymdDate(ymd(now)), b = ymdDate(dateStr); return Math.round((b - a) / 86400000); }
  function dayWord(n){ return n <= 0 ? 'اليوم' : n === 1 ? 'بكرة' : n === 2 ? 'بعد بكرة' : 'بعد ' + n + ' أيام'; }
  function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function studyMin(now, days){
    var log = (window.S && window.S.get('studyLog', {})) || {}, m = 0;
    for(var i = 0; i < days; i++){ var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); m += parseInt(log[ymd(d)], 10) || 0; }
    return m;
  }
  function attOf(name){
    var a = (sp().attendance || {})[name] || {}, p = +a.present || 0, b = +a.absent || 0;
    return { p: p, a: b, tot: p + b, pct: p + b ? Math.round(p / (p + b) * 100) : null };
  }
  function upcomingExams(now){
    return (sp().exams || []).filter(function(e){ return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') && dayDiff(e.date, now) >= 0; })
      .sort(function(a, b){ return String(a.date).localeCompare(String(b.date)); });
  }

  /* ---------- الاقتراحات ---------- */
  function suggest(now){
    now = now || new Date();
    var s = sp(), tasks = s.tasks || [], courses = s.courses || [], t = ymd(now), out = [];
    var pending = tasks.filter(function(x){ return x && !x.done; });
    var overdue = pending.filter(function(x){ return x.due && x.due < t; }).sort(function(a, b){ return (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1) || String(a.due).localeCompare(String(b.due)); });
    if(overdue.length){
      var f = overdue[0];
      out.push({ id: 'overdue', pri: 90 + Math.min(overdue.length, 5), icon: '⚠️', tone: 'bad',
        title: overdue.length === 1 ? 'عندك مهمة متأخرة' : 'عندك ' + overdue.length + ' مهام متأخرة',
        why: 'ابدأ بـ«' + f.title + '»' + (f.course ? ' (' + f.course + ')' : ''), act: { k: 'tasks', tf: 'overdue', label: 'افتح المتأخرة' } });
    }
    upcomingExams(now).slice(0, 3).forEach(function(e){
      var d = dayDiff(e.date, now); if(d > 7) return;
      var key = 'exam-' + (e.id || e.name), has = e.course && pending.some(function(x){ return x.course === e.course && /مراجع|مذاكر/.test(x.title || ''); });
      if(!has && window.openExamPlan){
        out.push({ id: key, pri: d <= 2 ? 88 : d <= 4 ? 76 : 62, icon: '🎯', tone: d <= 2 ? 'bad' : 'warn', title: (e.name || 'امتحان') + (e.course ? ' — ' + e.course : '') + ' ' + dayWord(d),
          why: 'ما عندك مهام مراجعة لها — خطة مراجعة جاهزة بضغطة', act: { k: 'plan', label: '🧠 خطة مراجعة' } });
      } else if(studyMin(now, 3) < 30){
        out.push({ id: key + '-focus', pri: d <= 3 ? 74 : 58, icon: '⏱️', tone: 'warn', title: 'ما درست كفاية قبل «' + (e.name || 'الامتحان') + '»',
          why: 'سجّلت أقل من 30 دقيقة تركيز آخر 3 أيام', act: { k: 'focus', course: e.course || '', label: '▶ ابدأ جلسة تركيز' } });
      }
    });
    var tom = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), tomT = ymd(tom);
    var tomHigh = pending.filter(function(x){ return x.due === tomT && x.priority === 'high'; });
    if(tomHigh.length) out.push({ id: 'tom-high', pri: 72, icon: '🔺', tone: 'warn', title: tomHigh.length === 1 ? 'مهمة مهمة تُسلَّم بكرة' : tomHigh.length + ' مهام مهمة تُسلَّم بكرة', why: '«' + tomHigh[0].title + '»' + (tomHigh.length > 1 ? ' وغيرها' : ''), act: { k: 'tasks', tf: 'pending', label: 'افتح المهام' } });
    courses.forEach(function(c){
      var a = attOf(c.name); if(a.tot < 4 || a.pct === null || a.pct >= 85) return;
      out.push({ id: 'att-' + c.name, pri: a.pct < 75 ? 80 : 55, icon: '✅', tone: a.pct < 75 ? 'bad' : 'warn', title: 'حضورك بـ«' + c.name + '» ' + a.pct + '%',
        why: a.pct < 75 ? 'قريب من حدّ الحرمان — حاول ما تغيّب' : 'انتبه لحدّ الغياب', act: { k: 'course', course: c.name, section: 'att', label: 'افتح المادة' } });
    });
    if(!courses.length) out.push({ id: 'setup-course', pri: 50, icon: '📚', tone: 'info', title: 'ابدأ بإضافة موادك', why: 'بعدها بتظهر لك المهام والحضور والعلامات لكل مادة', act: { k: 'addcourse', label: '＋ أضف مادة' } });
    else if(!Object.keys(s.timetable || {}).length) out.push({ id: 'setup-tt', pri: 48, icon: '📅', tone: 'info', title: 'أضف جدول محاضراتك', why: 'عشان تظهر لك المحاضرة الجاية والقاعة والتنبيهات', act: { k: 'addclass', label: '＋ أضف الجدول' } });
    if(courses.length && pending.length && studyMin(now, 2) === 0 && !out.some(function(x){ return /focus$/.test(x.id); }))
      out.push({ id: 'streak', pri: 30, icon: '🔥', tone: 'info', title: 'ما سجّلت تركيز من يومين', why: '25 دقيقة اليوم بترجّعك على المسار', act: { k: 'focus', course: '', label: '▶ ابدأ جلسة تركيز' } });
    var dis = lsGet(DISMISS_KEY) || {};
    return out.filter(function(x){ return dis[x.id] !== t; }).sort(function(a, b){ return b.pri - a.pri; });
  }

  function run(id){
    var x = suggest().filter(function(y){ return y.id === id; })[0]; if(!x) return false;
    var a = x.act, w = window;
    if(a.k === 'tasks'){ if(a.tf && w.filterTasks) w.filterTasks(a.tf); if(w.switchTab) w.switchTab('tasks'); }
    else if(a.k === 'plan'){ if(w.openExamPlan) w.openExamPlan(); }
    else if(a.k === 'focus'){ if(a.course && w.Progress && w.Progress.focusCourse) w.Progress.focusCourse(a.course); else if(w.switchTab) w.switchTab('timer'); }
    else if(a.k === 'course'){ var c = (sp().courses || []).filter(function(z){ return z.name === a.course; })[0]; if(w.switchTab) w.switchTab('courses'); if(c && w.Hub && w.Hub.openCourse) w.Hub.openCourse(c.id, a.section); }
    else if(a.k === 'addclass'){ if(w.openSmartTimetable) w.openSmartTimetable(); }
    else if(a.k === 'addcourse'){ if(w.addMyCourse) w.addMyCourse(); }
    return true;
  }
  function dismiss(id){ var d = lsGet(DISMISS_KEY) || {}, t = ymd(new Date()); Object.keys(d).forEach(function(k){ if(d[k] !== t) delete d[k]; }); d[id] = t; lsSet(DISMISS_KEY, d); }

  /* بطاقة «اقتراحات لك» (تُركَّب بـrenderMyDay)؛ فارغة لو ما في شي يستاهل */
  function cardHtml(now){
    var list = suggest(now); if(!list.length) return '';
    var rows = list.slice(0, 3).map(function(x){
      return '<div class="cc-row tone-' + x.tone + '"><span class="cc-ic" aria-hidden="true">' + x.icon + '</span>' +
        '<div class="cc-body"><b>' + esc(x.title) + '</b><small>' + esc(x.why) + '</small></div>' +
        '<button type="button" class="btn btn-sm" data-coach-act="' + esc(x.id) + '">' + esc(x.act.label) + '</button>' +
        '<button type="button" class="cc-x" data-coach-x="' + esc(x.id) + '" aria-label="إخفاء الاقتراح لليوم" title="إخفاء لليوم">✕</button></div>';
    }).join('');
    return '<section class="md-card md-coach" aria-label="اقتراحات لك"><div class="md-card-head"><h4>💡 اقتراحات لك</h4>' +
      (list.length > 3 ? '<span class="cc-more">+' + (list.length - 3) + ' اقتراح</span>' : '') + '</div><div class="cc-list">' + rows + '</div></section>';
  }

  /* ---------- صحة المادة ---------- */
  function health(name, now){
    now = now || new Date();
    var score = 0, reasons = [], a = attOf(name), t = ymd(now);
    if(a.tot >= 3 && a.pct !== null){ if(a.pct < 75){ score += 3; reasons.push('الحضور ' + a.pct + '%'); } else if(a.pct < 85){ score += 1; reasons.push('الحضور ' + a.pct + '%'); } }
    var od = (sp().tasks || []).filter(function(x){ return x && !x.done && x.course === name && x.due && x.due < t; }).length;
    if(od >= 3){ score += 3; reasons.push(od + ' مهام متأخرة'); } else if(od >= 1){ score += 2; reasons.push(od === 1 ? 'مهمة متأخرة' : od + ' مهام متأخرة'); }
    var ex = upcomingExams(now).filter(function(e){ return e.course === name; })[0];
    if(ex){ var d = dayDiff(ex.date, now); if(d <= 3){ score += 1; reasons.push('امتحان ' + dayWord(d)); } }
    return { level: score >= 3 ? 'risk' : score >= 1 ? 'warn' : 'good', score: score, reasons: reasons };
  }
  var HL = { good: ['🟢', 'مستقرة'], warn: ['🟡', 'تحتاج انتباه'], risk: ['🔴', 'تحتاج تدخّل'] };
  function healthPill(name, now){
    var h = health(name, now), m = HL[h.level];
    return '<span class="hub-health h-' + h.level + '" title="' + esc(h.reasons.length ? h.reasons.join(' · ') : 'ما في شي مقلق') + '">' + m[0] + ' ' + m[1] + '</span>';
  }

  /* ---------- ما الجديد (مرة واحدة لكل إصدار مميزات، للمستخدم اللي عنده بيانات) ---------- */
  var NEWS = ['🎨 تصميم جديد بأزرق ملكي: شريط علوي وقائمة وبطاقات ونوافذ وإشعارات أنعم', '📱 الهاتف: زر الرجوع يغلق النافذة المفتوحة أولاً، ولوحة المفاتيح ما تغطي الحقول، ومراعاة حواف الشاشة', '⏱️ مؤقت التركيز يحسب الوقت الفعلي حتى لو قفلت الشاشة', '🔒 حماية أقوى للنسخ الاحتياطية والمزامنة، وموافقة قبل إرسال ملفات لـGemini'];
  function whatsNew(){
    var s = sp(); if(!((s.courses || []).length + (s.tasks || []).length)) return false;
    if(lsGet(NEWS_KEY) === NEWS_VER) return false;
    lsSet(NEWS_KEY, NEWS_VER);
    if(!window.customConfirm) return false;
    window.customConfirm('• ' + NEWS.join('\n• '), function(){}, { title: 'جديد بمساحتي الدراسية', icon: '✨', okLabel: 'تمام' });
    return true;
  }
  /* لا تظهر تلقائياً بالتطوير المحلي/الاختبارات (تقاطع مع تدفقات الاختبار)؛ whatsNew() تُستدعى يدوياً بالاختبار */
  function boot(){ var h = location.hostname; if(/jsdom/i.test(navigator.userAgent || '') || h === 'localhost' || h === '127.0.0.1') return; setTimeout(function(){ try{ whatsNew(); }catch(e){} }, 3500); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.Coach = { suggest: suggest, run: run, dismiss: dismiss, cardHtml: cardHtml, health: health, healthPill: healthPill, whatsNew: whatsNew, NEWS_VER: NEWS_VER };
})();
