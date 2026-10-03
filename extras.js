/* ============================================================
   🎁 extras.js — إضافات وتحديثات
   - Fix 139→160 hours
   - Enhanced Stats Dashboard
   - Exam Countdown Screen
   - Onboarding تفاعلي
   - Confetti
   - Moodle HU Integration
   - Advanced Local AI
   ============================================================ */
(function(){
  'use strict';
  if(window._extrasLoaded) return;
  window._extrasLoaded = true;

  /* ============ Helpers ============ */
  function esc(s){ return window.esc ? window.esc(s) : String(s==null?'':s); }
  function toast(m,t,d){ if(window.toast) window.toast(m,t,d); }
  function space(){ return window.space || {}; }
  function getS(){ return window.S || {get:function(k,d){return d;},set:function(){}}; }
  function saveSpace(){ if(window.saveSpace) window.saveSpace(); }
  function today(){
    if(window.today) return window.today();
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  /* ============================================================
     1️⃣  FIX: الساعات الصحيحة 160
     ============================================================ */
  function patchDashboardTermProgress(){
    var tp = document.getElementById('dashTermProgress');
    if(!tp) return;
    var sp = space();
    var TOTAL = (window.TOTAL_REQUIRED_HOURS && window.TOTAL_REQUIRED_HOURS.total) || 160;

    var registered = (sp.courses || []).reduce(function(a,c){
      return a + (parseFloat(c.hours) || 0);
    }, 0);
    var pct = TOTAL > 0 ? Math.round(registered / TOTAL * 100) : 0;

    /* Progress by type */
    var DB = window.COURSES_DB || {};
    var byType = { 'uni-c':0, 'uni-e':0, 'faculty':0, 'major-c':0, 'major-e':0 };
    (sp.courses || []).forEach(function(c){
      var info = DB[c.name];
      if(info && byType[info.t] !== undefined) byType[info.t] += (parseFloat(c.hours) || info.h || 0);
    });

    var typeLabels = {
      'uni-c': {l:'جامعة إجبارية', total:18, color:'var(--cyan)'},
      'uni-e': {l:'جامعة اختيارية', total:6, color:'var(--purple)'},
      'faculty': {l:'كلية إجبارية', total:33, color:'var(--green)'},
      'major-c': {l:'تخصص إجباري', total:88, color:'var(--amber)'},
      'major-e': {l:'تخصص اختياري', total:15, color:'var(--pink)'}
    };

    var html = '<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:.88rem;flex-wrap:wrap;gap:8px">' +
      '<span style="color:var(--muted)">📚 <b style="color:var(--text)">' + registered + '</b> / ' + TOTAL + ' ساعة</span>' +
      '<span style="color:var(--cyan);font-weight:800">' + pct + '%</span></div>' +
      '<div class="sc-progress"><div class="sc-progress-fill" style="width:' + pct + '%"></div></div>';

    /* تفصيل حسب النوع */
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:14px">';
    Object.keys(typeLabels).forEach(function(k){
      var meta = typeLabels[k];
      var got = byType[k] || 0;
      var p = Math.round(got / meta.total * 100);
      html += '<div style="padding:8px 10px;background:var(--bg2);border-radius:9px">' +
        '<div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--muted);margin-bottom:5px">' +
        '<span>' + meta.l + '</span><span style="color:' + meta.color + ';font-weight:700">' + got + '/' + meta.total + '</span></div>' +
        '<div style="height:4px;background:var(--card);border-radius:4px;overflow:hidden">' +
        '<div style="height:100%;width:' + Math.min(100,p) + '%;background:' + meta.color + '"></div></div></div>';
    });
    html += '</div>';

    html += '<div style="text-align:center;color:var(--muted2);font-size:.75rem;margin-top:12px">باقي ' +
      Math.max(0, TOTAL - registered) + ' ساعة للتخرج</div>';

    tp.innerHTML = html;
  }

  /* Patch renderDashboard */
  if(typeof window.renderDashboard === 'function' && !window._dashTermPatched){
    var origDash = window.renderDashboard;
    window.renderDashboard = function(){
      var r = origDash.apply(this, arguments);
      setTimeout(patchDashboardTermProgress, 30);
      return r;
    };
    window._dashTermPatched = true;
  }

  /* ============================================================
     2️⃣  Confetti — احتفال عند الإنجاز
     ============================================================ */
  window.celebrate = function(intensity){
    intensity = intensity || 1;
    var count = 40 * intensity;
    var colors = ['#22d3ee','#a78bfa','#34d399','#fbbf24','#f472b6','#f87171'];
    for(var i = 0; i < count; i++){
      (function(i){
        setTimeout(function(){
          var p = document.createElement('div');
          p.className = 'confetti-piece';
          p.style.left = Math.random() * 100 + 'vw';
          p.style.background = colors[Math.floor(Math.random() * colors.length)];
          p.style.width = (6 + Math.random() * 8) + 'px';
          p.style.height = (6 + Math.random() * 8) + 'px';
          p.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
          p.style.animationDelay = (Math.random() * 0.3) + 's';
          p.style.animationDuration = (2 + Math.random() * 1.5) + 's';
          document.body.appendChild(p);
          setTimeout(function(){ p.remove(); }, 4500);
        }, i * 12);
      })(i);
    }
  };

  /* Patch toggleTask — احتفال عند إكمال */
  if(typeof window.toggleTask === 'function' && !window._toggleTaskPatched){
    var origToggle = window.toggleTask;
    window.toggleTask = function(id){
      var t = (space().tasks || []).find(function(x){ return x.id === id; });
      var wasDone = t && t.done;
      var r = origToggle.apply(this, arguments);
      if(t && t.done && !wasDone){
        /* عد المهام المكتملة اليوم */
        var doneToday = (space().tasks || []).filter(function(x){
          return x.done && x.completedAt === today();
        }).length;
        if(doneToday % 3 === 0) window.celebrate(2);
        else window.celebrate(1);
      }
      return r;
    };
    window._toggleTaskPatched = true;
  }

  /* Patch completeSession — احتفال */
  if(typeof window.completeSession === 'function' && !window._sessionPatched){
    var origSession = window.completeSession;
    window.completeSession = function(){
      var r = origSession.apply(this, arguments);
      window.celebrate(2);
      return r;
    };
    window._sessionPatched = true;
  }

  /* ============================================================
     3️⃣  Enhanced Stats Dashboard
     ============================================================ */
  function buildEnhancedStats(){
    var container = document.getElementById('enhancedStatsSection');
    if(container) container.remove();

    var studyLog = getS().get('studyLog', {}) || {};
    var now = new Date();
    var sp = space();

    /* 7 days */
    var days = [];
    for(var i = 6; i >= 0; i--){
      var d = new Date(); d.setDate(d.getDate() - i);
      var ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      days.push({date: ds, min: studyLog[ds] || 0});
    }
    var totalWeek = days.reduce(function(a,d){ return a + d.min; }, 0);
    var avgDay = Math.round(totalWeek / 7);
    var bestDay = Math.max.apply(null, days.map(function(d){ return d.min; }).concat([0]));
    var sessions = getS().get('pomoSessions', 0) || 0;
    var totalMin = Object.values(studyLog).reduce(function(a,v){ return a + (Number(v) || 0); }, 0);
    var totalHrs = (totalMin / 60).toFixed(1);

    /* Completion */
    var totalTasks = (sp.tasks || []).length;
    var doneTasks = (sp.tasks || []).filter(function(t){ return t.done; }).length;
    var completion = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;

    /* Streak */
    var streak = 0, check = new Date();
    for(var i = 0; i < 365; i++){
      var ds2 = check.getFullYear()+'-'+String(check.getMonth()+1).padStart(2,'0')+'-'+String(check.getDate()).padStart(2,'0');
      if(studyLog[ds2] && studyLog[ds2] > 0) streak++;
      else if(i > 0) break;
      check.setDate(check.getDate() - 1);
    }

    /* Donut data - hours per course type */
    var DB = window.COURSES_DB || {};
    var byType = { 'uni-c':0, 'uni-e':0, 'faculty':0, 'major-c':0, 'major-e':0 };
    (sp.courses || []).forEach(function(c){
      var info = DB[c.name];
      if(info && byType[info.t] !== undefined) byType[info.t] += (parseFloat(c.hours) || info.h || 3);
    });
    var donutColors = { 'uni-c':'#22d3ee', 'uni-e':'#a78bfa', 'faculty':'#34d399', 'major-c':'#fbbf24', 'major-e':'#f472b6' };
    var donutLabels = { 'uni-c':'جامعة إجبارية', 'uni-e':'جامعة اختيارية', 'faculty':'كلية', 'major-c':'تخصص إجباري', 'major-e':'تخصص اختياري' };

    var total = Object.values(byType).reduce(function(a,b){ return a + b; }, 0);
    var offset = 0;
    var donutSvg = '<svg viewBox="0 0 100 100"><circle class="donut-bg" cx="50" cy="50" r="40"/>';
    if(total > 0){
      Object.keys(byType).forEach(function(k){
        if(!byType[k]) return;
        var pct = byType[k] / total;
        var dash = 2 * Math.PI * 40 * pct;
        var gap = 2 * Math.PI * 40 - dash;
        donutSvg += '<circle class="donut-seg" cx="50" cy="50" r="40" ' +
          'stroke="' + donutColors[k] + '" ' +
          'stroke-dasharray="' + dash + ' ' + gap + '" ' +
          'stroke-dashoffset="' + (-offset) + '"/>';
        offset += dash;
      });
    }
    donutSvg += '</svg>';

    var legendHtml = '';
    Object.keys(byType).forEach(function(k){
      if(!byType[k]) return;
      legendHtml += '<div class="donut-legend-item">' +
        '<div class="dot" style="background:' + donutColors[k] + '"></div>' +
        '<div class="lbl">' + donutLabels[k] + '</div>' +
        '<div class="val">' + byType[k] + ' س</div></div>';
    });

    /* Build section */
    var dash = document.getElementById('dashboard');
    if(!dash) return;
    var sec = document.createElement('div');
    sec.id = 'enhancedStatsSection';
    sec.className = 'card';
    sec.style.marginTop = '16px';
    sec.innerHTML =
      '<div class="card-head"><h3>📊 إحصائيات متقدمة</h3>' +
      '<span class="card-action" id="enhStatsRefresh">🔄 تحديث</span></div>' +

      '<div class="stats-hero">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">' +
          '<div>' +
            '<div class="big-num">' + totalHrs + '</div>' +
            '<div class="big-lbl">إجمالي ساعات الدراسة</div>' +
          '</div>' +
          '<div style="text-align:center">' +
            '<div style="font-size:2rem;line-height:1">' + (streak > 0 ? '🔥' : '💤') + '</div>' +
            '<div style="font-size:1.4rem;font-weight:900;color:var(--amber)">' + streak + '</div>' +
            '<div style="font-size:.68rem;color:var(--muted)">يوم متتالي</div>' +
          '</div>' +
        '</div>' +
        '<div class="stats-grid">' +
          '<div class="stats-tile"><div class="v">' + (totalWeek/60).toFixed(1) + '</div><div class="l">ساعات الأسبوع</div></div>' +
          '<div class="stats-tile"><div class="v">' + avgDay + '</div><div class="l">متوسط يومي (د)</div></div>' +
          '<div class="stats-tile"><div class="v">' + bestDay + '</div><div class="l">أفضل يوم (د)</div></div>' +
          '<div class="stats-tile"><div class="v">' + sessions + '</div><div class="l">جلسات بومودورو</div></div>' +
          '<div class="stats-tile"><div class="v">' + completion + '%</div><div class="l">إنجاز المهام</div></div>' +
          '<div class="stats-tile"><div class="v">' + (sp.courses||[]).length + '</div><div class="l">مواد</div></div>' +
        '</div>' +
      '</div>' +

      '<div class="chart-container" style="margin-top:16px">' +
        '<div class="chart-title">📚 توزيع الساعات على الأنواع</div>' +
        '<div class="donut-wrap">' +
          '<div class="donut">' + donutSvg +
            '<div class="donut-center">' +
              '<div class="n">' + total + '</div>' +
              '<div class="t">ساعة</div>' +
            '</div>' +
          '</div>' +
          '<div class="donut-legend">' + (legendHtml || '<div style="color:var(--muted);font-size:.85rem">أضف مواد أولاً</div>') + '</div>' +
        '</div>' +
      '</div>';

    var lastCard = null;
    for(var i = 0; i < dash.children.length; i++){
      var ch = dash.children[i];
      if(ch.classList && ch.classList.contains('card')) lastCard = ch;
    }
    try{
      if(lastCard && lastCard.parentNode === dash) dash.insertBefore(sec, lastCard);
      else dash.appendChild(sec);
    }catch(e){ dash.appendChild(sec); }

    var refresh = document.getElementById('enhStatsRefresh');
    if(refresh){
      refresh.addEventListener('click', function(){
        buildEnhancedStats();
        toast('تم التحديث', 'success');
      });
    }
  }

  /* Patch renderDashboard */
  if(typeof window.renderDashboard === 'function' && !window._enhStatsPatched){
    var origDash2 = window.renderDashboard;
    window.renderDashboard = function(){
      var r = origDash2.apply(this, arguments);
      setTimeout(buildEnhancedStats, 50);
      return r;
    };
    window._enhStatsPatched = true;
  }

  /* ============================================================
     4️⃣  Exam Countdown Screen
     ============================================================ */
  function buildExamCountdownScreen(){
    if(document.getElementById('examCountdownScreen')) return;
    var screen = document.createElement('div');
    screen.id = 'examCountdownScreen';
    screen.className = 'exam-countdown-screen';
    screen.innerHTML =
      '<div class="ecs-header">' +
        '<h2>⏳ العد التنازلي للامتحان</h2>' +
        '<button class="btn btn-sm btn-ghost" id="ecsClose">✕ إغلاق</button>' +
      '</div>' +
      '<div class="ecs-body">' +
        '<div class="ecs-ring">' +
          '<svg viewBox="0 0 100 100">' +
            '<defs><linearGradient id="ecsGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
              '<stop offset="0%" stop-color="#22d3ee"/>' +
              '<stop offset="100%" stop-color="#a78bfa"/>' +
            '</linearGradient></defs>' +
            '<circle class="bg" cx="50" cy="50" r="44"/>' +
            '<circle class="fg" id="ecsRing" cx="50" cy="50" r="44" ' +
              'stroke-dasharray="' + (2 * Math.PI * 44) + '" stroke-dashoffset="0"/>' +
          '</svg>' +
          '<div class="ecs-ring-inner">' +
            '<div class="d" id="ecsDays">0</div>' +
            '<div class="u" id="ecsDaysLabel">يوم</div>' +
          '</div>' +
        '</div>' +
        '<div class="ecs-title" id="ecsTitle">—</div>' +
        '<div class="ecs-meta" id="ecsMeta">—</div>' +
        '<div class="ecs-checklist" id="ecsChecklist">' +
          '<h4>📋 قائمة المراجعة</h4>' +
          '<div id="ecsChecklistItems"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(screen);

    screen.querySelector('#ecsClose').addEventListener('click', closeExamCountdown);
  }

  var _ecsTick = null;
  function openExamCountdown(examId){
    var exam = (space().exams || []).find(function(e){ return e.id === examId; });
    if(!exam){ toast('الامتحان غير موجود', 'warn'); return; }
    var screen = document.getElementById('examCountdownScreen');
    if(!screen) return;

    document.getElementById('ecsTitle').textContent = '📝 ' + exam.name;
    var meta = [];
    if(exam.course) meta.push('📚 ' + exam.course);
    if(exam.date) meta.push('📅 ' + exam.date);
    if(exam.time) meta.push('⏰ ' + exam.time);
    if(exam.room) meta.push('📍 ' + exam.room);
    document.getElementById('ecsMeta').innerHTML = meta.join(' · ');

    /* Checklist */
    var checkKey = 'exam_checklist_' + examId;
    var checks = getS().get(checkKey, []);
    var defaultChecks = [
      'راجعت السلايدات',
      'حليت أسئلة سابقة',
      'لخصت الفصول المهمة',
      'جهزت الأدوات (آلة، قلم)',
      'نمت كفاية قبل الامتحان'
    ];
    if(!checks.length){
      checks = defaultChecks.map(function(t){ return {text: t, done: false}; });
    }
    renderChecklist(examId, checks, checkKey);

    screen.classList.add('open');
    document.body.style.overflow = 'hidden';

    function tick(){
      var now = new Date().getTime();
      var examDt = new Date(exam.date + 'T' + (exam.time || '08:00')).getTime();
      var diff = examDt - now;
      if(diff < 0){
        document.getElementById('ecsDays').textContent = '0';
        document.getElementById('ecsDaysLabel').textContent = 'بدأ';
        return;
      }
      var days = Math.floor(diff / 86400000);
      var hours = Math.floor((diff % 86400000) / 3600000);
      var mins = Math.floor((diff % 3600000) / 60000);

      var totalMs = 30 * 86400000;
      var progress = Math.min(1, Math.max(0, 1 - (diff / totalMs)));
      var ring = document.getElementById('ecsRing');
      if(ring) ring.style.strokeDashoffset = 2 * Math.PI * 44 * progress;

      document.getElementById('ecsDays').textContent = days;
      if(days > 0) document.getElementById('ecsDaysLabel').textContent = 'يوم';
      else if(hours > 0) document.getElementById('ecsDaysLabel').textContent = 'ساعة ' + hours;
      else document.getElementById('ecsDaysLabel').textContent = mins + ' دقيقة';
    }
    tick();
    if(_ecsTick) clearInterval(_ecsTick);
    _ecsTick = setInterval(tick, 1000);
  }

  function renderChecklist(examId, checks, checkKey){
    var items = document.getElementById('ecsChecklistItems');
    if(!items) return;
    var html = '';
    checks.forEach(function(c, i){
      html += '<label class="ecs-check-item ' + (c.done ? 'done' : '') + '">' +
        '<input type="checkbox" data-check-idx="' + i + '" ' + (c.done ? 'checked' : '') + '>' +
        '<span>' + esc(c.text) + '</span></label>';
    });
    items.innerHTML = html;
    items.querySelectorAll('[data-check-idx]').forEach(function(cb){
      cb.addEventListener('change', function(){
        var idx = parseInt(cb.dataset.checkIdx, 10);
        checks[idx].done = cb.checked;
        getS().set(checkKey, checks);
        cb.closest('.ecs-check-item').classList.toggle('done', cb.checked);
        var done = checks.filter(function(c){ return c.done; }).length;
        if(done === checks.length && checks.length){
          window.celebrate(2);
          toast('🎉 جاهز للامتحان!', 'success', 3000);
        }
      });
    });
  }

  function closeExamCountdown(){
    var screen = document.getElementById('examCountdownScreen');
    if(screen) screen.classList.remove('open');
    document.body.style.overflow = '';
    if(_ecsTick){ clearInterval(_ecsTick); _ecsTick = null; }
  }

  window.openExamCountdown = openExamCountdown;

  /* Patch renderExams — أضف زر العد التنازلي */
  if(typeof window.renderExams === 'function' && !window._ecsPatched){
    var origExams = window.renderExams;
    window.renderExams = function(){
      var r = origExams.apply(this, arguments);
      setTimeout(function(){
        document.querySelectorAll('.exam-card').forEach(function(card){
          if(card.querySelector('.ecs-btn')) return;
          var editBtn = card.querySelector('[data-edit-exam]');
          if(!editBtn) return;
          var id = editBtn.dataset.editExam;
          var btn = document.createElement('button');
          btn.className = 'btn btn-sm ecs-btn';
          btn.style.background = 'var(--grad-soft)';
          btn.style.color = 'var(--cyan)';
          btn.textContent = '⏳';
          btn.title = 'العد التنازلي';
          btn.addEventListener('click', function(e){
            e.stopPropagation();
            window.openExamCountdown(id);
          });
          editBtn.parentNode.insertBefore(btn, editBtn);
        });
      }, 50);
      return r;
    };
    window._ecsPatched = true;
  }

  /* ============================================================
     5️⃣  Onboarding تفاعلي
     ============================================================ */
  var ONB_KEY = 'ss_onboarding_done_v1';
  var ONB_STEPS = [
    {
      icon: '📚',
      title: 'أهلاً بك في مساحتك الدراسية!',
      body: 'مساعدك الذكي لإدارة موادك، مهامك، جدولك، ومعدلك — كل شي في مكان واحد.'
    },
    {
      icon: '📝',
      title: 'أضف مهامك وامتحاناتك',
      body: 'تابع واجباتك مع تنبيهات ذكية قبل الموعد. اضغط زر ➕ لإضافة سريعة أو ⚡ للكتابة السريعة.'
    },
    {
      icon: '📅',
      title: 'جدولك الأسبوعي بضغطة',
      body: 'روح لتبويب "الجدول" → اضغط "➕ إضافة جدول" → اكتب رقم المادة ونعبي الباقي تلقائياً.'
    },
    {
      icon: '⏱️',
      title: 'ركّز مع البومودورو',
      body: '25 دقيقة تركيز + 5 راحة. افتح "وضع التركيز" 🎯 من الشريط الجانبي للتجربة الكاملة.'
    },
    {
      icon: '🤖',
      title: 'اسأل مساعدك الذكي',
      body: 'اضغط زر 🤖 واسأل: "شو مهامي؟" · "كم ساعة درست اليوم؟" · "خططلي يومي".'
    }
  ];

  function showOnboarding(){
    var overlay = document.getElementById('onbOverlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'onbOverlay';
      overlay.className = 'onb-overlay';
      document.body.appendChild(overlay);
    }
    var step = 0;
    function render(){
      var s = ONB_STEPS[step];
      var dots = '';
      for(var i = 0; i < ONB_STEPS.length; i++){
        dots += '<div class="dot ' + (i === step ? 'active' : '') + '"></div>';
      }
      overlay.innerHTML =
        '<div class="onb-card">' +
          '<div class="onb-icon">' + s.icon + '</div>' +
          '<h3>' + s.title + '</h3>' +
          '<p>' + s.body + '</p>' +
          '<div class="onb-dots">' + dots + '</div>' +
          '<div class="onb-actions">' +
            '<button class="onb-skip" id="onbSkip">تخطي</button>' +
            '<button class="onb-next" id="onbNext">' +
              (step === ONB_STEPS.length - 1 ? '🚀 ابدأ' : 'التالي →') +
            '</button>' +
          '</div>' +
        '</div>';
      overlay.classList.add('show');

      overlay.querySelector('#onbSkip').addEventListener('click', function(){
        getS().set(ONB_KEY, true);
        overlay.classList.remove('show');
      });
      overlay.querySelector('#onbNext').addEventListener('click', function(){
        if(step === ONB_STEPS.length - 1){
          getS().set(ONB_KEY, true);
          overlay.classList.remove('show');
          window.celebrate(2);
          toast('🚀 رحلتك بدأت!', 'success', 3000);
        } else {
          step++;
          render();
        }
      });
    }
    render();
  }

  window.showOnboarding = showOnboarding;

  /* Auto-show at first run (بعد welcome) */
  setTimeout(function(){
    var welcomeDone = getS().get('welcomeDone', false);
    var onbDone = getS().get(ONB_KEY, false);
    if(welcomeDone && !onbDone){
      setTimeout(showOnboarding, 1500);
    }
  }, 2000);

  /* زر في الإعدادات */
  function injectOnbBtn(){
    var menu = document.getElementById('settingsMenu');
    if(!menu || menu.querySelector('#onbBtn')) return;
    var btn = document.createElement('button');
    btn.className = 'settings-item';
    btn.id = 'onbBtn';
    btn.innerHTML = '<span>🎓</span> جولة تعريفية';
    btn.addEventListener('click', function(){
      if(window.closeSettingsMenu) window.closeSettingsMenu();
      getS().set(ONB_KEY, false);
      showOnboarding();
    });
    menu.appendChild(btn);
  }

  /* ============================================================
     6️⃣  Moodle HU Integration
     ============================================================ */
  var LMS_LINKS = [
    { icon:'📖', title:'LMS HU — الرئيسية',   desc:'منصة التعلم الإلكتروني',          url:'https://lms.hu.edu.jo/my/' },
    { icon:'📅', title:'التقويم',              desc:'مواعيد الواجبات والاختبارات',     url:'https://lms.hu.edu.jo/calendar/view.php?view=month' },
    { icon:'📝', title:'واجباتي',              desc:'كل الواجبات المطلوبة',            url:'https://lms.hu.edu.jo/my/' },
    { icon:'📊', title:'علاماتي',              desc:'نقاط التقويم والواجبات',          url:'https://lms.hu.edu.jo/grade/report/overview/index.php' },
    { icon:'💬', title:'المنتديات',            desc:'نقاشات المواد',                   url:'https://lms.hu.edu.jo/mod/forum/index.php' },
    { icon:'🎓', title:'بوابة الطالب',          desc:'العلامات والرسوم والجدول',        url:'https://reg1.hu.edu.jo/' }
  ];

  var TEAMS_LINKS = [
    { icon:'💬', title:'Microsoft Teams',      desc:'المحاضرات والاجتماعات',           url:'https://teams.microsoft.com/' },
    { icon:'📧', title:'Outlook الجامعي',       desc:'البريد الرسمي',                   url:'https://outlook.office.com/mail/' },
    { icon:'📁', title:'OneDrive',              desc:'الملفات والتخزين السحابي',        url:'https://onedrive.live.com/' },
    { icon:'📅', title:'تقويم Outlook',         desc:'مواعيدك من Teams و Office',       url:'https://outlook.office.com/calendar/' }
  ];

  function injectMoodleWidget(){
    var dash = document.getElementById('dashboard');
    if(!dash || document.getElementById('lmsWidget')) return;

    var sec = document.createElement('div');
    sec.id = 'lmsWidget';
    sec.className = 'card moodle-widget';
    sec.style.marginTop = '16px';

    var html = '';

    /* === LMS قسم === */
    html += '<div class="card-head" style="margin-bottom:10px">' +
      '<h3>🎓 LMS HU — روابط سريعة</h3>' +
      '<span class="card-action" style="color:#ff9800;font-size:.7rem;font-family:monospace">lms.hu.edu.jo</span>' +
      '</div>';

    LMS_LINKS.forEach(function(l){
      html += '<a class="moodle-link" href="' + l.url + '" target="_blank" rel="noopener">' +
        '<div class="moodle-icon">' + l.icon + '</div>' +
        '<div class="moodle-info">' +
          '<div class="moodle-title">' + l.title + '</div>' +
          '<div class="moodle-desc">' + l.desc + '</div>' +
        '</div>' +
        '<div style="color:var(--muted2)">←</div>' +
      '</a>';
    });

    /* === Teams قسم === */
    html += '<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">' +
      '<div class="card-head" style="margin-bottom:10px">' +
      '<h3 style="font-size:.9rem">💬 Microsoft Teams</h3>' +
      '<span class="card-action" style="color:#6264A7;font-size:.7rem;font-family:monospace">teams.microsoft.com</span>' +
      '</div>';

    TEAMS_LINKS.forEach(function(l){
      html += '<a class="moodle-link" href="' + l.url + '" target="_blank" rel="noopener" style="border-color:rgba(98,100,167,.3)">' +
        '<div class="moodle-icon" style="background:linear-gradient(135deg,#6264A7,#5059C9)">' + l.icon + '</div>' +
        '<div class="moodle-info">' +
          '<div class="moodle-title">' + l.title + '</div>' +
          '<div class="moodle-desc">' + l.desc + '</div>' +
        '</div>' +
        '<div style="color:var(--muted2)">←</div>' +
      '</a>';
    });
    html += '</div>';

    /* === .ics import === */
    html += '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">' +
      '<div style="font-size:.8rem;color:var(--muted);margin-bottom:10px;line-height:1.7">' +
        '📥 <b>استيراد تقويم LMS:</b> نزّل ملف <code>.ics</code> من LMS → استورده هنا لدمج الواجبات مع جدولك.' +
      '</div>' +
      '<button class="btn btn-sm" id="moodleImportBtn">📅 استيراد تقويم (.ics)</button>' +
      '<input type="file" id="moodleIcsFile" accept=".ics,text/calendar" style="display:none">' +
    '</div>';

    sec.innerHTML = html;

    var lastCard = null;
    for(var i = 0; i < dash.children.length; i++){
      var ch = dash.children[i];
      if(ch.classList && ch.classList.contains('card')) lastCard = ch;
    }
    try{
      if(lastCard && lastCard.parentNode === dash) dash.insertBefore(sec, lastCard);
      else dash.appendChild(sec);
    }catch(e){ dash.appendChild(sec); }

    var importBtn = document.getElementById('moodleImportBtn');
    var fileInput = document.getElementById('moodleIcsFile');
    if(importBtn && fileInput){
      importBtn.addEventListener('click', function(){ fileInput.click(); });
      fileInput.addEventListener('change', function(e){
        var f = e.target.files[0];
        if(f) parseMoodleIcs(f);
        fileInput.value = '';
      });
    }
  }

  /* Simple .ics parser for Moodle */
  function parseMoodleIcs(file){
    var reader = new FileReader();
    reader.onload = function(e){
      try{
        var text = String(e.target.result || '');
        /* Unfold lines */
        text = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
        var events = text.split('BEGIN:VEVENT').slice(1);
        var imported = 0;
        var sp = space();
        if(!sp.tasks) sp.tasks = [];
        if(!sp.exams) sp.exams = [];

        events.forEach(function(block){
          var get = function(key){
            var m = block.match(new RegExp(key + '[^:]*:([^\\r\\n]+)'));
            return m ? m[1].trim() : '';
          };
          var summary = get('SUMMARY').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\n/g,' ');
          var dtstart = get('DTSTART');
          if(!summary || !dtstart) return;
          /* Parse YYYYMMDD or YYYYMMDDTHHMMSS */
          var m = dtstart.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
          if(!m) return;
          var date = m[1] + '-' + m[2] + '-' + m[3];
          var time = m[4] ? m[4] + ':' + m[5] : '';

          var isExam = /exam|امتحان|اختبار|midterm|final/i.test(summary);
          if(isExam){
            sp.exams.push({
              id: (window.uid ? window.uid() : Date.now() + Math.random()),
              name: summary, course: '', date: date, time: time, room: ''
            });
          } else {
            sp.tasks.push({
              id: (window.uid ? window.uid() : Date.now() + Math.random()),
              title: summary, type: 'assignment', course: '',
              due: date, done: false, source: 'moodle'
            });
          }
          imported++;
        });

        if(imported > 0){
          saveSpace();
          if(window.renderTasks) window.renderTasks();
          if(window.renderExams) window.renderExams();
          if(window.renderDashboard) window.renderDashboard();
          window.celebrate(2);
          toast('✅ استوردت ' + imported + ' عنصر من Moodle', 'success', 4000);
        } else {
          toast('⚠️ ما لقيت أحداث في الملف', 'warn', 3000);
        }
      }catch(err){
        console.error(err);
        toast('فشل تحليل الملف', 'warn', 3000);
      }
    };
    reader.readAsText(file);
  }

  /* ============================================================
     7️⃣  Advanced Local AI
     ============================================================ */
  /* Patch aiRespond with context awareness */
  var AI_CONTEXT = { lastTopic: null, history: [] };

  function getContext(){
    var sp = space();
    var now = new Date();
    var todayStr = today();   // ✅ اسم مختلف
    return {
      space: sp,
      today: todayStr,
      now: now,
      hour: now.getHours(),
      tasks: (sp.tasks || []).filter(function(t){ return !t.done; }),
      overdue: (sp.tasks || []).filter(function(t){ return !t.done && t.due && t.due < todayStr; }),
      todayTasks: (sp.tasks || []).filter(function(t){ return !t.done && t.due === todayStr; }),
      exams: (sp.exams || []).slice().sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); }),
      courses: sp.courses || [],
      budget: sp.budget || [],
      studyLog: getS().get('studyLog', {}) || {},
      streak: (function(){
        var streak = 0, check = new Date(), log = getS().get('studyLog', {}) || {};
        for(var i = 0; i < 365; i++){
          var ds = check.getFullYear()+'-'+String(check.getMonth()+1).padStart(2,'0')+'-'+String(check.getDate()).padStart(2,'0');
          if(log[ds] && log[ds] > 0) streak++;
          else if(i > 0) break;
          check.setDate(check.getDate() - 1);
        }
        return streak;
      })()
    };
  }

  function advancedAI(text){
    var t = String(text || '').trim();
    if(!t) return 'اكتب سؤالك 🙂';
    var lower = t.toLowerCase();
    var c = getContext();
    var name = (c.space.profile && c.space.profile.name) || 'صديقي';

    /* Greetings */
    if(/^(سلام|هلا|مرحبا|هاي|صباح|مساء|أهلا)/.test(lower)){
      var g = c.hour < 12 ? 'صباح الخير' : 'مساء الخير';
      var parts = [g + ' ' + name + '! 👋'];
      if(c.overdue.length) parts.push('⚠️ عندك ' + c.overdue.length + ' مهمة متأخرة');
      else if(c.todayTasks.length) parts.push('📌 ' + c.todayTasks.length + ' مهمة اليوم');
      if(c.streak > 0) parts.push('🔥 ' + c.streak + ' يوم دراسة متواصل!');
      return parts.join('\n');
    }

    /* Tasks summary */
    if(/(مهام|مهمة|واجب|واجبات|task|todo)/.test(lower)){
      if(!c.tasks.length) return '✨ ما عندك مهام مفتوحة! استمتع بوقتك.';
      var out = ['📝 عندك ' + c.tasks.length + ' مهمة مفتوحة:'];
      if(c.overdue.length) out.push('⚠️ متأخرة: ' + c.overdue.length);
      c.tasks.slice(0, 6).forEach(function(task){
        var d = task.due ? Math.ceil((new Date(task.due) - new Date(c.today)) / 86400000) : null;
        var when = d === null ? '' : d < 0 ? ' [متأخرة]' : d === 0 ? ' [اليوم]' : d === 1 ? ' [غدًا]' : ' [بعد ' + d + 'ي]';
        out.push('• ' + task.title + when);
      });
      return out.join('\n');
    }

    /* Exams */
    if(/(امتحان|امتحانات|اختبار|exam)/.test(lower)){
      if(!c.exams.length) return '✨ ما عندك امتحانات مسجلة.';
      var out2 = ['⏳ امتحاناتك القادمة:'];
      c.exams.slice(0, 5).forEach(function(e){
        var d = Math.ceil((new Date(e.date) - new Date(c.today)) / 86400000);
        var when = d < 0 ? 'انتهى' : d === 0 ? 'اليوم!' : d === 1 ? 'غدًا!' : 'بعد ' + d + ' يوم';
        out2.push('• ' + e.name + ' — ' + when);
      });
      return out2.join('\n');
    }

    /* "خططلي يومي" — planning */
    if(/(خطط|خطة|نظم|نظّم|plan|plan my)/.test(lower)){
      var plan = ['📋 خطة اليوم المقترحة:'];
      if(c.todayTasks.length){
        plan.push('');
        plan.push('🔴 مهام اليوم:');
        c.todayTasks.slice(0, 3).forEach(function(t){ plan.push('  • ' + t.title); });
      }
      if(c.overdue.length){
        plan.push('');
        plan.push('⚠️ متأخرة (ابدأ بها):');
        c.overdue.slice(0, 2).forEach(function(t){ plan.push('  • ' + t.title); });
      }
      if(c.exams.length){
        var nearExam = c.exams.find(function(e){
          return Math.ceil((new Date(e.date) - new Date(c.today)) / 86400000) <= 7;
        });
        if(nearExam){
          plan.push('');
          plan.push('📝 مراجعة للامتحان: ' + nearExam.name);
        }
      }
      plan.push('');
      plan.push('💡 ابدأ بجلسة 25 دقيقة (بومودورو)');
      return plan.join('\n');
    }

    /* "كم درست اليوم / هذا الأسبوع" */
    if(/(كم درست|ساعات|دراسة|study hours|كم ساعة)/.test(lower)){
      var todayMin = c.studyLog[c.today] || 0;
      var weekMin = 0;
      for(var i = 0; i < 7; i++){
        var dd = new Date(); dd.setDate(dd.getDate() - i);
        var ds = dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');
        weekMin += c.studyLog[ds] || 0;
      }
      return '⏱️ إحصائياتك:\n' +
        '• اليوم: ' + todayMin + ' دقيقة\n' +
        '• هذا الأسبوع: ' + (weekMin/60).toFixed(1) + ' ساعة\n' +
        '• سلسلة: ' + c.streak + ' يوم 🔥';
    }

    /* Budget */
    if(/(ميزانية|فلوس|رصيد|مصروف|دخل|صرفت|دفعت|budget|money)/.test(lower)){
      var inc = 0, exp = 0;
      c.budget.forEach(function(b){
        var a = parseFloat(b.amount) || 0;
        if(b.type === 'income') inc += a; else exp += a;
      });
      var bal = inc - exp;
      return '💰 ميزانيتك:\n' +
        '📈 دخل: ' + inc.toFixed(0) + ' د\n' +
        '📉 مصروف: ' + exp.toFixed(0) + ' د\n' +
        '💼 رصيد: ' + bal.toFixed(0) + ' د' +
        (bal < 0 ? '\n⚠️ أنت بالعجز!' : '');
    }

    /* GPA */
    if(/(معدل|gpa|علامات|درجات|تقدير)/.test(lower)){
      var gpaEl = document.getElementById('gpaVal');
      var gradeEl = document.getElementById('gpaGrade');
      if(gpaEl && parseFloat(gpaEl.textContent) > 0){
        return '📊 معدلك التراكمي: ' + gpaEl.textContent +
          (gradeEl && gradeEl.textContent !== '—' ? ' (' + gradeEl.textContent + ')' : '');
      }
      var courses = c.courses.length;
      return courses ? '📊 عندك ' + courses + ' مادة مسجلة. روح لـ "علاماتي" لحساب المعدل.' : '📊 ما عندك مواد مسجلة بعد.';
    }

    /* Study advice — contextual */
    if(/(نصيحة|نصائح|ساعدني|شو اسوي|ماذا افعل|advice|help me)/.test(lower)){
      var tips = [];
      if(c.overdue.length) tips.push('⚠️ عندك ' + c.overdue.length + ' مهمة متأخرة — ابدأ بها.');
      if(c.streak === 0) tips.push('🎯 ابدأ سلسلة دراسة جديدة اليوم!');
      if(c.streak >= 7) tips.push('🔥 ' + c.streak + ' يوم متواصل — استمر!');
      if(!tips.length){
        var general = window.STUDY_TIPS || ['خذ راحة قصيرة كل 25 دقيقة.'];
        tips.push(general[Math.floor(Math.random() * general.length)]);
      }
      return '💡 ' + tips.join('\n💡 ');
    }

    /* Courses */
    if(/(مواد|مادة|كورس|courses)/.test(lower)){
      if(!c.courses.length) return '📚 ما سجلت مواد بعد. اضغط "موادي" وأضفها.';
      var total = c.courses.reduce(function(a,x){ return a + (x.hours||0); }, 0);
      return '📚 عندك ' + c.courses.length + ' مادة (' + total + ' ساعة)\n' +
        c.courses.slice(0, 6).map(function(x){ return '• ' + x.name; }).join('\n');
    }

    /* Time */
    if(/(وقت|كم الساعة|الآن)/.test(lower)){
      return '🕐 ' + c.now.toLocaleTimeString('ar-EG');
    }

    /* Help */
    if(/(مساعدة|help|شو تعرف|ايش تعرف)/.test(lower)){
      return '🤖 بقدر أساعدك بـ:\n' +
        '📝 "شو مهامي؟"\n' +
        '⏳ "امتحاناتي"\n' +
        '📋 "خططلي يومي"\n' +
        '⏱️ "كم درست اليوم؟"\n' +
        '💰 "ميزانيتي"\n' +
        '📊 "معدلي"\n' +
        '💡 "نصيحة"\n' +
        '🕐 "الوقت"';
    }

    /* Thanks */
    if(/(شكرا|مشكور|تسلم|thanks)/.test(lower)){
      return 'العفو! 🌟 أي خدمة؟';
    }

    /* Who are you */
    if(/(من انت|منو انت|مين انت|who are you)/.test(lower)){
      return 'أنا مساعدك الذكي 🤖\nأعرف موادك، مهامك، امتحاناتك، ومعدلك — اسألني أي شي!';
    }

    return '🤔 ما فهمت. جرب:\n• "شو مهامي؟"\n• "خططلي يومي"\n• "امتحاناتي"\n• "ميزانيتي"';
  }

  /* Patch aiRespond */
  if(typeof window.aiRespond === 'function' && !window._advAIPatched){
    var origAI = window.aiRespond;
    window.aiRespond = function(text){
      try{
        var adv = advancedAI(text);
        if(adv && adv.indexOf('🤔 ما فهمت') === -1) return adv;
      }catch(e){ console.warn('advancedAI error:', e); }
      return origAI.apply(this, arguments);
    };
    window._advAIPatched = true;
  }

  /* Patch AI suggestions */
  function updateAISuggestions(){
    var sugg = document.getElementById('aiSuggestions');
    if(!sugg) return;
    var newList = [
      '📋 خططني يومي',
      '⏱️ كم درست هذا الأسبوع؟',
      '📝 شو مهامي؟',
      '⏳ امتحاناتي',
      '💰 ميزانيتي',
      '💡 نصيحة'
    ];
    sugg.innerHTML = newList.map(function(s){
      return '<button class="ai-suggestion">' + s + '</button>';
    }).join('');
    sugg.querySelectorAll('.ai-suggestion').forEach(function(b){
      b.addEventListener('click', function(){
        var input = document.getElementById('aiInput');
        var send = document.getElementById('aiSend');
        if(input && send){
          input.value = b.textContent.replace(/^[^\s]+\s*/, '');
          send.click();
        }
      });
    });
  }

  /* Patch bindAIEvents to use new suggestions */
  if(typeof window.bindAIEvents === 'function' && !window._aiSugPatched){
    var origBind = window.bindAIEvents;
    window.bindAIEvents = function(){
      var r = origBind.apply(this, arguments);
      setTimeout(updateAISuggestions, 100);
      return r;
    };
    window._aiSugPatched = true;
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init(){
    buildExamCountdownScreen();
    setTimeout(injectMoodleWidget, 800);
    setTimeout(injectOnbBtn, 1200);
    setTimeout(patchDashboardTermProgress, 500);
    setTimeout(buildEnhancedStats, 700);
    setTimeout(updateAISuggestions, 500);

    /* Re-run on dashboard visit */
    if(window.switchTab && !window._extrasTabPatched){
      var origSwitch = window.switchTab;
      window.switchTab = function(tab){
        var r = origSwitch.apply(this, arguments);
        setTimeout(function(){
          if(tab === 'dashboard'){
            patchDashboardTermProgress();
            buildEnhancedStats();
            injectMoodleWidget();
          }
        }, 150);
        return r;
      };
      window._extrasTabPatched = true;
    }

    console.log('🎁 extras.js loaded');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('🎁 extras.js v1 loaded');
})();