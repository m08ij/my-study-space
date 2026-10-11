/* ============================================================
   smart-assist.js — مساعد اليوم الجامعي للتلفون
   1) تنبيه «اطلع الآن»: لكل محاضرة بمبنى مختلف عن اللي قبلها، يحسب وقت المشي (من الخريطة) وينبّهك لحظة الطلعة المناسبة
      (يحترم مركز التنبيهات: خيار «تنبيه المحاضرات» + ساعات الهدوء).
   2) (أُلغيت شاشة «الآن» بإصدار 134؛ بطاقة «يومي الجامعي» باللوحة تغطيها)
   3) شارة أيقونة التطبيق (Badge API) = مهام اليوم والمتأخرة، حيث يدعمها الجهاز (أندرويد/ويندوز لتطبيق PWA المثبّت).
   4) اختصارات: ?quick=task يفتح إضافة مهمة مباشرة.
   ملاحظة: ما في «ويدجت» حقيقية لتطبيقات الويب على أندرويد/آيفون؛ البديل العملي: الاختصار + الشارة.
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

  /* شاشة «الآن» أُلغيت (134). نُبقي openGlance كوصلة توافق لودجات APK القديمة (تفتح اللوحة حيث «يومي الجامعي» فيه المحاضرة الجاية) */
  function openGlance(){ if(W.switchTab) W.switchTab('dashboard'); return true; }
  function closeGlance(){}

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
    if(q.get('glance') === '1'){ try{ var g = new W.URL(W.location.href); g.searchParams.delete('glance'); W.history.replaceState(null, '', g.pathname + (g.search || '') + g.hash); }catch(e){} openGlance(); }   /* اختصار قديم مثبّت */
    if(q.get('quick') === 'task'){
      try{ var u = new W.URL(W.location.href); u.searchParams.delete('quick'); W.history.replaceState(null, '', u.pathname + (u.search || '') + u.hash); }catch(e){}
      if(W.switchTab) W.switchTab('tasks'); setTimeout(function(){ if(W.addTask) W.addTask(); }, 350);
    }
  }
  function init(){
    handleParams(); updateBadge();
    setInterval(function(){ try{ tick(); }catch(e){} }, 60 * 1000);
    setInterval(updateBadge, 5 * 60 * 1000);
    d.addEventListener('visibilitychange', function(){ if(d.visibilityState === 'visible') updateBadge(); });
  }
  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 900); }); else setTimeout(init, 900);

  return Object.assign(pure, { leaveInfos: leaveInfos, tick: tick, openGlance: openGlance, closeGlance: closeGlance, updateBadge: updateBadge, handleParams: handleParams });
});
