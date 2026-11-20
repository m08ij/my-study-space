/* ============================================================
   n8n.js — الربط مع خادم n8n (n8n Cloud)
   كل خدمات الذكاء الاصطناعي بالموقع بتمرّ من هون:
     • POST {BASE}/assistant  ← المساعد الذكي  { question, history, context } → { answer }
     • POST {BASE}/gemini     ← قراءة الصور (جدول/امتحانات/علامات) { model, request } → رد Gemini الخام
   مفتاح Gemini محفوظ بـn8n (Credentials) — ما في أي مفتاح بالموقع.
   العنوان: الثابت N8N_BASE تحت، ويقدر المطوّر يغيّره محلياً بـlocalStorage «ss_n8n_base».
   ============================================================ */
(function(){
  'use strict';
  if(window.N8n) return;
  var W = window;

  /* ⬇️ رابط Webhooks بـn8n Cloud (Production) — مثال: https://NAME.app.n8n.cloud/webhook */
  var N8N_BASE = 'https://m08ij.app.n8n.cloud/webhook';

  function base(){
    var o = ''; try{ o = (localStorage.getItem('ss_n8n_base') || '').trim(); }catch(e){}
    if(o === 'off') return '';  /* للاختبارات: تعطيل الرابط الافتراضي */
    return String(o || N8N_BASE || '').replace(/\/+$/, '');
  }
  function enabled(){ return /^https:\/\//.test(base()) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(base() + '/'); }

  /* طلب JSON مع مهلة؛ الأخطاء بترجع برمز واضح: off | timeout | network | server */
  function post(path, body, ms){
    if(!enabled()) return Promise.reject(Object.assign(new Error('خدمة n8n مش مربوطة'), { code: 'off' }));
    var ctrl = W.AbortController ? new AbortController() : null, timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, ms || 45000);
    return fetch(base() + '/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function(r){
        clearTimeout(timer);
        return r.text().then(function(t){
          var j = null; try{ j = t ? JSON.parse(t) : {}; }catch(e){}
          if(!r.ok || !j){ var e2 = new Error((j && (j.error || j.message)) || ('HTTP ' + r.status)); e2.code = 'server'; e2.status = r.status; throw e2; }
          if(j.error && !j.candidates && !j.answer){ var e3 = new Error(String(j.error.message || j.error)); e3.code = 'server'; e3.status = j.status || 500; throw e3; }
          return j;
        });
      }, function(e){ clearTimeout(timer); throw Object.assign(new Error(e && e.name === 'AbortError' ? 'انتهت المهلة' : 'تعذّر الاتصال بخادم n8n'), { code: e && e.name === 'AbortError' ? 'timeout' : 'network' }); });
  }

  function explain(e){
    var c = e && e.code;
    if(c === 'off') return 'الخدمة الذكية مش مربوطة حالياً.';
    if(c === 'timeout') return 'الخادم أخذ وقت طويل — جرّب كمان مرة.';
    if(c === 'network') return 'ما قدرت أوصل لخادم n8n — تأكد من الإنترنت.';
    if(e && e.status === 429) return 'في ضغط على الخدمة هسا — استنى دقيقة وجرّب.';
    return 'صار خطأ بالخادم' + (e && e.message ? ': ' + String(e.message).slice(0, 120) : '') + '.';
  }

  W.N8n = {
    base: base, enabled: enabled, post: post, explain: explain,
    /* المساعد: سؤال + آخر رسائل + ملخص البيانات → { answer } */
    ask: function(question, history, context, model){ var b = { question: String(question || '').slice(0, 800), history: (history || []).slice(-8), context: context || '' }; if(model) b.model = model; return post('assistant', b, 60000); },
    /* Gemini عبر n8n: نفس جسم طلب generateContent → نفس رد Gemini */
    gemini: function(model, request, ms){ return post('gemini', { model: model, request: request }, ms || 150000); }
  };
})();
