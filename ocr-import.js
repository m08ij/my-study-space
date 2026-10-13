/* ============================================================
   ocr-import.js — استيراد الجدول من صورة (تجريبي)
   محرّكان لقراءة الصورة، والنتيجة (بعد التحقق بـocr-parse.js) تُعبّئ نافذة «إضافة جدول» (openSmartTimetable) للمعاينة قبل الحفظ:
   1) Gemini (Google AI Studio، طبقة مجانية بدون بطاقة): مفتاح API تضعه بالإعدادات؛ يعمل من أي جهاز بدون أي خدمة. الصورة تُرسَل لـGoogle
      (والطبقة المجانية يستعملها Google لتحسين منتجاته). الحد المجاني: ~20 طلب/يوم لكل نموذج.
   2) خدمة محلية على جهازك (tools/ocr-lab/server.js، محرّك Windows OCR): بدون مفتاح؛ الصورة لا تغادر جهازك.
   الإضافة اليدوية تبقى كما هي، ولا يُحفظ شيء قبل ضغطك «حفظ الكل». الميزة تظهر على localhost، أو بعد تفعيلها من ⚙️ الإعدادات (أو ?ocr=1).
   المفتاح يُحفظ بـlocalStorage على هذا المتصفح فقط (ocr_gemini)، ولا يدخل الكود ولا المزامنة، ويُرسَل لـGoogle فقط (بترويسة x-goog-api-key).
   ============================================================ */
