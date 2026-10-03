/* ============================================================
   🚀 app.js — Boot + Event Bindings (بدل inline script)
   ============================================================ */
(function(){
  'use strict';

  /* ============================================================
     TM + ts (Timer state)
     ============================================================ */
  window.TM = { focus: 25*60, short: 5*60, long: 15*60 };
  if(window.timerSettings){
    window.TM.focus = window.timerSettings.focus * 60;
    window.TM.short = window.timerSettings.short * 60;
    window.TM.long = window.timerSettings.long * 60;
  }
  window.ts = {
    mode: 'focus',
    remaining: window.TM.focus,
    total: window.TM.focus,
    running: false,
    interval: null,
    sessions: window.S.get('pomoSessions', 0) || 0,
    focusMin: window.S.get('pomoFocus', 0) || 0
  };

  function fmt(s){ return Math.floor(s/60).toString().padStart(2,'0') + ':' + (s%60).toString().padStart(2,'0'); }
  window.fmt = fmt;

  window.updateTimerUI = function(){
    var d = document.getElementById('timerDisplay'); if(d) d.textContent = fmt(window.ts.remaining);
    var pct = window.ts.total > 0 ? Math.max(0, Math.min(1, 1 - (window.ts.remaining / window.ts.total))) : 0;
    var c = 2 * Math.PI * 116;
    var pc = document.getElementById('progressCircle'); if(pc) pc.style.strokeDashoffset = c * pct;
    var b = document.getElementById('startBtn'); if(b) b.textContent = window.ts.running ? '⏸ إيقاف' : '▶ ابدأ';
    var sd = document.getElementById('sessionsDone'); if(sd) sd.textContent = window.ts.sessions;
    var fm = document.getElementById('focusMinutes'); if(fm) fm.textContent = window.ts.focusMin;
    var mt = document.getElementById('miniTime'); if(mt) mt.textContent = fmt(window.ts.remaining);
    var mp = document.getElementById('miniPct'); if(mp) mp.textContent = fmt(window.ts.remaining);
    var mr = document.getElementById('miniRing');
    if(mr){ var mc = 2 * Math.PI * 24; mr.style.strokeDashoffset = mc * pct; }
    var mb = document.getElementById('miniStartBtn'); if(mb) mb.textContent = window.ts.running ? '⏸' : '▶';
  };

  window.setMode = function(el, mode){
    document.querySelectorAll('.mode-switch .chip').forEach(function(c){ c.classList.remove('active'); });
    if(el) el.classList.add('active');
    window.ts.mode = mode;
    if(mode === 'stopwatch'){ window.ts.remaining = 0; window.ts.total = 1; window.timerMode = 'stopwatch'; }
    else { window.timerMode = 'focus'; window.ts.remaining = window.TM[mode]; window.ts.total = window.TM[mode]; }
    window.stopTimer();
    var tm = document.getElementById('timerMode');
    if(tm) tm.textContent = mode === 'focus' ? '🎯 وقت التركيز' : mode === 'short' ? '☕ راحة قصيرة' : mode === 'long' ? '🌴 راحة طويلة' : '⏱️ عد تصاعدي';
    window.updateTimerUI();
  };

  window.toggleTimer = function(){ window.ts.running ? window.stopTimer() : window.startTimer(); };
  window.startTimer = function(){
    if(window.ts.running) return;
    window.ts.running = true;
    window.ts.interval = setInterval(function(){
      if(window.timerMode === 'stopwatch'){ window.ts.remaining++; }
      else { window.ts.remaining--; if(window.ts.remaining <= 0) window.completeSession(); }
      window.updateTimerUI();
    }, 1000);
    window.updateTimerUI();
  };
  window.stopTimer = function(){
    window.ts.running = false;
    if(window.ts.interval){ clearInterval(window.ts.interval); window.ts.interval = null; }
    window.updateTimerUI();
  };
  window.resetTimer = function(){
    window.stopTimer();
    if(window.timerMode === 'stopwatch'){ window.ts.remaining = 0; }
    else { window.ts.remaining = window.TM[window.ts.mode]; window.ts.total = window.TM[window.ts.mode]; }
    window.updateTimerUI();
  };

  window.completeSession = function(){
    window.stopTimer();
    try{
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if(Ctx){
        var ctx = new Ctx(), o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.frequency.value = 800;
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        o.start(); o.stop(ctx.currentTime + 1.2);
      }
    }catch(e){}
    if(window.ts.mode === 'focus'){
      window.ts.sessions++;
      window.ts.focusMin += window.timerSettings.focus;
      window.S.set('pomoSessions', window.ts.sessions);
      window.S.set('pomoFocus', window.ts.focusMin);
      window.logStudySession(window.timerSettings.focus);
      window.toast('🎉 أكملت جلسة تركيز!', 'success', 4000);
      window.showNotif('🎉 أكملت جلسة تركيز!', 'خذ راحة ' + window.timerSettings.short + ' دقائق.', {tag:'pomo-done'});
    } else {
      window.toast('انتهت الراحة!', 'info', 4000);
    }
    window.ts.remaining = window.ts.total;
    window.updateTimerUI();
  };

  /* ============================================================
     NAVIGATION
     ============================================================ */
  var TAB_REDIRECTS = {
    'gpa': {tab:'gradecalc', subTab:'gpa'},
    'coursedescriptions': {tab:'plan', subTab:'desc'},
    'stats': {tab:'dashboard'},
    'extracurricular': {tab:'dashboard'}
  };

  window.switchSubTab = function(sectionId, subKey){
    var section = document.getElementById(sectionId); if(!section) return;
    var tabs = section.querySelectorAll('.section-tab');
    var subs = section.querySelectorAll('.subsection');
    tabs.forEach(function(t){
      if(sectionId === 'gradecalc') t.classList.toggle('active', t.dataset.gcTab === subKey);
      else if(sectionId === 'plan') t.classList.toggle('active', t.dataset.planTab === subKey);
    });
    subs.forEach(function(s){
      if(sectionId === 'gradecalc') s.classList.toggle('active', s.dataset.gcSub === subKey);
      else if(sectionId === 'plan') s.classList.toggle('active', s.dataset.planSub === subKey);
    });
    if(sectionId === 'plan' && subKey === 'desc') window.renderCourseDescriptions();
    if(sectionId === 'plan' && subKey === 'simulator') window.renderPlanSimulator();
  };

  window.initHistoryNavigation = function(){
    if(window.historyInitialized) return;
    window.historyInitialized = true;
    var currentTab = 'dashboard';
    try{ var v = localStorage.getItem('activeTab'); if(v) currentTab = JSON.parse(v); }catch(e){}
    try{ history.replaceState({tab: currentTab, appInit: true}, '', '#' + currentTab); }catch(e){}
    window.addEventListener('popstate', function(e){
      var tab = (e.state && e.state.tab) || (location.hash ? location.hash.slice(1) : 'dashboard');
      if(document.getElementById(tab)) window.switchTab(tab, false);
    });
  };

  window.switchTab = function(tab, pushHistory){
    if(pushHistory === undefined) pushHistory = true;
    var redirect = TAB_REDIRECTS[tab];
    if(redirect){
      if(redirect.subTab) setTimeout(function(){ window.switchSubTab(redirect.tab, redirect.subTab); }, 60);
      tab = redirect.tab;
    }
    var nav = document.querySelector('.nav-item[data-tab="' + tab + '"]');
    var sec = document.getElementById(tab);
    if(!nav || !sec) return;
    document.querySelectorAll('.nav-item').forEach(function(i){ i.classList.remove('active'); });
    document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); s.classList.remove('tab-play'); });
    nav.classList.add('active');
    sec.classList.add('active');
    try{ localStorage.setItem('activeTab', JSON.stringify(tab)); }catch(e){}
    if(pushHistory){ try{ history.pushState({tab:tab}, '', '#' + tab); }catch(e){} }
    else{ try{ history.replaceState({tab:tab}, '', '#' + tab); }catch(e){} }
    window.closeSidebar();
    window.closeSettingsMenu();
    window.scrollTo({top:0, behavior:'smooth'});
    var fns = {
      dashboard: window.renderDashboard, exams: window.renderExams,
      budget: window.renderBudget, courses: window.renderCourses, tasks: window.renderTasks,
      notes: window.renderNotes, flashcards: window.renderDecks,
      attendance: window.renderAttendance, timetable: window.renderTimetable,
      plan: window.renderPlan, hulinks: window.renderHuLinks, gradecalc: window.renderGradeCalc
    };
    if(fns[tab]){ try{ fns[tab](); }catch(e){ console.error('Render error:', tab, e); } }
    if(tab === 'gradecalc'){ try{ window.renderGpa(); }catch(e){} }
    requestAnimationFrame(function(){
      sec.classList.add('tab-play');
      setTimeout(function(){ sec.classList.remove('tab-play'); }, 900);
    });
  };

  window.toggleSidebar = function(){
    if(window.innerWidth > 900) return;
    var sb = document.getElementById('sidebar'), bd = document.getElementById('sidebarBackdrop');
    if(!sb || !bd) return;
    sb.classList.toggle('open');
    bd.classList.toggle('show', sb.classList.contains('open'));
  };
  window.closeSidebar = function(){
    var sb = document.getElementById('sidebar'), bd = document.getElementById('sidebarBackdrop');
    if(sb) sb.classList.remove('open');
    if(bd) bd.classList.remove('show');
  };

  /* ============================================================
     SHARED HELPERS
     ============================================================ */
  window.scheduleBackup = function(){
    clearTimeout(window.backupTimer);
    var badge = document.getElementById('backupBadge');
    var text = document.getElementById('backupText');
    if(badge && text){
      text.textContent = window.serverOnline ? '☁️ حُفظ سحابيًا' : '💾 حُفظ محليًا';
      badge.classList.add('show');
    }
    window.backupTimer = setTimeout(function(){ if(badge) badge.classList.remove('show'); }, 1500);
    window.queueServerSave();
  };

  window.queueServerSave = function(){
    if(window.bootSyncing) return;
    clearTimeout(window.serverSaveTimer);
    window.serverSaveTimer = setTimeout(window.doServerSave, 800);
  };

  window.doServerSave = async function(){
    if(!window.SB || window.cloudSyncBlocked) return;
    if(window.serverSaveInFlight){ window.queueServerSave(); return; }
    try{
      window.serverSaveInFlight = true;
      var ok = await window.SB.save(window.gatherSnapshot());
      if(ok){ window.serverOnline = true; window.setServerStatus('ok'); }
      else { window.serverOnline = false; window.setServerStatus('off'); }
    }catch(e){ window.serverOnline = false; window.setServerStatus('off'); }
    finally { window.serverSaveInFlight = false; }
  };

  window.gatherSnapshot = function(){
    return {
      version: 7,
      savedAt: new Date().toISOString(),
      space: window.space, notes: window.notes, gpaRows: window.gpaRows,
      timerSettings: window.timerSettings,
      pomoSessions: window.S.get('pomoSessions', 0),
      pomoFocus: window.S.get('pomoFocus', 0),
      studyLog: window.S.get('studyLog', {}),
      theme: window.S.get('theme', 'dark'),
      activeTab: window.S.get('activeTab', 'dashboard'),
      welcomeDone: window.S.get('welcomeDone', false),
      openSems: window.S.get('openSems', [0])
    };
  };

  window.setServerStatus = function(state){
    var el = document.getElementById('serverStatus'); if(!el) return;
    if(state === 'ok'){ el.textContent = '☁️'; el.title = '✅ متصل'; el.style.color = 'var(--green)'; el.onclick = null; }
    else { el.textContent = '💾'; el.title = '💾 حفظ محلي'; el.style.color = 'var(--muted)'; el.onclick = function(){ if(window.SB) window.SB.showSyncPanel(); }; }
  };

  window.applyServerData = function(data){
    if(!data || typeof data !== 'object') return;
    try{
      if(data.space){
        var dSpace = window.defaultSpace || {};
        var clean = Object.assign({}, dSpace, data.space);
        ['courses','tasks','exams','decks','budget','grades','completedCourses'].forEach(function(k){
          if(!Array.isArray(clean[k])) clean[k] = [];
        });
        ['timetable','attendance','profile'].forEach(function(k){
          if(!clean[k] || typeof clean[k] !== 'object' || Array.isArray(clean[k])) clean[k] = dSpace[k] || {};
        });
        window.space = clean;
        window.S.set('space', window.space);
      }
      if(Array.isArray(data.notes)){ window.notes = data.notes; window.S.set('notes', window.notes); }
      if(Array.isArray(data.gpaRows) && data.gpaRows.length){ window.gpaRows = data.gpaRows; window.S.set('gpaRows', window.gpaRows); }
      if(data.timerSettings && typeof data.timerSettings === 'object'){
        window.timerSettings = {
          focus: Math.max(1, Math.min(120, parseInt(data.timerSettings.focus) || 25)),
          short: Math.max(1, Math.min(60, parseInt(data.timerSettings.short) || 5)),
          long:  Math.max(1, Math.min(90, parseInt(data.timerSettings.long)  || 15))
        };
        window.S.set('timerSettings', window.timerSettings);
      }
      if(typeof data.pomoSessions === 'number') window.S.set('pomoSessions', data.pomoSessions);
      if(typeof data.pomoFocus === 'number') window.S.set('pomoFocus', data.pomoFocus);
      if(data.studyLog && typeof data.studyLog === 'object') window.S.set('studyLog', data.studyLog);
      if(typeof data.theme === 'string') window.S.set('theme', data.theme);
      if(typeof data.activeTab === 'string') window.S.set('activeTab', data.activeTab);
      if(typeof data.welcomeDone === 'boolean') window.S.set('welcomeDone', data.welcomeDone);
      if(Array.isArray(data.openSems)) window.S.set('openSems', data.openSems);
    }catch(e){ console.warn('applyServerData error:', e); }
  };

  window.loadAllData = function(){
    try{
      var raw = window.S.get('space', null);
      if(raw && typeof raw === 'object' && !Array.isArray(raw)) window.space = Object.assign({}, window.defaultSpace, raw);
      else { window.space = Object.assign({}, window.defaultSpace); if(raw !== null) window.dataCorrupted = true; }
    }catch(e){ window.dataCorrupted = true; window.space = Object.assign({}, window.defaultSpace); }
    if(!Array.isArray(window.space.grades)) window.space.grades = [];
    try{ window.notes = window.S.get('notes', []); if(!Array.isArray(window.notes)){ window.notes = []; window.dataCorrupted = true; } }
    catch(e){ window.notes = []; }
    try{
      window.gpaRows = window.S.get('gpaRows', [{name:'', hrs:3, grade:'A (90-100)'}]);
      if(!Array.isArray(window.gpaRows) || !window.gpaRows.length) window.gpaRows = [{name:'', hrs:3, grade:'A (90-100)'}];
    }catch(e){ window.gpaRows = [{name:'', hrs:3, grade:'A (90-100)'}]; }
    try{
      var tsData = window.S.get('timerSettings', {});
      window.timerSettings = {focus:(tsData && tsData.focus)||25, short:(tsData && tsData.short)||5, long:(tsData && tsData.long)||15};
    }catch(e){ window.timerSettings = {focus:25, short:5, long:15}; }
  };

  /* ============================================================
     WELCOME
     ============================================================ */
  window.showWelcome = function(simple){
    var overlay = document.getElementById('welcomeOverlay'); if(!overlay) return;
    if(simple){
      var title = document.getElementById('welcomeTitle');
      var sub = document.getElementById('welcomeSub');
      if(title) title.textContent = 'مرحبًا بك مجددًا';
      if(sub) sub.textContent = window.dataCorrupted ? 'حدث خطأ — ابدأ من جديد' : 'سنتعرف عليك سريعًا';
    }
    overlay.classList.add('show');
    overlay.classList.remove('hide');
    var btn = document.getElementById('welcomeBtn');
    var input = document.getElementById('welcomeName');
    setTimeout(function(){ if(input) input.focus(); }, 200);
    var handle = function(){
      var name = (input && input.value || '').trim();
      if(!name){ window.toast('اكتب اسمك 😊', 'warn', 2500); if(input) input.focus(); return; }
      window.space.profile = window.space.profile || {};
      window.space.profile.name = name;
      window.saveSpace();
      window.S.set('welcomeDone', true);
      overlay.classList.add('hide');
      setTimeout(function(){ overlay.classList.remove('show'); overlay.style.display = 'none'; }, 500);
      setTimeout(function(){ window.toast('أهلاً ' + name + '! 🚀', 'success', 3500); }, 400);
      try{ window.renderDashboard(); }catch(e){}
    };
    if(btn) btn.onclick = handle;
    if(input) input.onkeydown = function(e){ if(e.key === 'Enter') handle(); };
  };

  /* ============================================================
     SEARCH
     ============================================================ */
  window.initSearch = function(){
    var inp = document.getElementById('searchInput');
    var res = document.getElementById('searchResults');
    if(!inp || !res) return;
    function buildIndex(){
      var idx = [];
      (window.SEMESTERS || []).forEach(function(s){
        s.courses.forEach(function(c){ idx.push({name: c.n, type:'مادة', tab:'plan'}); });
      });
      (window.space.courses || []).forEach(function(c){ idx.push({name: c.name, type:'مادة', tab:'courses'}); });
      (window.space.tasks || []).forEach(function(t){ idx.push({name: t.title, type:'مهمة', tab:'tasks'}); });
      var CD = window.COURSES_DESC || {};
      Object.keys(CD).forEach(function(k){ idx.push({name: k, type:'وصف', tab:'coursedescriptions'}); });
      return idx;
    }
    inp.addEventListener('input', function(){
      var q = inp.value.trim().toLowerCase();
      if(!q){ res.classList.remove('show'); return; }
      var idx = buildIndex();
      var m = idx.filter(function(x){ return x.name.toLowerCase().indexOf(q) > -1; }).slice(0,10);
      if(!m.length) res.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:.85rem">لا نتائج</div>';
      else {
        var html = '';
        m.forEach(function(x, i){
          html += '<div class="search-item" data-si="' + i + '"><span>' + window.esc(x.name) + '</span><span class="s-tag">' + x.type + '</span></div>';
        });
        res.innerHTML = html;
        res.querySelectorAll('[data-si]').forEach(function(el){
          el.addEventListener('click', function(){
            var x = m[parseInt(el.dataset.si)];
            res.classList.remove('show');
            inp.value = '';
            window.switchTab(x.tab);
          });
        });
      }
      res.classList.add('show');
    });
    document.addEventListener('click', function(e){ if(!e.target.closest('.search-wrap')) res.classList.remove('show'); });
  };

  /* ============================================================
     BACKUP / RESTORE
     ============================================================ */
  window.downloadBackup = function(silent){
    try{
      var snapshot = window.gatherSnapshot();
      var blob = new Blob([JSON.stringify(snapshot, null, 2)], {type:'application/json'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'study-space-' + window.today() + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
      if(!silent) window.toast('💾 تم التنزيل', 'success', 2500);
    }catch(e){ if(!silent) window.toast('فشل', 'warn', 2000); }
  };

  window.restoreFromFile = function(){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = function(e){
      var file = e.target.files[0]; if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        try{
          var data = JSON.parse(ev.target.result);
          if(!data || typeof data !== 'object'){ window.toast('ملف غير صالح', 'warn'); return; }
          window.applyServerData(data);
          window.saveSpace();
          window.S.set('notes', window.notes);
          window.S.set('gpaRows', window.gpaRows);
          window.S.set('timerSettings', window.timerSettings);
          window.toast('✅ تمت الاستعادة', 'success', 2500);
          setTimeout(function(){ location.reload(); }, 800);
        }catch(err){ window.toast('ملف تالف', 'warn', 3000); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* ============================================================
     REMINDERS
     ============================================================ */
  window.checkReminders = function(){
    var today = window.today();
    var tasks = window.space.tasks || [];
    var dueToday = tasks.filter(function(t){ return !t.done && t.due === today; });
    var overdue = tasks.filter(function(t){ return !t.done && t.due && t.due < today; });
    if(overdue.length > 0) setTimeout(function(){ window.toast('⚠️ ' + overdue.length + ' مهمة متأخرة!', 'warn', 5000); }, 1500);
    if(dueToday.length > 0) setTimeout(function(){ window.toast('📌 ' + dueToday.length + ' مهمة اليوم!', 'info', 5000); }, 2500);
  };

  window.checkSmartReminders = function(){
    if(!window.space || !window.space.tasks) return;
    var today = window.today();
    var now = new Date();
    var hour = now.getHours();
    if(hour < 8 || hour > 23) return;
    var firedKey = 'ss_smart_reminders_v4_' + today;
    var fired = window.S.get(firedKey, {}) || {};
    var dueToday = window.space.tasks.filter(function(t){ return !t.done && t.due === today; });
    var overdue = window.space.tasks.filter(function(t){ return !t.done && t.due && t.due < today; });
    var upcomingExams = (window.space.exams || []).filter(function(e){
      if(!e.date) return false;
      var days = Math.ceil((new Date(e.date) - now) / 86400000);
      return days >= 0 && days <= 3;
    });
    var reminders = [];
    if(dueToday.length) reminders.push({tag:'due-today', t:'📌 ' + dueToday.length + ' مهمة اليوم!', b: dueToday.slice(0,3).map(function(x){return x.title;}).join(' · ')});
    if(overdue.length) reminders.push({tag:'overdue', t:'⚠️ ' + overdue.length + ' مهمة متأخرة!', b: overdue.slice(0,3).map(function(x){return x.title;}).join(' · ')});
    upcomingExams.forEach(function(e){
      var days = Math.ceil((new Date(e.date) - now) / 86400000);
      var when = days === 0 ? 'اليوم!' : days === 1 ? 'غدًا!' : 'بعد ' + days + ' أيام';
      var uid = e.id || (e.date + '_' + String(e.name || '').replace(/\s+/g,'_'));
      reminders.push({tag: 'exam-' + uid, t: '⏳ امتحان ' + when, b: e.name + (e.time ? ' — ' + e.time : '')});
    });
    var anyNew = false;
    reminders.forEach(function(r, i){
      if(fired[r.tag]) return;
      fired[r.tag] = true; anyNew = true;
      setTimeout(function(){ window.toast(r.t, 'warn', 5000); }, 1500 + i * 2500);
      if(typeof window.showNotif === 'function') setTimeout(function(){ window.showNotif(r.t, r.b, {tag: 'ss-' + r.tag + '-' + today}); }, 1500 + i * 2500);
    });
    if(anyNew) window.S.set(firedKey, fired);
  };

  /* ============================================================
     FAB + MENU
     ============================================================ */
  window.toggleFabMenu = function(){
    var m = document.getElementById('fabMenu');
    var f = document.getElementById('fabMain');
    var ai = document.getElementById('aiFab');
    if(!m || !f) return;
    var isOpen = m.classList.contains('show');
    if(isOpen){ m.classList.remove('show'); f.classList.remove('active'); if(ai) ai.classList.remove('hidden'); }
    else {
      var ap = document.getElementById('aiPanel'); if(ap) ap.classList.remove('show');
      m.classList.add('show'); f.classList.add('active');
      if(ai) ai.classList.add('hidden');
    }
  };

  /* ============================================================
     BIND ALL EVENTS
     ============================================================ */
  window.bindAllEvents = function(){
    if(window._bindAllRan) return;
    window._bindAllRan = true;

    document.querySelectorAll('.nav-item').forEach(function(item){
      item.addEventListener('click', function(){ window.switchTab(item.dataset.tab); });
    });
    document.querySelectorAll('[data-goto]').forEach(function(el){
      el.addEventListener('click', function(){ window.switchTab(el.dataset.goto); });
    });
    var mt = document.getElementById('menuToggle'); if(mt) mt.addEventListener('click', window.toggleSidebar);
    var sbd = document.getElementById('sidebarBackdrop'); if(sbd) sbd.addEventListener('click', window.closeSidebar);
    var tb = document.getElementById('themeBtn');
    if(tb) tb.addEventListener('click', function(e){ e.stopPropagation(); window.closeSettingsMenu(); window.toggleThemePanel(); });
    var sb = document.getElementById('settingsBtn');
    if(sb) sb.addEventListener('click', function(e){ e.stopPropagation(); window.toggleSettingsMenu(); });
    document.addEventListener('click', function(e){
      var p = document.getElementById('themePanel');
      if(p && p.classList.contains('show') && !e.target.closest('#themePanel') && !e.target.closest('#themeBtn')) p.classList.remove('show');
      if(!e.target.closest('.settings-wrap')) window.closeSettingsMenu();
    });
    var bb = document.getElementById('backupBtn'); if(bb) bb.addEventListener('click', function(){ window.closeSettingsMenu(); window.downloadBackup(false); });
    var rb = document.getElementById('restoreBtn'); if(rb) rb.addEventListener('click', function(){ window.closeSettingsMenu(); window.restoreFromFile(); });
    var pdfBtn = document.getElementById('pdfBtn'); if(pdfBtn) pdfBtn.addEventListener('click', function(){ window.closeSettingsMenu(); window.exportPDF(); });

    document.querySelectorAll('[data-gc-tab]').forEach(function(btn){
      btn.addEventListener('click', function(){ window.switchSubTab('gradecalc', btn.dataset.gcTab); });
    });
    document.querySelectorAll('[data-plan-tab]').forEach(function(btn){
      btn.addEventListener('click', function(){ window.switchSubTab('plan', btn.dataset.planTab); });
    });

    function bind(id, fn){ var el = document.getElementById(id); if(el) el.addEventListener('click', fn); }
    bind('btnAddClass', function(){ if(window.addClassSlot) window.addClassSlot(); });
    bind('btnClearTt', window.clearTimetable);
    bind('btnLoadExample', window.loadExampleTimetable);
    bind('btnAutoFill', window.autoFillTimetable);
    bind('btnPrintTt', window.printTimetable);
    bind('btnAddCourse', window.addMyCourse);
    bind('btnImportPlan', window.importFromPlan);
    bind('btnAddTask', window.addTask);
    bind('btnAddExam', window.addExam);
    bind('btnAddAtt', window.addAttendanceCourse);
    bind('btnTimerSettings', window.openTimerSettings);
    bind('btnAddDeck', window.addDeck);
    bind('btnAddIncome', function(){ window.addBudgetItem('income'); });
    bind('btnAddExpense', function(){ window.addBudgetItem('expense'); });
    bind('btnClearBudget', window.clearBudget);
    bind('btnAddNote', window.addNote);
    bind('btnAddGpa', window.addCourse);
    bind('btnLoadGpaSample', window.loadSampleGpa);
    bind('btnClearGpa', window.clearGpa);
    bind('btnCalcWhatIf', window.calcWhatIf);
    bind('ncCalc', window.calcNeed);
    bind('btnAddGrade', window.addGradeCourse);
    bind('startBtn', window.toggleTimer);
    bind('resetBtn', window.resetTimer);
    bind('miniStartBtn', window.toggleTimer);
    bind('miniResetBtn', window.resetTimer);

    document.querySelectorAll('.mode-switch .chip').forEach(function(chip){
      chip.addEventListener('click', function(){ window.setMode(chip, chip.dataset.mode); });
    });
    document.querySelectorAll('[data-tf]').forEach(function(chip){
      chip.addEventListener('click', function(){ window.filterTasks(chip.dataset.tf); });
    });
    document.querySelectorAll('[data-bt]').forEach(function(tab){
      tab.addEventListener('click', function(){ window.filterBudget(tab.dataset.bt); });
    });
    document.querySelectorAll('.chip[data-filter]').forEach(function(chip){
      chip.addEventListener('click', function(){ window.filterSem(chip, chip.dataset.filter); });
    });
    document.querySelectorAll('[data-cd-year]').forEach(function(chip){
      chip.addEventListener('click', function(){
        document.querySelectorAll('[data-cd-year]').forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
        window.currentCdYear = chip.dataset.cdYear;
        window.renderCourseDescriptions();
      });
    });
    var cdSearch = document.getElementById('cdSearch');
    if(cdSearch) cdSearch.addEventListener('input', window.renderCourseDescriptions);

    var fm = document.getElementById('fabMain');
    if(fm) fm.addEventListener('click', window.toggleFabMenu);
    document.querySelectorAll('.fab-action').forEach(function(b){
      b.addEventListener('click', function(){
        var type = b.dataset.fab;
        window.toggleFabMenu();
        if(type === 'quick') setTimeout(window.openQuickCapture, 200);
        else if(type === 'task'){ window.switchTab('tasks'); setTimeout(window.addTask, 250); }
        else if(type === 'course'){ window.switchTab('courses'); setTimeout(window.addMyCourse, 250); }
        else if(type === 'exam'){ window.switchTab('exams'); setTimeout(window.addExam, 250); }
        else if(type === 'note'){ window.switchTab('notes'); setTimeout(window.addNote, 250); }
        else if(type === 'budget'){ window.switchTab('budget'); setTimeout(function(){ window.addBudgetItem('expense'); }, 250); }
      });
    });
  };

  /* ============================================================
     TIMETABLE HELPERS (simplified)
     ============================================================ */
  window.clearTimetable = function(){
    if(!window.space){ window.toast('البيانات غير محمّلة', 'warn'); return; }
    if(!Object.keys(window.space.timetable || {}).length){ window.toast('الجدول فاضي أصلاً', 'info'); return; }
    var doClear = function(){
      window.space.timetable = {};
      window.saveSpace();
      if(window.renderTimetable) window.renderTimetable();
      if(window.renderDashboard) window.renderDashboard();
      window.toast('🗑 مُسح الجدول', 'success');
    };
    if(window.customConfirm) window.customConfirm('مسح كل الجدول؟', doClear);
    else if(confirm('مسح كل الجدول؟')) doClear();
  };

  window.loadExampleTimetable = function(){
    if(!window.space) return;
    window.space.timetable = {
      'Sun-08:00': { name: 'تفاضل وتكامل (1)', room: '101', instructor: '' },
      'Sun-09:00': { name: 'فيزياء عامة (1)', room: '102', instructor: '' },
      'Mon-08:00': { name: 'برمجة الحاسوب', room: 'Lab 1', instructor: '' },
      'Tue-09:00': { name: 'مهارات التواصل باللغة العربية', room: '105', instructor: '' },
      'Wed-11:00': { name: 'اساسيات الكيمياء العامة', room: 'Lab 3', instructor: '' },
      'Thu-08:00': { name: 'مهارات التواصل باللغة الانجليزية', room: '106', instructor: '' }
    };
    window.saveSpace();
    if(window.renderTimetable) window.renderTimetable();
    if(window.renderDashboard) window.renderDashboard();
    window.toast('✅ تم تحميل جدول تجريبي', 'success', 2500);
  };

  window.autoFillTimetable = function(){
    if(!window.space || !(window.space.courses || []).length){ window.toast('أضف موادي أولاً', 'warn', 2500); return; }
    if(window.openSmartTimetable) window.openSmartTimetable();
    else window.toast('استخدم "✨ إضافة دفعة"', 'info', 3500);
  };

  window.printTimetable = function(){
    var tt = document.getElementById('timetableTable');
    if(!tt){ window.toast('الجدول غير موجود', 'warn'); return; }
    var w = window.open('', '_blank', 'width=1000,height=700');
    if(!w){ window.toast('امنع المتصفح من حجب النوافذ', 'warn', 3000); return; }
    w.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>الجدول</title><style>body{font-family:Tahoma;padding:20px;direction:rtl}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:8px;text-align:center}th{background:#e8e8e8}</style></head><body><h2>📅 الجدول الأسبوعي</h2>' + tt.outerHTML + '</body></html>');
    w.document.close();
    setTimeout(function(){ w.focus(); w.print(); }, 400);
  };

  window.addClassSlot = function(key){
    if(key && window.openSmartTimetableAtKey) window.openSmartTimetableAtKey(key);
    else if(window.openSmartTimetable) window.openSmartTimetable();
  };

  window.editClassSlot = function(key){
    if(!window.space || !window.space.timetable) return;
    var cls = window.space.timetable[key];
    if(!cls) return;
    if(!window.showModal){ window.toast('لا يمكن فتح المحرر', 'warn'); return; }
    window.showModal('تعديل محاضرة', [
      { key: 'name', label: 'اسم المادة' },
      { key: 'room', label: 'القاعة' },
      { key: 'instructor', label: 'الدكتور' }
    ], { name: cls.name || '', room: cls.room || '', instructor: cls.instructor || '' }, function(data){
      if(!data.name){ window.toast('أدخل اسم المادة', 'warn'); return false; }
      window.space.timetable[key] = { name: data.name, room: data.room || '', instructor: data.instructor || '' };
      window.saveSpace();
      if(window.renderTimetable) window.renderTimetable();
      if(window.renderDashboard) window.renderDashboard();
      window.toast('✅ تم التعديل', 'success');
      return true;
    }, function(){
      window.customConfirm('حذف هذه المحاضرة؟', function(){
        delete window.space.timetable[key];
        window.saveSpace();
        if(window.renderTimetable) window.renderTimetable();
        if(window.renderDashboard) window.renderDashboard();
      });
    });
  };

  window.renderTimetable = function(){
    var t = document.getElementById('timetableTable'); if(!t) return;
    var now = new Date();
    var todayIdx = now.getDay();
    var nowTotalMin = now.getHours() * 60 + now.getMinutes();
    var weekAr = window.WEEK_DAYS_AR || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
    var weekEn = window.WEEK_DAYS_EN || ['Sun','Mon','Tue','Wed','Thu'];

    var usedTimes = {};
    Object.keys(window.space.timetable || {}).forEach(function(k){
      var parts = k.split('-'); if(parts[1]) usedTimes[parts[1]] = true;
    });
    var times = Object.keys(usedTimes).sort();
    var isEmpty = !times.length;
    if(isEmpty) times = ['08:00','09:00','10:00','11:00','12:00'];

    var rows = [];
    times.forEach(function(time, i){
      if(i > 0){
        var prev = times[i-1];
        var prevMin = parseInt(prev.split(':')[0],10)*60 + parseInt(prev.split(':')[1],10);
        var curMin = parseInt(time.split(':')[0],10)*60 + parseInt(time.split(':')[1],10);
        if(curMin - prevMin > 60) rows.push({type:'gap', from:prev, to:time, minutes:curMin-prevMin});
      }
      rows.push({type:'time', time:time});
    });

    var html = '<thead><tr><th></th>';
    weekAr.forEach(function(d, i){
      html += '<th' + (i === todayIdx ? ' style="background:var(--grad);color:#0b0f1a"' : '') + '>' + d + '</th>';
    });
    html += '</tr></thead><tbody>';

    rows.forEach(function(item){
      if(item.type === 'gap'){
        html += '<tr><td colspan="' + (weekEn.length + 1) + '" style="background:transparent;text-align:center;font-size:.72rem;color:var(--muted2);padding:6px">فجوة ' + Math.round(item.minutes/60*10)/10 + ' ساعة (' + item.from + ' → ' + item.to + ')</td></tr>';
        return;
      }
      var time = item.time;
      var rowMin = parseInt(time.split(':')[0],10)*60 + parseInt(time.split(':')[1],10);
      var isNowRow = (todayIdx < weekEn.length) && (Math.abs(rowMin - nowTotalMin) <= 15);
      html += '<tr>';
      html += '<td class="time-col"' + (isNowRow ? ' style="color:var(--red)"' : '') + '>' + time + '</td>';
      weekEn.forEach(function(day, dayI){
        var key = day + '-' + time;
        var cls = window.space.timetable[key];
        var tdStyle = dayI === todayIdx ? 'background:linear-gradient(180deg,rgba(34,211,238,.06),transparent)' : '';
        if(cls){
          html += '<td style="' + tdStyle + '"><div class="class-block" data-edit="' + key + '">' +
            '<span class="name">' + window.esc(cls.name) + '</span>' +
            (cls.room ? '<span class="room">📍 ' + window.esc(cls.room) + '</span>' : '') +
            '</div></td>';
        } else {
          html += '<td style="' + tdStyle + '"><div class="cell-empty" data-add="' + key + '">+</div></td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody>';
    t.innerHTML = html;

    t.querySelectorAll('[data-edit]').forEach(function(b){ b.addEventListener('click', function(){ window.editClassSlot(b.dataset.edit); }); });
    t.querySelectorAll('[data-add]').forEach(function(b){ b.addEventListener('click', function(){ window.addClassSlot(b.dataset.add); }); });
  };

  window.openTimerSettings = function(){
    window.showModal('⚙️ تخصيص المؤقت', [
      {key:'focus', label:'مدة التركيز (دقائق)', type:'number'},
      {key:'short', label:'مدة الراحة (دقائق)', type:'number'},
      {key:'long', label:'مدة الراحة الطويلة (دقائق)', type:'number'}
    ], window.timerSettings, function(data){
      window.timerSettings = {
        focus: Math.max(1, Math.min(120, parseInt(data.focus) || 25)),
        short: Math.max(1, Math.min(60, parseInt(data.short) || 5)),
        long: Math.max(1, Math.min(90, parseInt(data.long) || 15))
      };
      window.S.set('timerSettings', window.timerSettings);
      window.TM.focus = window.timerSettings.focus * 60;
      window.TM.short = window.timerSettings.short * 60;
      window.TM.long = window.timerSettings.long * 60;
      window.stopTimer();
      window.ts.remaining = window.TM[window.ts.mode];
      window.ts.total = window.TM[window.ts.mode];
      window.updateTimerUI();
      window.toast('تم التحديث', 'success', 1500);
      return true;
    });
  };

  window.logStudySession = function(minutes){
    var today = window.today();
    var log = window.S.get('studyLog', {});
    if(!log || typeof log !== 'object') log = {};
    log[today] = (log[today] || 0) + minutes;
    window.S.set('studyLog', log);
  };

  /* ============================================================
     KEYBOARD
     ============================================================ */
  document.addEventListener('keydown', function(e){
    var tag = (document.activeElement || {}).tagName || '';
    var isTyping = ['INPUT','TEXTAREA','SELECT'].indexOf(tag) > -1;
    if(isTyping && e.key !== 'Escape') return;

    if(e.key === '/' && !isTyping){ e.preventDefault(); var si = document.getElementById('searchInput'); if(si) si.focus(); return; }
    if(e.altKey && e.key.toLowerCase() === 't'){ e.preventDefault(); window.switchTab('tasks'); setTimeout(window.addTask, 200); return; }
    if(e.altKey && e.key.toLowerCase() === 'n'){ e.preventDefault(); window.switchTab('notes'); setTimeout(window.addNote, 200); return; }
    if(e.altKey && e.key.toLowerCase() === 'p'){ e.preventDefault(); window.switchTab('timer'); return; }
    if(e.altKey && e.key.toLowerCase() === 'q'){ e.preventDefault(); window.openQuickCapture(); return; }
    if(e.key === 'Escape'){
      var sr = document.getElementById('searchResults'); if(sr) sr.classList.remove('show');
      window.closeSidebar();
      window.closeSettingsMenu();
      document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
      var ap = document.getElementById('aiPanel'); if(ap) ap.classList.remove('show');
      var fm = document.getElementById('fabMenu'); if(fm) fm.classList.remove('show');
      var fmm = document.getElementById('fabMain'); if(fmm) fmm.classList.remove('active');
      var ai2 = document.getElementById('aiFab'); if(ai2) ai2.classList.remove('hidden');
      var tp = document.getElementById('themePanel'); if(tp) tp.classList.remove('show');
    }
  });

  /* Smooth interactions */
  document.addEventListener('mousemove', function(e){
    var t = e.target.closest('.btn, .nav-item');
    if(!t) return;
    var rect = t.getBoundingClientRect();
    t.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
    t.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
  }, { passive: true });

  /* ============================================================
     BOOT
     ============================================================ */
  function safeRun(label, fn){
    try{ fn(); }
    catch(err){ console.error('❌ Failed: ' + label, err); window.debugLog('❌ ' + label + ': ' + (err.message || err)); }
  }

  window.boot = async function(){
    console.log('🚀 Booting...');
    safeRun('Load local data', window.loadAllData);

    var serverData = null;
    if(window.SB){
      try{ serverData = await window.SB.load(); }catch(e){}
    }

    var pushLocalAfterBoot = false;
    if(serverData && serverData.data){
      var serverTs = Date.parse(serverData.updated_at) || 0;
      var localTs = parseInt(window.S.get('ss_space_ts', 0), 10) || 0;
      if(localTs && localTs > serverTs + 2000){
        /* النسخة المحلية أحدث (تعديلات أوفلاين) — لا نكتب فوقها بالقديمة */
        console.log('💾 Local is newer than cloud — keeping local, will push');
        window.serverOnline = true;
        pushLocalAfterBoot = true;
      } else {
        console.log('☁️ Loaded from Supabase');
        window.serverOnline = true;
        safeRun('Apply server data', function(){ window.applyServerData(serverData.data); });
        if(serverTs) window.S.set('ss_space_ts', serverTs);
      }
    } else {
      console.log('💾 Using localStorage');
      window.serverOnline = false;
      /* فشل تحميل (مش "ما في صف"): امنع الرفع حتى لا نكتب فوق السحابة ببيانات محلية قد تكون فاضية */
      if(window.SB && window.SB.lastLoadStatus === 'error') window.cloudSyncBlocked = true;
    }

    safeRun('Sync timer', function(){
      window.TM.focus = window.timerSettings.focus * 60;
      window.TM.short = window.timerSettings.short * 60;
      window.TM.long = window.timerSettings.long * 60;
      window.ts.remaining = window.TM[window.ts.mode];
      window.ts.total = window.TM[window.ts.mode];
    });

    safeRun('Theme panel', function(){
      window.buildThemePanel();
      window.applyTheme(window.S.get('theme', 'dark'));
    });

    safeRun('Grade dropdown', function(){
      var sel = document.getElementById('whatIfGrade');
      if(sel){
        var opts = '';
        Object.keys(window.GRADES).forEach(function(g){ opts += '<option>' + g + '</option>'; });
        sel.innerHTML = opts;
      }
    });

    safeRun('History', window.initHistoryNavigation);
    safeRun('Bind events', window.bindAllEvents);
    safeRun('Notif button', window.updateNotifBtn);

    safeRun('Plan', window.renderPlan);
    safeRun('Timetable', window.renderTimetable);
    safeRun('Courses', window.renderCourses);
    safeRun('Tasks', window.renderTasks);
    safeRun('Exams', window.renderExams);
    safeRun('Attendance', window.renderAttendance);
    safeRun('Decks', window.renderDecks);
    safeRun('Notes', window.renderNotes);
    safeRun('GPA', window.renderGpa);
    safeRun('Budget', window.renderBudget);
    safeRun('HU Links', window.renderHuLinks);
    safeRun('Search', window.initSearch);
    safeRun('Quote', window.renderDailyQuote);
    safeRun('Dashboard', window.renderDashboard);
    safeRun('GradeCalc', window.renderGradeCalc);
    safeRun('CourseDesc', window.renderCourseDescriptions);
    safeRun('AI bindings', function(){ if(window.bindAIEvents) window.bindAIEvents(); });

    safeRun('Initial tab', function(){
      var tab = location.hash.slice(1) || window.S.get('activeTab', 'dashboard');
      if(document.getElementById(tab)) window.switchTab(tab, false);
      else window.switchTab('dashboard', false);
    });

    safeRun('Welcome', function(){
      var welcomeDone = window.S.get('welcomeDone', false);
      var hasName = window.space.profile && window.space.profile.name;
      if(window.dataCorrupted){ window.showWelcome(true); }
      else if(!welcomeDone || !hasName){ window.showWelcome(false); }
      else {
        setTimeout(function(){
          try{
            var hour = new Date().getHours();
            var greet = hour < 12 ? 'صباح الخير' : 'مساء الخير';
            window.toast(greet + ' ' + window.space.profile.name.split(' ')[0] + '! ☁️', 'success', 3000);
            window.checkReminders();
            setTimeout(window.checkSmartReminders, 4000);
          }catch(err){}
        }, 800);
      }
    });

    safeRun('Initial sync', function(){
      window.bootSyncing = false;
      window.setServerStatus(window.serverOnline ? 'ok' : 'off');
      if(pushLocalAfterBoot || (!serverData && window.SB && window.SB.lastLoadStatus === 'empty')) window.doServerSave();
    });

    setInterval(window.checkSmartReminders, 30 * 60 * 1000);

    if(navigator.serviceWorker){
      navigator.serviceWorker.addEventListener('message', function(e){
        if(e.data && e.data.type === 'navigate' && e.data.tab) window.switchTab(e.data.tab);
      });
    }

    safeRun('Validate DB', function(){
      if(window.validateCoursesDB){
        var issues = window.validateCoursesDB();
        if(issues.length) console.warn('⚠️ DB issues:', issues);
      }
    });
    console.log('✅ Boot complete');
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.boot);
  else window.boot();

  console.log('🚀 app.js loaded');
})();