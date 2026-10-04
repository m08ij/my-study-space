/* ============================================================
   ai-context.js — طبقة سياق للمساعد المحلي (بدون أي خدمة خارجية)
   - تقرأ بيانات المستخدم الموجودة محلياً فقط، ولا ترسل شيئاً لأي مكان
   - كل جواب يذكر مصدر الأرقام والافتراضات، ويصرّح عند نقص البيانات
   - الإجراءات المقترحة أزرار تنقّل/فتح فقط؛ المساعد لا ينفّذ تعديلاً على بياناتك
   ============================================================ */
(function(){
  'use strict';
  if(window._aiCtxLoaded) return;
  window._aiCtxLoaded = true;

  var pendingActions = [];
  function money(n){ return Math.round(n).toLocaleString('en-US') + ' د'; }
  function sp(){ return window.space || {}; }
  function todayStr(){ return window.today ? window.today() : new Date().toISOString().slice(0, 10); }
  function dayDiff(due){
    var a = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(due || '')), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(todayStr());
    if(!a || !b) return null;
    return Math.round((new Date(+a[1], +a[2] - 1, +a[3]) - new Date(+b[1], +b[2] - 1, +b[3])) / 86400000);
  }
  function go(tab, label){ return { label: label, run: function(){ if(window.switchTab) window.switchTab(tab); } }; }
  function reply(text, actions){ pendingActions = actions || []; return text; }

  var PAGE_NAMES = { dashboard: 'لوحة التحكم', timetable: 'الجدول', courses: 'موادي', tasks: 'المهام', exams: 'الامتحانات', attendance: 'الحضور', timer: 'بومودورو', flashcards: 'البطاقات', budget: 'الميزانية', notes: 'الملاحظات', gradecalc: 'علاماتي', plan: 'الخطة', hulinks: 'روابط الجامعة' };
  function currentPage(){
    var el = document.querySelector('.section.active');
    return el && el.id ? el.id : 'dashboard';
  }

  /* ---------- الميزانية ---------- */
  function budgetAnswer(kind){
    var BP = window.BudgetPlan;
    var txs = sp().budget || [];
    if(!BP) return reply('ميزة تخطيط الميزانية غير محمّلة حالياً.', [go('budget', 'افتح الميزانية')]);
    if(!txs.length && !BP.load().openingBalance) return reply('ما عندي بيانات ميزانية أحلّلها: ما في معاملات مسجّلة ولا رصيد حالي.\nأضف رصيدك الحالي وأول مصروف/دخل من تبويب الميزانية وبحلّل لك.', [go('budget', 'افتح الميزانية')]);
    var c = BP.context(), L = [], s = c.status, b = c.base, f = c.fc;
    L.push('💰 وضعك المالي (بحسب ما أدخلته):');
    L.push('• الرصيد الحالي: ' + money(c.bal.balance) + (c.plan.balanceDate ? ' (من ' + c.plan.balanceDate + ')' : ''));
    L.push('• مصروف هذا الشهر: ' + money(s.expense) + (s.budget ? ' من ' + money(s.budget) + ' (' + Math.round(s.pct) + '%) — المتبقي ' + money(s.left) : ' — ما حدّدت ميزانية شهرية'));
    if(b.days){
      L.push('• متوسط إنفاقك الشهري ≈ ' + money(b.expense) + '، ودخلك المتوقع ≈ ' + money(b.income));
      L.push('• ' + (f.state === 'sustainable' ? 'دخلك يغطي إنفاقك، فالرصيد لا ينفد بهذا الوتيرة' : f.state === 'depleted' ? 'رصيدك صفر أو سالب' : 'الرصيد يكفي ≈ ' + window.BudgetPlan._calc.fmtRunway(f)));
    } else {
      L.push('• ما في معاملات كافية لحساب متوسط الإنفاق أو مدة كفاية الرصيد.');
    }
    if(c.alerts.length){ L.push(''); c.alerts.slice(0, 3).forEach(function(a){ L.push((a.k === 'danger' ? '🚨 ' : '⚠️ ') + a.t); }); }
    var actions = [go('budget', 'افتح الميزانية')];

    if(kind === 'save'){
      var disc = ['entertainment', 'food', 'clothing', 'subscriptions', 'personal', 'other-expense'];
      var cats = Object.keys(b.byCat).filter(function(k){ return disc.indexOf(k) > -1 && b.byCat[k] > 0; }).sort(function(x, y){ return b.byCat[y] - b.byCat[x]; }).slice(0, 2);
      L.push('');
      if(!cats.length){ L.push('📉 ما لقيت فئات مرنة (ترفيه/طعام/ملابس/اشتراكات…) بمعاملاتك لأقترح عليها توفير.'); }
      else {
        var cuts = {}, saved = 0, names = [];
        cats.forEach(function(k){ cuts[k] = 15; saved += b.byCat[k] * 0.15; names.push(((window.BUDGET_CATS || []).filter(function(x){ return x.v === k; })[0] || {}).l || k); });
        L.push('💡 اقتراح توفير (تقدير وليس ضماناً): قلّل ' + names.join(' و') + ' بنسبة 15% → توفير ≈ ' + money(saved) + ' شهرياً (≈ ' + money(saved * c.plan.horizon) + ' خلال ' + c.plan.horizon + ' شهر).');
        L.push('الأرقام مبنية على متوسط إنفاقك الفعلي لكل فئة.');
        actions.unshift({ label: '🧪 جرّب الخطة بالمحاكاة', run: function(){ BP.openSimulation({ catCuts: cuts }); } });
      }
    }
    L.push('');
    L.push('📎 المصدر: ' + (c.bal.counted) + ' معاملة مسجّلة + إعدادات خطتك' + (b.days ? '، متوسط آخر ' + b.days + ' يوم' + (b.enough ? '' : ' (بيانات قليلة فالتقدير تقريبي)') : '') + '، الشهر = 30.4 يوم.');
    return reply(L.join('\n'), actions);
  }

  function categoryAnswer(text){
    var BC = window.BUDGET_CATS || [], hit = null;
    BC.forEach(function(x){ if(!hit && text.indexOf(x.l) > -1) hit = x; });
    if(!hit) return null;
    var ym = todayStr().slice(0, 7), tot = 0, n = 0;
    (sp().budget || []).forEach(function(t){ if(t.category === hit.v && t.type !== 'income' && String(t.date || '').slice(0, 7) === ym){ tot += parseFloat(t.amount) || 0; n++; } });
    if(!n) return reply('ما في مصاريف مسجّلة على «' + hit.l + '» هذا الشهر (حسب معاملاتك).', [go('budget', 'افتح الميزانية')]);
    var lim = window.BudgetPlan && window.BudgetPlan.load().limits[hit.v];
    return reply(hit.i + ' ' + hit.l + ' هذا الشهر: ' + money(tot) + ' (' + n + ' معاملة)' + (lim ? ' من حدّ ' + money(lim) + ' — ' + (tot > lim ? 'تجاوزت بـ ' + money(tot - lim) : 'متبقي ' + money(lim - tot)) : ' — ما حدّدت حداً لها') + '.\n📎 المصدر: معاملاتك المسجّلة بتاريخ هذا الشهر.', [go('budget', 'افتح الميزانية')]);
  }

  /* ---------- المهام ---------- */
  function tasksSummary(){
    var open = (sp().tasks || []).filter(function(t){ return !t.done; });
    if(!open.length) return reply('✨ ما عندك مهام مفتوحة (حسب بياناتك).', [go('tasks', 'افتح المهام')]);
    var over = [], tod = [], soon = [], later = [], nodate = [];
    open.forEach(function(t){ var d = dayDiff(t.due); if(d === null) nodate.push(t); else if(d < 0) over.push(t); else if(d === 0) tod.push(t); else if(d <= 7) soon.push(t); else later.push(t); });
    var pr = function(a, b){ return (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1); };
    var L = ['📝 ملخص مهامك: ' + open.length + ' مفتوحة — ' + over.length + ' متأخرة، ' + tod.length + ' اليوم، ' + soon.length + ' خلال 7 أيام، ' + later.length + ' لاحقاً' + (nodate.length ? '، ' + nodate.length + ' بلا موعد' : '') + '.'];
    var step = 1, first = over.sort(pr).concat(tod.sort(pr), soon.sort(function(a, b){ return dayDiff(a.due) - dayDiff(b.due); })).slice(0, 3);
    if(first.length){
      L.push('');
      L.push('خطوات مقترحة بالترتيب:');
      first.forEach(function(t){ var d = dayDiff(t.due); L.push(step++ + '. ' + t.title + (d < 0 ? ' — متأخرة ' + (-d) + ' يوم، ابدأ فيها أولاً' : d === 0 ? ' — اليوم' : ' — بعد ' + d + ' يوم')); });
    }
    var ex = (sp().exams || []).map(function(e){ return { e: e, d: dayDiff(e.date) }; }).filter(function(x){ return x.d !== null && x.d >= 0 && x.d <= 7; }).sort(function(a, b){ return a.d - b.d; })[0];
    if(ex) L.push('', '⏳ تنبيه: «' + ex.e.name + '» ' + (ex.d === 0 ? 'اليوم' : 'بعد ' + ex.d + ' يوم') + ' — خصّص وقتاً للمراجعة.');
    L.push('', '📎 المصدر: قائمة مهامك المفتوحة ومواعيدها؛ الترتيب: المتأخر ثم اليوم ثم الأقرب، والأولوية العالية أولاً.');
    return reply(L.join('\n'), [go('tasks', 'افتح المهام'), go('timer', 'ابدأ جلسة تركيز')]);
  }

  /* ---------- سياق الصفحة ---------- */
  function pageAnswer(){
    var p = currentPage(), name = PAGE_NAMES[p] || p;
    if(p === 'budget') return budgetAnswer('overview');
    if(p === 'tasks') return tasksSummary();
    if(p === 'exams'){
      var ex = (sp().exams || []).map(function(e){ return { e: e, d: dayDiff(e.date) }; }).filter(function(x){ return x.d !== null && x.d >= 0; }).sort(function(a, b){ return a.d - b.d; });
      if(!ex.length) return reply('أنت بصفحة الامتحانات، وما عندك امتحانات قادمة مسجّلة.', [go('exams', 'افتح الامتحانات')]);
      return reply('⏳ أقرب امتحان: «' + ex[0].e.name + '» ' + (ex[0].d === 0 ? 'اليوم' : 'بعد ' + ex[0].d + ' يوم') + '. عندك ' + ex.length + ' امتحان قادم.\nخطوة مقترحة: وزّع مراجعتك على الأيام المتبقية وابدأ بأقرب موعد.\n📎 المصدر: امتحاناتك المسجّلة.', [go('exams', 'افتح الامتحانات')]);
    }
    var n = { courses: (sp().courses || []).length, tasks: (sp().tasks || []).filter(function(t){ return !t.done; }).length, exams: (sp().exams || []).length };
    return reply('أنت الآن بصفحة «' + name + '». نظرة سريعة: ' + n.courses + ' مادة، ' + n.tasks + ' مهمة مفتوحة، ' + n.exams + ' امتحان.\nاسألني عن مهامك أو ميزانيتك وبجاوب من بياناتك.', [go('tasks', 'المهام'), go('budget', 'الميزانية')]);
  }

  /* ---------- الاعتراض (الطبقة الأعلى) ---------- */
  var prev = window.aiRespond;
  window.aiRespond = function(text){
    var t = String(text || '').trim(), lower = t.toLowerCase();
    pendingActions = [];
    try{
      if(/(كم|مدة|لأي)\s*.*(يكفي|يكفيني|ينفد|بيكفي)|يكفيني|ينفد|تحليل.*(ميزاني|مصاريف)|حلل.*(ميزاني|مصاريف|وضعي)/.test(lower)) return budgetAnswer('runway');
      if(/(وفّر|وفر|توفير|اوفر|أوفر|خطة.*(توفير|ادخار)|ادخار)/.test(lower)) return budgetAnswer('save');
      if(/(كم|شو)\s*.*(صرفت|دفعت|مصروفي|أنفقت|انفقت)\s*(على|ع|ب)/.test(lower)){ var ca = categoryAnswer(lower); if(ca) return ca; }
      if(/(لخّص|لخص|ملخص|رتّب|رتب|أولوي|اولوي|من وين ابدأ|شو ابدأ|ابدأ بـ|خطة).*(مهام|مهمة|واجب)|(مهام|مهمة).*(لخص|لخّص|أولوي|رتب)/.test(lower)) return tasksSummary();
      if(/(هذه الصفحة|هذي الصفحة|هالصفحة|الصفحة الحالية|وين انا|وين أنا|ساعدني هنا|شو أعمل هنا|شو اعمل هنا)/.test(lower)) return pageAnswer();
      if(/(ميزانيتي|رصيدي|فلوسي)/.test(lower)) return budgetAnswer('overview');
    }catch(e){ console.warn('ai-context', e); }
    return prev ? prev.apply(this, arguments) : 'ما فهمت قصدك.';
  };
  window.aiTakeActions = function(){ var a = pendingActions; pendingActions = []; return a; };

  /* ---------- اقتراحات حسب الصفحة ---------- */
  var SUGG = {
    budget: ['💰 حلل ميزانيتي', '📉 خطة توفير', '⏳ كم يكفيني رصيدي؟'],
    tasks: ['📝 لخّص مهامي', '⏳ امتحاناتي', '📋 خططني يومي'],
    exams: ['⏳ امتحاناتي', '📝 لخّص مهامي', '💡 نصيحة'],
    dashboard: ['📋 خططني يومي', '📝 لخّص مهامي', '💰 حلل ميزانيتي']
  };
  function refreshSuggestions(){
    var sugg = document.getElementById('aiSuggestions'); if(!sugg) return;
    var list = SUGG[currentPage()] || ['📍 ساعدني هنا', '📝 لخّص مهامي', '💰 حلل ميزانيتي'];
    sugg.innerHTML = list.concat(['💡 نصيحة']).map(function(s){ return '<button class="ai-suggestion">' + s + '</button>'; }).join('');
    sugg.querySelectorAll('.ai-suggestion').forEach(function(b){
      b.addEventListener('click', function(){
        var input = document.getElementById('aiInput'), send = document.getElementById('aiSend');
        if(input && send){ input.value = b.textContent.replace(/^[^\s]+\s*/, ''); send.click(); }
      });
    });
  }
  /* Esc يغلق نافذة المساعد + زر مسح المحادثة */
  document.addEventListener('keydown', function(e){
    var p = document.getElementById('aiPanel');
    if(e.key === 'Escape' && p && p.classList.contains('show') && !document.querySelector('.modal-backdrop,.hub-sheet-backdrop,.cmdk-backdrop')){ p.classList.remove('show'); var f = document.getElementById('aiFab'); if(f) f.focus(); }
  });
  function addClearBtn(){
    var head = document.querySelector('#aiPanel .ai-header'), close = document.getElementById('aiClose');
    if(!head || !close || document.getElementById('aiClear')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'aiClear'; b.className = 'ai-close'; b.title = 'مسح المحادثة'; b.setAttribute('aria-label', 'مسح المحادثة'); b.textContent = '🗑';
    b.addEventListener('click', function(){ var m = document.getElementById('aiMessages'); if(m){ m.innerHTML = ''; var d = document.createElement('div'); d.className = 'ai-msg bot'; d.textContent = 'تم مسح المحادثة. كيف بقدر أساعدك؟'; m.appendChild(d); } pendingActions = []; });
    head.insertBefore(b, close);
  }
  function init(){
    addClearBtn();
    var fab = document.getElementById('aiFab');
    if(fab && !fab._aiCtx){ fab._aiCtx = true; fab.addEventListener('click', function(){ setTimeout(refreshSuggestions, 200); }); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(init, 800);
})();
