/* ============================================================
   🤖 ai.js — المساعد الذكي (Chatbot)
   ============================================================ */
(function(){
  'use strict';
  if(window._aiLoaded) return;
  window._aiLoaded = true;

  function esc(s){
    return window.esc ? window.esc(s) : String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function today(){
    return window.today ? window.today() : (function(){
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    })();
  }

  function getData(){
    var sp = window.space || {};
    var now = new Date();
    return {
      name: (sp.profile && sp.profile.name) || 'صديقي',
      tasks: (sp.tasks || []).filter(function(t){ return !t.done; }),
      exams: (sp.exams || []).slice().sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); }),
      courses: sp.courses || [],
      budget: sp.budget || [],
      today: today(),
      now: now
    };
  }

  function calcBudget(budget){
    var inc = 0, exp = 0;
    budget.forEach(function(b){
      var a = parseFloat(b.amount) || 0;
      if(b.type === 'income') inc += a; else exp += a;
    });
    return { income: inc, expense: exp, balance: inc - exp };
  }

  function daysUntil(dateStr){
    if(!dateStr) return null;
    var d = new Date(dateStr);
    var t = new Date();
    t.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return Math.round((d - t) / 86400000);
  }

  window.aiRespond = function(text){
    var t = String(text || '').trim();
    if(!t) return 'اكتب سؤالك 🙂';
    var lower = t.toLowerCase();
    var d = getData();

    if(/(سلام|هلا|مرحبا|هاي|صباح|مساء|أهلا)/.test(lower)){
      var hour = d.now.getHours();
      var g = hour < 12 ? 'صباح الخير' : 'مساء الخير';
      return g + ' ' + d.name + '! 👋\nعندك ' + d.tasks.length + ' مهمة، ' + d.exams.length + ' امتحان.';
    }

    if(/(مهام|مهمة|واجب|واجبات|task)/.test(lower)){
      if(!d.tasks.length) return '✨ ما عندك مهام! استمتع بوقتك.';
      var list = d.tasks.slice(0, 5).map(function(task, i){
        var dl = task.due ? daysUntil(task.due) : null;
        var due = dl === null ? '' : dl < 0 ? ' (متأخرة!)' : dl === 0 ? ' (اليوم)' : dl === 1 ? ' (غدًا)' : ' (بعد ' + dl + ' يوم)';
        return (i+1) + '. ' + task.title + due;
      }).join('\n');
      return '📝 عندك ' + d.tasks.length + ' مهمة:\n' + list;
    }

    if(/(امتحان|امتحانات|اختبار|exam)/.test(lower)){
      if(!d.exams.length) return '✨ ما عندك امتحانات مسجلة.';
      var list2 = d.exams.slice(0, 5).map(function(e){
        var days = daysUntil(e.date);
        var when = days === 0 ? 'اليوم!' : days === 1 ? 'غدًا!' : days < 0 ? 'انتهى' : 'بعد ' + days + ' يوم';
        return '• ' + e.name + ' — ' + when;
      }).join('\n');
      return '⏳ امتحاناتك:\n' + list2;
    }

    if(/(مواد|مادة|كورس|courses|مسجل)/.test(lower)){
      if(!d.courses.length) return '📚 ما سجلت مواد. روح لتبويب "موادي" وأضفها.';
      var total = d.courses.reduce(function(a,c){ return a + (c.hours || 0); }, 0);
      var list3 = d.courses.slice(0, 6).map(function(c){ return '• ' + c.name + ' (' + (c.hours || 3) + 'س)'; }).join('\n');
      return '📚 عندك ' + d.courses.length + ' مادة (' + total + ' ساعة):\n' + list3;
    }

    if(/(ميزانية|فلوس|رصيد|مصروف|دخل|صرفت|دفعت)/.test(lower)){
      var b = calcBudget(d.budget);
      return '💰 ملخص الميزانية:\n📈 دخل: ' + b.income.toFixed(0) + ' د\n📉 مصروف: ' + b.expense.toFixed(0) + ' د\n💼 الرصيد: ' + b.balance.toFixed(0) + ' د';
    }

    if(/(معدل|gpa|علامات|درجات|تقدير)/.test(lower)){
      var v = document.getElementById('gpaVal');
      var g = document.getElementById('gpaGrade');
      if(v && parseFloat(v.textContent) > 0){
        return '📊 معدلك الحالي: ' + v.textContent + (g ? ' (' + g.textContent + ')' : '');
      }
      return '📊 روح لتبويب "علاماتي" وأضف موادك لحساب المعدل.';
    }

    if(/(نصيحة|نصائح|دراسة|ادرس|مذاكرة|تعلم|ركّز|ركز)/.test(lower)){
      var tips = window.STUDY_TIPS || [
        '💡 ابدأ بمهمة صغيرة لتحفيز نفسك',
        '💡 راجع بعد 24 ساعة من المحاضرة',
        '💡 خذ راحة 5 دقائق كل 25 دقيقة',
        '💡 اشرح المفهوم بصوت عالي لتثبيته'
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    }

    if(/(وقت|ساعة|كم الساعة|الآن)/.test(lower)){
      return '🕐 الوقت الآن: ' + d.now.toLocaleTimeString('ar-EG');
    }

    if(/(اليوم|تاريخ)/.test(lower)){
      return '📅 اليوم: ' + d.today;
    }

    if(/(مساعدة|ساعدني|help|شو تعرف|ايش تعرف|شو بتعرف)/.test(lower)){
      return '🤖 بقدر أساعدك بـ:\n📝 مهامك\n⏳ امتحاناتك\n📚 موادك\n💰 ميزانيتك\n📊 معدلك\n💡 نصائح دراسة\n🕐 الوقت\n\nجرب: "شو مهامي؟"';
    }

    if(/(شكرا|مشكور|تسلم|thanks|يعطيك)/.test(lower)){
      return 'العفو! 🌟 أي خدمة تانية؟';
    }

    if(/(من انت|منو انت|مين انت|who are you)/.test(lower)){
      return 'أنا مساعدك الذكي في تطبيق "مساحتي الدراسية" 🤖\nبقدر أساعدك بإدارة مهامك ودراستك.';
    }

    return '🤔 ما فهمت قصدك.\nجرب تسأل عن: مهامي، امتحاناتي، موادي، ميزانيتي، معدلي.';
  };

  window.bindAIEvents = function(){
    var fab = document.getElementById('aiFab');
    var panel = document.getElementById('aiPanel');
    var closeBtn = document.getElementById('aiClose');
    var send = document.getElementById('aiSend');
    var input = document.getElementById('aiInput');
    var msgs = document.getElementById('aiMessages');
    var sugg = document.getElementById('aiSuggestions');

    if(!fab || !panel) return;
    if(fab._aiBound) return;
    fab._aiBound = true;

    var suggestions = [
      '📝 شو مهامي؟',
      '⏳ امتحاناتي',
      '💰 ميزانيتي',
      '📊 معدلي',
      '💡 نصيحة دراسة'
    ];

    function addMsg(text, cls){
      if(!msgs) return;
      var div = document.createElement('div');
      div.className = 'ai-msg ' + cls;
      div.innerHTML = cls === 'bot' ? esc(text).replace(/\n/g, '<br>') : esc(text);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function sendMessage(txt){
      txt = String(txt || '').trim();
      if(!txt) return;
      addMsg(txt, 'user');
      input.value = '';
      setTimeout(function(){
        var reply = window.aiRespond(txt);
        addMsg(reply, 'bot');
      }, 350);
    }

    fab.addEventListener('click', function(){
      panel.classList.toggle('show');
      if(panel.classList.contains('show') && msgs && !msgs.children.length){
        addMsg('أهلاً! 👋 كيف بقدر أساعدك؟', 'bot');
      }
      if(sugg && !sugg.children.length){
        sugg.innerHTML = suggestions.map(function(s){
          return '<button class="ai-suggestion">' + s + '</button>';
        }).join('');
        sugg.querySelectorAll('.ai-suggestion').forEach(function(b){
          b.addEventListener('click', function(){
            sendMessage(b.textContent.replace(/^[^\s]+\s*/, ''));
          });
        });
      }
    });

    if(closeBtn) closeBtn.addEventListener('click', function(){ panel.classList.remove('show'); });
    if(send) send.addEventListener('click', function(){ sendMessage(input.value); });
    if(input) input.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); sendMessage(input.value); }
    });
  };

  console.log('🤖 ai.js loaded');
})();