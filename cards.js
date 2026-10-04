/* ============================================================
   cards.js — نظام البطاقات التعليمية: مراجعة متباعدة (SM-2 مبسّط) + جلسة مراجعة + إدارة + استيراد
   - يحل محل النسخة البدائية القديمة (renderDecks/openDeck/addDeck/deleteDeck كانت في features.js)
   - توافق بيانات قديمة: space.decks[i] = {id,name,cards:[{q,a}]}؛ نضيف حقولاً اختيارية فقط
       بطاقة: id, due(YYYY-MM-DD), ivl(أيام), ease, reps, lapses, last(YYYY-MM-DD)
       مجموعة: course (اسم مادة اختياري)
     بطاقة بلا last = جديدة. لا حقل يُحذف، ولا تغيير على شكل space.
   - سجل المراجعات اليومي محلي (ss_cards_log) خارج space والمزامنة (للعدّاد والسلسلة فقط)
   ============================================================ */
(function(){
  'use strict';
  if(window._cardsLoaded) return;
  window._cardsLoaded = true;

  var NEW_PER_SESSION = 20, EARLY_DAYS = 3, MAX_IVL = 365, LOG_KEY = 'ss_cards_log';
  var GRADES = [
    { g: 0, label: 'مجدداً', cls: 'again', key: '1' },
    { g: 1, label: 'صعب',    cls: 'hard',  key: '2' },
    { g: 2, label: 'جيد',    cls: 'good',  key: '3' },
    { g: 3, label: 'سهل',    cls: 'easy',  key: '4' }
  ];

  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function uid(){ return window.uid ? window.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toast(m, t, d){ if(window.toast) window.toast(m, t, d); }
  function save(){ if(window.saveSpace) window.saveSpace(); }
  function space(){ return window.space || {}; }
  function todayStr(){ return window.today(); }
  function addDays(str, n){
    var p = String(str).split('-'), d = new Date(+p[0], +p[1] - 1, +p[2] + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function decks(){ if(!window.space) return []; if(!Array.isArray(window.space.decks)) window.space.decks = []; return window.space.decks; }
  function findDeck(id){ return decks().filter(function(d){ return d.id === id; })[0]; }
  function cardsOf(d){ if(!Array.isArray(d.cards)) d.cards = []; d.cards.forEach(function(c){ if(!c.id) c.id = uid(); }); return d.cards; }

  /* ---------- الحالة والجدولة ---------- */
  function isNew(c){ return !c.last; }
  function isDue(c, t){ return !isNew(c) && (c.due || t) <= t; }
  function stats(d){
    var t = todayStr(), cs = cardsOf(d), s = { total: cs.length, due: 0, fresh: 0, mature: 0, next: '' };
    cs.forEach(function(c){
      if(isNew(c)) s.fresh++;
      else {
        if(isDue(c, t)) s.due++;
        else if(!s.next || c.due < s.next) s.next = c.due;
        if((c.ivl || 0) >= 21) s.mature++;
      }
    });
    s.learned = s.total - s.fresh;
    return s;
  }
  /* الفترة التالية حسب التقييم — دالة نقية (تُستخدم للمعاينة على الأزرار وللتطبيق الفعلي) */
  function plan(c, g){
    var ease = c.ease || 2.5, ivl = c.ivl || 0, reps = c.reps || 0, lapses = c.lapses || 0;
    if(g === 0) return { ivl: 0, ease: Math.max(1.3, ease - 0.2), reps: 0, lapses: lapses + 1 };
    var next;
    if(g === 1){ next = reps ? Math.max(1, Math.round(ivl * 1.2)) : 1; ease = Math.max(1.3, ease - 0.15); }
    else if(g === 2){ next = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(ivl * ease); if(reps >= 2) next = Math.max(next, ivl + 1); }
    else { next = reps === 0 ? 4 : Math.round(Math.max(ivl, 1) * ease * 1.3); next = Math.max(next, ivl + 2); ease = ease + 0.15; }
    return { ivl: Math.min(MAX_IVL, Math.max(1, next)), ease: Math.round(ease * 100) / 100, reps: reps + 1, lapses: lapses };
  }
  function ivlLabel(n){
    if(n <= 0) return 'بعد قليل';
    if(n === 1) return 'غداً';
    if(n < 30) return n + ' أيام';
    if(n < 365) return Math.round(n / 30) + ' أشهر';
    return 'سنة';
  }
  function applyGrade(c, g){
    var p = plan(c, g), t = todayStr();
    c.ivl = p.ivl; c.ease = p.ease; c.reps = p.reps; c.lapses = p.lapses; c.last = t; c.due = addDays(t, p.ivl);
  }
  function snapshot(c){ return { ivl: c.ivl, ease: c.ease, reps: c.reps, lapses: c.lapses, last: c.last, due: c.due }; }
  function restore(c, s){ ['ivl', 'ease', 'reps', 'lapses', 'last', 'due'].forEach(function(k){ if(s[k] === undefined) delete c[k]; else c[k] = s[k]; }); }

  /* ---------- سجل يومي محلي ---------- */
  function readLog(){ try{ var v = JSON.parse(localStorage.getItem(LOG_KEY)); return v && typeof v === 'object' ? v : {}; }catch(e){ return {}; } }
  function writeLog(l){ try{ localStorage.setItem(LOG_KEY, JSON.stringify(l)); }catch(e){} }
  function logReview(ok){
    var l = readLog(), t = todayStr(), e = l[t] || { n: 0, ok: 0 };
    e.n++; if(ok) e.ok++; l[t] = e;
    var keys = Object.keys(l).sort(); while(keys.length > 60) delete l[keys.shift()];
    writeLog(l);
  }
  function unlogReview(ok){
    var l = readLog(), t = todayStr(), e = l[t]; if(!e) return;
    e.n = Math.max(0, e.n - 1); if(ok) e.ok = Math.max(0, e.ok - 1); writeLog(l);
  }
  function streak(){
    var l = readLog(), t = todayStr(), n = 0, d = t;
    if(!(l[d] && l[d].n)) d = addDays(t, -1);
    while(l[d] && l[d].n){ n++; d = addDays(d, -1); }
    return n;
  }
  function todayCount(){ var e = readLog()[todayStr()]; return e ? e.n : 0; }

  /* ---------- طابور المراجعة ---------- */
  function buildQueue(deckId, early){
    var t = todayStr(), lim = early ? addDays(t, EARLY_DAYS) : t, due = [], fresh = [];
    decks().forEach(function(d){
      if(deckId && d.id !== deckId) return;
      cardsOf(d).forEach(function(c){
        var it = { d: d, c: c };
        if(isNew(c)) fresh.push(it); else if((c.due || t) <= lim) due.push(it);
      });
    });
    due.sort(function(a, b){ return String(a.c.due || '').localeCompare(String(b.c.due || '')); });
    return due.concat(fresh.slice(0, NEW_PER_SESSION));
  }
  function dueTotal(){ var n = 0; decks().forEach(function(d){ n += stats(d).due; }); return n; }

  /* ---------- نافذة عامة صغيرة (تتوافق مع الإغلاق بـ Esc وحبس Tab من ux.js) ---------- */
  function openBackdrop(cls, html, label){
    document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
    var opener = document.activeElement;
    var bd = document.createElement('div'); bd.className = 'modal-backdrop show cards-backdrop';
    bd.innerHTML = '<div class="modal cards-modal ' + cls + '" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + html + '</div>';
    document.body.appendChild(bd);
    bd._close = function(){
      if(!bd.parentNode) return;
      if(window.dismissOverlay) window.dismissOverlay(bd); else bd.remove();
      if(opener && opener.focus && document.contains(opener)){ try{ opener.focus(); }catch(e){} }
    };
    bd.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.stopPropagation(); bd._close(); } });
    bd.addEventListener('mousedown', function(e){ bd._down = e.target === bd; });
    bd.addEventListener('click', function(e){ if(e.target === bd && bd._down) bd._close(); });
    var x = bd.querySelector('[data-x]'); if(x) x.onclick = bd._close;
    return bd;
  }
  function rerender(){ if(window.renderDecks) window.renderDecks(); if(window.UX && window.UX.enhance) window.UX.enhance(); }

  /* ============================================================
     قائمة المجموعات
     ============================================================ */
  window.renderDecks = function(){
    var c = document.getElementById('decksList'); if(!c) return;
    var ds = decks();
    if(!ds.length){
      c.innerHTML = '<div class="empty"><div class="ic">🃏</div><p>لا توجد مجموعات</p></div>';
      return;
    }
    var due = dueTotal(), tc = todayCount(), st = streak(), total = 0, fresh = 0;
    ds.forEach(function(d){ var s = stats(d); total += s.total; fresh += s.fresh; });
    var html = '<div class="cd-hero">' +
      '<div class="cd-hero-main"><div class="cd-hero-n">' + due + '</div><div class="cd-hero-l">' + (due ? 'بطاقة مستحقة اليوم' : 'ما في بطاقات مستحقة') + '</div>' +
      '<div class="cd-hero-s">' + (fresh ? fresh + ' جديدة · ' : '') + total + ' بطاقة بالمجموع' + (tc ? ' · راجعت اليوم ' + tc : '') + (st > 1 ? ' · 🔥 ' + st + ' أيام متتالية' : '') + '</div></div>' +
      '<button class="btn" data-cd-all type="button"' + ((due || fresh) ? '' : ' disabled') + '>' + (due ? '▶ ابدأ مراجعة اليوم' : fresh ? '▶ ابدأ بالبطاقات الجديدة' : 'لا شيء للمراجعة') + '</button></div>';
    ds.forEach(function(d){
      var s = stats(d), pct = s.total ? Math.round(s.learned / s.total * 100) : 0, mpct = s.total ? Math.round(s.mature / s.total * 100) : 0;
      var next = (!s.due && s.next) ? '<span class="cd-chip">القادمة: ' + esc(s.next) + '</span>' : '';
      html += '<div class="fc-deck cd-deck" data-deck="' + esc(d.id) + '" role="button" tabindex="0" aria-label="إدارة بطاقات ' + esc(d.name) + '">' +
        '<div class="cd-deck-top"><div class="cd-deck-info"><div class="name">🃏 ' + esc(d.name) + (d.course ? ' <span class="cd-chip course">' + esc(d.course) + '</span>' : '') + '</div>' +
        '<div class="meta">' + s.total + ' بطاقة · ' + s.learned + ' متعلَّمة' + (s.mature ? ' · ' + s.mature + ' راسخة' : '') + '</div></div>' +
        '<button class="btn btn-sm btn-danger" data-del-deck="' + esc(d.id) + '" type="button" aria-label="حذف ' + esc(d.name) + '">🗑</button></div>' +
        '<div class="cd-bar" role="img" aria-label="تقدم التعلّم ' + pct + '%"><span class="m" style="width:' + mpct + '%"></span><span class="l" style="width:' + Math.max(0, pct - mpct) + '%"></span></div>' +
        '<div class="cd-deck-foot"><div class="cd-chips">' + (s.due ? '<span class="cd-chip due">' + s.due + ' مستحقة</span>' : '') + (s.fresh ? '<span class="cd-chip new">' + s.fresh + ' جديدة</span>' : '') + next + '</div>' +
        '<div class="cd-deck-btns"><button class="btn btn-sm btn-ghost" data-add-card="' + esc(d.id) + '" type="button">+ بطاقة</button>' +
        '<button class="btn btn-sm" data-review="' + esc(d.id) + '" type="button"' + ((s.due || s.fresh) ? '' : ' disabled') + '>▶ مراجعة</button></div></div></div>';
    });
    c.innerHTML = html;
    var all = c.querySelector('[data-cd-all]'); if(all) all.onclick = function(){ startReview(null); };
    c.querySelectorAll('[data-deck]').forEach(function(el){
      function open(e){ if(e.target.closest('button')) return; openManager(el.dataset.deck); }
      el.addEventListener('click', open);
      el.addEventListener('keydown', function(e){ if((e.key === 'Enter' || e.key === ' ') && e.target === el){ e.preventDefault(); open(e); } });
    });
    c.querySelectorAll('[data-del-deck]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); window.deleteDeck(b.dataset.delDeck); }); });
    c.querySelectorAll('[data-review]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); startReview(b.dataset.review); }); });
    c.querySelectorAll('[data-add-card]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); openManager(b.dataset.addCard, { focusAdd: true }); }); });
  };

  window.deleteDeck = function(id){
    var d = findDeck(id); if(!d) return;
    var idx = decks().indexOf(d);
    window.space.decks.splice(idx, 1); save(); rerender();
    if(window.toastUndo) window.toastUndo('حُذفت المجموعة "' + d.name + '"', function(){
      var a = decks(); if(a.some(function(x){ return x.id === id; })) return;
      a.splice(Math.min(idx, a.length), 0, d); save(); rerender();
    });
  };

  window.addDeck = function(){
    var opts = [{ v: '', l: '— بدون مادة —' }];
    (space().courses || []).forEach(function(c){ opts.push({ v: c.name, l: c.name }); });
    window.showModal('مجموعة جديدة', [
      { key: 'name', label: 'اسم المجموعة', placeholder: 'مثال: مصطلحات الشبكات' },
      { key: 'course', label: 'المادة (اختياري)', type: 'select', options: opts }
    ], { name: '', course: '' }, function(data){
      if(!data.name){ toast('أدخل اسماً للمجموعة', 'warn'); return false; }
      var dup = decks().some(function(d){ return String(d.name).trim().toLowerCase() === data.name.toLowerCase(); });
      if(dup){ toast('عندك مجموعة بنفس الاسم', 'warn'); return { field: 'name' }; }
      var d = { id: uid(), name: data.name, cards: [] }; if(data.course) d.course = data.course;
      decks().push(d); save(); rerender();
      setTimeout(function(){ openManager(d.id, { focusAdd: true }); }, 60);   /* مباشرة لإضافة أول بطاقة */
      return true;
    });
  };

  /* openDeck: نقطة الدخول القديمة — تفتح المراجعة إن وُجد مستحق، وإلا الإدارة */
  window.openDeck = function(id){
    var d = findDeck(id); if(!d) return;
    var s = stats(d);
    if(s.due || (s.fresh && s.total)) startReview(id); else openManager(id, { focusAdd: !s.total });
  };

  /* ============================================================
     جلسة المراجعة
     ============================================================ */
  function startReview(deckId, early){
    var q = buildQueue(deckId, early);
    if(!q.length){
      var s = deckId ? stats(findDeck(deckId) || { cards: [] }) : null;
      var bd = openBackdrop('cd-empty', '<div class="cd-done"><div class="cd-done-ic">🎉</div><h3>خلّصت مراجعة اليوم</h3><p class="cd-sub">' + (s && s.next ? 'البطاقة القادمة: ' + esc(s.next) : 'ما في بطاقات مستحقة الآن') + '</p>' +
        '<div class="modal-actions" style="justify-content:center"><button class="btn btn-ghost" data-x type="button">إغلاق</button><button class="btn" id="cdEarly" type="button">راجع مبكراً (' + EARLY_DAYS + ' أيام)</button></div></div>', 'لا بطاقات مستحقة');
      bd.querySelector('[data-x]').onclick = bd._close;
      bd.querySelector('#cdEarly').onclick = function(){
        if(!buildQueue(deckId, true).length){ toast('ما في بطاقات قريبة للمراجعة المبكرة', 'info'); return; }
        startReview(deckId, true);
      };
      bd.querySelector('#cdEarly').focus();
      return;
    }
    var total = q.length, pos = 0, revealed = false, done = 0, okCount = 0, history = [], bd = null, counts = [0, 0, 0, 0];

    function cur(){ return q[pos]; }
    function paint(){
      var it = cur();
      if(!it){ return finish(); }
      var c = it.c, pct = Math.round(done / total * 100);
      var head = '<div class="cd-head"><div class="cd-title">' + esc(deckId ? it.d.name : 'مراجعة اليوم') + '</div>' +
        '<div class="cd-count" aria-live="polite">' + Math.min(done + 1, total) + ' / ' + total + '</div>' +
        '<button class="sync-x" data-x type="button" aria-label="إغلاق المراجعة">✕</button></div>' +
        '<div class="cd-prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + pct + '%"></span></div>';
      var tag = isNew(c) ? '<span class="cd-chip new">جديدة</span>' : (c.lapses ? '<span class="cd-chip due">تعثّرت ' + c.lapses + '×</span>' : '');
      var face = '<div class="cd-face' + (revealed ? ' revealed' : '') + '" id="cdFace" tabindex="0" role="button" aria-expanded="' + revealed + '" aria-label="' + (revealed ? 'الجواب ظاهر' : 'اضغط لإظهار الجواب') + '">' +
        (!deckId ? '<div class="cd-from">' + esc(it.d.name) + '</div>' : '') + tag +
        '<div class="cd-q">' + esc(c.q) + '</div>' +
        (revealed ? '<div class="cd-sep"></div><div class="cd-a">' + esc(c.a) + '</div>' : '<div class="cd-hint">اضغط Space أو انقر لإظهار الجواب</div>') + '</div>';
      var acts;
      if(!revealed) acts = '<div class="cd-actions"><button class="btn cd-reveal" id="cdReveal" type="button">أظهر الجواب</button></div>';
      else acts = '<div class="cd-actions cd-grades">' + GRADES.map(function(G){
        return '<button class="cd-grade ' + G.cls + '" data-g="' + G.g + '" type="button"><span class="gl">' + G.label + '</span><span class="gi">' + ivlLabel(plan(c, G.g).ivl) + '</span><kbd>' + G.key + '</kbd></button>';
      }).join('') + '</div>';
      var foot = '<div class="cd-foot"><button class="btn btn-sm btn-ghost" id="cdUndo" type="button"' + (history.length ? '' : ' disabled') + '>↶ تراجع</button>' +
        '<button class="btn btn-sm btn-ghost" id="cdEdit" type="button">✏️ تعديل</button></div>';
      var box = bd.querySelector('.cards-modal');
      box.innerHTML = head + face + acts + foot;
      bd.querySelector('[data-x]').onclick = bd._close;
      bd.querySelector('#cdFace').onclick = reveal;
      var rv = bd.querySelector('#cdReveal'); if(rv) rv.onclick = reveal;
      box.querySelectorAll('.cd-grade').forEach(function(b){ b.onclick = function(){ grade(+b.dataset.g); }; });
      bd.querySelector('#cdUndo').onclick = undo;
      bd.querySelector('#cdEdit').onclick = function(){ bd._close(); openManager(it.d.id, { edit: c.id }); };
      var f = revealed ? box.querySelector('.cd-grade.good') : bd.querySelector('#cdReveal'); if(f) f.focus();
    }
    function reveal(){ if(!revealed){ revealed = true; paint(); } }
    function grade(g){
      if(!revealed || !cur()) return;
      var it = cur(), c = it.c, snap = snapshot(c), ok = g >= 2;
      applyGrade(c, g); save(); logReview(ok);
      history.push({ it: it, snap: snap, g: g, ok: ok, requeued: g === 0, wasPos: pos });
      counts[g]++;
      if(g === 0){ q.push(it); } else { done++; if(ok) okCount++; }
      pos++; revealed = false; paint();
    }
    function undo(){
      var h = history.pop(); if(!h) return;
      restore(h.it.c, h.snap); save(); unlogReview(h.ok); counts[h.g]--;
      if(h.requeued){ var i = q.lastIndexOf(h.it); if(i > -1 && i >= pos) q.splice(i, 1); } else { done--; if(h.ok) okCount--; }
      pos = h.wasPos; revealed = false; paint();
    }
    function finish(){
      var reviewed = counts[0] + counts[1] + counts[2] + counts[3], pctOk = done ? Math.round(okCount / done * 100) : 0;
      var box = bd.querySelector('.cards-modal');
      box.innerHTML = '<div class="cd-done"><div class="cd-done-ic">🎉</div><h3>أحسنت، خلّصت الجلسة</h3>' +
        '<div class="cd-stats"><div><b>' + done + '</b><span>بطاقة</span></div><div><b>' + pctOk + '%</b><span>إجابات جيدة</span></div><div><b>' + counts[0] + '</b><span>أُعيدت</span></div></div>' +
        '<p class="cd-sub">' + (dueTotal() ? 'بقي ' + dueTotal() + ' بطاقة مستحقة' : 'ما بقي شي مستحق اليوم') + '</p>' +
        '<div class="modal-actions" style="justify-content:center"><button class="btn btn-ghost" id="cdMgr" type="button">📋 البطاقات</button><button class="btn" data-x type="button">تم</button></div></div>';
      bd.querySelector('[data-x]').onclick = bd._close;
      bd.querySelector('#cdMgr').onclick = function(){ bd._close(); if(deckId) openManager(deckId); };
      bd.querySelector('[data-x]').focus();
      rerender();
      if(reviewed) toast('🎉 راجعت ' + done + ' بطاقة', 'success', 2200);
    }

    bd = openBackdrop('cd-session', '', 'مراجعة البطاقات');
    var onClose = bd._close;
    bd._close = function(){ document.removeEventListener('keydown', onKey, true); onClose(); rerender(); };
    function onKey(e){
      if(!document.body.contains(bd)){ document.removeEventListener('keydown', onKey, true); return; }
      if(e.key === 'Escape'){ e.stopPropagation(); bd._close(); return; }
      if(e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target && e.target.tagName;
      if(t === 'TEXTAREA' || t === 'INPUT' || t === 'SELECT') return;
      if(!cur()) return;
      if(e.key === ' ' || e.key === 'Enter'){
        if(e.target && e.target.tagName === 'BUTTON' && e.target.id !== 'cdReveal' && !e.target.classList.contains('cd-grade')) return;
        if(!revealed){ e.preventDefault(); reveal(); }
        else if(e.key === ' '){ e.preventDefault(); grade(2); }
      } else if(revealed && /^[1-4]$/.test(e.key)){ e.preventDefault(); grade(+e.key - 1); }
      else if(e.key.toLowerCase() === 'z' && history.length){ e.preventDefault(); undo(); }
    }
    document.addEventListener('keydown', onKey, true);
    paint();
  }
  window.CardsUI = { review: startReview, manage: function(id){ openManager(id); }, plan: plan, stats: stats };

  /* ============================================================
     إدارة بطاقات مجموعة: بحث + إضافة سريعة + تعديل + حذف مع تراجع + استيراد
     ============================================================ */
  function statusOf(c){
    var t = todayStr();
    if(isNew(c)) return { t: 'جديدة', k: 'new' };
    if(isDue(c, t)) return { t: 'مستحقة', k: 'due' };
    return { t: 'بعد ' + ivlLabel(Math.max(1, window.daysBetween(t, c.due))).replace(/^بعد /, ''), k: 'ok' };
  }
  function parseImport(text, existing){
    var seen = {}; existing.forEach(function(c){ seen[String(c.q).trim().toLowerCase()] = 1; });
    var out = [], dup = 0, bad = 0;
    String(text || '').split(/\r?\n/).forEach(function(line){
      line = line.trim(); if(!line) return;
      var i = line.indexOf('::'), sep = 2; if(i < 0){ i = line.indexOf('\t'); sep = 1; }
      if(i < 1){ bad++; return; }
      var q = line.slice(0, i).trim(), a = line.slice(i + sep).trim();
      if(!q || !a){ bad++; return; }
      var k = q.toLowerCase(); if(seen[k]){ dup++; return; } seen[k] = 1;
      out.push({ q: q.slice(0, 500), a: a.slice(0, 2000) });
    });
    return { cards: out, dup: dup, bad: bad };
  }

  function openManager(id, opts){
    opts = opts || {};
    var d = findDeck(id); if(!d) return;
    var filter = '', editing = opts.edit || null, bd = null;
    function draw(keepFocus){
      var cs = cardsOf(d), s = stats(d), f = filter.trim().toLowerCase();
      var list = cs.filter(function(c){ return !f || String(c.q).toLowerCase().indexOf(f) > -1 || String(c.a).toLowerCase().indexOf(f) > -1; });
      var rows = list.map(function(c){
        var st = statusOf(c);
        if(editing === c.id){
          return '<div class="cd-row editing" data-id="' + esc(c.id) + '"><label class="cd-lbl">السؤال<textarea rows="2" data-eq maxlength="500">' + esc(c.q) + '</textarea></label>' +
            '<label class="cd-lbl">الجواب<textarea rows="3" data-ea maxlength="2000">' + esc(c.a) + '</textarea></label>' +
            '<div class="cd-row-btns"><button class="btn btn-sm btn-ghost" data-ecancel type="button">إلغاء</button><button class="btn btn-sm" data-esave type="button">حفظ</button></div></div>';
        }
        return '<div class="cd-row" data-id="' + esc(c.id) + '"><div class="cd-row-txt"><div class="cd-row-q">' + esc(c.q) + '</div><div class="cd-row-a">' + esc(c.a) + '</div></div>' +
          '<div class="cd-row-side"><span class="cd-chip ' + st.k + '">' + esc(st.t) + '</span><button class="btn btn-sm btn-ghost" data-edit type="button" aria-label="تعديل البطاقة">✏️</button><button class="btn btn-sm btn-danger" data-del type="button" aria-label="حذف البطاقة">🗑</button></div></div>';
      }).join('');
      if(!rows) rows = '<div class="u-empty">' + (cs.length ? 'ما في نتائج لـ«' + esc(filter) + '»' : 'ما في بطاقات بعد — أضف أول بطاقة من الأعلى 👆') + '</div>';
      var prevQ = bd.querySelector('#cdNewQ'), prevA = bd.querySelector('#cdNewA'), imp = bd.querySelector('#cdImpTxt');
      var keep = { q: prevQ ? prevQ.value : '', a: prevA ? prevA.value : '', imp: imp ? imp.value : '', impOpen: bd.querySelector('#cdImp') ? !bd.querySelector('#cdImp').hidden : false };
      bd.querySelector('.cards-modal').innerHTML =
        '<div class="cd-head"><input class="cd-name" id="cdName" value="' + esc(d.name) + '" maxlength="60" aria-label="اسم المجموعة"><span class="cd-count">' + s.total + ' بطاقة</span><button class="sync-x" data-x type="button" aria-label="إغلاق">✕</button></div>' +
        '<div class="cd-addbox"><div class="cd-addrow"><textarea id="cdNewQ" rows="2" maxlength="500" placeholder="السؤال أو المصطلح" aria-label="السؤال">' + esc(keep.q) + '</textarea>' +
        '<textarea id="cdNewA" rows="2" maxlength="2000" placeholder="الجواب أو التعريف" aria-label="الجواب">' + esc(keep.a) + '</textarea></div>' +
        '<div class="cd-addbtns"><span class="cd-sub">Ctrl+Enter للإضافة السريعة</span><button class="btn btn-sm btn-ghost" id="cdImpBtn" type="button">📥 استيراد</button><button class="btn btn-sm" id="cdAdd" type="button">+ إضافة</button></div></div>' +
        '<div id="cdImp" class="cd-imp" hidden><p class="cd-sub">الصق بطاقاتك، كل سطر: <b>السؤال :: الجواب</b> (أو افصل بـ Tab). المكرر يتخطّى تلقائياً.</p><textarea id="cdImpTxt" rows="5" placeholder="TCP :: بروتوكول موثوق يضمن وصول البيانات&#10;UDP :: بروتوكول سريع بدون ضمان">' + esc(keep.imp) + '</textarea><div class="cd-addbtns"><span class="cd-sub" id="cdImpInfo"></span><button class="btn btn-sm" id="cdImpGo" type="button">استيراد</button></div></div>' +
        (cs.length > 6 ? '<input class="cd-search" id="cdSearch" type="search" placeholder="🔍 ابحث في البطاقات" value="' + esc(filter) + '" aria-label="بحث في البطاقات">' : '') +
        '<div class="cd-list">' + rows + '</div>' +
        '<div class="modal-actions"><button class="btn btn-ghost" data-x type="button">إغلاق</button><button class="btn" id="cdStudy" type="button"' + ((s.due || s.fresh) ? '' : ' disabled') + '>▶ مراجعة' + (s.due ? ' (' + s.due + ')' : '') + '</button></div>';
      wire(); if(keep.impOpen) bd.querySelector('#cdImp').hidden = false;
      var tgt = null;
      if(editing) tgt = bd.querySelector('[data-eq]');
      else if(opts.focusAdd && !keepFocus){ tgt = bd.querySelector('#cdNewQ'); opts.focusAdd = false; }
      if(tgt) tgt.focus();
    }
    function wire(){
      bd.querySelectorAll('[data-x]').forEach(function(b){ b.onclick = bd._close; });
      var nm = bd.querySelector('#cdName');
      function rename(){ var v = nm.value.trim(); if(!v){ nm.value = d.name; return; } if(v !== d.name){ d.name = v; save(); rerender(); } }
      nm.onblur = rename; nm.onkeydown = function(e){ if(e.key === 'Enter'){ e.preventDefault(); nm.blur(); } };
      var q = bd.querySelector('#cdNewQ'), a = bd.querySelector('#cdNewA');
      function add(){
        var qv = q.value.trim(), av = a.value.trim();
        if(!qv || !av){ var bad = !qv ? q : a; bad.classList.add('is-invalid'); bad.setAttribute('aria-invalid', 'true'); bad.focus(); toast('أدخل السؤال والجواب', 'warn', 1800); return; }
        var dup = cardsOf(d).some(function(c){ return String(c.q).trim().toLowerCase() === qv.toLowerCase(); });
        if(dup){ q.classList.add('is-invalid'); q.setAttribute('aria-invalid', 'true'); q.focus(); toast('هذا السؤال موجود أصلاً', 'warn', 2000); return; }
        d.cards.push({ id: uid(), q: qv, a: av }); save(); rerender();
        q.value = ''; a.value = ''; draw(true); bd.querySelector('#cdNewQ').focus();
      }
      bd.querySelector('#cdAdd').onclick = add;
      [q, a].forEach(function(el){
        el.addEventListener('input', function(){ el.classList.remove('is-invalid'); el.removeAttribute('aria-invalid'); });
        el.addEventListener('keydown', function(e){ if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); add(); } });
      });
      var imp = bd.querySelector('#cdImp'), it = bd.querySelector('#cdImpTxt'), info = bd.querySelector('#cdImpInfo');
      bd.querySelector('#cdImpBtn').onclick = function(){ imp.hidden = !imp.hidden; if(!imp.hidden) it.focus(); };
      it.addEventListener('input', function(){ var p = parseImport(it.value, cardsOf(d)); info.textContent = it.value.trim() ? p.cards.length + ' جاهزة' + (p.dup ? ' · ' + p.dup + ' مكررة' : '') + (p.bad ? ' · ' + p.bad + ' سطر غير صالح' : '') : ''; });
      bd.querySelector('#cdImpGo').onclick = function(){
        var p = parseImport(it.value, cardsOf(d));
        if(!p.cards.length){ toast(p.dup ? 'كلها مكررة' : 'ما في أسطر صالحة (السؤال :: الجواب)', 'warn', 2500); it.focus(); return; }
        p.cards.forEach(function(c){ d.cards.push({ id: uid(), q: c.q, a: c.a }); });
        save(); rerender(); it.value = ''; draw(true);
        toast('📥 أُضيفت ' + p.cards.length + ' بطاقة' + (p.dup ? ' (تخطّيت ' + p.dup + ' مكررة)' : ''), 'success', 2500);
      };
      var se = bd.querySelector('#cdSearch');
      if(se) se.oninput = function(){ filter = se.value; var pos = se.selectionStart; draw(true); var n = bd.querySelector('#cdSearch'); if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){} } };
      bd.querySelectorAll('.cd-row').forEach(function(row){
        var cid = row.dataset.id, c = cardsOf(d).filter(function(x){ return x.id === cid; })[0];
        var eb = row.querySelector('[data-edit]'); if(eb) eb.onclick = function(){ editing = cid; draw(true); };
        var db = row.querySelector('[data-del]');
        if(db) db.onclick = function(){
          var i = d.cards.indexOf(c); d.cards.splice(i, 1); save(); rerender(); draw(true);
          if(window.toastUndo) window.toastUndo('حُذفت البطاقة', function(){
            if(d.cards.some(function(x){ return x.id === cid; })) return;
            d.cards.splice(Math.min(i, d.cards.length), 0, c); save(); rerender(); if(document.body.contains(bd)) draw(true);
          });
        };
        var sv = row.querySelector('[data-esave]');
        if(sv) sv.onclick = function(){
          var eq = row.querySelector('[data-eq]'), ea = row.querySelector('[data-ea]');
          if(!eq.value.trim() || !ea.value.trim()){ (eq.value.trim() ? ea : eq).classList.add('is-invalid'); toast('السؤال والجواب مطلوبان', 'warn', 1800); return; }
          c.q = eq.value.trim(); c.a = ea.value.trim(); editing = null; save(); rerender(); draw(true);
        };
        var ec = row.querySelector('[data-ecancel]'); if(ec) ec.onclick = function(){ editing = null; draw(true); };
      });
      bd.querySelector('#cdStudy').onclick = function(){ bd._close(); startReview(d.id); };
    }
    bd = openBackdrop('cd-manager', '', 'بطاقات ' + d.name);
    draw(false);
  }
})();
