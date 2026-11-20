/* ============================================================
   exam-import.js — استيراد جدول الامتحانات ونتائجها من صورة (Gemini عبر OcrImport.ask)
   - يقرأ: جدول امتحانات (مادة/نوع/تاريخ/وقت/مدة/قاعة) و/أو نتائج (مادة/رقم/نوع/علامة/من)
   - يصنّف: نوع الامتحان (مستوى/أول/ثاني/نصفي/نهائي/قصير) وحالته (جاي/خلص) حسب التاريخ
   - يضيف: الامتحانات لـspace.exams (بدون تكرار) والعلامات لـspace.grades (بند لكل امتحان)
   الدوال النقية (parse/match/plan) مكشوفة للاختبار.
   ============================================================ */
(function(){
  'use strict';
  var W = window;

  var PROMPT = 'هذه صورة من بوابة طالب جامعي. قد تكون «جدول امتحانات» أو «نتائج امتحانات» أو الاثنين. ' +
    'استخرج كل صف كما هو بدون تخمين. التاريخ بصيغة YYYY-MM-DD (حوّل 30/09/2026 إلى 2026-09-30). الوقت HH:MM بنظام 24 ساعة. ' +
    'المدة بالدقائق. القاعة: اسم المبنى في building ورقم القاعة في room. ' +
    'type نص نوع الامتحان كما مكتوب (مثل: امتحان مستوى، الامتحان الاول، امتحان mid، نهائي). ' +
    'في النتائج: score العلامة التي حصل عليها الطالب و max العلامة العظمى، code رقم المادة كما هو، section رقم الشعبة. ' +
    'ضع صفوف الجدول في exams وصفوف النتائج في results، واترك المصفوفة فارغة إذا لا يوجد.';
  var S = function(n){ return { type: 'STRING', nullable: !!n }; }, N = { type: 'NUMBER', nullable: true };
  var SCHEMA = { type: 'OBJECT', properties: {
    exams: { type: 'ARRAY', items: { type: 'OBJECT', properties: { course: S(), code: S(1), type: S(1), date: S(1), time: S(1), duration: N, room: S(1), building: S(1) }, required: ['course'] } },
    results: { type: 'ARRAY', items: { type: 'OBJECT', properties: { course: S(), code: S(1), section: S(1), type: S(1), score: N, max: N }, required: ['course'] } }
  }, required: ['exams', 'results'] };

  /* ---------- أدوات نقية ---------- */
  function digits(v){ return String(v == null ? '' : v).replace(/[٠-٩]/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }); }
  function norm(s){
    return digits(s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/^ال/, '').replace(/\s+ال/g, ' ').replace(/[()\[\]،,.\-–_/]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function codeKey(c){ var x = digits(c).replace(/\D/g, '').replace(/^0+/, ''); return x.length >= 5 ? x : ''; }
  var TYPES = [
    ['level', /مستوى|مستوي|placement|level/i, 'امتحان مستوى'],
    ['quiz', /قصير|كويز|quiz/i, 'امتحان قصير'],
    ['final', /نهائي|نهائى|فاينل|final/i, 'الامتحان النهائي'],
    ['mid', /mid|منتصف|نصفي|نصف/i, 'الامتحان النصفي'],
    ['second', /ثاني|الثان|second|2nd/i, 'الامتحان الثاني'],
    ['first', /اول|أول|الاول|first|1st/i, 'الامتحان الأول']
  ];
  function examType(t){ t = String(t || ''); for(var i = 0; i < TYPES.length; i++) if(TYPES[i][1].test(t)) return TYPES[i][0]; return 'other'; }
  function typeLabel(k, raw){ for(var i = 0; i < TYPES.length; i++) if(TYPES[i][0] === k) return TYPES[i][2]; return String(raw || 'امتحان').trim() || 'امتحان'; }
  function normDate(v){
    var s = digits(v).trim(), m;
    if((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    if((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s))) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    return '';
  }
  function normTime(v){ var m = /^(\d{1,2})[:.](\d{2})/.exec(digits(v).trim()); return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : ''; }
  function num(v){ var x = parseFloat(digits(v).replace(',', '.')); return isFinite(x) ? x : null; }
  function ymd(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* مطابقة مادة الصورة بمادة من موادي: بالرقم أول، بعدين بالاسم */
  function matchCourse(name, code, courses){
    courses = (courses || []).filter(function(c){ return c && c.name; });
    var k = codeKey(code);
    if(k){ var byC = courses.filter(function(c){ return codeKey(c.code) === k; })[0]; if(byC) return byC; }
    var n = norm(name); if(!n) return null;
    var eq = courses.filter(function(c){ return norm(c.name) === n; })[0]; if(eq) return eq;
    var inc = courses.filter(function(c){ var x = norm(c.name); return x.length > 3 && (x.indexOf(n) > -1 || n.indexOf(x) > -1); });
    return inc.length === 1 ? inc[0] : null;
  }

  /* ردود Gemini (لكل صورة رد) ← قائمة موحّدة بدون تكرار */
  function parse(replies){
    var ex = [], rs = [], seenE = {}, seenR = {};
    (replies || []).forEach(function(r){
      ((r && r.exams) || []).forEach(function(e){
        var course = String(e.course || '').trim(); if(!course) return;
        var k = examType(e.type), date = normDate(e.date), key = norm(course) + '|' + date + '|' + k; if(seenE[key]) return; seenE[key] = 1;
        ex.push({ course: course, code: e.code || '', type: k, typeRaw: e.type || '', date: date, time: normTime(e.time), duration: num(e.duration), room: String(e.room || '').trim(), building: String(e.building || '').trim() });
      });
      ((r && r.results) || []).forEach(function(x){
        var course = String(x.course || '').trim(), sc = num(x.score), mx = num(x.max); if(!course || sc === null) return;
        var k = examType(x.type), key = norm(course) + '|' + k; if(seenR[key]) return; seenR[key] = 1;
        rs.push({ course: course, code: x.code || '', section: x.section || '', type: k, typeRaw: x.type || '', score: sc, max: mx && mx > 0 ? mx : null });
      });
    });
    return { exams: ex, results: rs };
  }

  /* خطة التطبيق: شو رح ينضاف/يتحدّث (بدون كتابة) */
  function plan(parsed, sp, today){
    sp = sp || {}; today = today || ymd(new Date());
    var courses = sp.courses || [], exams = sp.exams || [], out = { exams: [], results: [] };
    parsed.exams.forEach(function(e){
      var c = e.type === 'level' ? null : matchCourse(e.course, e.code, courses), cname = c ? c.name : e.course;
      var cur = exams.filter(function(x){ return x && norm(x.course || x.name) === norm(cname) && x.date === e.date; })[0]
        || exams.filter(function(x){ return x && x.kind === e.type && e.type !== 'other' && norm(x.course) === norm(cname); })[0];
      out.exams.push({ src: e, course: cname, matched: !!c, existing: cur ? cur.id : null, name: e.type === 'level' && /مستو/.test(cname) ? cname : typeLabel(e.type, e.typeRaw) + ' – ' + cname,
        done: !!e.date && e.date < today, room: [e.building, e.room].filter(Boolean).join(' '), on: true });
    });
    parsed.results.forEach(function(r){
      var c = matchCourse(r.course, r.code, courses);
      out.results.push({ src: r, course: c ? c.name : r.course, matched: !!c, label: typeLabel(r.type, r.typeRaw), on: !!c && r.max !== null });
    });
    return out;
  }

  /* التطبيق على space (يكتب) — يرجّع عدّاد */
  function apply(p, sp){
    var n = { added: 0, updated: 0, grades: 0 };
    if(!Array.isArray(sp.exams)) sp.exams = [];
    if(!Array.isArray(sp.grades)) sp.grades = [];
    p.exams.forEach(function(x){
      if(!x.on) return; var e = x.src;
      var cur = x.existing ? sp.exams.filter(function(y){ return y.id === x.existing; })[0] : null;
      var f = { name: x.name, course: x.course, date: e.date, time: e.time, room: x.room, kind: e.type };
      if(e.duration) f.duration = e.duration;
      if(cur){ Object.keys(f).forEach(function(k){ if(f[k] !== '' && f[k] != null) cur[k] = f[k]; }); n.updated++; }
      else { f.id = (W.uid ? W.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2, 6)); sp.exams.push(f); n.added++; }
    });
    p.results.forEach(function(x){
      if(!x.on || !x.matched || x.src.max === null) return;
      var g = sp.grades.filter(function(y){ return y && y.name === x.course; })[0];
      if(!g){ g = { name: x.course, items: [] }; sp.grades.push(g); }
      if(!Array.isArray(g.items)) g.items = [];
      var it = g.items.filter(function(y){ return y && (y.kind === x.src.type && x.src.type !== 'other' || norm(y.name) === norm(x.label)); })[0];
      if(it){ it.score = x.src.score; it.weight = x.src.max; it.kind = x.src.type; }
      else g.items.push({ name: x.label, score: x.src.score, weight: x.src.max, kind: x.src.type });
      /* نعلّم الامتحان المطابق بنتيجته */
      sp.exams.forEach(function(e){ if(e && norm(e.course) === norm(x.course) && (e.kind === x.src.type)){ e.score = x.src.score; e.max = x.src.max; } });
      n.grades++;
    });
    return n;
  }

  /* ---------- الواجهة: نافذة مراجعة قبل الحفظ ---------- */
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function review(p){
    var old = document.querySelector('.exi-backdrop'); if(old) old.remove();
    var bd = document.createElement('div'); bd.className = 'modal-backdrop show exi-backdrop';
    function row(x, i, kind){
      var e = x.src, meta, tag;
      if(kind === 'e'){
        meta = [e.date ? e.date.split('-').reverse().join('/') : 'بلا تاريخ', e.time, e.duration ? e.duration + ' د' : '', x.room].filter(Boolean).join(' · ');
        tag = (x.done ? '<em class="exi-t done">خلص</em>' : '<em class="exi-t up">جاي</em>') + (x.existing ? '<em class="exi-t">تحديث</em>' : '');
      } else {
        meta = x.label + (x.src.section ? ' · شعبة ' + esc(x.src.section) : '');
        tag = '<em class="exi-t score">' + e.score + (e.max ? ' / ' + e.max : '') + '</em>' + (x.matched ? '' : '<em class="exi-t warn">مش من موادك</em>');
      }
      return '<label class="exi-row' + (x.matched || kind === 'e' ? '' : ' off') + '"><input type="checkbox" data-k="' + kind + i + '"' + (x.on ? ' checked' : '') + (kind === 'r' && (!x.matched || e.max === null) ? ' disabled' : '') + '>' +
        '<span class="exi-tb"><b>' + esc(kind === 'e' ? x.name : x.course) + '</b><small>' + esc(meta) + '</small></span>' + tag + '</label>';
    }
    var up = p.exams.map(function(x, i){ return x.done ? '' : row(x, i, 'e'); }).join(''), dn = p.exams.map(function(x, i){ return x.done ? row(x, i, 'e') : ''; }).join('');
    var rs = p.results.map(function(x, i){ return row(x, i, 'r'); }).join('');
    bd.innerHTML = '<div class="modal exi-modal" role="dialog" aria-modal="true" aria-label="نتيجة القراءة"><h3>📷 قرأت من الصورة</h3>' +
      (up ? '<h4>امتحانات جاية</h4>' + up : '') + (dn ? '<h4>امتحانات خلصت</h4>' + dn : '') + (rs ? '<h4>علامات</h4>' + rs : '') +
      (!up && !dn && !rs ? '<p>ما لقيت امتحانات ولا علامات بالصورة. جرّب لقطة شاشة أوضح للجدول نفسه.</p>' : '') +
      '<p class="exi-note">راجعها وشيل الصح عن أي صف غلط. العلامات بتنضاف لعلامات المادة وبتحسب معدلك المتوقع.</p>' +
      '<div class="modal-actions"><button class="btn btn-sm btn-ghost" type="button" data-x>إلغاء</button><button class="btn btn-sm" type="button" data-ok' + (!up && !dn && !rs ? ' disabled' : '') + '>حفظ</button></div></div>';
    document.body.appendChild(bd);
    function close(){ bd.remove(); }
    bd.addEventListener('click', function(ev){ if(ev.target === bd || ev.target.closest('[data-x]')) close(); });
    bd.querySelector('[data-ok]').addEventListener('click', function(){
      bd.querySelectorAll('input[data-k]').forEach(function(c){ var k = c.getAttribute('data-k'), i = +k.slice(1); (k[0] === 'e' ? p.exams : p.results)[i].on = c.checked; });
      var n = apply(p, W.space);
      if(W.saveSpace) W.saveSpace();
      if(W.FocusUI && W.FocusUI.render) W.FocusUI.render(false);
      close();
      var msg = []; if(n.added) msg.push('انضاف ' + n.added + ' امتحان'); if(n.updated) msg.push('تحدّث ' + n.updated); if(n.grades) msg.push(n.grades + ' علامة');
      if(W.toast) W.toast('✅ ' + (msg.join(' · ') || 'ما تغيّر إشي'), 'success', 3500);
    });
  }

  function start(camera){
    if(!W.OcrImport || !W.OcrImport.ask){ if(W.toast) W.toast('الاستيراد من صورة مش محمّل', 'warn'); return; }
    W.OcrImport.ask(PROMPT, SCHEMA, function(replies){ review(plan(parse(replies), W.space)); }, camera);
  }

  W.ExamImport = { start: start, parse: parse, plan: plan, apply: apply, review: review, matchCourse: matchCourse, examType: examType, typeLabel: typeLabel, norm: norm, normDate: normDate, PROMPT: PROMPT, SCHEMA: SCHEMA };
})();