(function(){
  'use strict';
  var DEFAULT_ENDPOINT = 'http://127.0.0.1:8780/ocr';
  var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var DEFAULT_MODEL = 'gemini-flash-latest';                 /* اسم مستعار يتبع أحدث نموذج مجاني (الأسماء الثابتة تُسحب: 2.5 أُوقف للمستخدمين الجدد) */
  var TIMEOUT_MS = 180000;
  var MAX_BYTES = 12 * 1024 * 1024;
  var MAX_SIDE = 2400, THUMB_SIDE = 380, TYPE_OK = /^image\/(png|jpe?g|webp)$/;

  /* ---- دوال نقية (تُختبر بدون متصفح) ---- */
  function fitSize(w, h, max){
    if(!w || !h) return { w: w || 0, h: h || 0, scale: 1 };
    var k = Math.min(1, max / Math.max(w, h));
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)), scale: k };
  }
  function normDigits(v){
    return String(v == null ? '' : v).replace(/[٠-٩]/g, function(d){ return String(d.charCodeAt(0) - 1632); }).replace(/[۰-۹]/g, function(d){ return String(d.charCodeAt(0) - 1776); });
  }
  function mins(t){ var m = /^(\d{1,2}):(\d{2})$/.exec(normDigits(t)); return m ? +m[1] * 60 + +m[2] : null; }
  function rowKey(r){ return [String(r.name || '').trim(), (r.days || []).slice().sort().join(','), r.timeFrom || '', r.timeTo || ''].join('|'); }
  var RANK = { high: 0, medium: 1, review: 2 };
  /* دمج صفوف أكثر من صورة: نفس (المادة+الأيام+الوقت) مرة واحدة، ونحتفظ بالأوثق قراءة */
  function mergeRows(list){
    var out = [], idx = {};
    (list || []).forEach(function(r){
      var k = rowKey(r);
      if(k in idx){ var old = out[idx[k]]; if((RANK[r._ocr && r._ocr.confidence] || 1) < (RANK[old._ocr && old._ocr.confidence] || 1)) out[idx[k]] = r; return; }
      idx[k] = out.length; out.push(r);
    });
    return out;
  }
  /* فحص منطقي للصفوف: وقت غريب/مدة غريبة/تعارض بين صفين. يرفع الصف لـ«مراجعة» ويكتب السبب؛ يرجّع عدد التعارضات */
  function validateRows(rows){
    var conflicts = 0;
    function flag(r, why){ if(!r._ocr) r._ocr = { confidence: 'medium', reasons: [] }; if(r._ocr.reasons.indexOf(why) < 0) r._ocr.reasons.push(why); r._ocr.confidence = 'review'; }
    (rows || []).forEach(function(r){
      r.timeFrom = normDigits(r.timeFrom); r.timeTo = normDigits(r.timeTo);
      var f = mins(r.timeFrom), t = mins(r.timeTo);
      if(f !== null && (f < 7 * 60 || f > 21 * 60 + 30)) flag(r, 'وقت البداية خارج ساعات الدوام المعتادة');
      if(f !== null && t !== null){ var d = t - f; if(d < 25 || d > 240) flag(r, 'مدة المحاضرة غريبة (' + d + ' دقيقة)'); }
    });
    for(var i = 0; i < (rows || []).length; i++){
      for(var j = i + 1; j < rows.length; j++){
        var a = rows[i], b = rows[j];
        var share = (a.days || []).some(function(d){ return (b.days || []).indexOf(d) > -1; });
        var a0 = mins(a.timeFrom), a1 = mins(a.timeTo), b0 = mins(b.timeFrom), b1 = mins(b.timeTo);
        if(share && a0 !== null && a1 !== null && b0 !== null && b1 !== null && a0 < b1 && b0 < a1){
          conflicts++; flag(a, 'تعارض بالوقت مع «' + (b.name || '؟') + '»'); flag(b, 'تعارض بالوقت مع «' + (a.name || '؟') + '»');
        }
      }
    }
    return conflicts;
  }
  /* هل الخطأ يستاهل نجرّب نموذجاً ثانياً؟ (حصة هالنموذج منتهية/غير متاح). 503 = Google كله مشغول فنعيد على نفس النموذج فقط؛ مفتاح غلط أو صورة مرفوضة لا */
  function modelRetryable(e){
    var msg = String((e && e.message) || '');
    return !!e && e.status !== 503 && (e.status === 429 || e.status === 404 || /quota|exceeded|RESOURCE_EXHAUSTED|no longer available|not found|is not supported/i.test(msg));
  }
  function explainGemini(e){
    var msg = String((e && e.message) || '').slice(0, 220);
    if((e && e.status === 503) || /high demand|overloaded|UNAVAILABLE/i.test(msg)) return 'Google مشغول هسا (ضغط مؤقت). الحصة ما انصرفت — أعد المحاولة بعد دقيقة أو دقيقتين.';
    if((e && e.status === 429) || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg)) return 'انتهى الحد المجاني لكل النماذج المجرَّبة (حوالي 20 طلب باليوم لكل نموذج). جرّب بكرة.';
    if(/API key not valid|API_KEY_INVALID|API key expired/i.test(msg)) return 'المفتاح غير صالح — انسخه كاملاً من aistudio.google.com/apikey.';
    if(/no longer available|not found|is not supported/i.test(msg)) return 'النموذج غير متاح — اترك خانة النموذج فاضية (الافتراضي gemini-flash-latest).';
    if(/permission|403|location|region/i.test(msg)) return 'Google رفض الطلب (صلاحية/منطقة) — راجع المفتاح من AI Studio.';
    return 'راجع إعدادات المفتاح.';
  }
  /* قراءة عامة لجداول غير جدول تسجيل الجامعة (شبكة أسبوعية: أيام × أوقات، أو قائمة محاضرات) */
  var GENERIC_PROMPT = 'هذه صورة لجدول محاضرات (جامعي أو مدرسي). قد يكون شبكة أسبوعية (أيام × أوقات) أو قائمة مواد. استخرج كل محاضرة كصف مستقل.\n' +
    'القواعد:\n' +
    '- name: اسم المادة كما هو مكتوب. code: رقم/رمز المادة أرقام فقط إن ظهر، وإلا "".\n' +
    '- days: أيام المحاضرة بالإنجليزية من: Sun,Mon,Tue,Wed,Thu,Fri,Sat. بالجدول الشبكي اليوم هو عنوان العمود أو الصف؛ إن تكررت نفس المادة بنفس الوقت بأكثر من يوم فاجمعها بصف واحد.\n' +
    '- timeFrom/timeTo: HH:MM بنظام 24 ساعة (حوّل ص/م: 1:30 م = 13:30). إن ظهرت البداية فقط فاترك timeTo بـ null.\n' +
    '- room: القاعة/المبنى كما هو مكتوب وإلا "".\n' +
    '- hours/theory/practical: null إن لم تظهر. modality: inperson أو online أو blended إن ظهر وإلا null.\n' +
    'لا تخمّن قيماً غير مقروءة: ضع null. تجاهل الخانات الفارغة وفترات الاستراحة. أعد JSON فقط.';

  function ls(){ try{ return window.localStorage; }catch(e){ return null; } }
  function lget(k){ try{ var s = ls(); return s ? s.getItem(k) : null; }catch(e){ return null; } }
  function lset(k, v){ try{ var s = ls(); if(s) s.setItem(k, v); }catch(e){} }
  function lrm(k){ try{ var s = ls(); if(s) s.removeItem(k); }catch(e){} }

  /* تفعيل/إلغاء بالرابط: ?ocr=1 / ?ocr=0 */
  try{
    var m = /[?&]ocr=([01])\b/.exec(window.location.search || '');
    if(m){ if(m[1] === '1') lset('ocr_lab', '1'); else lrm('ocr_lab'); }
  }catch(e){}

  function isLocalHost(h){ return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1' || /\.localhost$/.test(h || ''); }
  function gkey(){ return (lget('ocr_gemini') || '').trim(); }
  var MODEL_PRESETS = [
    { id: 'gemini-flash-latest', label: 'تلقائي (الأحدث)', note: 'الافتراضي' },
    { id: 'gemini-3.5-flash', label: 'Flash 3.5', note: 'الأدق بالقياس' },
    { id: 'gemini-flash-lite-latest', label: 'Flash Lite', note: 'أخف وأسرع، حصته مستقلة' }
  ];
  function gmodel(){ return (lget('ocr_gmodel') || '').trim() || DEFAULT_MODEL; }
  function engine(){ return gkey() ? 'gemini' : 'local'; }
  function enabledFor(hostname, flag, hasKey){ return !!flag || !!hasKey || isLocalHost(hostname); }
  function enabled(){ return enabledFor(window.location.hostname, lget('ocr_lab') === '1', !!gkey()); }
  function endpoint(){ return lget('ocr_endpoint') || DEFAULT_ENDPOINT; }

  function tt(msg, type, dur){ if(typeof window.toast === 'function') window.toast(msg, type || 'info', dur); }
  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }

  /* ---------- تحويل الصفوف المحلَّلة إلى صفوف نافذة «إضافة جدول» ---------- */
  function lookup(row){
    var found = typeof window.findCourseByCode === 'function' ? window.findCourseByCode(row.code) : null;
    if(found && found.name) return found;
    if(row.matchedBy === 'name' && typeof COURSES_DB !== 'undefined' && COURSES_DB[row.name]) return { name: row.name, info: COURSES_DB[row.name] };
    return null;
  }
  function toSttRows(list){
    return (list || []).map(function(r){
      var matched = lookup(r);
      var code = String(r.code || ''), name = r.name || '';
      if(matched){ name = matched.name; code = (matched.info && matched.info.code) || code; }      /* مادة معروفة: رقمها الرسمي بالقاعدة */
      var from = r.timeFrom || '', to = r.timeTo || '';
      var reasons = (r.reasons || []).slice();
      if(from && to && to <= from){ to = ''; }                                                    /* نهاية <= بداية: نتركها فاضية ليكتبها المستخدم */
      var room = r.room || '';
      if(!room && r.modality === 'online') room = 'عن بعد';
      return {
        code: code, name: name, matched: matched, days: (r.days || []).slice(), timeFrom: from, timeTo: to, room: room,
        _ocr: { confidence: r.confidence || 'medium', reasons: reasons, printedCode: String(r.code || ''), modality: r.modality || '' }
      };
    });
  }

  /* ---------- واجهة: شاشة انتظار وحوارات ---------- */
  var overlay = null, ctrl = null;
  function closeOverlay(){ if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }
  var busyLbl = null;
  function setBusy(text){ if(busyLbl) busyLbl.textContent = text; }
  function showBusy(onCancel){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    overlay.setAttribute('role', 'alertdialog'); overlay.setAttribute('aria-live', 'polite');
    var box = el('div', 'ocri-box');
    box.appendChild(el('div', 'ocri-spin'));
    box.appendChild(el('div', 'ocri-title', 'جاري تحليل الصورة…'));
    busyLbl = el('div', 'ocri-sub', engine() === 'gemini'
      ? 'الصورة بتنرسل لـGemini (Google) وبترجع خلال 10–20 ثانية'
      : 'بياخد حوالي نصف دقيقة (تكبير وقراءة بمحرّكين)، لا تسكّر الصفحة');
    box.appendChild(busyLbl);
    var cancel = el('button', 'ocri-btn', 'إلغاء'); cancel.type = 'button';
    cancel.addEventListener('click', function(){ if(onCancel) onCancel(); closeOverlay(); });
    box.appendChild(cancel);
    overlay.appendChild(box); document.body.appendChild(overlay);
  }
  function showError(title, lines, cmd, withSettings){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    var box = el('div', 'ocri-box');
    box.appendChild(el('div', 'ocri-title', title));
    (lines || []).forEach(function(t){ box.appendChild(el('div', 'ocri-sub', t)); });
    if(cmd){ var pre = el('code', 'ocri-cmd', cmd); pre.setAttribute('dir', 'ltr'); box.appendChild(pre); }
    var row = el('div', 'ocri-actions');
    if(withSettings){ var st = el('button', 'ocri-btn ghost', 'إعدادات الاستيراد'); st.type = 'button'; st.addEventListener('click', openSettings); row.appendChild(st); }
    var ok = el('button', 'ocri-btn', 'تمام'); ok.type = 'button';
    ok.addEventListener('click', closeOverlay); row.appendChild(ok);
    box.appendChild(row);
    overlay.appendChild(box); document.body.appendChild(overlay);
    ok.focus();
  }

  /* ---------- تجهيز الصورة: تصغير (≤2400px) + مصغّرة للمعاينة؛ لو تعذّر الرسم نرسل الأصل ---------- */
  function prepareImage(file){
    return new Promise(function(resolve){
      var settled = false, url = null;
      function done(o){ if(settled) return; settled = true; if(url){ try{ URL.revokeObjectURL(url); }catch(e){} } resolve(o); }
      function fallback(){ done({ blob: file, mime: file.type || 'image/png', thumb: '', w: 0, h: 0, resized: false }); }
      if(/jsdom/i.test(navigator.userAgent || '') || !window.HTMLCanvasElement || !window.URL || !URL.createObjectURL){ fallback(); return; }
      var timer = setTimeout(fallback, 6000);
      try{
        url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function(){
          try{
            var w = img.naturalWidth, h = img.naturalHeight, f = fitSize(w, h, MAX_SIDE), t = fitSize(w, h, THUMB_SIDE);
            var cv = document.createElement('canvas'), tv = document.createElement('canvas');
            cv.width = f.w; cv.height = f.h; tv.width = t.w; tv.height = t.h;
            var c = cv.getContext('2d'), tc = tv.getContext('2d');
            if(!c || !tc){ clearTimeout(timer); return fallback(); }
            c.fillStyle = '#fff'; c.fillRect(0, 0, f.w, f.h); c.drawImage(img, 0, 0, f.w, f.h);
            tc.fillStyle = '#fff'; tc.fillRect(0, 0, t.w, t.h); tc.drawImage(img, 0, 0, t.w, t.h);
            var thumb = tv.toDataURL('image/jpeg', 0.72);
            if(f.scale >= 1 && file.size < 1.5 * 1024 * 1024){ clearTimeout(timer); return done({ blob: file, mime: file.type || 'image/jpeg', thumb: thumb, w: w, h: h, resized: false }); }
            cv.toBlob(function(b){ clearTimeout(timer); if(!b) return fallback(); done({ blob: b, mime: 'image/jpeg', thumb: thumb, w: f.w, h: f.h, resized: true }); }, 'image/jpeg', 0.92);
          }catch(e){ clearTimeout(timer); fallback(); }
        };
        img.onerror = function(){ clearTimeout(timer); fallback(); };
        img.src = url;
      }catch(e){ clearTimeout(timer); fallback(); }
    });
  }
  var prepareFn = prepareImage;

  /* ---------- القراءة: Gemini (من المتصفح مباشرة) ---------- */
  function fileToBase64(file){
    return new Promise(function(resolve, reject){
      var fr = new FileReader();
      fr.onload = function(){ var s = String(fr.result); resolve(s.slice(s.indexOf(',') + 1)); };
      fr.onerror = function(){ reject(Object.assign(new Error('read'), { code: 'read' })); };
      fr.readAsDataURL(file);
    });
  }
  var retryMs = 5000;
  function modelChain(){
    var out = [gmodel()]; MODEL_PRESETS.forEach(function(m){ if(out.indexOf(m.id) < 0) out.push(m.id); }); return out;
  }
  /* نموذج واحد (503 = Google مشغول: يعيد مرتين بفاصل داخلياً) */
  function geminiOnce(prep, generic, model){
    var t0 = Date.now();
    return fileToBase64(prep.blob).then(function(b64){
      var body = JSON.stringify({
        contents: [{ parts: [{ text: generic ? GENERIC_PROMPT : window.OcrParse.GEMINI_PROMPT }, { inline_data: { mime_type: prep.mime || 'image/png', data: b64 } }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: window.OcrParse.GEMINI_SCHEMA, temperature: 0 }
      });
      var tries = 0;
      function go(){
        return fetchJson(GEMINI_BASE + encodeURIComponent(model) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gkey() }, body: body }, 'gemini').catch(function(e){
          if(e && e.status === 503 && tries < 2 && !(ctrl && ctrl.signal.aborted)){ tries++; return new Promise(function(r){ setTimeout(r, retryMs); }).then(function(){ return (ctrl && ctrl.signal.aborted) ? Promise.reject(e) : go(); }); }
          throw e;
        });
      }
      return go();
    }).then(function(j){
      var parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
      var txt = parts ? parts.map(function(p){ return p.text || ''; }).join('') : '';
      if(!txt){ var why = (j && j.promptFeedback && j.promptFeedback.blockReason) || 'رد فاضي'; throw Object.assign(new Error('Gemini ما رجّع نتيجة (' + why + ')'), { code: 'gemini' }); }
      var list; try{ list = JSON.parse(txt); }catch(e){ throw Object.assign(new Error('رد Gemini مش JSON صالح'), { code: 'gemini' }); }
      return { rows: window.OcrParse.fromStructured(Array.isArray(list) ? list : []), seconds: Math.round((Date.now() - t0) / 1000), model: model };
    });
  }
  /* سلسلة نماذج: لو حصة النموذج خلصت أو Google مشغول نجرّب اللي بعده (لكل نموذج حصة مستقلة) */
  function geminiChain(prep, generic, progress){
    var chain = modelChain(), tried = [];
    function at(i){
      return geminiOnce(prep, generic, chain[i]).catch(function(e){
        tried.push(chain[i]);
        if(i + 1 < chain.length && modelRetryable(e) && !(ctrl && ctrl.signal.aborted)){ progress('نموذج «' + chain[i] + '» ما ردّ (حصته خلصت أو غير متاح) — أجرّب «' + chain[i + 1] + '»…'); return at(i + 1); }
        e.tried = tried; throw e;
      });
    }
    return at(0);
  }
  function analyzeGemini(prep, progress){
    if(!window.OcrParse || !window.OcrParse.fromStructured) return Promise.reject(Object.assign(new Error('محلّل الجدول غير محمَّل'), { code: 'parser' }));
    return geminiChain(prep, false, progress).then(function(r){
      if(r.rows.length) return r;
      progress('ما بدا جدول تسجيل الجامعة — أجرّب قراءة عامة للجدول…');
      return geminiChain(prep, true, progress).then(function(g){ g.generic = true; return g; });
    });
  }

  /* طلب مع مهلة وإلغاء؛ يرجّع JSON أو يرمي خطأ برمز: timeout | server | google | unreachable */
  function fetchJson(url, opts, kind){
    return new Promise(function(resolve, reject){
      var timer = null, useAbort = typeof AbortController === 'function';
      ctrl = useAbort ? new AbortController() : null;
      if(ctrl) opts.signal = ctrl.signal;
      timer = setTimeout(function(){ if(ctrl) ctrl.abort(); reject(Object.assign(new Error('timeout'), { code: 'timeout' })); }, TIMEOUT_MS);
      var p;
      try{ p = window.fetch(url, opts); }catch(e){ clearTimeout(timer); reject(Object.assign(e, { code: 'unreachable' })); return; }
      p.then(function(r){
        return r.json().then(function(j){
          if(!r.ok){
            var msg = (j && (j.error && (j.error.message || j.error) || j.message)) || ('HTTP ' + r.status);
            throw Object.assign(new Error(String(msg)), { code: kind === 'gemini' ? 'gemini' : 'server', status: r.status });
          }
          return j;
        }, function(){ throw Object.assign(new Error('bad response'), { code: 'server' }); });
      }).then(function(j){ clearTimeout(timer); resolve(j); }, function(e){
        clearTimeout(timer);
        reject(e && e.code ? e : Object.assign(e || new Error('x'), { code: 'unreachable' }));
      });
    });
  }
  function analyzeLocal(prep){
    return fetchJson(endpoint(), { method: 'POST', headers: { 'Content-Type': prep.mime || 'image/png' }, body: prep.blob }, 'local');
  }
  function analyzeOne(file, progress){
    return prepareFn(file).then(function(prep){
      var p = engine() === 'gemini' ? analyzeGemini(prep, progress) : analyzeLocal(prep);
      return p.then(function(r){ r.thumb = prep.thumb || ''; r.resized = !!prep.resized; return r; });
    });
  }

  /* اختبار المفتاح: طلب نصي صغير (بدون صورة) على النموذج المختار */
  function testKey(key, model){
    var k = (key || gkey()), m = model || gmodel();
    if(!k) return Promise.resolve({ ok: false, message: 'ما في مفتاح' });
    return fetchJson(GEMINI_BASE + encodeURIComponent(m) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'رد بكلمة واحدة: تمام' }] }], generationConfig: { temperature: 0, maxOutputTokens: 8 } }) }, 'gemini')
      .then(function(){ return { ok: true, message: 'المفتاح شغّال ✓ (النموذج ' + m + ')' }; }, function(e){ return { ok: false, message: explainGemini(e) }; });
  }

  /* ---------- الاستعمال: ملف أو عدة ملفات ← تحليل ← صفوف ---------- */
  function validFiles(files){
    var ok = [], big = 0, bad = 0;
    [].slice.call(files || []).forEach(function(f){
      if(!f || !TYPE_OK.test(f.type || '')) bad++; else if(f.size > MAX_BYTES) big++; else ok.push(f);
    });
    if(!ok.length){
      if(big && !bad) tt('الصورة كبيرة (أكثر من 12 ميجا)، صغّرها وجرّب', 'warn');
      else tt('الملف لازم يكون صورة PNG أو JPG أو WebP', 'warn');
    } else if(big + bad) tt('تجاهلت ' + (big + bad) + ' ملف (مو صورة أو كبير)', 'info');
    return ok;
  }
  function failure(e){
    var code = e && e.code, msg = String((e && e.message) || '').slice(0, 220);
    if(code === 'timeout') showError('انتهت مهلة التحليل', ['الخدمة ما ردّت خلال 3 دقائق. جرّب صورة أصغر أو أعد المحاولة.']);
    else if(code === 'gemini') showError('Gemini رفض الطلب', [explainGemini(e) + (e.tried && e.tried.length > 1 ? ' (جرّبت ' + e.tried.length + ' نماذج)' : ''), msg], null, true);
    else if(code === 'parser') showError('محلّل الجدول غير محمَّل', [msg]);
    else if(code === 'server') showError('الخدمة رجّعت خطأ', [msg]);
    else if(engine() === 'gemini') showError('تعذّر الاتصال بـGemini', ['تأكد من اتصالك بالإنترنت وأعد المحاولة.'], null, true);
    else showError('خدمة تحليل الصور (التجريبية) مش شغّالة', [
      'التحليل بيشتغل على جهازك بمحرّك ويندوز، ولازم تشغّل الخدمة أول، أو ضع مفتاح Gemini المجاني بإعدادات الاستيراد:',
      'ثم أعد المحاولة. (العنوان الحالي: ' + endpoint() + ')'
    ], 'node tools/ocr-lab/server.js', true);
  }
  function runMany(files, onRows){
    var list = validFiles(files); if(!list.length) return;
    var cancelled = false, t0 = Date.now();
    showBusy(function(){ cancelled = true; if(ctrl) ctrl.abort(); });
    var all = [], thumbs = [], model = '', generic = false, resized = false, i = 0;
    function progress(t){ if(!cancelled) setBusy((list.length > 1 ? 'صورة ' + (i + 1) + ' من ' + list.length + ' — ' : '') + t); }
    function next(){
      if(i >= list.length) return Promise.resolve();
      progress('جاري التحليل…');
      return analyzeOne(list[i], progress).then(function(j){
        if(cancelled) return;
        all = all.concat(toSttRows(j && j.rows)); if(j.thumb) thumbs.push(j.thumb); if(j.model) model = j.model; if(j.generic) generic = true; if(j.resized) resized = true;
        i++; return next();
      });
    }
    next().then(function(){
      if(cancelled) return;
      closeOverlay();
      var rows = mergeRows(all);
      if(!rows.length){
        showError('ما قدرت أقرأ أي مادة من هالصورة', ['غالباً الصورة صغيرة أو الخط ضعيف. جرّب لقطة شاشة بحجمها الطبيعي أو أكبر، ومن الجدول مباشرة.']);
        return;
      }
      var conflicts = validateRows(rows);
      var review = rows.filter(function(r){ return r._ocr.confidence === 'review'; }).length;
      var medium = rows.filter(function(r){ return r._ocr.confidence === 'medium'; }).length;
      onRows(rows, { total: rows.length, review: review, medium: medium, conflicts: conflicts, files: list.length, thumbs: thumbs, model: model, generic: generic, resized: resized, seconds: Math.round((Date.now() - t0) / 1000) });
    }).catch(function(e){ if(!cancelled) failure(e); });
  }
  function run(file, onRows){ if(!file) return; runMany([file], onRows); }

  /* جاهز؟ مفتاح Gemini، أو خدمة محلية (localhost/عنوان مخصّص). غير ذلك نفتح حوار الإعداد بدل ما نفشل */
  function ready(){ return !!gkey() || isLocalHost(window.location.hostname) || !!lget('ocr_endpoint'); }
  function consented(){ return lget('ocr_consent') === '1'; }
  /* موافقة صريحة مرة وحدة قبل إرسال صورة لـGoogle (الخدمة المحلية ما تحتاج) */
  function consentDialog(then){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    var box = el('div', 'ocri-box');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'موافقة إرسال الصورة');
    box.appendChild(el('div', 'ocri-title', '🔒 قبل ما نحلّل صورتك'));
    box.appendChild(el('div', 'ocri-sub', 'الصورة بتنرسل لسيرفرات Google (Gemini) وقت التحليل فقط، وبالطبقة المجانية ممكن يستعملها Google لتحسين منتجاته. ما بنرسل أي شي غيرها، وما بتنحفظ عندنا.'));
    box.appendChild(el('div', 'ocri-sub', 'تجنّب الصور اللي فيها معلومات شخصية حساسة غير جدولك.'));
    var row = el('div', 'ocri-actions');
    var ok = el('button', 'ocri-btn', 'موافق، كمّل'); ok.type = 'button';
    var no = el('button', 'ocri-btn ghost', 'إلغاء'); no.type = 'button';
    no.addEventListener('click', closeOverlay);
    ok.addEventListener('click', function(){ lset('ocr_consent', '1'); closeOverlay(); then(); });
    row.appendChild(ok); row.appendChild(no); box.appendChild(row);
    overlay.appendChild(box); document.body.appendChild(overlay); ok.focus();
  }
  function gate(then){
    if(!ready()){ openSettings({ intro: true }); return; }
    if(engine() === 'gemini' && !consented()){ consentDialog(then); return; }
    then();
  }
  /* اختيار ملفات: input مخفي يُنشأ عند الضغط (لازم داخل حدث نقر من المستخدم). camera: كاميرا الجهاز مباشرة */
  function choose(cb, camera){
    var old = document.querySelector('input.ocri-file'); if(old && old.parentNode) old.parentNode.removeChild(old);
    var inp = el('input', 'ocri-file'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/webp'; inp.style.display = 'none';
    if(camera){ inp.setAttribute('capture', 'environment'); } else { inp.multiple = true; }
    inp.addEventListener('change', function(){ var f = inp.files; if(inp.parentNode) inp.parentNode.removeChild(inp); if(f && f.length) cb(f); });
    document.body.appendChild(inp); inp.click();
  }
  function pick(onRows, camera){ gate(function(){ choose(function(files){ runMany(files, onRows); }, camera); }); }
  function handleFiles(files, onRows){ gate(function(){ runMany(files, onRows); }); }

  /* شاشة النتيجة: الصورة المصغّرة + قائمة المواد + التحذيرات، قبل فتح نافذة التعديل */
  function resultDialog(rows, meta, onOpen){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    var box = el('div', 'ocri-box ocri-result');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'نتيجة قراءة الجدول');
    box.appendChild(el('div', 'ocri-title', '📷 قرأت ' + meta.total + ' مادة'));
    var stats = [];
    if(meta.review) stats.push(meta.review + ' تحتاج مراجعة');
    if(meta.conflicts) stats.push(meta.conflicts + ' تعارض بالوقت');
    if(meta.generic) stats.push('قراءة عامة للجدول');
    if(meta.files > 1) stats.push(meta.files + ' صور');
    box.appendChild(el('div', 'ocri-sub', (stats.length ? stats.join(' · ') + ' — ' : '') + 'راجع الصفوف الملوّنة بالتعديل قبل الحفظ.'));
    if(meta.thumbs && meta.thumbs.length){
      var th = el('div', 'ocri-thumbs');
      meta.thumbs.forEach(function(u){ var im = document.createElement('img'); im.src = u; im.alt = 'الصورة الأصلية'; th.appendChild(im); });
      box.appendChild(th);
    }
    var list = el('div', 'ocri-rowsum');
    rows.forEach(function(r){
      var row = el('div', 'ocri-rs ' + (r._ocr && r._ocr.confidence || 'medium'));
      row.appendChild(el('span', 'ocri-dot'));
      var nm = el('b', null, r.name || '(بدون اسم)'); row.appendChild(nm);
      var DA = { Sun: 'ح', Mon: 'ن', Tue: 'ث', Wed: 'ر', Thu: 'خ', Fri: 'ج', Sat: 'س' };
      row.appendChild(el('small', null, (r.days || []).map(function(d){ return DA[d] || d; }).join(' ') + (r.timeFrom ? ' · ' + r.timeFrom + (r.timeTo ? '–' + r.timeTo : '') : '') + (r.room ? ' · ' + r.room : '')));
      if(r._ocr && r._ocr.reasons && r._ocr.reasons.length && r._ocr.confidence === 'review') row.title = r._ocr.reasons.join(' — ');
      list.appendChild(row);
    });
    box.appendChild(list);
    var act = el('div', 'ocri-actions');
    var open = el('button', 'ocri-btn', 'تعديل وحفظ'); open.type = 'button';
    var again = el('button', 'ocri-btn ghost', 'صورة ثانية'); again.type = 'button';
    var cancel = el('button', 'ocri-btn ghost', 'إلغاء'); cancel.type = 'button';
    open.addEventListener('click', function(){ closeOverlay(); onOpen(); });
    again.addEventListener('click', function(){ closeOverlay(); start(); });
    cancel.addEventListener('click', closeOverlay);
    act.appendChild(open); act.appendChild(again); act.appendChild(cancel); box.appendChild(act);
    overlay.appendChild(box); document.body.appendChild(overlay); open.focus();
  }
  function afterRows(rows, meta){
    resultDialog(rows, meta, function(){
      if(typeof window.openSmartTimetable === 'function') window.openSmartTimetable(rows);
      summary(meta);
    });
  }

  /* من صفحة الجدول: اختر صورة/صوراً ← حلّل ← شاشة النتيجة ← نافذة المعاينة معبّأة */
  function start(camera){ pick(afterRows, camera); }
  function summary(meta){
    var s = '📷 قرأت ' + meta.total + ' مادة';
    if(meta.review) s += ' — ' + meta.review + ' تحتاج مراجعة';
    else if(meta.medium) s += ' — راجع الصفوف الملوّنة';
    tt(s + ' (راجعها قبل الحفظ)', meta.review ? 'warn' : 'success', 6000);
  }

  /* صفحة الجدول: الزر دايماً ظاهر (بدون «تجريبي»)؛ بلا مفتاح بيفتح الإعداد. + لصق (Ctrl+V) + سحب وإفلات + تصوير */
  function syncPageButton(){
    var base = document.getElementById('btnOpenSmartTimetable'), ex = document.getElementById('btnOcrTimetable');
    if(!base || ex) return;
    var wrap = el('div', 'ocri-page'); wrap.id = 'ocrPageBox';
    var ob = el('button', 'btn', '📷 استيراد من صورة'); ob.type = 'button'; ob.id = 'btnOcrTimetable';
    ob.addEventListener('click', function(){ start(); });
    var cam = el('button', 'btn btn-ghost', '📸 تصوير'); cam.type = 'button'; cam.id = 'btnOcrCamera'; cam.addEventListener('click', function(){ start(true); });
    var row = el('div', 'ocri-page-row'); row.appendChild(ob); row.appendChild(cam); wrap.appendChild(row);
    wrap.appendChild(el('div', 'ocri-page-hint', 'صورة أو لقطة شاشة لجدولك (حتى عدة صور) — أو الصقها هنا (Ctrl+V) أو اسحبها. بتتحلّل بـGemini وبتراجعها قبل الحفظ.'));
    base.parentNode.appendChild(wrap);
  }
  function onTimetable(){ var s = document.querySelector('.section.active'); return !!s && s.id === 'timetable' && !document.querySelector('.stt-backdrop'); }
  function imagesOf(dt){ return [].slice.call((dt && dt.files) || []).filter(function(f){ return /^image\//.test(f.type || ''); }); }
  document.addEventListener('paste', function(e){
    if(!onTimetable()) return;
    var t = e.target && e.target.tagName; if(t === 'INPUT' || t === 'TEXTAREA') return;
    var imgs = imagesOf(e.clipboardData); if(!imgs.length) return;
    e.preventDefault(); handleFiles(imgs, afterRows);
  });
  document.addEventListener('dragover', function(e){ if(onTimetable() && e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') > -1) e.preventDefault(); });
  document.addEventListener('drop', function(e){
    if(!onTimetable()) return;
    var imgs = imagesOf(e.dataTransfer); if(!imgs.length) return;
    e.preventDefault(); handleFiles(imgs, afterRows);
  });

  /* ---------- حوار الإعدادات: التفعيل + مفتاح Google + عنوان الخدمة المحلية ---------- */
  function paintSwitch(){
    var b = document.getElementById('ocrLabBtn'); if(!b) return;
    var on = enabled(), t = b.querySelector('.ol-t');
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    if(t) t.textContent = gkey() ? 'جاهز — Gemini' : (isLocalHost(window.location.hostname) ? 'شغّالة على localhost — الخدمة المحلية' : (on ? 'مفعّل — الخدمة المحلية' : 'يحتاج مفتاح Gemini مجاني (اضغط للإعداد)'));
  }
  function openSettings(opts){
    opts = opts || {};
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    var box = el('div', 'ocri-box ocri-form');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'إعدادات استيراد الجدول من صورة');
    box.appendChild(el('div', 'ocri-title', '📷 استيراد الجدول من صورة (تجريبي)'));
    if(opts.intro) box.appendChild(el('div', 'ocri-note ocri-intro', '🔑 عشان تستورد جدولك من صورة لازم مفتاح Gemini مجاني (دقيقتين، بدون بطاقة): اتبع الخطوات تحت، الصقه هنا، واضغط «اختبر المفتاح».'));
    box.appendChild(el('div', 'ocri-sub', 'اختر طريقة القراءة. مع مفتاح Gemini المجاني بيشتغل من أي جهاز بدون أي خدمة؛ بدونه بيستعمل الخدمة المحلية على جهازك.'));

    var cbRow = el('label', 'ocri-check'); var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = enabled(); cb.id = 'ocriEnable';
    cbRow.appendChild(cb); cbRow.appendChild(document.createTextNode(' تفعيل الميزة (يظهر زر «📷 من صورة»)'));
    box.appendChild(cbRow);

    var l1 = el('label', 'ocri-lbl', 'مفتاح Gemini المجاني (اختياري)'); l1.setAttribute('for', 'ocriKey'); box.appendChild(l1);
    var key = document.createElement('input'); key.type = 'text'; key.id = 'ocriKey'; key.className = 'ocri-in'; key.value = gkey(); key.placeholder = 'AIza… أو AQ.…'; key.autocomplete = 'off'; key.spellcheck = false; key.setAttribute('dir', 'ltr');
    box.appendChild(key);
    var tk = el('button', 'ocri-btn ghost ocri-test', 'اختبر المفتاح'); tk.type = 'button';
    var tr = el('div', 'ocri-note ocri-testres'); tr.setAttribute('aria-live', 'polite');
    tk.addEventListener('click', function(){
      var kv = key.value.trim(); if(!kv){ tr.textContent = 'اكتب المفتاح أول'; return; }
      tr.textContent = 'جاري الاختبار…'; tk.disabled = true;
      testKey(kv, (document.getElementById('ocriModel') || {}).value ? document.getElementById('ocriModel').value.trim() : '').then(function(r){ tr.textContent = (r.ok ? '✅ ' : '❌ ') + r.message; tk.disabled = false; });
    });
    box.appendChild(tk); box.appendChild(tr);
    box.appendChild(el('div', 'ocri-note', 'الصورة بتنرسل لسيرفرات Google وقت التحليل (والطبقة المجانية بيستعملها Google لتحسين منتجاته). المفتاح بيتحفظ على هالمتصفح فقط. الحد المجاني حوالي 20 استيراد باليوم.'));

    var l2 = el('label', 'ocri-lbl', 'عنوان الخدمة المحلية (للمتقدّمين)'); l2.setAttribute('for', 'ocriEp'); box.appendChild(l2);
    var ep = document.createElement('input'); ep.type = 'text'; ep.id = 'ocriEp'; ep.className = 'ocri-in'; ep.value = lget('ocr_endpoint') || ''; ep.placeholder = DEFAULT_ENDPOINT; ep.autocomplete = 'off'; ep.setAttribute('dir', 'ltr');
    box.appendChild(ep);

    var det = el('details', 'ocri-how'); det.appendChild(el('summary', null, 'كيف أجيب مفتاح Gemini (مجاني، بدون بطاقة)؟'));
    var ol = el('ol'); [
      'ادخل aistudio.google.com/apikey وسجّل بحساب Google.',
      'اضغط «Create API key» (إنشاء مفتاح) وانسخه.',
      'الصقه هنا واضغط حفظ. ما بينطلب منك بطاقة دفع.',
      'لا تشارك المفتاح مع أحد؛ لو تسرّب احذفه من نفس الصفحة وسوّ غيره.'
    ].forEach(function(s){ ol.appendChild(el('li', null, s)); });
    det.appendChild(ol); box.appendChild(det);

    var l3 = el('label', 'ocri-lbl', 'النموذج (اتركه فاضي للافتراضي)'); l3.setAttribute('for', 'ocriModel'); box.appendChild(l3);
    var mdl = document.createElement('input'); mdl.type = 'text'; mdl.id = 'ocriModel'; mdl.className = 'ocri-in'; mdl.value = lget('ocr_gmodel') || ''; mdl.placeholder = DEFAULT_MODEL; mdl.autocomplete = 'off'; mdl.setAttribute('dir', 'ltr');
    /* ثلاث خيارات جاهزة: لكل نموذج حصة يومية مستقلة، فلو خلصت حصة بدّل للثاني */
    var chips = el('div', 'ocri-chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'نماذج جاهزة');
    MODEL_PRESETS.forEach(function(p){
      var c = el('button', 'ocri-chip', p.label); c.type = 'button'; c.title = p.id + ' — ' + p.note; c.setAttribute('data-model', p.id);
      c.addEventListener('click', function(){ mdl.value = p.id === DEFAULT_MODEL ? '' : p.id; paintChips(); });
      chips.appendChild(c);
    });
    function paintChips(){ var cur = mdl.value.trim() || DEFAULT_MODEL; [].forEach.call(chips.children, function(c){ c.setAttribute('aria-pressed', c.getAttribute('data-model') === cur ? 'true' : 'false'); }); }
    mdl.addEventListener('input', paintChips); paintChips();
    box.appendChild(chips); box.appendChild(mdl);
    box.appendChild(el('div', 'ocri-note', 'لكل نموذج حصة مجانية يومية مستقلة (~20 طلب). إذا انتهت حصة نموذج بدّل لغيره وكمّل. النتائج متقاربة؛ راجع الصفوف الملوّنة قبل الحفظ.'));

    var row = el('div', 'ocri-actions');
    var save = el('button', 'ocri-btn', 'حفظ'); save.type = 'button';
    var cancel = el('button', 'ocri-btn ghost', 'إلغاء'); cancel.type = 'button';
    cancel.addEventListener('click', closeOverlay);
    save.addEventListener('click', function(){
      var k = key.value.trim();
      if(k && !/^[A-Za-z0-9_.\-]{20,}$/.test(k)){ tt('شكل المفتاح غير صحيح — انسخه كاملاً من لوحة Google', 'warn'); key.focus(); return; }
      var e = ep.value.trim();
      if(e && !/^https?:\/\/[^\s]+$/.test(e)){ tt('عنوان الخدمة لازم يبدأ بـ http:// أو https://', 'warn'); ep.focus(); return; }
      var mv = mdl.value.trim();
      if(mv && !/^[A-Za-z0-9._\-]{3,60}$/.test(mv)){ tt('اسم النموذج غير صحيح', 'warn'); mdl.focus(); return; }
      if(k) lset('ocr_gemini', k); else lrm('ocr_gemini');
      if(mv) lset('ocr_gmodel', mv); else lrm('ocr_gmodel');
      if(e && e !== DEFAULT_ENDPOINT) lset('ocr_endpoint', e); else lrm('ocr_endpoint');
      if(cb.checked || k) lset('ocr_lab', '1'); else lrm('ocr_lab');
      closeOverlay(); paintSwitch(); syncPageButton();
      tt(k ? '📷 فُعّل استيراد الجدول بـ Gemini' : (enabled() ? '📷 فُعّل استيراد الجدول (الخدمة المحلية)' : '📷 أُطفئ استيراد الجدول من صورة'), 'success', 4500);
    });
    row.appendChild(save); row.appendChild(cancel); box.appendChild(row);
    overlay.appendChild(box); document.body.appendChild(overlay);
    key.focus();
  }
  function bind(){
    var b = document.getElementById('ocrLabBtn'); if(!b || b._ol){ paintSwitch(); return; } b._ol = true;
    b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); openSettings(); });
    paintSwitch();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  setTimeout(bind, 400);

  window.OcrImport = {
    enabled: enabled, enabledFor: enabledFor, endpoint: endpoint, engine: engine, toSttRows: toSttRows,
    run: run, runMany: runMany, pick: pick, handleFiles: handleFiles, start: start, summary: summary, syncPageButton: syncPageButton, toggle: openSettings, openSettings: openSettings,
    ready: ready, testKey: testKey, resultDialog: resultDialog,
    fitSize: fitSize, normDigits: normDigits, mergeRows: mergeRows, validateRows: validateRows, modelRetryable: modelRetryable, modelChain: modelChain, explainGemini: explainGemini, prepareImage: prepareImage,
    _setRetryMs: function(n){ retryMs = n; }, _setPrepare: function(f){ prepareFn = f || prepareImage; }
  };
})();
