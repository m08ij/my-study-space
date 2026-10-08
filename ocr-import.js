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
  function showBusy(onCancel){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    overlay.setAttribute('role', 'alertdialog'); overlay.setAttribute('aria-live', 'polite');
    var box = el('div', 'ocri-box');
    box.appendChild(el('div', 'ocri-spin'));
    box.appendChild(el('div', 'ocri-title', 'جاري تحليل الصورة…'));
    box.appendChild(el('div', 'ocri-sub', engine() === 'gemini'
      ? 'الصورة بتنرسل لـGemini (Google) وبترجع خلال 10–20 ثانية'
      : 'بياخد حوالي نصف دقيقة (تكبير وقراءة بمحرّكين)، لا تسكّر الصفحة'));
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
  function analyzeGemini(file){
    if(!window.OcrParse || !window.OcrParse.fromStructured) return Promise.reject(Object.assign(new Error('محلّل الجدول غير محمَّل'), { code: 'parser' }));
    var t0 = Date.now();
    return fileToBase64(file).then(function(b64){
      var body = JSON.stringify({
        contents: [{ parts: [{ text: window.OcrParse.GEMINI_PROMPT }, { inline_data: { mime_type: file.type || 'image/png', data: b64 } }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: window.OcrParse.GEMINI_SCHEMA, temperature: 0 }
      });
      /* 503 = Google مشغول (الطلب ما انعالج ولا يستهلك الحصة): نعيد تلقائياً مرتين بفاصل، غيره ما نعيد */
      var tries = 0;
      function go(){
        return fetchJson(GEMINI_BASE + encodeURIComponent(gmodel()) + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gkey() }, body: body }, 'gemini').catch(function(e){
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
      return { rows: window.OcrParse.fromStructured(Array.isArray(list) ? list : []), seconds: Math.round((Date.now() - t0) / 1000) };
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
  function analyzeLocal(file){
    return fetchJson(endpoint(), { method: 'POST', headers: { 'Content-Type': file.type || 'image/png' }, body: file }, 'local');
  }
  function analyze(file){ return engine() === 'gemini' ? analyzeGemini(file) : analyzeLocal(file); }

  function run(file, onRows){
    if(!file){ return; }
    if(!/^image\/(png|jpe?g)$/.test(file.type || '')){ tt('الملف لازم يكون صورة PNG أو JPG', 'warn'); return; }
    if(file.size > MAX_BYTES){ tt('الصورة كبيرة (أكثر من 12 ميجا)، صغّرها وجرّب', 'warn'); return; }
    var cancelled = false;                                         /* «إلغاء» من المستخدم: لا نُظهر رسالة خطأ ولا نعبّي الصفوف */
    showBusy(function(){ cancelled = true; if(ctrl) ctrl.abort(); });
    var t0 = Date.now();
    analyze(file).then(function(j){
      if(cancelled) return;
      closeOverlay();
      var rows = toSttRows(j && j.rows);
      if(!rows.length){
        showError('ما قدرت أقرأ أي مادة من هالصورة', ['غالباً الصورة صغيرة أو الخط ضعيف. جرّب لقطة شاشة بحجمها الطبيعي أو أكبر، ومن الجدول مباشرة.']);
        return;
      }
      var review = rows.filter(function(r){ return r._ocr.confidence === 'review'; }).length;
      var medium = rows.filter(function(r){ return r._ocr.confidence === 'medium'; }).length;
      var meta = { total: rows.length, review: review, medium: medium, seconds: j.seconds != null ? j.seconds : Math.round((Date.now() - t0) / 1000) };
      onRows(rows, meta);
    }, function(e){
      if(cancelled) return;
      var code = e && e.code, msg = String((e && e.message) || '').slice(0, 220);
      if(code === 'timeout') showError('انتهت مهلة التحليل', ['الخدمة ما ردّت خلال 3 دقائق. جرّب صورة أصغر أو أعد المحاولة.']);
      else if(code === 'gemini'){
        var hint = (e && e.status === 503) || /high demand|overloaded|UNAVAILABLE/i.test(msg) ? 'Google مشغول هسا (ضغط مؤقت) وجرّبت 3 مرات. الحصة ما انصرفت — أعد المحاولة بعد دقيقة أو دقيقتين.'
          : (e && e.status === 429) || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg) ? 'انتهى الحد المجاني (حوالي 20 طلب باليوم لكل نموذج). جرّب بكرة، أو غيّر النموذج من إعدادات الاستيراد.'
          : /API key not valid|API_KEY_INVALID|API key expired/i.test(msg) ? 'المفتاح غير صالح — انسخه كاملاً من aistudio.google.com/apikey.'
          : /no longer available|not found|is not supported/i.test(msg) ? 'النموذج غير متاح — اترك خانة النموذج فاضية (الافتراضي gemini-flash-latest).'
          : /permission|403|location|region/i.test(msg) ? 'Google رفض الطلب (صلاحية/منطقة) — راجع المفتاح من AI Studio.'
          : 'راجع إعدادات المفتاح.';
        showError('Gemini رفض الطلب', [hint, msg], null, true);
      }
      else if(code === 'parser') showError('محلّل الجدول غير محمَّل', [msg]);
      else if(code === 'server') showError('الخدمة رجّعت خطأ', [msg]);
      else if(engine() === 'gemini') showError('تعذّر الاتصال بـGemini', ['تأكد من اتصالك بالإنترنت وأعد المحاولة.'], null, true);
      else showError('خدمة تحليل الصور (التجريبية) مش شغّالة', [
        'التحليل بيشتغل على جهازك بمحرّك ويندوز، ولازم تشغّل الخدمة أول، أو ضع مفتاح Gemini المجاني بإعدادات الاستيراد:',
        'ثم أعد المحاولة. (العنوان الحالي: ' + endpoint() + ')'
      ], 'node tools/ocr-lab/server.js', true);
    });
  }

  /* اختيار ملف: input مخفي يُنشأ عند الضغط (لازم داخل حدث نقر من المستخدم) */
  function pick(onRows){
    var old = document.querySelector('input.ocri-file'); if(old && old.parentNode) old.parentNode.removeChild(old);
    var inp = el('input', 'ocri-file'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg'; inp.style.display = 'none';
    inp.addEventListener('change', function(){ var f = inp.files && inp.files[0]; if(inp.parentNode) inp.parentNode.removeChild(inp); if(f) run(f, onRows); });
    document.body.appendChild(inp); inp.click();
  }

  /* من صفحة الجدول: اختر صورة ← حلّل ← افتح نافذة المعاينة معبّأة */
  function start(){
    pick(function(rows, meta){
      if(typeof window.openSmartTimetable === 'function') window.openSmartTimetable(rows);
      summary(meta);
    });
  }
  function summary(meta){
    var s = '📷 قرأت ' + meta.total + ' مادة';
    if(meta.review) s += ' — ' + meta.review + ' تحتاج مراجعة';
    else if(meta.medium) s += ' — راجع الصفوف الملوّنة';
    tt(s + ' (راجعها قبل الحفظ)', meta.review ? 'warn' : 'success', 6000);
  }

  /* زر صفحة الجدول: يُضاف/يُزال حسب التفعيل، بدون إعادة تحميل */
  function syncPageButton(){
    var base = document.getElementById('btnOpenSmartTimetable'), ex = document.getElementById('btnOcrTimetable');
    if(!enabled()){ if(ex && ex.parentNode) ex.parentNode.removeChild(ex); return; }
    if(!base || ex) return;
    var ob = el('button', 'btn', '📷 من صورة جدول (تجريبي)'); ob.type = 'button'; ob.id = 'btnOcrTimetable';
    ob.style.cssText = 'margin-top:10px;width:100%;max-width:420px;justify-content:center';
    ob.addEventListener('click', start);
    base.parentNode.appendChild(ob);
  }

  /* ---------- حوار الإعدادات: التفعيل + مفتاح Google + عنوان الخدمة المحلية ---------- */
  function paintSwitch(){
    var b = document.getElementById('ocrLabBtn'); if(!b) return;
    var on = enabled(), t = b.querySelector('.ol-t');
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    if(t) t.textContent = gkey() ? 'مفعّل — Gemini' : (isLocalHost(window.location.hostname) ? 'شغّالة على localhost — الخدمة المحلية' : (on ? 'مفعّل — الخدمة المحلية' : 'تجريبي — مطفأ (اضغط للإعداد)'));
  }
  function openSettings(){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    var box = el('div', 'ocri-box ocri-form');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'إعدادات استيراد الجدول من صورة');
    box.appendChild(el('div', 'ocri-title', '📷 استيراد الجدول من صورة (تجريبي)'));
    box.appendChild(el('div', 'ocri-sub', 'اختر طريقة القراءة. مع مفتاح Gemini المجاني بيشتغل من أي جهاز بدون أي خدمة؛ بدونه بيستعمل الخدمة المحلية على جهازك.'));

    var cbRow = el('label', 'ocri-check'); var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = enabled(); cb.id = 'ocriEnable';
    cbRow.appendChild(cb); cbRow.appendChild(document.createTextNode(' تفعيل الميزة (يظهر زر «📷 من صورة»)'));
    box.appendChild(cbRow);

    var l1 = el('label', 'ocri-lbl', 'مفتاح Gemini المجاني (اختياري)'); l1.setAttribute('for', 'ocriKey'); box.appendChild(l1);
    var key = document.createElement('input'); key.type = 'text'; key.id = 'ocriKey'; key.className = 'ocri-in'; key.value = gkey(); key.placeholder = 'AIza… أو AQ.…'; key.autocomplete = 'off'; key.spellcheck = false; key.setAttribute('dir', 'ltr');
    box.appendChild(key);
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
    run: run, pick: pick, start: start, summary: summary, syncPageButton: syncPageButton, toggle: openSettings, openSettings: openSettings,
    _setRetryMs: function(n){ retryMs = n; }
  };
})();
