/* ============================================================
   outlook.js — عرض تقويم وبريد Outlook الجامعي عبر Microsoft Graph (قراءة فقط)
   - اختياري ومعطّل افتراضياً: يحتاج Client ID لتطبيق مسجّل في Microsoft Entra (يسجّله المستخدم/الجامعة؛ لا شيء مدمج بالتطبيق)
   - تدفق Authorization Code + PKCE بدون أي مكتبة ولا كلمات مرور تمر بالتطبيق
   - صلاحيات مفوّضة للقراءة فقط: User.Read, Mail.Read, Calendars.Read
   - الرمز (access token) يُحفظ بـ sessionStorage (يزول بإغلاق التبويب)؛ لا تُخزَّن رسائل ولا أحداث
   - قد تشترط الجامعة موافقة مسؤول؛ تظهر رسالة صريحة عند الرفض
   ============================================================ */
(function(){
  'use strict';
  var CID_KEY = 'msClientId', TENANT_KEY = 'msTenant';
  var SS_TOKEN = 'ss_ms_token', SS_VER = 'ss_ms_verifier', SS_STATE = 'ss_ms_state';
  var SCOPES = 'User.Read Mail.Read Calendars.Read';
  var GRAPH = 'https://graph.microsoft.com/v1.0';

  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function S(){ return window.S; }
  function ss(k, v){ try{ if(v === undefined) return sessionStorage.getItem(k); if(v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); }catch(e){} return null; }

  function b64url(buf){ var s = '', b = new Uint8Array(buf); for(var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function randomStr(n){ var a = new Uint8Array(n); (window.crypto || {}).getRandomValues(a); return b64url(a.buffer); }
  function sha256(str){ return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); }
  function redirectUri(){ return location.origin + location.pathname; }
  function tenant(){ return (S() && S().get(TENANT_KEY, '')) || 'organizations'; }
  function clientId(){ return (S() && S().get(CID_KEY, '')) || ''; }
  function supported(){ return !!(window.crypto && window.crypto.subtle && window.fetch && window.isSecureContext !== false); }

  /* ---------- تسجيل الدخول (PKCE) ---------- */
  function connect(){
    var cid = clientId();
    if(!cid) return Promise.reject(new Error('no-client'));
    if(!supported()) return Promise.reject(new Error('unsupported'));
    var verifier = randomStr(48), state = randomStr(16);
    return sha256(verifier).then(function(h){
      ss(SS_VER, verifier); ss(SS_STATE, state);
      var p = 'client_id=' + encodeURIComponent(cid) + '&response_type=code&redirect_uri=' + encodeURIComponent(redirectUri()) + '&response_mode=query' +
        '&scope=' + encodeURIComponent(SCOPES) + '&state=' + encodeURIComponent(state) + '&code_challenge=' + b64url(h) + '&code_challenge_method=S256&prompt=select_account';
      var url = 'https://login.microsoftonline.com/' + encodeURIComponent(tenant()) + '/oauth2/v2.0/authorize?' + p;
      if(window.__msNavigate) window.__msNavigate(url); else location.assign(url);
      return url;
    });
  }

  /* عند العودة من Microsoft: ?code=...&state=... */
  function handleRedirect(){
    var q = new URLSearchParams(location.search), code = q.get('code'), state = q.get('state'), err = q.get('error');
    if(!code && !err) return Promise.resolve(null);
    var clean = function(){ try{ history.replaceState(null, '', location.pathname + location.hash); }catch(e){} };
    if(err){ clean(); ss(SS_VER, null); ss(SS_STATE, null); return Promise.resolve({ ok: false, error: err, desc: q.get('error_description') || '' }); }
    var expected = ss(SS_STATE), verifier = ss(SS_VER);
    clean();
    if(!expected || !verifier || state !== expected){ ss(SS_VER, null); ss(SS_STATE, null); return Promise.resolve({ ok: false, error: 'state_mismatch' }); }
    var body = 'client_id=' + encodeURIComponent(clientId()) + '&grant_type=authorization_code&code=' + encodeURIComponent(code) + '&redirect_uri=' + encodeURIComponent(redirectUri()) + '&code_verifier=' + encodeURIComponent(verifier) + '&scope=' + encodeURIComponent(SCOPES);
    return fetch('https://login.microsoftonline.com/' + encodeURIComponent(tenant()) + '/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(function(r){ return r.json().then(function(j){ return { st: r.status, j: j }; }); })
      .then(function(x){
        ss(SS_VER, null); ss(SS_STATE, null);
        if(!x.j || !x.j.access_token) return { ok: false, error: (x.j && x.j.error) || 'token_failed', desc: (x.j && x.j.error_description) || '' };
        ss(SS_TOKEN, JSON.stringify({ t: x.j.access_token, exp: Date.now() + Math.max(60, (+x.j.expires_in || 3600) - 60) * 1000 }));
        return { ok: true };
      }).catch(function(e){ return { ok: false, error: 'network', desc: String(e && e.message || e) }; });
  }

  function token(){
    var raw = ss(SS_TOKEN); if(!raw) return null;
    try{ var o = JSON.parse(raw); if(o && o.t && o.exp > Date.now()) return o.t; }catch(e){}
    ss(SS_TOKEN, null); return null;
  }
  function disconnect(){ ss(SS_TOKEN, null); ss(SS_VER, null); ss(SS_STATE, null); }

  /* ---------- Graph (قراءة فقط) ---------- */
  function graph(path){
    var t = token(); if(!t) return Promise.reject(new Error('expired'));
    var tz = ''; try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(e){}
    return fetch(GRAPH + path, { headers: { Authorization: 'Bearer ' + t, Prefer: 'outlook.timezone="' + (tz || 'UTC') + '"' } }).then(function(r){
      if(r.status === 401){ ss(SS_TOKEN, null); throw new Error('expired'); }
      if(r.status === 403) throw new Error('forbidden');
      if(!r.ok) throw new Error('http-' + r.status);
      return r.json();
    });
  }
  function isoDay(d){ return d.toISOString().slice(0, 19); }
  function loadData(){
    var now = new Date(), end = new Date(now.getTime() + 7 * 86400000);
    var cal = '/me/calendarView?startDateTime=' + encodeURIComponent(isoDay(now)) + '&endDateTime=' + encodeURIComponent(isoDay(end)) + '&$top=15&$orderby=start/dateTime&$select=subject,start,end,location,isOnlineMeeting,onlineMeeting,webLink';
    var mail = '/me/mailFolders/inbox/messages?$top=5&$orderby=receivedDateTime desc&$select=subject,from,receivedDateTime,isRead,webLink';
    return Promise.all([graph(cal), graph(mail)]).then(function(a){ return { events: a[0].value || [], mails: a[1].value || [] }; });
  }

  var ERR = {
    'no-client': 'أدخل Client ID أولاً.',
    'unsupported': 'المتصفح أو الاتصال غير آمن لهذه الميزة (يلزم HTTPS ودعم WebCrypto).',
    'expired': 'انتهت الجلسة — اتصل من جديد.',
    'forbidden': 'ما أُعطيت صلاحية كافية. غالباً الجامعة تشترط موافقة مسؤول على التطبيق.',
    'state_mismatch': 'فشل التحقق الأمني عند العودة من Microsoft. أعد المحاولة.',
    'network': 'تعذّر الاتصال بـ Microsoft.'
  };
  function errText(code, desc){
    if(/AADSTS65001|consent_required|AADSTS90094|AADSTS650056|admin/i.test(String(code) + ' ' + String(desc))) return 'الجامعة تشترط موافقة مسؤول (IT) على هذا التطبيق قبل ما تقدر تستخدمه.';
    if(/AADSTS50011|redirect_uri/i.test(String(desc))) return 'عنوان إعادة التوجيه غير مسجّل بالتطبيق: سجّل ' + redirectUri() + ' كـ SPA redirect URI.';
    if(/AADSTS700016|invalid_client|unauthorized_client/i.test(String(code) + ' ' + String(desc))) return 'Client ID غير صحيح أو التطبيق غير مسجّل لهذا المستأجر.';
    return ERR[code] || ('خطأ: ' + (desc ? String(desc).slice(0, 140) : code));
  }

  /* ---------- واجهة ---------- */
  var view = { data: null, loading: false, error: '' };
  function fmtWhen(s){ var d = new Date(s && s.dateTime ? s.dateTime : s); if(isNaN(d.getTime())) return ''; return d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  function safeLink(u){ return /^https:\/\//i.test(u || '') ? u : ''; }

  function render(){
    var page = document.getElementById('hulinks'); if(!page) return;
    var box = document.getElementById('outlookCard');
    if(!box){ box = document.createElement('div'); box.id = 'outlookCard'; box.className = 'card ical-card'; var ref = document.getElementById('icalSync'); ref ? ref.after(box) : page.appendChild(box); }
    var cid = clientId(), connected = !!token(), h = '<div class="card-head"><h3>📧 Outlook الجامعي (قراءة فقط)</h3></div>';
    if(!cid){
      h += '<p class="bp-note">ميزة اختيارية تعرض اجتماعاتك القادمة (وروابط Teams) وآخر رسائلك. تحتاج <b>Client ID</b> لتطبيق مسجّل في Microsoft Entra، وهذا غالباً يتطلب موافقة قسم IT بالجامعة. التطبيق ما بيشوف كلمة مرورك، وبيقرأ فقط (User.Read وMail.Read وCalendars.Read).</p>' +
        '<div class="bp-rec-add"><input id="msCid" dir="ltr" placeholder="Application (client) ID" autocomplete="off"><button class="btn btn-sm" id="msSaveCid">حفظ</button></div>' +
        '<details class="pg-adv"><summary>طريقة التسجيل</summary><p class="bp-note">بوابة Azure ← Microsoft Entra ID ← App registrations ← New registration. النوع: Accounts in this organizational directory (أو أي دليل). أضف Redirect URI بنوع <b>Single-page application</b> بالقيمة: <code dir="ltr">' + esc(redirectUri()) + '</code>. أضف صلاحيات مفوّضة: User.Read, Mail.Read, Calendars.Read.</p></details>';
    } else if(!connected){
      h += '<p class="bp-note">Client ID محفوظ. اضغط للاتصال، وبتنتقل لصفحة Microsoft وترجع.</p>' + (view.error ? '<div class="bp-alert warn">⚠️ ' + esc(view.error) + '</div>' : '') +
        '<div class="bp-rec-add"><button class="btn btn-sm" id="msConnect">🔐 اتصال بحساب الجامعة</button><button class="btn btn-sm btn-ghost" id="msForget">تغيير Client ID</button></div>' +
        '<details class="pg-adv"><summary>المستأجر (Tenant)</summary><input id="msTenant" dir="ltr" value="' + esc(tenant()) + '" placeholder="organizations"></details>';
    } else if(view.loading){ h += '<div class="u-empty is-loading">جاري التحميل…</div>'; }
    else if(view.error){ h += '<div class="bp-alert danger">🚨 ' + esc(view.error) + '</div><div class="bp-rec-add"><button class="btn btn-sm" id="msConnect">🔐 اتصال من جديد</button><button class="btn btn-sm btn-ghost" id="msOut">قطع الاتصال</button></div>'; }
    else if(view.data){
      var ev = view.data.events, ml = view.data.mails, unread = ml.filter(function(m){ return !m.isRead; }).length;
      h += '<h4 class="bp-h">📅 الأسبوع القادم (' + ev.length + ')</h4>' + (ev.length ? '<div class="bp-rec">' + ev.map(function(e){
        var join = safeLink(e.onlineMeeting && e.onlineMeeting.joinUrl), link = join || safeLink(e.webLink);
        return '<div class="bp-rec-row"><span>' + esc(e.subject || '(بدون عنوان)') + '<small>' + esc(fmtWhen(e.start)) + (e.location && e.location.displayName ? ' · ' + esc(e.location.displayName) : '') + '</small></span>' + (link ? '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener noreferrer" href="' + esc(link) + '">' + (join ? '🎥 انضمام' : 'فتح') + '</a>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="u-empty">ما في أحداث بتقويمك هالأسبوع</div>');
      h += '<h4 class="bp-h">✉️ آخر الرسائل' + (unread ? ' (' + unread + ' غير مقروءة)' : '') + '</h4>' + (ml.length ? '<div class="bp-rec">' + ml.map(function(m){
        var from = m.from && m.from.emailAddress ? (m.from.emailAddress.name || m.from.emailAddress.address) : '', link = safeLink(m.webLink);
        return '<div class="bp-rec-row"><span>' + (m.isRead ? '' : '<b>● </b>') + esc(m.subject || '(بدون موضوع)') + '<small>' + esc(from) + ' · ' + esc(fmtWhen(m.receivedDateTime)) + '</small></span>' + (link ? '<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener noreferrer" href="' + esc(link) + '">فتح</a>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="u-empty">البريد الوارد فاضي</div>');
      h += '<div class="bp-rec-add"><button class="btn btn-sm" id="msRefresh">🔄 تحديث</button><button class="btn btn-sm btn-ghost" id="msOut">قطع الاتصال</button></div><p class="bp-note">العرض مؤقت: ما بتتخزّن رسائلك ولا أحداثك بالتطبيق.</p>';
    } else { h += '<div class="u-empty is-loading">جاري التحميل…</div>'; }
    box.innerHTML = h; bind(box);
    if(connected && !view.data && !view.loading && !view.error) refresh();
  }
  function refresh(){
    view.loading = true; view.error = ''; render();
    return loadData().then(function(d){ view.data = d; view.loading = false; render(); }).catch(function(e){ view.loading = false; view.data = null; view.error = errText(String(e && e.message || e)); render(); });
  }
  function bind(box){
    var q = function(id){ return box.querySelector('#' + id); };
    if(q('msSaveCid')) q('msSaveCid').onclick = function(){ var v = (q('msCid').value || '').trim(); if(!/^[0-9a-f-]{36}$/i.test(v)){ window.toast && window.toast('Client ID لازم يكون GUID (36 خانة)', 'warn'); return; } S().set(CID_KEY, v); render(); };
    if(q('msForget')) q('msForget').onclick = function(){ S().set(CID_KEY, ''); view = { data: null, loading: false, error: '' }; render(); };
    if(q('msTenant')) q('msTenant').onchange = function(){ S().set(TENANT_KEY, (q('msTenant').value || '').trim() || 'organizations'); };
    if(q('msConnect')) q('msConnect').onclick = function(){ connect().catch(function(e){ view.error = errText(String(e && e.message || e)); render(); }); };
    if(q('msRefresh')) q('msRefresh').onclick = function(){ view.data = null; refresh(); };
    if(q('msOut')) q('msOut').onclick = function(){ disconnect(); view = { data: null, loading: false, error: '' }; render(); };
  }

  /* عند العودة من Microsoft افتح صفحة الروابط مباشرة */
  handleRedirect().then(function(res){
    if(!res) return;
    if(!res.ok) view.error = errText(res.error, res.desc);
    var go = function(){ if(window.switchTab) window.switchTab('hulinks', false); render(); };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(go, 900); }); else setTimeout(go, 900);
  });

  /* app.js يُحمَّل بعد هذا الملف ويعرّف switchTab من جديد، فنراقب ظهور القسم نفسه بدل تغليف الدالة */
  function onShown(id, fn){
    var el = document.getElementById(id); if(!el || typeof MutationObserver === 'undefined') return;
    var was = el.classList.contains('active');
    new MutationObserver(function(){ var now = el.classList.contains('active'); if(now && !was){ try{ fn(); }catch(e){ console.warn(id, e); } } was = now; }).observe(el, { attributes: true, attributeFilter: ['class'] });
    if(was) setTimeout(fn, 0);
  }  onShown('hulinks', render);

  window.OutlookGraph = { connect: connect, handleRedirect: handleRedirect, token: token, disconnect: disconnect, loadData: loadData, render: render, errText: errText, supported: supported };
})();
