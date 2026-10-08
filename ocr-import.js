/* ============================================================
   ocr-import.js — استيراد الجدول من صورة (تجريبي)
   - الصورة تُرسَل لخدمة تحليل محلية على جهازك (tools/ocr-lab/server.js، محرّك OCR مدمج بويندوز)، والنتيجة تُعبّئ نافذة «إضافة جدول»
     (openSmartTimetable) للمعاينة قبل الحفظ؛ الإضافة اليدوية تبقى كما هي، ولا يُحفظ شيء قبل ضغطك «حفظ الكل».
   - المحرّك لا يعمل داخل المتصفح (يحتاج Windows)، فالميزة تظهر فقط على localhost أو بعد تفعيلها بـ ?ocr=1 (تُلغى بـ ?ocr=0).
   - لا إرسال لأي جهة خارجية: العنوان الافتراضي 127.0.0.1، ويتغيّر من localStorage.ocr_endpoint.
   ============================================================ */
(function(){
  'use strict';
  var DEFAULT_ENDPOINT = 'http://127.0.0.1:8780/ocr';
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
  function enabledFor(hostname, flag){ return !!flag || isLocalHost(hostname); }
  function enabled(){ return enabledFor(window.location.hostname, lget('ocr_lab') === '1'); }
  function endpoint(){ return lget('ocr_endpoint') || DEFAULT_ENDPOINT; }

  function tt(msg, type, dur){ if(typeof window.toast === 'function') window.toast(msg, type || 'info', dur); }
  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }

  /* ---------- تحويل نتيجة الخدمة إلى صفوف نافذة «إضافة جدول» ---------- */
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

  /* ---------- واجهة: شاشة انتظار وحوار أخطاء ---------- */
  var overlay = null, ctrl = null;
  function closeOverlay(){ if(overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }
  function showBusy(onCancel){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    overlay.setAttribute('role', 'alertdialog'); overlay.setAttribute('aria-live', 'polite');
    var box = el('div', 'ocri-box');
    box.appendChild(el('div', 'ocri-spin'));
    box.appendChild(el('div', 'ocri-title', 'جاري تحليل الصورة…'));
    box.appendChild(el('div', 'ocri-sub', 'بياخد حوالي نصف دقيقة (تكبير وقراءة بمحرّكين)، لا تسكّر الصفحة'));
    var cancel = el('button', 'ocri-btn', 'إلغاء'); cancel.type = 'button';
    cancel.addEventListener('click', function(){ if(onCancel) onCancel(); closeOverlay(); });
    box.appendChild(cancel);
    overlay.appendChild(box); document.body.appendChild(overlay);
  }
  function showError(title, lines, cmd){
    closeOverlay();
    overlay = el('div', 'ocri-overlay');
    var box = el('div', 'ocri-box');
    box.appendChild(el('div', 'ocri-title', title));
    (lines || []).forEach(function(t){ box.appendChild(el('div', 'ocri-sub', t)); });
    if(cmd){ var pre = el('code', 'ocri-cmd', cmd); pre.setAttribute('dir', 'ltr'); box.appendChild(pre); }
    var ok = el('button', 'ocri-btn', 'تمام'); ok.type = 'button';
    ok.addEventListener('click', closeOverlay); box.appendChild(ok);
    overlay.appendChild(box); document.body.appendChild(overlay);
    ok.focus();
  }

  /* ---------- التحليل ---------- */
  function analyze(file){
    return new Promise(function(resolve, reject){
      var aborted = false, timer = null;
      var useAbort = typeof AbortController === 'function';
      ctrl = useAbort ? new AbortController() : null;
      var opts = { method: 'POST', headers: { 'Content-Type': file.type || 'image/png' }, body: file };
      if(ctrl) opts.signal = ctrl.signal;
      timer = setTimeout(function(){ aborted = true; if(ctrl) ctrl.abort(); reject(Object.assign(new Error('timeout'), { code: 'timeout' })); }, TIMEOUT_MS);
      var p;
      try{ p = window.fetch(endpoint(), opts); }catch(e){ clearTimeout(timer); reject(Object.assign(e, { code: 'unreachable' })); return; }
      p.then(function(r){
        return r.json().then(function(j){
          if(!r.ok) throw Object.assign(new Error(j && j.error || 'server'), { code: 'server' });
          return j;
        }, function(){ throw Object.assign(new Error('bad response'), { code: 'server' }); });
      }).then(function(j){ clearTimeout(timer); resolve(j); }, function(e){
        clearTimeout(timer);
        if(aborted) return;
        reject(e && e.code ? e : Object.assign(e || new Error('x'), { code: 'unreachable' }));
      });
    });
  }

  function run(file, onRows){
    if(!file){ return; }
    if(!/^image\/(png|jpe?g)$/.test(file.type || '')){ tt('الملف لازم يكون صورة PNG أو JPG', 'warn'); return; }
    if(file.size > MAX_BYTES){ tt('الصورة كبيرة (أكثر من 12 ميجا)، صغّرها وجرّب', 'warn'); return; }
    var cancelled = false;                                         /* «إلغاء» من المستخدم: لا نُظهر رسالة «الخدمة مش شغّالة» ولا نعبّي الصفوف */
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
      if(e && e.code === 'timeout') showError('انتهت مهلة التحليل', ['الخدمة ما ردّت خلال 3 دقائق. جرّب صورة أصغر أو أعد المحاولة.']);
      else if(e && e.code === 'server') showError('الخدمة رجّعت خطأ', [String(e.message || '').slice(0, 200)]);
      else showError('خدمة تحليل الصور (التجريبية) مش شغّالة', [
        'التحليل بيشتغل على جهازك بمحرّك ويندوز، ولازم تشغّل الخدمة أول:',
        'ثم أعد المحاولة. (العنوان الحالي: ' + endpoint() + ')'
      ], 'node tools/ocr-lab/server.js');
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

  /* مفتاح التفعيل بقائمة الإعدادات (يحفظ بـlocalStorage.ocr_lab؛ على localhost الميزة شغّالة دائماً) */
  function paintSwitch(){
    var b = document.getElementById('ocrLabBtn'); if(!b) return;
    var on = enabled(), t = b.querySelector('.ol-t');
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    if(t) t.textContent = isLocalHost(window.location.hostname) ? 'شغّالة دائماً على localhost' : (on ? 'مفعّل — تحتاج الخدمة المحلية شغّالة' : 'تجريبي — مطفأ');
  }
  function toggle(){
    if(isLocalHost(window.location.hostname)){ tt('على localhost الميزة شغّالة دائماً', 'info'); return; }
    var on = lget('ocr_lab') === '1';
    if(on) lrm('ocr_lab'); else lset('ocr_lab', '1');
    paintSwitch(); syncPageButton();
    if(on) tt('📷 أُطفئ استيراد الجدول من صورة', 'info');
    else tt('📷 فُعّل. التحليل بيشتغل على جهازك: شغّل الخدمة (node tools/ocr-lab/server.js) ثم افتح «إضافة دفعة» ← «من صورة». لو المتصفح طلب إذن «الشبكة المحلية» اسمح.', 'success', 9000);
  }
  function bind(){
    var b = document.getElementById('ocrLabBtn'); if(!b || b._ol) { paintSwitch(); return; } b._ol = true;
    b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); toggle(); });
    paintSwitch();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  setTimeout(bind, 400);

  window.OcrImport = {
    enabled: enabled, enabledFor: enabledFor, endpoint: endpoint, toSttRows: toSttRows,
    run: run, pick: pick, start: start, summary: summary, syncPageButton: syncPageButton, toggle: toggle
  };
})();
