/* ============================================================
   daily.js — يومك الدراسي: وضع «اليوم فقط»، «بين محاضرتين»، وضع التهدئة قبل الامتحان، مصروف سريع،
   أوقات الذروة، + كثافة الواجهة، لون تمييز مخصص، وتقسيم القوائم الطويلة
   - لا يغيّر شكل space. الكتابة الوحيدة: مصروف سريع (نفس بنية addBudgetItem) بإجراء المستخدم وزر تراجع.
   - تفضيلات محلية فقط (خارج المزامنة): ss_today_mode, ss_density, ss_custom_accent, ss_focus_hours, ss_qs_last
   - الاقتراحات كلها من بيانات موجودة؛ لا شيء يُخترع، والافتراضات مكتوبة بجانب كل اقتراح
   ============================================================ */
(function(){
  'use strict';
  if(window._dailyLoaded) return;
  window._dailyLoaded = true;

  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function sp(){ return window.space || {}; }
  function $(id){ return document.getElementById(id); }
  function toast(m, t, d){ if(window.toast) window.toast(m, t, d); }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function lsJSON(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }catch(e){ return d; } }
  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function ssSet(k, v){ try{ sessionStorage.setItem(k, v); }catch(e){} }
  function pad(n){ return String(n).padStart(2, '0'); }
  function dstr(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hhmm(min){ min = Math.round(min); return pad(Math.floor(min / 60) % 24) + ':' + pad(min % 60); }
  function dur(min){ min = Math.max(1, Math.round(min)); return min >= 60 ? Math.floor(min / 60) + ' س' + (min % 60 ? ' ' + (min % 60) + ' د' : '') : min + ' د'; }
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  /* ============================================================
     بيانات (دوال نقية قابلة للاختبار)
     ============================================================ */
  function examDT(e){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(e && e.date || '')); if(!m) return null;
    var hh = 8, mm = 0, t = /^(\d{1,2}):(\d{2})/.exec(String(e.time || ''));   /* امتحان بلا وقت: نفترض 8:00 صباحاً */
    if(t){ hh = +t[1]; mm = +t[2]; }
    return new Date(+m[1], +m[2] - 1, +m[3], hh, mm, 0);
  }
  function dueCardsInfo(now){
    var t = dstr(now || new Date()), due = 0, fresh = 0;
    (sp().decks || []).forEach(function(d){ (d.cards || []).forEach(function(c){ if(!c.last) fresh++; else if((c.due || t) <= t) due++; }); });
    return { due: due, fresh: fresh };
  }
  function tasksInfo(now){
    var t = dstr(now || new Date()), over = [], today = [];
    (sp().tasks || []).forEach(function(k){
      if(k.done || !k.due) return;
      if(k.due < t) over.push(k); else if(k.due === t) today.push(k);
    });
    var byDue = function(a, b){ return String(a.due).localeCompare(String(b.due)); };
    return { over: over.sort(byDue), today: today };
  }
  function examsSoon(now, days){
    now = now || new Date(); var out = [];
    (sp().exams || []).forEach(function(e){
      var dt = examDT(e); if(!dt) return;
      var d = Math.round((new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
      if(d >= 0 && d <= days) out.push({ e: e, d: d, dt: dt });
    });
    return out.sort(function(a, b){ return a.dt - b.dt; });
  }
  /* امتحان خلال 24 ساعة القادمة (أو بدأ قبل أقل من 3 ساعات) */
  function calmExam(now){
    now = now || new Date(); var best = null;
    (sp().exams || []).forEach(function(e){
      var dt = examDT(e); if(!dt) return;
      var diffH = (dt - now) / 3600000;
      if(diffH > 24 || diffH < -3) return;
      if(!best || dt < best.dt) best = { e: e, dt: dt, hours: diffH };
    });
    return best;
  }
  function spentToday(now){
    var t = dstr(now || new Date()), s = 0;
    (sp().budget || []).forEach(function(b){ if(b.type === 'expense' && b.date === t) s += parseFloat(b.amount) || 0; });
    return Math.round(s * 100) / 100;
  }
  function schedule(now){ return window.Schedule ? window.Schedule.status(now || new Date()) : null; }
  function todayData(now){
    now = now || new Date();
    var st = schedule(now);
    return { now: now, st: st, tasks: tasksInfo(now), exams: examsSoon(now, 7), cards: dueCardsInfo(now), spent: spentToday(now) };
  }

  /* «بين محاضرتين»: انتهت محاضرة اليوم ولسا ما بدأت التالية، والفراغ بين 15 دقيقة و4 ساعات (ضمن 06:00–22:00) */
  function gap(now){
    now = now || new Date(); var h = now.getHours();
    if(h < 6 || h >= 22) return null;
    var st = schedule(now); if(!st || st.current || !st.next || !st.doneCount) return null;
    var m = Math.floor(st.next.start - st.nowMin);
    if(m < 15 || m > 240) return null;
    return { minutes: m, next: st.next, from: st.nowMin };
  }
  function suggestBetween(g, now){
    var items = []; if(!g) return items;
    var c = dueCardsInfo(now), m = g.minutes;
    if(c.due > 0){
      var n = Math.min(c.due, 20, Math.max(5, m * 2));   /* افتراض: ~30 ثانية للبطاقة */
      items.push({ k: 'cards', icon: '🃏', text: 'راجع ' + n + ' بطاقة مستحقة', est: Math.max(3, Math.ceil(n / 2)), note: 'افتراض: ~30 ث للبطاقة' });
    }
    var ti = tasksInfo(now), pool = ti.over.concat(ti.today);
    if(!pool.length){ (sp().tasks || []).forEach(function(k){ if(!k.done && k.due && k.due >= dstr(now || new Date())) pool.push(k); }); pool.sort(function(a, b){ return String(a.due).localeCompare(String(b.due)); }); }
    if(pool.length && m >= 20) items.push({ k: 'task', icon: '📝', text: 'اشتغل على «' + pool[0].title + '»', id: pool[0].id, est: Math.min(m - 5, 25), note: pool[0].due ? 'موعده ' + pool[0].due : '' });
    if(m >= 30 && g.next && g.next.name) items.push({ k: 'focus', icon: '⏱️', text: 'حضّر لمحاضرة «' + g.next.name + '»', course: g.next.name, est: Math.min(25, m - 5), note: 'جلسة تركيز قبل المحاضرة' });
    return items;
  }

  /* أوقات الذروة: سجل ساعة بدء كل جلسة تركيز (محلي) + أيام الأسبوع من studyLog الموجود */
  var FH = 'ss_focus_hours';
  document.addEventListener('ss:focus-complete', function(ev){
    var m = (ev && ev.detail && ev.detail.minutes) || 25, now = Date.now(), a = lsJSON(FH, []);
    if(!Array.isArray(a)) a = [];
    a.push({ h: new Date(now - m * 60000).getHours(), m: m, t: now });
    lsSet(FH, JSON.stringify(a.slice(-300)));
    renderPeak();
  });
  function peak(now){
    now = now || new Date();
    var a = lsJSON(FH, []); if(!Array.isArray(a)) a = [];
    var out = { n: a.length, hours: null, day: null, need: Math.max(0, 5 - a.length) };
    if(a.length >= 5){
      var blocks = {}, total = 0; a.forEach(function(x){ var b = Math.floor((+x.h || 0) / 2) * 2; blocks[b] = (blocks[b] || 0) + (+x.m || 0); total += (+x.m || 0); });
      var best = null; Object.keys(blocks).forEach(function(b){ if(best === null || blocks[b] > blocks[best]) best = b; });
      if(best !== null && total > 0) out.hours = { from: +best, to: +best + 2, share: Math.round(blocks[best] / total * 100) };
    }
    var log = window.S ? window.S.get('studyLog', {}) : {}, sums = [0, 0, 0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0, 0, 0], days = 0;
    Object.keys(log || {}).forEach(function(k){
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k); if(!m) return;
      var d = new Date(+m[1], +m[2] - 1, +m[3]); if((now - d) / 86400000 > 56 || d > now) return;
      var v = +log[k] || 0; if(v <= 0) return; sums[d.getDay()] += v; cnt[d.getDay()]++; days++;
    });
    if(days >= 3){
      var bi = -1, bv = 0; for(var i = 0; i < 7; i++){ if(cnt[i] && sums[i] / cnt[i] > bv){ bv = sums[i] / cnt[i]; bi = i; } }
      if(bi > -1) out.day = { idx: bi, name: DAYS[bi], avg: Math.round(bv) };
    }
    return out;
  }
  function peakLine(p){
    var parts = [];
    if(p.hours) parts.push('أفضل وقت لتركيزك: ' + hhmm(p.hours.from * 60) + '–' + hhmm(p.hours.to * 60) + ' (' + p.hours.share + '% من جلساتك)');
    if(p.day) parts.push('أنشط أيامك: ' + p.day.name + ' (~' + dur(p.day.avg) + ')');
    return parts.join(' · ');
  }
  function renderPeak(){
    var sec = $('timer'); if(!sec) return;
    var box = $('peakCard'), p = peak(), line = peakLine(p);
    var html = '<div class="card-head"><h3>⏰ أوقات ذروتك</h3></div>' +
      (line ? '<p class="pk-line">' + esc(line) + '</p>' : '') +
      (!p.hours ? '<p class="u-note">' + (p.n ? 'سُجّلت ' + p.n + ' جلسة؛ ' : 'ما في جلسات مسجّلة بعد؛ ') + 'يلزم ' + (p.need || 0) + ' جلسات تركيز إضافية لتظهر ساعاتك الأفضل (تُسجَّل ساعة بدء كل جلسة على جهازك فقط).</p>' : '') +
      (!p.day ? '<p class="u-note">أيام الأسبوع تظهر بعد 3 أيام دراسة على الأقل (من سجل الدراسة).</p>' : '') +
      '<p class="u-note">الافتراض: الذروة = أكثر كتلة ساعتين فيها دقائق تركيز. لا يُرسل أي شيء خارج جهازك.</p>';
    if(!box){ box = document.createElement('div'); box.id = 'peakCard'; box.className = 'card pk-card'; sec.appendChild(box); }
    if(box._h !== html){ box._h = html; box.innerHTML = html; }
  }

  /* ============================================================
     عرض اللوحة: اليوم فقط + بين محاضرتين + تهدئة + مصروف سريع
     ============================================================ */
  function ensure(dash, id, html, cls, afterNode){
    var n = $(id);
    if(html === null){ if(n) n.remove(); return null; }
    if(!n){
      n = document.createElement('section'); n.id = id; n.className = 'card ' + cls;
      var head = afterNode || dash.querySelector(':scope > .page-head');
      if(head && head.nextSibling) dash.insertBefore(n, head.nextSibling); else dash.appendChild(n);
    }
    if(n._h !== html){ n._h = html; n.innerHTML = html; }
    return n;
  }
  function todayHtml(d){
    var st = d.st, h = '<div class="card-head"><h3>🎯 اليوم — ' + DAYS[d.now.getDay()] + ' ' + d.now.getDate() + '/' + (d.now.getMonth() + 1) + '</h3><span class="u-note">وضع «اليوم فقط»</span></div>';
    var sections = 0;
    if(st && st.today.length){
      sections++;
      h += '<div class="td-sec"><b>📅 محاضراتك اليوم</b>' + st.today.map(function(e){
        var badge = e.state === 'now' ? '<span class="td-badge now">الآن</span>' : (st.next && st.next.key === e.key ? '<span class="td-badge next">القادمة بعد ' + dur(e.start - st.nowMin) + '</span>' : e.state === 'done' ? '<span class="td-badge done">انتهت</span>' : '');
        return '<div class="td-row' + (e.state === 'done' ? ' done' : '') + '"><bdi dir="ltr" class="td-time">' + hhmm(e.start) + '–' + hhmm(e.end) + '</bdi><span class="td-main">' + (window.courseLink ? window.courseLink(e.name, '') : esc(e.name)) + (e.room ? ' · ' + esc(e.room) : '') + '</span>' + badge + '</div>';
      }).join('') + '</div>';
    }
    var tk = d.tasks.over.concat(d.tasks.today);
    if(tk.length){
      sections++;
      h += '<div class="td-sec"><b>📝 مهام اليوم والمتأخرة</b>' + tk.slice(0, 6).map(function(k){
        var late = k.due < dstr(d.now);
        return '<label class="td-row td-task' + (late ? ' late' : '') + '"><input type="checkbox" data-td-task="' + esc(k.id) + '" aria-label="إنجاز ' + esc(k.title) + '"><span class="td-main">' + esc(k.title) + '</span>' + (late ? '<span class="td-badge late">متأخرة</span>' : '') + '</label>';
      }).join('') + (tk.length > 6 ? '<div class="u-note">و' + (tk.length - 6) + ' أخرى في صفحة المهام</div>' : '') + '</div>';
    }
    if(d.exams.length){
      sections++;
      h += '<div class="td-sec"><b>⏳ امتحانات قريبة</b>' + d.exams.slice(0, 3).map(function(x){
        return '<div class="td-row"><span class="td-main">' + esc(x.e.name || 'امتحان') + (x.e.course ? ' · ' + esc(x.e.course) : '') + '</span><span class="td-badge ' + (x.d <= 1 ? 'late' : 'next') + '">' + (x.d === 0 ? 'اليوم' : x.d === 1 ? 'غداً' : 'بعد ' + x.d + ' أيام') + '</span></div>';
      }).join('') + '</div>';
    }
    if(d.cards.due || d.cards.fresh){
      sections++;
      h += '<div class="td-sec"><b>🃏 البطاقات</b><div class="td-row"><span class="td-main">' + (d.cards.due ? d.cards.due + ' مستحقة' : '') + (d.cards.due && d.cards.fresh ? ' · ' : '') + (d.cards.fresh ? d.cards.fresh + ' جديدة' : '') + '</span><button class="btn btn-sm" type="button" data-td-cards>▶ راجع</button></div></div>';
    }
    var pk = peakLine(peak(d.now)); if(pk) h += '<p class="u-note td-peak">⏰ ' + esc(pk) + '</p>';
    if(!sections) h += '<div class="u-empty">🎉 ما في شي ملحّ اليوم</div>';
    if(d.spent) h += '<p class="u-note">💸 صرفت اليوم: ' + d.spent + ' د</p>';
    return h;
  }
  function gapHtml(g, items){
    return '<div class="card-head"><h3>🕒 بين محاضرتين</h3><span class="u-note">عندك ' + dur(g.minutes) + ' قبل «' + esc(g.next.name) + '» (' + hhmm(g.next.start) + ')</span></div>' +
      '<div class="gap-list">' + items.map(function(it){
        return '<button class="gap-item" type="button" data-gap="' + it.k + '"' + (it.id ? ' data-id="' + esc(it.id) + '"' : '') + (it.course ? ' data-course="' + esc(it.course) + '"' : '') + '><span class="gap-ic" aria-hidden="true">' + it.icon + '</span><span class="gap-tx">' + esc(it.text) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span><span class="gap-est">~' + it.est + ' د</span></button>';
      }).join('') + '</div>';
  }
  function calmHtml(c, now){
    var e = c.e, hrs = c.hours, when = hrs <= 0 ? 'بدأ قبل قليل' : hrs < 1 ? 'بعد ' + Math.max(1, Math.round(hrs * 60)) + ' دقيقة' : 'بعد ' + Math.round(hrs) + ' ساعة تقريباً';
    var pend = e.course ? (sp().tasks || []).filter(function(t){ return !t.done && t.course === e.course; }).length : 0, ci = dueCardsInfo(now);
    return '<div class="card-head"><h3>🧘 وضع التهدئة</h3><button class="btn btn-sm btn-ghost" type="button" data-calm="all">إظهار كل اللوحة</button></div>' +
      '<p class="calm-main"><b>' + esc(e.name || 'امتحان') + '</b>' + (e.course ? ' · ' + esc(e.course) : '') + ' — ' + when + (e.room ? ' · ' + esc(e.room) : '') + '</p>' +
      '<div class="calm-acts">' + (ci.due ? '<button class="btn btn-sm" type="button" data-calm="cards">🃏 راجع ' + ci.due + ' بطاقة</button>' : '') +
      (e.course ? '<button class="btn btn-sm" type="button" data-calm="focus" data-course="' + esc(e.course) + '">⏱️ جلسة تركيز</button>' : '') +
      '<button class="btn btn-sm btn-ghost" type="button" data-calm="exams">كل الامتحانات</button></div>' +
      (pend ? '<p class="u-note">📝 عندك ' + pend + ' مهمة مفتوحة بهذه المادة (مخفية الآن للتركيز).</p>' : '') +
      '<p class="u-note">اللوحة مبسّطة قبل الامتحان بـ24 ساعة. تقدر ترجع للوضع الكامل بأي وقت.</p>';
  }

  var QS = [['food', '🍔', 'طعام'], ['transport', '🚌', 'مواصلات'], ['books', '📚', 'قرطاسية'], ['entertainment', '🎮', 'ترفيه'], ['other-expense', '➖', 'آخر']];
  function qsHtml(sel, spent){
    return '<div class="card-head"><h3>💸 مصروف سريع</h3><span class="u-note" id="qsTotal">' + (spent ? 'اليوم: ' + spent + ' د' : 'ما صرفت اليوم') + '</span></div>' +
      '<div class="qs-chips" role="group" aria-label="التصنيف">' + QS.map(function(c){ return '<button type="button" class="qs-chip' + (sel === c[0] ? ' on' : '') + '" data-qs-cat="' + c[0] + '" aria-pressed="' + (sel === c[0]) + '">' + c[1] + ' ' + c[2] + '</button>'; }).join('') + '</div>' +
      '<div class="qs-row"><input id="qsAmount" type="number" inputmode="decimal" min="0.01" step="0.01" placeholder="المبلغ بالدينار" aria-label="المبلغ بالدينار"><button class="btn" id="qsAdd" type="button">＋ أضف</button></div>';
  }
  var qsSel = '';
  function renderQuickSpend(dash){
    var n = $('quickSpend');
    if(!n){
      n = ensure(dash, 'quickSpend', qsHtml(qsSel, spentToday()), 'quick-spend');
      n.setAttribute('aria-label', 'مصروف سريع');
      /* مكانه قبل قسم الميزانية (سياقه الطبيعي) وليس أول اللوحة؛ وإن لم يوجد القسم فبآخرها */
      var ref = dash.querySelector('[data-dsec="budget"]'); if(ref) dash.insertBefore(n, ref); else dash.appendChild(n);
      n.addEventListener('click', function(ev){
        var c = ev.target.closest && ev.target.closest('[data-qs-cat]');
        if(c){
          qsSel = c.getAttribute('data-qs-cat');
          n.querySelectorAll('[data-qs-cat]').forEach(function(b){ var on = b === c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
          var inp = $('qsAmount'), last = lsJSON('ss_qs_last', {}) || {};
          if(inp){ if(!inp.value && last[qsSel]) inp.value = last[qsSel]; inp.focus(); inp.select(); }
          return;
        }
        if(ev.target.closest && ev.target.closest('#qsAdd')) addQuick();
      });
      n.addEventListener('keydown', function(ev){ if(ev.key === 'Enter' && ev.target && ev.target.id === 'qsAmount'){ ev.preventDefault(); addQuick(); } });
    } else {
      var t = $('qsTotal'), s = spentToday(); if(t) t.textContent = s ? 'اليوم: ' + s + ' د' : 'ما صرفت اليوم';
    }
  }
  function addQuick(){
    var inp = $('qsAmount'); if(!inp || !window.space) return;
    if(!qsSel){ toast('اختر التصنيف أولاً', 'warn', 1800); var f = document.querySelector('#quickSpend [data-qs-cat]'); if(f) f.focus(); return; }
    var v = Math.round(parseFloat(inp.value) * 100) / 100;
    if(!(v > 0) || v > 100000){ inp.classList.add('is-invalid'); inp.setAttribute('aria-invalid', 'true'); inp.focus(); toast('أدخل مبلغاً صحيحاً أكبر من صفر', 'warn', 2200); return; }
    inp.classList.remove('is-invalid'); inp.removeAttribute('aria-invalid');
    if(!Array.isArray(window.space.budget)) window.space.budget = [];
    var item = { id: window.uid(), type: 'expense', category: qsSel, amount: v, date: window.today(), note: '' };
    window.space.budget.push(item);
    var last = lsJSON('ss_qs_last', {}) || {}; last[qsSel] = v; lsSet('ss_qs_last', JSON.stringify(last));
    if(window.saveSpace) window.saveSpace();
    inp.value = '';
    var cat = QS.filter(function(c){ return c[0] === qsSel; })[0];
    function refresh(){ if(window.renderBudget) window.renderBudget(); if(window.renderDashboard) window.renderDashboard(); }
    refresh();
    if(window.toastUndo) window.toastUndo('أُضيف مصروف ' + v + ' د (' + (cat ? cat[2] : '') + ')', function(){
      var a = window.space && window.space.budget; if(!Array.isArray(a)) return;
      var i = a.map(function(x){ return x.id; }).indexOf(item.id); if(i < 0) return;
      a.splice(i, 1); if(window.saveSpace) window.saveSpace(); refresh();
    });
  }

  function ensureToggle(dash, on){
    var head = dash.querySelector(':scope > .page-head'); if(!head) return;
    var b = $('todayToggle');
    if(!b){
      b = document.createElement('button'); b.id = 'todayToggle'; b.type = 'button'; b.className = 'btn btn-sm btn-ghost today-toggle';
      b.addEventListener('click', function(){ setTodayMode(lsGet('ss_today_mode') !== '1'); });
      head.appendChild(b);
    }
    b.textContent = on ? '📋 اللوحة الكاملة' : '🎯 اليوم فقط';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var m = $('todayBtn'); if(m){ var tt = m.querySelector('.tb-t'); if(tt) tt.textContent = on ? 'مفعّل — اللوحة مبسّطة' : 'اللوحة الكاملة'; m.setAttribute('aria-checked', on ? 'true' : 'false'); }
  }
  function setTodayMode(on){
    lsSet('ss_today_mode', on ? '1' : '0'); renderDaily();
    if(on && window.switchTab) window.switchTab('dashboard');
    toast(on ? '🎯 وضع «اليوم فقط»' : '📋 اللوحة الكاملة', 'info', 1600);
  }

  function renderDaily(){
    var dash = $('dashboard'); if(!dash || !window.space) return;
    var now = new Date(), todayMode = lsGet('ss_today_mode') === '1';
    var calm = calmExam(now), calmOn = !!calm && ssGet('ss_calm_off') !== String(calm.e.id || calm.e.name);
    document.body.classList.toggle('focus-today', todayMode);
    document.body.classList.toggle('focus-calm', calmOn);
    ensureToggle(dash, todayMode);
    /* الترتيب النهائي بعد العنوان: تهدئة ← اليوم ← بين محاضرتين ← مصروف سريع (نُنشئ بالعكس) */
    renderQuickSpend(dash);
    var g = gap(now), items = g ? suggestBetween(g, now) : [];
    ensure(dash, 'gapCard', (g && items.length) ? gapHtml(g, items) : null, 'gap-card');
    ensure(dash, 'todayView', todayMode ? todayHtml(todayData(now)) : null, 'today-view');
    ensure(dash, 'calmCard', calmOn ? calmHtml(calm, now) : null, 'calm-card');
    ['gapCard', 'todayView', 'calmCard'].forEach(function(id){ var n = $(id); if(n && !n._bound){ n._bound = true; n.addEventListener('click', onClick); n.addEventListener('change', onChange); } });
  }
  function onChange(ev){
    var cb = ev.target.closest && ev.target.closest('[data-td-task]');
    if(cb && window.toggleTask) window.toggleTask(cb.getAttribute('data-td-task'));
  }
  function onClick(ev){
    var t = ev.target; if(!t.closest) return;
    var b = t.closest('[data-td-cards]'); if(b){ if(window.CardsUI) window.CardsUI.review(null); return; }
    b = t.closest('[data-gap]');
    if(b){
      var k = b.getAttribute('data-gap');
      if(k === 'cards'){ if(window.CardsUI) window.CardsUI.review(null); }
      else if(k === 'task'){ if(window.switchTab) window.switchTab('tasks'); }
      else if(k === 'focus' && window.Progress && window.Progress.focusCourse) window.Progress.focusCourse(b.getAttribute('data-course'));
      return;
    }
    b = t.closest('[data-calm]');
    if(b){
      var c = b.getAttribute('data-calm');
      if(c === 'all'){ var cx = calmExam(new Date()); if(cx) ssSet('ss_calm_off', String(cx.e.id || cx.e.name)); renderDaily(); }
      else if(c === 'cards'){ if(window.CardsUI) window.CardsUI.review(null); }
      else if(c === 'focus' && window.Progress && window.Progress.focusCourse) window.Progress.focusCourse(b.getAttribute('data-course'));
      else if(c === 'exams' && window.switchTab) window.switchTab('exams');
    }
  }

  /* ============================================================
     كثافة الواجهة
     ============================================================ */
  function applyDensity(v){
    if(v === 'compact') document.documentElement.setAttribute('data-density', 'compact'); else document.documentElement.removeAttribute('data-density');
    var b = $('densityBtn'); if(b){ var t = b.querySelector('.db-t'); if(t) t.textContent = v === 'compact' ? 'مضغوطة' : 'مريحة'; b.setAttribute('aria-checked', v === 'compact' ? 'true' : 'false'); }
  }
  function toggleDensity(){
    var next = lsGet('ss_density') === 'compact' ? 'comfy' : 'compact';
    lsSet('ss_density', next); applyDensity(next); toast(next === 'compact' ? '📏 كثافة مضغوطة' : '📏 كثافة مريحة', 'info', 1500);
  }

  /* ============================================================
     لون تمييز مخصص: يُصحَّح تلقائياً ليبقى مقروءاً (4.5:1) على بطاقة الثيم الحالي
     ============================================================ */
  function hex2rgb(h){ h = String(h || '').replace('#', ''); if(h.length === 3) h = h.split('').map(function(x){ return x + x; }).join(''); if(!/^[0-9a-f]{6}$/i.test(h)) return null; return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }; }
  function rgb2hex(c){ return '#' + [c.r, c.g, c.b].map(function(v){ return pad(Math.max(0, Math.min(255, Math.round(v))).toString(16)); }).join(''); }
  function lum(c){ var f = function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); }
  function ratio(a, b){ var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function mix(c, t, k){ return { r: c.r + (t.r - c.r) * k, g: c.g + (t.g - c.g) * k, b: c.b + (t.b - c.b) * k }; }
  function parseCssColor(s){
    s = String(s || '').trim(); var c = hex2rgb(s); if(c) return c;
    var m = /^rgba?\(([^)]+)\)$/.exec(s); if(m){ var p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2] }; }
    return null;
  }
  /* يقرّب اللون من الأبيض/الأسود حتى يبلغ نسبة التباين المطلوبة؛ يرجع {hex, adjusted, ratio} */
  function fitAccent(hex, bg, min){
    var c = hex2rgb(hex); if(!c) return null; bg = bg || { r: 20, g: 28, b: 46 }; min = min || 4.5;
    var toward = lum(bg) > .5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 }, k = 0, cur = c, adjusted = false;
    while(ratio(cur, bg) < min && k < 1){ k += .04; cur = mix(c, toward, k); adjusted = true; }
    return { hex: rgb2hex(cur), adjusted: adjusted, ratio: Math.round(ratio(cur, bg) * 100) / 100 };
  }
  function applyCustomAccent(){
    var root = document.documentElement, hex = lsGet('ss_custom_accent');
    ['--accent', '--accent-2', '--glow', '--on-accent', '--grad'].forEach(function(p){ root.style.removeProperty(p); });
    if(!hex || !hex2rgb(hex)) return null;
    root.style.removeProperty('--accent');   /* نقرأ لون البطاقة الأصلي للثيم بدون تأثير تخصيصنا */
    var cs = getComputedStyle(root), card = parseCssColor(cs.getPropertyValue('--card')) || { r: 20, g: 28, b: 46 };
    var f = fitAccent(hex, card, 4.5); if(!f) return null;
    var a = hex2rgb(f.hex), second = rgb2hex(mix(a, lum(card) > .5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 }, .25));
    root.style.setProperty('--accent', f.hex); root.style.setProperty('--accent-2', second);
    root.style.setProperty('--glow', 'rgba(' + a.r + ',' + a.g + ',' + a.b + ',.35)');
    root.style.setProperty('--on-accent', lum(a) > .4 ? '#0b0f1a' : '#ffffff');
    root.style.setProperty('--grad', 'linear-gradient(135deg,' + f.hex + ',' + second + ')');
    return f;
  }
  window.applyCustomAccent = applyCustomAccent;
  function buildAccentRow(){
    var panel = $('themePanel'); if(!panel || $('accentRow')) return;
    var row = document.createElement('div'); row.id = 'accentRow'; row.className = 'accent-row';
    row.innerHTML = '<label for="accentPick">🎯 لون تمييز مخصص</label><div class="accent-ctl"><input type="color" id="accentPick" value="#22d3ee" aria-label="اختيار لون التمييز"><button class="btn btn-sm btn-ghost" type="button" id="accentReset">إعادة</button></div><div class="u-note" id="accentNote"></div>';
    panel.appendChild(row);
    var pick = $('accentPick'), note = $('accentNote'), saved = lsGet('ss_custom_accent'); if(saved && hex2rgb(saved)) pick.value = saved;
    pick.addEventListener('input', function(){
      lsSet('ss_custom_accent', pick.value); var f = applyCustomAccent();
      note.textContent = f && f.adjusted ? 'عدّلنا اللون قليلاً ليبقى مقروءاً (تباين ' + f.ratio + ':1)' : '';
    });
    $('accentReset').addEventListener('click', function(){ try{ localStorage.removeItem('ss_custom_accent'); }catch(e){} applyCustomAccent(); note.textContent = ''; });
  }

  /* ============================================================
     قوائم طويلة: أول 60 عنصراً ثم «عرض المزيد» (يمنع بطء الرسم مع مئات العناصر)
     ============================================================ */
  var LIMIT = 60, LIST_SEL = '#tasksList,#examsList,#budgetList,#notesList,#decksList,.cd-list';
  function limitList(c){
    var kids = Array.prototype.filter.call(c.children, function(k){ return !k.classList.contains('lz-more'); });
    var more = c.querySelector(':scope > .lz-more');
    if(kids.length <= LIMIT + 9 || c.getAttribute('data-lz') === 'all'){
      kids.forEach(function(k){ k.classList.remove('lz-hidden'); }); if(more) more.remove(); return;
    }
    kids.forEach(function(k, i){ k.classList.toggle('lz-hidden', i >= LIMIT); });
    var left = kids.length - LIMIT;
    if(!more){
      more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost lz-more';
      more.addEventListener('click', function(){ c.setAttribute('data-lz', 'all'); limitList(c); });
      c.appendChild(more);
    }
    var txt = 'عرض المزيد (' + left + ')'; if(more.textContent !== txt) more.textContent = txt;
  }
  function limitAll(){ document.querySelectorAll(LIST_SEL).forEach(function(c){ try{ limitList(c); }catch(e){} }); }

  /* ============================================================
     تشغيل: يُعاد الرسم مع renderDashboard وكل دقيقة (للحالة الزمنية) وعند تغيّر الرؤية
     ============================================================ */
  var raf = false;
  function schedRender(){ if(raf) return; raf = true; (window.requestAnimationFrame || setTimeout)(function(){ raf = false; try{ limitAll(); }catch(e){} }); }
  function init(){
    applyDensity(lsGet('ss_density') === 'compact' ? 'compact' : 'comfy');
    var db = $('densityBtn'); if(db && !db._d){ db._d = true; db.addEventListener('click', function(){ toggleDensity(); });   /* مفتاح تبديل: تبقى القائمة مفتوحة لرؤية الأثر */ }
    var tb = $('todayBtn'); if(tb && !tb._d){ tb._d = true; tb.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); setTodayMode(lsGet('ss_today_mode') !== '1'); }); }
    buildAccentRow(); applyCustomAccent(); renderPeak();
    var main = document.querySelector('main');
    if(main && typeof MutationObserver !== 'undefined') new MutationObserver(schedRender).observe(main, { childList: true, subtree: true });
    schedRender();
  }
  if(typeof window.renderDashboard === 'function' && !window._dailyDashWrapped){
    window._dailyDashWrapped = true;
    var orig = window.renderDashboard;
    window.renderDashboard = function(){ var r = orig.apply(this, arguments); try{ renderDaily(); }catch(e){ console.warn('daily', e); } return r; };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setInterval(function(){ if(!document.hidden && document.getElementById('dashboard') && document.getElementById('dashboard').classList.contains('active')) try{ renderDaily(); }catch(e){} }, 60000);
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) try{ renderDaily(); }catch(e){} });

  window.Daily = { todayData: todayData, gap: gap, suggestBetween: suggestBetween, calmExam: calmExam, peak: peak, peakLine: peakLine, render: renderDaily, setTodayMode: setTodayMode,
    fitAccent: fitAccent, ratio: ratio, hex2rgb: hex2rgb, limitList: limitList, examDT: examDT };
})();
