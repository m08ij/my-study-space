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
  window.customConfirm = function(message, onConfirm){
    document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop show';
    bd.innerHTML = '<div class="modal" style="max-width:400px;text-align:center">' +
      '<div style="font-size:3rem;margin-bottom:12px">⚠️</div>' +
      '<h3 style="margin-bottom:18px">تأكيد الحذف</h3>' +
      '<p style="color:var(--muted);margin-bottom:22px;font-size:.9rem">' + esc(message) + '</p>' +
      '<div class="modal-actions" style="justify-content:center">' +
        '<button class="btn btn-sm btn-ghost" id="cCancel">إلغاء</button>' +
        '<button class="btn btn-sm btn-danger" id="cConfirm">🗑 نعم، احذف</button>' +
      '</div></div>';
    document.body.appendChild(bd);
    var close = function(){ bd.remove(); };
    bd.querySelector('#cCancel').onclick = close;
    bd.onclick = function(e){ if(e.target === bd) close(); };
    bd.querySelector('#cConfirm').onclick = function(){ close(); onConfirm(); };
  };

  /* ============================================================
     THEMES
     ============================================================ */
  var THEMES = [
    {id:'dark', name:'داكن', colors:['#0b0f1a','#22d3ee','#a78bfa']},
    {id:'dracula', name:'دراكولا', colors:['#191a21','#bd93f9','#ff79c6']},
    {id:'sakura', name:'ساكورا', colors:['#1a0e14','#ff8fb8','#c084fc']},
    {id:'nord', name:'نورد', colors:['#2e3440','#88c0d0','#b48ead']},
    {id:'ocean', name:'محيط', colors:['#071a2e','#38bdf8','#3b82f6']},
    {id:'royal', name:'ملكي', colors:['#0f0524','#a78bfa','#fbbf24']},
    {id:'cyberpunk', name:'سايبربانك', colors:['#0a0014','#22d3ee','#ec4899']},
    {id:'midnight', name:'منتصف الليل', colors:['#050914','#0ea5e9','#8b5cf6']},
    {id:'aurora', name:'شفق', colors:['#04101a','#14e0c8','#a78bfa']}
  ];
  window.THEMES = THEMES;

  window.applyTheme = function(t){
    var validIds = ['dark','dracula','sakura','nord','ocean','royal','cyberpunk','midnight','aurora'];
    if(validIds.indexOf(t) === -1) t = 'dark';
    document.documentElement.setAttribute('data-theme', t);
    S().set('theme', t);
    document.querySelectorAll('.theme-swatch').forEach(function(sw){
      sw.classList.toggle('active', sw.dataset.theme === t);
    });
  };

  window.buildThemePanel = function(){
    var grid = document.getElementById('themeGrid'); if(!grid) return;
    var html = '';
    THEMES.forEach(function(t){
      html += '<div class="theme-swatch" data-theme="' + t.id + '" style="background:linear-gradient(135deg, ' +
        t.colors[0] + ' 0%, ' + t.colors[0] + ' 40%, ' + t.colors[1] + ' 40%, ' + t.colors[1] + ' 70%, ' +
        t.colors[2] + ' 70%, ' + t.colors[2] + ' 100%)">' +
        '<div class="sw-check">✓</div><div class="sw-label">' + t.name + '</div></div>';
    });
    grid.innerHTML = html;
    grid.querySelectorAll('.theme-swatch').forEach(function(sw){
      sw.addEventListener('click', function(){
        window.applyTheme(sw.dataset.theme);
        var name = (THEMES.find(function(t){ return t.id === sw.dataset.theme; }) || {}).name || '';
        toast('🎨 تم تفعيل ثيم "' + name + '"', 'success', 1800);
      });
    });
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
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:.86rem">' +
        '<span style="color:var(--muted)">📚 ' + registered + ' / ' + totalRequired + ' ساعة</span>' +
        '<span style="color:var(--cyan);font-weight:700">' + pct + '%</span></div>' +
        '<div class="sc-progress"><div class="sc-progress-fill" style="width:' + pct + '%"></div></div>' +
        '<div style="text-align:center;color:var(--muted2);font-size:.75rem;margin-top:6px">باقي ' +
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

    /* Today classes */
    var tc = document.getElementById('todayClasses');
    if(tc){
      var tt = sp.timetable || {};
      var todays = Object.keys(tt)
        .filter(function(k){ return k.indexOf(todayKey) === 0; })
        .sort();
      if(!todays.length){
        tc.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.85rem">🌴 لا توجد محاضرات اليوم</div>';
      } else {
        var h = '';
        todays.forEach(function(k){
          var time = k.split('-')[1];
          var cls = tt[k];
          h += '<div style="display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)">' +
            '<div style="font-weight:700;color:var(--cyan);font-size:.84rem;min-width:48px">' + time + '</div>' +
            '<div><div style="font-size:.86rem;font-weight:600">' + esc(cls.name) + '</div>' +
            (cls.room ? '<div style="font-size:.72rem;color:var(--muted)">📍 ' + esc(cls.room) + '</div>' : '') +
            '</div></div>';
        });
        tc.innerHTML = h;
      }
    }

    /* Upcoming tasks */
    var ut = document.getElementById('upcomingTasks');
    if(ut){
      var wl = new Date(); wl.setDate(wl.getDate() + 7);
      var wlStr = wl.getFullYear() + '-' +
        String(wl.getMonth()+1).padStart(2,'0') + '-' +
        String(wl.getDate()).padStart(2,'0');
      var up = (sp.tasks || [])
        .filter(function(t){
          return !t.done && t.due && t.due >= todayStr && t.due <= wlStr;
        })
        .sort(function(a,b){ return a.due.localeCompare(b.due); })
        .slice(0, 5);

      if(!up.length){
        ut.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.85rem">✨ لا مهام قريبة</div>';
      } else {
        var h2 = '';
        up.forEach(function(t){
          var days = Math.ceil((new Date(t.due) - new Date(todayStr)) / 86400000);
          var col = days <= 2 ? 'var(--red)' : days <= 5 ? 'var(--amber)' : 'var(--muted)';
          h2 += '<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);align-items:center">' +
            '<div style="font-size:.73rem;color:' + col + ';min-width:58px;font-weight:700">' +
            (days === 0 ? 'اليوم' : days === 1 ? 'غدًا' : 'بعد ' + days + ' أيام') + '</div>' +
            '<div style="flex:1;font-size:.84rem">' + esc(t.title) + '</div></div>';
        });
        ut.innerHTML = h2;
      }
    }

    /* Budget */
    var db = document.getElementById('dashBudget');
    if(db){
      var col2 = balance >= 0 ? 'var(--green)' : 'var(--red)';
      db.innerHTML =
        '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.85rem"><span>📈 دخل</span>' +
        '<span style="color:var(--green);font-weight:700">' + income.toFixed(0) + ' د</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.85rem;border-top:1px solid var(--border)">' +
        '<span>📉 مصروف</span><span style="color:var(--red);font-weight:700">' + expense.toFixed(0) + ' د</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:.88rem;border-top:2px solid var(--border);margin-top:6px">' +
        '<span style="font-weight:700">💼 الرصيد</span><span style="color:' + col2 + ';font-weight:800">' + balance.toFixed(0) + ' د</span></div>';
    }

    /* Notes */
    var dn = document.getElementById('dashNotes');
    if(dn){
      var recent = notes.slice(0, 3);
      if(!recent.length){
        dn.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.85rem">📔 لا توجد ملاحظات</div>';
      } else {
        var hn = '';
        recent.forEach(function(n){
          hn += '<div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:.84rem">' +
            '<div style="font-weight:600">' + esc(n.title || 'بدون عنوان') + '</div>' +
            '<div style="font-size:.73rem;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            esc((n.body || '').slice(0, 50)) + '</div></div>';
        });
        dn.innerHTML = hn;
      }
    }

    try{ if(typeof window.renderStats === 'function') window.renderStats(); }catch(e){}
    try{ if(typeof window.updateTimerUI === 'function') window.updateTimerUI(); }catch(e){}
  };

  /* ============================================================
     STATS
     ============================================================ */
  window.renderStats = function(){
    var chart = document.getElementById('studyChart');
    var cards = document.getElementById('statsCards');
    if(!chart || !cards) return;

    var log = getS().get('studyLog', {});
    if(!log || typeof log !== 'object' || Array.isArray(log)) log = {};

    var DAYS_AR = window.DAYS_AR || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    var days = [];
    for(var i = 6; i >= 0; i--){
      var d = new Date();
      d.setHours(0,0,0,0);
      d.setDate(d.getDate() - i);
      var ds = d.getFullYear() + '-' +
        String(d.getMonth()+1).padStart(2,'0') + '-' +
        String(d.getDate()).padStart(2,'0');
      days.push({date: ds, name: DAYS_AR[d.getDay()].slice(0,3), minutes: log[ds] || 0});
    }

    var max = Math.max.apply(null, days.map(function(d){ return d.minutes; }).concat([60]));
    var chartHtml = '';
    days.forEach(function(d){
      var h = Math.max(4, (d.minutes / max) * 100);
      chartHtml += '<div class="bar" style="height:' + h + '%">' +
        '<span class="bar-value">' + (d.minutes > 0 ? d.minutes + 'د' : '') + '</span>' +
        '<span class="bar-label">' + d.name + '</span></div>';
    });
    chart.innerHTML = chartHtml;

    var totalMin = days.reduce(function(a,d){ return a + d.minutes; }, 0);
    var totalHrs = (totalMin / 60).toFixed(1);
    var avg = (totalMin / 7).toFixed(0);
    var sessions = getS().get('pomoSessions', 0) || 0;
    var tasksDone = ((space().tasks) || []).filter(function(t){ return t.done; }).length;
    var totalTasks = ((space().tasks) || []).length;
    var completion = totalTasks ? Math.round(tasksDone / totalTasks * 100) : 0;
    var totalCards = ((space().decks) || []).reduce(function(a,d){ return a + ((d.cards && d.cards.length) || 0); }, 0);

    cards.innerHTML =
      '<div class="stat"><div class="ic">⏱️</div><div><div class="v">' + totalHrs + ' س</div><div class="l">إجمالي الساعات</div></div></div>' +
      '<div class="stat"><div class="ic">📊</div><div><div class="v">' + avg + ' د</div><div class="l">متوسط يومي</div></div></div>' +
      '<div class="stat"><div class="ic">🎯</div><div><div class="v">' + sessions + '</div><div class="l">جلسات</div></div></div>' +
      '<div class="stat"><div class="ic">✅</div><div><div class="v">' + completion + '%</div><div class="l">إنجاز</div></div></div>' +
      '<div class="stat"><div class="ic">📚</div><div><div class="v">' + (space().courses || []).length + '</div><div class="l">المواد</div></div></div>' +
      '<div class="stat"><div class="ic">🃏</div><div><div class="v">' + totalCards + '</div><div class="l">البطاقات</div></div></div>';
  };

  /* ============================================================
     TASKS
     ============================================================ */
  window.renderTasks = function(){
    var c = document.getElementById('tasksList'); if(!c) return;
    var sp = space();
    var todayStr = today();
    var filter = window.currentTaskFilter || 'all';

    var tasks = (sp.tasks || []).slice().sort(function(a,b){
      if(a.done !== b.done) return a.done ? 1 : -1;
      if(!a.due) return 1; if(!b.due) return -1;
      return a.due.localeCompare(b.due);
    });

    if(filter === 'pending') tasks = tasks.filter(function(t){ return !t.done; });
    if(filter === 'done')    tasks = tasks.filter(function(t){ return t.done; });
    if(filter === 'overdue') tasks = tasks.filter(function(t){ return !t.done && t.due && t.due < todayStr; });

    if(!tasks.length){
      c.innerHTML = '<div class="empty"><div class="ic">📝</div><p>لا توجد مهام</p></div>';
      return;
    }

    var typeMap = {exam:'امتحان', assignment:'واجب', quiz:'كويز', project:'مشروع', task:'مهمة'};
    var html = '';
    tasks.forEach(function(t){
      var isOverdue = !t.done && t.due && t.due < todayStr;
      var daysLeft = t.due ? Math.ceil((new Date(t.due) - new Date(todayStr)) / 86400000) : null;
      var isUrgent = !t.done && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
      html += '<div class="task ' + (t.done ? 'done' : '') + ' ' +
        (isOverdue ? 'overdue' : isUrgent ? 'urgent' : '') + '">' +
        '<div class="task-check" data-toggle-task="' + t.id + '"></div>' +
        '<div class="task-body"><div class="task-title">' + esc(t.title) + '</div>' +
        '<div class="task-meta"><span class="badge ' + (t.type || 'task') + '">' +
        (typeMap[t.type] || 'مهمة') + '</span>' +
        (t.course ? '<span>📚 ' + esc(t.course) + '</span>' : '') +
        (t.due ? '<span>📅 ' + t.due +
          (daysLeft !== null ? ' (' + (daysLeft >= 0 ? 'بعد ' + daysLeft + ' يوم' : 'متأخر ' + Math.abs(daysLeft)) + ')' : '') +
          '</span>' : '') + '</div></div>' +
        '<div class="task-actions"><button class="btn btn-sm btn-ghost" data-edit-task="' + t.id + '">✏️</button>' +
        '<button class="btn btn-sm btn-danger" data-del-task="' + t.id + '">🗑</button></div></div>';
    });
    c.innerHTML = html;

    c.querySelectorAll('[data-toggle-task]').forEach(function(b){
      b.addEventListener('click', function(){ window.toggleTask(b.dataset.toggleTask); });
    });
    c.querySelectorAll('[data-edit-task]').forEach(function(b){
      b.addEventListener('click', function(){ window.editTask(b.dataset.editTask); });
    });
    c.querySelectorAll('[data-del-task]').forEach(function(b){
      b.addEventListener('click', function(){ window.deleteTask(b.dataset.delTask); });
    });
  };

  window.filterTasks = function(f){
    window.currentTaskFilter = f;
    document.querySelectorAll('[data-tf]').forEach(function(b){ b.classList.toggle('active', b.dataset.tf === f); });
    window.renderTasks();
  };

  window.addTask = function(){
    var opts = [{v:'', l:'— بدون مادة —'}];
    (space().courses || []).forEach(function(c){ opts.push({v: c.name, l: c.name}); });
    window.showModal('إضافة مهمة', [
      {key:'title', label:'العنوان'},
      {key:'type', label:'النوع', type:'select', options: [
        {v:'task', l:'مهمة'}, {v:'assignment', l:'واجب'}, {v:'exam', l:'امتحان'},
        {v:'quiz', l:'كويز'}, {v:'project', l:'مشروع'}]},
      {key:'course', label:'المادة', type:'select', options: opts},
      {key:'due', label:'تاريخ التسليم', type:'date'}
    ], {title:'', type:'task', course:'', due:''}, function(data){
      if(!data.title){ toast('أدخل عنوانًا', 'warn'); return false; }
      if(!space().tasks) window.space.tasks = [];
      window.space.tasks.push({
        id: uid(), title: data.title, type: data.type,
        course: data.course, due: data.due, done: false
      });
      saveSpace(); window.renderTasks(); window.renderDashboard();
      return true;
    });
  };

  window.editTask = function(id){
    var t = (space().tasks || []).find(function(x){ return x.id === id; });
    if(!t) return;
    var opts = [{v:'', l:'— بدون مادة —'}];
    (space().courses || []).forEach(function(c){ opts.push({v: c.name, l: c.name}); });
    window.showModal('تعديل مهمة', [
      {key:'title', label:'العنوان'},
      {key:'type', label:'النوع', type:'select', options: [
        {v:'task', l:'مهمة'}, {v:'assignment', l:'واجب'}, {v:'exam', l:'امتحان'},
        {v:'quiz', l:'كويز'}, {v:'project', l:'مشروع'}]},
      {key:'course', label:'المادة', type:'select', options: opts},
      {key:'due', label:'التاريخ', type:'date'}
    ], t, function(data){
      if(!data.title){ toast('أدخل عنوانًا', 'warn'); return false; }
      t.title = data.title; t.type = data.type; t.course = data.course; t.due = data.due;
      saveSpace(); window.renderTasks(); window.renderDashboard();
      return true;
    }, function(){
      window.customConfirm('حذف "' + t.title + '"؟', function(){
        window.space.tasks = window.space.tasks.filter(function(x){ return x.id !== id; });
        saveSpace(); window.renderTasks(); window.renderDashboard();
      });
    });
  };

  window.toggleTask = function(id){
    var t = (space().tasks || []).find(function(x){ return x.id === id; });
    if(!t) return;
    t.done = !t.done;
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
  window.renderExams = function(){
    var c = document.getElementById('examsList'); if(!c) return;
    var sp = space();
    if(!(sp.exams || []).length){
      c.innerHTML = '<div class="empty"><div class="ic">⏳</div><p>لا توجد امتحانات</p></div>';
      return;
    }
    var todayStr = today();
    var sorted = sp.exams.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
    var html = '';
    sorted.forEach(function(e){
      var daysLeft = Math.ceil((new Date(e.date) - new Date(todayStr)) / 86400000);
      var isUrgent = daysLeft >= 0 && daysLeft <= 7;
      html += '<div class="exam-card"><div class="exam-info"><div class="title">📝 ' + esc(e.name) + '</div>' +
        '<div class="meta">' + (e.course ? '📚 ' + esc(e.course) + ' · ' : '') +
        '📅 ' + e.date + (e.time ? ' · ⏰ ' + esc(e.time) : '') +
        (e.room ? ' · 📍 ' + esc(e.room) : '') + '</div></div>' +
        '<div class="exam-countdown ' + (isUrgent ? 'urgent' : '') + '">' +
        (daysLeft >= 0 ? daysLeft + ' يوم' : 'انتهى') +
        '<div class="lbl">' + (daysLeft >= 0 ? 'متبقي' : 'منتهي') + '</div></div>' +
        '<div style="display:flex;gap:4px">' +
        '<button class="btn btn-sm btn-ghost" data-edit-exam="' + e.id + '">✏️</button>' +
        '<button class="btn btn-sm btn-danger" data-del-exam="' + e.id + '">🗑</button>' +
        '</div></div>';
    });
    c.innerHTML = html;
    c.querySelectorAll('[data-edit-exam]').forEach(function(b){
      b.addEventListener('click', function(){ window.editExam(b.dataset.editExam); });
    });
    c.querySelectorAll('[data-del-exam]').forEach(function(b){
      b.addEventListener('click', function(){ window.deleteExam(b.dataset.delExam); });
    });
  };

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
  window.renderCourses = function(){
    var g = document.getElementById('myCoursesGrid'); if(!g) return;
    var sp = space();
    if(!(sp.courses || []).length){
      g.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="ic">📚</div><p>لا توجد مواد</p></div>';
      return;
    }
    var html = '';
    sp.courses.forEach(function(c){
      html += '<div class="card" data-course-card="' + c.id + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:10px">' +
          '<div><div style="font-weight:700;font-size:.98rem">' + esc(c.name) + '</div>' +
          (c.code ? '<div style="font-size:.7rem;color:var(--muted2);font-family:monospace">' + esc(c.code) + '</div>' : '') + '</div>' +
          '<span class="badge">' + (c.hours || 3) + ' ساعات</span></div>' +
        '<div style="display:flex;gap:6px;margin-top:12px">' +
          '<button class="btn btn-sm btn-ghost" data-edit-course="' + c.id + '">✏️</button>' +
          '<button class="btn btn-sm btn-danger" data-del-course="' + c.id + '">🗑</button></div>' +
        '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span style="font-size:.78rem;font-weight:700;color:var(--muted)">📎 ملفات المادة</span>' +
            '<span style="font-size:.68rem;color:var(--muted2)" data-files-count="' + c.id + '">—</span>' +
          '</div>' +
          '<div class="course-files-list" data-files-list="' + c.id + '">' +
            '<div style="text-align:center;padding:10px;font-size:.75rem;color:var(--muted2)">جاري التحميل...</div>' +
          '</div>' +
          '<button class="upload-course-btn" data-upload-course="' + c.id + '">📤 رفع ملف</button>' +
          '<input type="file" style="display:none" data-file-input="' + c.id + '">' +
          '<div class="upload-progress-bar" data-upload-progress="' + c.id + '"><div class="inner"></div></div>' +
        '</div>' +
      '</div>';
    });
    g.innerHTML = html;

    g.querySelectorAll('[data-edit-course]').forEach(function(b){
      b.addEventListener('click', function(){ window.editMyCourse(b.dataset.editCourse); });
    });
    g.querySelectorAll('[data-del-course]').forEach(function(b){
      b.addEventListener('click', function(){ window.deleteMyCourse(b.dataset.delCourse); });
    });
    g.querySelectorAll('[data-upload-course]').forEach(function(b){
      b.addEventListener('click', function(){
        var inp = g.querySelector('[data-file-input="' + b.dataset.uploadCourse + '"]');
        if(inp) inp.click();
      });
    });
    g.querySelectorAll('[data-file-input]').forEach(function(inp){
      inp.addEventListener('change', function(e){
        var f = e.target.files[0]; if(!f) return;
        window.handleCourseFileUpload(inp.dataset.fileInput, f);
        inp.value = '';
      });
    });

    sp.courses.forEach(function(c){ window.loadCourseFilesForCard(c.id); });
  };

  window.loadCourseFilesForCard = async function(courseId){
    var list = document.querySelector('[data-files-list="' + courseId + '"]');
    var count = document.querySelector('[data-files-count="' + courseId + '"]');
    if(!list) return;

    if(!window.SB || !window.SB.listCourseFiles){
      list.innerHTML = '<div style="text-align:center;padding:10px;font-size:.75rem;color:var(--muted2)">المزامنة غير مفعّلة</div>';
      return;
    }

    try{
      var files = await window.SB.listCourseFiles(courseId);
      if(!files.length){
        list.innerHTML = '<div style="text-align:center;padding:10px;font-size:.75rem;color:var(--muted2)">ما في ملفات بعد</div>';
        if(count) count.textContent = '0 ملف';
        return;
      }
      if(count) count.textContent = files.length + ' ملف';

      var html = '';
      files.forEach(function(f){
        var icon = window.SB.getFileIcon(f.name);
        var size = window.SB.formatFileSize(f.size);
        html += '<div class="course-file-item">' +
          '<div class="cf-icon">' + icon + '</div>' +
          '<div class="cf-info">' +
            '<div class="cf-name" title="' + esc(f.name) + '">' + esc(f.name.replace(/^\d+_/, '')) + '</div>' +
            '<div class="cf-meta">' + size + '</div>' +
          '</div>' +
          '<div class="cf-actions">' +
            '<a class="btn btn-sm btn-ghost" href="' + esc(f.url) + '" target="_blank" rel="noopener" title="فتح">👁️</a>' +
            '<button class="btn btn-sm btn-danger" data-del-file="' + esc(f.path) + '" data-course="' + courseId + '" title="حذف">🗑</button>' +
          '</div>' +
        '</div>';
      });
      list.innerHTML = html;

      list.querySelectorAll('[data-del-file]').forEach(function(b){
        b.addEventListener('click', function(){
          window.customConfirm('حذف الملف؟', async function(){
            var ok = await window.SB.deleteCourseFile(b.dataset.delFile);
            if(ok){ toast('🗑 حُذف', 'success', 1500); window.loadCourseFilesForCard(b.dataset.course); }
            else toast('فشل الحذف', 'warn', 2000);
          });
        });
      });
    }catch(e){
      list.innerHTML = '<div style="text-align:center;padding:10px;font-size:.75rem;color:var(--red)">فشل التحميل</div>';
    }
  };

  window.handleCourseFileUpload = async function(courseId, file){
    if(!window.SB || !window.SB.uploadCourseFile){
      toast('خدمة الرفع غير متوفرة', 'warn', 2500); return;
    }
    if(file.size > 25 * 1024 * 1024){
      toast('⚠️ الملف كبير — الحد 25 MB', 'warn', 3500); return;
    }

    var progress = document.querySelector('[data-upload-progress="' + courseId + '"]');
    if(progress){ progress.style.display = 'block'; progress.querySelector('.inner').style.width = '30%'; }
    toast('📤 جاري الرفع...', 'info', 2000);

    try{
      var res = await window.SB.uploadCourseFile(courseId, file);
      if(progress) progress.querySelector('.inner').style.width = '100%';
      setTimeout(function(){ if(progress) progress.style.display = 'none'; }, 800);

      if(res.error){ toast('❌ ' + res.error, 'warn', 3500); return; }
      toast('✅ تم الرفع!', 'success', 2000);
      window.loadCourseFilesForCard(courseId);
    }catch(e){
      if(progress) progress.style.display = 'none';
      toast('فشل الرفع', 'warn', 2500);
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
      if(!data.name){ toast('أدخل اسمًا', 'warn'); return false; }
      if(!space().courses) window.space.courses = [];
      window.space.courses.push(Object.assign({id: uid()}, data, {hours: parseInt(data.hours) || 3}));
      saveSpace(); window.renderCourses(); window.renderDashboard();
      return true;
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

  window.deleteMyCourse = function(id){
    var c = (space().courses || []).find(function(x){ return x.id === id; });
    if(!c) return;
    window.customConfirm('حذف "' + c.name + '"؟', function(){
      window.space.courses = window.space.courses.filter(function(x){ return x.id !== id; });
      saveSpace(); window.renderCourses(); window.renderDashboard();
    });
  };

  window.importFromPlan = function(){
    var SEMESTERS = window.SEMESTERS || [];
    var options = SEMESTERS.map(function(s, i){ return {v: i, l: 'سنة ' + s.year + ' — ' + s.name}; });
    window.showModal('استيراد مواد', [
      {key:'sem', label:'اختر الفصل', type:'select', options: options}
    ], {sem:0}, function(data){
      var s = SEMESTERS[parseInt(data.sem)];
      if(!s) return false;
      var count = 0;
      s.courses.forEach(function(c){
        if(!(space().courses || []).find(function(mc){ return mc.name === c.n; })){
          if(!window.space.courses) window.space.courses = [];
          window.space.courses.push({id: uid(), name: c.n, code: c.code || '', hours: c.h, instructor:'', room:''});
          count++;
        }
      });
      saveSpace(); window.renderCourses(); window.renderDashboard();
      toast('تم استيراد ' + count + ' مادة', 'success', 2500);
      return true;
    });
  };

  /* ============================================================
     ATTENDANCE
     ============================================================ */
  window.renderAttendance = function(){
    var c = document.getElementById('attendanceList'); if(!c) return;
    var entries = Object.entries(space().attendance || {});
    if(!entries.length){
      c.innerHTML = '<div class="empty"><div class="ic">✅</div><p>لا توجد مواد</p></div>';
      return;
    }
    /* sort by name */
    entries.sort(function(a,b){ return a[0].localeCompare(b[0], 'ar'); });
    var html = '';
    entries.forEach(function(kv){
      var name = kv[0], a = kv[1];
      var total = a.present + a.absent;
      var hasData = total > 0;
      var pct = hasData ? Math.round(a.present / total * 100) : 0;
      var lvl = !hasData ? 'neutral' : (pct >= 85 ? 'good' : pct >= 75 ? 'warn' : 'danger');
      html += '<div class="att-card"><div class="att-head"><div class="att-name">📚 ' + esc(name) + '</div>' +
        '<div class="att-pct ' + lvl + '">' + (hasData ? pct + '%' : '—') + '</div></div>' +
        '<div class="att-bar"><div class="att-fill ' + lvl + '" style="width:' + (hasData ? pct : 0) + '%"></div></div>' +
        '<div class="att-actions"><span style="margin-right:auto">✅ <b>' + a.present + '</b> · ❌ <b>' + a.absent + '</b></span>' +
        '<button class="btn btn-sm" data-mark-p="' + esc(name) + '">+ حاضر</button>' +
        '<button class="btn btn-sm btn-ghost" data-mark-a="' + esc(name) + '">+ غائب</button>' +
        '<button class="btn btn-sm btn-danger" data-del-att="' + esc(name) + '">🗑</button></div></div>';
    });
    c.innerHTML = html;
    c.querySelectorAll('[data-mark-p]').forEach(function(b){
      b.addEventListener('click', function(){ window.markAttendance(b.dataset.markP, 'present'); });
    });
    c.querySelectorAll('[data-mark-a]').forEach(function(b){
      b.addEventListener('click', function(){ window.markAttendance(b.dataset.markA, 'absent'); });
    });
    c.querySelectorAll('[data-del-att]').forEach(function(b){
      b.addEventListener('click', function(){ window.removeAttendance(b.dataset.delAtt); });
    });
  };

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
        '<span>🃏 ' + esc(d.name) + '</span><span style="font-size:.8rem;color:var(--muted)">' +
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
    window.customConfirm('مسح كل العناصر؟', function(){
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
        '<span style="font-size:.72rem;color:var(--muted2)">' + dateStr + '</span>' +
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
    window.customConfirm('مسح كل المواد؟', function(){
      window.gpaRows = [{name:'', hrs:3, grade:'A (90-100)'}];
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
    else if(need <= 85){ msg = '💪 تحتاج ' + need.toFixed(1) + '%'; color = 'var(--cyan)'; }
    else if(need <= 100){ msg = '⚠️ تحتاج ' + need.toFixed(1) + '% — شد حيلك!'; color = 'var(--amber)'; }
    else { msg = '😅 مستحيل — ' + need.toFixed(1) + '% (>100)'; color = 'var(--red)'; }
    res.innerHTML = '<div style="font-size:1.2rem;font-weight:800;color:' + color + '">' + msg + '</div>';
  };

  window.renderGradeCalc = function(){
    if(!window.space) return;
    if(!Array.isArray(window.space.grades)) window.space.grades = [];
    var c = document.getElementById('gradeTrackerList');
    if(!c) return;
    if(!window.space.grades.length){
      c.innerHTML = '<div class="empty"><div class="ic">📊</div><p>لا توجد مواد</p><p class="sub">اضغط "+ مادة" للبدء</p></div>';
      return;
    }
    var html = '';
    window.space.grades.forEach(function(g, idx){
      var total = 0, earned = 0;
      (g.items || []).forEach(function(it){
        total  += parseFloat(it.weight) || 0;
        earned += parseFloat(it.score)  || 0;
      });
      var pct = total > 0 ? (earned / total * 100) : 0;
      var color = pct >= 85 ? 'var(--green)' : pct >= 70 ? 'var(--cyan)' :
                  pct >= 50 ? 'var(--amber)' : 'var(--red)';
      var itemsHtml = '';
      (g.items || []).forEach(function(it, i){
        itemsHtml += '<div class="gt-item-row"><span style="flex:1">' + esc(it.name) + '</span>' +
          '<span style="color:var(--muted)">' + it.score + '/' + it.weight + '</span>' +
          '<button class="btn btn-sm btn-danger" data-gt-del="' + idx + '-' + i +
          '" style="padding:2px 6px;font-size:.7rem">✕</button></div>';
      });
      html += '<div class="card" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<div><div style="font-weight:700;font-size:.98rem">' + esc(g.name) + '</div>' +
        '<div style="font-size:.72rem;color:var(--muted)">مجموع: ' + total + '%</div></div>' +
        '<div style="text-align:center"><div style="font-size:1.4rem;font-weight:800;color:' + color + '">' +
        pct.toFixed(1) + '%</div>' +
        '<div style="font-size:.65rem;color:var(--muted)">حتى الآن</div></div></div>' +
        itemsHtml +
        '<div style="display:flex;gap:6px;margin-top:10px">' +
        '<button class="btn btn-sm" data-gt-add="' + idx + '">+ علامة</button>' +
        '<button class="btn btn-sm btn-danger" data-gt-remove="' + idx + '">🗑 المادة</button></div></div>';
    });
    c.innerHTML = html;

    c.querySelectorAll('[data-gt-add]').forEach(function(b){
      b.addEventListener('click', function(){ window.addGradeItem(parseInt(b.dataset.gtAdd,10)); });
    });
    c.querySelectorAll('[data-gt-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var parts = b.dataset.gtDel.split('-');
        window.space.grades[parseInt(parts[0],10)].items.splice(parseInt(parts[1],10), 1);
        saveSpace(); window.renderGradeCalc();
      });
    });
    c.querySelectorAll('[data-gt-remove]').forEach(function(b){
      b.addEventListener('click', function(){
        var idx = parseInt(b.dataset.gtRemove, 10);
        window.customConfirm('حذف "' + window.space.grades[idx].name + '"؟', function(){
          window.space.grades.splice(idx, 1);
          saveSpace(); window.renderGradeCalc();
        });
      });
    });
  };

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
  window.renderPlan = function(){
    var c = document.getElementById('semesters'); if(!c) return;
    var openSems = getS().get('openSems', [0]);
    if(!Array.isArray(openSems)) openSems = [0];
    var SEMESTERS = window.SEMESTERS || [];
    c.innerHTML = '';
    SEMESTERS.forEach(function(s, i){
      var el = document.createElement('div');
      el.className = 'card'; el.dataset.year = s.year; el.style.marginBottom = '12px';
      var total = s.courses.reduce(function(a,x){ return a + x.h; }, 0);
      var coursesHtml = '';
      s.courses.forEach(function(x){
        coursesHtml += '<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid var(--border);font-size:.86rem">' +
          '<div>' + esc(x.n) +
          (x.code && x.code !== '—' ? ' <span style="font-size:.7rem;color:var(--muted2);font-family:monospace">' + esc(x.code) + '</span>' : '') +
          (x.type === 'lab' ? ' <span style="font-size:.66rem;padding:1px 7px;border-radius:5px;background:rgba(52,211,153,.15);color:var(--green);margin-right:6px">مختبر</span>' : '') +
          '</div><span style="color:var(--cyan);font-weight:700;font-size:.8rem">' + x.h + ' س</span></div>';
      });
      el.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" class="sem-head">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<span style="background:var(--grad);color:#0b0f1a;padding:3px 10px;border-radius:20px;font-size:.7rem;font-weight:800">سنة ' + s.year + '</span>' +
            '<h3 style="margin:0">' + esc(s.name) + '</h3></div>' +
          '<div style="display:flex;gap:10px;align-items:center;font-size:.78rem;color:var(--muted)">' +
            '<span style="background:var(--bg2);padding:3px 10px;border-radius:8px;color:var(--cyan)">' + total + ' ساعة</span>' +
            '<span class="arrow">▼</span></div></div>' +
        '<div class="sem-body" style="max-height:0;overflow:hidden;transition:.4s">' + coursesHtml + '</div>';
      var head = el.querySelector('.sem-head');
      var body = el.querySelector('.sem-body');
      var arrow = el.querySelector('.arrow');
      if(openSems.indexOf(i) > -1){
        body.style.maxHeight = '2000px';
        arrow.style.transform = 'rotate(180deg)';
      }
      head.addEventListener('click', function(){
        var isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
        body.style.maxHeight = isOpen ? '0px' : '2000px';
        arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
        var arr = getS().get('openSems', []);
        if(!Array.isArray(arr)) arr = [];
        if(!isOpen){ if(arr.indexOf(i) === -1) arr.push(i); }
        else{ var p = arr.indexOf(i); if(p > -1) arr.splice(p, 1); }
        getS().set('openSems', arr);
      });
      c.appendChild(el);
    });
  };

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
    else list.innerHTML = '<div style="color:var(--muted);font-size:.82rem;margin-bottom:12px">عدد المواد: ' + count + '</div>' + html;
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