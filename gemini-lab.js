/* ============================================================
   gemini-lab.js — استدعاء Gemini المشترك (من المتصفح مباشرة، طبقة Google AI Studio المجانية)
   يستعمل نفس مفتاح ونموذج «استيراد الجدول من صورة» (localStorage: ocr_gemini / ocr_gmodel)؛ المفتاح لا يدخل الكود ولا المزامنة،
   ويُرسَل لـGoogle فقط بترويسة x-goog-api-key. كل ما نرسله يذهب لـGoogle (والطبقة المجانية تستعمله لتحسين منتجاتها).
   الواجهة: GeminiLab.hasKey() / ensureKey() / json({parts,schema,system,signal}) / fileToPart(file) / explain(err)
   ============================================================ */
(function(){
  'use strict';
  var BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var DEFAULT_MODEL = 'gemini-flash-latest';
  var TIMEOUT_MS = 180000, RETRY_MS = 5000;

  function lget(k){ try{ return window.localStorage.getItem(k); }catch(e){ return null; } }
  function key(){ return (lget('ocr_gemini') || '').trim(); }
  function model(){ return (lget('ocr_gmodel') || '').trim() || DEFAULT_MODEL; }
  function hasKey(){ return !!key(); }

  /* لا مفتاح: نفتح إعدادات الاستيراد (نفس حوار المفتاح والنموذج) */
  function ensureKey(){
    if(hasKey()) return true;
    if(typeof window.toast === 'function') window.toast('🔑 هالميزة بتستعمل Gemini المجاني — ضع المفتاح أول (مرة وحدة)', 'info', 4500);
    if(window.OcrImport && window.OcrImport.openSettings) window.OcrImport.openSettings();
    return false;
  }

  function fileToBase64(file){
    return new Promise(function(resolve, reject){
      var fr = new FileReader();
      fr.onload = function(){ var s = String(fr.result); resolve(s.slice(s.indexOf(',') + 1)); };
      fr.onerror = function(){ reject(Object.assign(new Error('read'), { code: 'read' })); };
      fr.readAsDataURL(file);
    });
  }
  /* ملف (صورة/PDF) -> جزء inline_data */
  function fileToPart(file){
    return fileToBase64(file).then(function(b64){ return { inline_data: { mime_type: file.type || 'application/octet-stream', data: b64 } }; });
  }

  function post(body, signal){
    return new Promise(function(resolve, reject){
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null, done = false;
      var timer = setTimeout(function(){ if(done) return; done = true; if(ctrl) ctrl.abort(); reject(Object.assign(new Error('timeout'), { code: 'timeout' })); }, TIMEOUT_MS);
      if(signal && ctrl){ if(signal.aborted) ctrl.abort(); else signal.addEventListener('abort', function(){ ctrl.abort(); }); }
      var opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() }, body: body };
      if(ctrl) opts.signal = ctrl.signal;
      var p; try{ p = window.fetch(BASE + encodeURIComponent(model()) + ':generateContent', opts); }catch(e){ clearTimeout(timer); done = true; reject(Object.assign(e, { code: 'unreachable' })); return; }
      p.then(function(r){
        return r.json().then(function(j){
          if(!r.ok){ var msg = (j && j.error && (j.error.message || j.error)) || ('HTTP ' + r.status); throw Object.assign(new Error(String(msg)), { code: 'gemini', status: r.status }); }
          return j;
        }, function(){ throw Object.assign(new Error('bad response'), { code: 'gemini', status: r.status }); });
      }).then(function(j){ clearTimeout(timer); if(done) return; done = true; resolve(j); }, function(e){
        clearTimeout(timer); if(done) return; done = true;
        reject(e && e.code ? e : Object.assign(e || new Error('x'), { code: (signal && signal.aborted) ? 'aborted' : 'unreachable' }));
      });
    });
  }

  /* يرجّع الكائن المُحلَّل من رد JSON. 503 (Google مشغول، لا تُحسب من الحصة) تُعاد مرتين تلقائياً */
  function json(opts){
    var body = { contents: [{ parts: opts.parts }], generationConfig: { responseMimeType: 'application/json', temperature: opts.temperature == null ? 0 : opts.temperature } };
    if(opts.schema) body.generationConfig.responseSchema = opts.schema;
    if(opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    var payload = JSON.stringify(body), tries = 0;
    function go(){
      return post(payload, opts.signal).catch(function(e){
        if(e && e.status === 503 && tries < 2 && !(opts.signal && opts.signal.aborted)){ tries++; return new Promise(function(r){ setTimeout(r, window.__geminiRetryMs || RETRY_MS); }).then(go); }
        throw e;
      });
    }
    return go().then(function(j){
      var parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
      var txt = parts ? parts.map(function(p){ return p.text || ''; }).join('') : '';
      if(!txt){ var why = (j && j.promptFeedback && j.promptFeedback.blockReason) || 'رد فاضي'; throw Object.assign(new Error('Gemini ما رجّع نتيجة (' + why + ')'), { code: 'gemini' }); }
      try{ return JSON.parse(txt); }catch(e){ throw Object.assign(new Error('رد Gemini مش JSON صالح'), { code: 'gemini' }); }
    });
  }

  /* رسالة عربية مفهومة لأي خطأ */
  function explain(e){
    var code = e && e.code, msg = String((e && e.message) || '').slice(0, 200);
    if(code === 'aborted') return '';
    if(code === 'timeout') return 'انتهت المهلة (3 دقائق). جرّب ملفاً أصغر أو أعد المحاولة.';
    if(code === 'unreachable') return 'تعذّر الاتصال بـGemini — تأكد من الإنترنت وأعد المحاولة.';
    if(code === 'read') return 'ما قدرت أقرأ الملف.';
    if(code === 'gemini'){
      if((e && e.status === 503) || /high demand|overloaded|UNAVAILABLE/i.test(msg)) return 'Google مشغول هسا (ضغط مؤقت) وجرّبت 3 مرات. الحصة ما انصرفت — أعد المحاولة بعد دقيقة.';
      if((e && e.status === 429) || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg)) return 'انتهى الحد المجاني (~20 طلب باليوم لكل نموذج). بدّل النموذج من إعدادات الاستيراد أو جرّب بكرة.';
      if(/API key not valid|API_KEY_INVALID|API key expired/i.test(msg)) return 'المفتاح غير صالح — انسخه كاملاً من aistudio.google.com/apikey.';
      if(/no longer available|not found|is not supported/i.test(msg)) return 'النموذج غير متاح — اترك خانة النموذج فاضية (الافتراضي).';
      if(/too large|exceeds|size|payload/i.test(msg)) return 'الملف كبير على Gemini — جرّب ملفاً أصغر أو أقل صفحات.';
      return msg || 'Gemini رفض الطلب.';
    }
    return msg || 'صار خطأ غير متوقع.';
  }

  window.GeminiLab = { hasKey: hasKey, ensureKey: ensureKey, json: json, fileToPart: fileToPart, explain: explain, model: model, _post: post };
})();
