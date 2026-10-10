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
  /* المحتويات: نطبّع النص لسطر واحد ثم نقطّعه عند رموز الأقسام (1.1، 2.3…) فتصلح كل الصيغ: رقم القسم بسطر مستقل، أو كل شي بسطر،
     أو نقاط الوصل، أو عدّة أقسام بنفس السطر (pdf.js بيدمج الأسطر أحياناً). العنوان = حتى أول رقم صفحة مستقل بعد 6 أحرف على الأقل */
  function parseToc(text){
    var t = String(text || '').replace(/[.·…]{2,}/g, ' ').replace(/\s+/g, ' ');
    var re = /(?:^|\s)(\d{1,2}\.\d{1,2})\s+(?=[A-Za-z])/g, marks = [], m;
    while((m = re.exec(t))){ marks.push({ sec: m[1], at: m.index + m[0].length }); re.lastIndex = m.index + m[0].length; }
    var out = [], seen = {}, prev = 0;
    marks.forEach(function(mk, i){
      var seg = t.slice(mk.at, i + 1 < marks.length ? marks[i + 1].at - 0 : t.length);
      var nm = /^(.{5,}?)\s(\d{1,4})(?=\s|$)/.exec(seg);                       /* العنوان ثم أول رقم مستقل */
      if(!nm) return;
      var title = nm[1].replace(/\s+\d{1,2}\.\d{1,2}$/, '').trim(), page = parseInt(nm[2], 10);
      if(seen[mk.sec] || !page || page > 3000 || page < prev) return;           /* صفحات المحتويات تصاعدية؛ الشاذ يُهمَل */
      seen[mk.sec] = 1; prev = page; out.push({ sec: mk.sec, title: title, page: page });
    });
    return out.sort(function(a, b){ return a.page - b.page; });
  }
  /* رقم الصفحة المطبوع من أول نص الصفحة (يدعم الصيغتين: أسطر منفصلة أو سطر واحد):
     «36 CHAPTER 1 …» و«10 ¤ CHAPTER 1 …» (الرقم بالبداية) أو «SECTION 1.2 MATH MODELS … ¤ 35» (الرقم بآخر الترويسة) */
  function printedOf(text){
    var h = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 220), m;
    if(/^\d{1,4}$/.test(h)) return parseInt(h, 10);
    if((m = /^(\d{1,4}) ?[¤•|·]? ?(?:CHAPTER|SECTION|[A-Z]{4,})/.exec(h))) return parseInt(m[1], 10);
    if((m = /^(?:SECTION \d{1,2}\.\d{1,2} )?[A-Z][A-Z0-9 :,'’&\-]{9,}? ?[¤•|·]? ?(\d{1,4})(?= |$)(?! [A-Z]{2,})/.exec(h))) return parseInt(m[1], 10);
    return null;
  }
  function mode(votes, minVotes){
    var best = null, bc = 0, tot = 0;
    Object.keys(votes).forEach(function(k){ tot += votes[k]; if(votes[k] > bc){ bc = votes[k]; best = parseInt(k, 10); } });
    return bc >= minVotes ? { offset: best, votes: bc, total: tot } : null;
  }
  /* (أ) من أرقام الصفحات المطبوعة: pages = [{ index (ترتيب PDF من 1), text }] -> الإزاحة الأكثر تكراراً */
  function detectOffset(pages){
    var votes = {};
    (pages || []).forEach(function(p){ var pr = printedOf(p.text); if(pr !== null && p.index > pr){ var o = p.index - pr; votes[o] = (votes[o] || 0) + 1; } });
    return mode(votes, 3);
  }
  /* (ب) من عناوين الأقسام: أول صفحة (بعد المحتويات) يظهر بأعلاها عنوان القسم = صفحة بدايته؛ كل قسم يصوّت بأول ظهور فقط
     (الترويسات الجارية بصفحات القسم اللاحقة تعطي قيماً أكبر متفرقة فلا تفوز) */
  function nk(s){ return String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }
  function detectOffsetByTitles(pages, toc, minIndex){
    var votes = {}, sorted = (pages || []).filter(function(p){ return p.index > (minIndex || 12); }).sort(function(a, b){ return a.index - b.index; });
    (toc || []).forEach(function(e){
      var key = nk(e.title); if(key.length < 12) return;
      for(var i = 0; i < sorted.length; i++){
        if(nk(sorted[i].text.slice(0, 420)).indexOf(key) > -1){
          var o = sorted[i].index - e.page; if(o >= 0 && o < 400) votes[o] = (votes[o] || 0) + 1; return;
        }
      }
    });
    return mode(votes, 3);
  }
  /* الإزاحة النهائية: نفضّل الأكثر دعماً؛ والتصويتان لو اتفقتا فأفضل */
  function resolveOffset(pages, toc, minIndex){
    var a = detectOffset(pages), b = detectOffsetByTitles(pages, toc, minIndex);
    if(a && b) return (a.offset === b.offset || a.votes >= b.votes) ? { offset: a.offset, votes: a.votes, by: 'printed' } : { offset: b.offset, votes: b.votes, by: 'titles' };
    if(a) return { offset: a.offset, votes: a.votes, by: 'printed' };
    if(b) return { offset: b.offset, votes: b.votes, by: 'titles' };
    return null;
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

  /* خطة مراجعة لامتحان: كل أقسام الأسابيع قبل أسبوع الامتحان، موزّعة بالتساوي على الأيام من اليوم حتى اليوم السابق للامتحان */
  function ymdToDate(y){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(y || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function dateToYmd(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function reviewPlan(plan, startYmd, examYmd, todayY){
    var ex = ymdToDate(examYmd), t0 = ymdToDate(todayY); if(!plan || !ex || !t0 || ex <= t0) return { sections: [], days: [], note: 'الامتحان فات أو اليوم نفسه' };
    var ew = startYmd ? weekNumber(startYmd, ex) : null, secs = [], seen = {};
    (plan.weeks || []).forEach(function(w){
      if(ew !== null && w.from >= ew) return;                                /* أسبوع الامتحان وما بعده ما بيدخل */
      w.topics.forEach(function(t){ var k = t.section || ('t:' + t.title); if(seen[k]) return; seen[k] = 1; secs.push({ sec: t.section || '', title: t.title, week: w.from }); });
    });
    var span = Math.round((ex - t0) / 86400000), n = Math.max(1, Math.min(span, 21)), per = Math.max(1, Math.ceil(secs.length / n)), days = [];
    for(var i = 0; i < secs.length; i += per){
      var idx = Math.floor(i / per), day = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + Math.min(idx, Math.max(0, span - 1)));
      days.push({ date: dateToYmd(day), items: secs.slice(i, i + per) });
    }
    return { sections: secs, days: days, note: ew === null ? 'ما حدّدت بداية الفصل، فاعتبرت كل أسابيع الخطة' : '' };
  }
  /* مذاكرة قسم بـGemini: مخطط ومُدقّق */
  var STUDY_SCHEMA = { type: 'OBJECT', properties: {
    summary: { type: 'STRING' }, keyIdeas: { type: 'ARRAY', items: { type: 'STRING' } },
    formulas: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, expr: { type: 'STRING' }, note: { type: 'STRING' } }, required: ['expr'] } },
    definitions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { term: { type: 'STRING' }, meaning: { type: 'STRING' } }, required: ['term'] } },
    flashcards: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, a: { type: 'STRING' } }, required: ['q', 'a'] } },
    practice: { type: 'ARRAY', items: { type: 'OBJECT', properties: { q: { type: 'STRING' }, hint: { type: 'STRING' } }, required: ['q'] } },
    mistakes: { type: 'ARRAY', items: { type: 'STRING' } }
  }, required: ['summary'] };
  var STUDY_PROMPT = [
    'أنت مدرّس خصوصي لطالب هندسة أردني. الصور المرفقة صفحات متتالية من كتاب جامعي (إنجليزي) لقسم واحد.',
    'اكتب كل الشرح بالعربية البسيطة (لهجة بيضاء مفهومة) مع إبقاء المصطلحات والرموز بالإنجليزية. اعتمد على محتوى الصفحات فقط ولا تضف معلومات من عندك؛ إن لم تكن متأكداً من شي اتركه.',
    'المطلوب JSON: summary (ملخص 5–8 أسطر)، keyIdeas (3–6 أفكار رئيسية)، formulas (القوانين والنظريات: name و expr بنص واضح مثل lim(x→a) f(x) = L أو (f·g)\' = f\'g + fg\' و note شرط الاستعمال)،',
    'definitions (التعريفات: term و meaning)، flashcards (6–10 بطاقات سؤال/جواب قصيرة للحفظ)، practice (4–6 أسئلة تدريب بمستوى الامتحان مع hint تلميح بدون الحل الكامل)، mistakes (أخطاء شائعة 2–4).',
    'اكتب المعادلات كنص عادي (بدون LaTeX) بحيث تنقرأ على التلفون.'
  ].join('\n');
  function strs(a, n, max){ return (Array.isArray(a) ? a : []).map(function(x){ return str(x, max || 240); }).filter(Boolean).slice(0, n); }
  function normalizeStudy(raw){
    raw = raw && typeof raw === 'object' ? raw : {};
    function objs(a, n, f){ return (Array.isArray(a) ? a : []).map(function(x){ return x && typeof x === 'object' ? f(x) : null; }).filter(Boolean).slice(0, n); }
    var out = {
      summary: str(raw.summary, 1400), keyIdeas: strs(raw.keyIdeas, 8, 220),
      formulas: objs(raw.formulas, 14, function(x){ var e = str(x.expr, 200); return e ? { name: str(x.name, 80), expr: e, note: str(x.note, 160) } : null; }),
      definitions: objs(raw.definitions, 12, function(x){ var t = str(x.term, 80); return t ? { term: t, meaning: str(x.meaning, 260) } : null; }),
      flashcards: objs(raw.flashcards, 14, function(x){ var q = str(x.q, 220), a = str(x.a, 300); return q && a ? { q: q, a: a } : null; }),
      practice: objs(raw.practice, 8, function(x){ var q = str(x.q, 320); return q ? { q: q, hint: str(x.hint, 240) } : null; }),
      mistakes: strs(raw.mistakes, 5, 220)
    };
    return { study: out, empty: !out.summary && !out.flashcards.length };
  }
  /* صفحات قسم (مطبوعة من..إلى) -> أجزاء PDF بحجم أقصى 8 صفحات */
  function chunkPages(range, offset, size){
    var a = range[0] + (offset || 0), b = range[1] + (offset || 0), out = [], k = size || 8;
    for(var p = a; p <= b; p += k) out.push([p, Math.min(b, p + k - 1)]);
    return out;
  }
  var pure = { reviewPlan: reviewPlan, STUDY_SCHEMA: STUDY_SCHEMA, STUDY_PROMPT: STUDY_PROMPT, normalizeStudy: normalizeStudy, chunkPages: chunkPages, SCHEMA: SCHEMA, PROMPT: PROMPT, normalize: normalize, docxToText: docxToText, xmlToText: xmlToText, parseToc: parseToc, printedOf: printedOf, detectOffset: detectOffset, detectOffsetByTitles: detectOffsetByTitles, resolveOffset: resolveOffset, sectionRanges: sectionRanges, weekNumber: weekNumber, weekEntry: weekEntry, absenceLimit: absenceLimit, sectionOf: sectionOf };
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
  function setBusySub(text){ var s = dlg && dlg.querySelector('.ocri-sub'); if(s) s.textContent = text; }
  /* سؤال المستخدم عن الإزاحة عند فشل الكشف التلقائي: يكتب رقم صفحة PDF (حسب عارض المتصفح) لأول قسم بالفهرس */
  function askOffset(course, firstRun){
    var c = courseById(course.id); if(!c || !c.book) return;
    var first = c.book.first || (function(){ var k = Object.keys(c.book.sections || {}).sort(function(a, b){ return c.book.sections[a][0] - c.book.sections[b][0]; })[0]; return k ? { sec: k, page: c.book.sections[k][0] } : null; })();
    if(!first){ toast('ما في فهرس أقسام لهالكتاب — الإزاحة مش مطلوبة', 'info'); return; }
    openDlg('ضبط صفحات الكتاب', function(b){
      b.classList.add('sy-wide');
      b.appendChild(el('div', 'ocri-sub', (firstRun ? 'ما قدرت أعرف تلقائياً كيف ترقيم صفحات هالكتاب. ' : '') + 'افتح الكتاب (زر تحت) وروح على أول صفحة من القسم ' + first.sec + (first.title ? ' «' + first.title + '»' : '') + ' — ورقمها بالكتاب المطبوع ' + first.page + '. اكتب رقم الصفحة اللي بيعرضه عارض الـPDF (شريط الصفحات) هناك:'));
      var openB = el('button', 'ocri-btn ghost', '📖 فتح الكتاب'); openB.type = 'button'; openB.addEventListener('click', function(){ openBook(c, ''); });
      var inp = el('input', 'ocri-in'); inp.type = 'number'; inp.min = '1'; inp.setAttribute('aria-label', 'رقم الصفحة بعارض الـPDF'); inp.placeholder = 'مثلاً ' + (first.page + 26); if(c.book.offset != null) inp.value = String(first.page + c.book.offset);
      var note = el('div', 'ocri-note', c.book.offset != null ? 'الإزاحة الحالية: ' + c.book.offset : 'بدون ضبط، «فتح القسم» بيفتح الكتاب من أول صفحة.');
      var row = el('div', 'ocri-actions'), ok = el('button', 'ocri-btn', 'حفظ'), no = el('button', 'ocri-btn ghost', 'لاحقاً');
      ok.type = 'button'; no.type = 'button'; no.addEventListener('click', closeDlg);
      ok.addEventListener('click', function(){
        var v = parseInt(inp.value, 10), off = v - first.page;
        if(!isFinite(v) || off < 0 || off > 500){ toast('رقم الصفحة غير منطقي (لازم ≥ ' + first.page + ')', 'warn'); inp.focus(); return; }
        var cc = courseById(course.id); if(cc && cc.book){ cc.book.offset = off; save(); } closeDlg(); toast('✅ انضبطت صفحات الكتاب (إزاحة ' + off + ')', 'success', 3500); refresh();
      });
      b.appendChild(openB); b.appendChild(inp); b.appendChild(note); row.appendChild(ok); row.appendChild(no); b.appendChild(row); setTimeout(function(){ inp.focus(); }, 0);
    });
  }
  function attachBook(course, file){
    if(!file) return;
    if(!/pdf$/.test(file.type || '') && !/\.pdf$/i.test(file.name || '')){ toast('ارفع الكتاب بصيغة PDF', 'warn'); return; }
    var cancelled = false;
    busy('جاري تجهيز الكتاب…', 'بقرأ فهرس الكتاب (الملف ما بيطلع من جهازك)', function(){ cancelled = true; });
    var pdfRef = null, idx = { toc: [], offset: null, pages: 0, by: '' };
    loadPdfJs().then(function(lib){ return fileBuf(file).then(function(buf){ return lib.getDocument({ data: buf }).promise; }); }).then(function(pdf){
      pdfRef = pdf; idx.pages = pdf.numPages;
      var front = []; for(var i = 1; i <= Math.min(14, pdf.numPages); i++) front.push(pageText(pdf, i));
      return Promise.all(front);
    }).then(function(texts){
      idx.toc = parseToc(texts.join('\n'));
      if(cancelled) return null;
      setBusySub('بحدّد ترقيم الصفحات…');
      /* كل صفحات أول الكتاب (13…200) بأول 420 حرفاً: تكفي للكشف من الأرقام المطبوعة أو من عناوين الأقسام */
      var to = Math.min(idx.pages, 200), pages = [], n = 13, BATCH = 12;
      function next(){
        if(cancelled || n > to) return Promise.resolve(pages);
        var batch = []; for(var k = 0; k < BATCH && n <= to; k++, n++) batch.push(n);
        return Promise.all(batch.map(function(p){ return pageText(pdfRef, p).then(function(t){ pages.push({ index: p, text: t.replace(/\s+/g, ' ').slice(0, 420) }); }); })).then(function(){ setBusySub('بحدّد ترقيم الصفحات… ' + Math.min(n - 1, to) + ' / ' + to); return next(); });
      }
      return next();
    }).then(function(pages){
      if(cancelled || !pages) return null;
      var r = resolveOffset(pages, idx.toc, 12); idx.offset = r ? r.offset : null; idx.by = r ? r.by : '';
      return bookPut(course.id, file);
    }).then(function(done){
      if(cancelled || done === null) return;
      var c = courseById(course.id); if(!c) return;
      var ranges = sectionRanges(idx.toc, idx.pages ? Math.max(0, idx.pages - (idx.offset || 0)) : 0);
      c.book = { name: String(file.name || 'book.pdf').slice(0, 120), size: file.size, pages: idx.pages, offset: idx.offset, sections: ranges, linkedAt: todayYmd(), first: idx.toc[0] ? { sec: idx.toc[0].sec, title: idx.toc[0].title.slice(0, 80), page: idx.toc[0].page } : null };
      save(); closeDlg();
      if(!idx.toc.length) toast('ربطت الكتاب لكن ما قدرت أبني فهرس الأقسام — بتفتحه من أول صفحة', 'warn', 6000);
      else if(idx.offset === null){ refresh(); askOffset(c, true); return; }
      else toast('📖 ربطت الكتاب: ' + idx.toc.length + ' قسم، وصفحاته انضبطت تلقائياً', 'success', 4500);
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

  /* ---- خطة المراجعة لامتحان ---- */
  function upcomingExams(c){
    var t = todayYmd();
    return (sp().exams || []).filter(function(e){ return e.course === c.name && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') && e.date > t; }).sort(function(a, b){ return a.date < b.date ? -1 : 1; });
  }
  function examButtons(c){
    if(!c.syllabus || !c.syllabus.weeks.length) return '';
    var ex = upcomingExams(c); if(!ex.length) return '';
    return '<div class="hub-actions inline sy-review">' + ex.slice(0, 3).map(function(e){ return '<button type="button" class="btn btn-sm btn-ghost" data-sy="review" data-eid="' + esc(e.id || e.name) + '">🧠 خطة مراجعة: ' + esc(e.name) + '</button>'; }).join('') + '</div>';
  }
  function addReviewTasks(course, eid){
    var c = courseById(course.id) || course, ex = upcomingExams(c).filter(function(e){ return String(e.id || e.name) === String(eid); })[0];
    if(!c.syllabus || !ex){ toast('ما لقيت الامتحان', 'warn'); return; }
    var rp = reviewPlan(c.syllabus, sp().semesterStart, ex.date, todayYmd());
    if(!rp.days.length){ toast('ما في أقسام قبل هالامتحان بالخطة', 'info'); return; }
    openDlg('خطة مراجعة «' + ex.name + '»', function(b){
      b.classList.add('sy-wide');
      if(rp.note) b.appendChild(el('div', 'sy-warn', '⚠️ ' + rp.note));
      b.appendChild(el('div', 'ocri-sub', rp.sections.length + ' قسم موزّعين على ' + rp.days.length + ' يوم قبل ' + ex.date + ':'));
      var ol = el('ol', 'sy-rev'); rp.days.forEach(function(dy){
        var pg = dy.items.map(function(i){ return i.sec ? rangeText(c, i.sec) : ''; }).filter(Boolean);
        ol.appendChild(el('li', null, dy.date + ' — ' + dy.items.map(function(i){ return (i.sec ? i.sec + ' ' : '') + i.title; }).join('، ') + (pg.length ? ' (' + pg.join(' · ') + ')' : '')));
      }); b.appendChild(ol);
      var row = el('div', 'ocri-actions'), ok = el('button', 'ocri-btn', '➕ أضفها كمهام'), no = el('button', 'ocri-btn ghost', 'إلغاء'); ok.type = 'button'; no.type = 'button';
      no.addEventListener('click', closeDlg);
      ok.addEventListener('click', function(){
        if(!Array.isArray(sp().tasks)) W.space.tasks = []; var have = {}, n = 0; W.space.tasks.forEach(function(t){ have[t.course + '|' + t.title] = 1; });
        rp.days.forEach(function(dy){
          var title = '🧠 مراجعة (' + ex.name + '): ' + dy.items.map(function(i){ return i.sec || i.title.slice(0, 24); }).join('، ');
          if(have[c.name + '|' + title]) return;
          W.space.tasks.push({ id: W.uid ? W.uid() : Date.now().toString(36) + n, title: title.slice(0, 140), type: 'task', course: c.name, due: dy.date, done: false }); n++;
        });
        save(); if(W.renderTasks) W.renderTasks(); closeDlg(); toast(n ? '➕ أضفت ' + n + ' مهمة مراجعة' : 'المهام موجودة من قبل', n ? 'success' : 'info', 3500); refresh();
      });
      row.appendChild(ok); row.appendChild(no); b.appendChild(row);
    });
  }

  /* ---- مذاكرة قسم من الكتاب بـGemini (صفحاته كصور) ---- */
  function stdKey(sec, part){ return sec + (part ? '#' + part : ''); }
  function renderPageJpeg(pdf, n){
    return pdf.getPage(n).then(function(pg){
      var vp = pg.getViewport({ scale: 1.35 }), cv = d.createElement('canvas'); cv.width = Math.floor(vp.width); cv.height = Math.floor(vp.height);
      return pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function(){ var u = cv.toDataURL('image/jpeg', 0.68); return { inline_data: { mime_type: 'image/jpeg', data: u.slice(u.indexOf(',') + 1) } }; });
    });
  }
  function studySection(course, sec, part, force){
    var c = courseById(course.id) || course;
    if(!c.book || !c.book.sections || !c.book.sections[sec]){ toast('اربط الكتاب أول (الفهرس ما فيه القسم ' + sec + ')', 'warn'); return; }
    if(c.book.offset == null){ toast('اضبط صفحات الكتاب أول', 'warn'); askOffset(c, false); return; }
    var key = stdKey(sec, part), cached = c.study && c.study[key];
    if(cached && !force){ showStudy(c, sec, key, cached); return; }
    var parts = chunkPages(c.book.sections[sec], c.book.offset, 8);
    if(parts.length > 1 && !part){
      openDlg('القسم ' + sec + ' طويل (' + parts.length + ' أجزاء)', function(b){
        b.appendChild(el('div', 'ocri-sub', 'Gemini بياخد جزء واحد بالطلب (حتى 8 صفحات). اختر الجزء:'));
        var row = el('div', 'ocri-actions sy-parts');
        parts.forEach(function(p, i){ var bt = el('button', 'ocri-btn' + (c.study && c.study[stdKey(sec, i + 1)] ? ' ghost' : ''), 'جزء ' + (i + 1) + ' (ص PDF ' + p[0] + '–' + p[1] + ')' + (c.study && c.study[stdKey(sec, i + 1)] ? ' ✓' : '')); bt.type = 'button'; bt.addEventListener('click', function(){ closeDlg(); studySection(c, sec, i + 1, false); }); row.appendChild(bt); });
        b.appendChild(row);
      }); return;
    }
    if(!W.GeminiLab || !W.GeminiLab.ensureKey()) return;
    var pr = parts[(part || 1) - 1]; if(!pr){ toast('جزء غير موجود', 'warn'); return; }
    var ac = typeof AbortController === 'function' ? new AbortController() : null;
    busy('جاري تحضير مذاكرة القسم ' + sec + '…', 'بحوّل ' + (pr[1] - pr[0] + 1) + ' صفحات لصور وببعتها لـGemini (20–60 ثانية). الصور بتروح لـGoogle.', function(){ if(ac) ac.abort(); });
    bookGet(c.id).then(function(blob){
      if(!blob) throw Object.assign(new Error('ملف الكتاب مش على هالجهاز — اربطه من جديد'), { code: 'content' });
      return loadPdfJs().then(function(lib){ return fileBuf(blob).then(function(buf){ return lib.getDocument({ data: buf }).promise; }); });
    }).then(function(pdf){
      var ns = []; for(var p = pr[0]; p <= Math.min(pr[1], pdf.numPages); p++) ns.push(p);
      return Promise.all(ns.map(function(n){ return renderPageJpeg(pdf, n); }));
    }).then(function(imgs){
      if(ac && ac.signal.aborted) return null; setBusySub('Gemini يقرأ الصفحات…');
      var title = (c.book.first && sec === c.book.first.sec ? c.book.first.title : '') || '';
      return W.GeminiLab.json({ parts: [{ text: STUDY_PROMPT + '\nالقسم: ' + sec + (part ? ' (جزء ' + part + ')' : '') + ' من كتاب ' + ((c.syllabus && c.syllabus.textbook && c.syllabus.textbook.title) || 'المادة') + '.' }].concat(imgs), schema: STUDY_SCHEMA, temperature: 0.2, signal: ac && ac.signal });
    }).then(function(raw){
      if(raw === null || (ac && ac.signal.aborted)) return;
      var r = normalizeStudy(raw);
      if(r.empty) throw Object.assign(new Error('Gemini ما رجّع مذاكرة مفيدة — جرّب جزءاً ثانياً أو أعد المحاولة'), { code: 'content' });
      var cc = courseById(course.id); if(!cc) return; cc.study = cc.study || {}; r.study.at = todayYmd(); cc.study[key] = r.study;
      var keys = Object.keys(cc.study); if(keys.length > 14) keys.sort(function(a, b){ return (cc.study[a].at || '') < (cc.study[b].at || '') ? -1 : 1; }).slice(0, keys.length - 14).forEach(function(k){ delete cc.study[k]; });
      save(); closeDlg(); refresh(); showStudy(cc, sec, key, r.study);
    }).catch(function(e){
      if(ac && ac.signal.aborted) return;
      fail('ما اشتغلت المذاكرة', e && e.code === 'content' ? e.message : (e && e.code ? W.GeminiLab.explain(e) : (e && e.message) || 'خطأ'), !!(e && e.code === 'gemini'));
    });
  }
  function showStudy(c, sec, key, st){
    openDlg('🧠 مذاكرة القسم ' + sec, function(b){
      b.classList.add('sy-wide', 'sy-study');
      function block(title, items, fn){ if(!items || !items.length) return; var sx = el('div', 'sy-blk'); sx.appendChild(el('h5', null, title)); items.forEach(function(it){ sx.appendChild(fn(it)); }); b.appendChild(sx); }
      if(st.summary){ var sm = el('div', 'sy-blk'); sm.appendChild(el('h5', null, '📌 الملخص')); sm.appendChild(el('p', null, st.summary)); b.appendChild(sm); }
      block('💡 أفكار رئيسية', st.keyIdeas, function(t){ return el('div', 'sy-li', '• ' + t); });
      block('📐 قوانين ونظريات', st.formulas, function(f){ var r = el('div', 'sy-li'); if(f.name) r.appendChild(el('b', null, f.name + ': ')); var cd = el('code', 'ocri-cmd', f.expr); cd.setAttribute('dir', 'ltr'); r.appendChild(cd); if(f.note) r.appendChild(el('small', null, ' — ' + f.note)); return r; });
      block('📖 تعريفات', st.definitions, function(x){ var r = el('div', 'sy-li'); r.appendChild(el('b', null, x.term + ': ')); r.appendChild(d.createTextNode(x.meaning)); return r; });
      block('⚠️ أخطاء شائعة', st.mistakes, function(t){ return el('div', 'sy-li', '• ' + t); });
      block('✍️ أسئلة تدريب', st.practice, function(x){ var r = el('details', 'sy-li'); r.appendChild(el('summary', null, x.q)); if(x.hint) r.appendChild(el('small', null, '💡 تلميح: ' + x.hint)); return r; });
      block('🃏 بطاقات (' + st.flashcards.length + ')', st.flashcards, function(x){ var r = el('details', 'sy-li'); r.appendChild(el('summary', null, x.q)); r.appendChild(el('small', null, x.a)); return r; });
      b.appendChild(el('div', 'ocri-note', 'الملخص من توليد Gemini من صفحات الكتاب — راجع الكتاب للتأكد، خصوصاً بالمعادلات. (انحفظ بالمادة، فما بيستهلك حصة مرة ثانية)'));
      var row = el('div', 'ocri-actions');
      if(st.flashcards.length){ var ab = el('button', 'ocri-btn', '➕ أضف البطاقات لمجموعة'); ab.type = 'button'; ab.addEventListener('click', function(){ addFlashcards(c, sec, st); }); row.appendChild(ab); }
      var rb = el('button', 'ocri-btn ghost', '🔄 إعادة توليد'); rb.type = 'button'; rb.addEventListener('click', function(){ closeDlg(); var p = key.indexOf('#') > -1 ? parseInt(key.split('#')[1], 10) : 0; studySection(c, sec, p || undefined, true); });
      var cl = el('button', 'ocri-btn ghost', 'إغلاق'); cl.type = 'button'; cl.addEventListener('click', closeDlg);
      row.appendChild(rb); row.appendChild(cl); b.appendChild(row);
    });
  }
  function addFlashcards(c, sec, st){
    if(!Array.isArray(sp().decks)) W.space.decks = [];
    var name = c.name + ' — ' + sec, deck = W.space.decks.filter(function(x){ return x.name === name; })[0];
    if(!deck){ deck = { id: W.uid ? W.uid() : Date.now().toString(36), name: name, cards: [], course: c.name }; W.space.decks.push(deck); }
    var have = {}; deck.cards.forEach(function(x){ have[x.q] = 1; }); var n = 0;
    st.flashcards.forEach(function(f){ if(have[f.q]) return; deck.cards.push({ id: W.uid ? W.uid() : Date.now().toString(36) + n, q: f.q, a: f.a }); n++; });
    save(); if(W.renderDecks) try{ W.renderDecks(); }catch(e){} toast(n ? '🃏 أضفت ' + n + ' بطاقة لمجموعة «' + name + '»' : 'البطاقات موجودة من قبل', n ? 'success' : 'info', 4000);
  }

  /* ---- قسم «خطة المادة» داخل ورقة المادة ---- */
  function sectionHtml(c){
    var p = c.syllabus, h = '<section class="hub-sec sy-sec" id="hs-plan" data-ctabs="plan"><h4>🧾 خطة المادة' + (c.book ? ' <span class="muted">· 📖 الكتاب مربوط</span>' : '') + '</h4>';
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
          (c.book && t.section ? '<button type="button" class="hub-mini" data-sy="open" data-sec="' + esc(t.section) + '" aria-label="فتح القسم بالكتاب">📖</button>' + (c.book.sections && c.book.sections[t.section] ? '<button type="button" class="hub-mini" data-sy="study" data-sec="' + esc(t.section) + '" aria-label="مذاكرة القسم بـGemini" title="مذاكرة بـGemini">🧠' + (c.study && (c.study[t.section] || c.study[t.section + '#1']) ? '<i class="sy-done">✓</i>' : '') + '</button>' : '') : '') + '</li>';
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
        var stBtn = c.book && t.section && c.book.sections && c.book.sections[t.section] ? ' <button type="button" class="hub-mini" data-sy="study" data-sec="' + esc(t.section) + '" aria-label="مذاكرة القسم بـGemini" title="مذاكرة بـGemini">🧠' + (c.study && (c.study[t.section] || c.study[t.section + '#1']) ? '<i class="sy-done">✓</i>' : '') + '</button>' : '';
        return esc(t.title) + link + stBtn;
      }).join('، ') + '</li>';
    }).join('') + '</ol></details>';
    h += examButtons(c);
    /* الأزرار */
    h += '<div class="hub-actions inline">' +
      (c.book ? '<button type="button" class="btn btn-sm" data-sy="open" data-sec="">📖 فتح الكتاب</button>' : '<button type="button" class="btn btn-sm" data-sy="attach">📖 ربط الكتاب (PDF)</button>') +
      '<button type="button" class="btn btn-sm btn-ghost" data-sy="tasks">➕ مهام القراءة</button></div>' +
      '<details class="sy-more"><summary>⚙️ إدارة الخطة والكتاب</summary><div class="hub-actions inline">' +
      '<button type="button" class="btn btn-sm btn-ghost" data-sy="import">🔄 إعادة استيراد الخطة</button>' +
      (c.book ? '<button type="button" class="btn btn-sm btn-ghost" data-sy="offset">ضبط صفحات الكتاب</button><button type="button" class="btn btn-sm btn-ghost" data-sy="unbook">فصل الكتاب</button>' : '') +
      '<button type="button" class="btn btn-sm btn-ghost" data-sy="del">🗑 حذف الخطة</button></div></details>';
    if(c.book) h += '<div class="muted sy-bk">📘 ' + esc(c.book.name) + ' · ' + c.book.pages + ' صفحة · ' + Object.keys(c.book.sections || {}).length + ' قسم بالفهرس' + (c.book.offset == null ? ' · <span class="warn">الإزاحة غير محدّدة</span>' : ' · إزاحة ' + c.book.offset) + ' · الملف على هالجهاز فقط</div>';
    return h + '</section>';
  }
  function weekBrief(c){
    var p = c && c.syllabus, start = sp().semesterStart; if(!p || !start || !p.weeks.length) return null;
    var wk = weekNumber(start), last = p.weeks[p.weeks.length - 1].to; if(!wk || wk < 1 || wk > last) return null;
    var e = weekEntry(p, wk); if(!e) return null;
    var secs = []; e.topics.forEach(function(t){ if(t.section && secs.indexOf(t.section) < 0) secs.push(t.section); });
    return { wk: wk, last: last, first: e.topics[0].title, more: e.topics.length - 1, secs: secs.join('، ') };
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
        else if(a === 'study') studySection(cur, b.getAttribute('data-sec'));
        else if(a === 'review') addReviewTasks(cur, b.getAttribute('data-eid'));
        else if(a === 'setstart'){ var i = rootEl.querySelector('.sy-start'); if(i && /^\d{4}-\d{2}-\d{2}$/.test(i.value)){ W.space.semesterStart = i.value; save(); refresh(); } else toast('اختر تاريخ بداية الفصل', 'warn'); }
        else if(a === 'del'){ if(W.customConfirm) W.customConfirm('حذف خطة المادة من «' + cur.name + '»؟ (الكتاب والمهام ما بينحذفوا)', function(){ delete cur.syllabus; save(); refresh(); }); else { delete cur.syllabus; save(); refresh(); } }
        else if(a === 'unbook'){ bookDel(cur.id).catch(function(){}); delete cur.book; save(); toast('فصلت الكتاب عن المادة', 'info'); refresh(); }
        else if(a === 'offset') askOffset(cur, false);
      });
    });
  }

  return Object.assign(pure, { examButtons: examButtons, addReviewTasks: addReviewTasks, studySection: studySection, showStudy: showStudy, addFlashcards: addFlashcards, upcomingExams: upcomingExams, weekBrief: weekBrief, sectionHtml: sectionHtml, bindSection: bindSection, startImport: startImport, importPlan: importPlan, attachBook: attachBook, openBook: openBook, askOffset: askOffset, addReadingTasks: addReadingTasks, loadPdfJs: loadPdfJs, _preview: preview, _setRefresh: function(f){ refresh = f; } });
});
