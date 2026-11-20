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
    function today(){
    if(window.today) return window.today();
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  /* ============================================================
     2️⃣  Confetti — احتفال عند الإنجاز
     ============================================================ */
  window.celebrate = function(intensity){
    intensity = intensity || 1;
    var count = 40 * intensity;
    var colors = ['#6c97ff','#8f86ff','#34d399','#fbbf24','#f472b6','#f87171'];
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
  function buildEnhancedStats(){}

  /* دمج الاستدعاءات المتتالية، وتأجيل البناء إذا اللوحة مخفية (يُبنى عند العودة لها) بدل إعادة بناء القسم كاملاً بكل تعديل */
  var enhTimer = null;
  
  /* Patch renderDashboard */
  if(typeof window.renderDashboard === 'function' && !window._enhStatsPatched){
    var origDash2 = window.renderDashboard;
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
              '<stop offset="0%" style="stop-color:var(--accent)"/>' +
              '<stop offset="100%" style="stop-color:var(--accent-2)"/>' +
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
  window.closeExamCountdown = closeExamCountdown;   /* لإغلاقها بـ Esc من app.js */

  /* Patch renderExams — أضف زر العد التنازلي */
  if(typeof window.renderExams === 'function' && !window._ecsPatched){
    var origExams = window.renderExams;
        window._ecsPatched = true;
  }

  /* ============================================================
     5️⃣  Onboarding تفاعلي
     ============================================================ */
  var ONB_KEY = 'ss_onboarding_done_v1';
  /* كل خطوة: عنصر بالواجهة الجديدة نضيئه (side = كمبيوتر بالشريط الجانبي، nav = تلفون بالشريط السفلي) أو بطاقة بالنص */
  var ONB_STEPS = [
    { center: true, hero: true, title: 'أهلين فيك بمساحتي', body: 'خلّينا نعرّفك على التطبيق بخطوات سريعة — أقل من دقيقة.' },
    { side: '.fx-snav[data-v="today"]', nav: '.fx-nav [data-v="today"]', title: 'اليوم', body: 'أول ما تفتح: محاضرتك الجاية وزر «حضرت»، خطتك لليوم، ومهامك وامتحاناتك القريبة.' },
    { side: '.fx-snav[data-v="timetable"]', nav: '.fx-nav [data-v="timetable"]', title: 'الجدول', body: 'ضيف جدولك مرة وحدة — أو صوّره وبنعبّيه عنك. بنحسب وين قاعتك وقديش باقي للمحاضرة.' },
    { side: '.fx-snav[data-v="tasks"]', nav: '.fx-nav [data-v="tasks"]', title: 'المهام', body: 'اكتب زي ما بتحكي: «واجب شبكات بكرة» — بنفهم المادة والموعد وبنذكّرك.' },
    { side: '.fx-scrs', nav: '.fx-nav [data-v="more"]', title: 'موادي', body: 'كل مادة إلها صفحة: علاماتها، حضورها، ملفاتها، ملاحظاتها وخطة المراجعة.' },
    { side: '.fx-ssearch', nav: '.fx-top [data-fx="cmd"]', title: 'بحث وأوامر', body: 'اضغط «/» من أي مكان: افتح صفحة، دوّر على مادة، أو اكتب مهمة جديدة مباشرة.' },
    { side: '.fx-sicons [data-fx="ai"]', nav: '.fx-top [data-fx="ai"]', title: 'المساعد الذكي', body: 'اسأله: «شو عندي اليوم؟» · «خطّطلي يومي» · «كم صرفت هالشهر؟».' },
    { center: true, theme: true, title: 'اختار شكلك', body: 'بتقدر تغيّر الثيم والوضع (غامق/فاتح) بأي وقت من «المزيد» ← المظهر.' }
  ];
  var ONB_PALS = [['neutral', 'محايد', '#5b9cf5'], ['ocean', 'محيط', '#4f9dff'], ['forest', 'غابة', '#3ecf8e'], ['violet', 'بنفسجي', '#a78bfa'], ['rose', 'وردي', '#f472b6'], ['amber', 'عنبري', '#f5b544'], ['mono', 'أبيض وأسود', '#9b9a97']];

  function showOnboarding(){
    var overlay = document.getElementById('onbOverlay');
    if(!overlay){ overlay = document.createElement('div'); overlay.id = 'onbOverlay'; document.body.appendChild(overlay); }
    overlay.className = 'ss-tour'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', 'جولة تعريفية');
    if(window.FocusUI && window.FocusUI.view && window.FocusUI.view() !== 'today' && window.FocusUI.go) window.FocusUI.go('today');
    var step = 0, wide = window.innerWidth > 820;
    function target(st){
      if(st.center) return null;
      var el = document.querySelector(wide ? st.side : st.nav); if(!el) return null;
      var r = el.getBoundingClientRect(); return r.width && r.height ? r : null;
    }
    function close(done){
      getS().set(ONB_KEY, true);
      overlay.classList.add('out'); document.removeEventListener('keydown', onKey);
      setTimeout(function(){ overlay.className = ''; overlay.innerHTML = ''; overlay.removeAttribute('style'); }, 260);
      if(done){ if(window.celebrate) window.celebrate(2); toast('جاهز! يومك بلّش 🚀', 'success', 2600); }
    }
    function onKey(e){
      if(e.key === 'Escape') close(false);
      else if(e.key === 'ArrowLeft' || e.key === 'Enter'){ e.preventDefault(); next(); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); prev(); }
    }
    function next(){ if(step < ONB_STEPS.length - 1){ step++; render(); } else close(true); }
    function prev(){ if(step > 0){ step--; render(); } }
    function render(){
      var st = ONB_STEPS[step], r = target(st), last = step === ONB_STEPS.length - 1, n = ONB_STEPS.length;
      if(!st.center && !r){ step += step < n - 1 ? 1 : 0; if(!ONB_STEPS[step].center && !target(ONB_STEPS[step])){ /* ما في عنصر ظاهر: بطاقة بالنص */ } }
      st = ONB_STEPS[step]; r = target(st); last = step === n - 1;
      var pad = 6, hole = r ? '<div class="ss-tour-hole" style="top:' + (r.top - pad) + 'px;left:' + (r.left - pad) + 'px;width:' + (r.width + pad * 2) + 'px;height:' + (r.height + pad * 2) + 'px"></div>' : '<div class="ss-tour-dim"></div>';
      var extra = st.hero ? '<div class="ss-tour-logo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 13.5c3.6-1.6 7.3-1.6 11 .6 3.7-2.2 7.4-2.2 11-.6v14c-3.6-1.6-7.3-1.6-11 .6-3.7-2.2-7.4-2.2-11-.6z" fill="rgba(255,255,255,.22)" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M20 14.1v14" stroke="#fff" stroke-width="2"/><path d="M29.5 5.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#fff"/></svg></div>'
        : st.theme ? '<div class="ss-tour-pals">' + ONB_PALS.map(function(p){ var on = (localStorage.getItem('ss_fx_pal') || 'neutral') === p[0]; return '<button type="button" class="ss-tour-pal' + (on ? ' on' : '') + '" data-pal="' + p[0] + '" style="--pa:' + p[2] + '" aria-pressed="' + on + '"><i></i>' + p[1] + '</button>'; }).join('') + '</div>' +
          '<div class="ss-tour-modes">' + [['dark', 'غامق'], ['light', 'فاتح'], ['auto', 'تلقائي']].map(function(m){ var on = (localStorage.getItem('ss_fx_mode') || 'auto') === m[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" data-mode="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>' : '';
      overlay.innerHTML = hole +
        '<div class="ss-tour-card' + (r ? '' : ' center') + '" role="document">' +
          '<div class="ss-tour-prog"><i style="width:' + Math.round((step + 1) / n * 100) + '%"></i></div>' +
          (st.theme ? '' : extra) + '<small class="ss-tour-step">' + (step + 1) + ' من ' + n + '</small><h3>' + st.title + '</h3><p>' + st.body + '</p>' + (st.theme ? '<div class="ss-tour-thw">' + extra + '</div>' : '') +
          '<div class="ss-tour-act"><button type="button" class="ss-tour-skip" data-t="skip">' + (last ? '' : 'تخطّي') + '</button><span></span>' +
            (step > 0 ? '<button type="button" class="ss-tour-btn g" data-t="prev">السابق</button>' : '') +
            '<button type="button" class="ss-tour-btn p" data-t="next">' + (last ? 'يلا نبلّش' : step === 0 ? 'ابدأ الجولة' : 'التالي') + '</button></div>' +
        '</div>';
      overlay.style.display = 'block';
      var card = overlay.querySelector('.ss-tour-card');
      if(r){   /* البطاقة بالجهة اللي فيها مساحة أكبر حول العنصر */
        var cw = card.offsetWidth, ch = card.offsetHeight, W2 = window.innerWidth, H2 = window.innerHeight, gap = 16, x, y;
        if(r.left > cw + gap * 2){ x = r.left - cw - gap; y = r.top + r.height / 2 - ch / 2; }
        else if(W2 - r.right > cw + gap * 2){ x = r.right + gap; y = r.top + r.height / 2 - ch / 2; }
        else if(r.top > ch + gap * 2){ x = r.left + r.width / 2 - cw / 2; y = r.top - ch - gap; }
        else { x = r.left + r.width / 2 - cw / 2; y = r.bottom + gap; }
        card.style.left = Math.max(12, Math.min(W2 - cw - 12, x)) + 'px'; card.style.top = Math.max(12, Math.min(H2 - ch - 12, y)) + 'px';
      }
      card.querySelector('[data-t="next"]').focus();
    }
    overlay.onclick = function(e){
      var b = e.target.closest ? e.target.closest('button') : null; if(!b) return;
      var t = b.getAttribute('data-t');
      if(t === 'next') next(); else if(t === 'prev') prev(); else if(t === 'skip') close(false);
      else if(b.hasAttribute('data-pal') || b.hasAttribute('data-mode')){
        if(b.hasAttribute('data-pal')) localStorage.setItem('ss_fx_pal', b.getAttribute('data-pal')); else localStorage.setItem('ss_fx_mode', b.getAttribute('data-mode'));
        if(window.FocusUI && window.FocusUI.look) window.FocusUI.look();
        render();
      }
    };
    document.addEventListener('keydown', onKey);
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
    if(!menu) return;
    var btn = menu.querySelector('#onbBtn');   /* الزر ثابت بـ index.html (مجموعة «النظام»)؛ نُنشئه فقط إن غاب */
    if(!btn){
      btn = document.createElement('button');
      btn.className = 'settings-item';
      btn.id = 'onbBtn';
      btn.innerHTML = '<span class="si-ic">🎓</span><span class="si-tx"><b>جولة تعريفية</b></span>';
      menu.appendChild(btn);
    }
    if(btn._onb) return; btn._onb = true;
    btn.addEventListener('click', function(){
      if(window.closeSettingsMenu) window.closeSettingsMenu();
      getS().set(ONB_KEY, false);
      showOnboarding();
    });
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

  function injectMoodleWidget(){}

  /* ============================================================
     INIT
     ============================================================ */
  function init(){
    buildExamCountdownScreen();
    setTimeout(injectMoodleWidget, 800);
    setTimeout(injectOnbBtn, 1200);
    setTimeout(buildEnhancedStats, 700);

    /* Re-run on dashboard visit */
    if(window.switchTab && !window._extrasTabPatched){
      var origSwitch = window.switchTab;
      window.switchTab = function(tab){
        var r = origSwitch.apply(this, arguments);
        setTimeout(function(){
          if(tab === 'dashboard'){
            if(window._enhStale || !document.getElementById('enhancedStatsSection')) buildEnhancedStats();
            injectMoodleWidget();
          }
        }, 150);
        return r;
      };
      window._extrasTabPatched = true;
    }

  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
