/* ============================================================
   native-bridge.js — جسر تطبيق أندرويد (غلاف Capacitor يحمّل الموقع المنشور)
   يعمل فقط داخل التطبيق (Capacitor.isNativePlatform())؛ على المتصفح لا يفعل شيئاً.
   1) إشعارات محلية حقيقية حتى والتطبيق مسكّر: نجدول تنبيهات 7 أيام قدّام (محاضرات، «اطلع الآن»، امتحانات، ملخص المهام)
      ونعيد الجدولة عند فتح التطبيق/تعديل البيانات. تحترم تفضيلات مركز التنبيهات وساعات الهدوء.
   2) تنزيل الملفات (نسخة احتياطية JSON، ics…): WebView ما بيعالج تنزيل روابط blob، فنحوّل a[download] إلى مشاركة/حفظ نظام أندرويد.
   الإضافات (LocalNotifications/Filesystem/Share) تُستدعى عبر Capacitor.registerPlugin؛ غيابها لا يكسر الموقع.
   ============================================================ */
(function(root, factory){
  var api = factory(root);
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root && root.document) root.NativeApp = api;
})(typeof window !== 'undefined' ? window : this, function(W){
  'use strict';

  /* ---------- خطة الإشعارات (نقية، قابلة للاختبار) ---------- */
  function pad(n){ return ('0' + n).slice(-2); }
  function hm(m){ return pad(Math.floor(m / 60)) + ':' + pad(Math.round(m % 60)); }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function atMin(day, m){ return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), Math.round(m % 60), 0, 0); }
  function toMin(t){ var m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : null; }
  function hashId(key){ var h = 5381; for(var i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000 + 1; }
  function inQuiet(prefs, m){
    if(!prefs.quietOn) return false; var a = toMin(prefs.quietFrom), b = toMin(prefs.quietTo); if(a === null || b === null) return false;
    return a <= b ? (m >= a && m < b) : (m >= a || m < b);
  }
  /* entries: [{key, dayIdx, start, end, hasEnd, name, room}] ؛ h: { buildingOf(entry)->{id,name}|null, walk(a,b)->min, leaveInfo(L,prev,bPrev,bNext,walk) } */
  function plan(o){
    var now = o.now, prefs = o.prefs || {}, entries = o.entries || [], space = o.space || {}, h = o.helpers || {}, days = o.days || 7, out = [];
    function add(key, title, body, at){
      if(at.getTime() <= now.getTime() + 20000) return;
      if(inQuiet(prefs, at.getHours() * 60 + at.getMinutes())) return;
      out.push({ id: hashId(key), key: key, title: title, body: body, at: at });
    }
    for(var off = 0; off < days; off++){
      var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off), dIdx = day.getDay(), dY = ymd(day);
      var list = entries.filter(function(e){ return e.dayIdx === dIdx; }).sort(function(a, b){ return a.start - b.start; });
      if(prefs.lec !== false){
        list.forEach(function(L, i){
          var b = h.buildingOf ? h.buildingOf(L) : null, place = b ? b.name : (L.room || '');
          var lead = Math.max(5, parseInt(prefs.lecMin, 10) || 10);
          add(dY + '|lec|' + L.key, '📚 «' + L.name + '» بعد ' + lead + ' د', hm(L.start) + (place ? ' — ' + place : ''), atMin(day, L.start - lead));
          /* «اطلع الآن»: نفس منطق SmartAssist */
          if(h.leaveInfo && b){
            var prev = null; for(var j = i - 1; j >= 0; j--){ if(list[j].end <= L.start){ prev = list[j]; break; } }
            var pb = prev && h.buildingOf ? h.buildingOf(prev) : null;
            var info = prev && pb ? h.leaveInfo(L, prev, pb.id, b.id, h.walk) : null;
            if(info) add(dY + '|leave|' + L.key, info.late ? '⚠️ ما بتلحق — اطلع هسا!' : '🚶 اطلع هسا لـ«' + L.name + '»', 'من ' + pb.name + ' إلى ' + b.name + ' — المشي ~' + info.walk + ' د، والمحاضرة ' + hm(L.start), atMin(day, info.leaveAt));
          }
        });
      }
      if(prefs.exams !== false){
        (space.exams || []).forEach(function(e){
          if(!e.date) return; var id = (e.id || e.name || '') + '_' + e.date, name = e.name || 'الامتحان', course = e.course ? ' (' + e.course + ')' : '';
          var tomorrow = ymd(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1));
          if(e.date === tomorrow) add(dY + '|examEve|' + id, '📝 امتحانك بكرة', name + course + (e.time ? ' الساعة ' + e.time : '') + ' — جهّز نفسك', atMin(day, 20 * 60));
          if(e.date === dY && e.time && toMin(e.time) !== null) add(dY + '|exam2h|' + id, '⏳ امتحانك بعد ساعتين', name + course + ' الساعة ' + e.time, atMin(day, toMin(e.time) - 120));
        });
      }
      if(prefs.tasks !== false){
        var due = (space.tasks || []).filter(function(t){ return t && !t.done && t.due === dY; });
        if(due.length){ var tm = toMin(prefs.tasksAt); if(tm === null) tm = 8 * 60; add(dY + '|tasks', '📝 عندك ' + due.length + ' ' + (due.length === 1 ? 'مهمة' : 'مهام') + ' اليوم', due.slice(0, 3).map(function(t){ return t.title; }).join(' • '), atMin(day, tm)); }
      }
    }
    out.sort(function(a, b){ return a.at - b.at; });
    return out.slice(0, o.limit || 60);
  }
  /* لقطة للودجات الأصلية: محاضرات 7 أيام (أوقات epoch) + مهام اليوم + أقرب امتحان. o: { now, entries, space, helpers:{placeOf(e),hueOf(name)}, days } */
  function widgetData(o){
    var now = o.now, entries = o.entries || [], space = o.space || {}, h = o.helpers || {}, days = o.days || 7, lectures = [];
    for(var off = 0; off < days; off++){
      var day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
      entries.forEach(function(e){
        if(e.dayIdx !== day.getDay()) return;
        var end = e.hasEnd ? e.end : e.start + 60;
        lectures.push({ s: atMin(day, e.start).getTime(), e: atMin(day, end).getTime(), n: String(e.name || '').slice(0, 60), p: String(h.placeOf ? h.placeOf(e) : (e.room || '')).slice(0, 40), h: h.hueOf ? h.hueOf(e.name) : 200 });
      });
    }
    lectures = lectures.filter(function(l){ return l.e > now.getTime(); }).sort(function(a, b){ return a.s - b.s; }).slice(0, 42);
    var today = ymd(now), due = (space.tasks || []).filter(function(t){ return t && !t.done && t.due && t.due <= today; });
    var ex = (space.exams || []).filter(function(x){ return x && x.date && x.date >= today; }).sort(function(a, b){ return a.date < b.date ? -1 : 1; })[0], exam = null;
    if(ex){ var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ex.date), tm = toMin(ex.time || ''); if(p) exam = { n: String(ex.name || 'امتحان').slice(0, 50), at: new Date(+p[1], +p[2] - 1, +p[3], tm === null ? 0 : Math.floor(tm / 60), tm === null ? 0 : tm % 60).getTime() }; }
    return { v: 1, at: now.getTime(), lectures: lectures, tasks: { due: due.length, titles: due.slice(0, 3).map(function(t){ return String(t.title || '').slice(0, 50); }) }, exam: exam };
  }
  /* ---- تحديث التطبيق (APK) من GitHub Pages: apk/version.json {versionCode, versionName, url, sha256, size, notes[]} ---- */
  function newerRelease(installedCode, remote, skippedCode){
    return !!(remote && typeof remote === 'object' && Number(remote.versionCode) > Number(installedCode) && Number(remote.versionCode) !== Number(skippedCode) && /^apk\/[\w.\-]+\.apk$/.test(String(remote.url || '')));
  }
  var pure = { newerRelease: newerRelease, plan: plan, widgetData: widgetData, hashId: hashId, inQuiet: inQuiet };
  if(!W || !W.document) return pure;

  /* ---------- وقت التشغيل داخل التطبيق ---------- */
  var d = W.document;
  function isNative(){ try{ return !!(W.Capacitor && typeof W.Capacitor.isNativePlatform === 'function' && W.Capacitor.isNativePlatform()); }catch(e){ return false; } }
  var cache = {};
  function plugin(name){
    if(cache[name]) return cache[name];
    var C = W.Capacitor, p = null;
    try{
      if(C && typeof C.registerPlugin === 'function') p = C.registerPlugin(name);                 /* حزمة @capacitor/core موجودة */
      else if(C && C.Plugins && C.Plugins[name]) p = C.Plugins[name];
      else if(C && typeof C.nativePromise === 'function' && typeof Proxy === 'function'){
        /* الغلاف يحمّل موقعاً بعيداً (server.url) بدون حزمة core: الجسر المحقون يوفّر nativePromise/addListener فقط، فنبني وسيطاً لكل إضافة */
        p = new Proxy({}, { get: function(t, m){
          if(m === 'then' || typeof m !== 'string') return undefined;
          if(m === 'addListener') return function(ev, cb){ return Promise.resolve(C.addListener(name, ev, cb)); };
          return function(opts){ return C.nativePromise(name, m, opts || {}); };
        } });
      }
    }catch(e){ p = null; }
    cache[name] = p;
    return cache[name];
  }
  function prefs(){ try{ return W.NotifyCenter && W.NotifyCenter.prefs ? W.NotifyCenter.prefs() : {}; }catch(e){ return {}; } }
  function helpers(){
    var CM = W.CampusMap, SA = W.SmartAssist;
    return {
      buildingOf: function(e){ var r = CM && CM.resolve ? CM.resolve(e) : null; return r && r.b ? { id: r.b.id, name: r.b.n } : null; },
      walk: function(a, b){ return CM.walkMinutes(a, b); },
      leaveInfo: SA && SA.leaveInfo
    };
  }
  function buildPlan(){
    var entries = W.Schedule && W.Schedule.entries ? W.Schedule.entries() : [];
    return plan({ now: new Date(), prefs: prefs(), entries: entries, space: W.space || {}, helpers: helpers(), days: 7 });
  }
  function widgetHelpers(){
    var CM = W.CampusMap;
    return {
      placeOf: function(e){ var r = CM && CM.resolve ? CM.resolve(e) : null; if(r && r.b) return r.b.n + (r.fl ? ' · ط' + r.fl : ''); return e.room || e.building || ''; },
      hueOf: function(n){ return W.courseHue ? W.courseHue(n) : 200; }
    };
  }
  function pushWidget(){
    if(!isNative()) return Promise.resolve({ native: false });
    var WB = plugin('WidgetBridge'); if(!WB) return Promise.resolve({ native: true, plugin: false });
    var entries = W.Schedule && W.Schedule.entries ? W.Schedule.entries() : [];
    var data = widgetData({ now: new Date(), entries: entries, space: W.space || {}, helpers: widgetHelpers(), days: 7 });
    return WB.update({ data: JSON.stringify(data) }).then(function(){ return { native: true, lectures: data.lectures.length }; }, function(e){ return { native: true, error: String(e && e.message || e) }; });
  }
  function openWidgetPicker(){
    var WB = plugin('WidgetBridge'); if(!WB){ if(W.toast) W.toast('الودجات متاحة بتطبيق أندرويد فقط', 'info'); return; }
    var old = d.getElementById('wgPicker'); if(old) old.remove();
    var ov = d.createElement('div'); ov.id = 'wgPicker'; ov.className = 'ocri-overlay'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    var box = d.createElement('div'); box.className = 'ocri-box'; ov.appendChild(box);
    function t(tag, cls, text){ var e = d.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
    box.appendChild(t('div', 'ocri-title', '📱 أضف ودجت للشاشة الرئيسية'));
    box.appendChild(t('div', 'ocri-sub', 'اختر الودجت وبيطلع لك طلب من أندرويد لإضافته. بتتحدّث تلقائياً من جدولك.'));
    var list = t('div', 'wg-list');
    [['next', '⏭', 'المحاضرة الجاية', 'اسم + عدّاد تنازلي حيّ + المبنى (2×2)'], ['today', '📅', 'جدول اليوم', 'كل محاضرات اليوم بألوان المواد + المهام (4×3)'], ['actions', '⚡', 'اختصارات سريعة', 'الآن · مهمة · الخريطة · الجدول (4×1)']].forEach(function(x){
      var b = t('button', 'wg-opt'); b.type = 'button'; b.setAttribute('data-wg', x[0]);
      b.appendChild(t('span', 'wg-ic', x[1])); var tx = t('span', 'wg-tx'); tx.appendChild(t('b', null, x[2])); tx.appendChild(t('small', null, x[3])); b.appendChild(tx);
      b.addEventListener('click', function(){
        pushWidget(); WB.pin({ type: x[0] }).then(function(r){
          ov.remove();
          if(!r || !r.requested) { if(W.toast) W.toast('جهازك ما بيدعم الإضافة المباشرة — اضغط مطوّلاً على الشاشة الرئيسية ← الودجات ← مساحتي الدراسية', 'info', 8000); }
        }, function(){ ov.remove(); if(W.toast) W.toast('تعذّر طلب الإضافة — جرّب من الودجات بالشاشة الرئيسية', 'warn', 6000); });
      });
      list.appendChild(b);
    });
    box.appendChild(list);
    var cl = t('button', 'ocri-btn ghost', 'إغلاق'); cl.type = 'button'; cl.addEventListener('click', function(){ ov.remove(); });
    var row = t('div', 'ocri-actions'); row.appendChild(cl); box.appendChild(row);
    ov.addEventListener('click', function(e){ if(e.target === ov) ov.remove(); });
    d.body.appendChild(ov);
  }
  /* ---------- تحديث التطبيق ---------- */
  var UP_KEY = 'ss_apk_check', SKIP_KEY = 'ss_apk_skip', CHECK_EVERY = 6 * 3600 * 1000;
  function siteBase(){ return W.location.origin + W.location.pathname.replace(/[^\/]*$/, ''); }
  function lsg(k){ try{ return W.localStorage.getItem(k); }catch(e){ return null; } }
  function lss(k, v){ try{ W.localStorage.setItem(k, v); }catch(e){} }
  function el(tag, cls, text){ var e = d.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function showUpdate(inf, rem){
    var AU = plugin('AppUpdater'); var old = d.getElementById('upDlg'); if(old) old.remove();
    var ov = el('div', 'ocri-overlay'); ov.id = 'upDlg'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    var box = el('div', 'ocri-box up-box'); ov.appendChild(box);
    box.appendChild(el('div', 'ocri-title', '🔄 تحديث جديد للتطبيق'));
    box.appendChild(el('div', 'ocri-sub', 'الإصدار ' + (rem.versionName || rem.versionCode) + ' (عندك ' + (inf.versionName || inf.versionCode) + ')' + (rem.size ? ' · ' + Math.round(rem.size / 1024 / 1024 * 10) / 10 + ' ميجا' : '')));
    if(Array.isArray(rem.notes) && rem.notes.length){ var ul = el('ul', 'up-notes'); rem.notes.slice(0, 8).forEach(function(n){ ul.appendChild(el('li', null, String(n).slice(0, 140))); }); box.appendChild(ul); }
    var bar = el('div', 'up-bar'); bar.hidden = true; var fill = el('i'); bar.appendChild(fill); box.appendChild(bar);
    var msg = el('div', 'ocri-note', 'الموقع نفسه بيتحدّث تلقائياً؛ هالتحديث للتطبيق (ميزات أندرويد الجديدة). بياخد دقيقة.'); box.appendChild(msg);
    var row = el('div', 'ocri-actions'), go = el('button', 'ocri-btn', 'تحديث الآن'), later = el('button', 'ocri-btn ghost', 'لاحقاً'), skip = el('button', 'ocri-btn ghost', 'تخطي هالإصدار');
    go.type = later.type = skip.type = 'button';
    later.addEventListener('click', function(){ ov.remove(); });
    skip.addEventListener('click', function(){ lss(SKIP_KEY, String(rem.versionCode)); ov.remove(); });
    go.addEventListener('click', function(){
      go.disabled = true; later.disabled = true; skip.disabled = true; bar.hidden = false; msg.textContent = 'جاري التنزيل…';
      var hp = AU.addListener ? AU.addListener('progress', function(e){ fill.style.width = (e && e.pct || 0) + '%'; msg.textContent = 'جاري التنزيل… ' + (e && e.pct || 0) + '%'; }) : null;
      AU.install({ url: siteBase() + rem.url, sha256: rem.sha256 || '' }).then(function(r){
        if(hp && hp.then) hp.then(function(h){ h && h.remove && h.remove(); });
        if(r && r.needsPermission){ msg.textContent = 'فعّل «السماح بالتثبيت من هالمصدر» لمساحتي الدراسية بالصفحة اللي فتحتها، وارجع واضغط «تحديث الآن» من جديد.'; bar.hidden = true; go.disabled = false; later.disabled = false; skip.disabled = false; return; }
        msg.textContent = 'فتحت شاشة التثبيت — أكّد التحديث من أندرويد.'; fill.style.width = '100%'; later.disabled = false; later.textContent = 'إغلاق';
      }, function(e){ msg.textContent = 'فشل التحديث: ' + String(e && e.message || e).slice(0, 120) + ' — جرّب بعد شوي.'; bar.hidden = true; go.disabled = false; later.disabled = false; skip.disabled = false; });
    });
    row.appendChild(go); row.appendChild(later); row.appendChild(skip); box.appendChild(row); d.body.appendChild(ov);
  }
  function checkUpdate(manual){
    if(!isNative()) return Promise.resolve({ native: false });
    var AU = plugin('AppUpdater'); if(!AU || !AU.info) return Promise.resolve({ native: true, plugin: false });
    if(!manual && Date.now() - Number(lsg(UP_KEY) || 0) < CHECK_EVERY) return Promise.resolve({ skipped: true });
    return AU.info().then(function(inf){
      return W.fetch(siteBase() + 'apk/version.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(function(rem){
        lss(UP_KEY, String(Date.now()));
        var sub = d.getElementById('updateSub'); if(sub) sub.textContent = 'الإصدار ' + inf.versionName + (newerRelease(inf.versionCode, rem, 0) ? ' — في تحديث ' + (rem.versionName || '') : ' — آخر إصدار ✓');
        if(newerRelease(inf.versionCode, rem, manual ? 0 : lsg(SKIP_KEY))){ showUpdate(inf, rem); return { update: true, remote: rem }; }
        if(manual && W.toast) W.toast('✅ أنت على آخر إصدار (' + inf.versionName + ')', 'success', 3000);
        return { update: false };
      });
    }).catch(function(e){ if(manual && W.toast) W.toast('تعذّر فحص التحديثات — تأكد من الإنترنت', 'warn', 4000); return { error: String(e && e.message || e) }; });
  }
  var permAsked = false, scheduling = false, again = false;
  function schedule(){
    if(!isNative()) return Promise.resolve({ native: false });
    var LN = plugin('LocalNotifications'); if(!LN) return Promise.resolve({ native: true, plugin: false });
    if(scheduling){ again = true; return Promise.resolve({ queued: true }); }
    scheduling = true;
    var p = (LN.checkPermissions ? LN.checkPermissions() : Promise.resolve({ display: 'granted' })).then(function(st){
      if(st && st.display === 'prompt' || st && st.display === 'prompt-with-rationale'){ if(permAsked) return st; permAsked = true; return LN.requestPermissions(); }
      return st;
    }).then(function(st){
      if(!st || st.display !== 'granted') return { native: true, permission: st && st.display };
      var items = buildPlan();
      return LN.getPending().then(function(pend){ var list = (pend && pend.notifications) || []; return list.length ? LN.cancel({ notifications: list.map(function(n){ return { id: n.id }; }) }) : null; }).then(function(){
        if(!items.length) return { native: true, scheduled: 0 };
        return LN.schedule({ notifications: items.map(function(n){ return { id: n.id, title: n.title, body: n.body, schedule: { at: (n.at && n.at.toISOString) ? n.at.toISOString() : n.at, allowWhileIdle: true }, smallIcon: 'ic_stat_icon', extra: { key: n.key } }; }) }).then(function(){ return { native: true, scheduled: items.length }; });
      });
    }).catch(function(e){ return { native: true, error: String(e && e.message || e) }; }).then(function(r){ scheduling = false; if(again){ again = false; setTimeout(schedule, 1500); } return r; });
    return p;
  }
  var tmr = null; function scheduleSoon(){ if(!isNative()) return; clearTimeout(tmr); tmr = setTimeout(function(){ schedule(); pushWidget(); }, 2500); }

  /* ---------- تنزيل الملفات عبر مشاركة أندرويد ---------- */
  function toBase64(blob){ return new Promise(function(res, rej){ var fr = new W.FileReader(); fr.onload = function(){ var s = String(fr.result); res(s.slice(s.indexOf(',') + 1)); }; fr.onerror = rej; fr.readAsDataURL(blob); }); }
  function saveNative(href, name){
    var FS = plugin('Filesystem'), SH = plugin('Share'); if(!FS || !SH) return Promise.reject(new Error('plugins'));
    return W.fetch(href).then(function(r){ return r.blob(); }).then(toBase64).then(function(b64){
      var fname = String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || 'file';
      return FS.writeFile({ path: fname, data: b64, directory: 'CACHE' }).then(function(r){ return SH.share({ title: fname, text: fname, url: r.uri, dialogTitle: 'احفظ أو شارك الملف' }); });
    });
  }
  function patchDownloads(){
    if(!isNative() || W.HTMLAnchorElement.prototype._nativeDl) return;
    var orig = W.HTMLAnchorElement.prototype.click; W.HTMLAnchorElement.prototype._nativeDl = true;
    W.HTMLAnchorElement.prototype.click = function(){
      var a = this, href = a.href || '';
      if(a.hasAttribute('download') && /^(blob:|data:)/.test(href)){
        saveNative(href, a.getAttribute('download')).catch(function(){ if(W.toast) W.toast('تعذّر حفظ الملف على الجهاز', 'warn', 4000); });
        return;
      }
      return orig.apply(a, arguments);
    };
  }

  function init(){
    if(!isNative()) return;
    d.documentElement.classList.add('native-app');
    patchDownloads();
    schedule(); pushWidget();
    var ub = d.getElementById('updateBtn'); if(ub && !ub._up){ ub._up = true; ub.addEventListener('click', function(){ if(W.closeSettingsMenu) W.closeSettingsMenu(); checkUpdate(true); }); }
    setTimeout(function(){ checkUpdate(false); }, 6000);
    var wb = d.getElementById('widgetBtn'); if(wb && !wb._wg){ wb._wg = true; wb.addEventListener('click', function(){ if(W.closeSettingsMenu) W.closeSettingsMenu(); openWidgetPicker(); }); }
    d.addEventListener('visibilitychange', function(){ if(d.visibilityState === 'visible') scheduleSoon(); });
    if(typeof W.saveSpace === 'function' && !W.saveSpace._nb){ var orig = W.saveSpace; W.saveSpace = function(){ var r = orig.apply(this, arguments); scheduleSoon(); return r; }; W.saveSpace._nb = true; }
  }
  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 1500); }); else setTimeout(init, 1500);

  return Object.assign(pure, { checkUpdate: checkUpdate, showUpdate: showUpdate, pushWidget: pushWidget, openWidgetPicker: openWidgetPicker, isNative: isNative, schedule: schedule, buildPlan: buildPlan, saveNative: saveNative, patchDownloads: patchDownloads, _plugin: plugin, _reset: function(){ cache = {}; } });
});
