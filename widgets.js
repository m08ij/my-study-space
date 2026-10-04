/* ============================================================
   widgets.js v8 — Widgets + Calendar + Mindmap
   - ✅ FIXED: كل UTC bugs (3 مواقع)
   - ✅ FIXED: focus screen + prayer + events
   ============================================================ */
(function(){
  'use strict';

  function getSpace(){ return window.space || {profile:{},timetable:{},courses:[],tasks:[],exams:[],attendance:{},decks:[],budget:[],extras:[],grades:[]}; }
  function toast(msg, type){ if(typeof window.toast === 'function') window.toast(msg, type || 'info', 2200); }
  function saveSpace(){ if(typeof window.saveSpace === 'function') window.saveSpace(); else if(window.S) window.S.set('space', window.space); }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function getS(){ return window.S || {get:function(k,d){return d;}}; }
  function getDaysAr(){ return window.DAYS_AR || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']; }
  function getDaysEn(){ return window.DAYS_EN || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; }

  /* ✅ FIXED: date helpers */
  function localDateStr(d){
    if(!(d instanceof Date)) d = new Date(d);
    return d.getFullYear() + '-' +
      String(d.getMonth()+1).padStart(2,'0') + '-' +
      String(d.getDate()).padStart(2,'0');
  }
  function localToday(){ return localDateStr(new Date()); }

  /* Intervals tracking */
  var _intervals = [];
  function addInterval(fn, ms){ var id = setInterval(fn, ms); _intervals.push(id); return id; }
  function clearAllIntervals(){ _intervals.forEach(function(id){ clearInterval(id); }); _intervals = []; }

  function injectCSS(){
    if(document.getElementById('lw-style')) return;
    /* الأنماط انتقلت إلى app.css (قسم: الأدوات الجانبية ووضع التركيز (كانت lw-style)) */
  }

  var WIDGETS = {
    focus: {
      title: 'وضع التركيز', icon: '🎯', default: true,
      html: function(){
        return '<div class="lw-card lw-focus" data-widget="focus">' +
          '<div class="lw-focus-row"><div class="lw-focus-ic">🎯</div>' +
          '<div class="lw-focus-info"><div class="lw-focus-title">وضع التركيز</div>' +
          '<div class="lw-focus-sub">شاشة كاملة + مؤقت + مهامك</div></div></div>' +
          '<button class="lw-focus-start" id="lwFocusStart">▶ ابدأ التركيز</button></div>';
      },
      attach: function(card){ var btn = card.querySelector('#lwFocusStart'); if(btn) btn.addEventListener('click', openFocusScreen); }
    },
    prayer: {
      title: 'مواقيت الصلاة', icon: '🕌', default: true,
      html: function(){
        return '<div class="lw-card" data-widget="prayer">' +
          '<div class="lw-title"><span class="lw-ic">🕌</span> مواقيت الصلاة' +
          '<button class="lw-refresh" data-action="refresh-prayer">⟳</button></div>' +
          '<div id="lwPrayerBody"><div class="lw-empty-mini"><div class="lw-em-ic">🕌</div>جاري التحميل...</div></div></div>';
      },
      attach: function(card){
        var btn = card.querySelector('[data-action="refresh-prayer"]');
        if(btn) btn.addEventListener('click', function(){ loadPrayerTimes(true); });
        renderPrayerBody();
        if(!prayerData) loadPrayerTimes(false);
      }
    },
    events: {
      title: 'الأحداث القادمة', icon: '📅', default: true,
      html: function(){
        return '<div class="lw-card" data-widget="events">' +
          '<div class="lw-title"><span class="lw-ic">📅</span> الأحداث القادمة' +
          '<button class="lw-refresh" data-action="refresh-events">⟳</button></div>' +
          '<div id="lwEventsBody"></div></div>';
      },
      attach: function(card){
        var btn = card.querySelector('[data-action="refresh-events"]');
        if(btn) btn.addEventListener('click', function(){ renderEventsBody(); toast('🔄 حُدّث', 'info'); });
        renderEventsBody();
      }
    },
    pomodoro: {
      title: 'بومودورو', icon: '⏱️', default: false,
      html: function(){
        return '<div class="lw-card" data-widget="pomodoro">' +
          '<div class="lw-title"><span class="lw-ic">⏱️</span> بومودورو</div>' +
          '<div id="lwPomodoroBody"></div></div>';
      },
      attach: function(card){ renderPomodoroBody(); }
    },
    notes: {
      title: 'آخر الملاحظات', icon: '📔', default: false,
      html: function(){
        return '<div class="lw-card" data-widget="notes">' +
          '<div class="lw-title"><span class="lw-ic">📔</span> آخر الملاحظات</div>' +
          '<div id="lwNotesBody"></div></div>';
      },
      attach: function(card){ renderNotesBody(); }
    },
    budget: {
      title: 'ملخص الميزانية', icon: '💰', default: false,
      html: function(){
        return '<div class="lw-card" data-widget="budget">' +
          '<div class="lw-title"><span class="lw-ic">💰</span> الميزانية</div>' +
          '<div id="lwBudgetBody"></div></div>';
      },
      attach: function(card){ renderBudgetBody(); }
    }
  };

  var enabledWidgets = [];
  function loadEnabled(){
    try{ var v = JSON.parse(localStorage.getItem('lw_enabled_widgets') || 'null'); if(Array.isArray(v)) return v; }catch(e){}
    return Object.keys(WIDGETS).filter(function(k){ return WIDGETS[k].default; });
  }
  function saveEnabled(){ try{ localStorage.setItem('lw_enabled_widgets', JSON.stringify(enabledWidgets)); }catch(e){} }

  function injectHTML(){
    if(document.getElementById('lwSidebar')) return;
    var backdrop = document.createElement('div');
    backdrop.className = 'lw-backdrop'; backdrop.id = 'lwBackdrop';
    document.body.appendChild(backdrop);
    var expandBtn = document.createElement('button');
    expandBtn.className = 'lw-expand-btn'; expandBtn.id = 'lwExpandBtn';
    expandBtn.title = 'فتح الأدوات الجانبية'; expandBtn.innerHTML = '🎯';
    document.body.appendChild(expandBtn);
    var aside = document.createElement('aside');
    aside.className = 'lw-sidebar'; aside.id = 'lwSidebar';
    document.body.appendChild(aside);
    var focusScreen = document.createElement('div');
    focusScreen.className = 'focus-screen'; focusScreen.id = 'focusScreen';
    focusScreen.innerHTML = '<div class="focus-header"><div class="focus-header-left"><div class="focus-logo">🎯</div><div><h2>وضع التركيز</h2><div class="focus-header-sub" id="focusHeaderSub">—</div></div></div><button class="focus-exit-btn" id="focusExitBtn"><span>✕</span> خروج</button></div><div class="focus-body"><div class="focus-timer-panel"><span class="focus-mode-label" id="focusModeLabel">🎯 وقت التركيز</span><div class="focus-ring-wrap"><svg viewBox="0 0 260 260"><defs><linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#a78bfa"/></linearGradient></defs><circle class="focus-ring-bg" cx="130" cy="130" r="116"/><circle class="focus-ring-fg" id="focusRing" cx="130" cy="130" r="116" stroke-dasharray="728.8" stroke-dashoffset="0"/></svg><div class="focus-ring-inner"><div class="focus-time-display" id="focusTimeDisplay">25:00</div><div class="focus-time-sub" id="focusTimeSub">جلسة تركيز</div></div></div><div class="focus-controls"><button class="focus-btn primary" id="focusStartPause">▶ ابدأ</button><button class="focus-btn ghost" id="focusReset">↺ إعادة</button></div></div><div class="focus-tasks-panel"><div class="focus-tasks-header"><h3><span>📝</span> مهامك الآن</h3><span class="focus-tasks-count" id="focusTasksCount">0</span></div><div class="focus-tasks-list" id="focusTasksList"></div></div></div>';
    document.body.appendChild(focusScreen);
  }

  function renderSidebar(){
    var sidebar = document.getElementById('lwSidebar'); if(!sidebar) return;
    var html = '<div class="lw-close-row"><span class="lw-close-title">الأدوات السريعة</span><div class="lw-close-actions"><button class="lw-close-btn" id="lwCustomizeBtn" title="تخصيص">⚙</button><button class="lw-close-btn lw-close-x" id="lwCloseBtn" title="إغلاق">×</button></div></div>';
    if(enabledWidgets.length === 0){
      html += '<div class="lw-empty-mini" style="padding:40px 16px"><div class="lw-em-ic">🎨</div><div>ما اخترت أي widget</div></div>';
    } else {
      enabledWidgets.forEach(function(id){ var w = WIDGETS[id]; if(w) html += w.html(); });
    }
    sidebar.innerHTML = html;
    var closeBtn = sidebar.querySelector('#lwCloseBtn');
    if(closeBtn) closeBtn.addEventListener('click', function(){ setSidebarOpen(false); });
    var custBtn = sidebar.querySelector('#lwCustomizeBtn');
    if(custBtn) custBtn.addEventListener('click', openCustomizePanel);
    enabledWidgets.forEach(function(id){
      var w = WIDGETS[id]; if(!w) return;
      var card = sidebar.querySelector('[data-widget="' + id + '"]');
      if(card && w.attach) w.attach(card);
    });
  }

  function openCustomizePanel(){
    var old = document.getElementById('lwCustomizePanel'); if(old) old.remove();
    var oldBd = document.getElementById('lwCustomizeBackdrop'); if(oldBd) oldBd.remove();
    var backdrop = document.createElement('div'); backdrop.className = 'lw-customize-backdrop'; backdrop.id = 'lwCustomizeBackdrop';
    document.body.appendChild(backdrop);
    var panel = document.createElement('div'); panel.id = 'lwCustomizePanel'; panel.className = 'lw-customize-panel';
    var html = '<div class="lw-cust-header"><span>🎨 تخصيص الأدوات</span><button class="lw-close-btn lw-close-x" id="lwCustClose">×</button></div><div class="lw-cust-list">';
    Object.keys(WIDGETS).forEach(function(id){
      var w = WIDGETS[id]; var checked = enabledWidgets.indexOf(id) > -1;
      html += '<label class="lw-cust-item ' + (checked ? 'checked' : '') + '" data-cid="' + id + '"><input type="checkbox" data-wid="' + id + '" ' + (checked ? 'checked' : '') + '><span class="lw-cust-ic">' + w.icon + '</span><span class="lw-cust-title">' + w.title + '</span></label>';
    });
    html += '</div><div class="lw-cust-footer"><span class="lw-cust-count" id="lwCustCount">' + enabledWidgets.length + ' / ' + Object.keys(WIDGETS).length + '</span><button class="lw-cust-btn" id="lwCustReset">↺ الافتراضي</button></div>';
    panel.innerHTML = html; document.body.appendChild(panel);
    function closePanel(){ panel.remove(); backdrop.remove(); }
    panel.querySelector('#lwCustClose').addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);
    panel.querySelectorAll('input[data-wid]').forEach(function(cb){
      cb.addEventListener('change', function(){
        var id = cb.dataset.wid; var idx = enabledWidgets.indexOf(id);
        if(cb.checked && idx === -1) enabledWidgets.push(id);
        else if(!cb.checked && idx > -1) enabledWidgets.splice(idx, 1);
        var item = panel.querySelector('[data-cid="' + id + '"]'); if(item) item.classList.toggle('checked', cb.checked);
        var cnt = panel.querySelector('#lwCustCount'); if(cnt) cnt.textContent = enabledWidgets.length + ' / ' + Object.keys(WIDGETS).length;
        saveEnabled(); renderSidebar();
      });
    });
    panel.querySelector('#lwCustReset').addEventListener('click', function(){
      enabledWidgets = Object.keys(WIDGETS).filter(function(k){ return WIDGETS[k].default; });
      saveEnabled(); closePanel(); renderSidebar(); toast('↺ تم الاسترجاع', 'success');
    });
  }

  function setSidebarOpen(v){
    var sidebar = document.getElementById('lwSidebar');
    var expandBtn = document.getElementById('lwExpandBtn');
    var backdrop = document.getElementById('lwBackdrop');
    if(!sidebar || !expandBtn) return;
    sidebar.classList.toggle('open', v);
    expandBtn.classList.toggle('hidden', v);
    if(backdrop) backdrop.classList.toggle('show', v);
    try{ localStorage.setItem('lw_sidebar_open', JSON.stringify(v)); }catch(e){}
  }

  function initSidebar(){
    var expandBtn = document.getElementById('lwExpandBtn');
    var backdrop = document.getElementById('lwBackdrop');
    if(!expandBtn) return;
    var open = false;
    try{ var saved = localStorage.getItem('lw_sidebar_open'); if(saved !== null) open = JSON.parse(saved); }catch(e){ open = false; }
    setSidebarOpen(open);
    expandBtn.addEventListener('click', function(){ setSidebarOpen(true); });
    if(backdrop) backdrop.addEventListener('click', function(){ setSidebarOpen(false); });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        var fs = document.getElementById('focusScreen');
        if(!fs || !fs.classList.contains('open')){
          var sb = document.getElementById('lwSidebar');
          if(sb && sb.classList.contains('open')) setSidebarOpen(false);
        }
      }
    });
  }

  /* ============ ✅ FIXED: findNextLecture with local date ============ */
  function findNextLecture(now){
    var sp = getSpace(); var timetable = sp.timetable || {};
    var keys = Object.keys(timetable); if(!keys.length) return null;
    var dayEn = getDaysEn(); var dayAr = getDaysAr(); var todayIdx = now.getDay();
    var best = null;
    keys.forEach(function(key){
      var parts = key.split('-'); var day = parts[0]; var time = parts[1];
      var dayIdx = dayEn.indexOf(day); if(dayIdx === -1) return;
      var cls = timetable[key]; if(!cls || !cls.name) return;
      var tp = time.split(':'); var hh = parseInt(tp[0], 10); var mm = parseInt(tp[1], 10) || 0;
      if(isNaN(hh)) return;
      var dayDiff = (dayIdx - todayIdx + 7) % 7;
      var dt = new Date(now); dt.setDate(dt.getDate() + dayDiff); dt.setHours(hh, mm, 0, 0);
      if(dt.getTime() < now.getTime()) dt.setDate(dt.getDate() + 7);
      if(!best || dt.getTime() < best.dt.getTime()) {
        best = {
          name: cls.name, room: cls.room || '', time: time,
          dayAr: dayAr[dayIdx],
          dateStr: localDateStr(dt),  /* ✅ FIXED */
          dt: dt
        };
      }
    });
    return best;
  }

  /* ============ ✅ FIXED: renderEventsBody with local date ============ */
  function renderEventsBody(){
    var body = document.getElementById('lwEventsBody'); if(!body) return;
    var sp = getSpace();
    var now = new Date();
    var today = localToday();  /* ✅ FIXED */
    var nowMs = now.getTime();
    var events = [];

    (sp.exams || []).forEach(function(e){
      if(!e.date || e.date < today) return;
      var timeStr = e.time && /^\d{1,2}:\d{2}$/.test(e.time) ? e.time : '23:59';
      var dt = new Date(e.date + 'T' + timeStr);
      if(dt.getTime() < nowMs) return;
      events.push({icon:'📝', title: e.name || '', date: e.date, time: e.time || '', sub: e.course || '', sortTime: dt.getTime()});
    });
    (sp.tasks || []).forEach(function(t){
      if(t.done || !t.due || t.due < today) return;
      var dt = new Date(t.due + 'T23:59');
      if(dt.getTime() < nowMs) return;
      events.push({icon:'📌', title: t.title || '', date: t.due, time: '', sub: t.course || '', sortTime: dt.getTime()});
    });
    var nl = findNextLecture(now);
    if(nl) events.push({icon:'📖', title: nl.name, date: nl.dateStr, time: nl.time, sub: (nl.room ? '📍 ' + nl.room + ' · ' : '') + nl.dayAr, sortTime: nl.dt.getTime()});
    events.sort(function(a,b){ return a.sortTime - b.sortTime; });
    events = events.slice(0, 8);
    if(!events.length){ body.innerHTML = '<div class="lw-empty-mini"><div class="lw-em-ic">🏖️</div>لا أحداث قادمة</div>'; return; }
    var html = '';
    events.forEach(function(ev){
      var diffMs = ev.sortTime - nowMs; var diffDays = Math.ceil(diffMs / 86400000);
      var when, cls;
      if(diffMs < 3600000){ when = Math.max(1, Math.floor(diffMs / 60000)) + ' د'; cls = 'urgent'; }
      else if(diffMs < 86400000){ when = Math.floor(diffMs / 3600000) + ' س'; cls = 'urgent'; }
      else { when = diffDays === 0 ? 'اليوم' : diffDays === 1 ? 'غدًا' : diffDays + ' أيام'; cls = diffDays <= 2 ? 'urgent' : diffDays <= 5 ? 'soon' : ''; }
      var meta = ev.date + (ev.time ? ' · ' + ev.time : '') + (ev.sub ? ' · ' + ev.sub : '');
      html += '<div class="lw-item"><div class="lw-item-ic">' + ev.icon + '</div><div class="lw-item-body"><div class="lw-item-title">' + esc(ev.title) + '</div><div class="lw-item-meta">' + esc(meta) + '</div></div><div class="lw-item-when ' + cls + '">' + when + '</div></div>';
    });
    body.innerHTML = html;
  }

  function renderPomodoroBody(){
    var body = document.getElementById('lwPomodoroBody'); if(!body) return;
    var S = getS(); var sessions = S.get('pomoSessions', 0) || 0; var focusMin = S.get('pomoFocus', 0) || 0;
    body.innerHTML = '<div class="lw-stats"><div class="lw-stat"><div class="lw-stat-val">' + sessions + '</div><div class="lw-stat-lbl">جلسات</div></div><div class="lw-stat"><div class="lw-stat-val green">' + focusMin + '</div><div class="lw-stat-lbl">دقيقة</div></div></div>';
  }

  function renderNotesBody(){
    var body = document.getElementById('lwNotesBody'); if(!body) return;
    var notes = window.notes || [];
    if(!notes.length){ body.innerHTML = '<div class="lw-empty-mini"><div class="lw-em-ic">📔</div>لا ملاحظات</div>'; return; }
    var html = '';
    notes.slice(0, 4).forEach(function(n){
      html += '<div class="lw-item"><div class="lw-item-ic">📝</div><div class="lw-item-body"><div class="lw-item-title">' + esc(n.title || '') + '</div><div class="lw-item-meta">' + esc((n.body || '').slice(0, 50)) + '</div></div></div>';
    });
    body.innerHTML = html;
  }

  function renderBudgetBody(){
    var body = document.getElementById('lwBudgetBody'); if(!body) return;
    var sp = getSpace();
    var inc = (sp.budget || []).filter(function(b){ return b.type === 'income'; }).reduce(function(a,b){ return a + (parseFloat(b.amount) || 0); }, 0);
    var exp = (sp.budget || []).filter(function(b){ return b.type === 'expense'; }).reduce(function(a,b){ return a + (parseFloat(b.amount) || 0); }, 0);
    var bal = inc - exp;
    body.innerHTML = '<div class="lw-stats"><div class="lw-stat"><div class="lw-stat-val green">' + inc.toFixed(0) + '</div><div class="lw-stat-lbl">دخل</div></div><div class="lw-stat"><div class="lw-stat-val red">' + exp.toFixed(0) + '</div><div class="lw-stat-lbl">مصروف</div></div><div class="lw-stat"><div class="lw-stat-val ' + (bal >= 0 ? 'green' : 'red') + '">' + bal.toFixed(0) + '</div><div class="lw-stat-lbl">رصيد</div></div></div>';
  }

  /* ============ Focus Screen ============ */
  var focusIntervalId = null;
  function formatTime(sec){ var m = Math.floor(sec/60), s = sec % 60; return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0'); }

  function updateFocusTimerUI(){
    var t = window.ts; if(!t) return;
    var timerEl = document.getElementById('focusTimeDisplay');
    var ringEl = document.getElementById('focusRing');
    var startBtn = document.getElementById('focusStartPause');
    var modeLabel = document.getElementById('focusModeLabel');
    var sub = document.getElementById('focusTimeSub');
    if(!timerEl) return;
    timerEl.textContent = formatTime(t.remaining);
    if(ringEl && t.total > 0){
      var pct = Math.max(0, Math.min(1, 1 - (t.remaining / t.total)));
      ringEl.style.strokeDashoffset = 2 * Math.PI * 116 * pct;
    }
    if(startBtn) startBtn.textContent = t.running ? '⏸ إيقاف' : '▶ ابدأ';
    if(modeLabel){
      modeLabel.textContent = t.mode === 'focus' ? '🎯 وقت التركيز' : t.mode === 'short' ? '☕ راحة قصيرة' : t.mode === 'long' ? '🌴 راحة طويلة' : '⏱️ تصاعدي';
    }
    if(sub) sub.textContent = t.running ? 'جلسة جارية...' : 'جاهز للبدء';
  }

  function startFocusTimerLoop(){
    if(focusIntervalId) clearInterval(focusIntervalId);
    focusIntervalId = setInterval(function(){
      var screen = document.getElementById('focusScreen');
      if(!screen || !screen.classList.contains('open')) return;
      updateFocusTimerUI();
    }, 500);
  }

  function toggleFocusTimer(){ if(typeof window.toggleTimer === 'function'){ window.toggleTimer(); updateFocusTimerUI(); } }
  function resetFocusTimer(){ if(typeof window.resetTimer === 'function'){ window.resetTimer(); updateFocusTimerUI(); } }

  /* ✅ FIXED: renderFocusTasks with local date */
  function renderFocusTasks(){
    var list = document.getElementById('focusTasksList'); var cnt = document.getElementById('focusTasksCount');
    if(!list) return;
    var sp = getSpace();
    var today = localToday();  /* ✅ FIXED */
    var tasks = (sp.tasks || []).filter(function(t){ return !t.done; });
    tasks.sort(function(a,b){ if(!a.due && !b.due) return 0; if(!a.due) return 1; if(!b.due) return -1; return a.due.localeCompare(b.due); });
    tasks = tasks.slice(0, 12);
    if(cnt) cnt.textContent = tasks.length;
    if(!tasks.length){
      list.innerHTML = '<div class="focus-empty"><div class="focus-empty-ic">✨</div><div class="focus-empty-title">ما عندك مهام</div></div>';
      return;
    }
    var html = '';
    tasks.forEach(function(t){
      var overdue = t.due && t.due < today;
      var daysLeft = t.due ? Math.ceil((new Date(t.due) - new Date(today)) / 86400000) : null;
      var urgent = !overdue && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
      var when = overdue ? 'متأخرة' : daysLeft === 0 ? 'اليوم' : daysLeft === 1 ? 'غدًا' : (daysLeft !== null && daysLeft > 1) ? daysLeft + ' يوم' : '';
      html += '<div class="focus-task" data-ft-id="' + esc(t.id) + '"><div class="focus-task-check"></div><div class="focus-task-body"><div class="focus-task-title">' + esc(t.title) + '</div>' + (t.course ? '<div class="focus-task-meta">' + esc(t.course) + '</div>' : '') + '</div>' + (when ? '<div class="focus-task-when ' + (overdue || urgent ? 'urgent' : '') + '">' + when + '</div>' : '') + '</div>';
    });
    list.innerHTML = html;
    list.querySelectorAll('[data-ft-id]').forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.dataset.ftId; var sp2 = getSpace();
        var task = (sp2.tasks || []).find(function(x){ return x.id === id; });
        if(!task) return;
        task.done = true; saveSpace();
        try{ if(typeof window.renderTasks === 'function') window.renderTasks(); }catch(e){}
        try{ if(typeof window.renderDashboard === 'function') window.renderDashboard(); }catch(e){}
        toast('✅ "' + task.title + '"', 'success');
        renderFocusTasks();
      });
    });
  }

  function openFocusScreen(){
    var screen = document.getElementById('focusScreen'); if(!screen) return;
    screen.classList.add('open');
    document.body.style.overflow = 'hidden';
    var sp = getSpace(); var name = (sp.profile && sp.profile.name) || '';
    var sub = document.getElementById('focusHeaderSub');
    if(sub){
      var hour = new Date().getHours();
      var greet = hour < 12 ? 'صباح الخير' : 'مساء الخير';
      sub.textContent = (name ? greet + ' ' + name.split(' ')[0] + ' · ' : '') + 'ركز على مهمة واحدة';
    }
    renderFocusTasks(); updateFocusTimerUI(); startFocusTimerLoop();
  }

  function closeFocusScreen(){
    var screen = document.getElementById('focusScreen'); if(!screen) return;
    screen.classList.remove('open');
    document.body.style.overflow = '';
    if(focusIntervalId){ clearInterval(focusIntervalId); focusIntervalId = null; }
  }

  function initFocusScreen(){
    var exitBtn = document.getElementById('focusExitBtn');
    var startPause = document.getElementById('focusStartPause');
    var resetBtn = document.getElementById('focusReset');
    if(exitBtn) exitBtn.addEventListener('click', closeFocusScreen);
    if(startPause) startPause.addEventListener('click', toggleFocusTimer);
    if(resetBtn) resetBtn.addEventListener('click', resetFocusTimer);
    document.addEventListener('keydown', function(e){
      var screen = document.getElementById('focusScreen');
      if(!screen || !screen.classList.contains('open')) return;
      if(e.key === 'Escape'){ e.preventDefault(); closeFocusScreen(); }
      if(e.key === ' ' && ['INPUT','TEXTAREA'].indexOf(document.activeElement.tagName) === -1){ e.preventDefault(); toggleFocusTimer(); }
    });
  }

  /* ============ Prayer ============ */
  var PRAYER_CACHE_KEY = 'lw_prayer_cache_v1';
  var PRAYER_CACHE_TTL = 6 * 60 * 60 * 1000;
  var prayerData = null;

  var PRAYER_NAMES = {
    Fajr:    {ar:'الفجر', ic:'🌙'},
    Sunrise: {ar:'الشروق', ic:'🌅'},
    Dhuhr:   {ar:'الظهر', ic:'☀️'},
    Asr:     {ar:'العصر', ic:'🌤️'},
    Maghrib: {ar:'المغرب', ic:'🌇'},
    Isha:    {ar:'العشاء', ic:'🌙'}
  };

  function getNextPrayer(){
    if(!prayerData || !prayerData.timings) return null;
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    for(var i = 0; i < order.length; i++){
      var t = prayerData.timings[order[i]];
      if(!t) continue;
      var parts = t.split(':');
      var m = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      if(m > nowMin){
        var diff = m - nowMin;
        return {key: order[i], name: PRAYER_NAMES[order[i]].ar, icon: PRAYER_NAMES[order[i]].ic, time: t.substring(0,5), diff: diff};
      }
    }
    var fajr = prayerData.timings.Fajr;
    if(fajr){
      var fp = fajr.split(':');
      var fm = parseInt(fp[0], 10) * 60 + parseInt(fp[1], 10);
      var diff2 = (24 * 60 - nowMin) + fm;
      return {key:'Fajr', name: PRAYER_NAMES.Fajr.ar, icon: PRAYER_NAMES.Fajr.ic, time: fajr.substring(0,5), diff: diff2, tomorrow: true};
    }
    return null;
  }

  function renderPrayerBody(){
    var body = document.getElementById('lwPrayerBody');
    if(!body) return;
    if(!prayerData || !prayerData.timings){
      body.innerHTML = '<div class="lw-empty-mini"><div class="lw-em-ic">🕌</div>جاري التحميل...</div>';
      return;
    }

    var next = getNextPrayer();
    var order = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();

    var html = '';

    if(next && next.key !== 'Sunrise'){
      var hh = Math.floor(next.diff / 60);
      var mm = next.diff % 60;
      var diffStr = hh > 0 ? (hh + 'س ' + mm + 'د') : (mm + 'د');
      html += '<div class="lw-prayer-next">' +
        '<span class="lw-prayer-next-ic">' + next.icon + '</span>' +
        '<span class="lw-prayer-next-name">' + next.name + '</span>' +
        '<span class="lw-prayer-next-time">' + next.time + '</span>' +
        '<span class="lw-prayer-next-diff">' + diffStr + '</span>' +
      '</div>';
    }

    html += '<div class="lw-prayer-grid">';
    order.forEach(function(key){
      var t = prayerData.timings[key];
      if(!t) return;
      var displayTime = t.substring(0,5);
      var parts = displayTime.split(':');
      var pMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      var isPast = pMin < nowMin;
      var isNext = next && next.key === key && !next.tomorrow;
      html += '<div class="lw-prayer-item ' + (isNext ? 'active' : '') + (isPast && !isNext ? ' past' : '') + '">' +
        '<div class="lw-prayer-ic">' + PRAYER_NAMES[key].ic + '</div>' +
        '<div class="lw-prayer-name">' + PRAYER_NAMES[key].ar + '</div>' +
        '<div class="lw-prayer-time">' + displayTime + '</div>' +
      '</div>';
    });
    html += '</div>';

    body.innerHTML = html;
  }

  function loadPrayerTimes(force){
    if(!force){
      try{
        var cache = JSON.parse(localStorage.getItem(PRAYER_CACHE_KEY) || 'null');
        if(cache && Date.now() - cache.ts < PRAYER_CACHE_TTL){
          prayerData = cache.data;
          renderPrayerBody();
          return;
        }
      }catch(e){}
    }
    if(force){ prayerData = null; renderPrayerBody(); }

    var url = 'https://api.aladhan.com/v1/timings?latitude=31.9856&longitude=35.9531&method=23&school=0';
    fetch(url, {cache: 'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(!j || j.code !== 200 || !j.data) return;
        prayerData = {timings: j.data.timings, date: j.data.date, meta: j.data.meta};
        try{ localStorage.setItem(PRAYER_CACHE_KEY, JSON.stringify({ts: Date.now(), data: prayerData})); }catch(e){}
        renderPrayerBody();
      })
      .catch(function(){});
  }

  /* ============ Init ============ */
  function init(){
    injectCSS();
    injectHTML();
    enabledWidgets = loadEnabled();
    renderSidebar();
    initSidebar();
    initFocusScreen();
    loadPrayerTimes(false);

    addInterval(function(){ renderEventsBody(); }, 2 * 60 * 1000);
    addInterval(function(){ renderPrayerBody(); }, 2 * 60 * 1000);

    window.addEventListener('beforeunload', clearAllIntervals);

    if(window.S && typeof window.S.set === 'function' && !window.S._lwWrapped){
      var origSet = window.S.set;
      window.S.set = function(k, v){
        var r = origSet.apply(this, arguments);
        if(k === 'space'){
          clearTimeout(window._lwRefreshTimer);
          window._lwRefreshTimer = setTimeout(function(){
            if(enabledWidgets.indexOf('events') > -1) renderEventsBody();
            if(enabledWidgets.indexOf('budget') > -1) renderBudgetBody();
            var fs = document.getElementById('focusScreen');
            if(fs && fs.classList.contains('open')) renderFocusTasks();
          }, 300);
        }
        return r;
      };
      window.S._lwWrapped = true;
    }
  }

  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }

  console.log('🎯 Widgets v8 loaded — UTC bugs fixed');
})();