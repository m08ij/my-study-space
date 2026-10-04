/* ============================================================
   budget-plan.js — تخطيط مالي تفاعلي فوق نظام الميزانية الحالي
   - المعاملات الفعلية تبقى في space.budget (قراءة فقط من هذا الملف)
   - إعدادات الخطة (رصيد، ميزانية، حدود، متكرر، سيناريوهات) تُحفظ بمفتاح مستقل: budgetPlan
   - المحاكاة لا تكتب شيئاً في المعاملات أبداً
   ============================================================ */
(function(){
  'use strict';

  var KEY = 'budgetPlan';
  var DAYS_PER_MONTH = 30.4375;
  var INCOME_CATS = ['salary','family','scholarship','freelance','other-income'];

  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function uid(){ return window.uid ? window.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function num(v){ var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function pos(v){ var n = num(v); return n > 0 ? n : 0; }
  function r1(n){ return Math.round(n * 10) / 10; }
  function money(n){ return (Math.round(n) === 0 ? 0 : Math.round(n)).toLocaleString('en-US') + ' د'; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function todayStr(){ return window.today ? window.today() : (function(){ var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); })(); }

  /* تاريخ YYYY-MM-DD صالح فقط؛ غير ذلك = null (لا نخمّن) */
  function parseDate(s){
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if(!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(y, mo - 1, d);
    if(dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }
  function ymOf(s){ var d = parseDate(s); return d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) : null; }
  function daysInMonth(y, m){ return new Date(y, m, 0).getDate(); }
  function dayDiff(a, b){ return Math.round((b - a) / 86400000); }
  function isIncomeCat(c){ return INCOME_CATS.indexOf(c) > -1; }
  function catLabel(v){
    var BC = window.BUDGET_CATS || [];
    for(var i = 0; i < BC.length; i++) if(BC[i].v === v) return BC[i].i + ' ' + BC[i].l;
    return v || 'غير مصنّف';
  }

  /* ---------- الإعدادات ---------- */
  function defaults(){
    return { openingBalance: 0, balanceDate: '', monthlyBudget: 0, limits: {}, recurring: [], scenarios: [], horizon: 6 };
  }
  function load(){
    var p = (window.S && window.S.get(KEY, null)) || null;
    var d = defaults();
    if(p && typeof p === 'object'){
      d.openingBalance = num(p.openingBalance);
      d.balanceDate = parseDate(p.balanceDate) ? p.balanceDate : '';
      d.monthlyBudget = pos(p.monthlyBudget);
      d.limits = {};
      if(p.limits && typeof p.limits === 'object') Object.keys(p.limits).forEach(function(k){ if(pos(p.limits[k]) > 0) d.limits[k] = pos(p.limits[k]); });
      d.recurring = (Array.isArray(p.recurring) ? p.recurring : []).filter(function(r){ return r && pos(r.amount) > 0; });
      d.scenarios = Array.isArray(p.scenarios) ? p.scenarios : [];
      d.horizon = Math.min(60, Math.max(1, Math.round(num(p.horizon)) || 6));
    }
    return d;
  }
  function save(plan){ if(window.S) window.S.set(KEY, plan); }

  /* ---------- الحسابات (دوال نقيّة قابلة للاختبار) ---------- */
  function cleanTx(list){
    return (Array.isArray(list) ? list : []).map(function(b){
      return { type: b && b.type === 'income' ? 'income' : 'expense', category: b && b.category || '', amount: pos(b && b.amount), date: b && b.date || '', id: b && b.id };
    }).filter(function(t){ return t.amount > 0; });
  }

  /* الرصيد الحالي = رصيد الافتتاح + (دخل − مصروف) للمعاملات من تاريخ الرصيد حتى اليوم؛ المعاملات بلا تاريخ صالح تُحتسب */
  function currentBalance(plan, txs, now){
    var from = parseDate(plan.balanceDate), to = parseDate(now);
    var bal = num(plan.openingBalance), counted = 0, skippedFuture = 0;
    txs.forEach(function(t){
      var d = parseDate(t.date);
      if(d){
        if(from && d < from) return;
        if(to && d > to){ skippedFuture++; return; }
      }
      bal += t.type === 'income' ? t.amount : -t.amount; counted++;
    });
    return { balance: bal, counted: counted, future: skippedFuture };
  }

  function monthStats(txs, ym){
    var o = { income: 0, expense: 0, byCat: {} };
    txs.forEach(function(t){
      if(ymOf(t.date) !== ym) return;
      if(t.type === 'income') o.income += t.amount;
      else { o.expense += t.amount; o.byCat[t.category] = (o.byCat[t.category] || 0) + t.amount; }
    });
    return o;
  }

  /* متوسط الإنفاق/الدخل الشهري من آخر 90 يوماً (أو من أول معاملة إن كانت الفترة أقصر، بحدّ أدنى 14 يوماً) */
  function averages(txs, now){
    var end = parseDate(now) || new Date();
    var dated = txs.filter(function(t){ var d = parseDate(t.date); return d && d <= end; });
    if(!dated.length) return { days: 0, expMonthly: 0, incMonthly: 0, byCat: {}, enough: false };
    var first = null;
    dated.forEach(function(t){ var d = parseDate(t.date); if(!first || d < first) first = d; });
    var start = new Date(end.getTime() - 89 * 86400000);
    if(first > start) start = first;
    var days = Math.max(14, dayDiff(start, end) + 1);
    var exp = 0, inc = 0, byCat = {};
    dated.forEach(function(t){
      var d = parseDate(t.date); if(d < start) return;
      if(t.type === 'income') inc += t.amount; else { exp += t.amount; byCat[t.category] = (byCat[t.category] || 0) + t.amount; }
    });
    var f = DAYS_PER_MONTH / days, bc = {};
    Object.keys(byCat).forEach(function(k){ bc[k] = byCat[k] * f; });
    return { days: days, expMonthly: exp * f, incMonthly: inc * f, byCat: bc, enough: days >= 28 };
  }

  /* المتكرر: يدخل التوقع فقط، ولا يُحتسب لشهر فيه معاملة فعلية بنفس النوع والتصنيف (لا ازدواج) */
  function recurringMonthly(plan, txs, ym){
    var inc = 0, exp = 0, skipped = [];
    plan.recurring.forEach(function(r){
      var s = r.start && ymOf(r.start), e = r.end && ymOf(r.end);
      if(s && ym < s) return;
      if(e && ym > e) return;
      var real = txs.some(function(t){ return t.type === r.type && t.category === r.category && ymOf(t.date) === ym; });
      if(real){ skipped.push(r.name || r.category); return; }
      if(r.type === 'income') inc += pos(r.amount); else exp += pos(r.amount);
    });
    return { income: inc, expense: exp, skipped: skipped };
  }
  /* مبلغ المتكرر كل شهر بغضّ النظر عن المعاملات (للافتراضات) */
  function recurringTotals(plan){
    var inc = 0, exp = 0;
    plan.recurring.forEach(function(r){ if(r.type === 'income') inc += pos(r.amount); else exp += pos(r.amount); });
    return { income: inc, expense: exp };
  }

  /* الأساس الشهري للتوقع: الإنفاق = المتوسط الفعلي (يشمل المتكرر المتحقق فعلاً) ، الدخل = المتكرر إن وُجد وإلا المتوسط الفعلي */
  function baseline(plan, txs, now){
    var av = averages(txs, now), rt = recurringTotals(plan);
    var income = rt.income > 0 ? rt.income : av.incMonthly;
    var expense = av.expMonthly;
    if(rt.expense > expense) expense = rt.expense; /* لا نقلّ عن المتكرر المعروف */
    return { income: income, expense: expense, byCat: av.byCat, days: av.days, enough: av.enough, incomeSource: rt.income > 0 ? 'recurring' : (av.incMonthly > 0 ? 'average' : 'none') };
  }

  /* تطبيق سيناريو افتراضي على الأساس (لا يلمس أي بيانات) */
  function applyScenario(base, sc){
    sc = sc || {};
    var expense = base.expense, cuts = 0;
    var cutMap = sc.catCuts || {};
    Object.keys(cutMap).forEach(function(k){
      var p = Math.min(100, Math.max(0, num(cutMap[k])));
      cuts += (base.byCat[k] || 0) * p / 100;
    });
    expense = Math.max(0, expense - cuts);
    expense = Math.max(0, expense * (1 + num(sc.expensePct) / 100) + num(sc.extraExpense));
    var income = Math.max(0, base.income * (1 + num(sc.incomePct) / 100) + num(sc.extraIncome));
    return { income: income, expense: expense, net: income - expense };
  }

  /* التوقع: الرصيد بعد n شهراً + المدة التي يكفيها */
  function forecast(balance, flow, months){
    var net = flow.net, out = { net: net, after: balance + net * months, runwayMonths: null, runwayDays: null, state: '' };
    if(balance <= 0){ out.state = 'depleted'; out.runwayMonths = 0; out.runwayDays = 0; return out; }
    if(net >= 0){ out.state = 'sustainable'; }
    else { out.state = 'burning'; out.runwayMonths = balance / -net; out.runwayDays = Math.floor(out.runwayMonths * DAYS_PER_MONTH); }
    return out;
  }

  /* ميزانية الشهر الحالي: صرف/متبقي/نسبة لكل فئة + إسقاط نهاية الشهر */
  function monthStatus(plan, txs, now){
    var d = parseDate(now) || new Date();
    var ym = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    var ms = monthStats(txs, ym);
    var dim = daysInMonth(d.getFullYear(), d.getMonth() + 1), day = d.getDate();
    var projected = day > 0 ? ms.expense / day * dim : ms.expense;
    var cats = Object.keys(ms.byCat).concat(Object.keys(plan.limits).filter(function(k){ return !(k in ms.byCat); }));
    var rows = cats.map(function(c){
      var limit = plan.limits[c] || 0, spent = ms.byCat[c] || 0;
      return { cat: c, spent: spent, limit: limit, left: limit ? limit - spent : null, pct: limit ? spent / limit * 100 : null };
    }).sort(function(a, b){ return b.spent - a.spent; });
    return { ym: ym, income: ms.income, expense: ms.expense, budget: plan.monthlyBudget, left: plan.monthlyBudget ? plan.monthlyBudget - ms.expense : null,
      pct: plan.monthlyBudget ? ms.expense / plan.monthlyBudget * 100 : null, projected: projected, day: day, dim: dim, rows: rows };
  }

  function buildAlerts(plan, status, bal, base, fc, horizon){
    var a = [];
    if(status.budget){
      if(status.pct >= 100) a.push({ k: 'danger', t: 'تجاوزت ميزانية الشهر بـ ' + money(status.expense - status.budget) + ' (' + Math.round(status.pct) + '%).' });
      else if(status.projected > status.budget) a.push({ k: 'warn', t: 'بهذه الوتيرة ستصرف حوالي ' + money(status.projected) + ' بنهاية الشهر، أعلى من ميزانيتك (' + money(status.budget) + ').' });
      else if(status.pct >= 80) a.push({ k: 'warn', t: 'استهلكت ' + Math.round(status.pct) + '% من ميزانية الشهر.' });
    }
    status.rows.forEach(function(r){
      if(!r.limit) return;
      if(r.pct >= 100) a.push({ k: 'danger', t: 'تجاوزت حد «' + catLabel(r.cat) + '» بـ ' + money(r.spent - r.limit) + '.' });
      else if(r.pct >= 80) a.push({ k: 'warn', t: '«' + catLabel(r.cat) + '» وصل ' + Math.round(r.pct) + '% من حدّه.' });
    });
    if(fc.state === 'depleted') a.push({ k: 'danger', t: 'رصيدك الحالي صفر أو سالب.' });
    else if(fc.state === 'burning' && fc.runwayMonths < horizon) a.push({ k: fc.runwayMonths < 1 ? 'danger' : 'warn', t: 'متوقع ينفد الرصيد بعد ' + fmtRunway(fc) + '، أقل من مدة التخطيط (' + horizon + ' شهر).' });
    return a;
  }

  function fmtRunway(fc){
    if(fc.state === 'sustainable') return 'لا ينفد (الدخل ≥ الإنفاق)';
    if(fc.state === 'depleted') return '0';
    var m = fc.runwayMonths;
    if(m < 1) return fc.runwayDays + ' يوم';
    return r1(m) + ' شهر (≈ ' + fc.runwayDays + ' يوم)';
  }

  /* ---------- واجهة ---------- */
  var ui = { tab: 'month', draft: { expensePct: 0, incomePct: 0, extraIncome: 0, extraExpense: 0, catCuts: {} }, name: '' };

  function field(label, id, val, hint, extra){
    return '<label class="bp-f"><span>' + label + '</span><input type="number" inputmode="decimal" step="any" id="' + id + '" value="' + esc(val) + '"' + (extra || '') + '>' + (hint ? '<small>' + hint + '</small>' : '') + '</label>';
  }
  function bar(pct){
    var p = Math.max(0, Math.min(100, pct || 0)), cls = pct >= 100 ? 'over' : pct >= 80 ? 'near' : '';
    return '<div class="bp-bar ' + cls + '"><i style="width:' + p.toFixed(1) + '%"></i></div>';
  }

  function context(){
    var plan = load(), txs = cleanTx((window.space && window.space.budget) || []), now = todayStr();
    var bal = currentBalance(plan, txs, now), base = baseline(plan, txs, now);
    var status = monthStatus(plan, txs, now);
    var fc = forecast(bal.balance, { net: base.income - base.expense }, plan.horizon);
    return { plan: plan, txs: txs, now: now, bal: bal, base: base, status: status, fc: fc, alerts: buildAlerts(plan, status, bal, base, fc, plan.horizon) };
  }

  function viewMonth(c){
    var p = c.plan, s = c.status, h = '';
    h += '<div class="bp-grid">' +
      field('رصيدك الحالي (افتتاحي)', 'bpOpen', p.openingBalance || '', 'المبلغ الذي معك عند «تاريخ الرصيد»') +
      '<label class="bp-f"><span>تاريخ الرصيد</span><input type="date" id="bpOpenDate" value="' + esc(p.balanceDate) + '"><small>اتركه فارغاً لاحتساب كل المعاملات</small></label>' +
      field('ميزانية الشهر', 'bpBudget', p.monthlyBudget || '', 'سقف المصروف الشهري') + '</div>';
    h += '<div class="bp-kpis">' +
      '<div class="bp-kpi"><b>' + money(c.bal.balance) + '</b><span>الرصيد الحالي</span></div>' +
      '<div class="bp-kpi"><b>' + money(s.expense) + '</b><span>مصروف هذا الشهر</span></div>' +
      '<div class="bp-kpi' + (s.left != null && s.left < 0 ? ' neg' : '') + '"><b>' + (s.left == null ? '—' : money(s.left)) + '</b><span>المتبقي من الميزانية</span></div>' +
      '<div class="bp-kpi"><b>' + (s.pct == null ? '—' : Math.round(s.pct) + '%') + '</b><span>نسبة الاستهلاك</span></div></div>';
    if(s.pct != null) h += bar(s.pct);
    if(c.bal.future) h += '<p class="bp-note">' + c.bal.future + ' معاملة بتاريخ مستقبلي غير محتسبة بالرصيد الحالي.</p>';
    h += '<h4 class="bp-h">حدود الفئات (هذا الشهر)</h4>';
    var BC = window.BUDGET_CATS || [], rows = {};
    s.rows.forEach(function(r){ rows[r.cat] = r; });
    var expCats = BC.filter(function(x){ return !isIncomeCat(x.v); });
    h += '<div class="bp-cats">' + expCats.map(function(x){
      var r = rows[x.v] || { spent: 0, limit: p.limits[x.v] || 0, left: null, pct: null };
      return '<div class="bp-cat"><div class="bp-cat-top"><span>' + x.i + ' ' + x.l + '</span>' +
        '<input type="number" inputmode="decimal" min="0" step="any" class="bp-limit" data-cat="' + x.v + '" placeholder="الحد" value="' + (p.limits[x.v] || '') + '" aria-label="حد ' + esc(x.l) + '"></div>' +
        '<div class="bp-cat-sub"><span>صرفت ' + money(r.spent) + '</span><span>' + (r.limit ? (r.left >= 0 ? 'متبقي ' + money(r.left) : 'تجاوز ' + money(-r.left)) + ' · ' + Math.round(r.pct) + '%' : 'بدون حد') + '</span></div>' +
        (r.limit ? bar(r.pct) : '') + '</div>';
    }).join('') + '</div>';
    return h;
  }

  function viewRecurring(c){
    var p = c.plan, BC = window.BUDGET_CATS || [];
    var opts = BC.map(function(x){ return '<option value="' + x.v + '">' + x.i + ' ' + x.l + '</option>'; }).join('');
    var h = '<p class="bp-note">أضف الدخل والمصاريف الشهرية الثابتة (إيجار، اشتراك، مخصص…). تدخل في <b>التوقع فقط</b> ولا تُسجَّل كمعاملات. إذا سجّلت معاملة فعلية بنفس النوع والتصنيف في الشهر، لا تُحتسب النسخة المتكررة لذلك الشهر (لا ازدواج).</p>';
    h += '<div class="bp-rec-add"><input id="bpRName" placeholder="الاسم (اختياري)"><select id="bpRType"><option value="expense">مصروف</option><option value="income">دخل</option></select>' +
      '<select id="bpRCat">' + opts + '</select><input type="number" id="bpRAmt" inputmode="decimal" min="0" step="any" placeholder="المبلغ شهرياً">' +
      '<button class="btn btn-sm" id="bpRAdd">+ إضافة</button></div>';
    if(!p.recurring.length) h += '<div class="u-empty">ما في بنود متكررة بعد</div>';
    else h += '<div class="bp-rec">' + p.recurring.map(function(r){
      return '<div class="bp-rec-row"><span>' + (r.type === 'income' ? '📈' : '📉') + ' ' + esc(r.name || catLabel(r.category)) + ' <small>' + esc(catLabel(r.category)) + '</small></span><b>' + money(r.amount) + '</b>' +
        '<button class="btn btn-sm btn-danger" data-bp-del="' + esc(r.id) + '" aria-label="حذف">🗑</button></div>';
    }).join('') + '</div>';
    return h;
  }

  function scenarioFlow(c, sc){ return applyScenario(c.base, sc); }

  function viewForecast(c){
    var p = c.plan, b = c.base, d = ui.draft, hz = p.horizon;
    var h = '<div class="bp-assump"><b>الافتراضات:</b> ' +
      (b.days ? 'متوسط الإنفاق من آخر ' + b.days + ' يوم (' + money(b.expense) + '/شهر)' : 'ما في معاملات كافية لحساب متوسط') +
      '، الدخل المتوقع ' + (b.incomeSource === 'recurring' ? 'من البنود المتكررة' : b.incomeSource === 'average' ? 'من متوسط دخلك الفعلي' : 'غير متوفر (0)') + ' (' + money(b.income) + '/شهر)، والشهر = ' + DAYS_PER_MONTH + ' يوم.' +
      (b.days && !b.enough ? ' <span class="bp-warn">البيانات أقل من 28 يوم، فالتقدير تقريبي.</span>' : '') + '</div>';
    h += '<div class="bp-grid">' + field('مدة التخطيط (أشهر)', 'bpHorizon', hz, '') + '</div>';
    var cur = forecast(c.bal.balance, { net: b.income - b.expense }, hz);
    var sim = scenarioFlow(c, d), fs = forecast(c.bal.balance, sim, hz);
    var catsHtml = Object.keys(b.byCat).sort(function(x, y){ return b.byCat[y] - b.byCat[x]; }).slice(0, 6).map(function(k){
      return '<label class="bp-f"><span>تقليل ' + catLabel(k) + ' (' + money(b.byCat[k]) + '/شهر) %</span><input type="number" min="0" max="100" step="any" class="bp-cut" data-cat="' + k + '" value="' + (d.catCuts[k] || '') + '"></label>';
    }).join('');
    h += '<h4 class="bp-h">🧪 محاكاة (لا تغيّر بياناتك)</h4><div class="bp-grid">' +
      field('تغيير المصاريف %', 'bpSimExp', d.expensePct || '', 'مثلاً -10 لتقليل 10%') + field('تغيير الدخل %', 'bpSimInc', d.incomePct || '', '') +
      field('دخل إضافي شهرياً', 'bpSimXI', d.extraIncome || '', '') + field('مصروف إضافي شهرياً', 'bpSimXE', d.extraExpense || '', '') + catsHtml + '</div>';
    h += '<div class="bp-cmp"><div class="bp-col"><h5>الوضع الحالي</h5>' + colHtml(cur, b.income, b.expense, hz) + '</div>' +
      '<div class="bp-col sim"><h5>المحاكاة</h5>' + colHtml(fs, sim.income, sim.expense, hz) + '</div></div>';
    var diff = fs.after - cur.after;
    h += '<p class="bp-diff ' + (diff >= 0 ? 'pos' : 'neg') + '">الفرق بعد ' + hz + ' شهر: <b>' + (diff >= 0 ? '+' : '−') + money(Math.abs(diff)) + '</b>' + (fs.state === 'burning' && cur.state === 'burning' ? ' · مدة الرصيد ' + (fs.runwayMonths >= cur.runwayMonths ? '+' : '−') + r1(Math.abs(fs.runwayMonths - cur.runwayMonths)) + ' شهر' : '') + '</p>';
    h += '<div class="bp-save"><input id="bpScName" placeholder="اسم السيناريو (مثلاً: خطة توفير)" value="' + esc(ui.name) + '"><button class="btn btn-sm" id="bpScSave">💾 حفظ السيناريو</button><button class="btn btn-sm btn-ghost" id="bpScReset">إعادة ضبط</button></div>';
    if(p.scenarios.length){
      h += '<h4 class="bp-h">مقارنة السيناريوهات المحفوظة (' + hz + ' شهر)</h4><div class="bp-table"><div class="bp-tr head"><span>السيناريو</span><span>صافي شهري</span><span>الرصيد بعد المدة</span><span>يكفي</span><span>الفرق عن الحالي</span><span></span></div>';
      h += '<div class="bp-tr"><span>الحالي</span><span>' + money(cur.net) + '</span><span>' + money(cur.after) + '</span><span>' + fmtRunway(cur) + '</span><span>—</span><span></span></div>';
      p.scenarios.forEach(function(sc){
        var f = scenarioFlow(c, sc), ff = forecast(c.bal.balance, f, hz), df = ff.after - cur.after;
        h += '<div class="bp-tr"><span>' + esc(sc.name) + '</span><span>' + money(f.net) + '</span><span>' + money(ff.after) + '</span><span>' + fmtRunway(ff) + '</span><span class="' + (df >= 0 ? 'pos' : 'neg') + '">' + (df >= 0 ? '+' : '−') + money(Math.abs(df)) + '</span>' +
          '<span><button class="btn btn-sm btn-ghost" data-bp-load="' + esc(sc.id) + '">تحميل</button> <button class="btn btn-sm btn-ghost" data-bp-limits="' + esc(sc.id) + '" title="يحوّل تقليلات الفئات إلى حدود شهرية (لا يلمس المعاملات)">كحدود</button> <button class="btn btn-sm btn-danger" data-bp-delsc="' + esc(sc.id) + '" aria-label="حذف">🗑</button></span></div>';
      });
      h += '</div>';
    }
    return h;
  }
  function colHtml(f, inc, exp, hz){
    return '<div class="bp-line"><span>دخل متوقع</span><b>' + money(inc) + '</b></div><div class="bp-line"><span>إنفاق</span><b>' + money(exp) + '</b></div>' +
      '<div class="bp-line"><span>صافي شهري</span><b class="' + (f.net >= 0 ? 'pos' : 'neg') + '">' + money(f.net) + '</b></div>' +
      '<div class="bp-line"><span>الرصيد بعد ' + hz + ' شهر</span><b>' + money(f.after) + '</b></div><div class="bp-line"><span>يكفي</span><b>' + fmtRunway(f) + '</b></div>';
  }

  var scrollFix = null;
  function render(){
    var el = document.getElementById('budgetPlan'); if(!el) return;
    var c = context();
    var al = c.alerts.map(function(a){ return '<div class="bp-alert ' + a.k + '">' + (a.k === 'danger' ? '🚨' : '⚠️') + ' ' + esc(a.t) + '</div>'; }).join('');
    var tabs = [['month', 'الشهر والحدود'], ['forecast', 'التوقعات والسيناريوهات'], ['recurring', 'المتكرر']];
    var focus = document.activeElement && el.contains(document.activeElement) ? document.activeElement.id || null : null;
    el.innerHTML = '<div class="bp-tabs" role="tablist">' + tabs.map(function(t){ return '<button class="chip' + (ui.tab === t[0] ? ' active' : '') + '" data-bp-tab="' + t[0] + '" role="tab">' + t[1] + '</button>'; }).join('') + '</div>' +
      (al ? '<div class="bp-alerts">' + al + '</div>' : '') +
      (ui.tab === 'forecast' ? viewForecast(c) : ui.tab === 'recurring' ? viewRecurring(c) : viewMonth(c));
    bind(el);
    if(focus){ var f = document.getElementById(focus); if(f){ f.focus(); try{ var v = f.value; f.setSelectionRange && f.type === 'text' && f.setSelectionRange(v.length, v.length); }catch(e){} } }
  }

  function update(fn){ var p = load(); fn(p); save(p); render(); }

  function bind(el){
    el.querySelectorAll('[data-bp-tab]').forEach(function(b){ b.onclick = function(){ ui.tab = b.dataset.bpTab; render(); }; });
    var q = function(id){ return el.querySelector('#' + id); };
    if(q('bpOpen')) q('bpOpen').onchange = function(){ update(function(p){ p.openingBalance = num(q('bpOpen').value); }); };
    if(q('bpOpenDate')) q('bpOpenDate').onchange = function(){ update(function(p){ p.balanceDate = parseDate(q('bpOpenDate').value) ? q('bpOpenDate').value : ''; }); };
    if(q('bpBudget')) q('bpBudget').onchange = function(){ update(function(p){ p.monthlyBudget = pos(q('bpBudget').value); }); };
    el.querySelectorAll('.bp-limit').forEach(function(i){ i.onchange = function(){ update(function(p){ var v = pos(i.value); if(v > 0) p.limits[i.dataset.cat] = v; else delete p.limits[i.dataset.cat]; }); }; });
    if(q('bpHorizon')) q('bpHorizon').onchange = function(){ update(function(p){ p.horizon = Math.min(60, Math.max(1, Math.round(num(q('bpHorizon').value)) || 6)); }); };
    /* المحاكاة: تتحدّث الواجهة فقط ولا تُحفظ إلا بزر الحفظ */
    var sim = function(){
      ui.draft.expensePct = num(q('bpSimExp').value); ui.draft.incomePct = num(q('bpSimInc').value);
      ui.draft.extraIncome = pos(q('bpSimXI').value); ui.draft.extraExpense = pos(q('bpSimXE').value);
      ui.draft.catCuts = {}; el.querySelectorAll('.bp-cut').forEach(function(i){ var v = Math.min(100, pos(i.value)); if(v > 0) ui.draft.catCuts[i.dataset.cat] = v; });
      if(q('bpScName')) ui.name = q('bpScName').value;
      render();
    };
    ['bpSimExp', 'bpSimInc', 'bpSimXI', 'bpSimXE'].forEach(function(id){ if(q(id)) q(id).onchange = sim; });
    el.querySelectorAll('.bp-cut').forEach(function(i){ i.onchange = sim; });
    if(q('bpScName')) q('bpScName').oninput = function(){ ui.name = q('bpScName').value; };
    if(q('bpScReset')) q('bpScReset').onclick = function(){ ui.draft = { expensePct: 0, incomePct: 0, extraIncome: 0, extraExpense: 0, catCuts: {} }; ui.name = ''; render(); };
    if(q('bpScSave')) q('bpScSave').onclick = function(){
      var name = (q('bpScName').value || '').trim();
      if(!name){ window.toast && window.toast('اكتب اسماً للسيناريو', 'warn'); return; }
      update(function(p){ p.scenarios.push({ id: uid(), name: name.slice(0, 40), expensePct: ui.draft.expensePct, incomePct: ui.draft.incomePct, extraIncome: ui.draft.extraIncome, extraExpense: ui.draft.extraExpense, catCuts: JSON.parse(JSON.stringify(ui.draft.catCuts)) }); });
      ui.name = ''; render();
      window.toast && window.toast('حُفظ السيناريو (محاكاة فقط — بياناتك الفعلية ما تغيّرت)', 'success');
    };
    el.querySelectorAll('[data-bp-load]').forEach(function(b){ b.onclick = function(){ var sc = load().scenarios.filter(function(s){ return s.id === b.dataset.bpLoad; })[0]; if(!sc) return; ui.draft = { expensePct: num(sc.expensePct), incomePct: num(sc.incomePct), extraIncome: num(sc.extraIncome), extraExpense: num(sc.extraExpense), catCuts: JSON.parse(JSON.stringify(sc.catCuts || {})) }; ui.name = sc.name; render(); }; });
    el.querySelectorAll('[data-bp-delsc]').forEach(function(b){ b.onclick = function(){ update(function(p){ p.scenarios = p.scenarios.filter(function(s){ return s.id !== b.dataset.bpDelsc; }); }); }; });
    /* تطبيق صريح: تحويل تقليلات الفئات إلى حدود شهرية (لا يُعدّل المعاملات) */
    el.querySelectorAll('[data-bp-limits]').forEach(function(b){ b.onclick = function(){
      var c = context(), sc = c.plan.scenarios.filter(function(s){ return s.id === b.dataset.bpLimits; })[0]; if(!sc) return;
      var keys = Object.keys(sc.catCuts || {}); if(!keys.length){ window.toast && window.toast('هذا السيناريو بلا تقليلات فئات', 'info'); return; }
      var apply = function(){ update(function(p){ keys.forEach(function(k){ var avg = c.base.byCat[k] || 0; var lim = Math.round(avg * (1 - Math.min(100, num(sc.catCuts[k])) / 100)); if(lim > 0) p.limits[k] = lim; }); }); ui.tab = 'month'; render(); window.toast && window.toast('تم ضبط الحدود الشهرية', 'success'); };
      if(window.customConfirm) window.customConfirm('تحويل تقليلات «' + sc.name + '» إلى حدود شهرية للفئات؟ (المعاملات لا تتغيّر)', apply); else apply();
    }; });
    if(q('bpRAdd')) q('bpRAdd').onclick = function(){
      var amt = pos(q('bpRAmt').value); if(!amt){ window.toast && window.toast('أدخل مبلغاً صحيحاً', 'warn'); return; }
      var type = q('bpRType').value, cat = q('bpRCat').value;
      if((type === 'income') !== isIncomeCat(cat) && cat !== 'other-income' && cat !== 'other-expense'){ window.toast && window.toast('التصنيف لا يطابق النوع', 'warn'); return; }
      update(function(p){ p.recurring.push({ id: uid(), name: (q('bpRName').value || '').trim().slice(0, 40), type: type, category: cat, amount: amt }); });
    };
    el.querySelectorAll('[data-bp-del]').forEach(function(b){ b.onclick = function(){ update(function(p){ p.recurring = p.recurring.filter(function(r){ return r.id !== b.dataset.bpDel; }); }); }; });
  }

  /* ---------- واجهة عامة (للمساعد والاختبارات) ---------- */
  window.BudgetPlan = {
    render: render, context: context, load: load,
    /* يفتح تبويب المحاكاة بقيم مقترحة (للمساعد) — تجريبي فقط ولا يُحفظ */
    openSimulation: function(draft){
      ui.tab = 'forecast';
      ui.draft = { expensePct: num(draft && draft.expensePct), incomePct: num(draft && draft.incomePct), extraIncome: pos(draft && draft.extraIncome), extraExpense: pos(draft && draft.extraExpense), catCuts: (draft && draft.catCuts) || {} };
      if(window.switchTab) window.switchTab('budget');
      render();
    },
    _calc: { num: num, parseDate: parseDate, cleanTx: cleanTx, currentBalance: currentBalance, monthStats: monthStats, averages: averages, baseline: baseline,
      applyScenario: applyScenario, forecast: forecast, monthStatus: monthStatus, recurringMonthly: recurringMonthly, buildAlerts: buildAlerts, fmtRunway: fmtRunway }
  };

  var orig = window.renderBudget;
  window.renderBudget = function(){ if(orig) orig.apply(this, arguments); try{ render(); }catch(e){ console.warn('budget-plan', e); } };
  if(document.getElementById('budgetPlan') && document.getElementById('budget') && document.getElementById('budget').classList.contains('active')) window.renderBudget();
})();
