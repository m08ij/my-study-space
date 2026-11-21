/* ============================================================
   ✨ focus.js — الواجهة الجديدة (V6): زجاج فوق تدرّج، شريط علوي (كمبيوتر) / سفلي (تلفون)
   الشاشات: اليوم · الجدول · المهام · العلامات · المزيد (يفتح الواجهة الكاملة القديمة).
   فوق نفس البيانات والمنطق (space / toggleTask / addTask / Schedule / DayPlan / Hub / المزامنة).
   تفضيلات محلية: ss_ui ('focus'|'classic')، ss_fx_view، ss_fx_mode ('auto'|'dark'|'light')، ss_fx_bg (0..3)
   ============================================================ */
(function(){
  'use strict';
  if(window.FocusUI) return;
  var d = document, W = window, cur = 'today', ttDay = new Date().getDay(), root = null, timer = null;
  var DA = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var FXT = [['glass', 'زجاج (الرئيسي)', '#4f7dff', '#b45cff', '#1fc8b8', '#8b7bff', '#0b0e2a'], ['forest', 'غابة', '#10b981', '#0ea5e9', '#84cc16', '#34d399', '#06191a'], ['sunset', 'غروب', '#f97316', '#ec4899', '#facc15', '#fb7185', '#1c0b16'], ['plain', 'سادة', '', '', '', '#8b7bff', '#0b0e2a']];
  function themes(){ var a = FXT.slice(); (W.THEMES || []).forEach(function(t){ if(t && t.colors && !a.some(function(x){ return x[0] === t.id; })) a.push([t.id, t.name, t.colors[1], t.colors[2], t.colors[1], t.colors[1], t.light ? '#0b0e2a' : t.colors[0], t.light]); }); return a; }
  function curTheme(){ var id = lsGet('ss_fx_theme') || ({ 1: 'forest', 2: 'sunset', 3: 'plain' })[lsGet('ss_fx_bg')] || 'glass', a = themes(); return a.filter(function(t){ return t[0] === id; })[0] || a[0]; }
  var IC = {
    chev: '<path d="m15 6-6 6 6 6"/>',
    camera: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    spark: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/>',
    sync: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="3.5" y="7.5" width="17" height="12.5" rx="3"/><path d="M16 13.5h2"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7h7M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15v2.5"/>',
    chart: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    ucheck: '<circle cx="9.5" cy="8" r="3.5"/><path d="M3 20c.6-3.4 3.2-5.5 6.5-5.5 1.7 0 3.2.5 4.3 1.5M15.5 18l2 2 4-4.5"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    today: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    timetable: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    tasks: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12.5 3 3 5-6"/>',
    grades: '<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-4-3-6.2-4.5-9.7-.6 2.4-2 3.6-3.4 4.3C10.6 7 10 4.4 8.5 2 8 6.6 5 9 5 15.2 5 19.3 8 22 12 22z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', play: '<path d="M7 4.5v15l12-7.5z"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>', cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>', tick: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    exam: '<path d="M6 3h12M6 21h12M7 3v3.5c0 1.6 1 2.6 2.2 3.5L12 12l-2.8 2c-1.2.9-2.2 1.9-2.2 3.5V21M17 3v3.5c0 1.6-1 2.6-2.2 3.5L12 12l2.8 2c1.2.9 2.2 1.9 2.2 3.5V21"/>'
  };
  var LOGO = '<svg class="fx-mark" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="fxLg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--c1)"/><stop offset="1" stop-color="var(--c2)"/></linearGradient></defs><rect width="40" height="40" rx="12" fill="url(#fxLg)"/><path d="M9 13.5c3.6-1.6 7.3-1.6 11 .6 3.7-2.2 7.4-2.2 11-.6v14c-3.6-1.6-7.3-1.6-11 .6-3.7-2.2-7.4-2.2-11-.6z" fill="rgba(255,255,255,.22)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M20 14.1v14" stroke="#fff" stroke-width="2"/><path d="M29.5 5.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#fff"/></svg>';
  function ic(n, cls){ return '<svg class="fx-i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
  function esc(s){ return W.esc ? W.esc(s) : String(s == null ? '' : s); }
  function sp(){ return W.space || {}; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(x){ return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  function today(){ return ymd(new Date()); }
  function hm(m){ return pad(Math.floor(m / 60) % 24) + ':' + pad(Math.round(m % 60)); }
  function dayDiff(s){ var p = String(s).split('-'), a = new Date(+p[0], +p[1] - 1, +p[2]), n = new Date(); return Math.round((a - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); }
  function when(n){ return n < 0 ? (n === -1 ? 'متأخرة من أمس' : 'متأخرة ' + (-n) + ' يوم') : n === 0 ? 'اليوم' : n === 1 ? 'بكرة' : 'بعد ' + n + ' أيام'; }
  function dur(m){ return m >= 60 ? Math.floor(m / 60) + ' س' + (m % 60 ? ' و' + (m % 60) + ' د' : '') : m + ' د'; }
  function hue(n){ return W.courseHue ? W.courseHue(n) : 220; }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function on(){ return true; }   /* الواجهة القديمة أُلغيت كخيار (ملفاتها باقية للرجوع لو لزم) */
  function entries(){ return W.Schedule && W.Schedule.entries ? W.Schedule.entries() : []; }
  function place(e){ return W.Schedule && W.Schedule.place ? W.Schedule.place(e) : (e.room || ''); }
  function nowMin(){ var n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
  function empty(t, s){ return '<div class="fx-empty"><b>' + t + '</b>' + (s ? '<small>' + s + '</small>' : '') + '</div>'; }

  /* ---------- بيانات مشتركة ---------- */
  function openTasks(){ var t = today(); return (sp().tasks || []).filter(function(x){ return x && !x.done && x.due && x.due <= t; }).sort(function(a, b){ return a.due < b.due ? -1 : 1; }); }
  function upcomingExams(){ var t = today(); return (sp().exams || []).filter(function(x){ return x && x.date && x.date >= t; }).sort(function(a, b){ return a.date < b.date ? -1 : 1; }); }
  function courseGrades(){
    var g = sp().grades || [];
    return (sp().courses || []).filter(function(c){ return c && c.name && !c.completed; }).map(function(c){
      var it = ((g.filter(function(x){ return x && x.name === c.name; })[0] || {}).items || []), got = 0, of = 0;
      it.forEach(function(x){ var w = parseFloat(x.weight) || 0, s = parseFloat(x.score); if(w > 0 && isFinite(s)){ got += s; of += w; } });
      return { name: c.name, got: Math.round(got * 10) / 10, of: of, pct: of ? Math.round(got / of * 100) : null };
    });
  }
  function gpa(){ try{ var G = W.GRADES || {}, pts = 0, hrs = 0; (W.gpaRows || []).forEach(function(r){ var h = parseFloat(r.hrs) || 0; if(h > 0 && r.name){ pts += h * (G[r.grade] || 0); hrs += h; } }); return hrs ? { v: (pts / hrs).toFixed(2), h: hrs } : null; }catch(e){ return null; } }
  function streak(){ try{ return W.DayPlan ? W.DayPlan.streakInfo(new Date()).cur : 0; }catch(e){ return 0; } }

  /* ---------- مكوّنات ---------- */
  function taskRow(t){
    var n = t.due ? dayDiff(t.due) : null;
    return '<div class="fx-task' + (t.done ? ' done' : '') + (n !== null && n < 0 && !t.done ? ' late' : '') + '">' +
      '<button type="button" class="fx-check" role="checkbox" aria-checked="' + (t.done ? 'true' : 'false') + '" aria-label="' + esc((t.done ? 'إلغاء: ' : 'إنجاز: ') + t.title) + '" data-fx="tog" data-id="' + esc(t.id) + '">' + ic('tick') + '</button>' +
      '<span class="fx-tb"><b>' + esc(t.title) + (t.repeat ? ' <span class="fx-rep" title="' + (t.repeat === 'daily' ? 'يومية' : 'أسبوعية') + '">🔁</span>' : '') + '</b><small>' + (t.course ? esc(t.course) + ' · ' : '') + (t.done ? 'منجزة' : n === null ? 'بلا موعد' : when(n)) + '</small></span>' +
      (t.priority === 'high' && !t.done ? '<span class="fx-tag hot">مهم</span>' : '') + '<i class="fx-bar" style="--h:' + hue(t.course) + '"></i></div>';
  }
  function kpi(icon, label, val, sub){ return '<div class="fx-glass fx-kpi"><span class="fx-kic">' + ic(icon) + '</span><small>' + label + '</small><b class="fx-num" data-n="' + esc(val) + '">' + esc(val) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>'; }

  /* ---------- اليوم ---------- */

  /* «خطتي اليوم» بالتصميم الجديد — نفس بيانات/منطق DayPlan (cardHtml بينادى للأثر الجانبي: تحديث سجل السلسلة) */
  function planCard(now){
    var P = W.DayPlan; if(!P || !P.viewFor) return '';
    try{ P.cardHtml(now); }catch(e){}
    var v; try{ v = P.viewFor(today(), now); }catch(e){ return ''; }
    var st = streak(), head = '<h3>خطتي اليوم <span class="fx-pl-st">' + ic('flame') + st + '</span><button type="button" class="fx-link" data-fx="dpopen">الخطة كاملة</button></h3>';
    if(!v || !v.n) return '<div class="fx-glass fx-plan2">' + head + empty('ما في دراسة مطلوبة اليوم', 'استغلها براحة أو ضيف بند من الخطة الكاملة') + '</div>';
    var pct = Math.round((v.okN || 0) / v.n * 100);
    return '<div class="fx-glass fx-plan2' + (v.ok ? ' ok' : '') + '">' + head +
      '<div class="fx-pl-prog"><i style="width:' + pct + '%"></i></div><small class="fx-pl-sum">' + (v.ok ? 'خلّصت خطة اليوم 🎉' : 'خلّصت ' + (v.okN || 0) + ' من ' + v.n + ' مواد — بند واحد لكل مادة بيكفي') + '</small>' +
      v.courses.slice(0, 4).map(function(c){ var items = (c.items || []).slice(0, 3), done = (c.items || []).some(function(x){ return x.d; });
        return '<div class="fx-pl-c' + (done ? ' done' : '') + '" style="--h:' + hue(c.name) + '"><b>' + esc(c.name) + '</b>' + items.map(function(x){
          return '<button type="button" class="fx-pl-i' + (x.d ? ' on' : '') + '" data-fx="dpt" data-k="' + esc(x.k) + '" role="checkbox" aria-checked="' + (x.d ? 'true' : 'false') + '"><i>' + ic('tick') + '</i><span>' + esc(x.t) + '</span></button>'; }).join('') + '</div>'; }).join('') +
      (v.courses.length > 4 ? '<button type="button" class="fx-link fx-pl-more" data-fx="dpopen">+' + (v.courses.length - 4) + ' مواد كمان</button>' : '') + '</div>';
  }
  function coachH(){
    var C = W.Coach; if(!C || !C.suggest) return ''; var L; try{ L = C.suggest(new Date()); }catch(e){ return ''; }
    L = L.filter(function(x){ return !/^exam-/.test(x.id); }).slice(0, 1); if(!L.length) return '';
    return '<div class="fx-coach">' + L.map(function(x){ return '<div class="fx-cs ' + esc(x.tone || '') + '"><span class="fx-csi">' + esc(x.icon || '💡') + '</span><span class="fx-tb"><b>' + esc(x.title) + '</b><small>' + esc(x.why || '') + '</small></span>' +
      (x.act && x.act.label ? '<button type="button" class="fx-tool" data-fx="coach" data-v="' + esc(x.id) + '">' + esc(x.act.label) + '</button>' : '') + '<button type="button" class="fx-ib sm" data-fx="coachx" data-v="' + esc(x.id) + '" aria-label="إخفاء لليوم">✕</button></div>'; }).join('') + '</div>';
  }
  /* «الملخص الذكي»: أفضل فراغ اليوم (≥40 د بين المحاضرات أو بعدها لحد 9 م) + شو الأهم تذاكره فيه — محلي بالكامل */
  function smartBrief(list, nm, ex, open){
    var END = 21 * 60, gaps = [], t = Math.max(nm, 8 * 60);
    list.forEach(function(e){ if(e.end <= t) return; if(e.start - t >= 40) gaps.push([t, e.start]); t = Math.max(t, e.end + 10); });
    if(END - t >= 40) gaps.push([t, Math.min(END, t + 90)]);
    var g = gaps[0]; if(!g) return '';
    var ex7 = ex.filter(function(x){ return dayDiff(x.date) <= 7; })[0], late = open.filter(function(x){ return x.due && dayDiff(x.due) < 0; })[0], todayT = open.filter(function(x){ return x.due && dayDiff(x.due) === 0; })[0];
    var what, course = '';
    if(ex7){ what = 'راجع لـ«' + (ex7.name || 'الامتحان') + '» (' + when(dayDiff(ex7.date)) + ')'; course = ex7.course || ''; }
    else if(late){ what = 'خلّص «' + late.title + '» — متأخرة'; course = late.course || ''; }
    else if(todayT){ what = 'خلّص «' + todayT.title + '» — آخر موعد اليوم'; course = todayT.course || ''; }
    else { var nx = list.filter(function(e){ return e.start >= g[1]; })[0]; what = nx ? 'حضّر لمحاضرة ' + nx.name : 'راجع محاضرات اليوم وثبّتها'; course = nx ? nx.name : ''; }
    var len = g[1] - g[0], now = g[0] <= nm + 5;
    return '<div class="fx-brief"><span class="fx-brief-ic">' + ic('spark') + '</span><span class="fx-brief-t"><small>' + (now ? 'هسا عندك فراغ' : 'أفضل وقت تذاكر اليوم') + '</small><b><span dir="ltr">' + hm(g[0]) + ' – ' + hm(g[1]) + '</span> · ' + dur(len) + '</b><em>' + esc(what) + '</em></span>' +
      '<span class="fx-brief-a"><button type="button" class="fx-nbtn p" data-fx="study"' + (course ? ' data-c="' + esc(course) + '"' : '') + '>' + ic('play') + (now ? 'ابدأ هسا' : 'ابدأ') + '</button><button type="button" class="fx-nbtn g" data-fx="askai" data-v="خطّطلي باقي يومي">' + ic('spark') + 'خطّطلي</button></span></div>';
  }
  /* فتح المساعد وإرسال سؤال (بيحمّل المساعد لو لسا ما تحمّل) */
  function askAI(text){ if(W.Assistant) W.Assistant.open(text || ''); }
  function vToday(){
    var now = new Date(), nm = nowMin(), list = entries().filter(function(e){ return e.dayIdx === now.getDay(); }).sort(function(a, b){ return a.start - b.start; });
    var curL = list.filter(function(e){ return nm >= e.start && nm < e.end; })[0], next = list.filter(function(e){ return e.start > nm; })[0];
    var tasks = openTasks(), ex = upcomingExams(), st = streak(), doneT = (sp().tasks || []).filter(function(x){ return x.done && x.completedAt === today(); }).length;
    var pv = null; try{ pv = W.DayPlan && W.DayPlan.viewFor ? W.DayPlan.viewFor(today(), now) : null; }catch(e){}
    var pN = pv && pv.n || 0, pOk = pv && pv.okN || 0, tot = pN + tasks.length + doneT, dn = pOk + doneT, pItem = null;
    if(pv && pv.courses) pv.courses.some(function(c){ var its = c.items || []; if(its.some(function(x){ return x.d; })) return false; if(its[0]){ pItem = { c: c.name, t: its[0].t, k: its[0].k }; return true; } return false; });
    var hr = now.getHours(), greet = hr < 12 ? 'صباح الخير' : hr < 18 ? 'نهارك سعيد' : 'مساء الخير';
    var nx;
    function nbtn(cls, fx, txt, extra){ return '<button type="button" class="fx-nbtn ' + cls + '" data-fx="' + fx + '"' + (extra || '') + '>' + txt + '</button>'; }
    if(curL || (next && next.start - nm <= 45)){ var Lc = curL || next, att = null;
      try{ var TL = W.TodayLogic, tg = TL && W.Schedule ? TL.attendTarget(W.Schedule.status()) : null; if(tg && tg.name === Lc.name){ var ak = tg.name + '|' + TL.lecStartMs(tg); att = { name: tg.name, key: ak, done: TL.attKeys().indexOf(ak) > -1 }; } }catch(e){}
      nx = '<div class="fx-next" style="--h:' + hue(Lc.name) + '"><small>' + (curL ? 'جارية الآن · باقي ' + dur(curL.end - nm) : 'حصتك الجاية بعد ' + dur(next.start - nm)) + '</small><h2>' + esc(Lc.name) + '</h2><span class="fx-nm"><span dir="ltr">' + hm(Lc.start) + ' – ' + hm(Lc.end) + '</span>' + (place(Lc) ? ' · ' + esc(place(Lc)) : '') + '</span>' +
        (curL ? '<i class="fx-prog"><i style="width:' + Math.round((nm - curL.start) / (curL.end - curL.start) * 100) + '%"></i></i>' : '') +
        (att && att.done ? '<span class="fx-nm fx-attok">✔ سُجّل حضورك</span>' : '') +
        '<div class="fx-nact">' + (att && !att.done ? nbtn('p', 'attnow', ic('tick') + 'حضرت', ' data-n="' + esc(att.name) + '" data-k="' + esc(att.key) + '"') + nbtn('g', 'course', 'المادة', ' data-n="' + esc(Lc.name) + '"') : nbtn('p', 'course', 'افتح المادة', ' data-n="' + esc(Lc.name) + '"') + nbtn('g', 'study', ic('play') + 'تركيز')) + '</div></div>';
    } else if(pItem){
      nx = '<div class="fx-next" style="--h:' + hue(pItem.c) + '"><small>خطوتك الجاية</small><h2>' + esc(pItem.t) + '</h2><span class="fx-nm">' + esc(pItem.c) + ' · 25 دقيقة تكفي</span>' +
        '<div class="fx-nact">' + nbtn('p', 'study', ic('play') + 'ابدأ هلق', ' data-k="' + esc(pItem.k) + '" data-c="' + esc(pItem.c) + '"') + nbtn('g', 'dpt', ic('tick') + 'خلصت', ' data-k="' + esc(pItem.k) + '"') + '</div></div>';
    } else if(tasks[0]){ var T0 = tasks[0];
      nx = '<div class="fx-next" style="--h:' + hue(T0.course) + '"><small>مهمة مستحقة</small><h2>' + esc(T0.title) + '</h2><span class="fx-nm">' + (T0.course ? esc(T0.course) + ' · ' : '') + when(dayDiff(T0.due)) + '</span>' +
        '<div class="fx-nact">' + nbtn('p', 'study', ic('play') + 'ابدأ هلق') + nbtn('g', 'tog', ic('tick') + 'خلصت', ' data-id="' + esc(T0.id) + '"') + '</div></div>';
    } else {
      nx = '<div class="fx-next ok"><small>' + (tot ? 'خلّصت يومك' : 'يوم هادي') + '</small><h2>' + (tot ? 'شغل ممتاز، ريّح بالك' : 'ما عليك إشي اليوم') + '</h2><span class="fx-nm">' + (ex[0] ? 'أقرب امتحان: ' + esc(ex[0].name) + ' ' + when(dayDiff(ex[0].date)) : 'استغل الوقت بجلسة تركيز أو ضيف مهمة') + '</span>' +
        '<div class="fx-nact">' + nbtn('p', 'study', ic('play') + 'جلسة تركيز') + nbtn('g', 'addtask', ic('plus') + 'مهمة') + '</div></div>';
    }
    /* أقسام بسطور (تصميم الشريط الجانبي): جدول اليوم · المهام · الامتحانات */
    function sec(title, right, body){ return '<section class="fx-sec"><h3><span>' + title + '</span>' + (right || '') + '</h3>' + body + '</section>'; }
    var ttH = list.length ? list.map(function(e){ var s = nm >= e.end ? ' past' : nm >= e.start ? ' now' : '';
        return '<button type="button" class="fx-ln' + s + '" data-fx="course" data-n="' + esc(e.name) + '"><span class="fx-lt2" dir="ltr">' + hm(e.start) + ' – ' + hm(e.end) + '</span><i class="fx-dot" style="--h:' + hue(e.name) + '"></i><span class="fx-lnt">' + esc(e.name) + (s === ' now' ? ' <em class="fx-nowb">الآن</em>' : '') + '</span><span class="fx-lnw">' + esc(place(e)) + '</span></button>'; }).join('')
      : '<p class="fx-lnempty">ما في محاضرات اليوم</p>';
    var allOpen = (sp().tasks || []).filter(function(x){ return x && x.title && !x.done; }).sort(function(a, b){ return (a.due || '9') < (b.due || '9') ? -1 : 1; });
    var tkH = allOpen.length ? allOpen.slice(0, 6).map(function(t){ var n = t.due ? dayDiff(t.due) : null;
        return '<div class="fx-ln fx-lntask"><button type="button" class="fx-ck" role="checkbox" aria-checked="false" aria-label="' + esc('إنجاز: ' + t.title) + '" data-fx="tog" data-id="' + esc(t.id) + '"></button><span class="fx-lnt">' + esc(t.title) + (t.repeat ? ' <span class="fx-rep">🔁</span>' : '') + '</span>' + (t.course ? '<span class="fx-lntag">' + esc(t.course) + '</span>' : '') + '<span class="fx-lnw' + (n !== null && n < 0 ? ' late' : n === 0 ? ' soon' : '') + '">' + (n === null ? 'بلا موعد' : when(n)) + '</span></div>'; }).join('')
      : '<p class="fx-lnempty">ما عليك مهام مفتوحة 🎉</p>';
    var semG = semGpa();
    var exH = ex.length ? ex.slice(0, 4).map(function(x){ var n = dayDiff(x.date);
        return '<button type="button" class="fx-ln' + (n <= 7 ? ' fx-exrow' : '') + '" data-fx="go" data-v="exams">' + ic('exam') + '<span class="fx-lnt">' + esc(x.name || 'امتحان') + '</span>' + (x.course ? '<span class="fx-lntag">' + esc(x.course) + '</span>' : '') + '<span class="fx-lnw' + (n <= 3 ? ' soon' : '') + '">' + when(n) + '</span></button>'; }).join('')
      : '<p class="fx-lnempty">ما في امتحانات قادمة</p>';
    var lateN = allOpen.filter(function(t){ return t.due && dayDiff(t.due) < 0; }).length;
    var summary = (list.length ? 'عندك ' + list.length + (list.length === 1 ? ' محاضرة' : ' محاضرات') + ' اليوم' : 'ما في محاضرات اليوم') + (lateN ? '، و' + (lateN === 1 ? 'مهمة متأخرة وحدة' : lateN + ' مهام متأخرة') : '') + '.';
    var nm1 = ((sp().profile || {}).name || '').split(' ')[0];
    var head = '<div class="fx-hello"><small>' + DA[now.getDay()] + '، ' + now.getDate() + '/' + (now.getMonth() + 1) + '</small><b>' + greet + (nm1 ? '، ' + esc(nm1) : '') + '</b><p class="fx-sum">' + summary + ' <span class="fx-hst">' + ic('flame') + st + (st === 1 ? ' يوم' : ' أيام') + '</span></p></div>';
    return head +
      '<div class="fx-trow">' + nx + planCard(now) + '</div>' + smartBrief(list, nm, ex, allOpen) + coachH() +
      sec('جدول اليوم', '<button type="button" class="fx-link" data-fx="go" data-v="timetable">' + (list.length ? list.length + (list.length === 1 ? ' محاضرة' : ' محاضرات') + ' · ' : '') + 'الأسبوع</button>', ttH) +
      sec('المهام', '<button type="button" class="fx-link" data-fx="go" data-v="tasks">' + (allOpen.length ? allOpen.length + ' مفتوحة · ' : '') + 'الكل</button>', tkH) +
      sec('الامتحانات القادمة', '<span class="fx-secr">' + (semG ? 'المعدل المتوقع ' + semG.v : '') + '</span>', exH);
  }

  /* ---------- الجدول: شبكة الأسبوع (كمبيوتر) + يوم بيوم (تلفون) ---------- */
  function tool(fx, label, fn, danger){ return '<button type="button" class="fx-tool' + (danger ? ' danger' : '') + '" data-fx="' + fx + '"' + (fn ? ' data-v="' + fn + '"' : '') + '>' + label + '</button>'; }
  /* جدول المذاكرة المقترح (StudyPlan): جلسات على فراغاتك بين المحاضرات، الأقرب امتحاناً أولاً */
  function spBox(){
    var SP = W.StudyPlan; if(!SP || !SP.build) return '';
    var p; try{ p = SP.build(); }catch(e){ return ''; } var c = p.cfg || {}, t = today();
    var td = (p.days || []).filter(function(x){ return x.date === t; })[0], n = td && !td.off ? td.items.length : 0;
    var sum = !c.on ? 'مطفي' : !p.courses ? 'أضف موادك أول' : td && td.off ? 'اليوم راحة' : n ? 'اليوم ' + n + (n === 1 ? ' جلسة' : ' جلسات') + ' · أولها ' + td.items[0].start : 'ما في جلسات اليوم';
    var body = !c.on ? '<p class="fx-note">الجدول مطفي.</p>' : !p.courses ? '<p class="fx-note">ما عندك مواد مسجّلة.</p>' : (p.days || []).slice(0, 4).map(function(x){
      var dt = new Date(x.date + 'T00:00:00');
      return '<div class="fx-spd' + (x.date === t ? ' today' : '') + '"><b>' + DA[x.dow] + ' ' + dt.getDate() + '/' + (dt.getMonth() + 1) + '</b>' + (x.off ? '<small>راحة</small>' : x.items.length ? x.items.map(function(it){ return '<span class="fx-spi' + (it.urgent ? ' hot' : '') + '" style="--h:' + hue(it.course) + '"><em dir="ltr">' + esc(it.start) + '</em>' + esc(it.course) + '</span>'; }).join('') : '<small>فاضي</small>') + '</div>';
    }).join('');
    return '<details class="fx-glass fx-fold fx-sp"' + (lsGet('ss_fx_sp') === '1' ? ' open' : '') + '><summary>جدول المذاكرة المقترح · <b>' + esc(sum) + '</b></summary>' + body +
      '<div class="fx-tools">' + tool('spcfg', 'إعدادات') + tool('sptog', c.on ? 'إيقاف' : 'تشغيل') + '</div></details>';
  }
  function vTimetable(){
    var all = entries(), nowD = new Date().getDay(), nm = nowMin(), days = [0, 1, 2, 3, 4, 5, 6].filter(function(i){ return i < 5 || all.some(function(e){ return e.dayIdx === i; }); });
    if(!all.length) return '<div class="fx-glass">' + empty('ما في محاضرات بجدولك', 'أضف جدولك مرة وحدة وبيضل معك كل الفصل') + '<div class="fx-actions"><button type="button" class="fx-btn" data-fx="addclass">' + ic('plus') + 'إضافة الجدول</button>' + (W.OcrImport ? '<button type="button" class="fx-btn ghost" data-fx="ocr">' + ic('camera') + 'من صورة</button><button type="button" class="fx-btn ghost fx-only-narrow" data-fx="ocrcam" aria-label="تصوير الجدول">' + ic('camera') + '</button>' : '') + '</div><small class="fx-note">صوّر جدولك أو الصق صورته (Ctrl+V) وبنعبّيه عنك</small></div>';
    var MON = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
    function dOf(i){ var x = new Date(); x.setDate(x.getDate() + (i - nowD)); return x; }
    var d0 = dOf(days[0]), d1 = dOf(days[days.length - 1]), mins = all.reduce(function(t, e){ return t + (e.end - e.start); }, 0);
    var range = d0.getDate() + (d0.getMonth() !== d1.getMonth() ? ' ' + MON[d0.getMonth()] : '') + ' – ' + d1.getDate() + ' ' + MON[d1.getMonth()];
    var acts = '<button type="button" class="fx-btn sm" data-fx="addclass">' + ic('plus') + 'إضافة / تعديل</button>' + (W.OcrImport ? '<button type="button" class="fx-btn ghost sm" data-fx="ocr">' + ic('camera') + 'من صورة</button>' : '');
    var more = '<span class="fx-ttmore"><button type="button" class="fx-ttbtn" data-fx="ttmenu" aria-haspopup="menu" aria-expanded="false" aria-label="خيارات أكثر" title="خيارات أكثر">⋯</button></span>';
    var bar = '<div class="fx-calbar"><div class="fx-calr"><b>' + range + '</b><small>' + all.length + ' محاضرة بالأسبوع · ' + dur(mins) + '</small></div><span class="fx-calact fx-only-wide">' + acts + more + '</span></div>';
    /* الكمبيوتر: لوحة أسبوعية مضغوطة — عمود لكل يوم، محاضراته بالترتيب كبطاقات، والفراغ بينهم كسطر صغير (بدون شبكة ساعات طويلة) */
    var grid = '<div class="fx-wk" style="--cols:' + days.length + '">' + days.map(function(i){
      var de = all.filter(function(e){ return e.dayIdx === i; }).sort(function(a, b){ return a.start - b.start; }), isT = i === nowD, prevEnd = null, mins2 = de.reduce(function(t, e){ return t + (e.end - e.start); }, 0);
      var cards = de.map(function(e){
        var st = isT ? (nm >= e.end ? ' done' : nm >= e.start ? ' now' : '') : '', gap = prevEnd !== null && e.start - prevEnd >= 30 ? '<div class="fx-wkgap">استراحة ' + dur(e.start - prevEnd) + '</div>' : ''; prevEnd = e.end;
        return gap + '<button type="button" class="fx-wkc' + st + '" style="--h:' + hue(e.name) + '" data-fx="course" data-n="' + esc(e.name) + '" title="' + esc(e.name) + '"><span class="fx-wkt">⁦' + hm(e.start) + ' – ' + hm(e.end) + '⁩</span><b>' + esc(e.name) + '</b>' + (place(e) ? '<small>' + esc(place(e)) + '</small>' : '') + (st === ' now' ? '<em class="fx-nowb">الآن</em>' : '') + '</button>';
      }).join('');
      return '<section class="fx-wkd' + (isT ? ' today' : '') + (i < nowD ? ' past' : '') + '"><header><span><small>' + DA[i] + '</small><b>' + dOf(i).getDate() + '</b></span><i title="' + (de.length ? dur(mins2) : '') + '">' + (de.length === 1 ? 'محاضرة' : de.length === 2 ? 'محاضرتين' : de.length ? de.length + ' محاضرات' : 'فاضي') + '</i></header>' +
        (cards || '<div class="fx-wkfree">يوم فاضي ✨</div>') + '</section>';
    }).join('') + '</div>';
    /* التلفون: شريط أيام بأرقام التواريخ + محاضرات اليوم المختار كخط زمني */
    var list = all.filter(function(e){ return e.dayIdx === ttDay; }).sort(function(a, b){ return a.start - b.start; });
    var mobile = '<div class="fx-mdays">' + days.map(function(i){ var n = all.filter(function(e){ return e.dayIdx === i; }).length; return '<button type="button" class="fx-mday' + (i === ttDay ? ' on' : '') + (i === nowD ? ' today' : '') + '" data-fx="day" data-v="' + i + '"><small>' + DA[i].replace('ال', '') + '</small><b>' + dOf(i).getDate() + '</b><i>' + (n ? new Array(Math.min(n, 4) + 1).join('•') : '') + '</i></button>'; }).join('') + '</div>' +
      (list.length ? '<div class="fx-mlist">' + list.map(function(e){ var st = ttDay === nowD ? (nm >= e.end ? ' done' : nm >= e.start ? ' now' : '') : '';
          return '<button type="button" class="fx-mrow' + st + '" style="--h:' + hue(e.name) + '" data-fx="course" data-n="' + esc(e.name) + '"><span class="fx-mt" dir="ltr"><b>' + hm(e.start) + '</b><small>' + hm(e.end) + '</small></span><span class="fx-mc"><b>' + esc(e.name) + (st === ' now' ? ' <em class="fx-nowb">الآن</em>' : '') + '</b><small>' + dur(e.end - e.start) + (place(e) ? ' · ' + esc(place(e)) : '') + '</small></span></button>'; }).join('') + '</div>'
        : '<div class="fx-mempty">' + empty('ما في محاضرات ' + DA[ttDay], 'يوم فاضي — مناسب لجلسة مذاكرة') + '</div>');
    return bar + '<div class="fx-only-wide">' + grid + '</div><div class="fx-only-narrow">' + mobile + '<div class="fx-actions">' + acts + more + '</div></div>' +
      spBox();
  }

  /* ---------- المهام والعلامات (مرحلة 2 بتطوّرهم) ---------- */
  function vTasks(){
    var t = today(), all = (sp().tasks || []).filter(function(x){ return x && x.title; });
    var late = all.filter(function(x){ return !x.done && x.due && x.due < t; }), td = all.filter(function(x){ return !x.done && x.due === t; }),
      nx = all.filter(function(x){ return !x.done && (!x.due || x.due > t); }).sort(function(a, b){ return (a.due || '9') < (b.due || '9') ? -1 : 1; }), dn = all.filter(function(x){ return x.done; }).slice(-8).reverse();
    function col(title, list, cls, drop){ return '<div class="fx-glass fx-kcol ' + (cls || '') + '"' + (drop ? ' data-drop="' + drop + '"' : '') + '><h3>' + title + ' <small>' + list.length + '</small></h3>' + (list.length ? list.map(taskRow).join('') : empty(drop ? 'اسحب مهمة لهون' : 'فاضي')) + '</div>'; }
    return '<form class="fx-glass fx-add" data-fx="quickadd"><input type="text" maxlength="120" placeholder="مهمة جديدة… «واجب شبكات بكرة»" aria-label="مهمة جديدة" aria-describedby="fxAddCnt"><button type="submit" aria-label="إضافة">' + ic('plus') + '</button><small class="fx-addcnt" id="fxAddCnt" aria-live="polite"></small></form>' +
      '<div class="fx-kanban">' + col('متأخرة', late, 'late') + col('اليوم', td, '', 'today') + col('الجاية', nx, '', 'next') + col('منجزة مؤخراً', dn, 'done', 'done') + '</div>' +
      '<p class="fx-hint fx-only-wide">💡 اسحب المهمة بين الأعمدة: لـ«اليوم» = موعدها اليوم، لـ«الجاية» = بكرة، لـ«منجزة» = خلصت.</p>';
  }
  /* سحب المهام بين الأعمدة (كمبيوتر) — بيعدّل الموعد/الإنجاز عبر نفس بيانات المهمة */
  function bindDrag(main){
    main.querySelectorAll('.fx-kanban .fx-task').forEach(function(r){ var b = r.querySelector('[data-id]'); if(!b) return; r.draggable = true; r.addEventListener('dragstart', function(e){ e.dataTransfer.setData('text/plain', b.getAttribute('data-id')); r.classList.add('drag'); }); r.addEventListener('dragend', function(){ r.classList.remove('drag'); }); });
    main.querySelectorAll('[data-drop]').forEach(function(c){
      c.addEventListener('dragover', function(e){ e.preventDefault(); c.classList.add('over'); });
      c.addEventListener('dragleave', function(){ c.classList.remove('over'); });
      c.addEventListener('drop', function(e){ e.preventDefault(); c.classList.remove('over'); var id = e.dataTransfer.getData('text/plain'), t = (sp().tasks || []).filter(function(x){ return String(x.id) === id; })[0]; if(!t) return;
        var to = c.getAttribute('data-drop'), tm = new Date(); tm.setDate(tm.getDate() + 1);
        if(to === 'done'){ if(!t.done && W.toggleTask) W.toggleTask(t.id); return soon(); }
        if(t.done && W.toggleTask) W.toggleTask(t.id);
        t.due = to === 'today' ? today() : ymd(tm); if(W.saveSpace) W.saveSpace(); if(W.renderAll) try{ W.renderAll(); }catch(err){} soon(); });
    });
  }
  /* «شو لازم أجيب بالفاينل»: الباقي = 100 − المحسوب، والمطلوب لكل حدّ = الحد − اللي جمعته */
  function needLine(x){
    if(!x.of || x.of >= 100) return '';
    var left = 100 - x.of, out = [[90, 'A'], [80, 'B'], [70, 'C']].map(function(g){ var n = Math.max(0, g[0] - x.got); return n > left ? null : '<span class="fx-need"><b>' + g[1] + '</b> لازم ' + (Math.round(n * 10) / 10) + ' من ' + left + '</span>'; }).filter(Boolean);
    return '<div class="fx-needs">' + (out.length ? out.join('') : '<span class="fx-need low">ركّز على اللي باقي — الحدود العالية صعبة</span>') + '</div>';
  }
  function impBtn(t){ return W.ExamImport ? '<button type="button" class="fx-btn ghost" data-fx="eximp">' + (t || '📷 من صورة') + '</button>' : ''; }
  /* المعدل المتوقع للفصل: نسبة كل مادة من علاماتها لحد هلق ← حرف (سلّم الجامعة) ← نقاط × ساعات */
  var SCALE = [[90, 'A', 4], [85, 'A-', 3.75], [80, 'B+', 3.5], [75, 'B', 3], [70, 'B-', 2.75], [65, 'C+', 2.5], [60, 'C', 2], [55, 'C-', 1.75], [50, 'D+', 1.5], [45, 'D', 1], [0, 'F', 0]];
  function letter(p){ for(var i = 0; i < SCALE.length; i++) if(p >= SCALE[i][0]) return SCALE[i]; return SCALE[SCALE.length - 1]; }
  function semGpa(){
    var hrsOf = {}; (sp().courses || []).forEach(function(c){ if(c && c.name) hrsOf[c.name] = parseFloat(c.hours) || 3; });
    var pts = 0, h = 0, list = [];
    courseGrades().forEach(function(x){ if(x.pct === null || !x.of) return; var L = letter(x.pct), hh = hrsOf[x.name] || 3; pts += L[2] * hh; h += hh; list.push({ name: x.name, pct: x.pct, l: L[1], of: x.of }); });
    return h ? { v: (pts / h).toFixed(2), h: h, list: list } : null;
  }
  function gpaHero(g, sg){
    if(!g && !sg) return '';
    var cum = null;
    if(g && sg){ var cur = {}; (sp().courses || []).forEach(function(c){ if(c && !c.completed) cur[c.name] = 1; });
      var overlap = (W.gpaRows || []).some(function(r){ return r && cur[r.name]; });
      if(!overlap) cum = ((+g.v * g.h + +sg.v * sg.h) / (g.h + sg.h)).toFixed(2); }
    return '<div class="fx-gpa">' + (sg ? '<div class="fx-gpa-b main"><small>معدلك المتوقع هالفصل</small><b>' + sg.v + '</b><span>من علاماتك لحد هلق · ' + sg.h + ' ساعة</span></div>' : '') +
      (cum ? '<div class="fx-gpa-b"><small>التراكمي المتوقع</small><b>' + cum + '</b><span>مع المواد اللي خلصتها</span></div>' : g ? '<div class="fx-gpa-b"><small>المعدل (حاسبة المعدل)</small><b>' + g.v + '</b><span>' + g.h + ' ساعة</span></div>' : '') + '</div>';
  }
  function vGrades(){
    var g = gpa(), rows = courseGrades(), sg = semGpa();
    return gpaHero(g, sg) +
      '<div class="fx-cards">' + (rows.length ? rows.map(function(x){ var p = x.pct === null ? 0 : x.pct;
        return '<button type="button" class="fx-glass fx-gcard" style="--h:' + hue(x.name) + '" data-fx="course" data-n="' + esc(x.name) + '" data-sec="grades"><span class="fx-ring" style="--p:' + p + '"><b>' + (x.pct === null ? '—' : x.pct + '%') + '</b></span><span class="fx-tb"><b>' + esc(x.name) + (x.pct !== null && x.of ? ' <em class="fx-let">' + letter(x.pct)[1] + '</em>' : '') + '</b><small>' + (x.of ? 'جمعت ' + x.got + ' من ' + x.of + ' · باقي ' + (100 - x.of) : 'لسا ما في علامات') + '</small>' + needLine(x) + '</span></button>'; }).join('') : empty('أضف موادك أول')) + '</div>' +
      '<div class="fx-actions">' + impBtn('📷 علامات من صورة') + '<button type="button" class="fx-btn ghost" data-fx="go" data-v="gpa">' + ic('grades') + 'حاسبة المعدل</button></div>';
  }
  /* «المزيد»: بلاطات بلون لكل ميزة + رقم حي صغير من بياناتك (بدون أي كتابة) */
  function moreInfo(k){
    try{
      var s = sp(), t = today();
      if(k === 'courses'){ var n = (s.courses || []).filter(function(c){ return c && c.name && !c.completed; }).length; return n ? n + ' مواد هالفصل' : 'أضف موادك'; }
      if(k === 'exams'){ var ex = upcomingExams()[0]; if(!ex) return 'ما في امتحانات'; var dd = Math.round((new Date(ex.date + 'T00:00') - new Date(t + 'T00:00')) / 864e5); return dd <= 0 ? 'امتحان اليوم' : dd === 1 ? 'امتحان بكرة' : 'الجاي بعد ' + dd + ' أيام'; }
      if(k === 'attendance'){ var P = 0, A = 0; Object.keys(s.attendance || {}).forEach(function(n){ var o = attOf(n); P += o.p; A += o.a; }); return P + A ? 'حضورك ⁦' + Math.round(P / (P + A) * 100) + '%⁩' : 'سجّل حضورك'; }
      if(k === 'budget'){ var m = t.slice(0, 7), sum = 0; (s.budget || []).forEach(function(x){ if(x && x.type === 'expense' && String(x.date || '').slice(0, 7) === m) sum += +x.amount || 0; }); return sum ? 'صرفت ' + money(sum) + ' هالشهر' : 'ما في مصاريف هالشهر'; }
      if(k === 'gpa'){ var g = semGpa(); return g ? 'المتوقع ' + g.v : 'احسب معدلك'; }
      if(k === 'plan'){ var dn = W.getCompletedCourses ? W.getCompletedCourses() : {}, hrs = 0; Object.keys(dn).forEach(function(n){ var c = W.searchCourses ? (W.searchCourses(n) || [])[0] : null; hrs += c && c.name === n ? (+c.hours || 3) : 3; }); return hrs ? hrs + ' من 160 ساعة' : 'خطتك وشجرة المواد'; }
      if(k === 'timer') return 'جلسة تركيز';
      if(k === 'stats') return 'أسبوعك بالأرقام';
      if(k === 'prayer') return 'أوقات اليوم';
      if(k === 'hulinks') return 'بوابة الطالب وMoodle';
      if(k === 'campus') return 'وين محاضرتك';
    }catch(e){}
    return '';
  }
  /* اختيار الثيم (لوحات PAL) — بيستعمله «المزيد» والإعدادات والجولة */
  function palHtml(){
    return '<div class="fx-pals">' + PAL.map(function(P){ var on = curPal()[0] === P[0], dk = root && !root.classList.contains('light'), c = dk ? P[2] : P[3]; return '<button type="button" class="fx-pal' + (on ? ' on' : '') + '" data-fx="pal" data-v="' + P[0] + '" aria-pressed="' + on + '" style="--p0:' + c[0] + ';--p1:' + c[1] + ';--p2:' + c[2] + ';--pa:' + c[8] + '"><span class="fx-palsw"><i></i><i></i><i></i></span><b>' + esc(P[1]) + '</b></button>'; }).join('') + '</div>';
  }
  function modeHtml(){ var mode = lsGet('ss_fx_mode') || 'auto';
    return '<div class="fx-seg" role="group" aria-label="الوضع">' + [['auto', 'تلقائي'], ['dark', 'غامق'], ['light', 'فاتح']].map(function(m){ return '<button type="button" class="' + (mode === m[0] ? 'on' : '') + '" data-fx="mode" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>'; }
  function vMore(){
    var mine = [['courses', 'book', 'موادي', 250], ['exams', 'exam', 'الامتحانات', 28], ['attendance', 'ucheck', 'الحضور', 150], ['timer', 'clock', 'مؤقت التركيز', 330], ['budget', 'wallet', 'الميزانية', 45], ['gpa', 'calc', 'حاسبة المعدل', 275], ['stats', 'chart', 'إحصائياتي', 195], ['prayer', 'moon', 'مواقيت الصلاة', 170], ['plan', 'route', 'الخطة الدراسية', 300], ['hulinks', 'link', 'روابط الجامعة', 210], ['campus', 'pin', 'خريطة الجامعة', 0]];
    var mode = lsGet('ss_fx_mode') || 'auto', th = curTheme()[0];
    return '<div class="fx-tiles">' + mine.map(function(x){ return '<button type="button" class="fx-glass fx-tile" style="--h:' + x[3] + '" data-fx="go" data-v="' + x[0] + '"><span class="fx-tic">' + ic(x[1]) + '</span><b>' + x[2] + '</b><small>' + esc(moreInfo(x[0])) + '</small></button>'; }).join('') + '</div>' +
      '<div class="fx-glass"><h3>المظهر</h3><div class="fx-seg">' + [['auto', 'تلقائي'], ['dark', 'غامق'], ['light', 'فاتح']].map(function(m){ return '<button type="button" class="' + (mode === m[0] ? 'on' : '') + '" data-fx="mode" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>' +
      '<details class="fx-thfold"><summary>الثيم · <b>' + esc(curPal()[1]) + '</b></summary>' + palHtml() + '</details></div>' +
      '<div class="fx-glass fx-menu"><button type="button" data-fx="go" data-v="settings">' + ic('gear') + '<span>الإعدادات والمزامنة</span><i>←</i></button></div>';
  }

  /* ---------- الدفعة 1: المواد · الامتحانات · الحضور (أصلية بالتصميم الجديد) ---------- */
  function attOf(n){ var a = (sp().attendance || {})[n] || {}, p = +a.present || 0, b = +a.absent || 0; return { p: p, a: b, t: p + b, pct: p + b ? Math.round(p / (p + b) * 100) : null }; }
  function sub(title, back){ return '<button type="button" class="fx-link fx-backlink" data-fx="go" data-v="' + (back || 'more') + '">→ ' + title + '</button>'; }
  function healthTag(n){ if(!W.Coach || !W.Coach.health) return ''; var h; try{ h = W.Coach.health(n, new Date()); }catch(e){ return ''; } if(h.level === 'good') return ''; return '<span class="fx-hl ' + h.level + '" title="' + esc(h.reasons.join(' · ')) + '">' + (h.level === 'risk' ? 'تحتاج تدخّل' : 'انتبه') + '</span>'; }
  function vCourses(){
    var cs = (sp().courses || []).filter(function(c){ return c && c.name; }), gr = {}; courseGrades().forEach(function(g){ gr[g.name] = g; });
    var ex = upcomingExams(), tk = (sp().tasks || []).filter(function(t){ return t && !t.done; });
    var act = cs.filter(function(c){ return !c.completed; }), done = cs.filter(function(c){ return c.completed; });
    function card(c){
      var a = attOf(c.name), g = gr[c.name], e = ex.filter(function(x){ return x.course === c.name; })[0], n = tk.filter(function(t){ return t.course === c.name; }).length;
      return '<button type="button" class="fx-glass fx-ccard" style="--h:' + hue(c.name) + '" data-fx="course" data-n="' + esc(c.name) + '"><span class="fx-chead"><span class="fx-cdot">' + esc(String(c.name).trim().charAt(0)) + '</span><span class="fx-tb"><b>' + esc(c.name) + '</b><small>' + (c.code ? esc(c.code) + ' · ' : '') + (c.hours ? c.hours + ' ساعات' : 'مادة') + '</small></span>' + healthTag(c.name) + '</span>' +
        '<span class="fx-cstats"><span><b>' + (g && g.pct !== null ? g.pct + '%' : '—') + '</b><small>علامات</small></span><span><b>' + (a.pct === null ? '—' : a.pct + '%') + '</b><small>حضور</small></span><span><b>' + n + '</b><small>مهام</small></span></span>' +
        (e ? '<span class="fx-tag">' + esc(e.name || 'امتحان') + ' · ' + when(dayDiff(e.date)) + '</span>' : '') + '</button>';
    }
    return '<div class="fx-actions"><button type="button" class="fx-btn" data-fx="call" data-v="addMyCourse">' + ic('plus') + 'مادة جديدة</button></div>' +
      '<div class="fx-tools">' + (W.openUploadHub ? tool('fn', 'رفع ملفات', 'openUploadHub') : '') + (W.openSemesterArchive ? tool('fn', 'أرشيف الفصول', 'openSemesterArchive') : '') + (W.closeSemester ? tool('fn', 'إغلاق الفصل', 'closeSemester', 1) : '') + '</div>' +
      '<div class="fx-cards">' + (act.length ? act.map(card).join('') : empty('ما في مواد لسا', 'أضف مادتك الأولى أو استورد جدولك')) + '</div>' +
      (done.length ? '<details class="fx-glass fx-fold"><summary>مواد مكتملة (' + done.length + ')</summary><div class="fx-cards">' + done.map(card).join('') + '</div></details>' : '');
  }
  function vExams(){
    var t = today(), all = (sp().exams || []).filter(function(x){ return x && x.date; }), up = upcomingExams(), past = all.filter(function(x){ return x.date < t; }).sort(function(a, b){ return a.date < b.date ? 1 : -1; });
    function row(e, big){ var n = dayDiff(e.date);
      return '<div class="fx-glass fx-exam' + (big ? ' big' : '') + (n >= 0 && n <= 3 ? ' soon' : '') + '" style="--h:' + hue(e.course) + '"><span class="fx-cnt"><b>' + (n < 0 ? '✓' : n) + '</b><small>' + (n < 0 ? 'خلص' : n === 0 ? 'اليوم!' : n === 1 ? 'يوم' : 'أيام') + '</small></span>' +
        '<span class="fx-tb"><b>' + esc(e.name || 'امتحان') + (e.score != null && e.max ? ' <em class="fx-sc' + (e.score / e.max >= .8 ? ' good' : e.score / e.max >= .6 ? ' mid' : ' low') + '">' + e.score + '/' + e.max + '</em>' : '') + '</b><small>' + (e.course ? esc(e.course) + ' · ' : '') + esc(e.date) + (e.time ? ' · ' + esc(e.time) : '') + (e.room ? ' · ' + esc(e.room) : '') + '</small></span>' +
        '<span class="fx-row-act">' + (n >= 0 && W.openExamPlan ? '<button type="button" class="fx-btn ghost sm" data-fx="call" data-v="openExamPlan" data-id="' + esc(e.id) + '">خطة مراجعة</button>' : '') +
        '<button type="button" class="fx-ib sm" data-fx="call" data-v="editExam" data-id="' + esc(e.id) + '" aria-label="تعديل">✎</button><button type="button" class="fx-ib sm" data-fx="call" data-v="deleteExam" data-id="' + esc(e.id) + '" aria-label="حذف">✕</button></span></div>'; }
    return '<div class="fx-actions"><button type="button" class="fx-btn" data-fx="call" data-v="addExam">' + ic('plus') + 'امتحان جديد</button>' + impBtn() + '</div>' +
      (up.length ? row(up[0], true) + up.slice(1).map(function(e){ return row(e); }).join('') : empty('ما في امتحانات جاية', 'ريّح بالك')) +
      (past.length ? '<details class="fx-glass fx-fold"><summary>امتحانات خلصت (' + past.length + ')</summary>' + past.map(function(e){ return row(e); }).join('') + '</details>' : '');
  }
  function vAttendance(){
    var names = (sp().courses || []).filter(function(c){ return c && c.name && !c.completed; }).map(function(c){ return c.name; });
    Object.keys(sp().attendance || {}).forEach(function(n){ if(names.indexOf(n) < 0) names.push(n); });
    return '<div class="fx-cards">' + (names.length ? names.map(function(n){ var a = attOf(n), h = W.attendanceHint ? W.attendanceHint(a.p, a.a, W.weeklyLectures ? W.weeklyLectures(n) : 0) : null, lv = a.pct === null ? '' : a.pct < 75 ? ' bad' : a.pct < 85 ? ' warn' : ' ok';
      return '<div class="fx-glass fx-att' + lv + '" style="--h:' + hue(n) + '"><span class="fx-ring" style="--p:' + (a.pct || 0) + '"><b>' + (a.pct === null ? '—' : a.pct + '%') + '</b></span><span class="fx-tb"><b>' + esc(n) + '</b><small>حضرت ' + a.p + ' · غبت ' + a.a + '</small>' + (h ? '<small class="fx-hint">' + esc(h.text) + '</small>' : '') + '</span>' +
        '<span class="fx-row-act"><button type="button" class="fx-btn sm" data-fx="att" data-v="present" data-n="' + esc(n) + '">✓ حضرت</button><button type="button" class="fx-btn ghost sm" data-fx="att" data-v="absent" data-n="' + esc(n) + '">غبت</button></span></div>'; }).join('') : empty('ما في مواد', 'أضف موادك وبعدين سجّل حضورك')) + '</div>';
  }

  /* ---------- الدفعة 2: الميزانية · المؤقت · الإعدادات ---------- */
  function money(n){ n = Math.round((+n || 0) * 100) / 100; return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' د'; }
  function catName(v){ if(!v) return ''; var c = (W.BUDGET_CATS || []).filter(function(x){ return x.v === v; })[0]; return c ? (c.i ? c.i + ' ' : '') + c.l : v === 'other' ? '📦 أخرى' : v; }
  function vBudget(){
    var mon = today().slice(0, 7), all = (sp().budget || []).filter(function(x){ return x && x.amount; }), m = all.filter(function(x){ return String(x.date || '').slice(0, 7) === mon; });
    var inc = 0, exp = 0, cat = {}; m.forEach(function(x){ var a = +x.amount || 0; if(x.type === 'income') inc += a; else { exp += a; cat[x.category || 'أخرى'] = (cat[x.category || 'أخرى'] || 0) + a; } });
    var cats = Object.keys(cat).sort(function(a, b){ return cat[b] - cat[a]; }), mx = cats.length ? cat[cats[0]] : 1;
    var recent = all.slice().sort(function(a, b){ return String(a.date) < String(b.date) ? 1 : -1; }).slice(0, 12);
    return '<div class="fx-kpis">' + kpi('wallet', 'الدخل هالشهر', money(inc)) + kpi('chart', 'المصروف هالشهر', money(exp)) + kpi('calc', 'الباقي', money(inc - exp), inc - exp < 0 ? 'صارف أكثر من دخلك' : '') + '</div>' +
      '<div class="fx-actions"><button type="button" class="fx-btn" data-fx="call" data-v="addBudgetItem" data-id="expense">' + ic('plus') + 'مصروف</button><button type="button" class="fx-btn ghost" data-fx="call" data-v="addBudgetItem" data-id="income">' + ic('plus') + 'دخل</button></div>' + 
      '<div class="fx-grid2"><div class="fx-glass"><h3>وين راحت مصاريفك</h3>' + (cats.length ? cats.map(function(c){ return '<div class="fx-bar-row"><span>' + esc(catName(c)) + '</span><i style="--w:' + Math.max(4, Math.round(cat[c] / mx * 100)) + '%;--h:' + hue(c) + '"></i><b>' + money(cat[c]) + '</b></div>'; }).join('') : empty('ما في مصاريف هالشهر')) + '</div>' +
      '<div class="fx-glass"><h3>آخر الحركات</h3>' + (recent.length ? recent.map(function(x){ var inc1 = x.type === 'income';
        return '<div class="fx-mv"><span class="fx-tb"><b>' + esc(catName(x.category) || (inc1 ? 'دخل' : 'مصروف')) + '</b><small>' + esc(x.date || '') + (x.note ? ' · ' + esc(x.note) : '') + '</small></span><b class="' + (inc1 ? 'in' : 'out') + '">' + (inc1 ? '+' : '−') + money(x.amount) + '</b><button type="button" class="fx-ib sm" data-fx="call" data-v="editBudget" data-id="' + esc(x.id) + '" aria-label="تعديل">✎</button><button type="button" class="fx-ib sm" data-fx="call" data-v="deleteBudget" data-id="' + esc(x.id) + '" aria-label="حذف">✕</button></div>'; }).join('') : empty('ما في حركات لسا')) + '</div></div>' + (W.BudgetPlan ? '<details class="fx-glass fx-fold fx-bp"' + (lsGet('ss_fx_bp') === '1' ? ' open' : '') + '><summary>تخطيط الميزانية · حدود الشهر والتوقعات وأهداف الادخار</summary><div id="budgetPlan"></div></details>' : '') + (W.clearBudget ? '<div class="fx-tools">' + tool('fn', 'مسح الميزانية', 'clearBudget', 1) + '</div>' : '');
  }
  /* مؤقت التركيز (168): دائرة كبيرة بالنص (مدة الجلسة + تقدّم اليوم نحو الهدف) + «ابدأ» واحد كبير + اختيار المادة + أسبوعك */
  function vTimer(){
    var def = (W.timerSettings && W.timerSettings.focus) || 25, sel = +lsGet('ss_fx_dur') || def, crs = lsGet('ss_fx_tmc') || '';
    var log = {}; try{ log = W.S && W.S.get ? W.S.get('studyLog', {}) || {} : JSON.parse(lsGet('studyLog') || '{}') || {}; }catch(e){}
    var fm = 0; try{ var dp = sp().dayPlan, dd = dp && dp.days && dp.days[today()]; if(dd && dd.fm) Object.keys(dd.fm).forEach(function(k){ fm += +dd.fm[k] || 0; }); }catch(e){}
    var tdy = Math.max(Math.round(+log[today()] || 0), Math.round(fm)), goal = +lsGet('ss_fx_goal') || 120, pct = Math.min(100, Math.round(tdy / goal * 100));
    var t = new Date(), wk = [], wTot = 0, mx = 1, streakN = 0;
    for(var i = 6; i >= 0; i--){ var x = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i), m = Math.max(0, Math.round(+log[ymd(x)] || 0)); if(i === 0) m = tdy; wk.push({ d: DA[x.getDay()].replace('ال', ''), m: m, today: i === 0 }); wTot += m; if(m > mx) mx = m; }
    for(var k = 0; k < 365; k++){ var z = new Date(t.getFullYear(), t.getMonth(), t.getDate() - k), zm = k === 0 ? tdy : +log[ymd(z)] || 0; if(zm > 0) streakN++; else if(k > 0) break; }
    var courses = (sp().courses || []).map(function(c){ return c && c.name; }).filter(Boolean);
    var hero = '<div class="fx-glass fx-tm">' +
      '<div class="fx-tm-ring" style="--p:' + pct + '"><div class="fx-tm-in"><b dir="ltr">' + pad(sel) + ':00</b><small>جلسة تركيز</small></div></div>' +
      '<div class="fx-tm-side">' +
        '<div class="fx-tm-durs" role="group" aria-label="مدة الجلسة">' + [15, 25, 45, 60, 90].map(function(n){ return '<button type="button" class="fx-tm-d' + (n === sel ? ' on' : '') + '" data-fx="tmsel" data-v="' + n + '" aria-pressed="' + (n === sel) + '">' + n + ' د</button>'; }).join('') + '</div>' +
        (courses.length ? '<div class="fx-tm-lbl">على شو بتركّز؟</div><div class="fx-tm-crs">' + ['<button type="button" class="fx-tm-c' + (!crs ? ' on' : '') + '" data-fx="tmcrs" data-v="">عام</button>'].concat(courses.slice(0, 8).map(function(n){ return '<button type="button" class="fx-tm-c' + (crs === n ? ' on' : '') + '" style="--h:' + hue(n) + '" data-fx="tmcrs" data-v="' + esc(n) + '"><i></i>' + esc(n) + '</button>'; })).join('') + '</div>' : '') +
        '<button type="button" class="fx-btn fx-tm-go" data-fx="tmgo">' + ic('play') + 'ابدأ ' + sel + ' دقيقة</button>' +
        '<div class="fx-tm-goal">ركّزت اليوم <b>' + dur(tdy) + '</b> من هدف ' + dur(goal) + ' · <button type="button" class="fx-link" data-fx="tmgoal">غيّر الهدف</button></div>' +
      '</div></div>';
    var week = '<div class="fx-glass fx-tm-week"><h3>أسبوعك <small>' + dur(wTot) + ' · 🔥 ' + streakN + (streakN === 1 ? ' يوم' : ' أيام') + '</small></h3><div class="fx-tm-bars">' +
      wk.map(function(x){ return '<span class="fx-tm-bar' + (x.today ? ' today' : '') + '" title="' + x.m + ' د"><i style="height:' + Math.max(4, Math.round(x.m / mx * 100)) + '%"></i><b>' + (x.m ? x.m : '') + '</b><small>' + x.d + '</small></span>'; }).join('') + '</div></div>';
    return hero + week + '<div class="fx-actions"><button type="button" class="fx-btn ghost" data-fx="call" data-v="openTimerSettings">' + ic('clock') + 'إعدادات المؤقت</button></div>';
  }
  /* الإعدادات: صفحة وحدة بكل إشي (بدل نافذة الإعدادات القديمة) — الأزرار بتنادي نفس دوال الأزرار الأصلية المخفية بـindex.html */
  function liveSub(id){ var e = d.getElementById(id), s2 = e && e.querySelector('small'); return s2 ? s2.textContent.trim() : ''; }
  /* صف إعداد: أيقونة ملوّنة (--h) + عنوان + وصف حي + سهم؛ بينادي الزر الأصلي المخفي (sbtn) */
  function srow(id, icn, t, sm, h){ if(!d.getElementById(id)) return ''; var sub = liveSub(id) || sm || '';
    return '<button type="button" class="fx-srow" data-fx="sbtn" data-v="' + id + '" style="--h:' + (h || 220) + '"><span class="fx-sric">' + ic(icn) + '</span><span class="fx-srt"><b>' + t + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><i class="fx-srch">' + ic('chev') + '</i></button>'; }
  function sset(id, title, desc, body){ return body ? '<section class="fx-sset" id="fxS-' + id + '"><header><h2>' + title + '</h2>' + (desc ? '<p>' + desc + '</p>' : '') + '</header><div class="fx-sbody">' + body + '</div></section>' : ''; }
  function sgroup(rows){ rows = rows.filter(Boolean).join(''); return rows ? '<div class="fx-sgroup">' + rows + '</div>' : ''; }
  var SSECS = [['account', 'الحساب والمزامنة', 'cloud'], ['look', 'المظهر', 'sun'], ['notif', 'الإشعارات', 'clock'], ['ai', 'الذكاء الاصطناعي', 'spark'], ['data', 'البيانات والنسخ', 'book'], ['app', 'التطبيق', 'more'], ['adv', 'متقدم', 'gear']];
  function vSettings(){
    var st = {}; try{ st = W.getSyncStatus ? W.getSyncStatus() || {} : {}; }catch(e){}
    var native = d.documentElement.classList.contains('native-app'), fsv = lsGet('ss_font') || 'md', prof = sp().profile || {}, nm1 = (prof.name || 'طالب').trim();
    var nav = '<nav class="fx-snavs" aria-label="أقسام الإعدادات">' + SSECS.map(function(x){ return '<button type="button" data-fx="sjump" data-v="' + x[0] + '">' + ic(x[2]) + '<span>' + x[1] + '</span></button>'; }).join('') + '</nav>';
    var acct = '<div class="fx-sacct"><span class="fx-sav">' + esc(nm1.charAt(0)) + '</span><span class="fx-srt"><b>' + esc(nm1) + '</b><small>' + esc(prof.major || 'الجامعة الهاشمية') + '</small></span>' +
      '<span class="fx-spill lv-' + esc(st.level || 'ok') + '"><i></i>' + esc(st.text || 'محفوظ على جهازك') + '</span>' + (W.retryCloud && st.level && st.level !== 'ok' ? '<button type="button" class="fx-btn ghost sm" data-fx="sync">أعد المحاولة</button>' : '') + '</div>';
    var body =
      sset('account', 'الحساب والمزامنة', 'بياناتك محفوظة على جهازك، والمزامنة بتربط أجهزتك ببعض.', acct + sgroup([srow('syncCodeBtn', 'cloud', 'رمز المزامنة', 'اربط أجهزتك بنفس البيانات', 210), srow('calSyncBtn', 'timetable', 'ربط التقويم', 'تصدير واستيراد ics لتقويم جوالك', 160)])) +
      sset('look', 'المظهر', 'الثيم والوضع وحجم الخط — بيتغيّروا فوراً.', '<div class="fx-sgroup fx-spad"><div class="fx-slbl">الثيم</div>' + palHtml() + '<div class="fx-sline"><div class="fx-slbl">الوضع</div>' + modeHtml() + '</div><div class="fx-sline"><div class="fx-slbl">حجم الخط</div><div class="fx-seg" role="group" aria-label="حجم الخط">' + [['sm', 'صغير'], ['md', 'عادي'], ['lg', 'كبير']].map(function(f){ return '<button type="button" class="' + (fsv === f[0] ? 'on' : '') + '" data-fx="font" data-v="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div></div></div>') +
      sset('notif', 'الإشعارات', 'تذكيرات المحاضرات والمهام والامتحانات وساعات الهدوء.', sgroup([srow('notifBtn', 'clock', 'الإشعارات والتذكيرات', '', 35)])) +
      sset('ai', 'الذكاء الاصطناعي', 'مساعد دراسي وقراءة صور بالذكاء الاصطناعي عبر n8n.', aiBox() + (W.N8n && W.N8n.enabled() ? '' : sgroup([srow('ocrLabBtn', 'camera', 'مفتاح Gemini للصور', 'لقراءة الجدول والامتحانات والعلامات من صورة', 265)]))) +
      sset('data', 'البيانات والنسخ', 'نسخة يومية تلقائية على جهازك، وبتقدر تنزّل نسخة بأي وقت.', sgroup([srow('exportBackupBtn', 'book', 'نزّل نسخة احتياطية', 'ملف فيه كل بياناتك', 145), srow('importBackupBtn', 'plus', 'استرجع من ملف', 'ملف JSON من نسخة سابقة', 145), srow('restorePrevBtn', 'clock', 'استرجع نسخة سابقة', 'من النسخ اليومية التلقائية', 145)])) +
      sset('app', 'التطبيق', '', sgroup([native ? srow('widgetBtn', 'grades', 'ودجتات الشاشة الرئيسية', '', 300) : '', native ? srow('updateBtn', 'cloud', 'فحص التحديثات', '', 300) : '', !native ? srow('pwaInstallBtn', 'plus', 'ثبّت التطبيق', 'أيقونة على شاشتك ويشتغل بدون نت', 300) : '', srow('onbBtn', 'route', 'الجولة التعريفية', 'تعرّف على التطبيق من جديد', 300)])) +
      sset('adv', 'متقدم', '', sgroup([srow('integrityBtn', 'tasks', 'فحص سلامة البيانات', '', 0), srow('diagBtn', 'more', 'سجل الأخطاء', '', 0)]));
    return '<div class="fx-settings">' + nav + '<div class="fx-scont">' + body + '<small class="fx-note fx-ver">مساحتي الدراسية · الإصدار ' + esc(W.APP_BUILD || '') + '</small></div></div>';
  }
  function aiBox(){ var N = W.N8n, on = !!(N && N.enabled());
    return '<div class="fx-sgroup fx-spad fx-n8n"><div class="fx-n8n-h"><span class="fx-sric" style="--h:15">' + ic('spark') + '</span><span class="fx-srt"><b>المساعد وقراءة الصور عبر n8n</b><small>' + (on ? 'مربوط بخادم n8n · الذكاء من Google Gemini' : 'الخادم مش مربوط حالياً') + '</small></span><span class="fx-spill lv-' + (on ? 'ok' : 'warn') + '"><i></i>' + (on ? 'شغّال' : 'غير مربوط') + '</span></div>' +
      '<p class="fx-note">أسئلتك للمساعد وصور الجداول بتنبعت لخادم n8n، وهو اللي بيكلّم Gemini بمفتاح محفوظ عنده — ما في مفاتيح بالموقع.</p>' +
      '<div class="fx-actions"><button type="button" class="fx-btn sm" data-fx="ai">' + ic('spark') + 'افتح المساعد</button></div></div>';
  }

  
  /* ---------- الدفعة 3: الخطة · روابط الجامعة ---------- */
  var TYPES = [['uni-c', 'جامعة إجباري'], ['uni-e', 'جامعة اختياري'], ['faculty', 'كلية'], ['major-c', 'تخصص إجباري'], ['major-e', 'تخصص اختياري']];
  /* الخطة الدراسية (168): دائرة تقدّم كبيرة + كروت ملوّنة لكل نوع متطلب + «مواد مقترحة إلك» من الخطة الموصى فيها */
  var TYPE_HUE = { 'uni-c': 200, 'uni-e': 170, 'faculty': 265, 'major-c': 330, 'major-e': 35 };
  function vPlan(){
    var p = null; try{ p = W.planHoursSummary ? W.planHoursSummary() : null; }catch(e){}
    if(!p) return empty('الخطة مش متوفرة');
    var T = W.TOTAL_REQUIRED_HOURS || {}, pct = Math.min(100, Math.round(p.done / p.total * 100)), pctCur = Math.min(100 - pct, Math.round(p.curCounted / p.total * 100)), left = Math.max(0, p.total - p.done - p.curCounted);
    var sems = left ? Math.ceil(left / 16) : 0;
    var hero = '<div class="fx-glass fx-pl">' +
      '<div class="fx-pl-ring" style="--a:' + pct + ';--b:' + (pct + pctCur) + '"><div class="fx-pl-in"><b>' + pct + '%</b><small>من خطتك</small></div></div>' +
      '<div class="fx-pl-side"><h2>' + p.done + ' <small>من ' + p.total + ' ساعة</small></h2>' +
        '<div class="fx-pl-kpis"><span class="k-done"><i></i><b>' + p.done + '</b><small>مكتملة</small></span><span class="k-cur"><i></i><b>' + p.current + '</b><small>هالفصل' + (p.over ? ' ⚠️' : '') + '</small></span><span class="k-left"><i></i><b>' + left + '</b><small>باقية</small></span></div>' +
        '<p class="fx-pl-note">' + (sems ? 'بهالمعدّل (~16 ساعة بالفصل) باقيلك تقريباً <b>' + sems + (sems === 1 ? ' فصل' : sems === 2 ? ' فصلين' : ' فصول') + '</b> بعد هالفصل.' : 'خلصت كل ساعات الخطة 🎉') + (p.over ? ' <span class="warn">مسجّل فوق 18 ساعة هالفصل.</span>' : '') + '</p>' +
      '</div></div>';
    var cards = '<div class="fx-pl-grid">' + TYPES.map(function(t){ var need = +T[t[0]] || 0, dn = p.byType[t[0]] || 0, cu = p.curByType[t[0]] || 0; if(!need && !dn && !cu) return '';
        var a = need ? Math.min(100, Math.round(dn / need * 100)) : 0, b2 = need ? Math.min(100, Math.round((dn + cu) / need * 100)) : 0, rest = Math.max(0, need - dn - cu);
        return '<div class="fx-glass fx-pl-card" style="--h:' + (TYPE_HUE[t[0]] || 250) + '"><div class="fx-pl-ch"><b>' + t[1] + '</b><span class="fx-pl-mini" style="--a:' + a + ';--b:' + b2 + '"><i>' + a + '%</i></span></div>' +
          '<div class="fx-pl-nums"><b>' + dn + '</b><small>/ ' + (need || '—') + ' ساعة</small></div>' +
          '<div class="fx-pl-bar"><i style="width:' + a + '%"></i><i class="cur" style="width:' + Math.max(0, b2 - a) + '%"></i></div>' +
          '<small class="fx-pl-sub">' + (cu ? '+' + cu + ' هالفصل · ' : '') + (rest ? 'باقي ' + rest : 'مكتمل ✓') + '</small></div>'; }).join('') + '</div>';
    /* مقترحة: بالترتيب من الخطة الموصى فيها، مش منجزة ومش مسجّلة هالفصل */
    var DB = W.COURSES_DB || {}, doneM = W.getCompletedCourses ? W.getCompletedCourses() : {}, curM = {}; (sp().courses || []).forEach(function(c){ if(c && c.name) curM[c.name] = 1; });
    var RP = W.RECOMMENDED_PLAN || {}, sug = [];
    Object.keys(RP).sort(function(a, b){ return +a - +b; }).forEach(function(k){ (RP[k] || []).forEach(function(n){ if(sug.length < 6 && !doneM[n] && !curM[n] && sug.indexOf(n) < 0) sug.push(n); }); });
    var next = sug.length ? '<div class="fx-glass fx-pl-next"><h3>مواد مقترحة إلك <small>حسب الخطة الموصى فيها</small></h3><div class="fx-pl-sug">' +
      sug.map(function(n){ var inf = DB[n] || {}; return '<span class="fx-pl-s" style="--h:' + (TYPE_HUE[inf.t] || 250) + '"><i></i><b>' + esc(n) + '</b><small>' + (inf.h || 3) + ' س</small></span>'; }).join('') + '</div></div>' : '';
    return hero + cards + next +
      '<div class="fx-actions"><button type="button" class="fx-btn" data-fx="go" data-v="tree">' + ic('book') + 'شجرة المواد بالتفصيل</button>' + (W.importFromPlan ? '<button type="button" class="fx-btn ghost" data-fx="call" data-v="importFromPlan">استورد مواد من الخطة</button>' : '') + '</div>';
  }
  var LG = [['main', 'الأساسية'], ['library', 'المكتبة والبحث'], ['major', 'التخصص'], ['apps', 'تطبيقات'], ['support', 'دعم وخدمات']];
  function vLinks(){
    var L = W.HU_LINKS || {};
    return LG.map(function(g){ var a = L[g[0]] || []; if(!a.length) return '';
      return '<div class="fx-glass fx-links"><h3>' + g[1] + '</h3><div class="fx-lgrid">' + a.map(function(x){ return /^https:\/\//.test(x.url || '') ? '<a class="fx-lnk" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="fx-lic">' + esc(x.icon || '🔗') + '</span><span class="fx-tb"><b>' + esc(x.title) + '</b><small>' + esc(x.desc || '') + '</small></span></a>' : ''; }).join('') + '</div></div>'; }).join('') || empty('ما في روابط');
  }

  /* ---------- شجرة المواد (أصلية) + الخريطة (المحرّك القديم مستضاف داخل الواجهة) ---------- */
  var treeSel = null;
  function cState(n, done, curN){ if(done[n]) return 'done'; if(curN[n]) return 'cur'; try{ return W.prereqsMet && !W.prereqsMet(n, done) ? 'lock' : 'open'; }catch(e){ return 'open'; } }
  function vTree(){
    var S = W.SEMESTERS || [], DB = W.COURSES_DB || {}, done = {}, curN = {};
    try{ done = W.getCompletedCourses ? W.getCompletedCourses() || {} : {}; }catch(e){}
    (sp().courses || []).forEach(function(c){ if(c && c.name && !c.completed) curN[c.name] = 1; });
    if(!S.length) return empty('الخطة مش متوفرة');
    var info = '';
    if(treeSel){ var x = DB[treeSel] || {}, st = cState(treeSel, done, curN), miss = []; try{ miss = W.missingPrereqs ? W.missingPrereqs(treeSel) || [] : []; }catch(e){}
      info = '<div class="fx-glass fx-tinfo st-' + st + '"><h3>' + esc(treeSel) + ' <button type="button" class="fx-link" data-fx="tsel" data-v="">✕</button></h3><small>' + esc(x.code || '') + ' · ' + (x.h || 3) + ' ساعات</small>' + (x.d ? '<p>' + esc(x.d) + '</p>' : '') +
        ((x.pre || []).length ? '<p><b>المتطلبات:</b> ' + x.pre.map(function(p){ return '<span class="fx-tag' + (done[p] ? ' ok' : '') + '">' + esc(p) + '</span>'; }).join(' ') + '</p>' : '') +
        (miss.length && st === 'lock' ? '<p class="fx-hint">لازم تخلص قبلها: ' + miss.map(esc).join('، ') + '</p>' : '') +
        '<div class="fx-actions">' + (st === 'done' ? '<button type="button" class="fx-btn ghost" data-fx="tdone" data-v="0">إلغاء «خلّصتها»</button>' : '<button type="button" class="fx-btn" data-fx="tdone" data-v="1">' + ic('tick') + 'خلّصتها</button>') + (curN[treeSel] ? '<button type="button" class="fx-btn ghost" data-fx="course" data-n="' + esc(treeSel) + '">افتح المادة</button>' : '') + '</div></div>'; }
    var L = { done: 'مكتملة', cur: 'هالفصل', open: 'متاحة', lock: 'مقفلة' };
    return '<div class="fx-legend fx-tleg">' + Object.keys(L).map(function(k){ return '<span class="st-' + k + '"><i></i>' + L[k] + '</span>'; }).join('') + '</div>' + info +
      '<div class="fx-tree">' + S.map(function(sem){ var cs = sem.courses || [], dn = cs.filter(function(c){ return done[c.n]; }).length;
        var cu = cs.filter(function(c){ return curN[c.n] && !done[c.n]; }).length, sp1 = cs.length ? Math.round(dn / cs.length * 100) : 0, sp2 = cs.length ? Math.round((dn + cu) / cs.length * 100) : 0;
        return '<div class="fx-glass fx-sem' + (dn === cs.length && cs.length ? ' full' : cu ? ' now' : '') + '"><h3>' + esc(sem.name || '') + '<small>سنة ' + esc(sem.year || '') + ' · ' + dn + '/' + cs.length + '</small></h3>' +
          '<i class="fx-sem-bar" style="--a:' + sp1 + ';--b:' + sp2 + '"><i></i><i class="cur"></i></i>' + cs.map(function(c){ var st = cState(c.n, done, curN);
          return '<button type="button" class="fx-tc st-' + st + (treeSel === c.n ? ' sel' : '') + '" data-fx="tsel" data-v="' + esc(c.n) + '"><i>' + (st === 'done' ? '✓' : st === 'lock' ? '🔒' : '') + '</i><span>' + esc(c.n) + '</span><small>' + (c.h || 3) + ' س</small></button>'; }).join('') + '</div>'; }).join('') + '</div>';
  }
  function vCampus(){ return '<div class="fx-glass fx-campus" id="fxCampusSlot"></div>'; }
  var campusHome = null;
  function parkCampus(){ var r = d.getElementById('campusRoot'); if(r && campusHome && r.parentNode !== campusHome) campusHome.appendChild(r); }
  function mountCampus(){ var slot = d.getElementById('fxCampusSlot'), r = d.getElementById('campusRoot'); if(!slot || !r) return; if(!campusHome) campusHome = r.parentNode; slot.appendChild(r); var go = function(){ try{ if(W.renderCampus) W.renderCampus(); }catch(e){} }; if(W.CampusMap || !W.withModule) go(); else W.withModule('CampusMap', 'campus-map.js', go); }

  /* ---------- حاسبة المعدل (أصلية؛ نفس window.gpaRows ومفتاح gpaRows) ---------- */
  function saveGpa(){ try{ if(W.S && W.S.set) W.S.set('gpaRows', W.gpaRows); else lsSet('gpaRows', JSON.stringify(W.gpaRows)); }catch(e){} }
  /* «شو لازم أجيب؟»: سيناريوهات المعدل (Progress.scenarios) — هدف + ساعات الفصل */
  function fx2(n){ return (Math.round(n * 100) / 100).toFixed(2); }
  function semHours(){ var h = 0; (sp().courses || []).forEach(function(c){ if(c && !c.completed) h += parseFloat(c.hours) || 0; }); return h || 15; }
  function scenOut(){
    var P = W.Progress; if(!P || !P.scenarios) return '';
    var tI = d.getElementById('fxScT'), hI = d.getElementById('fxScH'), g = gpa();
    var tg = tI ? parseFloat(tI.value) : NaN, hh = hI ? parseFloat(hI.value) : semHours();
    if(!(tg > 0)) tg = g ? Math.min(4, Math.ceil((+g.v + 0.01) * 4) / 4) : 3;
    var r = P.scenarios(hh, tg); if(!r) return '<p class="fx-note">عبّي موادك اللي خلصتها بالحاسبة فوق (الساعات والتقدير) عشان نحسبلك.</p>';
    var head = r.status === 'done' ? '🎉 هدفك ' + fx2(r.target) + ' محقق حتى لو هالفصل ضعيف' : r.status === 'ok' ? 'لتوصل <b>' + fx2(r.target) + '</b> لازم متوسطك هالفصل <b>' + fx2(r.need) + '</b> — يعني تقريباً <b>' + esc(r.letter) + '</b> (' + r.minPct + '%+) بكل المواد' : '🎯 ' + fx2(r.target) + ' ما بتتحقق بفصل واحد — أقصى إشي ' + fx2(r.maxGpa) + (r.semesters ? '، بتحتاج حوالي ' + r.semesters + ' فصول' : '');
    return '<div class="fx-sc-head">' + head + '</div>' + r.rows.map(function(x){ var dd = x.gpa - r.totals.gpa; return '<div class="fx-gl"><span>لو كل موادك ' + esc(x.label) + '</span><b class="' + (dd > 0.004 ? 'good' : dd < -0.004 ? 'low' : 'mid') + '">' + fx2(x.gpa) + '</b></div>'; }).join('');
  }
  function scenBox(){ if(!W.Progress || !W.Progress.scenarios) return ''; var g = gpa();
    return '<div class="fx-glass"><h3>شو لازم أجيب هالفصل؟</h3><div class="fx-airow fx-sc-in"><label>المعدل اللي بدك إياه<input type="number" id="fxScT" min="1" max="4" step="0.05" value="' + (g ? Math.min(4, Math.ceil((+g.v + 0.01) * 4) / 4).toFixed(2) : '3.00') + '"></label><label>ساعات هالفصل<input type="number" id="fxScH" min="1" max="30" value="' + semHours() + '"></label></div><div id="fxScOut">' + scenOut() + '</div></div>';
  }
  function vGpa(){
    if(!Array.isArray(W.gpaRows)) W.gpaRows = [];
    var G = W.GRADES || {}, g = gpa(), keys = Object.keys(G);
    return '<div class="fx-glass fx-hero fx-plan-hero"><span class="fx-ring big" style="--p:' + (g ? Math.round(g.v / 4 * 100) : 0) + ';--h:250"><b id="fxGpaV">' + (g ? g.v : '—') + '</b></span><span class="fx-tb"><small>معدلك المحسوب</small><b class="fx-big" id="fxGpaH">' + (g ? g.h : 0) + ' <small>ساعة</small></b></span></div>' +
      '<div class="fx-glass"><h3>المواد <button type="button" class="fx-link" data-fx="gpafill">عبّي من موادي</button></h3>' + (W.gpaRows.length ? W.gpaRows.map(function(r, i){
        return '<div class="fx-gpa-row"><input type="text" value="' + esc(r.name || '') + '" placeholder="اسم المادة" data-gi="' + i + '" data-gk="name" aria-label="اسم المادة"><input type="number" min="0" max="6" value="' + (+r.hrs || 0) + '" data-gi="' + i + '" data-gk="hrs" aria-label="الساعات"><select data-gi="' + i + '" data-gk="grade" aria-label="العلامة">' + keys.map(function(k){ return '<option' + (k === r.grade ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select><button type="button" class="fx-ib sm" data-fx="gpadel" data-v="' + i + '" aria-label="حذف">✕</button></div>'; }).join('') : empty('ما في مواد بالحاسبة', 'أضف مادة أو عبّي من موادك')) +
      '<div class="fx-actions"><button type="button" class="fx-btn" data-fx="gpaadd">' + ic('plus') + 'مادة</button></div></div>' + scenBox();
  }
  function gpaInput(e){ var t = e.target; if(t && (t.id === 'fxScT' || t.id === 'fxScH')){ var o = d.getElementById('fxScOut'); if(o) o.innerHTML = scenOut(); return; }
    var i = t.getAttribute && t.getAttribute('data-gi'); if(i === null || i === undefined || !W.gpaRows || !W.gpaRows[+i]) return;
    var k = t.getAttribute('data-gk'); W.gpaRows[+i][k] = k === 'hrs' ? (parseFloat(t.value) || 0) : t.value; saveGpa(); var so = d.getElementById('fxScOut'); if(so) so.innerHTML = scenOut();
    var g = gpa(), v = d.getElementById('fxGpaV'), h = d.getElementById('fxGpaH'); if(v) v.textContent = g ? g.v : '—'; if(h) h.innerHTML = (g ? g.h : 0) + ' <small>ساعة</small>'; var r = v && v.parentNode; if(r) r.style.setProperty('--p', g ? Math.round(g.v / 4 * 100) : 0); }

  /* ---------- مواقيت الصلاة (نفس كاش ودجت الشريط lw_prayer_cache_v1 ونفس الطلب) ---------- */
  var PR = [['Fajr', 'الفجر'], ['Sunrise', 'الشروق'], ['Dhuhr', 'الظهر'], ['Asr', 'العصر'], ['Maghrib', 'المغرب'], ['Isha', 'العشاء']], prLoading = false;
  function prayerData(){ try{ var c = JSON.parse(lsGet('lw_prayer_cache_v1') || 'null'); if(c && c.data && c.data.timings && c.data.date && c.data.date.gregorian && c.data.date.gregorian.date === pad(new Date().getDate()) + '-' + pad(new Date().getMonth() + 1) + '-' + new Date().getFullYear()) return c.data; }catch(e){} return null; }
  function loadPrayer(){ if(prLoading || !W.fetch) return; prLoading = true;
    fetch('https://api.aladhan.com/v1/timings?latitude=32.1031&longitude=36.1867&method=23&school=0', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(j){
      if(j && j.code === 200 && j.data){ lsSet('lw_prayer_cache_v1', JSON.stringify({ ts: Date.now(), data: { timings: j.data.timings, date: j.data.date, meta: j.data.meta } })); }
      prLoading = false; if(cur === 'prayer') render(false); }).catch(function(){ prLoading = false; if(cur === 'prayer'){ var m = d.getElementById('fxPrMsg'); if(m) m.textContent = 'ما قدرت أجيب المواقيت — تأكد من النت'; } }); }
  function toMin(t){ var m = String(t || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : null; }
  function vPrayer(){
    var p = prayerData(); if(!p){ loadPrayer(); return '<div class="fx-glass fx-empty" id="fxPrMsg"><b>بجيب مواقيت اليوم…</b></div>'; }
    var now = nowMin(), next = null; PR.forEach(function(x){ var m = toMin(p.timings[x[0]]); if(next === null && x[0] !== 'Sunrise' && m !== null && m > now) next = x[0]; });
    var nm = next ? toMin(p.timings[next]) : null, nn = next ? PR.filter(function(x){ return x[0] === next; })[0][1] : '';
    var hij = p.date && p.date.hijri ? p.date.hijri.day + ' ' + (p.date.hijri.month && p.date.hijri.month.ar || '') + ' ' + p.date.hijri.year : '';
    return (next ? '<div class="fx-glass fx-hero fx-pr-hero"><small>الصلاة الجاية</small><b class="fx-big">' + nn + ' · ' + esc(String(p.timings[next]).slice(0, 5)) + '</b><span class="fx-meta"><span>باقي ' + dur(nm - now) + '</span>' + (hij ? '<span>' + esc(hij) + '</span>' : '') + '</span></div>' : '') +
      '<div class="fx-glass fx-prs">' + PR.map(function(x){ var m = toMin(p.timings[x[0]]), past = m !== null && m <= now;
        return '<div class="fx-pr' + (x[0] === next ? ' next' : '') + (past ? ' past' : '') + '"><span>' + x[1] + '</span><b>' + esc(String(p.timings[x[0]] || '').slice(0, 5)) + '</b></div>'; }).join('') + '</div>' +
      '<p class="fx-note">حسب موقع الجامعة الهاشمية (الزرقاء) — طريقة الحساب الأردنية.</p>';
  }
  /* ---------- إحصائياتي (من studyLog والمهام والحضور الحقيقية فقط) ---------- */
  function peakBox(){ var D = W.Daily; if(!D || !D.peak) return ''; var p; try{ p = D.peak(new Date()); }catch(e){ return ''; }
    if(!p.hours && !p.day) return '<div class="fx-glass"><h3>ذروة تركيزك</h3><p class="fx-note">كمّل ' + (p.need || 5) + ' جلسات تركيز كمان وبنقلك أحسن وقت إلك للدراسة</p></div>';
    return '<div class="fx-glass"><h3>ذروة تركيزك</h3><p>' + esc(D.peakLine(p)).replace(' · ', '<br>') + '</p></div>';
  }
  function vStats(){
    var log = {}; try{ log = W.S && W.S.get ? W.S.get('studyLog', {}) || {} : JSON.parse(lsGet('studyLog') || '{}') || {}; }catch(e){}
    var t = new Date(), st = new Date(t.getFullYear(), t.getMonth(), t.getDate() - t.getDay()), days = [], tot = 0, prev = 0, mx = 1, streakN = 0;
    for(var i = 0; i < 7; i++){ var x = new Date(st.getFullYear(), st.getMonth(), st.getDate() + i), m = Math.max(0, +log[ymd(x)] || 0); days.push({ d: DA[x.getDay()], m: m, today: ymd(x) === today() }); tot += m; if(m > mx) mx = m; }
    for(var j = 1; j <= 7; j++){ var y = new Date(st.getFullYear(), st.getMonth(), st.getDate() - j); prev += Math.max(0, +log[ymd(y)] || 0); }
    for(var k = 0; k < 365; k++){ var z = new Date(t.getFullYear(), t.getMonth(), t.getDate() - k); if(+log[ymd(z)] > 0) streakN++; else if(k > 0) break; }
    var tasks = sp().tasks || [], s0 = ymd(st), done = tasks.filter(function(x){ return x && x.done && x.due && x.due >= s0; }).length, open = tasks.filter(function(x){ return x && !x.done; }).length, late = openTasks().filter(function(x){ return x.due < today(); }).length;
    var ap = 0, at = 0; Object.keys(sp().attendance || {}).forEach(function(n){ var a = attOf(n); ap += a.p; at += a.t; });
    var diff = prev ? Math.round((tot - prev) / prev * 100) : null;
    return '<div class="fx-kpis">' + kpi('clock', 'ذاكرت هالأسبوع', dur(Math.round(tot)), diff === null ? '' : (diff >= 0 ? '▲ ' : '▼ ') + Math.abs(diff) + '% عن الماضي') + kpi('flame', 'أيام متتالية', streakN, 'ذاكرت فيها') + kpi('tasks', 'مهام خلصتها', done, 'هالأسبوع · مفتوحة ' + open) + kpi('today', 'نسبة حضورك', at ? Math.round(ap / at * 100) + '%' : '—', at ? ap + ' من ' + at : '') + '</div>' +
      '<div class="fx-glass"><h3>دقائق المذاكرة هالأسبوع</h3><div class="fx-chart">' + days.map(function(x){ return '<div class="fx-colb' + (x.today ? ' today' : '') + '"><small>' + (x.m ? Math.round(x.m) : '') + '</small><i style="height:' + Math.max(3, Math.round(x.m / mx * 100)) + '%"></i><span>' + x.d.replace('ال', '').slice(0, 3) + '</span></div>'; }).join('') + '</div></div>' +
      (late ? '<div class="fx-glass fx-warnbox">عندك ' + late + ' مهام متأخرة — <button type="button" class="fx-link" data-fx="go" data-v="tasks">افتحها</button></div>' : '') + peakBox();
  }
  var VIEWS = { today: ['اليوم', vToday], timetable: ['الجدول', vTimetable], tasks: ['المهام', vTasks], grades: ['العلامات', vGrades], more: ['المزيد', vMore], courses: ['موادي', vCourses], exams: ['الامتحانات', vExams], attendance: ['الحضور', vAttendance], budget: ['الميزانية', vBudget], timer: ['مؤقت التركيز', vTimer], settings: ['الإعدادات والمزامنة', vSettings], plan: ['الخطة الدراسية', vPlan], hulinks: ['روابط الجامعة', vLinks], tree: ['شجرة المواد', vTree], gpa: ['حاسبة المعدل', vGpa], prayer: ['مواقيت الصلاة', vPrayer], stats: ['إحصائياتي', vStats], campus: ['خريطة الجامعة', vCampus] };
  var NAV = ['today', 'timetable', 'tasks', 'grades', 'more'];

  /* ---------- المظهر: نفس الثيم للواجهة الجديدة والقديمة (html.fx-skin + light + data-fxbg) ---------- */
  /* ---------- ثيمات تصميم الشريط الجانبي: كل ثيم لوحة كاملة (خلفية/شريط/كروت/حدود/تمييز) بنسختين ---------- */
  /* الترتيب: base, side, card, card2, hover, sel, ln, ed, ac */
  var PAL = [
    ['vivid', 'حيوي', ['#0d1120', '#111628', '#151b2e', '#1b2238', '#1f2740', '#252f4c', '#222a44', '#2c3656', '#8b7bff'], ['#f5f6fb', '#ffffff', '#ffffff', '#f2f3fa', '#eceefa', '#e6e8f8', '#e6e8f2', '#d9dcec', '#6d4dff']],
    ['neutral', 'محايد', ['#191919', '#202020', '#232323', '#2a2a2a', '#2c2c2c', '#323232', '#2f2f2f', '#373737', '#5b9cf5'], ['#ffffff', '#f7f7f5', '#ffffff', '#f7f7f5', '#efefed', '#e8e8e5', '#ebebe9', '#e2e2df', '#2f6feb']],
    ['ocean', 'محيط', ['#0f1520', '#131b28', '#16202f', '#1c2738', '#1f2b3d', '#243349', '#223045', '#2a3a52', '#4f9dff'], ['#f8fafd', '#eef3fa', '#ffffff', '#f1f5fb', '#e6eef8', '#dbe6f5', '#e1e8f2', '#d5dfec', '#2563eb']],
    ['forest', 'غابة', ['#111815', '#151e1a', '#18231e', '#1e2b25', '#213029', '#273830', '#24332c', '#2c3e35', '#3ecf8e'], ['#f7faf8', '#edf4ef', '#ffffff', '#f1f6f2', '#e5efe8', '#d9e8de', '#e0eae3', '#d3e1d7', '#15803d']],
    ['violet', 'بنفسجي', ['#15131c', '#1a1724', '#1e1a29', '#252032', '#282237', '#2f2841', '#2b253a', '#342d46', '#a78bfa'], ['#faf9fd', '#f2effa', '#ffffff', '#f5f2fc', '#ebe6f8', '#e1daf4', '#e6e1f3', '#dad3ee', '#7c3aed']],
    ['rose', 'وردي', ['#1a1316', '#21171b', '#251a1f', '#2d2026', '#312329', '#392930', '#35262c', '#3f2e35', '#f472b6'], ['#fdf8fa', '#f9eef2', '#ffffff', '#fbf2f5', '#f5e5ec', '#efd8e2', '#f1e2e8', '#ead3dd', '#db2777']],
    ['amber', 'عنبري', ['#1a1712', '#201c16', '#241f18', '#2b251d', '#2f2820', '#372f25', '#332c22', '#3d342a', '#f5b544'], ['#fdfbf6', '#f7f1e4', '#ffffff', '#faf5ea', '#f2e9d6', '#ebdfc5', '#eee4d0', '#e4d8bf', '#b45309']],
    ['mono', 'أبيض وأسود', ['#111111', '#171717', '#1b1b1b', '#222222', '#242424', '#2b2b2b', '#282828', '#303030', '#e9e9e7'], ['#ffffff', '#f5f5f5', '#ffffff', '#f6f6f6', '#ededed', '#e4e4e4', '#e8e8e8', '#dedede', '#111111']]
  ];
  /* 162+: «حيوي» صار الافتراضي؛ اللي كان على «محايد» (الافتراضي القديم) بينقل مرة وحدة */
  try{ if(lsGet('ss_fx_pal_v2') !== '1'){ if((lsGet('ss_fx_pal') || 'neutral') === 'neutral') lsSet('ss_fx_pal', 'vivid'); lsSet('ss_fx_pal_v2', '1'); } }catch(e){}
  function curPal(){ var id = lsGet('ss_fx_pal') || 'vivid'; return PAL.filter(function(x){ return x[0] === id; })[0] || PAL[0]; }
  function hexA(h, a){ var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function applyPal(dark){
    var P = curPal(), c = dark ? P[2] : P[3], h = d.documentElement;
    var V = { '--base': c[0], '--side': c[1], '--card': c[2], '--card2': c[3], '--hover': c[4], '--sel': c[5], '--ln': c[6], '--ed': c[7], '--ac': c[8], '--acs': hexA(c[8], dark ? .16 : .1) };
    if(P[0] === 'mono'){ V['--pri'] = c[8]; V['--onpri'] = c[0]; }
    if(root){ Object.keys(V).forEach(function(k){ root.style.setProperty(k, V[k]); }); if(P[0] !== 'mono'){ root.style.removeProperty('--pri'); root.style.removeProperty('--onpri'); } root.setAttribute('data-pal', P[0]); }
    var D = { '--dlg': c[2], '--dlg2': c[3], '--dlg-ln': c[6], '--dlg-in': c[3], '--dlg-inb': c[7], '--dlg-ac': c[8], '--pal-base': c[0], '--pal-ac': c[8] };
    Object.keys(D).forEach(function(k){ h.style.setProperty(k, D[k]); });
    var meta = d.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content', c[0]);
    try{ localStorage.setItem('ss_fx_boot', JSON.stringify([dark ? 1 : 0, c[0], c[8], hexA(c[8], .55), ''])); }catch(e){}
  }
  function applyLook(){
    var mode = lsGet('ss_fx_mode') || 'auto', dark = mode === 'dark' || (mode === 'auto' && !(W.matchMedia && W.matchMedia('(prefers-color-scheme: light)').matches));
    var t = curTheme(), bg = t[2] ? 'themed' : 'plain', h = d.documentElement; if(t[7] && mode === 'auto') dark = false;
    var V = { '--fxc1': t[2] || 'transparent', '--fxc2': t[3] || 'transparent', '--fxc3': t[4] || 'transparent', '--fxac': t[5], '--fxbase': t[6] };
    Object.keys(V).forEach(function(k){ h.style.setProperty(k, V[k]); });
    try{ if(W.THEMES && W.applyTheme && !FXT.some(function(x){ return x[0] === t[0]; }) && W.THEMES.some(function(x){ return x.id === t[0]; }) && h.getAttribute('data-theme') !== t[0]) W.applyTheme(t[0]); }catch(e){}
    var meta = d.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content', dark ? t[6] : '#eef1fb');
    h.classList.add('fx-skin'); h.classList.toggle('fx-skin-light', !dark); h.setAttribute('data-fxbg', bg);
    try{ localStorage.setItem('ss_fx_boot', JSON.stringify([dark ? 1 : 0, t[6],t[2] || '', t[3] || '', t[4] || ''])); }catch(e){}
    if(root){ root.classList.toggle('light', !dark); root.setAttribute('data-bg', bg); }
    applyPal(dark);
  }

  /* ---------- شاشة الدراسة: عدّاد زجاجي كامل بدون تشتيت ---------- */
  var study = null;
  function openStudy(mins){
    if(study) return;
    var len = +mins > 0 ? +mins : (W.timerSettings && W.timerSettings.focus) || 25, end = Date.now() + len * 60000, paused = 0, ov = d.createElement('div');
    ov.className = 'fx-study' + (root && root.classList.contains('light') ? ' light' : ''); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'جلسة دراسة');
    ov.innerHTML = '<div class="fx-bgfx"></div><div class="fx-st-in"><small>جلسة تركيز · ' + len + ' دقيقة</small><div class="fx-st-ring"><b id="fxStT"></b></div><p>حط التلفون على جنب وركّز على إشي واحد.</p>' +
      '<div class="fx-actions"><button type="button" class="fx-btn ghost" data-st="pause">إيقاف مؤقت</button><button type="button" class="fx-btn ghost" data-st="stop">إنهاء</button></div></div>';
    d.body.appendChild(ov); study = { ov: ov };
    var t = ov.querySelector('#fxStT'), ring = ov.querySelector('.fx-st-ring');
    function tick(){
      var left = paused ? paused : Math.max(0, end - Date.now()), s = Math.ceil(left / 1000);
      t.textContent = pad(Math.floor(s / 60)) + ':' + pad(s % 60); ring.style.setProperty('--p', 100 - left / (len * 600));
      if(!paused && left <= 0){ close(true); }
    }
    function close(done){
      clearInterval(study.iv); ov.remove(); study = null;
      if(done){ if(W.logStudySession) W.logStudySession(len); try{ d.dispatchEvent(new CustomEvent('ss:focus-complete', { detail: { minutes: len } })); }catch(e){} if(W.celebrate) W.celebrate(2); if(W.toast) W.toast('🎉 خلصت ' + len + ' دقيقة دراسة!', 'success', 4000); }
      soon();
    }
    ov.addEventListener('click', function(e){ var b = e.target.closest('[data-st]'); if(!b) return;
      if(b.getAttribute('data-st') === 'stop') close(false);
      else if(paused){ end = Date.now() + paused; paused = 0; b.textContent = 'إيقاف مؤقت'; } else { paused = end - Date.now(); b.textContent = 'كمّل'; } });
    study.iv = setInterval(tick, 250); tick();
  }

  /* ---------- البحث والأوامر السريعة: «/» أو Ctrl+K ---------- */
  function openCmd(){
    if(d.querySelector('.fx-cmd')) return;
    var ov = d.createElement('div'); ov.className = 'fx-cmd' + (root && root.classList.contains('light') ? ' light' : '');
    ov.innerHTML = '<div class="fx-cmd-box" role="dialog" aria-label="بحث وأوامر"><input type="text" placeholder="ابحث عن مادة، مهمة، أو اكتب مهمة جديدة…" aria-label="بحث"><div class="fx-cmd-list"></div></div>';
    d.body.appendChild(ov);
    var inp = ov.querySelector('input'), list = ov.querySelector('.fx-cmd-list'), items = [], sel = 0;
    function norm(s){ return String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي'); }
    function draw(){
      var q = norm(inp.value.trim()); items = [];
      Object.keys(VIEWS).forEach(function(k){ if(!q || norm(VIEWS[k][0]).indexOf(q) > -1) items.push({ l: 'افتح ' + VIEWS[k][0], s: 'صفحة', run: function(){ go(k); } }); });
      if(!q || 'دراسه'.indexOf(q) > -1 || norm('ابدأ جلسة').indexOf(q) > -1) items.push({ l: 'ابدأ جلسة دراسة', s: 'تركيز', run: openStudy });
      if(q){ (sp().courses || []).forEach(function(c){ if(norm(c.name).indexOf(q) > -1) items.push({ l: c.name, s: 'مادة', run: function(){ if(W.Hub && W.Hub.openCourse) W.Hub.openCourse(c.id); } }); });
        (sp().tasks || []).forEach(function(t){ if(!t.done && norm(t.title).indexOf(q) > -1) items.push({ l: t.title, s: 'مهمة · اضغط لإنجازها', run: function(){ if(W.toggleTask) W.toggleTask(t.id); soon(); } }); });
        var qq = inp.value.trim(), isQ = /[؟?]$/.test(qq) || /^(شو|ايش|إيش|كيف|كم|قديش|متى|وين|ليش|هل|اعطيني|خطط|خطّط|لخص|لخّص|اقترح)/.test(qq);
        var askIt = { l: '✦ اسأل المساعد: «' + qq + '»', s: 'مساعد ذكي', run: function(){ askAI(qq); } };
        if(isQ) items.unshift(askIt); else if(qq.length >= 3) items.push(askIt);
        items.push({ l: '＋ أضف مهمة: «' + inp.value.trim() + '»', s: 'Enter', run: function(){ var f = d.createElement('form'); f.className = 'fx-add'; f.innerHTML = '<input>'; f.querySelector('input').value = inp.value.trim(); onSubmit({ target: f, preventDefault: function(){} }); } }); }
      items = items.slice(0, 9); sel = Math.min(sel, items.length - 1); if(sel < 0) sel = 0;
      list.innerHTML = items.map(function(x, i){ return '<button type="button" class="' + (i === sel ? 'on' : '') + '" data-i="' + i + '"><b>' + esc(x.l) + '</b><small>' + esc(x.s) + '</small></button>'; }).join('');
    }
    function run(i){ var x = items[i]; close(); if(x) x.run(); }
    function close(){ ov.remove(); d.removeEventListener('keydown', key, true); }
    function key(e){ if(e.key === 'Escape'){ e.preventDefault(); close(); } else if(e.key === 'ArrowDown'){ e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); draw(); } else if(e.key === 'ArrowUp'){ e.preventDefault(); sel = Math.max(0, sel - 1); draw(); } else if(e.key === 'Enter'){ e.preventDefault(); run(sel); } }
    d.addEventListener('keydown', key, true);
    inp.addEventListener('input', function(){ sel = 0; draw(); });
    list.addEventListener('click', function(e){ var b = e.target.closest('[data-i]'); if(b) run(+b.getAttribute('data-i')); });
    ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
    draw(); setTimeout(function(){ inp.focus(); }, 30);
  }
  d.addEventListener('keydown', function(e){
    if(!d.documentElement.classList.contains('fx-on') || d.querySelector('.modal-backdrop,.hub-sheet-backdrop,.fx-cmd,.fx-study')) return;
    var tg = (d.activeElement || {}).tagName; if(/INPUT|TEXTAREA|SELECT/.test(tg)) return;
    if(e.key === '/'){ e.preventDefault(); e.stopPropagation(); openCmd(); }
  }, true);

  /* ---------- الهيكل والرسم ---------- */
  /* ---------- الشريط الجانبي (كمبيوتر): الصفحات + موادي + أدوات، ويتحدّث مع كل رسم ---------- */
  function sideHtml(){
    var s = sp(), prof = s.profile || {}, open = (s.tasks || []).filter(function(x){ return x && x.title && !x.done; }), exN = upcomingExams().length;
    var top = { today: 1, timetable: 1, tasks: 1, exams: 1, grades: 1, courses: 1, budget: 1, timer: 1, attendance: 1, plan: 1, tree: 1, settings: 1 };
    function it(v, icon, label, cnt){ var on = cur === v || (v === 'plan' && cur === 'tree') || (v === 'more' && !top[cur]);
      return '<button type="button" class="fx-snav' + (on ? ' on' : '') + '" data-fx="go" data-v="' + v + '"' + (on ? ' aria-current="page"' : '') + '>' + (on ? '<i class="fx-sind" aria-hidden="true"></i>' : '') + ic(icon) + '<span>' + label + '</span>' + (cnt ? '<em>' + cnt + '</em>' : '') + '</button>'; }
    var cs = (s.courses || []).filter(function(c){ return c && c.name && !c.completed; });
    return '<div class="fx-sws" data-fx="go" data-v="today" role="link" tabindex="0">' + LOGO + '<div><b>مساحتي</b><small>' + esc(prof.major || 'الجامعة الهاشمية') + '</small></div></div>' +
      '<button type="button" class="fx-ssearch" data-fx="cmd">' + ic('search') + '<span>بحث وأوامر</span><kbd>/</kbd></button>' +
      '<nav class="fx-sgrp" aria-label="الصفحات">' + it('today', 'today', 'اليوم') + it('timetable', 'timetable', 'الجدول') + it('tasks', 'tasks', 'المهام', open.length) + it('exams', 'exam', 'الامتحانات', exN) + it('grades', 'grades', 'العلامات') + '</nav>' +
      (cs.length ? '<div class="fx-shd"><span>موادي</span><button type="button" class="fx-sadd" data-fx="go" data-v="courses" aria-label="كل المواد">' + ic('more') + '</button></div><div class="fx-sgrp">' +
        cs.map(function(c){ return '<button type="button" class="fx-scrs" data-fx="course" data-n="' + esc(c.name) + '"><i class="fx-dot" style="--h:' + hue(c.name) + '"></i><span>' + esc(c.name) + '</span></button>'; }).join('') + '</div>' : '') +
      '<div class="fx-shd"><span>أدوات</span></div><nav class="fx-sgrp" aria-label="أدوات">' + it('budget', 'wallet', 'الميزانية') + it('timer', 'clock', 'مؤقت التركيز') + it('attendance', 'ucheck', 'الحضور') + it('plan', 'route', 'الخطة الدراسية') + it('more', 'more', 'المزيد') + '</nav>' +
      '<div class="fx-sfoot">' + it('settings', 'gear', 'الإعدادات') +
        '<span class="fx-sicons"><button type="button" class="fx-ib" data-fx="ai" aria-label="المساعد" title="المساعد الذكي">' + ic('spark') + '</button><button type="button" class="fx-ib" data-fx="mode-cycle" aria-label="المظهر" title="المظهر">' + ic(root && root.classList.contains('light') ? 'sun' : 'moon') + '</button><button type="button" class="fx-ib" data-fx="sync" aria-label="المزامنة" title="المزامنة">' + ic('sync') + '</button></span></div>';
  }
  function build(){
    root = d.createElement('div'); root.id = 'fx'; root.setAttribute('dir', 'rtl');
    var nav = NAV.map(function(k){ return '<button type="button" data-fx="go" data-v="' + k + '">' + ic(k) + '<span>' + VIEWS[k][0] + '</span></button>'; }).join('');
    root.innerHTML = '<div class="fx-bgfx" aria-hidden="true"></div><aside class="fx-side" id="fxSide" aria-label="القائمة"></aside><header class="fx-top"><div class="fx-logo" data-fx="go" data-v="today" role="link" tabindex="0" aria-label="الرئيسية">' + LOGO + 'مساحتي</div><nav class="fx-nav" aria-label="التنقل">' + nav + '</nav>' +
      '<button type="button" class="fx-ib" data-fx="ai" aria-label="المساعد" title="المساعد الذكي"><svg class="fx-i" viewBox="0 0 24 24"><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/></svg></button><button type="button" class="fx-ib" data-fx="cmd" aria-label="بحث (/)" title="بحث وأوامر ( / )"><svg class="fx-i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button><button type="button" class="fx-ib" data-fx="mode-cycle" aria-label="المظهر" id="fxMode"></button><button type="button" class="fx-ib" data-fx="sync" id="fxSync" aria-label="المزامنة">' + ic('cloud') + '</button></header>' +
      '<main class="fx-main" id="fxMain" tabindex="-1"></main>';
    d.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('submit', onSubmit);
    /* عنوان المهمة حدّه 120 حرف: عدّاد بيظهر من 90 وتنبيه واضح عند الحد (بدل القص الصامت) */
    root.addEventListener('input', function(e){ var i = e.target; if(!i.closest || !i.closest('.fx-add')) return; var c = d.getElementById('fxAddCnt'); if(!c) return; var n = i.value.length, mx = +i.getAttribute('maxlength') || 120;
      c.textContent = n >= mx ? 'وصلت للحد: ' + mx + ' حرف' : n >= 90 ? 'باقي ' + (mx - n) + ' حرف' : ''; c.classList.toggle('max', n >= mx); });
    /* إيماءات السحب (تلفون): يمين/يسار بين تبويبات الشريط — RTL: سحب الإصبع لليمين = التبويب اللي بعده */
    var sw = null;
    root.addEventListener('touchstart', function(e){ var t = e.touches[0]; if(e.touches.length !== 1 || W.innerWidth > 820 || e.target.closest('input,textarea,select,.fx-chips,.fx-kpis,.fx-campus,.fx-tree,.fx-durs,.fx-cmd,.fx-study')){ sw = null; return; } sw = { x: t.clientX, y: t.clientY, t: Date.now() }; }, { passive: true });
    root.addEventListener('touchend', function(e){ if(!sw) return; var t = e.changedTouches[0], dx = t.clientX - sw.x, dy = t.clientY - sw.y, dt = Date.now() - sw.t; sw = null;
      if(dt > 700 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      var i = NAV.indexOf(cur); if(i < 0){ if(dx < 0) history.back(); return; }
      var j = i + (dx > 0 ? 1 : -1); if(j < 0 || j >= NAV.length) return;
      var m = d.getElementById('fxMain'); go(NAV[j]); if(m){ m.classList.remove('sw-l', 'sw-r'); void m.offsetWidth; m.classList.add(dx > 0 ? 'sw-r' : 'sw-l'); }
      try{ if(navigator.vibrate) navigator.vibrate(8); }catch(err){} }, { passive: true });
    root.addEventListener('input', gpaInput); root.addEventListener('change', gpaInput);
    applyLook();
    if(W.matchMedia) try{ W.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyLook); }catch(e){}
  }
  function countUp(main){
    if(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(W.innerWidth > 820) main.querySelectorAll('.fx-num').forEach(function(el){ var to = parseFloat(el.getAttribute('data-n')); if(!isFinite(to) || to <= 0) return; var dec = /\./.test(el.getAttribute('data-n')) ? 2 : 0, t0 = performance.now();
      var fin = el.textContent, unit = fin.replace(/^[sd.,-]+/, '');
      (function step(t){ var k = Math.min(1, (t - t0) / 600); el.textContent = k < 1 ? (to * (1 - Math.pow(1 - k, 3))).toFixed(dec) + (unit ? ' ' + unit.trim() : '') : fin; if(k < 1) requestAnimationFrame(step); })(t0); });
  }
  function render(anim){
    if(!root || !on() || !W.space) return;
    var now = new Date(), name = ((sp().profile || {}).name || '').split(' ')[0], main = d.getElementById('fxMain');
    var head = cur === 'today' ? '' : '<div class="fx-head">' + (NAV.indexOf(cur) < 0 ? (cur === 'tree' ? sub('الخطة الدراسية', 'plan') : sub('المزيد')) : '') + '<h1>' + VIEWS[cur][0] + '</h1></div>';
    var st = W.getSyncStatus ? W.getSyncStatus() : null, sb = d.getElementById('fxSync'); if(st){ sb.title = st.text; sb.className = 'fx-ib lv-' + st.level; }
    var mode = lsGet('ss_fx_mode') || 'auto'; d.getElementById('fxMode').innerHTML = ic(root.classList.contains('light') ? 'sun' : 'moon');
    var keep = main.scrollTop, input = main.querySelector('.fx-add input'), typed = input ? input.value : '';
    var html = head + VIEWS[cur][1]();
    if(!anim && cur !== 'campus' && html === render._h && cur === render._v && main.children.length) return;   /* ما تغيّر إشي: لا تعيد البناء */
    render._h = html; render._v = cur;
    parkCampus();
    main.innerHTML = html;
    if(cur === 'timetable'){ var oc = main.querySelector('.fx-chip.on'); if(oc && oc.scrollIntoView) try{ oc.scrollIntoView({ inline: 'center', block: 'nearest' }); }catch(e){} }
    if(cur === 'campus') mountCampus();
    var spf = main.querySelector('.fx-sp'); if(spf) spf.addEventListener('toggle', function(){ lsSet('ss_fx_sp', spf.open ? '1' : '0'); });
    if(cur === 'budget' && W.BudgetPlan){ var bf = main.querySelector('.fx-bp'), bpr = function(){ try{ W.BudgetPlan.render(); }catch(e){} };   /* تخطيط الميزانية ثقيل: بيتبنى بس لما يكون مفتوح */
      if(!bf || bf.open) bpr(); else { var ric = W.requestIdleCallback || function(f){ return setTimeout(f, 0); }; ric(function(){ if(d.getElementById('budgetPlan')) bpr(); }, { timeout: 600 }); }   /* مسكّر: بعد ما تنرسم الصفحة */
      if(bf) bf.addEventListener('toggle', function(){ lsSet('ss_fx_bp', bf.open ? '1' : '0'); }); }
    main.classList.toggle('anim', !!anim);
    if(typed){ var ni = main.querySelector('.fx-add input'); if(ni) ni.value = typed; }
    if(!anim) main.scrollTop = keep; else { main.scrollTop = 0; countUp(main); }
    if(cur === 'tasks') bindDrag(main);
    var sd = d.getElementById('fxSide'); if(sd){ var shtml = sideHtml(); if(shtml !== render._s){ render._s = shtml; sd.innerHTML = shtml; } }
    root.querySelectorAll('.fx-nav button').forEach(function(b){ var a = b.getAttribute('data-v') === (NAV.indexOf(cur) < 0 ? 'more' : cur); b.classList.toggle('on', a); if(a) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    void mode;
  }
  function soon(){ clearTimeout(timer); timer = setTimeout(function(){ render(false); }, 60); }
  var OLD = { today: 'dashboard', grades: 'gradecalc', tree: 'plan', more: 'dashboard', settings: 'dashboard' };
  function go(v, fromPop){ var nv = VIEWS[v] ? v : 'today', same = nv === cur; cur = nv; lsSet('ss_fx_view', cur);
    if(!fromPop && !same) try{ var t = OLD[cur] || cur; history.pushState({ tab: d.getElementById(t) ? t : 'dashboard', fx: cur }, '', '#' + cur); }catch(e){}
    var m = d.getElementById('fxMain'), red = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* انتقال الصفحات (View Transitions): القديمة بتتلاشى والجديدة بتنزلق من اتجاه التنقل، والشريط الجانبي ثابت ومؤشره بيتحرّك */
    /* View Transitions انلغى (168): أثناءه الصفحة القديمة بتضل معروضة ~0.4 ث فالضغطات بتروح عليها وبتضيع (وثقيل على التلفون). دخول الصفحة بأنيميشن CSS خفيف (.anim) بدله */
    var narrow = true;
    if(!same && !narrow && d.startViewTransition && !red && d.documentElement.classList.contains('fx-on')){
      var ord = ['today', 'timetable', 'tasks', 'exams', 'grades', 'courses', 'budget', 'timer', 'attendance', 'plan', 'tree', 'more', 'settings'], a0 = ord.indexOf(go._prev), a1 = ord.indexOf(cur);
      d.documentElement.setAttribute('data-vtdir', a0 > -1 && a1 > -1 && a1 < a0 ? 'back' : 'fwd'); d.documentElement.classList.add('vt-run');
      try{ var vt = d.startViewTransition(function(){ render(true); if(m && !fromPop) m.scrollTop = 0; }); var off = function(){ d.documentElement.classList.remove('vt-run'); }; vt.finished.then(off, off); if(vt.ready) vt.ready.catch(function(){}); if(vt.updateCallbackDone) vt.updateCallbackDone.catch(function(){}); }
      catch(e){ d.documentElement.classList.remove('vt-run'); render(true); if(m && !fromPop) m.scrollTop = 0; }
    } else { render(true); if(m && !fromPop) m.scrollTop = 0; }
    go._prev = cur; }
  function classic(tab){ parkCampus(); d.documentElement.classList.remove('fx-on'); if(W.switchTab) W.switchTab(tab || 'dashboard'); }
  function back(){ d.documentElement.classList.add('fx-on'); render(true); }
  /* قائمة ⋯ بالجدول: نافذة عائمة (position:fixed) فوق كل إشي — بدل <details> اللي كانت تنفتح ورا اللوحة الأسبوعية */
  function ttMenu(btn){
    var old = d.getElementById('fxTtPop'), same = old && old._from === btn;
    if(old) ttClose();
    if(same) return;
    var p = d.createElement('div'); p.id = 'fxTtPop'; p.className = 'fx-ttmenu fx-ttpop'; p.setAttribute('role', 'menu'); p._from = btn;
    p.innerHTML = tool('share', 'مشاركة كصورة') + tool('cal', 'ربط التقويم') + (W.printTimetable ? tool('fn', 'طباعة', 'printTimetable') : '') + (W.clearTimetable ? tool('fn', 'مسح الجدول', 'clearTimetable', 1) : '');
    root.appendChild(p);
    var r = btn.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight, vw = W.innerWidth, vh = W.innerHeight;
    var left = Math.min(Math.max(8, r.left), vw - w - 8), top = r.bottom + 8; if(top + h > vh - 8) top = Math.max(8, r.top - h - 8);
    p.style.left = left + 'px'; p.style.top = top + 'px';
    btn.setAttribute('aria-expanded', 'true');
    var first = p.querySelector('button'); if(first) try{ first.focus({ preventScroll: true }); }catch(e){}
    setTimeout(function(){ d.addEventListener('click', ttOutside, true); d.addEventListener('keydown', ttKey, true); W.addEventListener('resize', ttClose); var m = d.getElementById('fxMain'); if(m) m.addEventListener('scroll', ttClose, { once: true }); }, 0);
  }
  function ttClose(){
    var p = d.getElementById('fxTtPop'); if(!p) return;
    if(p._from) p._from.setAttribute('aria-expanded', 'false');
    p.remove(); d.removeEventListener('click', ttOutside, true); d.removeEventListener('keydown', ttKey, true); W.removeEventListener('resize', ttClose);
  }
  function ttOutside(e){ var p = d.getElementById('fxTtPop'); if(!p) return; if(p.contains(e.target)){ setTimeout(ttClose, 0); return; } if(p._from && p._from.contains(e.target)) return; ttClose(); }
  function ttKey(e){ if(e.key === 'Escape'){ var p = d.getElementById('fxTtPop'), b = p && p._from; ttClose(); if(b) b.focus(); } }
  function onClick(e){
    var b = e.target.closest ? e.target.closest('[data-fx]') : null; if(!b || b.tagName === 'FORM') return;
    var a = b.getAttribute('data-fx'), v = b.getAttribute('data-v');
    if(a === 'go') go(v);
    else if(a === 'tog'){ var row = b.closest('.fx-task'); if(row) row.classList.add('pop'); if(W.toggleTask) W.toggleTask(b.getAttribute('data-id')); setTimeout(soon, 220); }
    else if(a === 'day'){ ttDay = +v; render(false); }
    else if(a === 'addtask'){ if(W.addTask) W.addTask(); }
    else if(a === 'ttmenu') ttMenu(b);
    else if(a === 'addclass'){ if(W.openSmartTimetable) W.openSmartTimetable(); }
    else if(a === 'askai'){ askAI(v || ''); }
    else if(a === 'study'){ if(b.getAttribute('data-c')) lsSet('ss_dp_focus', JSON.stringify({ d: today(), k: b.getAttribute('data-k') || '', c: b.getAttribute('data-c') })); openStudy(); }
    else if(a === 'cmd') openCmd();
    else if(a === 'course'){ var c = (sp().courses || []).filter(function(x){ return x.name === b.getAttribute('data-n'); })[0]; if(c && W.Hub && W.Hub.openCourse) W.Hub.openCourse(c.id, b.getAttribute('data-sec') || undefined); }
    else if(a === 'call'){ var id = b.getAttribute('data-id'); if(/^(addMyCourse|addExam|editExam|deleteExam|openExamPlan|addBudgetItem|editBudget|deleteBudget|openTimerSettings|downloadBackup|restorePreviousBackup|exportCalendar|exportPDF|importFromPlan)$/.test(v) && typeof W[v] === 'function') W[v](id || undefined); }
    else if(a === 'tsel'){ treeSel = v || null; render(false); if(treeSel){ var ti = d.querySelector('.fx-tinfo'); if(ti && ti.scrollIntoView) ti.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
    else if(a === 'tdone'){ if(treeSel){ if(v === '1' && W.askCourseCompleted) W.askCourseCompleted(treeSel); else if(v === '1' && W.markCourseCompleted) W.markCourseCompleted(treeSel); else if(v === '0' && W.unmarkCourseCompleted) W.unmarkCourseCompleted(treeSel); } soon(); }
    else if(a === 'fn'){ if(/^(printTimetable|clearTimetable|openUploadHub|openSemesterArchive|closeSemester|clearBudget)$/.test(v) && typeof W[v] === 'function'){ W[v](); soon(); } }
    else if(a === 'attnow'){ if(W.TodayLogic && W.TodayLogic.markPresent(b.getAttribute('data-n'), b.getAttribute('data-k'))){ try{ if(navigator.vibrate) navigator.vibrate(10); }catch(e){} } soon(); }
    else if(a === 'sbtn'){ var ob = d.getElementById(v); if(ob && /^(syncCodeBtn|calSyncBtn|exportBackupBtn|importBackupBtn|restorePrevBtn|notifBtn|ocrLabBtn|widgetBtn|updateBtn|pwaInstallBtn|integrityBtn|diagBtn|onbBtn)$/.test(v)){ ob.click(); setTimeout(function(){ if(W.closeSettingsMenu) W.closeSettingsMenu(); soon(); }, 400); } }
    else if(a === 'font'){ lsSet('ss_font', v); if(v === 'sm' || v === 'lg') d.documentElement.setAttribute('data-fs', v); else d.documentElement.removeAttribute('data-fs'); render(false); }
    else if(a === 'eximp'){ if(W.ExamImport) W.ExamImport.start(); }
    else if(a === 'spcfg'){ if(W.StudyPlan && W.StudyPlan.openConfig) W.StudyPlan.openConfig(soon); }
    else if(a === 'sptog'){ if(W.StudyPlan && W.StudyPlan.setOn){ W.StudyPlan.setOn(!W.StudyPlan.config().on); render(false); } }
    else if(a === 'coach'){ if(W.Coach) W.Coach.run(v); soon(); }
    else if(a === 'coachx'){ if(W.Coach) W.Coach.dismiss(v); soon(); }
    else if(a === 'ocr' || a === 'ocrcam'){ if(W.OcrImport && W.OcrImport.start) W.OcrImport.start(a === 'ocrcam'); }
    else if(a === 'share'){ if(W.withModule) W.withModule('ShareTT', 'share.js', function(m){ m.share(); }); }
    else if(a === 'cal'){ if(W.withModule) W.withModule('IcsImport', 'ics-import.js', function(m){ m.openHub(); }); }
    else if(a === 'dpopen'){ if(W.DayPlan && W.DayPlan.openSheet) W.DayPlan.openSheet(); }
    else if(a === 'dpt'){ if(W.DayPlan && W.DayPlan.toggle){ b.classList.toggle('on'); W.DayPlan.toggle(b.getAttribute('data-k')); try{ if(navigator.vibrate) navigator.vibrate(8); }catch(e){} soon(); } }
    else if(a === 'studyn') openStudy(+v);
    else if(a === 'tmsel'){ lsSet('ss_fx_dur', String(+v)); render(false); }
    else if(a === 'tmcrs'){ lsSet('ss_fx_tmc', v || ''); render(false); }
    else if(a === 'tmgo'){ var tc = lsGet('ss_fx_tmc') || ''; if(tc) lsSet('ss_dp_focus', JSON.stringify({ d: today(), k: '', c: tc })); openStudy(+lsGet('ss_fx_dur') || ((W.timerSettings && W.timerSettings.focus) || 25)); }
    else if(a === 'tmgoal'){ var g = W.prompt ? W.prompt('هدف التركيز اليومي (دقائق)', lsGet('ss_fx_goal') || '120') : null; if(g !== null && +g >= 10 && +g <= 720){ lsSet('ss_fx_goal', String(Math.round(+g))); render(false); } }
    else if(a === 'retry'){ if(W.retryCloud) W.retryCloud(true); }
    else if(a === 'att'){ if(W.markAttendance) W.markAttendance(b.getAttribute('data-n'), v); soon(); }
    else if(a === 'classic') classic(v);
    else if(a === 'classicui'){ lsSet('ss_ui', 'classic'); classic('dashboard'); if(W.toast) W.toast('رجعت للواجهة القديمة — الزر العائم بيرجّعك', 'info', 3500); }
    else if(a === 'settings'){ var sm = d.getElementById('settingsMenu'); if(sm && sm.parentNode !== d.body) d.body.appendChild(sm); var s = d.getElementById('settingsBtn'); if(s) setTimeout(function(){ s.click(); }, 0); }
    else if(a === 'sync'){ if(W.SB && W.SB.showSyncPanel) W.SB.showSyncPanel(); }
    else if(a === 'mode'){ lsSet('ss_fx_mode', v); applyLook(); render(false); }
    else if(a === 'mode-cycle'){ lsSet('ss_fx_mode', root.classList.contains('light') ? 'dark' : 'light'); applyLook(); render(false); }
    else if(a === 'gpaadd'){ if(!Array.isArray(W.gpaRows)) W.gpaRows = []; W.gpaRows.push({ name: '', hrs: 3, grade: Object.keys(W.GRADES || {})[0] || '' }); saveGpa(); render(false); var ins = d.querySelectorAll('.fx-gpa-row input[data-gk=name]'); if(ins.length) ins[ins.length - 1].focus(); }
    else if(a === 'gpadel'){ if(W.gpaRows){ W.gpaRows.splice(+v, 1); saveGpa(); render(false); } }
    else if(a === 'gpafill'){ if(!Array.isArray(W.gpaRows)) W.gpaRows = []; var have = W.gpaRows.map(function(r){ return r.name; }), DB = W.COURSES_DB || {}, n0 = W.gpaRows.length; (sp().courses || []).forEach(function(c){ if(c && c.name && have.indexOf(c.name) < 0) W.gpaRows.push({ name: c.name, hrs: +c.hours || (DB[c.name] && DB[c.name].h) || 3, grade: Object.keys(W.GRADES || {})[0] || '' }); }); saveGpa(); render(false); if(W.toast) W.toast(W.gpaRows.length > n0 ? 'انضافت ' + (W.gpaRows.length - n0) + ' مواد' : 'كل موادك موجودة', 'info', 1800); }
    else if(a === 'ai') askAI('');
    else if(a === 'sjump'){ var se = d.getElementById('fxS-' + v), mm = d.getElementById('fxMain'); if(se && mm) mm.scrollTo({ top: se.offsetTop - 20, behavior: 'smooth' }); }
    else if(a === 'pal'){ lsSet('ss_fx_pal', v); applyLook(); render(false); }
    else if(a === 'theme'){ lsSet('ss_fx_theme', v); applyLook(); render(false); if(W.toast) W.toast('تغيّر الثيم', 'success', 1200); }
  }
  /* بعد أول رسم وبوقت فاضي: نحمّل الخريطة (أماكن القاعات وإشعار «اطلع الآن») */
  function preloadLazy(){
    var idle = W.requestIdleCallback || function(f){ return setTimeout(f, 1); };
    setTimeout(function(){ idle(function(){ if(!W.CampusMap && W.withModule) W.withModule('CampusMap', 'campus-map.js', function(){ if(cur !== 'campus') render(false); }); }, { timeout: 4000 }); }, 2500);
  }
  /* الإضافة السريعة: نفهم الموعد والمادة من النص («واجب شبكات بكرة»، «تقرير الأحد»، «25/11») — محلي */
  function quickParse(txt){
    var n = String(txt).replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي'), base = new Date(), due = '';
    function plus(k){ var x = new Date(base); x.setDate(x.getDate() + k); return ymd(x); }
    if(/بعد\s*بكر[اه]/.test(n)) due = plus(2); else if(/بكر[اه]|غدا|بكره/.test(n)) due = plus(1); else if(/اليوم|هلا|هسا/.test(n)) due = plus(0);
    else { var DN = ['احد', 'اثنين', 'ثلاثاء', 'اربعاء', 'خميس', 'جمعه', 'سبت'];
      DN.forEach(function(dn, i){ if(!due && new RegExp('(^|\\s)(ال)?' + dn + '($|\\s)').test(n)){ var k = (i - base.getDay() + 7) % 7; due = plus(k || 7); } }); }
    var m = !due && n.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?/);
    if(m){ var y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : base.getFullYear(), dt = new Date(y, +m[2] - 1, +m[1]); if(!m[3] && dt < new Date(base.getFullYear(), base.getMonth(), base.getDate())) dt.setFullYear(y + 1); if(!isNaN(dt)) due = ymd(dt); }
    var course = '';
    (sp().courses || []).forEach(function(c){ if(course || !c || !c.name) return; var cn = String(c.name).replace(/\(.*?\)/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').trim(), first = cn.split(/\s+/)[0];
      if(cn && (n.indexOf(cn) > -1 || (first.length >= 4 && n.indexOf(first) > -1))) course = c.name; });
    return { due: due, course: course };
  }
  function onSubmit(e){
    var f = e.target; if(!f.classList || !f.classList.contains('fx-add')) return;
    e.preventDefault();
    var inp = f.querySelector('input'), txt = String(inp.value || '').trim(); if(!txt){ if(W.addTask) W.addTask(); return; }   /* «+» والخانة فاضية = نافذة المهمة الكاملة */
    var qp = quickParse(txt), due = qp.due, course = qp.course;
    if(typeof due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(due)) due = today();
    sp().tasks = sp().tasks || [];
    sp().tasks.push({ id: W.uid ? W.uid() : String(Date.now()), title: txt.slice(0, 120), type: 'task', course: typeof course === 'string' ? course : '', due: due, done: false, priority: 'normal' });
    if(W.saveSpace) W.saveSpace(); if(W.renderAll) try{ W.renderAll(); }catch(err){}
    inp.value = ''; if(W.toast) W.toast('انضافت' + (due === today() ? ' · اليوم' : ' · ' + due), 'success', 1800);
    render(false); var ni = d.querySelector('#fxMain .fx-add input'); if(ni) ni.focus();
  }
  function init(){
    applyLook();
    build(); applyLook(); watchDialogs();
    var bk = d.createElement('button'); bk.type = 'button'; bk.id = 'fxBack'; bk.textContent = '✨ الواجهة الجديدة'; bk.addEventListener('click', function(){ lsSet('ss_ui', 'focus'); back(); }); d.body.appendChild(bk);
    var hv = (location.hash || '').slice(1); cur = VIEWS[hv] && hv !== 'dashboard' ? hv : VIEWS[lsGet('ss_fx_view')] ? lsGet('ss_fx_view') : 'today';
    if(on()) d.documentElement.classList.add('fx-on');
    if(typeof W.saveSpace === 'function' && !W.saveSpace._fx){ var o = W.saveSpace; W.saveSpace = function(){ var r = o.apply(this, arguments); soon(); return r; }; W.saveSpace._fx = true; }
    d.addEventListener('visibilitychange', function(){ if(!d.hidden) soon(); });
    try{ history.replaceState(Object.assign({}, history.state || {}, { fx: cur }), '', location.href); }catch(e){}
    W.addEventListener('popstate', function(e){ if(!d.documentElement.classList.contains('fx-on')) return; var v = e.state && e.state.fx; if(!v){ var h = (location.hash || '').slice(1); v = VIEWS[h] ? h : 'today'; } if(v !== cur || !d.querySelector('.modal-backdrop')) go(v, true); });
    /* أزرار الماوس الجانبية (3=رجوع، 4=تقدّم) لبيئات ما بتترجمها لسجل المتصفح (مثل WebView) */
    W.addEventListener('mouseup', function(e){ if(!d.documentElement.classList.contains('fx-on')) return; if(e.button === 3){ e.preventDefault(); history.back(); } else if(e.button === 4){ e.preventDefault(); history.forward(); } });
    var lastWide = W.innerWidth > 820; W.addEventListener('resize', function(){ var w = W.innerWidth > 820; if(w !== lastWide){ lastWide = w; soon(); } });   /* بس لما نقطع حد التلفون/الكمبيوتر — الكيبورد ما بيعيد الرسم */
    setInterval(function(){ if(!d.hidden && d.documentElement.classList.contains('fx-on') && !d.querySelector('.modal-backdrop,.hub-sheet-backdrop') && cur !== 'campus' && !(d.activeElement && /INPUT|SELECT|TEXTAREA/.test(d.activeElement.tagName))) render(false); }, 30000);
    setTimeout(function(){ render(true); }, 50);
    preloadLazy();
  }
  /* الواجهة القديمة انحذفت: دوال رسمها (وكل اللي كان ملفوف فوقها) بتصير تحديث للواجهة الجديدة بس */
  var OLD_R = ['renderDashboard', 'renderMyDay', 'renderDaily', 'renderDailyQuote', 'renderExams', 'renderTimetable', 'renderGradeCalc', 'renderGpa', 'renderBudget', 'renderTasks', 'renderPlan', 'renderPlanSimulator', 'renderHuLinks', 'renderCourses', 'renderCourseDescriptions', 'renderAttendance'];
  /* النوافذ بشكل احترافي: نشيل الإيموجي من أول عناوين وأزرار النوافذ (نص بس). زر كله إيموجي (🗑) بيضل زي ما هو */
  var EMO = /^(?:[\u2600-\u27BF\u2B00-\u2BFF\u2190-\u21FF\u2300-\u23FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]|[\uFE0F\u200D])+\s*/;
  var EMO_SEL = '.modal h3,.modal h2,.modal .btn,.modal label,.modal summary,.stt-modal h3,.stt-modal .stt-btn,.stt-modal .stt-ocr-btn,.stt-stat,.hub-sheet .hub-sheet-title,.hub-sheet .hub-ctabs>*,.hub-sheet .btn,.hub-sheet h4,.hub-sheet h3,.ocri-box .ocri-title,.ocri-box .ocri-btn';
  function deEmoji(rootEl){
    var els = [];
    try{ if(rootEl.matches && rootEl.matches(EMO_SEL)) els.push(rootEl); els = els.concat([].slice.call(rootEl.querySelectorAll ? rootEl.querySelectorAll(EMO_SEL) : [])); }catch(e){ return; }
    els.forEach(function(el){
      var w = d.createTreeWalker(el, 4), t;   /* أول نص فعلي بالعنصر */
      while((t = w.nextNode())){ if(!/\S/.test(t.nodeValue)) continue;
        if(EMO.test(t.nodeValue)){ var rest = t.nodeValue.replace(EMO, ''); if(/\S/.test(rest) || /\S/.test(el.textContent.replace(t.nodeValue, ''))) t.nodeValue = rest; }
        break; }
    });
  }
  function watchDialogs(){
    if(!W.MutationObserver) return;
    new MutationObserver(function(ms){ ms.forEach(function(m){ [].forEach.call(m.addedNodes, function(n){ if(n.nodeType === 1 && n.closest && n.closest('.modal,.stt-modal,.hub-sheet,.ocri-box,.modal-backdrop,.stt-backdrop,.hub-sheet-backdrop,.ocri-overlay')) deEmoji(n); }); }); }).observe(d.body, { childList: true, subtree: true });
  }
  function retireOld(){ OLD_R.forEach(function(n){ if(typeof W[n] === 'function' && !W[n]._fx){ var f = function(){ soon(); }; f._fx = 1; W[n] = f; } }); }
  W.addEventListener('load', function(){ retireOld(); setTimeout(retireOld, 1500); });
  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 0); }); else setTimeout(init, 0);
  setTimeout(retireOld, 0);
  W.FocusUI = { look: function(){ applyLook(); render(false); }, view: function(){ return cur; }, soon: function(){ soon(); }, render: render, go: go, classic: classic, back: back, study: openStudy, cmd: openCmd };
})();
