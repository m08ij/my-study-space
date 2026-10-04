/* ============================================================
   📦 features.js — Dashboard, Tasks, Exams, Courses, etc.
   - كل التواريخ محلية (local) — لا UTC bugs
   - لا تكرار — كل دالة مرة واحدة
   - جاهز للتكامل مع widgets.js v8 + integrations.js + ai.js
   ============================================================ */
(function(){
  'use strict';
  if(window._featuresLoaded) return;
  window._featuresLoaded = true;

  /* ============ Helpers ============ */
  function esc(s){ return window.esc ? window.esc(s) : String(s==null?'':s); }
  function uid(){ return window.uid ? window.uid() : Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function today(){ return window.today ? window.today() : (function(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })(); }
  function toast(m, t, d){ if(window.toast) window.toast(m, t, d); }
  function saveSpace(){ if(window.saveSpace) window.saveSpace(); }
  function S(){ return window.S || {get:function(k,d){return d;}}; }
  function space(){ return window.space || {}; }
  function getS(){ return window.S || {get:function(k,d){return d;}}; }

  /* ============================================================
     CUSTOM CONFIRM
     ============================================================ */
  /* opts اختيارية: {title, okLabel, icon, danger:false} — الافتراضي نافذة حذف كما كانت */
  window.customConfirm = function(message, onConfirm, opts){
    opts = opts || {};
    var danger = opts.danger !== false;
    document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop show';
    bd.innerHTML = '<div class="modal" role="alertdialog" aria-modal="true" style="max-width:400px;text-align:center">' +
      '<div style="font-size:3rem;margin-bottom:12px">' + (opts.icon || '⚠️') + '</div>' +
      '<h3 style="margin-bottom:18px">' + esc(opts.title || 'تأكيد الحذف') + '</h3>' +
      '<p style="color:var(--muted);margin-bottom:22px;font-size:var(--fs-md);white-space:pre-line">' + esc(message) + '</p>' +
      '<div class="modal-actions" style="justify-content:center">' +
        '<button class="btn btn-sm btn-ghost" id="cCancel">إلغاء</button>' +
        '<button class="btn btn-sm' + (danger ? ' btn-danger' : '') + '" id="cConfirm">' + esc(opts.okLabel || '🗑 نعم، احذف') + '</button>' +
      '</div></div>';
    document.body.appendChild(bd);
    var done = false;
    var close = function(){ if(window.dismissOverlay) window.dismissOverlay(bd); else bd.remove(); };
    bd.querySelector('#cCancel').onclick = close;
    bd.onclick = function(e){ if(e.target === bd) close(); };
    bd.querySelector('#cConfirm').onclick = function(){ if(done) return; done = true; close(); onConfirm(); };   /* منع التأكيد المزدوج */
    bd.addEventListener('keydown', function(e){
      if(e.key !== 'Tab') return;
      var a = bd.querySelector('#cCancel'), b = bd.querySelector('#cConfirm');
      if(e.shiftKey && document.activeElement === a){ e.preventDefault(); b.focus(); }
      else if(!e.shiftKey && document.activeElement === b){ e.preventDefault(); a.focus(); }
    });
    var f = bd.querySelector('#cCancel'); if(f && f.focus) f.focus();
  };
  /* ============================================================
     THEMES
     ============================================================ */
  var THEMES = [
    {id:'dark', name:'داكن', colors:['#0b0f1a','#22d3ee','#a78bfa']},
    {id:'ivory', name:'عاج', light:true, colors:['#f6f1e9','#0f766e','#c2410c']},
    {id:'emerald', name:'زمرد', colors:['#07120e','#34d399','#e5c07b']},
    {id:'ember', name:'جمر', colors:['#120e0c','#fb923c','#fb7185']},
    {id:'graphite', name:'جرافيت', colors:['#0d0f12','#a3e635','#2dd4bf']},
    {id:'royal', name:'ملكي', colors:['#0f0524','#a78bfa','#fbbf24']},
    {id:'cyberpunk', name:'سايبربانك', colors:['#0a0014','#22d3ee','#ec4899']},
    {id:'midnight', name:'منتصف الليل', colors:['#050914','#0ea5e9','#8b5cf6']},
    {id:'sky', name:'سماء', light:true, colors:['#eef3fb','#4338ca','#0369a1']}
  ];
  window.THEMES = THEMES;

  /* ترحيل الثيمات المستبدلة: من اختار ثيماً قديماً (محلياً أو من السحابة) ينتقل لأقرب بديل داكن */
  var LEGACY_THEMES = { dracula: 'graphite', sakura: 'ember', nord: 'graphite', ocean: 'midnight', aurora: 'emerald' };
  function resolveTheme(t){
    if(LEGACY_THEMES[t]) t = LEGACY_THEMES[t];
    return THEMES.some(function(x){ return x.id === t; }) ? t : 'dark';
  }
  function setThemeAttr(t){
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    var th = THEMES.filter(function(x){ return x.id === t; })[0];
    if(meta && th) meta.setAttribute('content', th.colors[0]);
  }
  /* انتقال ناعم للألوان أثناء التبديل (يُفعَّل فقط لحظة التبديل، وليس عند التحميل) */
  var themeFadeTimer = null;
  function themeFade(){
    var root = document.documentElement;
    root.classList.add('theme-fading');
    clearTimeout(themeFadeTimer);
    themeFadeTimer = setTimeout(function(){ root.classList.remove('theme-fading'); }, 450);
  }

  window.applyTheme = function(t, animate){
    t = resolveTheme(t);
    if(animate) themeFade();
    setThemeAttr(t);
    S().set('theme', t);
    document.querySelectorAll('.theme-swatch').forEach(function(sw){
      sw.classList.toggle('active', sw.dataset.theme === t);
    });
  };

  window.buildThemePanel = function(){
    var grid = document.getElementById('themeGrid'); if(!grid) return;
    var html = '';
    THEMES.forEach(function(t){
      html += '<div class="theme-swatch" role="button" tabindex="0" title="' + t.name + (t.light ? ' (فاتح)' : '') + '" data-theme="' + t.id + '" style="background:linear-gradient(135deg, ' +
        t.colors[0] + ' 0%, ' + t.colors[0] + ' 40%, ' + t.colors[1] + ' 40%, ' + t.colors[1] + ' 70%, ' +
        t.colors[2] + ' 70%, ' + t.colors[2] + ' 100%)">' +
        '<div class="sw-check">✓</div><div class="sw-label">' + t.name + '</div></div>';
    });
    grid.innerHTML = html;
    var pick = function(sw){
      window.applyTheme(sw.dataset.theme, true);
      var name = (THEMES.find(function(t){ return t.id === sw.dataset.theme; }) || {}).name || '';
      toast('🎨 تم تفعيل ثيم "' + name + '"', 'success', 1800);
    };
    grid.querySelectorAll('.theme-swatch').forEach(function(sw){
      sw.addEventListener('click', function(){ pick(sw); });
      sw.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); pick(sw); } });
    });
    /* معاينة حية بالتحويم (بالماوس فقط) — بدون حفظ، وتعود للثيم المحفوظ عند الخروج */
    if(!grid._previewBound){
      grid._previewBound = true;
      var saved = function(){ return resolveTheme(S().get('theme', 'dark')); };
      grid.addEventListener('pointerover', function(e){
        if(e.pointerType !== 'mouse') return;
        var sw = e.target.closest ? e.target.closest('.theme-swatch') : null;
        if(!sw || sw.dataset.theme === document.documentElement.getAttribute('data-theme')) return;
        themeFade(); setThemeAttr(sw.dataset.theme);
      });
      grid.addEventListener('pointerleave', function(e){
        if(e.pointerType !== 'mouse') return;
        var cur = saved();
        if(cur !== document.documentElement.getAttribute('data-theme')){ themeFade(); setThemeAttr(cur); }
      });
    }
  };

  window.toggleThemePanel = function(){
    var p = document.getElementById('themePanel'); if(p) p.classList.toggle('show');
  };
  window.toggleSettingsMenu = function(){
    var m = document.getElementById('settingsMenu'); if(m) m.classList.toggle('show');
  };
  window.closeSettingsMenu = function(){
    var m = document.getElementById('settingsMenu'); if(m) m.classList.remove('show');
  };
  window.exportPDF = function(){
    toast('🖨️ جاري تجهيز الملف...', 'info', 1500);
    setTimeout(function(){ window.print(); }, 400);
  };

  /* ============================================================
     QUOTE
     ============================================================ */
  window.renderDailyQuote = function(){
    var d = new Date();
    var quotes = window.DAILY_QUOTES || [{t:'—', a:'—'}];
    var idx = (d.getFullYear()*365 + d.getMonth()*31 + d.getDate()) % quotes.length;
    var q = quotes[idx];
    var el1 = document.getElementById('dailyQuoteText'); if(el1) el1.textContent = q.t;
    var el2 = document.getElementById('dailyQuoteAuthor'); if(el2) el2.textContent = '— ' + q.a;
  };

  /* ============================================================
     DASHBOARD
     ============================================================ */
  window.renderDashboard = function(){
    if(typeof window.renderDailyQuote === 'function') window.renderDailyQuote();

    var sp = space();
    var notes = window.notes || [];
    var DAYS_EN = window.DAYS_EN || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    var now = new Date();
    var hour = now.getHours();
    var name = (sp.profile && sp.profile.name) || '';
    var greet = hour < 5 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';

    var gl = document.getElementById('greetLine');
    if(gl){
      gl.textContent = greet + ' ' + (name ? name + ', ' : '') + 'لديك ' +
        (sp.tasks || []).filter(function(t){ return !t.done; }).length + ' مهمة متبقية';
    }

    var todayIdx = now.getDay();
    var todayKey = DAYS_EN[todayIdx] || 'Sun';
    var todayStr = today();

    /* Term progress */
    var tp = document.getElementById('dashTermProgress');
    if(tp){
      var totalRequired = 0;
      var SEMESTERS = window.SEMESTERS || [];
      SEMESTERS.forEach(function(sem){
        (sem.courses || []).forEach(function(c){ totalRequired += c.h; });
      });
      var registered = (sp.courses || []).reduce(function(a,c){ return a + (c.hours || 0); }, 0);
      var pct = totalRequired > 0 ? Math.round(registered / totalRequired * 100) : 0;
      tp.innerHTML =
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:var(--fs-sm)">' +
        '<span style="color:var(--muted)">📚 ' + registered + ' / ' + totalRequired + ' ساعة</span>' +
        '<span style="color:var(--accent);font-weight:700">' + pct + '%</span></div>' +
        '<div class="sc-progress"><div class="sc-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div style="text-align:center;color:var(--muted2);font-size:var(--fs-xs);margin-top:6px">باقي ' +
        Math.max(0, totalRequired - registered) + ' ساعة للتخرج</div>';
    }

    var pending = (sp.tasks || []).filter(function(t){ return !t.done; }).length;
    var budget = sp.budget || [];
    var income = budget.filter(function(b){ return b.type === 'income'; })
      .reduce(function(a,b){ return a + (parseFloat(b.amount) || 0); }, 0);
    var expense = budget.filter(function(b){ return b.type === 'expense'; })
      .reduce(function(a,b){ return a + (parseFloat(b.amount) || 0); }, 0);
    var balance = income - expense;

    var dsEl = document.getElementById('dashStats');
    if(dsEl) dsEl.innerHTML =
      '<div class="stat"><div class="ic">📚</div><div><div class="v">' +
        (sp.courses || []).length + '</div><div class="l">مادة مسجّلة</div></div></div>' +
      '<div class="stat"><div class="ic">📝</div><div><div class="v">' +
        pending + '</div><div class="l">مهمة متبقية</div></div></div>' +
      '<div class="stat"><div class="ic">⏳</div><div><div class="v">' +
        (sp.exams || []).length + '</div><div class="l">امتحان قادم</div></div></div>' +
      '<div class="stat"><div class="ic">📊</div><div><div class="v">' +
        (sp.grades ? sp.grades.length : 0) + '</div><div class="l">مادة في علاماتي</div></div></div>';

    /* Budget */
    var db = document.getElementById('dashBudget');
    if(db){
      var col2 = balance >= 0 ? 'var(--green)' : 'var(--red)';
      db.innerHTML =
        '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:var(--fs-sm)"><span>📈 دخل</span>' +
        '<span style="color:var(--green);font-weight:700">' + income.toFixed(0) + ' د</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:var(--fs-sm);border-top:1px solid var(--border)">' +
        '<span>📉 مصروف</span><span style="color:var(--red);font-weight:700">' + expense.toFixed(0) + ' د</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:var(--fs-md);border-top:2px solid var(--border);margin-top:6px">' +
        '<span style="font-weight:700">💼 الرصيد</span><span style="color:' + col2 + ';font-weight:800">' + balance.toFixed(0) + ' د</span></div>';
    }

    try{ if(typeof window.updateTimerUI === 'function') window.updateTimerUI(); }catch(e){}
  };

  /* ============================================================
     TASKS
     ============================================================ */
  /* ============================================================
     أدوات مواعيد (بتوقيت الجهاز المحلي — لا UTC): تُستخدم في المهام والامتحانات والتنبيهات
     ============================================================ */
  function parseDay(s){
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  /* عدد الأيام من اليوم (محلياً) حتى التاريخ: 0 اليوم، 1 غداً، سالب = مضى. null لتاريخ غير صالح */
  window.daysUntil = function(s){
    var d = parseDay(s); if(!d) return null;
    var n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((d - t) / 86400000);
  };
  function dueLabel(days){
    if(days === null) return '';
    if(days === 0) return 'اليوم';
    if(days === 1) return 'غدًا';
    if(days === 2) return 'بعد يومين';
    if(days > 2 && days <= 10) return 'بعد ' + days + ' أيام';
    if(days > 10) return 'بعد ' + days + ' يوم';
    if(days === -1) return 'متأخرة يوم';
    if(days === -2) return 'متأخرة يومين';
    return 'متأخرة ' + Math.abs(days) + ' يوم';
  }
  window.dueLabel = dueLabel;
  /* المتبقي للامتحان: أيام + (إن كان اليوم ووقته معروف) ساعات */
  window.examRemaining = function(e, now){
    var days = window.daysUntil(e && e.date);
    if(days === null) return { days: null, label: '—', big: '—', past: false, urgent: false };
    now = now || new Date();
    if(days < 0) return { days: days, label: 'انتهى', big: 'انتهى', past: true, urgent: false };
    if(days === 0){
      var tm = /(\d{1,2})[:.](\d{2})/.exec(String((e && e.time) || ''));
      if(tm){
        var mins = (+tm[1]) * 60 + (+tm[2]) - (now.getHours() * 60 + now.getMinutes());
        if(mins > 0) return { days: 0, label: 'بعد ' + (mins >= 60 ? Math.floor(mins / 60) + 'س ' : '') + (mins % 60) + 'د', big: mins >= 60 ? Math.floor(mins / 60) + ' س' : mins + ' د', past: false, urgent: true, today: true };
      }
      return { days: 0, label: 'اليوم', big: 'اليوم', past: false, urgent: true, today: true };
    }
    return { days: days, label: dueLabel(days), big: days === 1 ? 'غدًا' : days + ' يوم', past: false, urgent: days <= 7 };
  };

  /* ============================================================
     TASKS — مادة + موعد + أولوية + حالة، فرز (موعد/أولوية/يدوي) وتجميع حسب الاستعجال
     الحقول الإضافية (priority/doing/order) اختيارية؛ المهام القديمة تعمل كما هي.
     ============================================================ */
  var PRIO = { high: { l: 'عالية', r: 0, ic: '🔺' }, normal: { l: 'عادية', r: 1, ic: '' }, low: { l: 'منخفضة', r: 2, ic: '🔻' } };
  function prioOf(t){ return PRIO[t && t.priority] ? t.priority : 'normal'; }
  function taskSortMode(){ try{ var v = localStorage.getItem('tasks_sort'); return (v === 'priority' || v === 'manual') ? v : 'due'; }catch(e){ return 'due'; } }
  function nextOrder(){ var m = -1; (space().tasks || []).forEach(function(t){ if(typeof t.order === 'number' && t.order > m) m = t.order; }); return m + 1; }
  function cmpDue(a, b){
    if(!!a.due !== !!b.due) return a.due ? -1 : 1;
    if(a.due !== b.due) return a.due < b.due ? -1 : 1;
    return PRIO[prioOf(a)].r - PRIO[prioOf(b)].r;
  }
  function cmpPrio(a, b){
    var d = PRIO[prioOf(a)].r - PRIO[prioOf(b)].r; if(d) return d;
    return cmpDue(a, b);
  }
  /* يُسند ترتيباً لمن لا ترتيب له (يأتون بعد المرتّبين، بحسب الموعد) — في الذاكرة حتى أول تحريك */
  function ensureOrder(){
    var all = space().tasks || [], max = nextOrder();
    all.filter(function(t){ return typeof t.order !== 'number'; }).sort(cmpDue).forEach(function(t){ t.order = max++; });
  }
  function manualList(){ ensureOrder(); return (space().tasks || []).filter(function(t){ return !t.done; }).sort(function(a, b){ return a.order - b.order; }); }
  function moveTask(id, dir){
    var list = manualList(), i = -1;
    list.forEach(function(t, k){ if(t.id === id) i = k; });
    var j = i + dir; if(i < 0 || j < 0 || j >= list.length) return;
    var t = list[i], o = list[j], tmp = t.order; t.order = o.order; o.order = tmp;
    saveSpace(); window.renderTasks();
    var b = document.querySelector('[data-move-task="' + id + '"][data-dir="' + dir + '"]'); if(b && !b.disabled) b.focus();
  }

  var TASK_TYPES = { exam: 'امتحان', assignment: 'واجب', quiz: 'كويز', project: 'مشروع', task: 'مهمة' };
  function taskRow(t, manual, idx, count){
    var days = window.daysUntil(t.due), isOver = !t.done && days !== null && days < 0, isUrgent = !t.done && days !== null && days >= 0 && days <= 3;
    var p = prioOf(t), when = days === null ? '' : dueLabel(days);
    var dueCls = t.done ? '' : isOver ? ' over' : isUrgent ? ' soon' : '';
    return '<div class="task ' + (t.done ? 'done' : '') + ' ' + (isOver ? 'overdue' : isUrgent ? 'urgent' : '') + (p === 'high' && !t.done ? ' prio-high' : '') + '" data-task-id="' + t.id + '">' +
      '<div class="task-check" role="checkbox" tabindex="0" aria-checked="' + (t.done ? 'true' : 'false') + '" aria-label="إكمال: ' + esc(t.title) + '" data-toggle-task="' + t.id + '"></div>' +
      '<div class="task-body"><div class="task-title">' + esc(t.title) + '</div>' +
      '<div class="task-meta"><span class="badge ' + (t.type || 'task') + '">' + (TASK_TYPES[t.type] || 'مهمة') + '</span>' +
      (p !== 'normal' ? '<span class="prio-chip ' + p + '" title="الأولوية: ' + PRIO[p].l + '">' + PRIO[p].ic + ' ' + PRIO[p].l + '</span>' : '') +
      (t.doing && !t.done ? '<span class="status-chip">⏳ جارية</span>' : '') +
      (t.course ? '<span>' + (window.courseLink ? window.courseLink(t.course, '📚 ') : '📚 ' + esc(t.course)) + '</span>' : '') +
      (t.due ? '<span class="due-chip' + dueCls + '">📅 <bdi dir="ltr">' + esc(t.due) + '</bdi>' + (when && !t.done ? ' · ' + when : '') + '</span>' : '') + '</div></div>' +
      '<div class="task-actions">' +
      (manual && !t.done ? '<button type="button" class="task-handle" data-task-handle="' + t.id + '" aria-label="اسحب لإعادة ترتيب: ' + esc(t.title) + '" title="اسحب لإعادة الترتيب">⠿</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-move-task="' + t.id + '" data-dir="-1" aria-label="تقديم المهمة"' + (idx === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-move-task="' + t.id + '" data-dir="1" aria-label="تأخير المهمة"' + (idx === count - 1 ? ' disabled' : '') + '>▼</button>' : '') +
      '<button type="button" class="btn btn-sm btn-ghost" data-edit-task="' + t.id + '" aria-label="تعديل">✏️</button>' +
      '<button type="button" class="btn btn-sm btn-danger" data-del-task="' + t.id + '" aria-label="حذف">🗑</button></div></div>';
  }

  window.renderTasks = function(){
    var c = document.getElementById('tasksList'); if(!c) return;
    var sp = space(), filter = window.currentTaskFilter || 'all', mode = taskSortMode();
    var sel = document.getElementById('taskSort'); if(sel && sel.value !== mode) sel.value = mode;
    var all = (sp.tasks || []).slice();
    var pend = all.filter(function(t){ return !t.done; }), done = all.filter(function(t){ return t.done; });
    var over = pend.filter(function(t){ var d = window.daysUntil(t.due); return d !== null && d < 0; });
    /* عدّادات الأزرار */
    var counts = { all: all.length, pending: pend.length, overdue: over.length, done: done.length };
    document.querySelectorAll('#tasks .chip[data-tf]').forEach(function(b){   /* chips فقط — بطاقات يومي الجامعي تستخدم data-tf أيضاً */
      var n = counts[b.dataset.tf]; if(n === undefined) return;
      var base = b.getAttribute('data-label') || b.textContent.replace(/\s*\(\d+\)\s*$/, '').trim();
      b.setAttribute('data-label', base); b.textContent = base + ' (' + n + ')';
    });

    var list = filter === 'pending' ? pend : filter === 'done' ? done : filter === 'overdue' ? over : all;
    if(!list.length){
      c.innerHTML = '<div class="empty"><div class="ic">' + (filter === 'done' ? '☑' : '📝') + '</div><p>' +
        (filter === 'overdue' ? 'ما في مهام متأخرة 👏' : filter === 'done' ? 'ما أكملت مهام بعد' : filter === 'pending' ? 'ما في مهام قيد الانتظار' : 'لا توجد مهام') +
        '</p>' + (filter === 'all' ? '<p class="sub">اكتب مهمة بالحقل بالأعلى واضغط Enter</p>' : '') + '</div>';
      return;
    }

    var html = '';
    function section(title, items, cls){
      if(!items.length) return '';
      return '<div class="task-group ' + (cls || '') + '"><span>' + title + '</span><b>' + items.length + '</b></div>' + items.map(function(t){ return taskRow(t, false); }).join('');
    }
    if(mode === 'manual' && filter !== 'done'){
      var pl = manualList().filter(function(t){ return list.indexOf(t) > -1; });
      html += pl.map(function(t, i){ return taskRow(t, true, i, pl.length); }).join('');
      if(filter === 'all') html += section('✅ مكتملة', done.sort(function(a, b){ return String(b.completedAt || '').localeCompare(String(a.completedAt || '')); }), 'done');
    } else if(filter === 'done'){
      html += done.sort(function(a, b){ return String(b.completedAt || '').localeCompare(String(a.completedAt || '')); }).map(function(t){ return taskRow(t, false); }).join('');
    } else if(mode === 'priority'){
      var P = pend.filter(function(t){ return list.indexOf(t) > -1; }).sort(cmpPrio);
      ['high', 'normal', 'low'].forEach(function(k){ html += section((PRIO[k].ic ? PRIO[k].ic + ' ' : '') + 'أولوية ' + PRIO[k].l, P.filter(function(t){ return prioOf(t) === k; }), k === 'high' ? 'over' : ''); });
      if(filter === 'all') html += section('✅ مكتملة', done, 'done');
    } else {
      var D = pend.filter(function(t){ return list.indexOf(t) > -1; }).sort(cmpDue), g = { over: [], today: [], week: [], later: [], none: [] };
      D.forEach(function(t){
        var d = window.daysUntil(t.due);
        (d === null ? g.none : d < 0 ? g.over : d === 0 ? g.today : d <= 7 ? g.week : g.later).push(t);
      });
      html += section('⚠️ متأخرة', g.over, 'over') + section('📌 اليوم', g.today, 'today') + section('📅 خلال 7 أيام', g.week) + section('🗓 لاحقًا', g.later) + section('بدون موعد', g.none);
      if(filter === 'all') html += section('✅ مكتملة', done.sort(function(a, b){ return String(b.completedAt || '').localeCompare(String(a.completedAt || '')); }), 'done');
    }
    c.innerHTML = html;

    c.querySelectorAll('[data-toggle-task]').forEach(function(b){
      b.addEventListener('click', function(){ window.toggleTask(b.dataset.toggleTask); });
      b.addEventListener('keydown', function(e){ if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); window.toggleTask(b.dataset.toggleTask); } });
    });
    c.querySelectorAll('[data-edit-task]').forEach(function(b){
      b.addEventListener('click', function(){ window.editTask(b.dataset.editTask); });
    });
    c.querySelectorAll('[data-del-task]').forEach(function(b){
      b.addEventListener('click', function(){ window.deleteTask(b.dataset.delTask); });
    });
    c.querySelectorAll('[data-move-task]').forEach(function(b){
      b.addEventListener('click', function(){ moveTask(b.dataset.moveTask, parseInt(b.dataset.dir, 10)); });
    });
    bindTaskDrag(c);
  };

  /* سحب وإفلات للوضع اليدوي (Pointer Events: ماوس/لمس/قلم). مستمع واحد على الحاوية، وبديله ▲▼ */
  function bindTaskDrag(c){
    if(c._dragBound) return; c._dragBound = true;
    var drag = null;
    function marks(){ c.querySelectorAll('.drop-before,.drop-after,.dragging').forEach(function(r){ r.classList.remove('drop-before', 'drop-after', 'dragging'); }); }
    c.addEventListener('pointerdown', function(e){
      var h = e.target.closest ? e.target.closest('[data-task-handle]') : null; if(!h || (e.button !== undefined && e.button > 0)) return;
      e.preventDefault();
      drag = { id: h.getAttribute('data-task-handle'), target: null, before: true, pid: e.pointerId, h: h };
      try{ h.setPointerCapture(e.pointerId); }catch(err){}
      h.closest('.task').classList.add('dragging');
    });
    c.addEventListener('pointermove', function(e){
      if(!drag || e.pointerId !== drag.pid) return;
      var under = document.elementFromPoint(e.clientX, e.clientY), r = under && under.closest ? under.closest('.task[data-task-id]') : null;
      c.querySelectorAll('.drop-before,.drop-after').forEach(function(x){ x.classList.remove('drop-before', 'drop-after'); });
      if(!r || r.getAttribute('data-task-id') === drag.id || !r.querySelector('[data-task-handle]')){ drag.target = null; return; }
      var b = r.getBoundingClientRect(); drag.before = e.clientY < b.top + b.height / 2; drag.target = r.getAttribute('data-task-id');
      r.classList.add(drag.before ? 'drop-before' : 'drop-after');
    });
    function end(e, apply){
      if(!drag || (e && e.pointerId !== drag.pid)) return;
      var d = drag; drag = null; marks();
      try{ d.h.releasePointerCapture(d.pid); }catch(err){}
      if(apply && d.target) window.reorderTask(d.id, d.target, d.before);
    }
    c.addEventListener('pointerup', function(e){ end(e, true); });
    c.addEventListener('pointercancel', function(e){ end(e, false); });
  }
  /* ينقل مهمة قبل/بعد مهمة أخرى (ضمن غير المكتملة) ويعيد ترقيم الكل بالتسلسل */
  window.reorderTask = function(id, targetId, before){
    if(id === targetId) return false;
    var list = manualList(), from = -1;
    list.forEach(function(t, k){ if(t.id === id) from = k; });
    if(from < 0 || !list.some(function(t){ return t.id === targetId; })) return false;
    var item = list.splice(from, 1)[0], at = -1;
    list.forEach(function(t, k){ if(t.id === targetId) at = k; });
    list.splice(before ? at : at + 1, 0, item);
    list.forEach(function(t, k){ t.order = k; });
    saveSpace(); window.renderTasks();
    var hb = document.querySelector('[data-task-handle="' + id + '"]'); if(hb) hb.focus();
    return true;
  };

  window.filterTasks = function(f){
    window.currentTaskFilter = f;
    document.querySelectorAll('[data-tf]').forEach(function(b){ b.classList.toggle('active', b.dataset.tf === f); });
    window.renderTasks();
  };

  window.setTaskSort = function(mode){
    if(mode !== 'priority' && mode !== 'manual') mode = 'due';
    try{ localStorage.setItem('tasks_sort', mode); }catch(e){}
    if(mode === 'manual') ensureOrder();
    window.renderTasks();
  };

  /* حقول نافذة المهمة (إضافة/تعديل) */
  function taskFields(){
    var opts = [{v:'', l:'— بدون مادة —'}];
    (space().courses || []).forEach(function(c){ opts.push({v: c.name, l: c.name}); });
    return [
      {key:'title', label:'العنوان'},
      {key:'type', label:'النوع', type:'select', options: [
        {v:'task', l:'مهمة'}, {v:'assignment', l:'واجب'}, {v:'exam', l:'امتحان'},
        {v:'quiz', l:'كويز'}, {v:'project', l:'مشروع'}]},
      {key:'course', label:'المادة', type:'select', options: opts},
      {key:'due', label:'تاريخ التسليم', type:'date'},
      {key:'priority', label:'الأولوية', type:'select', options: [{v:'high', l:'🔺 عالية'}, {v:'normal', l:'عادية'}, {v:'low', l:'🔻 منخفضة'}]},
      {key:'status', label:'الحالة', type:'select', options: [{v:'todo', l:'قيد الانتظار'}, {v:'doing', l:'⏳ جارية'}, {v:'done', l:'✅ مكتملة'}]}
    ];
  }
  function applyStatus(t, status){
    var wasDone = !!t.done;
    t.done = status === 'done'; t.doing = status === 'doing';
    if(t.done && !wasDone) t.completedAt = window.today();
    if(!t.done) t.completedAt = null;
  }
  function refreshTasks(){ saveSpace(); window.renderTasks(); window.renderDashboard(); }

  window.addTask = function(){
    window.showModal('إضافة مهمة', taskFields(), {title:'', type:'task', course:'', due:'', priority:'normal', status:'todo'}, function(data){
      if(!String(data.title || '').trim()){ toast('أدخل عنوانًا', 'warn'); return false; }
      if(!space().tasks) window.space.tasks = [];
      var t = { id: uid(), title: String(data.title).trim(), type: data.type, course: data.course, due: data.due, done: false,
        priority: data.priority || 'normal', order: nextOrder() };
      applyStatus(t, data.status || 'todo');
      window.space.tasks.push(t);
      refreshTasks();
      return true;
    });
  };

  /* إضافة سريعة من حقل القائمة: يفهم "واجب شبكات غدًا" ويربط المادة إن ذُكر اسمها */
  window.quickAddTask = function(text){
    var raw = String(text || '').trim(); if(!raw) return false;
    var p = window.parseQuickCapture ? window.parseQuickCapture(raw) : null;
    var title = (p && p.type === 'task' && p.title) ? p.title : raw, due = (p && p.type === 'task') ? (p.due || '') : '';
    var course = '';
    (space().courses || []).forEach(function(c){ if(!course && c.name && raw.indexOf(c.name) > -1) course = c.name; });
    if(!space().tasks) window.space.tasks = [];
    window.space.tasks.push({ id: uid(), title: title, type: 'task', course: course, due: due, done: false, priority: 'normal', order: nextOrder() });
    refreshTasks();
    toast('✓ أُضيفت: ' + title, 'success', 1500);
    return true;
  };

  window.editTask = function(id){
    var t = (space().tasks || []).find(function(x){ return x.id === id; });
    if(!t) return;
    var init = { title: t.title, type: t.type || 'task', course: t.course || '', due: t.due || '', priority: prioOf(t), status: t.done ? 'done' : t.doing ? 'doing' : 'todo' };
    window.showModal('تعديل مهمة', taskFields(), init, function(data){
      if(!String(data.title || '').trim()){ toast('أدخل عنوانًا', 'warn'); return false; }
      t.title = String(data.title).trim(); t.type = data.type; t.course = data.course; t.due = data.due; t.priority = data.priority || 'normal';
      applyStatus(t, data.status || 'todo');
      refreshTasks();
      return true;
    }, function(){
      window.customConfirm('حذف "' + t.title + '"؟', function(){
        window.space.tasks = window.space.tasks.filter(function(x){ return x.id !== id; });
        refreshTasks();
      });
    });
  };

  window.toggleTask = function(id){
    var t = (space().tasks || []).find(function(x){ return x.id === id; });
    if(!t) return;
    t.done = !t.done; if(t.done) t.doing = false;
    /* تاريخ الإكمال (حقل إضافي متوافق مع القديم): يعتمد عليه "إنجاز اليوم" وعدّاد الاحتفال */
    t.completedAt = t.done ? window.today() : null;
    saveSpace(); window.renderTasks(); window.renderDashboard();
    if(t.done) toast('✓ أحسنت!', 'success', 1200);
  };

  window.deleteTask = function(id){
    var t = (space().tasks || []).find(function(x){ return x.id === id; });
    if(!t) return;
    window.customConfirm('حذف "' + t.title + '"؟', function(){
      window.space.tasks = window.space.tasks.filter(function(x){ return x.id !== id; });
      saveSpace(); window.renderTasks(); window.renderDashboard();
    });
  };

  /* ============================================================
     EXAMS
     ============================================================ */
  /* renderExams: النسخة الفعلية في course-sync.js (حُذفت النسخة المكرّرة من هنا) */

  window.addExam = function(){
    var opts = [{v:'', l:'— بدون مادة —'}];
    (space().courses || []).forEach(function(c){ opts.push({v: c.name, l: c.name}); });
    window.showModal('إضافة امتحان', [
      {key:'name', label:'اسم الامتحان'},
      {key:'course', label:'المادة', type:'select', options: opts},
      {key:'date', label:'التاريخ', type:'date'},
      {key:'time', label:'الوقت'},
      {key:'room', label:'القاعة'}
    ], {name:'', course:'', date:'', time:'', room:''}, function(data){
      if(!data.name || !data.date){ toast('أدخل الاسم والتاريخ', 'warn'); return false; }
      if(!space().exams) window.space.exams = [];
      window.space.exams.push(Object.assign({id: uid()}, data));
      saveSpace(); window.renderExams(); window.renderDashboard();
      return true;
    });
  };

  window.editExam = function(id){
    var e = (space().exams || []).find(function(x){ return x.id === id; });
    if(!e) return;
    var opts = [{v:'', l:'— بدون مادة —'}];
    (space().courses || []).forEach(function(c){ opts.push({v: c.name, l: c.name}); });
    window.showModal('تعديل امتحان', [
      {key:'name', label:'اسم الامتحان'},
      {key:'course', label:'المادة', type:'select', options: opts},
      {key:'date', label:'التاريخ', type:'date'},
      {key:'time', label:'الوقت'},
      {key:'room', label:'القاعة'}
    ], e, function(data){
      if(!data.name || !data.date){ toast('أدخل الاسم والتاريخ', 'warn'); return false; }
      e.name = data.name; e.course = data.course; e.date = data.date;
      e.time = data.time; e.room = data.room;
      saveSpace(); window.renderExams(); window.renderDashboard();
      return true;
    }, function(){
      window.customConfirm('حذف "' + e.name + '"؟', function(){
        window.space.exams = window.space.exams.filter(function(x){ return x.id !== id; });
        saveSpace(); window.renderExams(); window.renderDashboard();
      });
    });
  };

  window.deleteExam = function(id){
    var e = (space().exams || []).find(function(x){ return x.id === id; });
    if(!e) return;
    window.customConfirm('حذف "' + e.name + '"؟', function(){
      window.space.exams = window.space.exams.filter(function(x){ return x.id !== id; });
      saveSpace(); window.renderExams(); window.renderDashboard();
    });
  };

  /* ============================================================
     COURSES
     ============================================================ */
  /* renderCourses: النسخة الفعلية في course-sync.js (حُذفت النسخة المكرّرة من هنا) */

  /* ============================================================
     ملفات المادة: بحث + فرز + تنزيل + حذف بتأكيد + منع التكرار
     (حالة البحث/الفرز لكل مادة تبقى بعد إعادة التحميل؛ قائمة الملفات مرتبطة بـ id المادة + filesFrom كما كانت)
     ============================================================ */
  var cfUI = {};          /* courseId → {q, sort} */
  var cfUploading = {};   /* مفاتيح ملفات قيد الرفع (تمنع تكرار الرفع عند الضغط المتكرر/إعادة المحاولة) */
  window.__cfFiles = {};  /* آخر قائمة محمّلة لكل مادة (للتحقق من التكرار) */
  function cfClean(name){ return window.SB && window.SB.displayFileName ? window.SB.displayFileName(name) : String(name || '').replace(/^\d+_/, ''); }
  function cfExt(name){ var m = /\.([A-Za-z0-9]+)$/.exec(cfClean(name)); return m ? m[1].toLowerCase() : ''; }
  var CF_SORTS = [['new', 'الأحدث'], ['old', 'الأقدم'], ['name', 'الاسم'], ['type', 'النوع'], ['size', 'الأكبر حجماً']];
  function cfSort(files, mode){
    var a = files.slice();
    var by = {
      new: function(x, y){ return String(y.createdAt || '').localeCompare(String(x.createdAt || '')); },
      old: function(x, y){ return String(x.createdAt || '').localeCompare(String(y.createdAt || '')); },
      name: function(x, y){ return cfClean(x.name).localeCompare(cfClean(y.name), 'ar'); },
      type: function(x, y){ return cfExt(x.name).localeCompare(cfExt(y.name)) || cfClean(x.name).localeCompare(cfClean(y.name), 'ar'); },
      size: function(x, y){ return (y.size || 0) - (x.size || 0); }
    };
    return a.sort(by[mode] || by.new);
  }
  function cfDate(iso){ try{ var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('ar-JO'); }catch(e){ return ''; } }
  function cfItems(files, courseId){
    return files.map(function(f){
      var nm = cfClean(f.name);
      return '<div class="course-file-item">' +
        '<div class="cf-icon">' + window.SB.getFileIcon(f.name) + '</div>' +
        '<div class="cf-info"><div class="cf-name" title="' + esc(nm) + '">' + esc(nm) + '</div>' +
        '<div class="cf-meta">' + window.SB.formatFileSize(f.size) + (f.createdAt ? ' · ' + esc(cfDate(f.createdAt)) : '') + '</div></div>' +
        '<div class="cf-actions">' +
          '<a class="btn btn-sm btn-ghost" href="' + esc(f.url) + '" target="_blank" rel="noopener" title="فتح" aria-label="فتح ' + esc(nm) + '">👁️</a>' +
          '<a class="btn btn-sm btn-ghost" href="' + esc(f.url) + '" download="' + esc(nm) + '" rel="noopener" title="تنزيل" aria-label="تنزيل ' + esc(nm) + '">⬇️</a>' +
          '<button type="button" class="btn btn-sm btn-danger" data-del-file="' + esc(f.path) + '" data-course="' + esc(courseId) + '" data-fname="' + esc(nm) + '" title="حذف" aria-label="حذف ' + esc(nm) + '">🗑</button>' +
        '</div></div>';
    }).join('');
  }
  function cfRender(list, courseId, files){
    var ui = cfUI[courseId] || (cfUI[courseId] = { q: '', sort: 'new' });
    var tools = files.length > 1 ?
      '<div class="cf-tools"><input type="search" data-cf-q placeholder="🔍 بحث في الملفات" aria-label="بحث في الملفات" value="' + esc(ui.q) + '">' +
      '<select data-cf-sort aria-label="ترتيب الملفات">' + CF_SORTS.map(function(s){ return '<option value="' + s[0] + '"' + (ui.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></div>' : '';
    list.innerHTML = tools + '<div class="cf-items"></div>';
    var box = list.querySelector('.cf-items');
    function paint(){
      var q = ui.q.trim().toLowerCase();
      var shown = cfSort(files.filter(function(f){ return !q || cfClean(f.name).toLowerCase().indexOf(q) > -1; }), ui.sort);
      box.innerHTML = shown.length ? cfItems(shown, courseId) : '<div class="u-empty">ما في ملفات تطابق البحث</div>';
      var count = document.querySelector('[data-files-count="' + courseId + '"]');
      if(count) count.textContent = (q ? shown.length + ' من ' : '') + files.length + ' ملف';
    }
    paint();
    var qi = list.querySelector('[data-cf-q]'), ss = list.querySelector('[data-cf-sort]');
    if(qi) qi.addEventListener('input', function(){ ui.q = qi.value; paint(); });
    if(ss) ss.addEventListener('change', function(){ ui.sort = ss.value; paint(); });
    box.addEventListener('click', function(e){
      var b = e.target.closest ? e.target.closest('[data-del-file]') : null; if(!b || b.disabled) return;
      window.customConfirm('حذف الملف "' + b.dataset.fname + '"؟ لا يمكن التراجع.', async function(){
        b.disabled = true; b.textContent = '…';
        var ok = false;
        try{ ok = await window.SB.deleteCourseFile(b.dataset.delFile); }catch(err){ ok = false; }
        if(ok){ toast('🗑 حُذف', 'success', 1500); window.loadCourseFilesForCard(b.dataset.course); }
        else { b.disabled = false; b.textContent = '🗑'; toast('فشل الحذف — تحقق من الاتصال وحاول مرة ثانية', 'warn', 2500); }
      });
    });
  }

  window.loadCourseFilesForCard = async function(courseId){
    var list = document.querySelector('[data-files-list="' + courseId + '"]');
    var count = document.querySelector('[data-files-count="' + courseId + '"]');
    if(!list) return;

    if(!window.SB || !window.SB.listCourseFiles){
      list.innerHTML = '<div class="u-empty">المزامنة غير مفعّلة</div>';
      return;
    }

    try{
      /* مجلد المادة نفسها + أي مجلدات قديمة ربطها المستخدم بها صراحةً (filesFrom) — بدون تغيير id المادة */
      var course = (space().courses || []).filter(function(x){ return x.id === courseId; })[0];
      var folders = [courseId].concat((course && course.filesFrom) || []);
      var files = await window.SB.listCourseFilesMulti(folders);
      if(files === null){
        list.innerHTML = '<div class="u-empty is-error">تعذّر تحميل الملفات (تحقق من الاتصال) ' +
          '<a href="#" data-retry-files="' + esc(courseId) + '" style="color:var(--accent)">إعادة المحاولة</a></div>';
        if(count) count.textContent = '—';
        var rb = list.querySelector('[data-retry-files]');
        if(rb) rb.addEventListener('click', function(ev){
          ev.preventDefault();
          list.innerHTML = '<div class="u-empty is-loading">جاري التحميل…</div>';
          window.SB.listCourseFilesMulti(folders, true).then(function(){ window.loadCourseFilesForCard(courseId); });
        });
        return;
      }
      window.__cfFiles[courseId] = files;
      if(!files.length){
        list.innerHTML = '<div class="u-empty">ما في ملفات بعد</div>';
        if(count) count.textContent = '0 ملف';
        return;
      }
      cfRender(list, courseId, files);
    }catch(e){
      list.innerHTML = '<div style="text-align:center;padding:10px;font-size:var(--fs-xs);color:var(--red)">فشل التحميل</div>';
    }
  };

  function cfUploadBusy(courseId, busy){
    document.querySelectorAll('[data-upload-course="' + courseId + '"]').forEach(function(b){
      if(busy){ b.setAttribute('data-label', b.textContent); b.textContent = '⏳ جاري الرفع…'; b.disabled = true; }
      else { b.textContent = b.getAttribute('data-label') || '📤 رفع ملف'; b.disabled = false; }
    });
  }
  window.handleCourseFileUpload = async function(courseId, file){
    if(!window.SB || !window.SB.uploadCourseFile){
      toast('خدمة الرفع غير متوفرة', 'warn', 2500); return;
    }
    if(!file || !file.size){ toast('الملف فارغ', 'warn', 2500); return; }
    if(file.size > 25 * 1024 * 1024){
      toast('⚠️ الملف كبير — الحد 25 MB', 'warn', 3500); return;
    }
    var key = [courseId, file.name, file.size, file.lastModified].join('|');
    if(cfUploading[key]){ toast('هذا الملف قيد الرفع حالياً', 'info', 2000); return; }
    /* نفس الاسم والحجم موجود؟ اسأل قبل رفع نسخة ثانية (يمنع تكرار الملفات عند إعادة المحاولة) */
    var dupe = (window.__cfFiles[courseId] || []).some(function(f){ return cfClean(f.name) === file.name && f.size === file.size; });
    if(dupe){
      window.customConfirm('يوجد ملف بنفس الاسم والحجم بهذه المادة. تريد رفع نسخة ثانية؟', function(){ doUpload(); },
        { title: 'ملف مكرر؟', icon: '📎', okLabel: 'ارفع نسخة ثانية', danger: false });
      return;
    }
    return doUpload();

    async function doUpload(){
      cfUploading[key] = true; cfUploadBusy(courseId, true);
      var progress = document.querySelector('[data-upload-progress="' + courseId + '"]');
      if(progress){ progress.style.display = 'block'; progress.querySelector('.inner').style.width = '30%'; }
      toast('📤 جاري الرفع...', 'info', 2000);
      try{
        var res = await window.SB.uploadCourseFile(courseId, file);
        if(progress) progress.querySelector('.inner').style.width = '100%';
        setTimeout(function(){ if(progress) progress.style.display = 'none'; }, 800);
        if(res.error){ toast('❌ فشل الرفع: ' + res.error + ' — يمكنك المحاولة مرة ثانية', 'warn', 4000); return; }
        toast('✅ تم الرفع!', 'success', 2000);
        window.loadCourseFilesForCard(courseId);
      }catch(e){
        if(progress) progress.style.display = 'none';
        toast('فشل الرفع — تحقق من الاتصال وحاول مرة ثانية', 'warn', 3000);
      }finally{
        delete cfUploading[key]; cfUploadBusy(courseId, false);
      }
    }
  };

  window.addMyCourse = function(){
    window.showModal('إضافة مادة', [
      {key:'name', label:'اسم المادة'},
      {key:'code', label:'رقم المادة'},
      {key:'hours', label:'الساعات', type:'number'},
      {key:'instructor', label:'الدكتور'},
      {key:'room', label:'القاعة'}
    ], {name:'', code:'', hours:3, instructor:'', room:''}, function(data){
      var name = String(data.name || '').trim();
      if(!name){ toast('أدخل اسمًا', 'warn'); return false; }
      /* مصدر واحد: يفحص التكرار وينشئ الحضور والعلامات ويحدّث الواجهات */
      var added = window.addCourseEverywhere(name, String(data.code || '').trim(), data.hours,
        { instructor: data.instructor, room: data.room });
      return added !== false;
    });
  };

  window.editMyCourse = function(id){
    var c = (space().courses || []).find(function(x){ return x.id === id; });
    if(!c) return;
    window.showModal('تعديل مادة', [
      {key:'name', label:'اسم المادة'},
      {key:'code', label:'رقم المادة'},
      {key:'hours', label:'الساعات', type:'number'},
      {key:'instructor', label:'الدكتور'},
      {key:'room', label:'القاعة'}
    ], c, function(data){
      c.name = data.name; c.code = data.code; c.hours = parseInt(data.hours) || 3;
      c.instructor = data.instructor; c.room = data.room;
      saveSpace(); window.renderCourses(); window.renderDashboard();
      return true;
    }, function(){
      window.customConfirm('حذف "' + c.name + '"؟', function(){
        window.space.courses = window.space.courses.filter(function(x){ return x.id !== id; });
        saveSpace(); window.renderCourses(); window.renderDashboard();
      });
    });
  };

  /* deleteMyCourse: النسخة الفعلية في course-sync.js (حُذفت النسخة المكرّرة من هنا) */

  window.importFromPlan = function(){
    var SEMESTERS = window.SEMESTERS || [];
    var options = SEMESTERS.map(function(s, i){ return {v: i, l: 'سنة ' + s.year + ' — ' + s.name}; });
    window.showModal('استيراد مواد', [
      {key:'sem', label:'اختر الفصل', type:'select', options: options}
    ], {sem:0}, function(data){
      var s = SEMESTERS[parseInt(data.sem)];
      if(!s) return false;
      var count = 0, added = [];
      s.courses.forEach(function(c){
        if(!(space().courses || []).find(function(mc){ return mc.name === c.n; })){
          if(!window.space.courses) window.space.courses = [];
          var nc = {id: uid(), name: c.n, code: c.code || '', hours: c.h, instructor:'', room:''};
          window.space.courses.push(nc);
          added.push(nc);
          count++;
        }
      });
      saveSpace(); window.renderCourses(); window.renderDashboard();
      toast('تم استيراد ' + count + ' مادة', 'success', 2500);
      /* مواد لها ملفات قديمة محذوفة بنفس الكود: نسأل (بدون ربط تلقائي) */
      added.forEach(function(nc){ if(window.offerArchivedFiles) window.offerArchivedFiles(nc); });
      return true;
    });
  };

  /* ============================================================
     ATTENDANCE
     ============================================================ */
  /* renderAttendance: النسخة الفعلية في course-sync.js (حُذفت النسخة المكرّرة من هنا) */

  window.addAttendanceCourse = function(){
    var opts = [{v:'', l:'— اختر مادة —'}];
    (space().courses || []).forEach(function(c){ opts.push({v: c.name, l: c.name}); });
    opts.push({v:'__custom__', l:'إدخال يدوي'});
    window.showModal('إضافة للحضور', [
      {key:'name', label:'اختر مادة', type:'select', options: opts},
      {key:'custom', label:'اسم مخصص'}
    ], {name:'', custom:''}, function(data){
      var name = data.name === '__custom__' ? data.custom : data.name;
      if(!name){ toast('اختر مادة', 'warn'); return false; }
      if(!window.space.attendance) window.space.attendance = {};
      if(!window.space.attendance[name]) window.space.attendance[name] = {present:0, absent:0};
      saveSpace(); window.renderAttendance(); window.renderDashboard();
      return true;
    });
  };

  window.markAttendance = function(name, type){
    if(!window.space.attendance) window.space.attendance = {};
    if(!window.space.attendance[name]) window.space.attendance[name] = {present:0, absent:0};
    window.space.attendance[name][type]++;
    saveSpace(); window.renderAttendance(); window.renderDashboard();
    if(type === 'absent' && window.attendanceHint){ var hint = window.attendanceHint(window.space.attendance[name].present, window.space.attendance[name].absent, window.weeklyLectures ? window.weeklyLectures(name) : 0); if(hint) toast(hint.text, 'warn', 4500); }
  };

  window.removeAttendance = function(name){
    window.customConfirm('حذف "' + name + '"؟', function(){
      delete window.space.attendance[name];
      saveSpace(); window.renderAttendance(); window.renderDashboard();
    });
  };

  /* ============================================================
     FLASHCARDS
     ============================================================ */
  window.renderDecks = function(){
    var c = document.getElementById('decksList'); if(!c) return;
    var decks = space().decks || [];
    if(!decks.length){
      c.innerHTML = '<div class="empty"><div class="ic">🃏</div><p>لا توجد مجموعات</p></div>';
      return;
    }
    var html = '';
    decks.forEach(function(d){
      html += '<div class="fc-deck" data-deck="' + d.id + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<div style="flex:1;min-width:0"><div class="name">🃏 ' + esc(d.name) + '</div>' +
          '<div class="meta">' + (d.cards || []).length + ' بطاقة</div></div>' +
          '<button class="btn btn-sm btn-danger" data-del-deck="' + d.id + '">🗑</button></div></div>';
    });
    c.innerHTML = html;
    c.querySelectorAll('[data-deck]').forEach(function(b){
      b.addEventListener('click', function(e){
        if(e.target.closest('[data-del-deck]')) return;
        window.openDeck(b.dataset.deck);
      });
    });
    c.querySelectorAll('[data-del-deck]').forEach(function(b){
      b.addEventListener('click', function(e){
        e.stopPropagation();
        window.deleteDeck(b.dataset.delDeck);
      });
    });
  };

  window.deleteDeck = function(id){
    var d = (space().decks || []).find(function(x){ return x.id === id; });
    if(!d) return;
    window.customConfirm('حذف "' + d.name + '"؟', function(){
      window.space.decks = window.space.decks.filter(function(x){ return x.id !== id; });
      saveSpace(); window.renderDecks();
    });
  };

  window.addDeck = function(){
    window.showModal('مجموعة جديدة', [{key:'name', label:'الاسم'}], {name:''}, function(data){
      if(!data.name){ toast('أدخل اسمًا', 'warn'); return false; }
      if(!space().decks) window.space.decks = [];
      window.space.decks.push({id: uid(), name: data.name, cards: []});
      saveSpace(); window.renderDecks();
      return true;
    });
  };

  window.openDeck = function(id){
    var d = (space().decks || []).find(function(x){ return x.id === id; });
    if(!d) return;
    if(!d.cards || !d.cards.length){
      window.showModal('بطاقة جديدة: ' + d.name, [
        {key:'q', label:'السؤال'}, {key:'a', label:'الجواب'}
      ], {q:'', a:''}, function(data){
        if(!data.q || !data.a){ toast('أدخل السؤال والجواب', 'warn'); return false; }
        d.cards.push({q: data.q, a: data.a});
        saveSpace(); window.openDeck(id);
        return true;
      });
      return;
    }
    showCardSession(d);
  };

  function showCardSession(d){
    var idx = 0, showBack = false;
    function render(){
      document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
      var bd = document.createElement('div');
      bd.className = 'modal-backdrop show';
      var card = d.cards[idx];
      bd.innerHTML = '<div class="modal" style="max-width:520px">' +
        '<h3 style="display:flex;justify-content:space-between;align-items:center">' +
        '<span>🃏 ' + esc(d.name) + '</span><span style="font-size:var(--fs-sm);color:var(--muted)">' +
        (idx+1) + '/' + d.cards.length + '</span></h3>' +
        '<div class="fc-card" id="fcFlip"><div class="' + (showBack ? 'back' : 'front') + '">' +
        esc(showBack ? card.a : card.q) + '</div>' +
        '<div class="hint">انقر للقلب</div></div>' +
        '<div class="modal-actions" style="justify-content:space-between">' +
        '<button class="btn btn-sm btn-ghost" id="fcPrev" ' + (idx === 0 ? 'disabled' : '') + '>← السابق</button>' +
        '<button class="btn btn-sm btn-ghost" id="fcAdd">+ بطاقة</button>' +
        '<button class="btn btn-sm" id="fcNext">' +
        (idx === d.cards.length - 1 ? 'إنهاء' : 'التالي →') + '</button></div></div>';
      document.body.appendChild(bd);
      var close = function(){ bd.remove(); };
      bd.onclick = function(e){ if(e.target === bd) close(); };
      bd.querySelector('#fcFlip').onclick = function(){ showBack = !showBack; render(); };
      bd.querySelector('#fcPrev').onclick = function(){ if(idx > 0){ idx--; showBack = false; render(); } };
      bd.querySelector('#fcAdd').onclick = function(){
        close();
        window.showModal('إضافة بطاقة', [
          {key:'q', label:'السؤال'}, {key:'a', label:'الجواب'}
        ], {q:'', a:''}, function(data){
          if(!data.q || !data.a) return false;
          d.cards.push({q: data.q, a: data.a});
          saveSpace();
          return true;
        });
      };
      bd.querySelector('#fcNext').onclick = function(){
        if(idx === d.cards.length - 1){ close(); toast('🎉 أكملت!', 'success', 2000); return; }
        idx++; showBack = false; render();
      };
    }
    render();
  }

  /* ============================================================
     BUDGET
     ============================================================ */
  window.renderBudget = function(){
    var sumEl = document.getElementById('budgetSummary'); if(!sumEl) return;
    var budget = space().budget || [];
    var income = budget.filter(function(b){ return b.type === 'income'; })
      .reduce(function(a,b){ return a + (parseFloat(b.amount) || 0); }, 0);
    var expense = budget.filter(function(b){ return b.type === 'expense'; })
      .reduce(function(a,b){ return a + (parseFloat(b.amount) || 0); }, 0);
    var balance = income - expense;

    sumEl.innerHTML =
      '<div class="budget-card income"><div class="bc-icon">📈</div><div class="bc-val">' +
        income.toFixed(0) + ' د</div><div class="bc-lbl">إجمالي الدخل</div></div>' +
      '<div class="budget-card expense"><div class="bc-icon">📉</div><div class="bc-val">' +
        expense.toFixed(0) + ' د</div><div class="bc-lbl">إجمالي المصاريف</div></div>' +
      '<div class="budget-card balance ' + (balance < 0 ? 'neg' : '') + '"><div class="bc-icon">💼</div>' +
        '<div class="bc-val">' + balance.toFixed(0) + ' د</div><div class="bc-lbl">الرصيد</div></div>';

    var BC = window.BUDGET_CATS || [];
    var catsEl = document.getElementById('budgetCats');
    var usedCats = [];
    budget.forEach(function(b){ if(usedCats.indexOf(b.category) === -1) usedCats.push(b.category); });
    if(usedCats.length){
      var catsHtml = '<button class="budget-cat-chip ' +
        (window.currentBudgetCat === 'all' ? 'active' : '') + '" data-cat="all">كل التصنيفات</button>';
      usedCats.forEach(function(c){
        var cat = BC.find(function(x){ return x.v === c; });
        catsHtml += '<button class="budget-cat-chip ' +
          (window.currentBudgetCat === c ? 'active' : '') + '" data-cat="' + c + '">' +
          (cat ? cat.i + ' ' + cat.l : esc(c)) + '</button>';
      });
      catsEl.innerHTML = catsHtml;
    } else {
      catsEl.innerHTML = '';
    }
    catsEl.querySelectorAll('[data-cat]').forEach(function(b){
      b.addEventListener('click', function(){
        window.currentBudgetCat = b.dataset.cat;
        window.renderBudget();
      });
    });

    var items = budget.slice().sort(function(a,b){
      return (b.date || '').localeCompare(a.date || '');
    });
    if(window.currentBudgetFilter !== 'all'){
      items = items.filter(function(i){ return i.type === window.currentBudgetFilter; });
    }
    if(window.currentBudgetCat !== 'all'){
      items = items.filter(function(i){ return i.category === window.currentBudgetCat; });
    }

    var list = document.getElementById('budgetList');
    if(!items.length){
      list.innerHTML = '<div class="empty"><div class="ic">💰</div><p>لا توجد عناصر</p></div>';
      return;
    }
    var html = '';
    items.forEach(function(b){
      var cat = BC.find(function(x){ return x.v === b.category; }) || {i:'💸', l: b.category};
      var sign = b.type === 'income' ? '+' : '-';
      html += '<div class="budget-item"><div class="bi-left"><div class="bi-icon">' + cat.i + '</div>' +
        '<div class="bi-info"><div class="bi-cat">' + esc(cat.l) + '</div>' +
        (b.note ? '<div class="bi-note">' + esc(b.note) + '</div>' : '') + '</div></div>' +
        '<div class="bi-amount ' + b.type + '">' + sign + b.amount +
        ' د<span class="date">' + (b.date || '') + '</span></div>' +
        '<div class="bi-actions"><button class="btn btn-sm btn-ghost" data-edit-budget="' + b.id + '">✏️</button>' +
        '<button class="btn btn-sm btn-danger" data-del-budget="' + b.id + '">🗑</button></div></div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('[data-edit-budget]').forEach(function(btn){
      btn.addEventListener('click', function(){ window.editBudget(btn.dataset.editBudget); });
    });
    list.querySelectorAll('[data-del-budget]').forEach(function(btn){
      btn.addEventListener('click', function(){ window.deleteBudget(btn.dataset.delBudget); });
    });
  };

  window.filterBudget = function(f){
    window.currentBudgetFilter = f;
    document.querySelectorAll('[data-bt]').forEach(function(b){
      b.classList.toggle('active', b.dataset.bt === f);
    });
    window.renderBudget();
  };

  window.addBudgetItem = function(type){
    var BC = window.BUDGET_CATS || [];
    var catOpts = BC.filter(function(c){
      if(type === 'income')
        return ['salary','family','scholarship','freelance','other-income'].indexOf(c.v) > -1;
      return ['salary','family','scholarship','freelance','other-income'].indexOf(c.v) === -1;
    }).map(function(c){ return {v: c.v, l: c.i + ' ' + c.l}; });

    if(!catOpts.length){ toast('التصنيفات غير محملة', 'warn'); return; }

    window.showModal('إضافة ' + (type === 'income' ? 'دخل' : 'مصروف'), [
      {key:'category', label:'التصنيف', type:'select', options: catOpts},
      {key:'amount', label:'المبلغ (دينار)', type:'number'},
      {key:'date', label:'التاريخ', type:'date'},
      {key:'note', label:'ملاحظة', type:'textarea'}
    ], {
      category: catOpts[0].v, amount:0, date: today(), note:''
    }, function(data){
      if(!data.amount || parseFloat(data.amount) <= 0){ toast('أدخل مبلغًا', 'warn'); return false; }
      if(!space().budget) window.space.budget = [];
      window.space.budget.push({
        id: uid(), type: type, category: data.category,
        amount: parseFloat(data.amount), date: data.date || today(), note: data.note || ''
      });
      saveSpace(); window.renderBudget(); window.renderDashboard();
      return true;
    });
  };

  window.editBudget = function(id){
    var b = (space().budget || []).find(function(x){ return x.id === id; });
    if(!b) return;
    var BC = window.BUDGET_CATS || [];
    var catOpts = BC.filter(function(c){
      if(b.type === 'income')
        return ['salary','family','scholarship','freelance','other-income'].indexOf(c.v) > -1;
      return ['salary','family','scholarship','freelance','other-income'].indexOf(c.v) === -1;
    }).map(function(c){ return {v: c.v, l: c.i + ' ' + c.l}; });

    window.showModal('تعديل', [
      {key:'category', label:'التصنيف', type:'select', options: catOpts},
      {key:'amount', label:'المبلغ', type:'number'},
      {key:'date', label:'التاريخ', type:'date'},
      {key:'note', label:'ملاحظة', type:'textarea'}
    ], b, function(data){
      if(!(parseFloat(data.amount) > 0)){ toast('أدخل مبلغًا أكبر من صفر', 'warn'); return false; }
      b.category = data.category;
      b.amount = parseFloat(data.amount) || 0;
      b.date = data.date; b.note = data.note;
      saveSpace(); window.renderBudget(); window.renderDashboard();
      return true;
    }, function(){
      window.customConfirm('حذف؟', function(){
        window.space.budget = window.space.budget.filter(function(x){ return x.id !== id; });
        saveSpace(); window.renderBudget(); window.renderDashboard();
      });
    });
  };

  window.deleteBudget = function(id){
    window.customConfirm('حذف؟', function(){
      window.space.budget = window.space.budget.filter(function(x){ return x.id !== id; });
      saveSpace(); window.renderBudget(); window.renderDashboard();
    });
  };

  window.clearBudget = function(){
    if(!space().budget || !space().budget.length){ toast('لا يوجد عناصر', 'info'); return; }
    window.customConfirm('مسح كل العناصر (' + space().budget.length + ' معاملة)؟ لا يمكن التراجع، ويُفضّل أخذ نسخة احتياطية أولاً.', function(){
      window.space.budget = [];
      saveSpace(); window.renderBudget(); window.renderDashboard();
    });
  };

  /* ============================================================
     NOTES
     ============================================================ */
  window.renderNotes = function(){
    var c = document.getElementById('notesList'); if(!c) return;
    var notes = window.notes || [];
    var cnt = document.getElementById('notesCount');
    if(cnt) cnt.textContent = notes.length + ' ملاحظة';
    if(!notes.length){
      c.innerHTML = '<div class="empty"><div class="ic">📔</div><p>لا توجد ملاحظات</p></div>';
      return;
    }
    var html = '';
    notes.forEach(function(n, i){
      var dateStr = '';
      try{ dateStr = new Date(n.ts).toLocaleDateString('ar-EG', {weekday:'long', year:'numeric', month:'short', day:'numeric'}); }catch(e){}
      html += '<div class="note-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
        '<span style="font-size:var(--fs-xs);color:var(--muted2)">' + dateStr + '</span>' +
        '<button class="btn btn-sm btn-danger" data-del-note="' + i + '">✕</button></div>' +
        '<input value="' + esc(n.title || '') + '" placeholder="عنوان..." data-note-title="' + i + '">' +
        '<textarea placeholder="اكتب..." data-note-body="' + i + '">' + esc(n.body || '') + '</textarea></div>';
    });
    c.innerHTML = html;
    c.querySelectorAll('[data-del-note]').forEach(function(b){
      b.addEventListener('click', function(){ window.deleteNote(parseInt(b.dataset.delNote)); });
    });
    c.querySelectorAll('[data-note-title]').forEach(function(inp){
      inp.addEventListener('input', function(){
        window.notes[parseInt(inp.dataset.noteTitle)].title = inp.value;
        getS().set('notes', window.notes);
      });
    });
    c.querySelectorAll('[data-note-body]').forEach(function(t){
      t.addEventListener('input', function(){
        window.notes[parseInt(t.dataset.noteBody)].body = t.value;
        getS().set('notes', window.notes);
      });
    });
  };

  window.addNote = function(){
    window.notes.unshift({title:'', body:'', ts: Date.now()});
    getS().set('notes', window.notes);
    window.renderNotes(); window.renderDashboard();
    toast('تمت الإضافة', 'success', 1500);
    var nt = document.querySelector('#notesList [data-note-title="0"]'); if(nt){ try{ nt.focus(); }catch(e){} }   /* جاهز للكتابة مباشرة */
  };

  window.deleteNote = function(i){
    window.customConfirm('حذف الملاحظة؟', function(){
      window.notes.splice(i, 1);
      getS().set('notes', window.notes);
      window.renderNotes(); window.renderDashboard();
    });
  };

  /* ============================================================
     GPA
     ============================================================ */
  window.renderGpa = function(){
    var b = document.getElementById('gpaBody'); if(!b) return;
    var GRADES = window.GRADES || {};
    var html = '';
    (window.gpaRows || []).forEach(function(r, i){
      var gradeOpts = '';
      Object.keys(GRADES).forEach(function(g){
        gradeOpts += '<option ' + (g === r.grade ? 'selected' : '') + '>' + g + '</option>';
      });
      html += '<tr>' +
        '<td><input type="text" value="' + esc(r.name || '') + '" placeholder="اسم المادة" data-gname="' + i + '"></td>' +
        '<td><input type="number" min="0" max="6" value="' + r.hrs + '" data-ghrs="' + i + '"></td>' +
        '<td><select data-ggrade="' + i + '">' + gradeOpts + '</select></td>' +
        '<td><button class="btn btn-sm btn-danger" data-gdel="' + i + '">✕</button></td></tr>';
    });
    b.innerHTML = html;
    b.querySelectorAll('[data-gname]').forEach(function(inp){
      inp.addEventListener('input', function(){
        window.gpaRows[parseInt(inp.dataset.gname)].name = inp.value;
        getS().set('gpaRows', window.gpaRows);
      });
    });
    b.querySelectorAll('[data-ghrs]').forEach(function(inp){
      inp.addEventListener('input', function(){
        window.gpaRows[parseInt(inp.dataset.ghrs)].hrs = parseFloat(inp.value) || 0;
        getS().set('gpaRows', window.gpaRows);
        window.calcGpa();
      });
    });
    b.querySelectorAll('[data-ggrade]').forEach(function(sel){
      sel.addEventListener('change', function(){
        window.gpaRows[parseInt(sel.dataset.ggrade)].grade = sel.value;
        getS().set('gpaRows', window.gpaRows);
        window.calcGpa();
      });
    });
    b.querySelectorAll('[data-gdel]').forEach(function(btn){
      btn.addEventListener('click', function(){ window.removeRow(parseInt(btn.dataset.gdel)); });
    });
    window.calcGpa();
  };

  window.addCourse = function(){
    window.gpaRows.push({name:'', hrs:3, grade:'A (90-100)'});
    getS().set('gpaRows', window.gpaRows);
    window.renderGpa();
  };

  window.removeRow = function(i){
    window.gpaRows.splice(i, 1);
    if(!window.gpaRows.length) window.gpaRows.push({name:'', hrs:3, grade:'A (90-100)'});
    getS().set('gpaRows', window.gpaRows);
    window.renderGpa();
  };

  window.clearGpa = function(){
    window.customConfirm('مسح كل المواد من حاسبة المعدل (' + (window.gpaRows || []).filter(function(r){ return r.name || r.hrs; }).length + ' مادة)؟', function(){
      window.gpaRows = [{name:'', hrs:0, grade:'A (90-100)'}];
      getS().set('gpaRows', window.gpaRows);
      window.renderGpa();
    });
  };

  window.loadSampleGpa = function(){
    window.gpaRows = [
      {name:'تفاضل وتكامل (1)', hrs:3, grade:'A- (85-89)'},
      {name:'فيزياء عامة (1)', hrs:3, grade:'B+ (80-84)'},
      {name:'برمجة الحاسوب', hrs:3, grade:'A (90-100)'},
      {name:'رسم هندسي يدوي', hrs:2, grade:'A (90-100)'}
    ];
    getS().set('gpaRows', window.gpaRows);
    window.renderGpa();
    toast('تم التحميل', 'success', 1500);
  };

  window.calcGpa = function(){
    var GRADES = window.GRADES || {};
    var pts=0, hrs=0, valid=0;
    (window.gpaRows || []).forEach(function(r){
      var h = parseFloat(r.hrs) || 0;
      var g = GRADES[r.grade] || 0;
      pts += h*g; hrs += h;
      if(h > 0) valid++;
    });
    var gpa = hrs ? pts / hrs : 0;
    var v = document.getElementById('gpaVal'); if(v) v.textContent = gpa.toFixed(2);
    var gh = document.getElementById('gpaHrs'); if(gh) gh.textContent = hrs;
    var gc = document.getElementById('gpaCourses'); if(gc) gc.textContent = valid;
    var gr = '—';
    if(gpa >= 3.75) gr = 'ممتاز';
    else if(gpa >= 3.5) gr = 'جيد جدًا مرتفع';
    else if(gpa >= 3.0) gr = 'جيد جداً';
    else if(gpa >= 2.5) gr = 'جيد';
    else if(gpa >= 2.0) gr = 'مقبول';
    else if(gpa > 0) gr = 'ضعيف';
    var gg = document.getElementById('gpaGrade'); if(gg) gg.textContent = gr;
  };

  window.calcWhatIf = function(){
    var hrsEl = document.getElementById('whatIfHrs');
    var gradeEl = document.getElementById('whatIfGrade');
    if(!hrsEl || !gradeEl) return;
    var hrs = parseFloat(hrsEl.value) || 0;
    var grade = gradeEl.value;
    if(!hrs){ toast('أدخل الساعات', 'warn'); return; }
    var GRADES = window.GRADES || {};
    var pts=0, totalHrs=0;
    (window.gpaRows || []).forEach(function(r){
      var h = parseFloat(r.hrs) || 0;
      var g = GRADES[r.grade] || 0;
      pts += h*g; totalHrs += h;
    });
    var newPts = pts + hrs * (GRADES[grade] || 0);
    var newHrs = totalHrs + hrs;
    var newGpa = newHrs ? newPts / newHrs : 0;
    var currentGpa = totalHrs ? pts / totalHrs : 0;
    var diff = newGpa - currentGpa;
    var res = document.getElementById('whatIfResult'); if(!res) return;
    res.style.display = 'block';
    var sign = diff >= 0 ? '▲' : '▼';
    var color = diff >= 0 ? 'var(--green)' : 'var(--red)';
    res.innerHTML = 'المعدل الجديد: <b>' + newGpa.toFixed(2) + '</b> ' +
      '<span style="color:' + color + ';margin-right:8px">' + sign + ' ' + Math.abs(diff).toFixed(2) + '</span>';
  };

  /* ============================================================
     GRADE CALC (need)
     ============================================================ */
  window.calcNeed = function(){
    var cur = parseFloat(document.getElementById('ncCurrent').value) || 0;
    var w = parseFloat(document.getElementById('ncWeight').value) || 40;
    var target = parseFloat(document.getElementById('ncTarget').value) || 60;
    var remainingWeight = w;
    var currentWeight = 100 - w;
    var need = (target - cur * (currentWeight / 100)) / (remainingWeight / 100);
    var res = document.getElementById('ncResult');
    res.style.display = 'block';
    res.style.background = need > 100 ? 'rgba(239,68,68,.12)' : need > 90 ? 'rgba(251,191,36,.12)' : 'rgba(52,211,153,.12)';
    res.style.border = '1px solid ' + (need > 100 ? 'var(--red)' : need > 90 ? 'var(--amber)' : 'var(--green)');
    var msg, color;
    if(need <= 0){ msg = '🎉 مبروك! ضمنت العلامة'; color = 'var(--green)'; }
    else if(need <= 60){ msg = '✅ تحتاج ' + need.toFixed(1) + '% فقط'; color = 'var(--green)'; }
    else if(need <= 85){ msg = '💪 تحتاج ' + need.toFixed(1) + '%'; color = 'var(--accent)'; }
    else if(need <= 100){ msg = '⚠️ تحتاج ' + need.toFixed(1) + '% — شد حيلك!'; color = 'var(--amber)'; }
    else { msg = '😅 مستحيل — ' + need.toFixed(1) + '% (>100)'; color = 'var(--red)'; }
    res.innerHTML = '<div style="font-size:var(--fs-lg);font-weight:800;color:' + color + '">' + msg + '</div>';
  };

  /* renderGradeCalc: النسخة الفعلية في course-sync.js (حُذفت النسخة المكرّرة من هنا) */

  window.addGradeCourse = function(){
    window.showModal('مادة جديدة', [{key:'name', label:'اسم المادة'}], {name:''}, function(data){
      if(!data.name){ toast('أدخل اسمًا', 'warn'); return false; }
      if(!space().grades) window.space.grades = [];
      window.space.grades.push({ name: data.name, items: [] });
      saveSpace(); window.renderGradeCalc();
      return true;
    });
  };

  window.addGradeItem = function(idx){
    var g = window.space.grades[idx];
    if(!g) return;
    window.showModal('علامة في ' + g.name, [
      {key:'name', label:'اسم التقييم'},
      {key:'score', label:'العلامة', type:'number'},
      {key:'weight', label:'من (الوزن)', type:'number'}
    ], {name:'', score:0, weight:10}, function(data){
      if(!data.name){ toast('أدخل اسمًا', 'warn'); return false; }
      var score = parseFloat(data.score) || 0;
      var weight = parseFloat(data.weight) || 0;
      if(score > weight){ toast('⚠️ العلامة أكبر من الوزن', 'warn', 2500); return false; }
      g.items.push({ name: data.name, score: score, weight: weight });
      saveSpace(); window.renderGradeCalc();
      return true;
    });
  };

  /* ============================================================
     PLAN
     ============================================================ */
  /* renderPlan: النسخة الفعلية في course-sync.js (حُذفت النسخة المكرّرة من هنا) */

  window.filterSem = function(el, year){
    document.querySelectorAll('.chip[data-filter]').forEach(function(c){ c.classList.remove('active'); });
    el.classList.add('active');
    document.querySelectorAll('#semesters > .card').forEach(function(s){
      s.style.display = (year === 'all' || s.dataset.year === year) ? '' : 'none';
    });
  };

  /* ============================================================
     COURSE DESCRIPTIONS
     ============================================================ */
  window.renderCourseDescriptions = function(){
    var list = document.getElementById('cdList'); if(!list) return;
    var q = '';
    var sInp = document.getElementById('cdSearch');
    if(sInp) q = (sInp.value || '').trim().toLowerCase();
    var year = window.currentCdYear || 'all';
    var CD = window.COURSES_DESC || {};
    var SEMESTERS = window.SEMESTERS || [];
    var html = '', count = 0;

    SEMESTERS.forEach(function(sem){
      if(year !== 'all' && String(sem.year) !== String(year)) return;
      var visible = sem.courses.filter(function(c){
        if(!q) return true;
        return c.n.toLowerCase().indexOf(q) > -1 || (c.code && String(c.code).indexOf(q) > -1);
      });
      if(!visible.length) return;
      html += '<div class="cd-semester"><div class="cd-semester-title">📚 سنة ' + sem.year + ' — ' + esc(sem.name) + '</div>';
      visible.forEach(function(c){
        count++;
        var desc = CD[c.n] || (c.code && CD[c.code]) || 'الوصف غير متوفر.';
        html += '<div class="cd-course"><div class="cd-head"><div class="cd-name">📘 ' + esc(c.n) + '</div>' +
          '<span class="badge">' + c.h + ' ساعات</span></div>' +
          (c.code && c.code !== '—' ? '<div class="cd-code">كود: ' + esc(c.code) + '</div>' : '') +
          '<div class="cd-desc">' + esc(desc) + '</div>' +
          (c.type === 'lab' ? ' <span class="badge" style="background:rgba(52,211,153,.15);color:var(--green)">مختبر</span>' : '') + '</div>';
      });
      html += '</div>';
    });

    if(!count) list.innerHTML = '<div class="empty"><div class="ic">📕</div><p>لا نتائج</p></div>';
    else list.innerHTML = '<div style="color:var(--muted);font-size:var(--fs-sm);margin-bottom:12px">عدد المواد: ' + count + '</div>' + html;
  };

  /* ============================================================
     HU LINKS
     ============================================================ */
  window.renderHuLinks = function(){
    var sections = ['huMainLinks','huLibraryLinks','huAppLinks','huSupportLinks'];
    var keys = ['main','library','apps','support'];
    var HU = window.HU_LINKS || {};
    keys.forEach(function(key, idx){
      var el = document.getElementById(sections[idx]); if(!el) return;
      var html = '';
      (HU[key] || []).forEach(function(link){
        html += '<a class="hu-link" href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<div class="hu-link-icon">' + link.icon + '</div>' +
          '<div class="hu-link-body">' +
            '<div class="hu-link-title">' + esc(link.title) + '</div>' +
            '<div class="hu-link-desc">' + esc(link.desc) + '</div>' +
          '</div><div class="hu-link-arrow">←</div></a>';
      });
      el.innerHTML = html;
    });
  };

  console.log('📦 features.js loaded');
})();