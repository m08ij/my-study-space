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
      try{ document.dispatchEvent(new CustomEvent('ss:focus-complete', { detail: { minutes: window.timerSettings.focus } })); }catch(e){}
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
    /* رابط مباشر (#exams) أو نقر إشعار: له الأولوية على آخر تبويب محفوظ (كان يُستبدل فيضيع الرابط) */
    var hashTab = location.hash ? location.hash.slice(1) : '';
    if(hashTab && document.getElementById(hashTab) && document.getElementById(hashTab).classList.contains('section')) currentTab = hashTab;
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
    var sameTab = sec.classList.contains('active');
    document.querySelectorAll('.nav-item').forEach(function(i){ i.classList.remove('active'); });
    document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); s.classList.remove('tab-play'); });
    nav.classList.add('active');
    /* الأنيميشن يبدأ بنفس إطار إظهار الصفحة (لا وميض ولا قفزة)، ولا يُعاد عند الضغط على التبويب الحالي */
    if(!sameTab) sec.classList.add('tab-play');
    sec.classList.add('active');
    try{ localStorage.setItem('activeTab', JSON.stringify(tab)); }catch(e){}
    if(pushHistory){ try{ history.pushState({tab:tab}, '', '#' + tab); }catch(e){} }
    else{ try{ history.replaceState({tab:tab}, '', '#' + tab); }catch(e){} }
    window.closeSidebar();
    window.closeSettingsMenu();
    if(!sameTab) window.scrollTo({top:0, behavior:'smooth'});   /* البقاء بمكانك عند إعادة اختيار نفس الصفحة */
    var fns = {
      dashboard: window.renderDashboard, exams: window.renderExams,
      budget: window.renderBudget, courses: window.renderCourses, tasks: window.renderTasks,
      notes: window.renderNotes, flashcards: window.renderDecks,
      attendance: window.renderAttendance, timetable: window.renderTimetable,
      plan: window.renderPlan, hulinks: window.renderHuLinks, gradecalc: window.renderGradeCalc
    };
    if(fns[tab]){ try{ fns[tab](); }catch(e){ console.error('Render error:', tab, e); } }
    if(tab === 'gradecalc'){ try{ window.renderGpa(); }catch(e){} }
    if(!sameTab) setTimeout(function(){ sec.classList.remove('tab-play'); }, 500);
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

  /* ===== بيانات المزامنة الوصفية (خارج الـ snapshot) =====
     تُكتب مباشرة بدون S.set حتى لا تُطلق حلقة حفظ.
     ss_cloud_ver    : updated_at (ms) لآخر نسخة سحابية اتزامنّا معها
     ss_synced_hash  : بصمة محتوى space عند آخر مزامنة */
  function metaGet(k){ try{ var v = localStorage.getItem(k); return v === null ? null : JSON.parse(v); }catch(e){ return null; } }
  function metaSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
  function metaDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
  function canon(o){
    if(o === null || typeof o !== 'object') return JSON.stringify(o);
    if(Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
    return '{' + Object.keys(o).sort().map(function(k){ return JSON.stringify(k) + ':' + canon(o[k]); }).join(',') + '}';
  }
  function spaceHash(){
    var s = canon(window.space), h = 5381;
    for(var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return s.length + ':' + h;
  }
  /* بصمة كل البيانات المتزامنة (space + ملاحظات + حاسبة المعدل + مؤقت + سجل الدراسة + ثيم …)
     بدون حالة الواجهة (activeTab/openSems) حتى لا تُحسب تعديلاً. البصمة القديمة كانت للـ space فقط، فتعديل
     ثيم/ملاحظة أوفلاين كان يُستبدل بنسخة السحابة عند التشغيل التالي. */
  function stateHash(){
    var s = window.gatherSnapshot();
    var core = { space: s.space, notes: s.notes, gpaRows: s.gpaRows, timerSettings: s.timerSettings,
      pomoSessions: s.pomoSessions, pomoFocus: s.pomoFocus, studyLog: s.studyLog, theme: s.theme, welcomeDone: s.welcomeDone };
    /* تُضاف فقط عند وجودها حتى لا تتغيّر بصمة من لا يستخدمها (فلا يظهر تعديل وهمي بعد التحديث) */
    if(s.budgetPlan) core.budgetPlan = s.budgetPlan;
    if(s.focusLinks) core.focusLinks = s.focusLinks;
    var str = canon(core), h = 5381;
    for(var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'v2:' + str.length + ':' + h;
  }
  function localDirty(){
    var h = metaGet('ss_synced_hash');
    if(h === null) return true;
    /* بصمة قديمة (قبل v2): نقارنها بالطريقة القديمة (space فقط) ولا نعتبر الباقي تعديلاً */
    if(String(h).indexOf('v2:') !== 0) return h !== spaceHash();
    return h !== stateHash();
  }
  function toMs(v){ var n = Date.parse(v); return isNaN(n) ? null : n; }
  window.markSynced = function(updatedAt, hash){
    var ms = toMs(updatedAt);
    if(ms === null){ metaDel('ss_cloud_ver'); return; }
    metaSet('ss_cloud_ver', ms);
    metaSet('ss_synced_hash', hash || stateHash());
  };
  window.getConflictBackup = function(){ return metaGet('ss_conflict_backup'); };

  function scheduleSaveRetry(){
    if((window._saveRetryN || 0) >= 3) return;
    var delay = [5000, 15000, 45000][window._saveRetryN || 0];
    window._saveRetryN = (window._saveRetryN || 0) + 1;
    clearTimeout(window._saveRetryT);
    window._saveRetryT = setTimeout(window.doServerSave, delay);
  }

  window.doServerSave = async function(){
    if(!window.SB || window.cloudSyncBlocked) return;
    if(window.serverSaveInFlight){ window.queueServerSave(); return; }
    try{
      window.serverSaveInFlight = true; window.setServerStatus();
      /* منع الكتابة فوق تعديل أحدث من جهاز آخر */
      var ver = metaGet('ss_cloud_ver');
      if(ver !== null){
        var peek = await window.SB.peekUpdatedAt();
        if(peek.status === 'error'){ window.serverOnline = false; window.setServerStatus('off'); scheduleSaveRetry(); return; }
        if(peek.status === 'ok' && toMs(peek.updated_at) !== ver){ window.handleSyncConflict(); return; }
      }
      var hash = stateHash();
      var ok = await window.SB.save(window.gatherSnapshot());
      if(ok){
        window.serverOnline = true; window.setServerStatus('ok'); window._saveRetryN = 0;
        /* نقرأ القيمة الفعلية بعد الحفظ (قد تختلف صيغتها/قيمتها عمّا أرسلناه) */
        var after = await window.SB.peekUpdatedAt();
        if(after.status === 'ok') window.markSynced(after.updated_at, hash);
        else metaDel('ss_cloud_ver');
      } else { window.serverOnline = false; window.setServerStatus('off'); scheduleSaveRetry(); }
    }catch(e){ window.serverOnline = false; window.setServerStatus('off'); scheduleSaveRetry(); }
    finally { window.serverSaveInFlight = false; window.setServerStatus(); }
  };

  /* قرار المزامنة عند توفر نسخة سحابية: 'apply' | 'keep-local' | 'conflict' */
  function decideSync(sd){
    var serverMs = toMs(sd.updated_at), ver = metaGet('ss_cloud_ver');
    if(ver !== null && serverMs !== null){
      if(serverMs === ver) return localDirty() ? 'keep-local' : 'apply';
      return localDirty() ? 'conflict' : 'apply';
    }
    /* لا توجد بصمة مزامنة سابقة (بيانات قديمة): قاعدة التوقيت */
    var lt = parseInt(window.S.get('ss_space_ts', 0), 10) || 0;
    return (lt && serverMs !== null && lt > serverMs + 2000) ? 'keep-local' : 'apply';
  }
  window._decideSync = decideSync;

  /* تعديل من جهازين: نحفظ النسختين احتياطياً ثم المستخدم يقرر — لا شيء يُستبدل تلقائياً */
  window.handleSyncConflict = async function(){
    if(window._conflictOpen) return;
    window._conflictOpen = true; window.cloudSyncBlocked = true;
    window.setServerStatus('off');
    var row = null;
    try{ row = await window.SB.load(); }catch(e){}
    if(!row || !row.data){
      window._conflictOpen = false;
      window.toast('تعذّر قراءة النسخة السحابية — لم يُرفع شيء', 'warn', 3500);
      return;
    }
    var saved = metaSet('ss_conflict_backup', { at: new Date().toISOString(), cloudAt: row.updated_at, local: window.gatherSnapshot(), cloud: row.data });
    window.refreshRestorePrevBtn();
    if(!saved){
      window._conflictOpen = false;
      window.toast('لا توجد مساحة لحفظ نسخة احتياطية — تم إيقاف الرفع لحماية بياناتك', 'warn', 5000);
      return;
    }
    var bd = document.createElement('div');
    bd.className = 'sync-conflict-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px';
    bd.innerHTML = '<div class="modal" style="max-width:440px;text-align:center;position:relative">' +
      '<div style="font-size:2.6rem;margin-bottom:8px">🔀</div>' +
      '<h3 style="margin-bottom:12px">تعديلات من جهازين</h3>' +
      '<p style="color:var(--muted);font-size:var(--fs-md);line-height:1.8;margin-bottom:8px">تم تعديل بياناتك على السحابة من جهاز آخر، وعندك تعديلات غير مرفوعة على هذا الجهاز.</p>' +
      '<p style="color:var(--muted2);font-size:var(--fs-xs);margin-bottom:18px">حفظنا نسخة من الطرفين على هذا الجهاز قبل أي قرار.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn btn-sm" id="scCloud">☁️ استخدام نسخة السحابة (تعديلات هذا الجهاز تبقى بالنسخة الاحتياطية)</button>' +
        '<button class="btn btn-sm btn-ghost" id="scLocal">💾 الاحتفاظ بنسخة هذا الجهاز (نسخة السحابة تبقى بالنسخة الاحتياطية)</button>' +
      '</div></div>';
    document.body.appendChild(bd);
    bd.querySelector('#scCloud').onclick = function(){
      bd.remove();
      window.applyServerData(row.data);
      window.markSynced(row.updated_at);
      window._conflictOpen = false;
      location.reload();
    };
    bd.querySelector('#scLocal').onclick = function(){
      bd.remove();
      var ms = toMs(row.updated_at);
      if(ms !== null) metaSet('ss_cloud_ver', ms);
      window._conflictOpen = false; window.cloudSyncBlocked = false;
      window.doServerSave();
    };
  };

  /* رجوع الاتصال: إعادة محاولة الرفع، أو إعادة محاولة التحميل الذي فشل عند الإقلاع */
  window.addEventListener('online', function(){
    if(window.bootSyncing || window._conflictOpen) return;
    if(window.cloudLoadFailed){
      window.SB.load().then(function(sd){
        if(window.SB.lastLoadStatus === 'error') return;
        var decision = (sd && sd.data) ? decideSync(sd) : 'keep-local';
        if(decision === 'apply'){ window.applyServerData(sd.data); window.markSynced(sd.updated_at); location.reload(); return; }
        window.cloudLoadFailed = false; window.cloudSyncBlocked = false;
        if(decision === 'conflict') window.handleSyncConflict();
        else { if(sd && sd.data && metaGet('ss_cloud_ver') === null) window.markSynced(sd.updated_at, '__dirty__'); window.doServerSave(); }
      });
    } else if(!window.cloudSyncBlocked){
      window._saveRetryN = 0; window.doServerSave();
    }
  });

  window.gatherSnapshot = function(){
    return {
      version: 7,
      savedAt: new Date().toISOString(),
      space: window.space, notes: window.notes, gpaRows: window.gpaRows,
      timerSettings: window.timerSettings,
      pomoSessions: window.S.get('pomoSessions', 0),
      pomoFocus: window.S.get('pomoFocus', 0),
      studyLog: window.S.get('studyLog', {}),
      budgetPlan: window.S.get('budgetPlan', null),
      focusLinks: window.S.get('focusLinks', null),
      theme: window.S.get('theme', 'dark'),
      activeTab: window.S.get('activeTab', 'dashboard'),
      welcomeDone: window.S.get('welcomeDone', false),
      openSems: window.S.get('openSems', [0])
    };
  };

  /* حالة المزامنة بصيغة مقروءة (للأيقونة العلوية ونافذة الرمز): لا تغيّر آلية المزامنة، تقرأ المؤشرات الموجودة فقط */
  function agoText(ms){
    var m = Math.floor(ms / 60000);
    return m < 1 ? 'الآن' : m < 60 ? 'قبل ' + m + ' د' : m < 1440 ? 'قبل ' + Math.floor(m / 60) + ' س' : 'قبل ' + Math.floor(m / 1440) + ' يوم';
  }
  window.getSyncStatus = function(){
    var last = metaGet('ss_cloud_ver'), ago = (typeof last === 'number' && last > 0) ? ' · آخر مزامنة ' + agoText(Math.max(0, Date.now() - last)) : '';
    if(window._conflictOpen) return { state: 'conflict', level: 'warn', icon: '⚠️', text: 'تعارض بين نسخة جهازك والسحابة — بانتظار قرارك' };
    if(window.cloudLoadFailed) return { state: 'error', level: 'warn', icon: '⚠️', text: 'تعذّر الاتصال بالسحابة — بياناتك محفوظة على جهازك' };
    if(typeof navigator !== 'undefined' && navigator.onLine === false) return { state: 'offline', level: 'muted', icon: '📴', text: 'بدون اتصال — محفوظ على جهازك' };
    if(window.serverSaveInFlight) return { state: 'syncing', level: 'ok', icon: '🔄', text: 'جاري المزامنة…' };
    if(window.serverOnline) return { state: 'ok', level: 'ok', icon: '☁️', text: 'متزامن مع السحابة' + ago };
    if((window._saveRetryN || 0) > 0) return { state: 'retry', level: 'warn', icon: '🔄', text: 'فشل آخر حفظ سحابي — يعيد المحاولة تلقائياً' };
    return { state: 'local', level: 'muted', icon: '💾', text: 'حفظ على جهازك (المزامنة السحابية غير متصلة)' };
  };
  window.setServerStatus = function(){
    var el = document.getElementById('serverStatus'); if(!el) return;
    var st = window.getSyncStatus();
    el.textContent = st.icon; el.title = st.text; el.setAttribute('aria-label', 'حالة المزامنة: ' + st.text); el.setAttribute('data-sync', st.state);
    el.style.color = st.level === 'ok' ? 'var(--green)' : st.level === 'warn' ? 'var(--amber)' : 'var(--muted)';
    el.onclick = function(){ if(window.SB) window.SB.showSyncPanel(); };
  };
  window.addEventListener('online', function(){ window.setServerStatus(); });
  window.addEventListener('offline', function(){ window.setServerStatus(); });

  function isPlainObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }
  function safePlan(p){
    if(!isPlainObj(p)) return null;
    try{ if(JSON.stringify(p).length > 200000) return null; }catch(e){ return null; }
    var out = {};
    ['openingBalance','monthlyBudget','horizon'].forEach(function(k){ if(typeof p[k] === 'number' && isFinite(p[k])) out[k] = p[k]; });
    if(typeof p.balanceDate === 'string') out.balanceDate = p.balanceDate.slice(0, 10);
    if(isPlainObj(p.limits)){ out.limits = {}; Object.keys(p.limits).forEach(function(k){ if(k !== '__proto__' && typeof p.limits[k] === 'number' && isFinite(p.limits[k])) out.limits[k] = p.limits[k]; }); }
    ['recurring','scenarios','goals'].forEach(function(k){ if(Array.isArray(p[k])) out[k] = p[k].filter(isPlainObj).slice(0, 200); });
    return out;
  }
  function safeFocus(f){
    if(!isPlainObj(f)) return null;
    var out = { tasks: {}, courses: {} };
    ['tasks','courses'].forEach(function(g){ if(isPlainObj(f[g])) Object.keys(f[g]).slice(0, 2000).forEach(function(k){ var n = f[g][k]; if(k !== '__proto__' && typeof n === 'number' && isFinite(n) && n >= 0) out[g][k] = n; }); });
    return out;
  }

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
      /* خطة الميزانية وربط التركيز: تُستعاد فقط إن وُجدت بالنسخة وكانت بصيغة سليمة؛ غيابها (نسخ قديمة) لا يمسّ المحلي */
      var bp = safePlan(data.budgetPlan); if(bp) window.S.set('budgetPlan', bp);
      var fl = safeFocus(data.focusLinks); if(fl) window.S.set('focusLinks', fl);
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
    overlay.style.display = '';
    overlay.classList.add('show');
    overlay.classList.remove('hide');
    var btn = document.getElementById('welcomeBtn');
    var input = document.getElementById('welcomeName');
    var form = overlay.querySelector('.welcome-form'), errEl = document.getElementById('welcomeErr'), busy = false;
    function setErr(m){ if(errEl) errEl.textContent = m || ''; if(form) form.classList.toggle('has-err', !!m); if(input) input.setAttribute('aria-invalid', m ? 'true' : 'false'); }
    setTimeout(function(){ if(input) input.focus(); }, 200);
    /* حبس التركيز داخل الشاشة (الصفحة خلفها غير متاحة) */
    overlay.onkeydown = function(e){
      if(e.key !== 'Tab') return;
      var f = [input, btn].filter(Boolean); if(!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    };
    var handle = function(){
      if(busy) return;                      /* يمنع النقر/Enter المتكرر */
      var name = (input && input.value || '').trim();
      if(!name){ setErr('اكتب اسمك للمتابعة'); if(input) input.focus(); return; }
      busy = true; setErr(''); if(form) form.classList.add('busy');
      window.space.profile = window.space.profile || {};
      window.space.profile.name = name;
      window.saveSpace();
      window.S.set('welcomeDone', true);
      overlay.classList.add('hide');
      setTimeout(function(){
        overlay.classList.remove('show'); overlay.style.display = 'none'; document.documentElement.classList.remove('is-new');
        var mn = document.querySelector('main'); if(mn){ mn.setAttribute('tabindex', '-1'); try{ mn.focus({ preventScroll: true }); }catch(e){} }
      }, 400);
      setTimeout(function(){ window.toast('أهلاً ' + name + '! 🚀', 'success', 3500); }, 400);
      try{ window.renderDashboard(); }catch(e){}
    };
    if(btn) btn.onclick = handle;
    if(input){ input.onkeydown = function(e){ if(e.key === 'Enter'){ e.preventDefault(); handle(); } }; input.oninput = function(){ if(errEl && errEl.textContent) setErr(''); }; }
  };

  /* ============================================================
     SEARCH
     ============================================================ */
  window.initSearch = function(){
    var inp = document.getElementById('searchInput');
    var res = document.getElementById('searchResults');
    if(!inp || !res) return;
    function buildIndex(){
      /* ترتيب الأولوية: عناصرك أنت أولاً (موادي، مهام، امتحانات)، ثم كتالوج الخطة (بدون ما أضفته أصلاً)، ثم الأوصاف */
      var idx = [], mine = {};
      (window.space.courses || []).forEach(function(c){ mine[c.name] = true; idx.push({name: c.name, type:'موادي', tab:'courses', courseId: c.id}); });
      (window.space.tasks || []).forEach(function(t){ if(t.title) idx.push({name: t.title, type:'مهمة', tab:'tasks'}); });
      (window.space.exams || []).forEach(function(e){ if(e.name) idx.push({name: e.name, type:'امتحان', tab:'exams'}); });
      (window.notes || []).forEach(function(n){ var nm = n && (n.title || String(n.body || '').slice(0, 40)); if(nm) idx.push({name: nm, type:'ملاحظة', tab:'notes'}); });
      (window.SEMESTERS || []).forEach(function(s){
        s.courses.forEach(function(c){ if(!mine[c.n]) idx.push({name: c.n, type:'الخطة', tab:'plan'}); });
      });
      var CD = window.COURSES_DESC || {};
      Object.keys(CD).forEach(function(k){ idx.push({name: k, type:'وصف', tab:'coursedescriptions'}); });
      return idx;
    }
    var current = [], activeI = -1;
    function openResult(x){
      res.classList.remove('show');
      inp.value = '';
      inp.blur();
      current = []; activeI = -1;
      window.switchTab(x.tab);
      /* مادتك: نفتح صفحة المادة مباشرة (ملفات/مهام/امتحانات/علامات/حضور) */
      if(x.courseId && window.Hub && window.Hub.openCourse) window.Hub.openCourse(x.courseId);
    }
    function setActive(i){
      activeI = i;
      res.querySelectorAll('.search-item').forEach(function(el, k){ el.classList.toggle('active', k === i); });
      var el = res.querySelectorAll('.search-item')[i]; if(el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    inp.addEventListener('input', function(){
      var q = inp.value.trim().toLowerCase();
      if(!q){ res.classList.remove('show'); current = []; activeI = -1; return; }
      var idx = buildIndex();
      var m = idx.filter(function(x){ return String(x.name || '').toLowerCase().indexOf(q) > -1; }).slice(0,10);
      current = m; activeI = -1;
      if(!m.length) res.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:var(--fs-sm)">لا نتائج</div>';
      else {
        var html = '';
        m.forEach(function(x, i){
          html += '<div class="search-item" data-si="' + i + '"><span>' + window.esc(x.name) + '</span><span class="s-tag">' + x.type + '</span></div>';
        });
        res.innerHTML = html;
        res.querySelectorAll('[data-si]').forEach(function(el){
          el.addEventListener('click', function(){ openResult(m[parseInt(el.dataset.si, 10)]); });
        });
      }
      res.classList.add('show');
    });
    /* لوحة المفاتيح داخل البحث: الأسهم للتنقل بين النتائج، Enter يفتح المحدد (أو الأول) */
    inp.addEventListener('keydown', function(e){
      if(!current.length) return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); setActive(Math.min(current.length - 1, activeI + 1)); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); setActive(Math.max(0, activeI - 1)); }
      else if(e.key === 'Enter'){ e.preventDefault(); openResult(current[activeI >= 0 ? activeI : 0]); }
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
      try{ localStorage.setItem('ss_last_backup', String(Date.now())); }catch(e2){}   /* لتذكير النسخة الأسبوعي فقط؛ خارج الـsnapshot */
      if(!silent) window.toast('💾 تم التنزيل', 'success', 2500);
    }catch(e){ if(!silent) window.toast('فشل', 'warn', 2000); }
  };

  /* فحص ملف النسخة قبل الاستيراد: يرجّع {ok, errors, warnings, summary}. لا يكتب شيئاً. */
  window.validateBackup = function(data){
    var errors = [], warnings = [];
    function isObj(v){ return v && typeof v === 'object' && !Array.isArray(v); }
    if(!isObj(data)) return { ok: false, errors: ['الملف ليس نسخة احتياطية صالحة'], warnings: [], summary: null };
    if(!isObj(data.space)) return { ok: false, errors: ['لا يحتوي بيانات المساحة (space)'], warnings: [], summary: null };
    var sp = data.space;
    ['courses','tasks','exams','decks','budget','grades','completedCourses'].forEach(function(k){
      if(sp[k] !== undefined && !Array.isArray(sp[k])) errors.push('الحقل ' + k + ' يجب أن يكون قائمة');
    });
    ['timetable','attendance','profile'].forEach(function(k){
      if(sp[k] !== undefined && !isObj(sp[k])) errors.push('الحقل ' + k + ' بصيغة غير صالحة');
    });
    if(data.notes !== undefined && !Array.isArray(data.notes)) errors.push('الملاحظات بصيغة غير صالحة');
    if(data.budgetPlan != null && !isObj(data.budgetPlan)) errors.push('خطة الميزانية بصيغة غير صالحة');
    if(data.focusLinks != null && !isObj(data.focusLinks)) errors.push('بيانات ربط التركيز بصيغة غير صالحة');
    var courses = Array.isArray(sp.courses) ? sp.courses : [];
    var badCourse = 0, seen = {}, dup = 0;
    courses.forEach(function(c){
      if(!isObj(c) || typeof c.name !== 'string' || !c.name.trim() || (c.id !== undefined && typeof c.id !== 'string')){ badCourse++; return; }
      if(c.id){ if(seen[c.id]) dup++; seen[c.id] = true; }
    });
    if(badCourse) errors.push(badCourse + ' مادة بدون اسم صالح');
    if(dup) errors.push('معرّفات مواد مكررة (' + dup + ') — قد تفقد ارتباط الملفات');
    var tasks = Array.isArray(sp.tasks) ? sp.tasks : [], badTask = tasks.filter(function(t){ return !isObj(t) || typeof t.title !== 'string'; }).length;
    if(badTask) errors.push(badTask + ' مهمة بصيغة غير صالحة');
    var exams = Array.isArray(sp.exams) ? sp.exams : [], badExam = exams.filter(function(e){ return !isObj(e) || typeof e.name !== 'string'; }).length;
    if(badExam) errors.push(badExam + ' امتحان بصيغة غير صالحة');
    var tt = isObj(sp.timetable) ? sp.timetable : {}, ttKeys = Object.keys(tt), badTt = ttKeys.filter(function(k){ return !/^[A-Za-z]{3}-\d{1,2}:\d{2}$/.test(k) || !isObj(tt[k]); }).length;
    if(badTt) warnings.push(badTt + ' موعد بالجدول بصيغة غير معروفة (سيبقى كما هو)');
    if(typeof data.version === 'number' && data.version > 7) warnings.push('النسخة من إصدار أحدث من التطبيق (v' + data.version + ')');
    if(!data.savedAt) warnings.push('لا يوجد تاريخ حفظ بالملف');
    return { ok: !errors.length, errors: errors, warnings: warnings, summary: {
      courses: courses.length, tasks: tasks.length, exams: exams.length, notes: Array.isArray(data.notes) ? data.notes.length : 0,
      lectures: ttKeys.length, savedAt: data.savedAt || '' } };
  };
  function backupLine(s){ return s.courses + ' مادة، ' + s.tasks + ' مهمة، ' + s.exams + ' امتحان، ' + s.notes + ' ملاحظة، ' + s.lectures + ' محاضرة'; }

  window.restoreFromFile = function(){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = function(e){
      var file = e.target.files[0]; if(!file) return;
      if(file.size > 10 * 1024 * 1024){ window.toast('الملف كبير جداً (الحد 10MB)', 'warn', 3500); return; }
      var reader = new FileReader();
      reader.onerror = function(){ window.toast('تعذّرت قراءة الملف', 'warn', 3000); };
      reader.onload = function(ev){
        var data;
        /* __proto__ تُحذف أثناء القراءة */
        try{ data = JSON.parse(ev.target.result, function(k, v){ return k === '__proto__' ? undefined : v; }); }
        catch(err){ window.toast('ملف تالف: ليس JSON صالحاً', 'warn', 3500); return; }
        var v = window.validateBackup(data);
        if(!v.ok){ window.toast('ملف غير صالح: ' + v.errors.slice(0, 2).join(' · '), 'warn', 5000); return; }
        window.importBackupData(data, v);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* استيراد بعد التحقق: يعرض ملخصاً ويطلب تأكيداً، ويحفظ نسخة من الحالي قبل الكتابة */
  window.importBackupData = function(data, v){
    v = v || window.validateBackup(data);
    if(!v.ok) return false;
    var cur = { courses: (window.space.courses || []).length, tasks: (window.space.tasks || []).length, exams: (window.space.exams || []).length,
      notes: (window.notes || []).length, lectures: Object.keys(window.space.timetable || {}).length };
    var msg = 'في الملف: ' + backupLine(v.summary) + (v.summary.savedAt ? '\nتاريخ النسخة: ' + new Date(v.summary.savedAt).toLocaleString('ar-JO') : '') +
      '\nعندك الآن: ' + backupLine(cur) + (v.warnings.length ? '\n⚠️ ' + v.warnings.join('\n⚠️ ') : '') +
      '\n\nسيتم استبدال بياناتك الحالية، وتُحفظ نسخة منها تلقائياً على هذا الجهاز ويمكن استرجاعها من القائمة.';
    window.customConfirm(msg, function(){
      if(!metaSet('ss_pre_restore_backup', { at: new Date().toISOString(), snapshot: window.gatherSnapshot() }) &&
         !confirm('تعذّر حفظ نسخة من بياناتك الحالية (لا توجد مساحة). المتابعة بدون نسخة؟')) return;
      window.applyServerData(data);
      window.saveSpace();
      window.S.set('notes', window.notes);
      window.S.set('gpaRows', window.gpaRows);
      window.S.set('timerSettings', window.timerSettings);
      window.toast('✅ تمت الاستعادة', 'success', 2500);
      setTimeout(function(){ location.reload(); }, 800);
    }, { title: 'استعادة نسخة احتياطية', icon: '📥', okLabel: 'استعادة واستبدال', danger: false });
    return true;
  };
  /* استرجاع نسخة سابقة محفوظة محلياً: نسخة التعارض (جهازي/سحابة) أو نسخة ما قبل الاستعادة */
  function prevBackups(){
    var list = [], c = metaGet('ss_conflict_backup'), p = metaGet('ss_pre_restore_backup');
    function fmt(iso){ try{ return new Date(iso).toLocaleString('ar-JO'); }catch(e){ return iso; } }
    function cnt(s){ return s && s.space && Array.isArray(s.space.courses) ? s.space.courses.length : 0; }
    if(c && c.local) list.push({ v: 'cl', l: 'تعارض ' + fmt(c.at) + ' — نسخة هذا الجهاز (' + cnt(c.local) + ' مادة)', snap: c.local });
    if(c && c.cloud) list.push({ v: 'cc', l: 'تعارض ' + fmt(c.at) + ' — نسخة السحابة (' + cnt(c.cloud) + ' مادة)', snap: c.cloud });
    if(p && p.snapshot) list.push({ v: 'pr', l: 'قبل استعادة ملف ' + fmt(p.at) + ' (' + cnt(p.snapshot) + ' مادة)', snap: p.snapshot });
    return list;
  }
  window.refreshRestorePrevBtn = function(){
    var b = document.getElementById('restorePrevBtn'); if(b) b.style.display = prevBackups().length ? '' : 'none';
  };
  window.restorePreviousBackup = function(){
    var list = prevBackups();
    if(!list.length){ window.toast('لا توجد نسخ سابقة', 'info', 2000); return; }
    window.showModal('استرجاع نسخة سابقة', [
      { key: 'v', label: 'اختر النسخة (بياناتك الحالية تُحفظ تلقائياً قبل الاسترجاع)', type: 'select', options: list.map(function(x){ return { v: x.v, l: x.l }; }) }
    ], { v: list[0].v }, function(data){
      var pick = list.filter(function(x){ return x.v === data.v; })[0];
      if(!pick) return false;
      if(!metaSet('ss_pre_restore_backup', { at: new Date().toISOString(), snapshot: window.gatherSnapshot() }) &&
         !confirm('تعذّر حفظ نسخة من بياناتك الحالية. المتابعة؟')) return false;
      window.applyServerData(pick.snap);
      window.saveSpace();
      window.toast('✅ تم الاسترجاع', 'success', 2000);
      setTimeout(function(){ location.reload(); }, 800);
      return true;
    });
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

  /* تنبيهات داخل التطبيق (Toast + إشعار المتصفح إن كان مسموحاً). موثوقة لأنها محلية بالكامل:
     - الأيام تُحسب بتوقيت الجهاز (daysUntil).
     - كل تنبيه له مفتاح باليوم (tag) فلا يتكرر في نفس اليوم حتى لو أُعيد الفحص (توقيت/عودة للتبويب).
     - مهمة متأخرة/اليوم/غداً (بأولوية عالية)، وامتحانات خلال 3 أيام. */
  window.checkSmartReminders = function(){
    if(!window.space || !window.space.tasks) return;
    var today = window.today(), now = new Date(), hour = now.getHours();
    if(hour < 8 || hour > 23) return;
    var firedKey = 'ss_smart_reminders_v4_' + today;
    var fired = window.S.get(firedKey, {}) || {};
    var du = window.daysUntil || function(){ return null; };
    var pending = window.space.tasks.filter(function(t){ return !t.done; });
    var dueToday = pending.filter(function(t){ return du(t.due) === 0; });
    var overdue = pending.filter(function(t){ var d = du(t.due); return d !== null && d < 0; });
    var tomorrowHigh = pending.filter(function(t){ return du(t.due) === 1 && t.priority === 'high'; });
    var upcomingExams = (window.space.exams || []).filter(function(e){ var d = du(e.date); return d !== null && d >= 0 && d <= 3; });
    var reminders = [];
    function titles(a){ return a.slice(0, 3).map(function(x){ return x.title; }).join(' · '); }
    if(dueToday.length) reminders.push({tag:'due-today', t:'📌 ' + dueToday.length + ' مهمة اليوم!', b: titles(dueToday)});
    if(overdue.length) reminders.push({tag:'overdue', t:'⚠️ ' + overdue.length + ' مهمة متأخرة!', b: titles(overdue)});
    if(tomorrowHigh.length) reminders.push({tag:'high-tomorrow', t:'🔺 ' + tomorrowHigh.length + ' مهمة مهمة غدًا', b: titles(tomorrowHigh)});
    upcomingExams.forEach(function(e){
      var r = window.examRemaining(e, now), uid = e.id || (e.date + '_' + String(e.name || '').replace(/\s+/g,'_'));
      reminders.push({tag: 'exam-' + uid, t: '⏳ امتحان ' + (r.days === 0 ? 'اليوم!' : r.days === 1 ? 'غدًا!' : r.label), b: e.name + (e.time ? ' — ' + e.time : '')});
    });
    var anyNew = false, shown = 0;
    reminders.forEach(function(r){
      if(fired[r.tag]) return;
      fired[r.tag] = true; anyNew = true;
      var delay = 1500 + (shown++) * 2500;
      if(typeof window.showNotif === 'function') setTimeout(function(){ window.showNotif(r.t, r.b, {tag: 'ss-' + r.tag + '-' + today}); }, delay);
    });
    if(anyNew){ window.S.set(firedKey, fired); if(window.startupBrief) setTimeout(function(){ window.startupBrief(null, {}); }, 1500); }   /* داخل التطبيق: كرت واحد مجمّع (يتخطّى إن ظهر قبل أقل من 10 دقائق) */
  };
  /* عند الرجوع للتبويب (يوم جديد/فترة غياب) نفحص مرة أخرى؛ التكرار ممنوع بمفتاح اليوم */
  if(!window._reminderVisBound){
    window._reminderVisBound = true;
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) window.checkSmartReminders(); });
  }
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
      item.setAttribute('role', 'button'); item.setAttribute('tabindex', '0');
      item.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); window.switchTab(item.dataset.tab); } });
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
      if(!e.target.closest('.settings-wrap') && !e.target.closest('#settingsMenu')) window.closeSettingsMenu();
    });
    var rp = document.getElementById('restorePrevBtn'); if(rp) rp.addEventListener('click', function(){ window.closeSettingsMenu(); window.restorePreviousBackup(); });
    window.refreshRestorePrevBtn();

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
    bind('btnUploadHub', function(){ window.openUploadHub(); });
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
    var tsel = document.getElementById('taskSort');
    if(tsel) tsel.addEventListener('change', function(){ window.setTaskSort(tsel.value); });
    var tqf = document.getElementById('taskQuickForm');
    if(tqf) tqf.addEventListener('submit', function(e){
      e.preventDefault();
      var inp = document.getElementById('taskQuick');
      if(inp && window.quickAddTask(inp.value)){ inp.value = ''; inp.focus(); }
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
    /* «توليد من موادي»: صفوف جاهزة بأسماء/أكواد موادك التي ليست بالجدول بعد (كانت تفتح نموذجاً فاضياً) */
    var tt = window.space.timetable || {}, used = {};
    Object.keys(tt).forEach(function(k){ if(tt[k] && tt[k].name) used[tt[k].name] = true; });
    var rows = (window.space.courses || []).filter(function(c){ return c.name && !used[c.name]; }).map(function(c){
      return { code: c.code || '', name: c.name, matched: null, days: [], timeFrom: '', timeTo: '', room: c.room || '' };
    });
    if(!rows.length){ window.toast('كل موادك موجودة بالجدول أصلاً', 'info', 2500); return; }
    if(window.openSmartTimetable) window.openSmartTimetable(rows);
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

  /* ---- Timetable helpers: المفتاح 'Sun-08:00' = اليوم-وقت البداية، والقيمة {name, room, instructor, end?} ---- */
  function ttMin(t){
    var p = String(t || '').split(':'), h = parseInt(p[0], 10), m = parseInt(p[1], 10) || 0;
    return isNaN(h) ? null : h * 60 + m;
  }
  function ttPad(t){
    var m = ttMin(t); if(m === null) return '';
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  function ttSplitKey(k){
    var i = String(k).indexOf('-');
    return i < 0 ? null : { day: k.slice(0, i), time: k.slice(i + 1) };
  }
  function ttDur(min){
    if(min < 60) return min + ' د';
    var h = Math.floor(min / 60), m = min % 60;
    return m ? h + 'س ' + m + 'د' : h + ' س';
  }
  /* مساعدات الجدول متاحة لـ hub.js (لوحة اليوم/تفاصيل المحاضرة) بدل تكرارها */
  window.ttMin = ttMin; window.ttPad = ttPad; window.ttSplitKey = ttSplitKey; window.ttDur = ttDur;
  /* تداخل حقيقي فقط: يحتاج وقت نهاية معروف للمحاضرة الأبكر (المحاضرات القديمة بدون end لا تُعلَّم) */
  window.getTimetableConflicts = function(){
    var tt = (window.space && window.space.timetable) || {}, byDay = {}, bad = {}, list = [];
    Object.keys(tt).forEach(function(k){
      var p = ttSplitKey(k), s = p ? ttMin(p.time) : null; if(s === null || !tt[k]) return;
      var e = ttMin(tt[k].end);
      (byDay[p.day] = byDay[p.day] || []).push({ key: k, s: s, e: (e !== null && e > s) ? e : null });
    });
    Object.keys(byDay).forEach(function(d){
      var a = byDay[d].sort(function(x, y){ return x.s - y.s; });
      for(var i = 0; i < a.length; i++){
        if(a[i].e === null) continue;
        for(var j = i + 1; j < a.length && a[j].s < a[i].e; j++){
          bad[a[i].key] = bad[a[j].key] = true;
          list.push({ day: d, a: a[i].key, b: a[j].key });
        }
      }
    });
    return { keys: bad, list: list };
  };

  /* محاضرات متتالية بدون فاصل كافٍ (من نهاية الأولى لبداية الثانية أقل من gap دقيقة، ولا تداخل) */
  window.getTimetableTight = function(gap){
    gap = gap == null ? 10 : gap;
    var tt = (window.space && window.space.timetable) || {}, byDay = {}, out = [];
    Object.keys(tt).forEach(function(k){
      var p = ttSplitKey(k), s = p ? ttMin(p.time) : null, e = tt[k] ? ttMin(tt[k].end) : null; if(s === null || e === null || e <= s) return;
      (byDay[p.day] = byDay[p.day] || []).push({ key: k, s: s, e: e });
    });
    Object.keys(byDay).forEach(function(d){
      var a = byDay[d].sort(function(x, y){ return x.s - y.s; });
      for(var i = 0; i < a.length - 1; i++){ var g = a[i + 1].s - a[i].e; if(g >= 0 && g < gap && tt[a[i].key].name !== tt[a[i + 1].key].name) out.push({ day: d, a: a[i].key, b: a[i + 1].key, gap: g }); }
    });
    return out;
  };

  window.editClassSlot = function(key){
    if(!window.space || !window.space.timetable) return;
    var cls = window.space.timetable[key];
    if(!cls) return;
    if(!window.showModal){ window.toast('لا يمكن فتح المحرر', 'warn'); return; }
    var sk = ttSplitKey(key) || { day: 'Sun', time: '08:00' };
    var DE = window.DAYS_EN || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var DA = window.DAYS_AR || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    window.showModal('تعديل محاضرة', [
      { key: 'name', label: 'اسم المادة' },
      { key: 'day', label: 'اليوم', type: 'select', options: DE.map(function(d, i){ return { v: d, l: DA[i] }; }) },
      { key: 'time', label: 'وقت البداية', type: 'time' },
      { key: 'end', label: 'وقت النهاية (اختياري)', type: 'time' },
      { key: 'room', label: 'القاعة' },
      { key: 'building', label: 'المبنى (اختياري)' },
      { key: 'instructor', label: 'الدكتور' }
    ], { name: cls.name || '', day: sk.day, time: ttPad(sk.time), end: ttPad(cls.end), room: cls.room || '', building: cls.building || '', instructor: cls.instructor || '' }, function(data){
      var name = String(data.name || '').trim();
      if(!name){ window.toast('أدخل اسم المادة', 'warn'); return false; }
      var start = ttPad(data.time), end = ttPad(data.end);
      if(!start){ window.toast('أدخل وقت البداية', 'warn'); return false; }
      if(end && ttMin(end) <= ttMin(start)){ window.toast('وقت النهاية يجب أن يكون بعد البداية', 'warn', 2500); return false; }
      var newKey = data.day + '-' + start, tt = window.space.timetable;
      if(newKey !== key && tt[newKey]){ window.toast('في محاضرة ثانية بنفس اليوم والوقت', 'warn', 2800); return false; }
      /* نحافظ على أي حقول إضافية في المحاضرة */
      var merged = Object.assign({}, cls, { name: name, room: data.room || '', building: data.building || '', instructor: data.instructor || '', end: end });
      if(newKey !== key) delete tt[key];
      tt[newKey] = merged;
      window.saveSpace();
      if(window.renderTimetable) window.renderTimetable();
      if(window.renderDashboard) window.renderDashboard();
      window.toast(window.getTimetableConflicts().keys[newKey] ? '⚠️ تم التعديل — لكن في تعارض مع محاضرة ثانية' : '✅ تم التعديل', window.getTimetableConflicts().keys[newKey] ? 'warn' : 'success', 2600);
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

  /* تفضيل العرض محلي فقط (localStorage مباشرة — لا يدخل المزامنة) */
  function ttView(allDays, todayKey){
    var v = null;
    try{ v = localStorage.getItem('tt_view'); }catch(e){}
    if(v === 'week') return 'week';
    if(v && allDays.indexOf(v) > -1) return v;
    var phone = window.matchMedia && window.matchMedia('(max-width:600px)').matches;
    return (phone && allDays.indexOf(todayKey) > -1) ? todayKey : 'week';
  }
  function ttSetView(v){ try{ localStorage.setItem('tt_view', v); }catch(e){} window.renderTimetable(); }

  /* تنقل بين الأسابيع: يغيّر التواريخ وشارات الامتحانات فقط (الجدول نفسه متكرر أسبوعياً) */
  var ttWeekOffset = 0;
  function ttDateOf(dayKey, DE){
    var n = new Date(), d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    d.setDate(d.getDate() - d.getDay() + ttWeekOffset * 7 + DE.indexOf(dayKey));
    return d;
  }
  function ttYmd(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  window.ttSetWeek = function(off){ ttWeekOffset = off; window.renderTimetable(); };

  var ttScrolledOnce = false;
  window.renderTimetable = function(){
    var t = document.getElementById('timetableTable'); if(!t) return;
    var tt = (window.space && window.space.timetable) || {};
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var DE = window.DAYS_EN || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var DA = window.DAYS_AR || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    var todayKey = DE[now.getDay()];

    /* الأيام: الأحد–الخميس دائماً، والجمعة/السبت فقط إذا فيهم محاضرات (كانوا يُحفظون ولا يظهرون) */
    var allDays = (window.WEEK_DAYS_EN || ['Sun','Mon','Tue','Wed','Thu']).slice();
    var usedTimes = {}, anyKey = false;
    Object.keys(tt).forEach(function(k){
      var p = ttSplitKey(k); if(!p || ttMin(p.time) === null) return;
      anyKey = true;
      if(DE.indexOf(p.day) > -1 && allDays.indexOf(p.day) === -1) allDays.push(p.day);
    });
    allDays.sort(function(a, b){ return DE.indexOf(a) - DE.indexOf(b); });

    /* العرض: 'week' أو يوم واحد (افتراضياً على الموبايل: يوم اليوم) */
    var view = ttView(allDays, todayKey);
    var days = view === 'week' ? allDays : [view];
    Object.keys(tt).forEach(function(k){
      var p = ttSplitKey(k); if(!p || ttMin(p.time) === null || days.indexOf(p.day) === -1) return;
      usedTimes[ttPad(p.time)] = true;
    });

    var times = Object.keys(usedTimes).sort(function(a, b){ return ttMin(a) - ttMin(b); });
    if(!times.length) times = ['08:00','09:00','10:00','11:00','12:00'];
    var conf = window.getTimetableConflicts();

    function entryAt(day, time){
      var k = day + '-' + time;
      if(tt[k]) return { key: k, cls: tt[k] };
      /* مفاتيح قديمة بدون صفر بادئ (مثل 8:00) */
        var ks = Object.keys(tt);
      for(var i = 0; i < ks.length; i++){
        var p = ttSplitKey(ks[i]);
        if(p && p.day === day && ttPad(p.time) === time) return { key: ks[i], cls: tt[ks[i]] };
      }
      return null;
    }

    /* الفجوات = الوقت الفاضي الفعلي بعد انتهاء آخر محاضرة (النهاية إن وُجدت، وإلا ساعة من البداية) */
    var rows = [], runEnd = null;
    times.forEach(function(time){
      var cur = ttMin(time);
      if(runEnd !== null && cur - runEnd >= 30) rows.push({ type: 'gap', from: runEnd, to: cur });
      rows.push({ type: 'time', time: time });
      days.forEach(function(d){
        var en = entryAt(d, time); if(!en) return;
        var e = ttMin(en.cls.end);
        var endMin = (e !== null && e > cur) ? e : cur + 60;
        if(runEnd === null || endMin > runEnd) runEnd = endMin;
      });
    });

    /* الأسبوع المعروض: الجدول متكرر أسبوعياً، فالتنقل بين الأسابيع يغيّر التواريخ وامتحانات ذلك الأسبوع فقط */
    var isThisWeek = ttWeekOffset === 0;
    var nextKey = null;
    if(isThisWeek && window.Schedule){ var stt = window.Schedule.status(); if(stt.next) nextKey = stt.next.key; }
    var html = '<thead><tr><th></th>';
    days.forEach(function(d){
      var dt = ttDateOf(d, DE), ymd = ttYmd(dt);
      var dayExams = ((window.space && window.space.exams) || []).filter(function(e){ return e.date === ymd; });
      var isToday = d === todayKey && isThisWeek;
      var examBadge = '';
      if(dayExams.length){
        var nowD = new Date(), dd = Math.round((dt - new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate())) / 86400000);
        var when = dd < 0 ? 'انتهى' : dd === 0 ? 'اليوم' : dd === 1 ? 'غداً' : 'بعد ' + dd + ' يوم';
        examBadge = '<span class="tt-exam" title="' + window.esc(dayExams.map(function(e){ return e.name + (e.time ? ' ' + e.time : ''); }).join(' • ')) + '">📝 ' + (dayExams.length > 1 ? dayExams.length + ' امتحانات' : window.esc(String(dayExams[0].name || 'امتحان').slice(0, 14))) + ' · ' + when + '</span>';
      }
      html += '<th' + (isToday ? ' data-today="1" style="background:var(--grad);color:var(--on-accent)"' : '') + (dayExams.length ? ' class="tt-exam-day"' : '') + '>' + DA[DE.indexOf(d)] +
        '<small class="tt-date">' + dt.getDate() + '/' + (dt.getMonth() + 1) + '</small>' + examBadge + '</th>';
    });
    html += '</tr></thead><tbody>';

    rows.forEach(function(item){
      if(item.type === 'gap'){
        var gm = item.to - item.from;
        html += '<tr><td colspan="' + (days.length + 1) + '" style="background:transparent;text-align:center;font-size:var(--fs-xs);color:var(--muted2);padding:6px">فجوة ' + ttDur(gm) + '</td></tr>';
        return;
      }
      var time = item.time, rowMin = ttMin(time);
      var isNowRow = isThisWeek && days.indexOf(todayKey) > -1 && Math.abs(rowMin - nowMin) <= 15;
      html += '<tr><td class="time-col"' + (isNowRow ? ' style="color:var(--red)"' : '') + '>' + time + '</td>';
      days.forEach(function(day){
        var tdStyle = (day === todayKey && isThisWeek) ? 'background:linear-gradient(180deg,rgba(34,211,238,.06),transparent)' : '';
        var en = entryAt(day, time);
        if(en){
          var cls = en.cls, e = ttMin(cls.end), hasEnd = e !== null && e > rowMin;
          var isNow = isThisWeek && day === todayKey && nowMin >= rowMin && nowMin < (hasEnd ? e : rowMin + 60);
          var isNext = !isNow && nextKey === en.key;
          var isBad = !!conf.keys[en.key];
          var place = (cls.building ? cls.building + (cls.room ? ' · ' : '') : '') + (cls.room || '');
          var tip = cls.name + ' — ' + time + (hasEnd ? '–' + ttPad(cls.end) + ' (' + ttDur(e - rowMin) + ')' : '') + (place ? ' — ' + place : '') + (cls.instructor ? ' — ' + cls.instructor : '') + (isBad ? ' — ⚠️ تعارض' : '');
          html += '<td style="' + tdStyle + '"><div class="class-block' + (isBad ? ' tt-conflict' : '') + (isNow ? ' tt-now' : '') + (isNext ? ' tt-next' : '') + '" data-edit="' + window.esc(en.key) + '" tabindex="0" role="button" title="' + window.esc(tip) + '">' +
            '<span class="name">' + window.esc(cls.name) + '</span>' +
            (hasEnd ? '<span class="tt-time"><bdi dir="ltr">' + time + '–' + ttPad(cls.end) + '</bdi> · ' + ttDur(e - rowMin) + '</span>' : '') +
            (place ? '<span class="room">📍 ' + window.esc(place) + '</span>' : '') +
            (cls.instructor ? '<span class="room">👤 ' + window.esc(cls.instructor) + '</span>' : '') +
            (isNow ? '<span class="tt-badge now">الآن</span>' : (isNext ? '<span class="tt-badge next">التالية</span>' : '')) +
            '</div></td>';
        } else {
          html += '<td style="' + tdStyle + '"><div class="cell-empty" data-add="' + day + '-' + time + '">+</div></td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody>';
    t.innerHTML = html;
    /* أعمدة أيام الامتحانات: تظليل خفيف لكل خلايا العمود */
    t.querySelectorAll('thead th').forEach(function(th, ci){ if(th.classList.contains('tt-exam-day')) t.querySelectorAll('tbody tr').forEach(function(tr){ if(tr.children.length > ci && tr.children[ci].tagName === 'TD') tr.children[ci].classList.add('tt-exam-col'); }); });

    /* الضغط على المحاضرة يفتح تفاصيلها (ومنها الوصول للمادة والتعديل)؛ Enter/مسافة بلوحة المفاتيح */
    var openClass = function(k){ if(window.showClassDetails) window.showClassDetails(k); else window.editClassSlot(k); };
    t.querySelectorAll('[data-edit]').forEach(function(b){
      b.addEventListener('click', function(){ openClass(b.dataset.edit); });
      b.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openClass(b.dataset.edit); } });
    });
    t.querySelectorAll('[data-add]').forEach(function(b){ b.addEventListener('click', function(){ window.addClassSlot(b.dataset.add); }); });

    t.className = 'timetable' + (view === 'week' ? '' : ' tt-day');

    /* موبايل + عرض الأسبوع: قائمة أجندة عمودية بدل الشبكة العريضة (بدون تمرير أفقي ولا خلايا ضيقة).
       تُرسم دائماً وتُعرض بـ CSS فقط على الشاشات الصغيرة، فتعمل مع تدوير الشاشة دون إعادة رسم. */
    var ttSec0 = document.getElementById('timetable');
    if(ttSec0) ttSec0.classList.toggle('tt-view-week', view === 'week');
    var wrap0 = t.parentNode, agenda = document.getElementById('ttAgenda');
    if(!agenda && wrap0 && wrap0.parentNode){
      agenda = document.createElement('div'); agenda.id = 'ttAgenda'; agenda.className = 'tt-agenda';
      wrap0.parentNode.insertBefore(agenda, wrap0.nextSibling);
    }
    if(agenda){
      var ah = '';
      allDays.forEach(function(d){
        var dt = ttDateOf(d, DE), ymd = ttYmd(dt), isTodayCol = d === todayKey && isThisWeek;
        var dayExams = ((window.space && window.space.exams) || []).filter(function(e){ return e.date === ymd; });
        var list = [];
        Object.keys(tt).forEach(function(k){
          var p = ttSplitKey(k); if(!p || p.day !== d || ttMin(p.time) === null) return;
          list.push({ key: k, time: ttPad(p.time), start: ttMin(p.time), cls: tt[k] });
        });
        list.sort(function(a, b){ return a.start - b.start; });
        ah += '<section class="tt-ag-day' + (isTodayCol ? ' today' : '') + '" aria-label="' + DA[DE.indexOf(d)] + '"><header><b>' + DA[DE.indexOf(d)] + '</b><span class="tt-ag-date"><bdi dir="ltr">' + dt.getDate() + '/' + (dt.getMonth() + 1) + '</bdi></span>' +
          (dayExams.length ? '<span class="tt-exam">📝 ' + (dayExams.length > 1 ? dayExams.length + ' امتحانات' : window.esc(dayExams[0].name)) + '</span>' : '') +
          '<button type="button" class="tt-ag-add" data-add="' + d + '-08:00" aria-label="إضافة محاضرة يوم ' + DA[DE.indexOf(d)] + '">＋</button></header>';
        if(!list.length) ah += '<div class="tt-ag-empty">لا محاضرات</div>';
        list.forEach(function(it){
          var e2 = ttMin(it.cls.end), hasEnd2 = e2 !== null && e2 > it.start;
          var isNow2 = isTodayCol && nowMin >= it.start && nowMin < (hasEnd2 ? e2 : it.start + 60), isNext2 = !isNow2 && nextKey === it.key, bad2 = !!conf.keys[it.key];
          var place2 = (it.cls.building ? it.cls.building + (it.cls.room ? ' · ' : '') : '') + (it.cls.room || '');
          ah += '<div class="tt-ag-item' + (isNow2 ? ' now' : isNext2 ? ' next' : '') + (bad2 ? ' bad' : '') + '" data-edit="' + window.esc(it.key) + '" tabindex="0" role="button">' +
            '<div class="tt-ag-time"><bdi dir="ltr">' + it.time + '</bdi>' + (hasEnd2 ? '<small><bdi dir="ltr">' + ttPad(it.cls.end) + '</bdi></small>' : '') + '</div>' +
            '<div class="tt-ag-body"><div class="tt-ag-name">' + window.esc(it.cls.name) + (isNow2 ? ' <span class="tt-badge now">الآن</span>' : isNext2 ? ' <span class="tt-badge next">التالية</span>' : '') + (bad2 ? ' <span title="تعارض">⚠️</span>' : '') + '</div>' +
            '<div class="tt-ag-meta">' + (hasEnd2 ? ttDur(e2 - it.start) : '') + (place2 ? (hasEnd2 ? ' · ' : '') + '📍 ' + window.esc(place2) : '') + (it.cls.instructor ? ' · 👤 ' + window.esc(it.cls.instructor) : '') + '</div></div></div>';
        });
        ah += '</section>';
      });
      agenda.innerHTML = ah;
      agenda.querySelectorAll('[data-edit]').forEach(function(b){
        b.addEventListener('click', function(){ openClass(b.dataset.edit); });
        b.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openClass(b.dataset.edit); } });
      });
      agenda.querySelectorAll('[data-add]').forEach(function(b){ b.addEventListener('click', function(){ window.addClassSlot(b.dataset.add); }); });
    }
    /* إذا في محاضرات: الجدول أولاً وكروت الإعداد (إضافة/أدوات) تنزل تحته */
    var ttSec = document.getElementById('timetable');
    if(ttSec) ttSec.classList.toggle('tt-has-data', anyKey);

    /* شريط التنقل بين الأيام */
    var wrap = t.parentNode, dbar = document.getElementById('ttDayBar');
    if(!dbar && wrap && wrap.parentNode){
      dbar = document.createElement('div'); dbar.id = 'ttDayBar'; dbar.className = 'tt-daybar';
      wrap.parentNode.insertBefore(dbar, wrap);
    }
    if(dbar){
      var wFirst = ttDateOf(allDays[0], DE), wLast = ttDateOf(allDays[allDays.length - 1], DE);
      var wLabel = (isThisWeek ? 'هذا الأسبوع' : (ttWeekOffset > 0 ? 'بعد ' + ttWeekOffset + ' أسبوع' : 'قبل ' + (-ttWeekOffset) + ' أسبوع')) +
        ' · ' + wFirst.getDate() + '/' + (wFirst.getMonth() + 1) + ' – ' + wLast.getDate() + '/' + (wLast.getMonth() + 1);
      /* صفّان: (1) تنقل الأسبوع + اليوم + أسهم الأيام  (2) شرائح الأيام القابلة للتمرير */
      var chips = '<div class="tt-row"><span class="tt-weeknav">' +
        '<button type="button" class="tt-step" data-wk="-1" aria-label="الأسبوع السابق" title="الأسبوع السابق">›</button>' +
        '<span class="tt-weeklabel">' + wLabel + '</span>' +
        '<button type="button" class="tt-step" data-wk="1" aria-label="الأسبوع التالي" title="الأسبوع التالي">‹</button></span>' +
        '<button type="button" class="tt-chip" data-view="today" title="العودة لليوم الحالي">اليوم</button>';
      if(view !== 'week') chips += '<button type="button" class="tt-step" data-day-step="-1" aria-label="اليوم السابق" title="اليوم السابق">›</button><button type="button" class="tt-step" data-day-step="1" aria-label="اليوم التالي" title="اليوم التالي">‹</button>';
      chips += '</div><div class="tt-row tt-days"><button type="button" class="tt-chip' + (view === 'week' ? ' active' : '') + '" data-view="week">الأسبوع</button>';
      allDays.forEach(function(d){
        chips += '<button type="button" class="tt-chip' + (view === d ? ' active' : '') + '" data-view="' + d + '">' + DA[DE.indexOf(d)] + (d === todayKey && isThisWeek ? ' •' : '') + '</button>';
      });
      chips += '</div>';
      dbar.innerHTML = chips;
      dbar.querySelectorAll('[data-view]').forEach(function(b){
        b.addEventListener('click', function(){
          if(b.dataset.view === 'today'){ ttWeekOffset = 0; ttSetView(allDays.indexOf(todayKey) > -1 ? todayKey : 'week'); }
          else ttSetView(b.dataset.view);
        });
      });
      dbar.querySelectorAll('[data-wk]').forEach(function(b){ b.addEventListener('click', function(){ ttWeekOffset += parseInt(b.dataset.wk, 10); window.renderTimetable(); }); });
      dbar.querySelectorAll('[data-day-step]').forEach(function(b){
        b.addEventListener('click', function(){
          var i = allDays.indexOf(view), step = parseInt(b.dataset.dayStep, 10);
          if(i < 0) return;
          ttSetView(allDays[(i + step + allDays.length) % allDays.length]);
        });
      });
      /* الشريحة النشطة قد تكون خارج الشاشة بالموبايل: نمرّر الشريط فقط (بدون تحريك الصفحة) */
      var act = dbar.querySelector('.tt-days .active'), scroller = act && act.parentNode;
      if(act && scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft += act.getBoundingClientRect().left + act.offsetWidth / 2 - (scroller.getBoundingClientRect().left + scroller.clientWidth / 2);
    }

    /* شريط تعارض واضح فوق الجدول (للعرض فقط — لا يمنع ولا يغيّر بيانات) */
    var bar = document.getElementById('ttConflictBar');
    if(!bar && wrap && wrap.parentNode){
      bar = document.createElement('div'); bar.id = 'ttConflictBar'; bar.className = 'tt-conflict-bar';
      wrap.parentNode.insertBefore(bar, wrap);
    }
    if(bar){
      if(!conf.list.length){ bar.style.display = 'none'; bar.innerHTML = ''; }
      else {
        var nm = function(k){ var c = tt[k], p = ttSplitKey(k); return window.esc(c.name) + ' (<bdi dir="ltr">' + ttPad(p.time) + (c.end ? '–' + ttPad(c.end) : '') + '</bdi>)'; };
        bar.style.display = '';
        bar.innerHTML = '⚠️ <b>' + conf.list.length + ' تعارض في الجدول</b> — ' + conf.list.slice(0, 3).map(function(x){
          return DA[DE.indexOf(x.day)] + ': ' + nm(x.a) + ' ↔ ' + nm(x.b);
        }).join(' · ') + (conf.list.length > 3 ? ' …' : '');
      }
    }

    /* موبايل: أول مرة يظهر فيها الجدول مع تمرير أفقي، نمرّر لعمود اليوم الحالي */
    if(view === 'week' && !ttScrolledOnce && wrap && wrap.offsetParent !== null && wrap.scrollWidth > wrap.clientWidth + 4){
      ttScrolledOnce = true;
      var th = t.querySelector('th[data-today]');
      if(th && th.scrollIntoView){ try{ th.scrollIntoView({ inline: 'center', block: 'nearest' }); }catch(e){} }
    }
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
    /* Alt+1..6: نفس ترتيب الشريط السفلي (الرئيسية، الجدول، موادي، المهام، الحضور، علاماتي) */
    if(e.altKey && !e.ctrlKey && !e.metaKey && /^[1-6]$/.test(e.key)){
      e.preventDefault();
      window.switchTab(['dashboard','timetable','courses','tasks','attendance','gradecalc'][parseInt(e.key, 10) - 1]);
      return;
    }
    if(e.altKey && e.key.toLowerCase() === 't'){ e.preventDefault(); window.switchTab('tasks'); setTimeout(window.addTask, 200); return; }
    if(e.altKey && e.key.toLowerCase() === 'n'){ e.preventDefault(); window.switchTab('notes'); setTimeout(window.addNote, 200); return; }
    if(e.altKey && e.key.toLowerCase() === 'p'){ e.preventDefault(); window.switchTab('timer'); return; }
    if(e.altKey && e.key.toLowerCase() === 'q'){ e.preventDefault(); window.openQuickCapture(); return; }
    if(e.key === 'Escape'){
      /* نوافذ التعديل (modal-backdrop) أعلى من لوحة الأوامر/نوافذ المادة، فتُغلق هي أولاً */
      if(!document.querySelector('.modal-backdrop') && window.HubUI && window.HubUI.closeTop()) return;
      var sr = document.getElementById('searchResults'); if(sr) sr.classList.remove('show');
      window.closeSidebar();
      window.closeSettingsMenu();
      document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
      /* شاشة العد التنازلي للامتحان (ملء الشاشة + تثبيت التمرير) */
      var ecs = document.getElementById('examCountdownScreen');
      if(ecs && ecs.classList.contains('open') && window.closeExamCountdown) window.closeExamCountdown();
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

  /* أقسام اللوحة الطويلة قابلة للطي: افتراضياً مطوية على الموبايل (و LMS دائماً)، والباقي مفتوح على الكمبيوتر.
     الأقسام تُبنى لاحقاً وبعضها يُعاد بناؤه عند كل رسم، فنستخدم observer + delegation. */
  var DASH_COLLAPSIBLE = ['insightsSection', 'enhancedStatsSection', 'lmsWidget'];
  function dashPrefs(){ try{ var v = JSON.parse(localStorage.getItem('dash_collapsed') || '{}'); return (v && typeof v === 'object') ? v : {}; }catch(e){ return {}; } }
  function dashIsCollapsed(id){
    var p = dashPrefs();
    if(p[id] !== undefined) return !!p[id];
    if(id === 'lmsWidget') return true; /* روابط LMS طويلة: مطوية افتراضياً */
    return !!(window.matchMedia && window.matchMedia('(max-width:600px)').matches);
  }
  function dashApply(){
    DASH_COLLAPSIBLE.forEach(function(id){
      var el = document.getElementById(id); if(!el) return;
      if(!el._dcInit){ el._dcInit = true; el.classList.add('dash-collapsible'); el.classList.toggle('dash-collapsed', dashIsCollapsed(id)); }
    });
  }
  function initDashCollapse(){
    var dash = document.getElementById('dashboard'); if(!dash || dash._dcBound) return;
    dash._dcBound = true;
    dash.addEventListener('click', function(e){
      var head = e.target.closest ? e.target.closest('.dash-collapsible > .card-head') : null;
      if(!head || e.target.closest('.card-action')) return;
      var card = head.parentNode, collapsed = !card.classList.contains('dash-collapsed');
      card.classList.toggle('dash-collapsed', collapsed);
      var p = dashPrefs(); p[card.id] = collapsed;
      try{ localStorage.setItem('dash_collapsed', JSON.stringify(p)); }catch(err){}
    });
    if(window.MutationObserver) new MutationObserver(dashApply).observe(dash, { childList: true, subtree: true });
    dashApply();
  }

  window.boot = async function(){
    console.log('🚀 Booting...');
    safeRun('Load local data', window.loadAllData);

    var serverData = null;
    if(window.SB){
      try{ serverData = await window.SB.load(); }catch(e){}
    }

    var pushLocalAfterBoot = false, conflictAfterBoot = false;
    if(serverData && serverData.data){
      var decision = decideSync(serverData);
      window.serverOnline = true;
      if(decision === 'apply'){
        console.log('☁️ Loaded from Supabase');
        safeRun('Apply server data', function(){ window.applyServerData(serverData.data); });
        var serverMs = toMs(serverData.updated_at);
        if(serverMs) window.S.set('ss_space_ts', serverMs);
        window.markSynced(serverData.updated_at);
      } else if(decision === 'keep-local'){
        /* النسخة المحلية فيها تعديلات غير مرفوعة — لا نكتب فوقها */
        console.log('💾 Local has unsynced edits — keeping local, will push');
        if(metaGet('ss_cloud_ver') === null) window.markSynced(serverData.updated_at, '__dirty__');
        pushLocalAfterBoot = true;
      } else {
        console.log('🔀 Edits on both sides — asking user');
        window.cloudSyncBlocked = true;
        conflictAfterBoot = true;
      }
    } else {
      console.log('💾 Using localStorage');
      window.serverOnline = false;
      /* فشل تحميل (مش "ما في صف"): امنع الرفع حتى لا نكتب فوق السحابة ببيانات محلية قد تكون فاضية */
      if(window.SB && window.SB.lastLoadStatus === 'error'){ window.cloudSyncBlocked = true; window.cloudLoadFailed = true; }
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
    safeRun('Dash collapse', initDashCollapse);
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
        document.documentElement.classList.remove('is-new');   /* الحالة جاءت من السحابة/ملف: لا ترحيب */
        setTimeout(function(){
          try{
            /* كرت ملخص واحد (تحية + مهام + امتحانات) بدل 3 تنبيهات متتالية */
            if(window.startupBrief) window.startupBrief(window.space.profile.name);
            else { window.toast(window.greetWord(new Date().getHours()) + ' ' + window.space.profile.name.split(' ')[0] + '! ☁️', 'success', 3000); window.checkReminders(); }
            setTimeout(window.checkSmartReminders, 4000);
          }catch(err){}
        }, 800);
      }
    });

    safeRun('Initial sync', function(){
      window.bootSyncing = false;
      window.setServerStatus(window.serverOnline ? 'ok' : 'off');
      if(conflictAfterBoot) setTimeout(function(){ window._conflictOpen = false; window.handleSyncConflict(); }, 600);
      else if(pushLocalAfterBoot || (!serverData && window.SB && window.SB.lastLoadStatus === 'empty')) window.doServerSave();
      else if(serverData && serverData.data && !window.cloudSyncBlocked && localDirty()) window.doServerSave();
    });

    setInterval(window.checkSmartReminders, 30 * 60 * 1000);

    /* تحديث "المحاضرة الجارية/التالية" كل دقيقة، فقط للعناصر الظاهرة وبدون مودال مفتوح */
    setInterval(function(){
      try{
        var tb = document.getElementById('timetableTable');
        if(tb && tb.offsetParent !== null && !document.querySelector('.modal-backdrop') && window.renderTimetable) window.renderTimetable();
      }catch(e){}
    }, 60000);

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