/* ============================================================
   smart-assist.js — مساعد اليوم الجامعي للتلفون
   1) تنبيه «اطلع الآن»: لكل محاضرة بمبنى مختلف عن اللي قبلها، يحسب وقت المشي (من الخريطة) وينبّهك لحظة الطلعة المناسبة
      (يحترم مركز التنبيهات: خيار «تنبيه المحاضرات» + ساعات الهدوء).
   2) شاشة «الآن»: بطاقة كبيرة سريعة (المحاضرة الحالية/التالية + العدّ التنازلي + المبنى + وقت الطلعة + باقي اليوم)؛
      تُفتح من الاختصار (manifest) ?glance=1 أو من ⚙️ ← العمل.
   3) شارة أيقونة التطبيق (Badge API) = مهام اليوم والمتأخرة، حيث يدعمها الجهاز (أندرويد/ويندوز لتطبيق PWA المثبّت).
   4) اختصارات: ?quick=task يفتح إضافة مهمة مباشرة.
   ملاحظة: ما في «ويدجت» حقيقية لتطبيقات الويب على أندرويد/آيفون؛ البديل العملي: الاختصار + الشارة + شاشة «الآن».
   ============================================================ */
(function(root, factory){
  var api = factory(root);
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root && root.document) root.SmartAssist = api;
})(typeof window !== 'undefined' ? window : this, function(W){
  'use strict';

  /* ---------- حسابات نقية (قابلة للاختبار) ---------- */
  var BUFFER = 3;                                     /* دقائق احتياط قبل الوصول */
  function hm(m){ m = Math.round(m); return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
  /* ينتج معلومات الطلعة لمحاضرة L: prev = آخر محاضرة اليوم انتهت قبلها (خلال 3 ساعات) ببناء مختلف؛ walk(a,b) بالدقائق */
  function leaveInfo(L, prev, bPrev, bNext, walk){
    if(!L || !prev || !bPrev || !bNext || bPrev === bNext) return null;
    var gap = L.start - prev.end; if(gap < 0 || gap > 180) return null;
    var w = walk(bPrev, bNext), leaveAt = Math.max(prev.end, L.start - w - BUFFER);
    return { walk: w, leaveAt: leaveAt, gap: gap, tight: gap < w + 1, late: gap < w, from: bPrev, to: bNext };
  }
  /* هل الآن وقت إطلاق التنبيه؟ (نافذة 3 دقائق من وقت الطلعة، وقبل بداية المحاضرة) */
  function dueNow(info, nowMin, L){ return !!info && nowMin >= info.leaveAt && nowMin < info.leaveAt + 3 && nowMin < L.start; }
  function badgeCount(tasks, todayYmd){
    return (tasks || []).filter(function(t){ return t && !t.done && t.due && t.due <= todayYmd; }).length;
  }
  var pure = { leaveInfo: leaveInfo, dueNow: dueNow, badgeCount: badgeCount, BUFFER: BUFFER };
  if(!W || !W.document) return pure;

  /* ---------- واجهة المتصفح ---------- */
  var d = W.document;
  function esc(s){ return W.esc ? W.esc(s) : String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sp(){ return W.space || {}; }
  function todayYmd(){ var n = new Date(); return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2); }
  function lsGet(k){ try{ return W.localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ W.localStorage.setItem(k, v); }catch(e){} }
  function res(e){ return W.CampusMap && W.CampusMap.resolve ? W.CampusMap.resolve(e) : { b: null, fl: 0 }; }
  function walkFn(a, b){ return W.CampusMap.walkMinutes(a, b); }

  /* معلومات الطلعة لكل محاضرات اليوم الجاية */
  function leaveInfos(status){
    status = status || (W.Schedule ? W.Schedule.status() : null); if(!status || !W.CampusMap) return [];
    var list = status.today || [], out = [];
    list.forEach(function(L, i){
      if(L.state === 'done') return;
      var rb = res(L).b; if(!rb) return;
      var prev = null; for(var j = i - 1; j >= 0; j--){ if(list[j].end <= L.start){ prev = list[j]; break; } }
      if(!prev) return;
      var pb = res(prev).b; if(!pb) return;
      var info = leaveInfo(L, prev, pb.id, rb.id, walkFn);
      if(info){ info.L = L; info.prev = prev; info.fromName = pb.n; info.toName = rb.n; out.push(info); }
    });
    return out;
  }

  /* ---------- 1) تنبيه «اطلع الآن» ---------- */
  var FIRED = 'ss_leave_fired';
  function firedLoad(){ try{ var o = JSON.parse(lsGet(FIRED) || '{}'), t = todayYmd(), c = {}; Object.keys(o).forEach(function(k){ if(k.indexOf(t) === 0) c[k] = 1; }); return c; }catch(e){ return {}; } }
  function tick(force){
    if(!W.Schedule || !W.CampusMap) return [];
    if(W.NotifyCenter && W.NotifyCenter.allow && !W.NotifyCenter.allow('lec')) return [];
    var st = W.Schedule.status(), fired = firedLoad(), sent = [], changed = false;
    leaveInfos(st).forEach(function(info){
      var key = todayYmd() + '_leave_' + info.L.key;
      if(fired[key] || !(force || dueNow(info, st.nowMin, info.L))) return;
      fired[key] = 1; changed = true;
      var title = info.late ? '⚠️ ما بتلحق — اطلع هسا!' : '🚶 اطلع هسا لـ«' + info.L.name + '»';
      var body = 'من ' + info.fromName + ' إلى ' + info.toName + ' — المشي ~' + info.walk + ' د، والمحاضرة الساعة ' + hm(info.L.start) + (info.late ? ' (الفاصل أقصر من المشي)' : '');
      if(W.toast) W.toast(title + ' ' + body, info.late ? 'warn' : 'info', 9000);
      if(typeof W.showNotif === 'function') W.showNotif(title, body, { tag: key, data: { tab: 'campus' } });
      sent.push({ key: key, title: title, body: body });
    });
    if(changed) lsSet(FIRED, JSON.stringify(fired));
    return sent;
  }

  /* ---------- 2) شاشة «الآن» ---------- */
  var gEl = null, gTimer = null;
  function untilTxt(m){ m = Math.max(0, Math.ceil(m)); if(m < 60) return m + ' د'; var h = Math.floor(m / 60), r = m % 60; return h + ' س' + (r ? ' ' + r + ' د' : ''); }
  function glanceHtml(){
    var st = W.Schedule ? W.Schedule.status() : { today: [] }, e = st.current || st.next, later = !e && st.later ? st.later.entry : null, t = e || later;
    var h = '<div class="ga-top"><b>📱 الآن</b><button type="button" class="ga-x" data-ga="close" aria-label="إغلاق">✕</button></div>';
    if(!t){ return h + '<div class="ga-empty">ما في محاضرات بجدولك 🌴<br><small>أضف جدولك لتظهر هون المحاضرة الجاية.</small></div>'; }
    var hue = W.courseHue ? W.courseHue(t.name) : 200, r = res(t), infos = leaveInfos(st), li = infos.filter(function(i){ return i.L.key === t.key; })[0];
    var kicker = st.current ? '🔴 جارية الآن' : (st.next ? '⏭ المحاضرة التالية' : '📅 المحاضرة القادمة'), big;
    if(st.current) big = t.hasEnd ? 'باقي ' + untilTxt(t.end - st.nowMin) : 'بدأت';
    else if(st.next) big = 'بعد ' + untilTxt(t.start - st.nowMin);
    else big = (st.later.daysAhead === 1 ? 'بكرة' : (W.DAYS_AR || [])[t.dayIdx]) + ' ' + hm(t.start);
    var pct = st.current && t.hasEnd ? Math.min(100, Math.max(0, (st.nowMin - t.start) / (t.end - t.start) * 100)) : null;
    h += '<div class="ga-card" style="--ch:' + hue + '"><div class="ga-k">' + kicker + '</div><div class="ga-name">' + esc(t.name) + '</div><div class="ga-big">' + esc(big) + '</div>' +
      '<div class="ga-meta"><span>⏰ <bdi dir="ltr">' + hm(t.start) + (t.hasEnd ? '–' + hm(t.end) : '') + '</bdi></span>' + (r.b ? '<span>📍 ' + esc(r.b.n) + (r.fl ? ' · ط' + r.fl : '') + '</span>' : (t.room ? '<span>📍 ' + esc(t.room) + '</span>' : '')) + (t.instructor ? '<span>👤 ' + esc(t.instructor) + '</span>' : '') + '</div>' +
      (pct !== null ? '<div class="ga-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div>' : '') +
      (li ? '<div class="ga-leave' + (li.late ? ' bad' : '') + '">🚶 من ' + esc(li.fromName) + ': المشي ~' + li.walk + ' د — ' + (li.late ? 'الفاصل أقصر من المشي، اطلع أول ما تخلص' : 'اطلع الساعة <b>' + hm(li.leaveAt) + '</b>') + '</div>' : '') +
      (r.b ? '<button type="button" class="ga-btn" data-ga="map" data-b="' + r.b.id + '">🗺️ اعرضها على الخريطة</button>' : '') + '</div>';
    var rest = (st.today || []).filter(function(x){ return x.state !== 'done' && x.key !== t.key; });
    if(rest.length) h += '<div class="ga-list"><div class="ga-sub">باقي اليوم</div>' + rest.map(function(x){ var rb = res(x).b; return '<div class="ga-row"><bdi dir="ltr">' + hm(x.start) + '</bdi><b>' + esc(x.name) + '</b>' + (rb ? '<small>' + esc(rb.n) + '</small>' : '') + '</div>'; }).join('') + '</div>';
    var n = badgeCount(sp().tasks, todayYmd());
    var ex = (sp().exams || []).map(function(x){ var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x.date || ''); return p ? { x: x, dt: new Date(+p[1], +p[2] - 1, +p[3]) } : null; }).filter(function(z){ return z && z.dt.getTime() >= new Date().setHours(0, 0, 0, 0); }).sort(function(a, b){ return a.dt - b.dt; })[0];
    h += '<div class="ga-chips">' + (n ? '<button type="button" class="ga-chip" data-ga="tasks">📝 ' + n + ' مهمة اليوم/متأخرة</button>' : '<span class="ga-chip ok">📝 ما عليك مهام اليوم ✓</span>') +
      (ex ? '<span class="ga-chip">⏳ ' + esc(ex.x.name || 'امتحان') + ' — بعد ' + Math.round((ex.dt - new Date().setHours(0, 0, 0, 0)) / 86400000) + ' يوم</span>' : '') + '</div>';
    return h;
  }
  function renderGlance(){ if(gEl) gEl.innerHTML = glanceHtml(); }
  function closeGlance(){ if(gTimer){ clearInterval(gTimer); gTimer = null; } if(gEl && gEl.parentNode) gEl.parentNode.removeChild(gEl); gEl = null; d.documentElement.classList.remove('ga-open'); try{ var u = new W.URL(W.location.href); if(u.searchParams.has('glance')){ u.searchParams.delete('glance'); W.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); } }catch(e){} }
  function openGlance(){
    if(gEl){ renderGlance(); return gEl; }
    gEl = d.createElement('div'); gEl.className = 'ga-overlay'; gEl.setAttribute('role', 'dialog'); gEl.setAttribute('aria-modal', 'true'); gEl.setAttribute('aria-label', 'شاشة الآن');
    gEl.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('[data-ga]'); if(!b) return; var a = b.getAttribute('data-ga');
      if(a === 'close') closeGlance();
      else if(a === 'map'){ closeGlance(); W.switchTab('campus'); if(W.CampusMap) W.CampusMap.select(b.getAttribute('data-b'), true); }
      else if(a === 'tasks'){ closeGlance(); W.switchTab('tasks'); }
    });
    d.addEventListener('keydown', function esc2(e){ if(e.key === 'Escape' && gEl){ closeGlance(); d.removeEventListener('keydown', esc2); } });
    d.body.appendChild(gEl); d.documentElement.classList.add('ga-open'); renderGlance();
    gTimer = setInterval(renderGlance, 15000);
    return gEl;
  }

  /* ---------- 3) شارة الأيقونة ---------- */
  function updateBadge(){
    var n = badgeCount(sp().tasks, todayYmd());
    try{
      if(W.navigator && W.navigator.setAppBadge){ if(n > 0) W.navigator.setAppBadge(n).catch(function(){}); else if(W.navigator.clearAppBadge) W.navigator.clearAppBadge().catch(function(){}); }
    }catch(e){}
    return n;
  }

  /* ---------- 4) روابط الاختصارات ---------- */
  function handleParams(){
    var q; try{ q = new W.URLSearchParams(W.location.search); }catch(e){ return; }
    if(q.get('glance') === '1') openGlance();
    if(q.get('quick') === 'task'){
      try{ var u = new W.URL(W.location.href); u.searchParams.delete('quick'); W.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); }catch(e){}
      if(W.switchTab) W.switchTab('tasks'); setTimeout(function(){ if(W.addTask) W.addTask(); }, 350);
    }
  }
  function bindSettings(){
    var b = d.getElementById('glanceBtn'); if(b && !b._ga){ b._ga = true; b.addEventListener('click', function(){ if(W.closeSettingsMenu) W.closeSettingsMenu(); openGlance(); }); }
  }
  function init(){
    bindSettings(); handleParams(); updateBadge();
    setInterval(function(){ try{ tick(); }catch(e){} }, 60 * 1000);
    setInterval(updateBadge, 5 * 60 * 1000);
    d.addEventListener('visibilitychange', function(){ if(d.visibilityState === 'visible'){ updateBadge(); if(gEl) renderGlance(); } });
  }
  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 900); }); else setTimeout(init, 900);
  setTimeout(bindSettings, 1500);

  return Object.assign(pure, { leaveInfos: leaveInfos, tick: tick, openGlance: openGlance, closeGlance: closeGlance, updateBadge: updateBadge, handleParams: handleParams });
});
