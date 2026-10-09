/* ============================================================
   syllabus.js — خطة المادة (Gemini) + ربط الكتاب
   1) استيراد خطة المادة من docx/PDF/صورة/نص ← Gemini يرجّع JSON منظّم ← تحقّق (normalize) ← معاينة ← حفظ بالمادة (course.syllabus):
      مدرّس، كتاب، خطة أسبوعية (مواضيع + أقسام)، تقييم، شرط الحضور. يُستعمل لـ«هالأسبوع» وحدّ الغياب ومهام القراءة.
   2) ربط الكتاب: ملف PDF يبقى على جهازك (IndexedDB) ولا يُرفع لأي مكان؛ فهرس الكتاب (قسم ← صفحات) يُبنى من صفحات المحتويات
      بـpdf.js (يُحمَّل عند الطلب من cdnjs)، ويُحفظ صغيراً بالمادة (course.book). «فتح الكتاب» يفتح الـPDF عند صفحة القسم.
   الدوال النقية (normalize/parseToc/detectOffset/…) تُصدَّر أيضاً لـNode للاختبار.
   ============================================================ */
(function(root, factory){
  var api = factory(root);
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  if(root && root.document) root.Syllabus = api;
})(typeof window !== 'undefined' ? window : this, function(W){
  'use strict';

  /* ==================== (1) مخطط وطلب Gemini ==================== */
  var SCHEMA = {
    type: 'OBJECT',
    properties: {
      courseName: { type: 'STRING' }, courseCode: { type: 'STRING' }, creditHours: { type: 'INTEGER' },
      instructor: { type: 'STRING' }, office: { type: 'STRING' }, email: { type: 'STRING' },
      textbook: { type: 'OBJECT', properties: { title: { type: 'STRING' }, authors: { type: 'STRING' }, edition: { type: 'STRING' } } },
      references: { type: 'ARRAY', items: { type: 'STRING' } },
      objectives: { type: 'STRING' },
      grading: { type: 'ARRAY', items: { type: 'OBJECT', properties: { item: { type: 'STRING' }, weight: { type: 'NUMBER' }, note: { type: 'STRING' } }, required: ['item'] } },
      attendance: { type: 'OBJECT', properties: { maxAbsencePercent: { type: 'NUMBER' }, rule: { type: 'STRING' } } },
      weeks: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
        from: { type: 'INTEGER' }, to: { type: 'INTEGER' },
        topics: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, section: { type: 'STRING' } }, required: ['title'] } }
      }, required: ['from', 'topics'] } }
    },
    required: ['weeks']
  };
  var PROMPT = [
    'أنت تقرأ «خطة مادة» (Course Syllabus) من جامعة أردنية (غالباً الجامعة الهاشمية) وتستخرج بياناتها كاملة بصيغة JSON حسب المخطط المعطى.',
    'القواعد:',
    '- استخرج ما هو مكتوب فقط ولا تخمّن؛ الحقل غير الموجود اتركه نصاً فارغاً "" أو 0 أو مصفوفة فاضية.',
    '- weeks: كل عنصر = أسبوع أو مدى أسابيع (from و to، وإن كان أسبوعاً واحداً فـto = from). topics: مواضيع ذلك الأسبوع كما هي بالخطة (بلغة الخطة الأصلية) وكل موضوع مع section = رقم القسم بالكتاب مثل "2.3" إن وُجد، وإلا "".',
    '- إذا ذُكر رقم الأسبوع مرة واحدة لعدّة مواضيع تحته فكلها لنفس الأسبوع.',
    '- grading: بنود التقييم (امتحان أول، منتصف، نهائي، واجبات، كويزات…) مع weight = الوزن رقماً من 100 (مثلاً 30).',
    '- attendance.maxAbsencePercent: نسبة الغياب المسموحة قبل الحرمان رقماً (مثلاً 15)، و rule: النص الأصلي للشرط باختصار.',
    '- textbook: الكتاب المقرر (العنوان والمؤلف والطبعة)؛ references: المراجع الأخرى كل مرجع بسطر.',
    '- creditHours: الساعات المعتمدة رقماً. courseCode: رقم المادة كما هو مكتوب.'
  ].join('\n');

  function str(x, max){ x = x == null ? '' : String(x); x = x.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/\s+/g, ' ').trim(); return x.slice(0, max || 300); }
  function numIn(x, lo, hi){ var n = typeof x === 'number' ? x : parseFloat(String(x == null ? '' : x).replace(/[^\d.\-]/g, '')); if(!isFinite(n)) return null; return Math.min(hi, Math.max(lo, n)); }
  function sectionOf(x){
    var s = str(x, 24).replace(/[٠-٩]/g, function(d){ return String(d.charCodeAt(0) - 1632); });
    var m = /^(?:sec(?:tion)?\.?\s*)?(\d{1,2}\.\d{1,2})$/i.exec(s); return m ? m[1] : '';
  }
  /* تنظيف رد Gemini: يرجّع كائن خطة آمناً وبصيغة ثابتة (وتحذيرات يعرضها حوار المعاينة) */
  function normalize(raw){
    raw = raw && typeof raw === 'object' ? raw : {};
    var warnings = [], weeks = [];
    (Array.isArray(raw.weeks) ? raw.weeks : []).forEach(function(w){
      if(!w) return;
      var f = numIn(w.from, 1, 40), t = numIn(w.to, 1, 40); if(f === null) return; f = Math.round(f); t = t === null ? f : Math.round(t); if(t < f) t = f;
      var topics = (Array.isArray(w.topics) ? w.topics : []).map(function(x){
        if(typeof x === 'string') x = { title: x };
        return x && str(x.title, 160) ? { title: str(x.title, 160), section: sectionOf(x.section) } : null;
      }).filter(Boolean).slice(0, 12);
      if(topics.length) weeks.push({ from: f, to: t, topics: topics });
    });
    weeks.sort(function(a, b){ return a.from - b.from; });
    var grading = (Array.isArray(raw.grading) ? raw.grading : []).map(function(g){
      if(!g || !str(g.item, 80)) return null; var w = numIn(g.weight, 0, 100);
      return { item: str(g.item, 80), weight: w === null ? 0 : w, note: str(g.note, 120) };
    }).filter(Boolean).slice(0, 14);
    var total = grading.reduce(function(s, g){ return s + g.weight; }, 0);
    if(grading.length && Math.abs(total - 100) > 0.5) warnings.push('مجموع أوزان التقييم ' + (Math.round(total * 10) / 10) + ' وليس 100 — راجع الخطة الأصلية');
    if(!grading.length) warnings.push('ما لقيت جدول التقييم (علامات الامتحانات) بالملف');
    if(!weeks.length) warnings.push('ما لقيت خطة الأسابيع');
    var att = raw.attendance || {}, pct = numIn(att.maxAbsencePercent, 0, 100);
    var tb = raw.textbook || {};
    var out = {
      v: 1, courseName: str(raw.courseName, 120), courseCode: str(raw.courseCode, 30), creditHours: Math.round(numIn(raw.creditHours, 0, 12) || 0),
      instructor: str(raw.instructor, 80), office: str(raw.office, 60), email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(str(raw.email, 80)) ? str(raw.email, 80) : '',
      textbook: { title: str(tb.title, 160), authors: str(tb.authors, 120), edition: str(tb.edition, 40) },
      references: (Array.isArray(raw.references) ? raw.references : []).map(function(r){ return str(r, 200); }).filter(Boolean).slice(0, 8),
      objectives: str(raw.objectives, 500),
      grading: grading, attendance: { maxAbsencePercent: pct === null ? 0 : pct, rule: str(att.rule, 240) },
      weeks: weeks, importedAt: new Date().toISOString().slice(0, 10)
    };
    return { plan: out, warnings: warnings };
  }

  /* ==================== docx -> نص (بدون مكتبات: zip + inflate بـDecompressionStream) ==================== */
  function u16(b, o){ return b[o] | (b[o + 1] << 8); }
  function u32(b, o){ return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function unzipEntry(buf, wanted){
    var b = new Uint8Array(buf), eocd = -1, i;
    for(i = b.length - 22; i >= Math.max(0, b.length - 65557); i--){ if(b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 5 && b[i + 3] === 6){ eocd = i; break; } }
    if(eocd < 0) return Promise.reject(new Error('الملف مش docx صالح'));
    var n = u16(b, eocd + 10), p = u32(b, eocd + 16);
    for(i = 0; i < n; i++){
      if(u32(b, p) !== 0x02014b50) break;
      var method = u16(b, p + 10), csize = u32(b, p + 20), nl = u16(b, p + 28), el = u16(b, p + 30), cl = u16(b, p + 32), lho = u32(b, p + 42);
      var name = ''; for(var k = 0; k < nl; k++) name += String.fromCharCode(b[p + 46 + k]);
      if(name === wanted){
        var lnl = u16(b, lho + 26), lel = u16(b, lho + 28), start = lho + 30 + lnl + lel, data = b.subarray(start, start + csize);
        if(method === 0) return Promise.resolve(data);
        if(method === 8 && typeof DecompressionStream === 'function'){
          var ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(data); w.close();
          return new Response(ds.readable).arrayBuffer().then(function(a){ return new Uint8Array(a); });
        }
        return Promise.reject(new Error('المتصفح ما بيدعم فكّ الضغط — صدّر الخطة PDF وارفعها'));
      }
      p += 46 + nl + el + cl;
    }
    return Promise.reject(new Error('ما لقيت محتوى المستند داخل الملف'));
  }
  function xmlToText(xml){
    return String(xml).replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<\/w:tc>/g, ' | ').replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function(_, d){ return String.fromCharCode(+d); })
      .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function docxToText(buf){
    return unzipEntry(buf, 'word/document.xml').then(function(u8){ return xmlToText(new TextDecoder('utf-8').decode(u8)); });
  }

  /* ==================== (2) فهرس الكتاب: محتويات -> قسم/صفحة، وإزاحة الصفحة المطبوعة ==================== */
  /* يقبل صيغتين: "1.1 Four Ways ... 10" بسطر واحد، أو رقم القسم بسطر ثم "العنوان   الصفحة" بالسطر التالي */
  function parseToc(text){
    var lines = String(text || '').split(/\r?\n/).map(function(l){ return l.replace(/\s+$/, '').replace(/^\s+/, ''); }), out = [], seen = {};
    function push(sec, title, page){ page = parseInt(page, 10); if(!sec || !page || page > 3000 || seen[sec]) return; seen[sec] = 1; out.push({ sec: sec, title: title.replace(/[\s.·…]+$/, '').trim(), page: page }); }
    for(var i = 0; i < lines.length; i++){
      var l = lines[i], m;
      if((m = /^(\d{1,2}\.\d{1,2})\s+(.+?)[\s.·…]{2,}(\d{1,4})$/.exec(l)) || (m = /^(\d{1,2}\.\d{1,2})\s+(.+?)\s{2,}(\d{1,4})$/.exec(l))){ push(m[1], m[2], m[3]); continue; }
      if(/^\d{1,2}\.\d{1,2}$/.test(l)){
        for(var j = i + 1; j < Math.min(lines.length, i + 4); j++){
          var t = lines[j]; if(!t) continue;
          var mm = /^(.+?)[\s.·…]{2,}(\d{1,4})$/.exec(t) || /^(.{4,}?)\s(\d{1,4})$/.exec(t);
          if(mm){ push(l, mm[1], mm[2]); i = j; }
          break;
        }
      }
    }
    return out.sort(function(a, b){ return a.page - b.page; });
  }
  /* رقم الصفحة المطبوع من أول أسطر نص الصفحة: سطر أرقام فقط، أو ترويسة بحروف كبيرة ينتهي برقم */
  function printedOf(text){
    var lines = String(text || '').split(/\r?\n/).slice(0, 4).map(function(l){ return l.trim(); });
    for(var i = 0; i < lines.length; i++){
      var l = lines[i], m;
      if((m = /^(\d{1,4})$/.exec(l))) return parseInt(m[1], 10);
      if((m = /^[A-Z][A-Z0-9 :,'’&\-]{5,}?\s{2,}(\d{1,4})$/.exec(l))) return parseInt(m[1], 10);
    }
    return null;
  }
  /* pages: [{ index: ترتيب الصفحة بالـPDF من 1, text }] -> الإزاحة (index - printed) الأكثر تكراراً (3 صفحات على الأقل) */
  function detectOffset(pages){
    var votes = {};
    (pages || []).forEach(function(p){ var pr = printedOf(p.text); if(pr !== null && p.index > pr){ var o = p.index - pr; votes[o] = (votes[o] || 0) + 1; } });
    var best = null, bc = 0; Object.keys(votes).forEach(function(k){ if(votes[k] > bc){ bc = votes[k]; best = parseInt(k, 10); } });
    return bc >= 3 ? { offset: best, votes: bc } : null;
  }
  /* قسم -> [من, إلى] بالصفحة المطبوعة (النهاية = بداية القسم التالي - 1) */
  function sectionRanges(toc, lastPage){
    var map = {};
    toc.forEach(function(e, i){
      var next = toc[i + 1], end = next ? Math.max(e.page, next.page - 1) : (lastPage || e.page + 12);
      map[e.sec] = [e.page, end];
    });
    return map;
  }

  /* ==================== الأسبوع والحضور ==================== */
  function weekNumber(startYmd, now){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startYmd || ''); if(!m) return null;
    var s = new Date(+m[1], +m[2] - 1, +m[3]), n = now || new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.floor((d0 - s) / 604800000) + 1;
  }
  function weekEntry(plan, w){
    var hit = null; (plan.weeks || []).forEach(function(x){ if(w >= x.from && w <= x.to) hit = x; });
    return hit;
  }
  /* حدّ الغياب: نسبة × (عدد المحاضرات الأسبوعية × عدد أسابيع الفصل) ← عدد صحيح للأسفل */
  function absenceLimit(plan, weeklySlots, weeksCount){
    var pct = plan && plan.attendance && plan.attendance.maxAbsencePercent;
    if(!pct || !weeklySlots) return null;
    var wks = weeksCount || (plan.weeks.length ? plan.weeks[plan.weeks.length - 1].to : 15), total = weeklySlots * wks;
    return { total: total, max: Math.max(0, Math.ceil(total * pct / 100) - 1), pct: pct };      /* «15% تعني الحرمان»: آخر غياب مسموح هو قبل بلوغ 15% */
  }

  var pure = { SCHEMA: SCHEMA, PROMPT: PROMPT, normalize: normalize, docxToText: docxToText, xmlToText: xmlToText, parseToc: parseToc, printedOf: printedOf, detectOffset: detectOffset, sectionRanges: sectionRanges, weekNumber: weekNumber, weekEntry: weekEntry, absenceLimit: absenceLimit, sectionOf: sectionOf };
  if(!W || !W.document) return pure;

  /* ==================== واجهة المتصفح ==================== */
  var d = W.document;
  function esc(s){ return W.esc ? W.esc(s) : String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sp(){ return W.space || {}; }
  function toast(m, t, ms){ if(W.toast) W.toast(m, t || 'info', ms); }
  function el(tag, cls, text){ var e = d.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
  function todayYmd(){ var n = new Date(); return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2); }
  function ymdAdd(ymd, days){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd); var x = new Date(+m[1], +m[2] - 1, +m[3] + days); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  function courseById(id){ return (sp().courses || []).filter(function(c){ return c.id === id; })[0] || null; }
  function save(){ if(W.saveSpace) W.saveSpace(); }

  /* ---- تخزين الكتاب محلياً (IndexedDB) ---- */
  var DB_NAME = 'ss_books', STORE = 'books';
  function idb(){
    return new Promise(function(res, rej){
      if(!W.indexedDB){ rej(new Error('المتصفح ما بيدعم التخزين المحلي للكتب')); return; }
      var rq = W.indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function(){ rq.result.createObjectStore(STORE); };
      rq.onsuccess = function(){ res(rq.result); }; rq.onerror = function(){ rej(rq.error || new Error('idb')); };
    });
  }
  function idbOp(mode, fn){
    return idb().then(function(db){ return new Promise(function(res, rej){ var tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), r = fn(st); tx.oncomplete = function(){ res(r && r.result); }; tx.onerror = function(){ rej(tx.error); }; }); });
  }
  function bookPut(id, blob){ return idbOp('readwrite', function(s){ return s.put(blob, id); }); }
  function bookGet(id){ return idbOp('readonly', function(s){ return s.get(id); }); }
  function bookDel(id){ return idbOp('readwrite', function(s){ return s.delete(id); }); }

  /* ---- pdf.js عند الطلب فقط ---- */
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var pdfjsP = null;
  function loadPdfJs(){
    if(W.pdfjsLib) return Promise.resolve(W.pdfjsLib);
    if(pdfjsP) return pdfjsP;
    pdfjsP = new Promise(function(res, rej){
      var s = d.createElement('script'); s.src = PDFJS + 'pdf.min.js'; s.async = true;
      s.onload = function(){ if(W.pdfjsLib){ W.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(W.pdfjsLib); } else rej(new Error('pdf.js')); };
      s.onerror = function(){ pdfjsP = null; rej(new Error('تعذّر تحميل قارئ PDF (يحتاج إنترنت أول مرة)')); };
      d.head.appendChild(s);
    });
    return pdfjsP;
  }
  function pageText(pdf, n){
    return pdf.getPage(n).then(function(pg){ return pg.getTextContent(); }).then(function(tc){
      var out = ''; tc.items.forEach(function(it){ out += it.str + (it.hasEOL ? '\n' : ' '); });
      return out.replace(/ +\n/g, '\n');
    });
  }

  /* ---- حوار عام بسيط (يستعمل أنماط ocri-* الموجودة) ---- */
  var dlg = null;
  function closeDlg(){ if(dlg && dlg.parentNode) dlg.parentNode.removeChild(dlg); dlg = null; }
  function openDlg(title, build){
    closeDlg();
    dlg = el('div', 'ocri-overlay sy-overlay'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
    var box = el('div', 'ocri-box sy-box'); box.appendChild(el('div', 'ocri-title', title)); build(box);
    dlg.appendChild(box); dlg.addEventListener('click', function(e){ if(e.target === dlg) closeDlg(); });
    d.body.appendChild(dlg); return box;
  }
  function busy(title, sub, onCancel){
    var box = openDlg(title, function(b){ b.appendChild(el('div', 'ocri-spin')); b.appendChild(el('div', 'ocri-sub', sub)); var c = el('button', 'ocri-btn', 'إلغاء'); c.type = 'button'; c.addEventListener('click', function(){ if(onCancel) onCancel(); closeDlg(); }); b.appendChild(c); });
    return box;
  }
  function fail(title, msg, withSettings){
    openDlg(title, function(b){
      b.appendChild(el('div', 'ocri-sub', msg));
      var row = el('div', 'ocri-actions');
      if(withSettings && W.OcrImport){ var s = el('button', 'ocri-btn ghost', 'إعدادات Gemini'); s.type = 'button'; s.addEventListener('click', function(){ closeDlg(); W.OcrImport.openSettings(); }); row.appendChild(s); }
      var ok = el('button', 'ocri-btn', 'تمام'); ok.type = 'button'; ok.addEventListener('click', closeDlg); row.appendChild(ok); b.appendChild(row); setTimeout(function(){ ok.focus(); }, 0);
    });
  }

  /* قراءة ملف: Blob.text/arrayBuffer إن وُجدت وإلا FileReader (متصفحات قديمة/jsdom) */
  function fileText(f){ if(f.text) return f.text(); return new Promise(function(res, rej){ var r = new W.FileReader(); r.onload = function(){ res(String(r.result)); }; r.onerror = function(){ rej(r.error); }; r.readAsText(f); }); }
  function fileBuf(f){ if(f.arrayBuffer) return f.arrayBuffer(); return new Promise(function(res, rej){ var r = new W.FileReader(); r.onload = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); }; r.readAsArrayBuffer(f); }); }
  /* ---- استيراد الخطة ---- */
  var MAX_BYTES = 15 * 1024 * 1024;
  function readInput(file){
    var name = String(file.name || '').toLowerCase(), type = file.type || '';
    if(/\.docx$/.test(name) || /officedocument\.wordprocessingml/.test(type)){
      return fileBuf(file).then(docxToText).then(function(t){
        if(t.length < 30) throw new Error('الملف فاضي أو ما قدرت أقرأ نصه');
        return [{ text: 'نص خطة المادة (مستخرج من ملف Word، الجداول تظهر بفواصل |):\n\n' + t.slice(0, 60000) }];
      });
    }
    if(/\.(txt|md)$/.test(name) || /^text\//.test(type)) return fileText(file).then(function(t){ return [{ text: 'نص خطة المادة:\n\n' + t.slice(0, 60000) }]; });
    if(/pdf$/.test(type) || /\.pdf$/.test(name) || /^image\/(png|jpe?g|webp)$/.test(type)) return W.GeminiLab.fileToPart(/\.pdf$/.test(name) && !type ? new Blob([file], { type: 'application/pdf' }) : file).then(function(p){ return [p]; });
    return Promise.reject(new Error('نوع الملف غير مدعوم — ارفع Word (docx) أو PDF أو صورة أو نص'));
  }
  function importPlan(course, file){
    if(!course || !file) return;
    if(!W.GeminiLab || !W.GeminiLab.ensureKey()) return;
    if(file.size > MAX_BYTES){ toast('الملف كبير (أكثر من 15 ميجا)', 'warn'); return; }
    var ac = typeof AbortController === 'function' ? new AbortController() : null;
    busy('جاري قراءة خطة المادة…', 'بتنرسل لـGemini (Google) وبترجع خلال 10–30 ثانية', function(){ if(ac) ac.abort(); });
    readInput(file).then(function(parts){
      return W.GeminiLab.json({ parts: [{ text: PROMPT }].concat(parts), schema: SCHEMA, signal: ac && ac.signal });
    }).then(function(raw){
      if(ac && ac.signal.aborted) return;
      var r = normalize(raw);
      if(!r.plan.weeks.length && !r.plan.grading.length && !r.plan.instructor) throw Object.assign(new Error('ما قدرت أقرأ أي بيانات من هالملف — تأكد أنه خطة مادة'), { code: 'content' });
      preview(course, r.plan, r.warnings);
    }).catch(function(e){
      if(ac && ac.signal.aborted) return;
      var msg = e && e.code === 'content' ? e.message : (e && e.code ? W.GeminiLab.explain(e) : (e && e.message) || 'فشل قراءة الخطة');
      fail('ما اشتغل استيراد الخطة', msg, !!(e && e.code === 'gemini'));
    });
  }
  function pickFile(accept, cb){
    var old = d.querySelector('input.sy-file'); if(old && old.parentNode) old.parentNode.removeChild(old);
    var inp = el('input', 'sy-file'); inp.type = 'file'; inp.accept = accept; inp.style.display = 'none';
    inp.addEventListener('change', function(){ var f = inp.files && inp.files[0]; if(inp.parentNode) inp.parentNode.removeChild(inp); if(f) cb(f); });
    d.body.appendChild(inp); inp.click();
  }
  function startImport(course){ pickFile('.docx,.pdf,.txt,.md,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document', function(f){ importPlan(course, f); }); }

  /* معاينة قبل الحفظ */
  function preview(course, plan, warnings){
    openDlg('راجع خطة المادة قبل الحفظ', function(b){
      b.classList.add('sy-wide');
      var info = el('div', 'sy-info');
      [['المادة', plan.courseName + (plan.courseCode ? ' (' + plan.courseCode + ')' : '')], ['المدرّس', plan.instructor + (plan.office ? ' — ' + plan.office : '')],
       ['الكتاب', [plan.textbook.title, plan.textbook.authors, plan.textbook.edition].filter(Boolean).join(' · ')],
       ['الحضور', plan.attendance.maxAbsencePercent ? 'الحرمان عند غياب ' + plan.attendance.maxAbsencePercent + '%' : ''],
       ['التقييم', plan.grading.map(function(g){ return g.item + (g.weight ? ' ' + g.weight : ''); }).join(' · ')],
       ['الأسابيع', plan.weeks.length + ' بند · آخر أسبوع ' + (plan.weeks.length ? plan.weeks[plan.weeks.length - 1].to : '—')]].forEach(function(r){
        if(!r[1]) return; var row = el('div', 'sy-row'); row.appendChild(el('b', null, r[0])); row.appendChild(el('span', null, r[1])); info.appendChild(row);
      });
      b.appendChild(info);
      if(plan.courseName && course && norm(plan.courseName).indexOf(norm(course.name).slice(0, 4)) < 0 && norm(course.name).indexOf(norm(plan.courseName).slice(0, 4)) < 0)
        warnings = warnings.concat(['اسم المادة بالخطة («' + plan.courseName + '») يختلف عن «' + course.name + '» — تأكد أنك بالمادة الصح']);
      if(warnings.length){ var w = el('div', 'sy-warn'); warnings.forEach(function(t){ w.appendChild(el('div', null, '⚠️ ' + t)); }); b.appendChild(w); }
      var det = el('details', 'ocri-how'); det.appendChild(el('summary', null, 'عرض الخطة الأسبوعية (' + plan.weeks.length + ')'));
      var ol = el('ol'); plan.weeks.forEach(function(wk){ ol.appendChild(el('li', null, 'أسبوع ' + (wk.to > wk.from ? wk.from + '–' + wk.to : wk.from) + ': ' + wk.topics.map(function(t){ return t.title + (t.section ? ' (' + t.section + ')' : ''); }).join('، '))); });
      det.appendChild(ol); b.appendChild(det);
      var lbl = el('label', 'ocri-lbl', 'بداية الفصل (لحساب أسبوعك الحالي) — اختياري'); lbl.setAttribute('for', 'syStart'); b.appendChild(lbl);
      var st = el('input', 'ocri-in'); st.type = 'date'; st.id = 'syStart'; st.value = sp().semesterStart || ''; b.appendChild(st);
      var row = el('div', 'ocri-actions');
      var ok = el('button', 'ocri-btn', 'حفظ الخطة'); ok.type = 'button';
      var no = el('button', 'ocri-btn ghost', 'إلغاء'); no.type = 'button'; no.addEventListener('click', closeDlg);
      ok.addEventListener('click', function(){
        var c = courseById(course.id); if(!c){ closeDlg(); return; }
        c.syllabus = plan;
        if(plan.instructor && !c.instructor) c.instructor = plan.instructor;
        if(/^\d{4}-\d{2}-\d{2}$/.test(st.value)) W.space.semesterStart = st.value;
        save(); closeDlg(); toast('✅ انحفظت خطة ' + c.name, 'success', 3500); refresh();
      });
      row.appendChild(ok); row.appendChild(no); b.appendChild(row);
    });
  }
  function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, ''); }

  /* ---- ربط الكتاب ---- */
  function attachBook(course, file){
    if(!file) return;
    if(!/pdf$/.test(file.type || '') && !/\.pdf$/i.test(file.name || '')){ toast('ارفع الكتاب بصيغة PDF', 'warn'); return; }
    var cancelled = false;
    busy('جاري تجهيز الكتاب…', 'بقرأ فهرس الكتاب من أول صفحاته (الملف ما بيطلع من جهازك)', function(){ cancelled = true; });
    var pdfRef = null, idx = { toc: [], offset: null, pages: 0 };
    loadPdfJs().then(function(lib){ return fileBuf(file).then(function(buf){ return lib.getDocument({ data: buf }).promise; }); }).then(function(pdf){
      pdfRef = pdf; idx.pages = pdf.numPages;
      var front = []; for(var i = 1; i <= Math.min(12, pdf.numPages); i++) front.push(pageText(pdf, i));
      return Promise.all(front);
    }).then(function(texts){
      idx.toc = parseToc(texts.join('\n'));
      var sample = [], from = Math.min(Math.max(20, 1), idx.pages), to = Math.min(idx.pages, 90);
      for(var i = from; i <= to; i += 3) sample.push(i);
      return Promise.all(sample.map(function(n){ return pageText(pdfRef, n).then(function(t){ return { index: n, text: t.slice(0, 300) }; }); }));
    }).then(function(pages){
      var o = detectOffset(pages); idx.offset = o ? o.offset : null;
      return bookPut(course.id, file);
    }).then(function(){
      if(cancelled) return;
      var c = courseById(course.id); if(!c) return;
      var ranges = sectionRanges(idx.toc, idx.pages ? Math.max(0, idx.pages - (idx.offset || 0)) : 0);
      c.book = { name: String(file.name || 'book.pdf').slice(0, 120), size: file.size, pages: idx.pages, offset: idx.offset, sections: ranges, linkedAt: todayYmd() };
      save(); closeDlg();
      if(!idx.toc.length) toast('ربطت الكتاب لكن ما قدرت أبني فهرس الأقسام — بتفتحه من أول صفحة', 'warn', 6000);
      else if(idx.offset === null) toast('ربطت الكتاب (' + idx.toc.length + ' قسم). ما قدرت أحدّد إزاحة الصفحات — عدّلها يدوياً من «ضبط الإزاحة»', 'warn', 7000);
      else toast('📖 ربطت الكتاب: ' + idx.toc.length + ' قسم، إزاحة الصفحات ' + idx.offset, 'success', 4500);
      refresh();
    }).catch(function(e){ if(!cancelled) fail('ما قدرت أجهّز الكتاب', (e && e.message) || 'خطأ بقراءة الـPDF'); });
  }
  function openBook(course, section){
    var c = courseById(course.id); if(!c || !c.book) return;
    bookGet(c.id).then(function(blob){
      if(!blob){ toast('ملف الكتاب مش موجود على هالجهاز — اربطه من جديد (الكتب ما بتتزامن)', 'warn', 6000); return; }
      var page = 1, r = section && c.book.sections && c.book.sections[section];
      if(r) page = r[0] + (c.book.offset || 0);
      var url = W.URL.createObjectURL(blob) + '#page=' + page;
      var w = W.open(url, '_blank', 'noopener'); if(!w) toast('المتصفح منع فتح النافذة — اسمح بالنوافذ المنبثقة', 'warn');
      setTimeout(function(){ try{ W.URL.revokeObjectURL(url.split('#')[0]); }catch(e){} }, 120000);
    }).catch(function(){ toast('تعذّر فتح الكتاب', 'warn'); });
  }
  function rangeText(c, sec){ var r = c.book && c.book.sections && c.book.sections[sec]; return r ? 'ص ' + r[0] + (r[1] > r[0] ? '–' + r[1] : '') : ''; }

  /* ---- مهام القراءة للأسابيع القادمة ---- */
  function addReadingTasks(course, plan){
    var start = sp().semesterStart; if(!start){ toast('حدّد بداية الفصل أول (من «بداية الفصل» بالخطة)', 'warn'); return; }
    var n = 0, now = todayYmd(); if(!Array.isArray(sp().tasks)) W.space.tasks = [];
    var have = {}; W.space.tasks.forEach(function(t){ have[t.course + '|' + t.title] = 1; });
    plan.weeks.forEach(function(wk){
      var due = ymdAdd(start, (wk.from - 1) * 7 + 6); if(due < now) return;
      var secs = []; wk.topics.forEach(function(t){ if(t.section && secs.indexOf(t.section) < 0) secs.push(t.section); });
      var title = '📖 أسبوع ' + wk.from + ': ' + (secs.length ? 'اقرأ ' + secs.join('، ') : wk.topics.map(function(t){ return t.title; }).slice(0, 2).join('، '));
      var pg = secs.map(function(s){ return rangeText(course, s); }).filter(Boolean); if(pg.length) title += ' (' + pg.join(' · ') + ')';
      if(have[course.name + '|' + title]) return;
      W.space.tasks.push({ id: W.uid ? W.uid() : Date.now().toString(36) + n, title: title.slice(0, 140), type: 'task', course: course.name, due: due, done: false }); n++;
    });
    if(!n){ toast('ما في أسابيع قادمة جديدة تنضاف', 'info'); return; }
    save(); if(W.renderTasks) W.renderTasks(); toast('➕ أضفت ' + n + ' مهمة قراءة (بآخر كل أسبوع)', 'success', 4000); refresh();
  }

  /* ---- قسم «خطة المادة» داخل ورقة المادة ---- */
  function sectionHtml(c){
    var p = c.syllabus, h = '<section class="hub-sec sy-sec" id="hs-plan"><h4>🧾 خطة المادة' + (c.book ? ' <span class="muted">· 📖 الكتاب مربوط</span>' : '') + '</h4>';
    if(!p){
      h += '<div class="hub-empty">ارفع خطة المادة اللي نزّلها الدكتور (Word أو PDF أو صورة) وبطلّع الموقع الأسابيع والكتاب والتقييم وحدّ الغياب لحاله.</div>' +
        '<div class="hub-actions inline"><button type="button" class="btn btn-sm" data-sy="import">📎 استيراد الخطة</button></div></section>';
      return h;
    }
    var start = sp().semesterStart, wk = start ? weekNumber(start) : null, cur = wk ? weekEntry(p, wk) : null, last = p.weeks.length ? p.weeks[p.weeks.length - 1].to : 0;
    var chips = [];
    if(p.instructor) chips.push('👤 ' + esc(p.instructor)); if(p.office) chips.push('🚪 ' + esc(p.office));
    if(p.textbook.title) chips.push('📘 ' + esc(p.textbook.title + (p.textbook.edition ? ' ' + p.textbook.edition : '')));
    if(chips.length) h += '<div class="hub-chips">' + chips.map(function(x){ return '<span class="badge">' + x + '</span>'; }).join('') + '</div>';
    /* هالأسبوع */
    if(!start) h += '<div class="sy-week"><div class="muted">حدّد بداية الفصل لأعرض لك «هالأسبوع»</div><input type="date" class="ocri-in sy-start" aria-label="بداية الفصل" value=""><button type="button" class="btn btn-sm" data-sy="setstart">حفظ</button></div>';
    else if(wk && wk > last && last) h += '<div class="sy-week done">🎉 خلّصت أسابيع الخطة (آخر أسبوع ' + last + ')</div>';
    else if(wk && wk < 1) h += '<div class="sy-week">لسا ما بلش الفصل — يبدأ ' + esc(start) + '</div>';
    else if(cur){
      h += '<div class="sy-week"><div class="sy-week-h">📍 أسبوع ' + wk + ' من ' + last + '</div><ul class="sy-topics">' + cur.topics.map(function(t){
        var rg = t.section ? rangeText(c, t.section) : '';
        return '<li><span>' + (t.section ? '<b class="mono">' + esc(t.section) + '</b> ' : '') + esc(t.title) + '</span>' + (rg ? '<small class="muted">' + esc(rg) + '</small>' : '') +
          (c.book && t.section ? '<button type="button" class="hub-mini" data-sy="open" data-sec="' + esc(t.section) + '" aria-label="فتح القسم بالكتاب">📖</button>' : '') + '</li>';
      }).join('') + '</ul></div>';
    } else if(wk) h += '<div class="sy-week muted">أسبوع ' + wk + ': ما في بند بالخطة لهالأسبوع (اختبارات أو عطلة).</div>';
    /* الحضور */
    var slots = W.Schedule ? W.Schedule.forCourse(c.name).length : 0, lim = absenceLimit(p, slots, last || 0), att = (sp().attendance || {})[c.name] || { absent: 0 };
    if(p.attendance.maxAbsencePercent){
      h += '<div class="sy-att"><b>✅ الحضور:</b> الحرمان عند غياب ' + p.attendance.maxAbsencePercent + '%' +
        (lim ? ' — يعني تقريباً أقصى غياب آمن <b>' + lim.max + '</b> من ' + lim.total + ' محاضرة (غبت ' + (att.absent || 0) + ')' + ((att.absent || 0) > lim.max ? ' <span class="bad">⚠️ تجاوزت!</span>' : (att.absent || 0) >= lim.max - 1 && lim.max ? ' <span class="warn">⚠️ قرّبت</span>' : '') : ' <span class="muted">(أضف محاضرات المادة بالجدول لأحسب العدد)</span>') + '</div>';
    }
    if(p.grading.length) h += '<div class="sy-grade">' + p.grading.map(function(g){ return '<span class="badge">' + esc(g.item) + (g.weight ? ' <b>' + g.weight + '</b>' : '') + '</span>'; }).join('') + '</div>';
    /* كامل الخطة */
    h += '<details class="ocri-how sy-all"><summary>الخطة الأسبوعية كاملة (' + p.weeks.length + ')</summary><ol>' + p.weeks.map(function(x){
      return '<li' + (wk && wk >= x.from && wk <= x.to ? ' class="cur"' : '') + '><b>أسبوع ' + (x.to > x.from ? x.from + '–' + x.to : x.from) + ':</b> ' + x.topics.map(function(t){
        var link = c.book && t.section && c.book.sections && c.book.sections[t.section] ? ' <button type="button" class="hub-link" data-sy="open" data-sec="' + esc(t.section) + '">' + esc(t.section) + ' · ' + esc(rangeText(c, t.section)) + '</button>' : (t.section ? ' <span class="mono muted">' + esc(t.section) + '</span>' : '');
        return esc(t.title) + link;
      }).join('، ') + '</li>';
    }).join('') + '</ol></details>';
    /* الأزرار */
    h += '<div class="hub-actions inline">' +
      (c.book ? '<button type="button" class="btn btn-sm" data-sy="open" data-sec="">📖 فتح الكتاب</button>' : '<button type="button" class="btn btn-sm" data-sy="attach">📖 ربط الكتاب (PDF)</button>') +
      '<button type="button" class="btn btn-sm btn-ghost" data-sy="tasks">➕ مهام القراءة</button>' +
      '<button type="button" class="btn btn-sm btn-ghost" data-sy="import">🔄 إعادة استيراد</button>' +
      (c.book ? '<button type="button" class="btn btn-sm btn-ghost" data-sy="offset">ضبط الإزاحة</button><button type="button" class="btn btn-sm btn-ghost" data-sy="unbook">فصل الكتاب</button>' : '') +
      '<button type="button" class="btn btn-sm btn-ghost" data-sy="del">🗑 حذف الخطة</button></div>';
    if(c.book) h += '<div class="muted sy-bk">📘 ' + esc(c.book.name) + ' · ' + c.book.pages + ' صفحة · ' + Object.keys(c.book.sections || {}).length + ' قسم بالفهرس' + (c.book.offset == null ? ' · <span class="warn">الإزاحة غير محدّدة</span>' : ' · إزاحة ' + c.book.offset) + ' · الملف على هالجهاز فقط</div>';
    return h + '</section>';
  }
  var refresh = function(){ if(W.Hub && W.Hub.refreshActive) W.Hub.refreshActive(); };
  function bindSection(rootEl, c){
    rootEl.querySelectorAll('[data-sy]').forEach(function(b){
      b.addEventListener('click', function(){
        var a = b.getAttribute('data-sy'), cur = courseById(c.id) || c;
        if(a === 'import') startImport(cur);
        else if(a === 'attach') pickFile('application/pdf,.pdf', function(f){ attachBook(cur, f); });
        else if(a === 'open') openBook(cur, b.getAttribute('data-sec') || '');
        else if(a === 'tasks') addReadingTasks(cur, cur.syllabus);
        else if(a === 'setstart'){ var i = rootEl.querySelector('.sy-start'); if(i && /^\d{4}-\d{2}-\d{2}$/.test(i.value)){ W.space.semesterStart = i.value; save(); refresh(); } else toast('اختر تاريخ بداية الفصل', 'warn'); }
        else if(a === 'del'){ if(W.customConfirm) W.customConfirm('حذف خطة المادة من «' + cur.name + '»؟ (الكتاب والمهام ما بينحذفوا)', function(){ delete cur.syllabus; save(); refresh(); }); else { delete cur.syllabus; save(); refresh(); } }
        else if(a === 'unbook'){ bookDel(cur.id).catch(function(){}); delete cur.book; save(); toast('فصلت الكتاب عن المادة', 'info'); refresh(); }
        else if(a === 'offset' && W.showModal){
          W.showModal('إزاحة صفحات الكتاب', [{ key: 'offset', label: 'الفرق بين ترتيب الصفحة بملف PDF ورقمها المطبوع (مثلاً 26)', type: 'number' }], { offset: cur.book.offset == null ? 0 : cur.book.offset }, function(data){
            var o = parseInt(data.offset, 10); if(!isFinite(o) || o < 0 || o > 500){ toast('أدخل رقماً من 0 إلى 500', 'warn'); return false; }
            cur.book.offset = o; save(); refresh(); return true;
          });
        }
      });
    });
  }

  return Object.assign(pure, { sectionHtml: sectionHtml, bindSection: bindSection, startImport: startImport, importPlan: importPlan, attachBook: attachBook, openBook: openBook, addReadingTasks: addReadingTasks, loadPdfJs: loadPdfJs, _preview: preview, _setRefresh: function(f){ refresh = f; } });
});
