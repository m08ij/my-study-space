/* ============================================================
   🤖 ai.js — المساعد الذكي (محرك محلي بدون أي خدمة خارجية)
   - يفهم العامية: تطبيع الحروف + أسماء المواد التقريبية + التواريخ (بكرة/الأحد/بعد 3 أيام) + الوقت + المبالغ
   - يجاوب من بياناتك (جدول/مهام/امتحانات/حضور/علامات/بطاقات/ميزانية) ويصرّح لما البيانات ناقصة
   - ينفّذ الإضافات (مهمة/امتحان/مصروف/إنجاز مهمة) فقط بعد زر تأكيد منك، وبتراجع ممكن
   - ذاكرة محادثة قصيرة: «وبكرة؟» «وفيزياء؟» «كمان» تكمل على آخر سؤال
   - لا يرسل شيئاً لأي مكان؛ ما عنده معرفة خارج التطبيق وقاعدة المعرفة الصغيرة المدمجة
   ============================================================ */
(function(){
  'use strict';
  if(window._aiLoaded) return;
  window._aiLoaded = true;

  /* ---------------------------------------------------------- أدوات عامة */
  var DAYS_AR = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  var DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function esc(s){
    return window.esc ? window.esc(s) : String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function sp(){ return window.space || {}; }
  function pad(n){ return n < 10 ? '0' + n : '' + n; }
  function fmt(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr(){ return window.today ? window.today() : fmt(new Date()); }
  function toDate(s){ var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDays(s, n){ var d = toDate(s); d.setDate(d.getDate() + n); return fmt(d); }
  function diff(s){ var a = toDate(s), b = toDate(todayStr()); return a && b ? Math.round((a - b) / 864e5) : null; }
  function dayName(s){ var d = toDate(s); return d ? DAYS_AR[d.getDay()] : ''; }
  function shortDate(s){ var d = toDate(s); return d ? DAYS_AR[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) : ''; }
  function whenWord(n){
    if(n === null) return '';
    return n < -1 ? 'متأخر ' + daysWord(-n) : n === -1 ? 'أمس' : n === 0 ? 'اليوم' : n === 1 ? 'بكرة' : n === 2 ? 'بعد بكرة' : 'بعد ' + daysWord(n);
  }
  function daysWord(k){ return k === 1 ? 'يوم' : k === 2 ? 'يومين' : k <= 10 ? k + ' أيام' : k + ' يوم'; }
  function money(n){ return (window.fmtJD ? window.fmtJD(n) : String(Math.round(n * 100) / 100)) + ' د'; }
  function uid(){ return window.uid ? window.uid() : 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function nowHM(){ var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }

  /* تطبيع النص العربي: يشيل التشكيل والتطويل، ويوحّد الألف والياء والتاء المربوطة، والأرقام الهندية */
  function norm(s){
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, function(d){ return String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)); })
      .replace(/[؟?!،,;؛"“”«»\[\]{}()]/g, ' ')
      .replace(/[.:]+(?=\s|$)/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  /* regex لكلمات (بعد التطبيع) مع سوابق عربية شائعة: و/ف/ب/ل/ك/لل/ال — مطابقة بداية الكلمة فقط */
  var CL = '(?:[وفبلك]|لل){0,2}(?:ال)?';
  /* بعد الكلمة يُسمح بلاحقة قصيرة فقط (ي/ات/ين…): الكلمات القصيرة ≤2 حروف، والطويلة ≤4 — حتى لا تطابق «باي» كلمة «بايثون» */
  function rx(words){
    return new RegExp('(?:^|\\s)' + CL + '(?:' + words.map(function(w){
      var s = norm(w);
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\S{0,' + (s.length >= 5 ? 4 : 2) + '}(?:\\s|$))';
    }).join('|') + ')');
  }
  function lev1(a, b){
    if(a === b) return true;
    if(Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, e = 0;
    while(i < a.length && j < b.length){
      if(a[i] === b[j]){ i++; j++; continue; }
      if(++e > 1) return false;
      if(a.length > b.length) i++; else if(a.length < b.length) j++; else { i++; j++; }
    }
    return e + (a.length - i) + (b.length - j) <= 1;
  }
  function stripTok(t){ return t.replace(/^(?:[وفبلك]|لل)?(?:ال)?/, ''); }

  /* ---------------------------------------------------------- كيانات: تاريخ/وقت/مبلغ/مادة */
  var WD = { 'احد': 0, 'اثنين': 1, 'اتنين': 1, 'ثلاثاء': 2, 'تلات': 2, 'اربعاء': 3, 'خميس': 4, 'جمعه': 5, 'سبت': 6 };
  function pickDate(n, allowToday){
    var t = todayStr(), m;
    if((m = /(?:^|\s)[وف]?بعد (?:بكره|بكرا|بكر|غدا|غد|باكر)(?=\s|$)/.exec(n))) return { date: addDays(t, 2), frag: m[0] };
    if((m = /(?:^|\s)(?:بكره|بكرا|بكر|غدا|غد|باكر)(?=\s|$)/.exec(n))) return { date: addDays(t, 1), frag: m[0] };
    if((m = /(?:^|\s)(?:امس|مبارح|البارحه|مبارحه)(?=\s|$)/.exec(n))) return { date: addDays(t, -1), frag: m[0] };
    if((m = /(?:^|\s)(?:اليوم|الليله|النهارده|هاليوم)(?=\s|$)/.exec(n))) return { date: t, frag: m[0] };
    if((m = /(?:^|\s)[وف]?بعد (?:(\d{1,3}) )?(يوم|يومين|ايام|اسبوع|اسبوعين|اسابيع|شهر|شهرين|شهور)(?=\s|$)/.exec(n))){
      var u = m[2], k = m[1] ? +m[1] : /ين$/.test(u) ? 2 : 1;
      return { date: addDays(t, /^(?:اسبوع|اسبوعين|اسابيع)$/.test(u) ? k * 7 : /^(?:شهر|شهرين|شهور)$/.test(u) ? k * 30 : k), frag: m[0] };
    }
    if((m = /(?:^|\s)(\d{4})-(\d{1,2})-(\d{1,2})(?=\s|$)/.exec(n))) return { date: m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]), frag: m[0] };
    if((m = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s|$)/.exec(n))){
      var dd = +m[1], mm = +m[2], yy = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : new Date().getFullYear();
      if(dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
      var cand = yy + '-' + pad(mm) + '-' + pad(dd);
      if(!m[3] && diff(cand) < -30) cand = (yy + 1) + '-' + pad(mm) + '-' + pad(dd);
      return { date: cand, frag: m[0] };
    }
    if((m = /(?:^|\s)(?:يوم )?(?:[بل]|لل)?(?:ال)?(احد|اثنين|اتنين|ثلاثاء|تلات|اربعاء|خميس|جمعه|سبت)(?=\s|$)/.exec(n))){
      var cur = toDate(t).getDay(), delta = (WD[m[1]] - cur + 7) % 7;
      if(delta === 0 && !allowToday) delta = 7;
      return { date: addDays(t, delta), frag: m[0] };
    }
    return null;
  }
  function pickTime(n){
    var m = /(?:^|\s)(?:الساعه|ساعه)\s*(\d{1,2})(?::(\d{2}))?\s*(صباحا|صباح|الصبح|ص|مساء|مسا|م|عصرا|العصر|ظهرا|الظهر|ليلا|بالليل)?(?=\s|$)/.exec(n) ||
            /(?:^|\s)(\d{1,2}):(\d{2})\s*(صباحا|صباح|الصبح|ص|مساء|مسا|م|عصرا|العصر|ظهرا|الظهر|ليلا|بالليل)?(?=\s|$)/.exec(n);
    if(!m) return null;
    var h = +m[1], mi = m[2] ? +m[2] : 0, tag = m[3] || '';
    if(h > 23 || mi > 59) return null;
    if(/^(?:مساء|مسا|م|عصرا|العصر|ليلا|بالليل)$/.test(tag)){ if(h < 12) h += 12; }
    else if(/^(?:ظهرا|الظهر)$/.test(tag)){ if(h < 7) h += 12; }
    else if(!tag && h >= 1 && h <= 6) h += 12;     /* بدون تحديد: 1–6 غالباً بعد الظهر بأوقات الجامعة */
    return { time: pad(h) + ':' + pad(mi), frag: m[0] };
  }
  var GENERIC = { 'مقدمه': 1, 'مبادي': 1, 'اساسيات': 1, 'في': 1, 'الي': 1, 'علي': 1, 'من': 1, 'مختبر': 0, 'نظريه': 1, 'عمليه': 1 };
  function courseWords(name){
    var w = norm(name).split(' ').map(stripTok).filter(function(x){ return x.length >= 3 || /^\d+$/.test(x); });
    var f = w.filter(function(x){ return !GENERIC[x]; });
    return f.length ? f : w;
  }
  function findCourse(n){
    var cs = sp().courses || [], toks = n.split(' ').map(stripTok).filter(Boolean), best = null, bestScore = 0, second = 0;
    cs.forEach(function(c){
      if(!c.name) return;
      var nc = norm(c.name), score = 0;
      if(nc && (' ' + n + ' ').indexOf(' ' + nc + ' ') > -1) score = 50 + nc.length;
      if(c.code && n.indexOf(String(c.code).toLowerCase()) > -1) score = Math.max(score, 60);
      if(!score){
        var cw = courseWords(c.name), hit = 0;
        cw.forEach(function(w){
          if(toks.some(function(t){ return t === w || (t.length >= 4 && w.indexOf(t) === 0) || (w.length >= 4 && t.indexOf(w) === 0) || (t.length >= 5 && w.length >= 5 && lev1(t, w)); })) hit++;
        });
        if(hit) score = hit * 10 + (hit === cw.length ? 5 : 0);
      }
      if(score > bestScore){ second = bestScore; bestScore = score; best = c; } else if(score > second){ second = score; }
    });
    return best ? { c: best, amb: second === bestScore && second > 0 && bestScore < 50 } : null;
  }

  /* ---------------------------------------------------------- حاسبة آمنة (بدون eval) */
  function calc(src){
    var s = String(src).replace(/[٠-٩]/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/×/g, '*').replace(/÷/g, '/').replace(/٫/g, '.').replace(/,/g, '').replace(/(\d)\s*[xX]\s*(\d)/g, '$1*$2').replace(/\s+/g, '');
    if(!s || s.length > 80 || /[^0-9+\-*/^%().sqrt]/.test(s)) return null;
    var i = 0, bad = false;
    function peek(){ return s.charAt(i); }
    function num(){
      var m = /^\d+(?:\.\d+)?/.exec(s.slice(i)); if(!m){ bad = true; return 0; } i += m[0].length; return parseFloat(m[0]);
    }
    function primary(){
      if(s.slice(i, i + 4) === 'sqrt'){ i += 4; var r = primary(); if(r < 0) bad = true; return Math.sqrt(r); }
      if(peek() === '('){ i++; var v = expr(); if(peek() === ')') i++; else bad = true; return v; }
      return num();
    }
    function unary(){ if(peek() === '-'){ i++; return -unary(); } if(peek() === '+'){ i++; return unary(); } return primary(); }
    function power(){ var b = unary(); if(peek() === '^'){ i++; var e = power(); if(Math.abs(e) > 1000) bad = true; return Math.pow(b, e); } return b; }
    function term(){
      var v = power();
      while(peek() === '*' || peek() === '/' || peek() === '%'){
        var o = s.charAt(i++), r = power();
        if(o === '*') v *= r; else if(o === '/'){ if(r === 0){ bad = true; return 0; } v /= r; } else { if(r === 0){ bad = true; return 0; } v %= r; }
      }
      return v;
    }
    function expr(){ var v = term(); while(peek() === '+' || peek() === '-'){ var o = s.charAt(i++), r = term(); v = o === '+' ? v + r : v - r; } return v; }
    var out = expr();
    if(bad || i !== s.length || !isFinite(out)) return null;
    return Math.round(out * 1e6) / 1e6;
  }

  /* ---------------------------------------------------------- قاعدة معرفة صغيرة (هندسة حاسوب + أسلوب الدراسة) */
  var KB = [
    { k: ['big o', 'big-o', 'bigo', 'التعقيد الزمني', 'تعقيد الخوارزم', 'o(n)'], t: '**Big-O** تصف كيف بيزيد زمن (أو ذاكرة) الخوارزمية كل ما كبر حجم المدخلات n، وبتهمل الثوابت.\n• O(1) ثابت · O(log n) مثل البحث الثنائي · O(n) مرور واحد · O(n log n) ترتيب كفؤ (Merge/Heap) · O(n²) حلقتين متداخلتين · O(2ⁿ) أسّي.\nعادةً بتعبّر عن الحالة الأسوأ.' },
    { k: ['recursion', 'recursive', 'الاستدعاء الذاتي', 'الدوال التكراريه', 'دالة ذاتية'], t: '**الاستدعاء الذاتي (Recursion):** دالة بتستدعي نفسها لحل نسخة أصغر من المشكلة. لازم فيها (1) **حالة أساس** توقف الاستدعاء (2) خطوة بتقرّبك منها. بدونها بتصير Stack Overflow. مثال: factorial(n) = n × factorial(n−1)، وfactorial(0) = 1.' },
    { k: ['stack', 'queue', 'ستاك', 'المكدس', 'الطابور'], t: '**Stack** (مكدس) = آخر داخل أول خارج LIFO: push/pop (مثل Undo واستدعاء الدوال).\n**Queue** (طابور) = أول داخل أول خارج FIFO: enqueue/dequeue (مثل طابور الطباعة وBFS).' },
    { k: ['linked list', 'القائمه المرتبطه', 'لينكد ليست'], t: '**Linked List:** عقد (nodes) كل وحدة فيها قيمة + مؤشر للتالية. الإدراج/الحذف بالبداية O(1) بس الوصول لعنصر رقم i هو O(n). **Array:** وصول مباشر O(1) بس الإدراج بالنص O(n) لأنه بنزحزح العناصر.' },
    { k: ['pointer', 'pointers', 'المؤشر', 'مؤشرات', 'المؤشرات'], t: '**المؤشر (Pointer)** متغير بيخزّن **عنوان** مكان بالذاكرة مش القيمة نفسها. في C: `int *p = &x;` يعني p بيشير لـ x، و`*p` بيعطيك قيمة x. أخطاء شائعة: مؤشر غير مهيّأ، أو Dangling بعد free.' },
    { k: ['oop', 'البرمجه كائنيه', 'البرمجه الكائنيه', 'encapsulation', 'inheritance', 'polymorphism', 'التغليف', 'الوراثه', 'تعدد الاشكال'], t: '**أعمدة OOP الأربعة:**\n• **Encapsulation:** تخبّي البيانات وتتحكم بالوصول إليها\n• **Inheritance:** صف يرث من صف ثاني\n• **Polymorphism:** نفس الاستدعاء بسلوك مختلف حسب النوع\n• **Abstraction:** تعرض الضروري وتخبّي التفاصيل.' },
    { k: ['sorting', 'bubble sort', 'merge sort', 'quick sort', 'خوارزميات الترتيب', 'الترتيب بالدمج', 'الترتيب السريع'], t: '**خوارزميات الترتيب:** Bubble/Insertion/Selection ≈ O(n²). **Merge Sort** دايماً O(n log n) بس بتحتاج ذاكرة إضافية. **Quick Sort** متوسطها O(n log n) وأسوأ حالة O(n²) (اختيار pivot سيء). **Heap Sort** O(n log n) بدون ذاكرة إضافية تُذكر.' },
    { k: ['binary search', 'البحث الثنائي'], t: '**البحث الثنائي:** على مصفوفة **مرتبة**، قارن بالعنصر الأوسط وارمِ نصف المساحة كل مرة → O(log n). الخطأ الشائع: حساب mid = (lo+hi)/2 قد يعمل overflow؛ الأحسن lo + (hi−lo)/2.' },
    { k: ['hash table', 'hashing', 'hash map', 'جدول التجزءه', 'التجزءه', 'هاش'], t: '**Hash Table:** بتحوّل المفتاح لرقم (hash) يحدد مكانه بالمصفوفة → بحث/إدراج بمتوسط O(1). لما مفتاحين يوقعوا بنفس المكان = **Collision**، وبنحلها بـ Chaining (قائمة بكل خانة) أو Open Addressing.' },
    { k: ['bst', 'binary search tree', 'شجره البحث', 'الاشجار الثنائيه', 'binary tree'], t: '**BST:** لكل عقدة، اليسار أصغر واليمين أكبر → بحث/إدراج O(h) حيث h الارتفاع (≈ log n لو متوازنة، وO(n) لو صارت مثل قائمة). الأشجار المتوازنة (AVL, Red-Black) بتضمن log n.' },
    { k: ['bfs', 'dfs', 'graph traversal', 'البحث بالعرض', 'البحث بالعمق', 'الرسوم البيانيه'], t: '**BFS** بيستخدم Queue وبيزور المستويات تباعاً (بيعطي أقصر مسار بعدد الأضلاع). **DFS** بيستخدم Stack/Recursion وبينزل لآخر عمق قبل ما يرجع. الاثنين O(V+E).' },
    { k: ['dynamic programming', 'البرمجه الديناميكيه'], t: '**البرمجة الديناميكية:** تحل المشكلة الكبيرة بحل مشاكل جزئية متكررة **مرة وحدة** وتخزّن النتيجة (Memoization من فوق لتحت أو Tabulation من تحت لفوق). مثال: فيبوناتشي ينزل من O(2ⁿ) إلى O(n).' },
    { k: ['thread', 'threads', 'الخيوط', 'process vs', 'العمليه والخيط'], t: '**Process** = برنامج شغّال له ذاكرة مستقلة. **Thread** = مسار تنفيذ داخل العملية بيشارك ذاكرتها مع باقي الخيوط → أخف بالإنشاء والتبديل، بس بيحتاج تزامن (locks) لتجنّب Race Conditions.' },
    { k: ['deadlock', 'الجمود', 'التعطل المتبادل'], t: '**Deadlock** لما عمليتين (أو أكثر) كل وحدة ماسكة مورد وبتنتظر مورد عند الثانية. لازم تتحقق 4 شروط: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait. بتكسر وحد منها (مثلاً ترتيب ثابت لطلب الموارد).' },
    { k: ['paging', 'virtual memory', 'الذاكره الافتراضيه', 'page fault', 'التصفح بالصفحات'], t: '**الذاكرة الافتراضية:** كل عملية بتشوف مساحة عناوين خاصة فيها، ونظام التشغيل بيقسمها **صفحات (Pages)** ويربطها بإطارات بالذاكرة الفيزيائية عبر Page Table. لو الصفحة مش موجودة = **Page Fault** وبتنجلب من القرص.' },
    { k: ['scheduling', 'round robin', 'fcfs', 'sjf', 'جدوله العمليات'], t: '**جدولة المعالج:** FCFS (الأول بالوصول) بسيطة بس ممكن Convoy Effect. **SJF** (الأقصر أولاً) أقل انتظار متوسط. **Round Robin** كل عملية بتاخذ Quantum وبترجع للطابور (عادلة للمهام التفاعلية). **Priority** بالأولوية وقد تسبب Starvation.' },
    { k: ['tcp', 'udp'], t: '**TCP:** اتصال موثوق (handshake ثلاثي، ترقيم، إعادة إرسال، ضبط ازدحام) → للويب والملفات. **UDP:** بدون اتصال ولا ضمان وصول أو ترتيب لكنه أسرع وأخف → للبث المباشر والألعاب وDNS.' },
    { k: ['osi', 'طبقات الشبكه', 'osi model'], t: '**نموذج OSI (7 طبقات من تحت لفوق):** Physical · Data Link · Network (IP) · Transport (TCP/UDP) · Session · Presentation · Application. حيلة حفظ بالإنجليزي: "Please Do Not Throw Sausage Pizza Away".' },
    { k: ['subnet', 'subnetting', 'ip address', 'عنوان ip', 'قناع الشبكه', 'netmask', 'cidr'], t: '**IP/Subnet:** عنوان IPv4 = 32 بت. القناع /24 يعني أول 24 بت للشبكة و8 للأجهزة → 2⁸ − 2 = **254 جهاز** صالح (ناقص عنوان الشبكة وعنوان الـBroadcast). القاعدة: عدد الأجهزة = 2^(32−prefix) − 2.' },
    { k: ['dns'], t: '**DNS** بيحوّل اسم الموقع (example.com) إلى عنوان IP. الجهاز بيسأل الـ Resolver، وهو بيسأل Root ← TLD ← Authoritative لو ما عنده الجواب بالكاش.' },
    { k: ['https', 'tls', 'ssl'], t: '**HTTPS = HTTP + TLS:** بيشفّر الاتصال بين المتصفح والسيرفر ويتحقق من هوية السيرفر بشهادة رقمية، فما حدا بالنص بيقدر يقرأ أو يعدّل البيانات.' },
    { k: ['sql vs nosql', 'nosql', 'قواعد البيانات العلائقيه'], t: '**SQL (علائقية):** جداول بمخطط ثابت، علاقات وJOIN وضمانات ACID. **NoSQL:** مرونة بالمخطط (Document/Key-Value/Graph) وتوسّع أفقي أسهل، وغالباً consistency أضعف. الاختيار حسب شكل بياناتك وحاجتك للعلاقات والمعاملات.' },
    { k: ['normalization', 'التطبيع', 'نورمال فورم', 'normal form'], t: '**Normalization:** تنظيم الجداول لتقليل التكرار وأخطاء التعديل. **1NF:** قيم ذرّية بلا مجموعات متكررة. **2NF:** لا اعتماد جزئي على جزء من المفتاح المركّب. **3NF:** لا اعتماد انتقالي (غير مفتاحي يعتمد على غير مفتاحي).' },
    { k: ['primary key', 'foreign key', 'المفتاح الاساسي', 'المفتاح الاجنبي'], t: '**Primary Key:** عمود (أو أكثر) بيعرّف كل صف بشكل فريد وما بيقبل NULL. **Foreign Key:** عمود بيشير لـ Primary Key بجدول ثاني ويضمن سلامة العلاقة (ما بتقدر تشير لصف مش موجود).' },
    { k: ['acid'], t: '**ACID للمعاملات:** Atomicity (كلها أو ولا شي) · Consistency (تحافظ على قواعد البيانات) · Isolation (المعاملات المتزامنة ما تتداخل) · Durability (بعد الـ commit ما بتضيع).' },
    { k: ['k-map', 'kmap', 'karnaugh', 'خريطه كارنو', 'البوابات المنطقيه', 'تبسيط الدوال'], t: '**خريطة كارنو:** ترتيب جدول الحقيقة بشبكة بترتيب Gray بحيث الخلايا المتجاورة تختلف ببت واحد؛ بتجمّع 1ات بمجموعات بحجم 1/2/4/8… (أكبر مجموعة ممكنة، وبتلف حول الأطراف) وكل مجموعة بتعطي حد مبسّط.' },
    { k: ["two's complement", "2's complement", 'two s complement', '2s complement', 'المتمم الثنائي', 'المتمم الثاني', 'تمثيل الاعداد السالبه'], t: '**المتمم الثنائي (2\'s complement):** لتمثيل −x اقلب كل بتات x وزِد 1. بـ n بت المدى من −2ⁿ⁻¹ إلى 2ⁿ⁻¹−1. ميزته إن الجمع/الطرح بنفس الدارة، وللصفر تمثيل واحد.' },
    { k: ['flip flop', 'flipflop', 'فليب فلوب', 'latch'], t: '**Latch** حساس للمستوى، و**Flip-Flop** حساس لحافة الساعة (صاعدة/هابطة) وبيخزّن بت. أنواعه: D (ينسخ المدخل)، JK (set/reset/toggle)، T (toggle). الـ D أكثر استخداماً بالتسجيلات.' },
    { k: ['pipeline', 'pipelining', 'خط الانابيب'], t: '**Pipelining:** تقسيم تنفيذ التعليمة لمراحل (Fetch, Decode, Execute, Memory, Write-back) بحيث تشتغل عدة تعليمات بنفس الوقت بمراحل مختلفة → رفع الـ Throughput. المشاكل: Hazards (بيانات، تحكم/تفرّع، هيكلية) وبنعالجها بـ Forwarding وStall وBranch Prediction.' },
    { k: ['cache memory', 'cache', 'الكاش', 'ذاكره الكاش'], t: '**الكاش:** ذاكرة صغيرة وسريعة بين المعالج والذاكرة الرئيسية بتستفيد من **Locality** (زمنية ومكانية). Hit = لقيت البيانات، Miss = لازم تنجلب. Average access = Hit time + Miss rate × Miss penalty.' },
    { k: ['interrupt', 'المقاطعه', 'المقاطعات'], t: '**Interrupt (مقاطعة):** إشارة بتوقف تنفيذ المعالج مؤقتاً لينفّذ **ISR** (روتين خدمة المقاطعة) ثم يرجع لمكانه. أنواعها: عتادية (مفتاح/مؤقّت/UART) وبرمجية (Exception/System Call). أحسن من Polling لأنها ما بتضيّع وقت المعالج.' },
    { k: ['kvl', 'kcl', 'kirchhoff', 'كيرشوف', 'قانون اوم', 'ohm'], t: '**قانون أوم:** V = I·R. **KCL:** مجموع التيارات الداخلة لعقدة = مجموع الخارجة. **KVL:** مجموع الجهود حول أي حلقة مغلقة = صفر. بتبني فيهم معادلات التحليل العقدي (Nodal) وحلقي (Mesh).' },
    { k: ['git', 'جيت', 'commit', 'branch', 'merge conflict'], t: '**Git:** `git add` يجهّز التغييرات، `git commit` يحفظ لقطة بسجل المشروع، `git branch`/`switch` للفروع، `git merge` يدمج، `git push/pull` للتزامن مع الريموت. تعارض الدمج = عدّل الملف يدوياً ثم add + commit.' },
    { k: ['rest api', 'restful', 'api'], t: '**REST API:** واجهة بتتعامل مع "موارد" عبر عناوين URL وأفعال HTTP: GET (قراءة)، POST (إنشاء)، PUT/PATCH (تعديل)، DELETE (حذف)، والرد عادةً JSON وبرمز حالة (200 نجاح، 404 غير موجود، 500 خطأ سيرفر). بدون حالة (stateless).' },
    { k: ['تحويل الاعداد', 'binary to decimal', 'hexadecimal', 'ثنائي الي عشري', 'النظام السادس عشر', 'hex'], t: '**تحويل الأعداد:** من ثنائي لعشري = اجمع 2^موضع للبتات اللي قيمتها 1 (1011₂ = 8+2+1 = 11). من عشري لثنائي = اقسم على 2 واقرأ البواقي من تحت لفوق. Hex: كل رقم = 4 بتات (A=1010 … F=1111).' },
    { k: ['compiler', 'interpreter', 'المترجم', 'المفسر'], t: '**Compiler** بيترجم البرنامج كله لكود آلة قبل التشغيل (أسرع تنفيذ، C/C++). **Interpreter** بينفّذ سطر سطر (مرونة أكبر، Python). كثير لغات هجينة: Java تترجم لـ bytecode وJVM ينفّذه (مع JIT).' },
    { k: ['alu', 'cpu', 'وحده الحساب والمنطق', 'المعالج المركزي'], t: '**CPU** = وحدة التحكم (Control Unit) + **ALU** (حساب ومنطق) + المسجّلات. دورة التعليمة: Fetch ← Decode ← Execute ← (Memory) ← Write-back، والـ PC مسجّل بيحمل عنوان التعليمة التالية.' }
  ];
  var KBN = KB.map(function(e){ return { t: e.t, k: e.k.map(norm) }; });
  var KB_CUE = rx(['شو', 'ما هو', 'ما هي', 'ماهو', 'ماهي', 'يعني', 'اشرح', 'شرح', 'وضح', 'عرف', 'تعريف', 'فرق', 'الفرق', 'كيف يشتغل', 'كيف تشتغل', 'مثال', 'what', 'explain', 'define', 'difference', 'مفهوم', 'ايش', 'وش', 'معني', 'كيف', 'ليش', 'متي استخدم']);
  function kbFind(n){
    var best = null, bestLen = 0;
    KBN.forEach(function(e){
      e.k.forEach(function(k){
        var hit = /^[a-z0-9 '\-()]+$/.test(k) ? new RegExp('(?:^|[^a-z0-9])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[^a-z0-9]|$)').test(n) : n.indexOf(k) > -1;
        if(hit && k.length > bestLen){ best = e; bestLen = k.length; }
      });
    });
    return best;
  }

  var TECH = [
    { r: rx(['بومودورو', 'pomodoro', 'بومودورو']), t: '**بومودورو:** 25 دقيقة تركيز كامل + 5 راحة، وبعد 4 جلسات راحة طويلة (15–30 د). قبل الجلسة اكتب هدف واحد محدد، ووقت الجلسة سكّر التنبيهات. تقدر تشغّله من تبويب «بومودورو».' },
    { r: rx(['فاينمان', 'feynman']), t: '**تقنية فاينمان:** اشرح الموضوع بكلمات بسيطة كأنك بتعلّمه لحدا ما بيعرف. المكان اللي بتتلخبط فيه = ثغرة بفهمك، ارجع للمصدر وسدّها ثم أعد الشرح.' },
    { r: rx(['استرجاع نشط', 'active recall', 'تسميع', 'اختبر نفسي']), t: '**الاسترجاع النشط:** سكّر الكتاب وحاول تكتب/تقول كل شي بتذكره، بعدين قارن. أقوى بكثير من إعادة القراءة والتظليل. استخدم البطاقات التعليمية وأسئلة السنوات السابقة.' },
    { r: rx(['تكرار متباعد', 'تكرار المتباعد', 'spaced repetition']), t: '**التكرار المتباعد:** راجع المعلومة بفواصل متزايدة (يوم، 3 أيام، أسبوع، أسبوعين…) قبل ما تنساها. بطاقاتك بتطبّق هالمبدأ تلقائياً: بتظهر لك لما يحين موعد مراجعتها.' },
    { r: rx(['تسويف', 'مو قادر ابدا', 'مش قادر ابدا', 'كسل', 'كسلان', 'ما عندي حافز', 'مافي حافز', 'بأجل', 'بسوف']), t: 'التسويف غالباً سببه إن المهمة كبيرة ومبهمة. جرّب: (1) قسّمها لخطوة مدتها 5 دقائق (2) ابدأ بس أول 5 دقائق ووعد نفسك تتوقف بعدها (3) شغّل بومودورو. البداية هي الجزء الأصعب والباقي بيمشي.' },
    { r: rx(['توتر', 'قلق', 'خوف من الامتحان', 'رهبه', 'ضغط نفسي', 'متوتر', 'قلقان']), t: 'توتر الامتحان طبيعي. بيخف لما: (1) تحل أسئلة سنوات سابقة بوقت محدد (2) تنام كفاية ليلة الامتحان (3) نفَس عميق 4 ثواني شهيق و6 زفير قبل ما تبدأ (4) تبدأ بالأسئلة اللي بتعرفها لتاخذ ثقة. وإذا كان القلق شديد ومستمر، كلّم المرشد الأكاديمي أو مركز الإرشاد بالجامعة.' },
    { r: rx(['نوم', 'سهر', 'سهرانه', 'سهران']), t: 'النوم جزء من الدراسة: الدماغ بيثبّت المعلومات أثناء النوم. 7 ساعات أفضل من ساعتين مراجعة زيادة. لو بدك سهر، خليه قبل الامتحان بيومين مش بليلته.' },
    { r: rx(['تركيز', 'اشتت', 'تشتت', 'الجوال بيلهيني', 'ما بركز', 'مش بركز']), t: 'لتحسين التركيز: الجوال بغرفة ثانية أو وضع الطيران، مكان ثابت، جلسات بومودورو 25 د، وهدف واحد لكل جلسة. ممكن تفعّل «وضع اليوم» من الإعدادات ليخفّف الصفحة لأهم شي.' },
    { r: rx(['تلخيص', 'كورنيل', 'cornell', 'اخذ ملاحظات', 'اخذ نوتس', 'تدوين', 'كيف الخص']), t: '**طريقة كورنيل:** قسّم الصفحة: عمود جانبي للكلمات المفتاحية/الأسئلة، منطقة رئيسية للملاحظات أثناء المحاضرة، وأسفلها ملخص من 2–3 جمل بتكتبه بعد المحاضرة بنفس اليوم. وبعدها حوّل الأسئلة لبطاقات.' },
    { r: rx(['دراسه جماعيه', 'دراسة مع اصحابي', 'مجموعه دراسه']), t: 'الدراسة الجماعية مفيدة للشرح المتبادل وحل الأسئلة (2–4 أشخاص)، بشرط: جدول محدد، كل واحد يحضّر قبل، وتخلّوها للأسئلة والنقاش مش لأول مرة بتقرأ فيها.' }
  ];

  var FAQ = [
    { r: rx(['ما بقدر ارفع', 'مش قادر ارفع', 'ما عم يرفع', 'ما رفع', 'فشل الرفع', 'الرفع مش شغال', 'الرفع ما بشتغل', 'الرفع فشل', 'مش راضي يرفع', 'ما بيرفع']), t: '🛠️ **إذا ما بيرفع الملف، افحص:**\n• الحجم: الحد 25 MB للملف (الأكبر بيترفض)\n• الإنترنت: الرفع يحتاج اتصال، والمزامنة لازم تكون شغّالة (⚙️ ← رمز المزامنة)\n• الملف فاضي أو مكرر (نفس الاسم والحجم) — بيسألك قبل رفع نسخة ثانية\n• جرّب الرفع من داخل المادة (موادي ← افتح المادة ← 📎 الملفات) وشوف رسالة الخطأ\nإذا ضل فاشل بعد هالفحص، افتح ⚙️ ← التشخيص وشوف السجل.' },
    { r: rx(['ارفع', 'رفع', 'ارفع ملف', 'تحميل ملف', 'upload']), t: '📤 **رفع الملفات:** تبويب «موادي» ← بطاقة المادة ← «📤 رفع ملف» (تقدر تختار أكثر من ملف أو تسحبها وتفلتها على البطاقة)، أو الزر العلوي «📤 رفع ملفات» وبتختار المادة. الحد 25 MB للملف، ويحتاج إنترنت والمزامنة شغّالة.' },
    { r: rx(['اضيف ماده', 'اضافه ماده', 'ضيف ماده', 'كيف اضيف ماده']), t: '📚 **إضافة مادة:** «موادي» ← «+ مادة» (بتكتب الاسم أو رقمها)، أو «📥 استيراد من الخطة» لتجيب مواد فصلك دفعة وحدة.' },
    { r: rx(['اضيف جدول', 'جدولي الاسبوعي', 'اضافه جدول', 'كيف احط الجدول', 'ادخل الجدول']), t: '📅 **الجدول:** تبويب «الجدول الأسبوعي» ← «➕ إضافة جدول» وبتختار المادة والأيام والوقت. وزر «توليد من موادي» بيعبّي المواد اللي لسه مش بالجدول.' },
    { r: rx(['رمز المزامنه', 'sync code', 'مزامنه', 'نسخه احتياطيه', 'backup', 'انقل بياناتي']), t: '☁️ **المزامنة والنسخ:** ⚙️ الإعدادات ← «رمز المزامنة» (احتفظ فيه لتفتح بياناتك من جهاز ثاني). وفي نفس القائمة «استرجاع النسخة السابقة» لو تغيّرت بياناتك بالغلط.' },
    { r: rx(['اختصارات', 'shortcuts', 'لوحه الاوامر', 'command palette']), t: '⌨️ **اختصارات:** `Alt+K` لوحة الأوامر والبحث السريع، `Alt+A` لإضافة عنصر للصفحة الحالية، و`؟` لعرض كل الاختصارات.' },
    { r: rx(['ثيم', 'theme', 'الوضع الغامق', 'الوضع المظلم', 'غير الالوان', 'dark mode']), t: '🎨 **المظهر:** ⚙️ الإعدادات ← «المظهر» (9 ثيمات)، وفيها كمان حجم الخط والكثافة.' },
    { r: rx(['اشعارات', 'تنبيهات', 'notifications', 'ذكرني']), t: '🔔 **الإشعارات:** ⚙️ الإعدادات ← «الإشعارات» (بيطلب إذن المتصفح). بتوصلك تنبيهات المهام والامتحانات القريبة. أنا ما بقدر أرسل لك تذكيرات لحالي.' },
    { r: rx(['تثبيت التطبيق', 'نزل التطبيق', 'pwa', 'install']), t: '📲 **التثبيت:** ⚙️ الإعدادات ← «تثبيت التطبيق» (بيظهر لما المتصفح يدعمه)، أو من قائمة المتصفح «إضافة إلى الشاشة الرئيسية».' },
    { r: rx(['بطاقات تعليميه', 'flashcards', 'كيف اراجع البطاقات']), t: '🃏 **البطاقات:** تبويب «بطاقات تعليمية» ← أنشئ مجموعة وأضف بطاقات (أو استورد `سؤال :: جواب`). المراجعة بالمفاتيح: Space لقلب البطاقة و1–4 للتقييم. المراجعة بتتجدول تلقائياً بالتكرار المتباعد.' },
    { r: rx(['وضع اليوم', 'today mode']), t: '🎯 **وضع اليوم:** ⚙️ الإعدادات ← «وضع اليوم» بيخفي كل شي ما إله علاقة باليوم ويخلّي الصفحة على المهم.' },
    { r: rx(['رتب الصفحه الرئيسيه', 'تخصيص الرئيسيه', 'تخصيص لوحه التحكم', 'اخفي قسم']), t: '🧩 **تخصيص الرئيسية:** بلوحة التحكم في زر التخصيص: بتخفي الأقسام وبترتبها بالسحب أو الأسهم.' }
  ];

  var NAV = [
    ['dashboard', ['لوحه التحكم', 'الرئيسيه', 'الصفحه الرئيسيه', 'الداشبورد', 'dashboard'], 'لوحة التحكم'],
    ['timetable', ['الجدول', 'جدول المحاضرات', 'الجدول الاسبوعي'], 'الجدول'],
    ['courses', ['موادي', 'المواد', 'صفحه المواد'], 'موادي'],
    ['tasks', ['المهام', 'مهامي', 'الواجبات'], 'المهام'],
    ['exams', ['الامتحانات', 'امتحاناتي', 'صفحه الامتحانات'], 'الامتحانات'],
    ['attendance', ['الحضور', 'حضوري', 'الغياب'], 'الحضور'],
    ['timer', ['بومودورو', 'المؤقت', 'التركيز', 'timer'], 'بومودورو'],
    ['flashcards', ['البطاقات', 'بطاقات', 'فلاش كارد'], 'البطاقات'],
    ['budget', ['الميزانيه', 'ميزانيتي', 'المصاريف'], 'الميزانية'],
    ['notes', ['الملاحظات', 'ملاحظاتي'], 'الملاحظات'],
    ['gradecalc', ['العلامات', 'علاماتي', 'حاسبه المعدل', 'المعدل'], 'علاماتي'],
    ['plan', ['الخطه', 'الخطه الدراسيه', 'خطتي'], 'الخطة'],
    ['hulinks', ['روابط الجامعه', 'روابط', 'الروابط'], 'روابط الجامعة']
  ].map(function(x){ return { tab: x[0], k: x[1].map(norm), label: x[2] }; });

  var CATS = [
    ['food', ['اكل', 'طعام', 'غداء', 'غذاء', 'عشاء', 'فطور', 'قهوه', 'ساندويش', 'ساندوتش', 'مطعم', 'كافيه', 'شاورما', 'بيتزا', 'عصير', 'شاي', 'كافتيريا', 'فلافل', 'برغر', 'كابتشينو', 'لاتيه', 'نسكافيه', 'كوفي', 'coffee', 'مشروب', 'ماء', 'مياه', 'حلويات', 'كيك', 'خبز', 'بقاله', 'سوبرماركت']],
    ['transport', ['مواصلات', 'باص', 'تكسي', 'اجره', 'بنزين', 'كريم', 'اوبر', 'سرفيس', 'موقف']],
    ['books', ['كتاب', 'كتب', 'قرطاسيه', 'طباعه', 'تصوير اوراق', 'دفتر', 'قلم', 'مذكره']],
    ['internet', ['انترنت', 'باقه', 'رصيد جوال', 'اورانج', 'اورنج', 'زين', 'امنيه', 'شحن']],
    ['health', ['دواء', 'دكتور', 'صيدليه', 'مستشفي', 'علاج', 'طبيب']],
    ['entertainment', ['سينما', 'العاب', 'لعبه', 'نتفلكس', 'رحله', 'خروجه', 'ترفيه', 'بلايستيشن']],
    ['clothing', ['ملابس', 'بنطلون', 'جاكيت', 'حذاء', 'جزمه', 'قميص', 'تيشيرت']],
    ['subscriptions', ['اشتراك', 'سبوتيفاي', 'netflix', 'يوتيوب بريميوم']],
    ['tuition', ['رسوم', 'ساعات معتمده', 'تسجيل مواد']],
    ['housing', ['سكن', 'ايجار', 'اجار']]
  ].map(function(x){ return { v: x[0], k: x[1].map(norm) }; });
  var INCOME_CATS = [['salary', ['راتب']], ['scholarship', ['منحه']], ['family', ['مصروف من', 'اهلي', 'ابوي', 'امي', 'دعم']], ['freelance', ['عمل حر', 'فريلانس', 'مشروع بعته']]].map(function(x){ return { v: x[0], k: x[1].map(norm) }; });
  function catLabel(v){ var c = (window.BUDGET_CATS || []).filter(function(x){ return x.v === v; })[0]; return c ? c.i + ' ' + c.l : v; }

  /* ---------------------------------------------------------- ذاكرة المحادثة والإجراءات */
  var mem = { course: null, last: null, pending: null, page: 0 };
  var actions = [];
  window.aiSetActions = function(a){ actions = Array.isArray(a) ? a : []; };
  window.aiTakeActions = function(){ var a = actions; actions = []; return a; };
  function go(tab, label){ return { label: label, run: function(){ if(window.switchTab) window.switchTab(tab); } }; }
  function say(label, text){ return { label: label, say: text || label.replace(/^[^\s]+\s*/, '') }; }
  function done(text, acts){ return { t: text, a: acts || [] }; }

  /* ---------------------------------------------------------- بيانات مساعدة */
  function openTasks(){ return (sp().tasks || []).filter(function(t){ return !t.done; }); }
  function lecturesOn(date){
    var wd = DAYS_EN[toDate(date).getDay()], out = [], tt = sp().timetable || {};
    Object.keys(tt).forEach(function(k){
      var m = /^([A-Za-z]{3})-(\d{1,2}:\d{2})$/.exec(k); if(!m || m[1] !== wd) return;
      var e = tt[k] || {}; out.push({ start: m[2].length === 4 ? '0' + m[2] : m[2], end: e.end || '', name: e.name || '', room: e.room || '' });
    });
    return out.sort(function(a, b){ return a.start.localeCompare(b.start); });
  }
  function lectureLine(l){ return '• \u2066' + l.start + (l.end ? '–' + l.end : '') + '\u2069 ' + l.name + (l.room ? ' — ' + l.room : ''); }
  function tasksOn(date){ return openTasks().filter(function(t){ return t.due === date; }); }
  function examsOn(date){ return (sp().exams || []).filter(function(e){ return e.date === date; }); }
  function upcomingExams(course){
    return (sp().exams || []).filter(function(e){ var d = diff(e.date); return d !== null && d >= 0 && (!course || e.course === course.name); })
      .sort(function(a, b){ return (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')); });
  }
  function attOf(c){ var a = (sp().attendance || {})[c.name] || {}, p = +a.present || 0, b = +a.absent || 0; return { p: p, a: b, tot: p + b, pct: p + b ? Math.round(p / (p + b) * 100) : null }; }
  function gradeOf(c){ var g = (sp().grades || []).filter(function(x){ return x.name === c.name; })[0]; return g || null; }
  function dueCards(){
    var n = 0, ui = window.CardsUI; if(!ui || !ui.stats) return 0;
    (sp().decks || []).forEach(function(d){ try{ n += ui.stats(d).due; }catch(e){} });
    return n;
  }
  function gradeScale(){
    var G = window.GRADES || {}, out = [];
    Object.keys(G).forEach(function(k){ var m = /\((\d+)\s*-\s*(\d+)\)/.exec(k); if(m) out.push({ label: k.split(' ')[0], min: +m[1], pts: G[k] }); });
    return out.sort(function(a, b){ return b.min - a.min; });
  }
  function studyMinutes(days){
    var log = (window.S && window.S.get('studyLog', {})) || {}, tot = 0, i;
    for(i = 0; i < days; i++) tot += parseInt(log[addDays(todayStr(), -i)], 10) || 0;
    return tot;
  }
  function streak(){
    var log = (window.S && window.S.get('studyLog', {})) || {}, n = 0, i;
    for(i = 0; i < 365; i++){ if((parseInt(log[addDays(todayStr(), -i)], 10) || 0) > 0) n++; else if(i > 0) break; }
    return n;
  }
  function hm(mins){ var h = Math.floor(mins / 60), m = mins % 60; return (h ? h + ' س ' : '') + (m || !h ? m + ' د' : '').trim(); }

  /* ---------------------------------------------------------- تنفيذ الإضافات (بعد التأكيد فقط) */
  function persistAll(){
    if(window.saveSpace) window.saveSpace();
    ['renderTasks', 'renderExams', 'renderBudget', 'renderDashboard'].forEach(function(f){ try{ if(window[f]) window[f](); }catch(e){} });
  }
  function undoable(msg, fn){ if(window.toastUndo) window.toastUndo(msg, fn); else if(window.toast) window.toast(msg, 'success', 2200); }
  function removeById(key, id){
    var a = sp()[key]; if(!Array.isArray(a)) return;
    var i = a.map(function(x){ return x.id; }).indexOf(id); if(i < 0) return;
    a.splice(i, 1); persistAll();
  }
  function confirmCard(text, runOk, okLabel){
    return { t: text, a: [{ label: okLabel || '✅ أكّد', cls: 'ok', once: true, run: function(){ try{ return runOk(); }catch(e){ console.warn('ai action', e); return '⚠️ تعذّر التنفيذ: ' + e.message; } } }, { label: '✖ إلغاء', cls: 'no', once: true, run: function(){ return 'تمام، ألغيت. ما تغيّر شي.'; } }] };
  }
  function addTaskProposal(c){
    var lab = { task: 'مهمة', assignment: 'واجب', quiz: 'كويز', project: 'مشروع' }[c.kind] || 'مهمة';
    return confirmCard('📝 بضيف ' + lab + ':\n**' + c.title + '**' + (c.course ? '\n📚 ' + c.course.name : '') + (c.date ? '\n📅 ' + shortDate(c.date) + ' (' + whenWord(diff(c.date)) + ')' : '\n📅 بدون موعد') + '\nأأكّد؟', function(){
      if(!Array.isArray(sp().tasks)) window.space.tasks = [];
      var mx = 0; sp().tasks.forEach(function(t){ if((t.order || 0) > mx) mx = t.order; });
      var t = { id: uid(), title: c.title, type: c.kind, course: c.course ? c.course.name : '', due: c.date || '', done: false, priority: c.high ? 'high' : 'normal', order: mx + 1 };
      sp().tasks.push(t); persistAll();
      undoable('أُضيفت: ' + c.title, function(){ removeById('tasks', t.id); });
      return '✅ تمت إضافة «' + c.title + '».';
    }, '✅ أضف المهمة');
  }
  function addExamProposal(c){
    return confirmCard('⏳ بضيف امتحان:\n**' + c.name + '**' + (c.course ? ' — ' + c.course.name : '') + '\n📅 ' + shortDate(c.date) + ' (' + whenWord(diff(c.date)) + ')' + (c.time ? '\n🕐 ' + c.time : '') + '\nأأكّد؟', function(){
      if(!Array.isArray(sp().exams)) window.space.exams = [];
      var e = { id: uid(), name: c.name, course: c.course ? c.course.name : '', date: c.date, time: c.time || '', room: '' };
      sp().exams.push(e); persistAll();
      undoable('أُضيف امتحان ' + c.name, function(){ removeById('exams', e.id); });
      return '✅ تمت إضافة الامتحان. أحب أعمللك خطة مراجعة؟';
    }, '✅ أضف الامتحان');
  }
  function addMoneyProposal(c){
    var inc = c.type === 'income';
    return confirmCard((inc ? '📈 بسجّل دخل:' : '📉 بسجّل مصروف:') + '\n**' + money(c.amount) + '** — ' + catLabel(c.cat) + (c.note ? ' (' + c.note + ')' : '') + '\n📅 ' + (diff(c.date) === 0 ? 'اليوم' : shortDate(c.date)) + '\nأأكّد؟', function(){
      if(!Array.isArray(sp().budget)) window.space.budget = [];
      var it = { id: uid(), type: c.type, category: c.cat, amount: c.amount, date: c.date, note: c.note || '' };
      sp().budget.push(it); persistAll();
      undoable('سُجّل ' + (inc ? 'دخل ' : 'مصروف ') + money(c.amount), function(){ removeById('budget', it.id); });
      return '✅ تم تسجيل ' + (inc ? 'الدخل' : 'المصروف') + '.';
    }, '✅ سجّل');
  }

  /* عنوان عنصر جديد: نشيل الأفعال والتواريخ والمادة ونرجّع الكلمات الأصلية بدل المطبّعة */
  var STRIP = ['اضف', 'اضيف', 'ضيف', 'ضيفلي', 'اضفلي', 'سجل', 'سجلي', 'حط', 'حطلي', 'اعمل', 'اعملي', 'زيد', 'انشئ', 'بدي', 'ابي', 'ابغي', 'ممكن', 'لو', 'سمحت', 'من', 'فضلك', 'الي', 'لي', 'يا', 'مساعد', 'عندي', 'عليا', 'علي', 'ماده', 'مادة', 'بمادة', 'لمادة', 'ب', 'ل', 'في', 'على', 'ع', 'يوم', 'الساعه', 'ساعه', 'بعد', 'مهمه', 'مهمة', 'واجب', 'كويز', 'مشروع', 'امتحان', 'اختبار', 'ميد', 'فاينل', 'نهائي', 'نصفي', 'قصير', 'مهم', 'ضروري', 'جدا', 'مره', 'صرفت', 'دفعت', 'اشتريت', 'شريت', 'خسرت', 'استلمت', 'قبضت', 'وصلني', 'اجاني', 'جاني', 'دينار', 'دنانير', 'دينارا', 'jd', 'jod', 'مصروف', 'دخل', 'اليوم', 'امس', 'مبارح'];
  function cleanTitle(raw, n, frags, course){
    var map = {};
    String(raw).split(/\s+/).forEach(function(w){ var k = norm(w); if(k && !map[k]) map[k] = w.replace(/[؟?!،,.;؛"“”]/g, ''); });
    var s = ' ' + n + ' ';
    frags.forEach(function(f){ if(f) s = s.replace(f, ' '); });
    if(course) s = s.replace(norm(course.name), ' ');
    var out = s.split(' ').filter(function(w){ return w && STRIP.indexOf(w) < 0 && STRIP.indexOf(stripTok(w)) < 0 && !/^\d+$/.test(w); }).map(function(w){ return map[w] || w; });
    if(course){ var cw = courseWords(course.name); out = out.filter(function(w){ return cw.indexOf(stripTok(norm(w))) < 0; }); }
    return out.join(' ').trim();
  }
  function whenFrags(n, allowToday){
    var d = pickDate(n, allowToday), t = pickTime(n);
    return { d: d, t: t, frags: [d && d.frag, t && t.frag] };
  }
  function catFor(n, list, dflt){
    var hit = null; list.forEach(function(c){ if(!hit && c.k.some(function(k){ return n.indexOf(k) > -1; })) hit = c.v; });
    return hit || dflt;
  }
  function amountFrom(n, frags){
    var s = ' ' + n + ' '; frags.forEach(function(f){ if(f) s = s.replace(f, ' '); });
    var m = /(\d+(?:\.\d+)?)/.exec(s); if(m) return Math.round(parseFloat(m[1]) * 100) / 100;
    if(/نص دينار|نصف دينار/.test(s)) return 0.5;
    return 0;
  }

  /* ---------------------------------------------------------- المعالجات */
  var R = {
    greet: rx(['سلام', 'مرحبا', 'مرحبتين', 'هلا', 'هاي', 'اهلا', 'صباح', 'مساء الخير', 'هلو', 'hello', 'hi', 'يسلمو', 'السلام']),
    thanks: rx(['شكرا', 'مشكور', 'تسلم', 'يسلمو', 'thanks', 'thank', 'يعطيك العافيه', 'الله يعطيك', 'ممنون']),
    bye: rx(['باي', 'مع السلامه', 'الى اللقاء', 'bye', 'تصبح على خير', 'سلام عليكم ورحمه']),
    how: rx(['كيفك', 'كيف حالك', 'شلونك', 'اخبارك', 'شو اخبارك', 'كيف الحال']),
    who: rx(['من انت', 'مين انت', 'منو انت', 'who are you', 'شو اسمك', 'ايش اسمك', 'انت مين']),
    can: rx(['شو بتعرف', 'شو تعرف', 'ايش تعرف', 'شو بتقدر', 'ساعدني', 'مساعده', 'help', 'شو بتسوي', 'شو تسوي', 'اوامر', 'شو اسالك', 'كيف استخدمك']),
    joke: rx(['نكته', 'نكت', 'ضحكني', 'joke', 'فرفشني']),
    mood: rx(['تعبان', 'تعبانه', 'مضغوط', 'مضغوطه', 'محبط', 'محبطه', 'زهقان', 'زهقانه', 'طفشان', 'طفشانه', 'يائس', 'مش قادر', 'مو قادر', 'حاسس اني فاشل', 'ما بدي ادرس', 'مش عايز ادرس', 'بدي استسلم', 'مخنوق', 'حزين']),
    praise: rx(['ممتاز', 'برافو', 'حلو كتير', 'احسنت', 'شاطر', 'خطير', 'تمام']),
    addV: rx(['اضف', 'اضيف', 'ضيف', 'ضيفلي', 'اضفلي', 'سجل', 'سجلي', 'حط', 'حطلي', 'انشئ', 'بدي اضيف', 'اضافه']),
    spendV: rx(['صرفت', 'دفعت', 'اشتريت', 'شريت', 'خسرت', 'طلع علي', 'طلعلي', 'سددت', 'حاسبت', 'اجرت', 'بعت']),
    incomeV: rx(['استلمت', 'قبضت', 'وصلني', 'اجاني', 'جاني', 'حصلت على', 'استلمنا']),
    doneV: rx(['خلصت', 'انهيت', 'سلمت', 'انجزت', 'كملت', 'خلص', 'خلصنا', 'نجزت', 'اكملت']),
    taskW: rx(['مهمه', 'مهام', 'واجب', 'واجبات', 'كويز', 'مشروع', 'task', 'todo']),
    examW: rx(['امتحان', 'اختبار', 'ميد', 'فاينل', 'نهائي', 'نصفي', 'exam', 'midterm', 'final']),
    planW: rx(['خطه', 'جدول', 'برنامج', 'استعداد', 'استعد', 'كيف ادرس', 'كيف بدرس', 'كيف اذاكر', 'شو ادرس', 'اراجع', 'مراجعه', 'ادرس']),
    dayPlan: rx(['شو ادرس', 'شو بدرس', 'شو اذاكر', 'شو بدي ادرس', 'خططلي', 'خططني', 'خططلي يومي', 'نظم يومي', 'نظملي', 'رتبلي يومي', 'برنامج اليوم', 'شو اسوي اليوم', 'شو ابدا', 'من وين ابدا', 'ابدا بشو', 'شو اعمل اليوم']),
    agenda: rx(['شو عندي', 'ايش عندي', 'شو في', 'عندي شي', 'جدولي', 'محاضراتي', 'برنامجي', 'اجندتي', 'شو ورايا', 'شو علي', 'عندي ايش', 'شو بدي اعمل', 'شو عندنا']),
    nextLec: rx(['المحاضره الجايه', 'المحاضره القادمه', 'المحاضره التاليه', 'محاضرتي الجايه', 'اقرب محاضره', 'متي محاضرتي', 'وين محاضرتي', 'قاعه محاضرتي', 'اي قاعه', 'وين قاعه', 'next lecture', 'متى محاضره', 'متى المحاضره', 'اي محاضره']),
    examQ: rx(['امتحان', 'امتحانات', 'اختبار', 'ميد', 'فاينل', 'exam', 'كم باقي', 'متي امتحان']),
    attW: rx(['حضور', 'غياب', 'غبت', 'حضرت', 'غيابات', 'غيابي', 'الدوام', 'حرمان', 'اغيب', 'اتغيب', 'غيبت', 'يغيب', 'نغيب', 'تغيب']),
    gradeW: rx(['علامه', 'علامات', 'علامتي', 'علاماتي', 'درجه', 'درجات', 'معدل', 'معدلي', 'gpa', 'تقدير', 'نتيجه', 'علامه نهائيه']),
    needW: rx(['لازم اجيب', 'كم اجيب', 'شو لازم اجيب', 'كم لازم', 'بدي اجيب', 'ابغي اجيب', 'بدي انجح', 'اوصل', 'لاوصل', 'لاجيب', 'كم يلزمني', 'كم بحتاج', 'كم احتاج']),
    coursesW: rx(['مواد', 'مادة', 'ماده', 'كورس', 'مسجل', 'ساعات', 'متطلب', 'متطلبات', 'prereq']),
    cardsW: rx(['بطاقات', 'بطاقه', 'فلاش', 'flashcards', 'مراجعه البطاقات']),
    studyW: rx(['درست', 'ذاكرت', 'دراسه اليوم', 'ساعات دراستي', 'وقت الدراسه', 'كم ركزت', 'تركيزي', 'احصائيات', 'احصائياتي']),
    spendQ: rx(['كم صرفت', 'كم دفعت', 'مصروفي', 'مصاريفي', 'كم انفقت', 'كم خسرت', 'كم مصرف']),
    timeW: rx(['كم الساعه', 'الساعه كم', 'الوقت', 'الساعه الان', 'شو الوقت', 'شو الساعه', 'كم صارت الساعه', 'الساعه شو']),
    dateW: rx(['شو التاريخ', 'تاريخ اليوم', 'اي يوم', 'شو اليوم', 'كم التاريخ', 'اليوم شو', 'اي يوم اليوم']),
    openV: rx(['افتح', 'روح', 'خذني', 'وديني', 'انتقل', 'open', 'go to', 'وين', 'ودي']),
    timerV: rx(['ابدا تركيز', 'شغل بومودورو', 'ابدا بومودورو', 'ابدا جلسه', 'شغل المؤقت', 'جلسه تركيز', 'ابدا مؤقت', 'ابدا pomodoro']),
    refW: rx(['فيها', 'عنها', 'منها', 'نفس الماده', 'هاي الماده', 'هالماده', 'هذه الماده', 'هذي الماده', 'لها', 'بها']),
    more: rx(['كمان', 'والباقي', 'المزيد', 'زيد', 'اكثر', 'وغيرها', 'وبعدين']),
    cancel: rx(['الغ', 'الغي', 'خلص ما بدي', 'ما بدي', 'لا شكرا', 'تراجع', 'مش لازم', 'cancel', 'لا ما بدي', 'بلاش'])
  };

  function ctxOf(raw){
    var n = norm(raw), c = { raw: raw, n: n };
    var wf = whenFrags(n, true); c.date = wf.d && wf.d.date; c.time = wf.t && wf.t.time; c.frags = wf.frags;
    var fc = findCourse(n); c.cAmb = fc && fc.amb; c.course = fc ? fc.c : null;
    if(c.course) mem.course = c.course; else if(mem.course && (R.refW.test(n) || n.split(' ').length <= 3)) c.course = mem.course, c.inherited = true;
    c.toks = n.split(' ').filter(Boolean);
    c.cOwn = c.inherited ? null : c.course;     /* المادة المذكورة بالجملة فعلاً (بدون الموروثة من الذاكرة) */
    return c;
  }
  function askCourse(label, chipsFn){
    var cs = (sp().courses || []).slice(0, 5);
    if(!cs.length) return done('ما سجّلت مواد لسا. ضيف موادك من «موادي» وبعدين بساعدك فيها 📚', [go('courses', 'افتح موادي')]);
    return done('أي مادة بتقصد بـ' + label + '؟', cs.map(function(c){ return say(c.name, chipsFn(c)); }));
  }

  /* --- تحيات ومحادثة --- */
  function setPending(o){ o.ts = Date.now(); mem.pending = o; }
  function hSmall(c){
    var n = c.n, short = c.toks.length <= 4 && !c.cOwn && !c.date, hr = new Date().getHours();
    if(R.thanks.test(n) && short) return done(pick(['العفو! 🌟 أي خدمة ثانية؟', 'على الرحب والسعة 🙌', 'بخدمتك دايماً 😊']));
    if(R.bye.test(n) && short) return done(pick(['مع السلامة! الله يوفقك 🌙', 'بالتوفيق، أنا هون لو احتجتني 👋']));
    if(R.how.test(n)) return done('الحمد لله تمام 😊 جاهز أساعدك. شو بتحب نرتّب اليوم؟', [say('📋 خططلي يومي'), say('📅 شو عندي اليوم؟')]);
    if(R.who.test(n)) return done('أنا مساعد "مساحتي الدراسية" 🤖 شغّال على جهازك بدون إنترنت: بقرأ جدولك ومهامك وامتحاناتك وعلاماتك وبحسبلك وبرتّبلك الدراسة، وبضيف مهام ومصاريف بعد ما تأكّدلي. ما أنا ChatGPT، فمعلوماتي العامة محدودة بقاعدة صغيرة بالهندسة والدراسة.', [say('💡 شو بتعرف تسوي؟')]);
    if(R.can.test(n) && c.toks.length <= 5 && !c.cOwn) return done('🤖 **بقدر أساعدك بـ:**\n📅 «شو عندي بكرة؟» / «محاضرتي الجاية»\n📝 «ضيف واجب شبكات بكرة» (بعد تأكيدك)\n⏳ «ضيف امتحان فيزياء الأحد الساعة 10»\n💸 «صرفت 3 على قهوة» / «كم صرفت هالشهر؟»\n🎯 «خطة مراجعة لامتحان X»\n📊 «شو لازم أجيب بنهائي X لأجيب B+؟»\n✅ «كم أقدر أغيب بمادة X؟»\n🃏 «كم بطاقة مستحقة؟»\n🧮 «احسب 15*3+2» / «20% من 150»\n🧠 «اشرح TCP» / «شو الفرق بين stack وqueue»\n📍 «افتح الميزانية»', [say('📋 خططلي يومي'), say('📅 شو عندي اليوم؟'), say('🃏 كم بطاقة مستحقة؟')]);
    if(R.joke.test(n)) return done(pick(['ليش المبرمج بيحب الطبيعة؟ لأنه ما في فيها Bugs… بس في بعوض 🦟', 'مبرمج راح للسوبرماركت، زوجته قالتله: جيب خبز، وإذا في بيض جيب 6. رجع بـ6 خبزات: "كان في بيض!" 🥚', 'الفرق بين مهمة جديدة وكود قديم؟ القديم ما حدا بيفهمه حتى كاتبه 😅']));
    if(R.mood.test(n)) return done(pick(['فاهم عليك 💙 الضغط بالجامعة حقيقي. خلّينا نصغّر الحمل: خلّي هدفك اليوم 3 أشياء بس وأنا برتّبهم لك. وبعدها استراحة بدون ذنب.', 'يوم صعب؟ طبيعي. جرّب جلسة تركيز وحدة 25 دقيقة على أصغر مهمة، غالباً بعدها بتحسّ إنك ممكن تكمّل. وإذا ما نفع، الراحة اليوم أحسن من إنهاك بكرة.']), [say('📋 خططلي يومي'), go('timer', '⏱️ جلسة تركيز')]);
    if(R.greet.test(n) && short){
      var g = /(?:^|\s)(?:ال)?سلام عليكم/.test(n) ? 'وعليكم السلام ورحمة الله' : window.greetWord ? window.greetWord(hr) : 'أهلاً', nm = (sp().profile && sp().profile.name) || 'صديقي';
      var ot = openTasks(), ex = upcomingExams()[0], late = ot.filter(function(t){ return t.due && diff(t.due) < 0; }).length, st = streak();
      return done(g + ' ' + nm + '! 👋\nعندك ' + ot.length + ' مهمة مفتوحة' + (late ? ' (منها ' + late + ' متأخرة ⚠️)' : '') + (ex ? '، وأقرب امتحان «' + ex.name + '» ' + whenWord(diff(ex.date)) : '، وما عندك امتحانات قريبة') + '.' + (st > 1 ? '\n🔥 ' + st + ' أيام دراسة متواصلة!' : ''), [say('📅 شو عندي اليوم؟'), say('📋 خططلي يومي')]);
    }
    if(R.praise.test(n) && short) return done('🌟 الله يسلمك! بخدمتك.');
    return null;
  }

  /* --- حاسبة --- */
  function hCalc(c){
    var raw = c.raw, m = /(\d+(?:[.,]\d+)?)\s*%\s*(?:من|of)\s*(\d+(?:[.,]\d+)?)/i.exec(norm(raw).replace(/٪/g, '%'));
    if(m){ var p = parseFloat(m[1].replace(',', '.')), b = parseFloat(m[2].replace(',', '.')); return done('🧮 ' + p + '% من ' + b + ' = **' + Math.round(p * b) / 100 + '**'); }
    var body = raw.replace(/^[^\d(\-+]*?(?:احسب|حساب|كم يساوي|كم ناتج|ناتج|يساوي|كم)\s*/i, '');
    var wantsCalc = /(احسب|حساب|يساوي|ناتج|كم)/.test(raw) || /^[\d\s+\-*/×÷x^%().,٠-٩]+$/.test(raw.trim());
    if(!wantsCalc) return null;
    if(!/\d\s*[+\-*/×÷x^%]\s*[\d(]|sqrt|\d\s*\^\s*\d/i.test(body)) return null;
    if(/\d{4}-\d{1,2}-\d{1,2}/.test(body) || /\d{1,2}\/\d{1,2}(\/\d{2,4})?/.test(body) && !/[+*×÷^]/.test(body)) return null;
    var expr = body.replace(/[^0-9+\-*/×÷xX^%().,٠-٩a-z]/g, ' ').replace(/(?:^|\s)[a-z]{2,}(?=\s|$)/g, function(w){ return /sqrt/.test(w) ? w : ' '; });
    var v = calc(expr); if(v === null) return null;
    return done('🧮 ' + body.trim() + ' = **' + v + '**');
  }

  /* --- إضافة: مصروف/دخل --- */
  function hSpend(c){
    var n = c.n, income = R.incomeV.test(n), spend = R.spendV.test(n);
    var explicitAdd = R.addV.test(n) && /(مصروف|مصاريف|دخل|ايراد)/.test(n);
    if(!(income || spend || explicitAdd)) return null;
    if(R.spendQ.test(n) || /(كم|شو).*(صرفت|دفعت)/.test(n)) return null;
    var wf = whenFrags(n, true), amount = amountFrom(n, wf.frags), isIncome = income || (explicitAdd && /(دخل|ايراد)/.test(n) && !/مصروف/.test(n));
    if(!(amount > 0)){
      setPending({ type: 'money', isIncome: isIncome, n: n, date: wf.d && wf.d.date });
      return done('كم المبلغ؟ اكتب الرقم بس (مثال: 5 أو 12.5)', [say('✖ ما بدي', 'الغ')]);
    }
    if(amount > 100000) return done('المبلغ كبير كثير (' + amount + ')، تأكد من الرقم وأعد المحاولة.');
    var cat = catFor(n, isIncome ? INCOME_CATS : CATS, isIncome ? 'other-income' : 'other-expense');
    var note = cleanTitle(c.raw, n, wf.frags, null).replace(/[\d.]+/g, '').replace(/\b(دينار|دنانير|دينارا|jd)\b/gi, '').replace(/\s+/g, ' ').trim();
    return addMoneyProposal({ type: isIncome ? 'income' : 'expense', amount: amount, cat: cat, note: note.length > 40 ? note.slice(0, 40) : note, date: (wf.d && wf.d.date) || todayStr() });
  }

  /* --- إضافة: مهمة / امتحان --- */
  function kindOf(n){
    return /(?:^|\s)(?:ال)?واجب/.test(n) ? 'assignment' : /(?:^|\s)(?:ال)?(?:كويز|quiz)/.test(n) ? 'quiz' : /(?:^|\s)(?:ال)?مشروع/.test(n) ? 'project' : 'task';
  }
  function hAdd(c){
    var n = c.n; if(!R.addV.test(n) && !/(?:^|\s)(?:ذكرني|لازم اسلم|عندي (?:واجب|كويز|مشروع|امتحان|مهمه))/.test(n)) return null;
    if(/(?:^|\s)(?:كيف|ازاي|طريقه|وين|ليش|لماذا|شو طريقه|شو|ايش|وش|كم|هل|متي|امتي)(?:\s|$)/.test(n) && !R.addV.test(n)) return null;     /* سؤال («كيف أضيف…»، «شو عندي امتحانات») مش أمر إضافة */
    if(/(?:^|\s)(?:كيف|ازاي|طريقه|شو طريقه)(?:\s|$)/.test(n)) return null;
    var wf = whenFrags(n, false);
    if(/(?:^|\s)(?:ال)?(?:ملاحظه|نوت|note)(?:\s|$)/.test(n)){
      var nb = c.raw.replace(/[؟?]+\s*$/, '').replace(/^\s*(?:ضيفلي|ضيف|اضف|اضيف|سجلي|سجل|حطلي|حط|بدي اضيف)\s+/, '').replace(/^\s*(?:ال)?(?:ملاحظ[ةه]|نوت|note)\s*(?:عن|حول|بخصوص|:)?\s*/i, '').trim();
      if(!nb){ setPending({ type: 'note', course: c.cOwn }); return done('شو بدك أكتب بالملاحظة؟'); }
      return addNoteProposal({ title: nb.length > 50 ? nb.slice(0, 50) + '…' : nb, body: nb, course: c.cOwn });
    }
    if(R.examW.test(n) && !/(?:^|\s)(?:ال)?(?:واجب|مهمه)/.test(n) || /^\s*(?:عندي )?(?:امتحان|ميد|فاينل)/.test(n)){
      var name = /(ميد|نصفي|منتصف)/.test(n) ? 'ميد' : /(فاينل|نهائي|final)/.test(n) ? 'فاينل' : /كويز|قصير/.test(n) ? 'كويز' : 'امتحان';
      var ex = { name: name, course: c.cOwn, time: wf.t && wf.t.time || '', date: wf.d && wf.d.date };
      if(!ex.date){ setPending({ type: 'exam', ex: ex }); return done('متى موعد الامتحان' + (c.course ? ' (' + c.course.name + ')' : '') + '؟ اكتب مثلاً: «الأحد الساعة 10» أو «بعد 5 أيام».', [say('✖ ما بدي', 'الغ')]); }
      if(diff(ex.date) < 0) return done('هاد التاريخ مضى (' + shortDate(ex.date) + '). اكتب موعد قادم.');
      return addExamProposal(ex);
    }
    var title = cleanTitle(c.raw, n, wf.frags, c.cOwn), kind = kindOf(n);
    if(title && wf.t) title += ' (' + wf.t.time + ')';
    var lab = { task: 'مهمة', assignment: 'واجب', quiz: 'كويز', project: 'مشروع' }[kind];
    if(!title) title = c.cOwn ? lab + ' ' + c.cOwn.name : '';
    if(!title){ setPending({ type: 'task', kind: kind, course: c.cOwn, date: wf.d && wf.d.date }); return done('شو عنوان ال' + lab + '؟'); }
    else if(kind !== 'task' && norm(title).indexOf(norm(lab)) !== 0) title = lab + ' ' + title;
    return addTaskProposal({ title: title, kind: kind, course: c.cOwn, date: wf.d && wf.d.date, high: /(مهم|ضروري|عاجل|urgent)/.test(n) });
  }
  function hDone(c){
    var n = c.n; if(!R.doneV.test(n) || R.examW.test(n) && !R.taskW.test(n)) return null;
    if(/(?:^|\s)(?:كيف|ازاي|وين|ليش)(?:\s|$)/.test(n)) return null;
    var open = openTasks(); if(!open.length) return done('ما عندك مهام مفتوحة أصلاً 🎉');
    var toks = n.split(' ').map(stripTok).filter(function(t){ return t.length >= 3 && !/^(?:خلصت|انهيت|سلمت|انجزت|كملت|اكملت|خلص|خلصنا|تسليم|نجزت|مهمه|واجب)$/.test(t); });
    var scored = open.map(function(t){
      var tw = norm(t.title).split(' ').map(stripTok), s = 0;
      toks.forEach(function(k){ if(tw.some(function(w){ return w === k || (k.length >= 4 && w.indexOf(k) === 0) || (w.length >= 4 && k.indexOf(w) === 0); })) s++; });
      if(c.course && t.course === c.course.name) s += 0.5;
      return { t: t, s: s };
    }).filter(function(x){ return x.s > 0; }).sort(function(a, b){ return b.s - a.s; });
    if(!scored.length) return done('ما لقيت مهمة مفتوحة بتشبه كلامك. هدول المفتوحين:\n' + open.slice(0, 5).map(function(t){ return '• ' + t.title; }).join('\n'), [go('tasks', 'افتح المهام')]);
    var top = scored[0].t;
    if(scored.length > 1 && scored[1].s === scored[0].s) return done('أي وحدة تقصد؟', scored.slice(0, 4).map(function(x){ return say(x.t.title, 'خلصت ' + x.t.title); }));
    return confirmCard('✅ بعلّم «' + top.title + '» كمنجزة؟', function(){ window.toggleTask(top.id); return '🎉 برافو! أنجزت «' + top.title + '».'; }, '✅ علّمها منجزة');
  }

  /* --- التحقق من سؤال معلّق (ناقص تاريخ/مبلغ/عنوان) --- */
  function hPending(c){
    var p = mem.pending; if(!p) return null;
    if(Date.now() - p.ts > 120000 || p.age > 1){ mem.pending = null; return null; }     /* السؤال المعلّق صالح للرسالة التالية فقط وبحد دقيقتين */
    if(R.cancel.test(c.n)){ mem.pending = null; return done('تمام، ألغيت 👍'); }
    if(c.toks.length > 8 || R.agenda.test(c.n) || R.addV.test(c.n) || /(?:^|\s)(?:شو|ايش|وش|كم|هل|متي|امتي|ليش|كيف|وين)(?:\s|$)/.test(c.n)) return null;   /* مش جواب على سؤالي */
    if(p.type === 'exam'){
      var wf = whenFrags(c.n, false);
      if(!wf.d){ return null; }
      mem.pending = null; p.ex.date = wf.d.date; if(wf.t) p.ex.time = wf.t.time;
      if(diff(p.ex.date) < 0) return done('هاد التاريخ مضى. اكتب موعد قادم.');
      return addExamProposal(p.ex);
    }
    if(p.type === 'money'){
      var wf2 = whenFrags(c.n, true), amt = amountFrom(c.n, wf2.frags);
      if(!(amt > 0)) return null;
      mem.pending = null; var catN = catFor(p.n + ' ' + c.n, p.isIncome ? INCOME_CATS : CATS, p.isIncome ? 'other-income' : 'other-expense');
      return addMoneyProposal({ type: p.isIncome ? 'income' : 'expense', amount: amt, cat: catN, note: '', date: p.date || (wf2.d && wf2.d.date) || todayStr() });
    }
    if(p.type === 'task'){
      var raw = c.raw.trim(); if(raw.length < 2 || raw.length > 80) return null;
      mem.pending = null;
      return addTaskProposal({ title: raw, kind: p.kind, course: p.course, date: p.date });
    }
    if(p.type === 'note'){
      var body = c.raw.trim(); if(body.length < 2) return null;
      mem.pending = null;
      return addNoteProposal({ title: body.length > 50 ? body.slice(0, 50) + '…' : body, body: body, course: p.course });
    }
    return null;
  }

  /* --- الأجندة: محاضرات + مهام + امتحانات ليوم/أسبوع --- */
  function dayBlock(date, withHead){
    var lec = lecturesOn(date), tk = tasksOn(date), ex = examsOn(date), L = [];
    if(withHead) L.push('📅 **' + shortDate(date) + '**' + (diff(date) === 0 ? ' (اليوم)' : diff(date) === 1 ? ' (بكرة)' : ''));
    if(lec.length){ L.push('🎓 المحاضرات (' + lec.length + '):'); lec.forEach(function(l){ L.push(lectureLine(l)); }); }
    if(ex.length){ L.push('⏳ امتحانات:'); ex.forEach(function(e){ L.push('• ' + e.name + (e.course ? ' — ' + e.course : '') + (e.time ? ' ' + e.time : '')); }); }
    if(tk.length){ L.push('📝 تسليمات:'); tk.forEach(function(t){ L.push('• ' + t.title); }); }
    return { text: L.join('\n'), empty: !lec.length && !tk.length && !ex.length, lec: lec.length, tk: tk.length, ex: ex.length };
  }
  function hAgenda(c){
    var n = c.n, week = /(اسبوع|الاسبوع|هالاسبوع|هذا الاسبوع|الجمعه الجايه|اسبوعي)/.test(n) && !c.date;
    var jad = /(?:^|\s)(?:ال)?جدول(?:ي)?(?:\s|$)/.test(n) && c.toks.length <= 3 && !R.addV.test(n) && !R.openV.test(n);
    if(jad && !c.date) week = true;
    var isQ = jad || (R.agenda.test(n) && !((R.examW.test(n) || R.taskW.test(n)) && !c.date)) || (/(?:^|\s)(?:شو|ايش|وش)\s+(?:اليوم|بكره|بكرا|بعد بكره)/.test(n)) || (/(?:محاضرات|جدول)/.test(n) && (c.date || week)) || (c.date && /(عندي|ورايا|علي)/.test(n) && !R.examW.test(n) && !R.taskW.test(n));
    if(!isQ) return null;
    mem.last = { id: 'agenda' };
    if(week){
      var L = ['🗓 **أسبوعك القادم:**'], i, any = false;
      for(i = 0; i < 7; i++){
        var d = addDays(todayStr(), i), b = dayBlock(d, false);
        if(!b.empty){ any = true; L.push('• ' + shortDate(d) + ': ' + [b.lec ? b.lec + ' محاضرة' : '', b.ex ? b.ex + ' امتحان' : '', b.tk ? b.tk + ' تسليم' : ''].filter(Boolean).join(' · ')); }
      }
      if(!any) L.push('ما في شي مسجّل لهالأسبوع (جدول/مهام/امتحانات). 🎈');
      var od = openTasks().filter(function(t){ return t.due && diff(t.due) < 0; }).length;
      if(od) L.push('', '⚠️ ' + od + ' مهمة متأخرة من قبل.');
      return done(L.join('\n'), [say('📅 شو عندي اليوم؟'), go('timetable', 'افتح الجدول')]);
    }
    var date = c.date || todayStr(), b = dayBlock(date, true);
    mem.date = date;
    if(b.empty){
      var noTT = !Object.keys(sp().timetable || {}).length;
      return done(b.text + '\nما في محاضرات ولا تسليمات ولا امتحانات ' + (diff(date) === 0 ? 'اليوم' : 'بهاد اليوم') + ' حسب بياناتك.' + (noTT ? '\n(ما أدخلت جدول محاضرات بعد، لهيك ما بعرف محاضراتك.)' : '') + ' 🎈', [say('🗓 أسبوعي'), go('timetable', 'افتح الجدول')]);
    }
    return done(b.text + (diff(date) === 0 ? '\n\n⏰ الآن ' + nowHM() : ''), [say('📅 وبكرة؟', 'شو عندي بكرة'), say('🗓 أسبوعي', 'شو عندي هالأسبوع')]);
  }
  function hNextLec(c){
    if(!R.nextLec.test(c.n)) return null;
    var tt = sp().timetable || {}; if(!Object.keys(tt).length) return done('ما عندي جدولك: أدخله من «الجدول الأسبوعي» وبعدها بقولك محاضرتك الجاية.', [go('timetable', 'افتح الجدول')]);
    var i, hm0 = nowHM();
    for(i = 0; i < 8; i++){
      var d = addDays(todayStr(), i), ls = lecturesOn(d).filter(function(l){ return i > 0 || l.start > hm0; });
      if(c.cOwn) ls = ls.filter(function(l){ return norm(l.name) === norm(c.cOwn.name); });
      if(ls.length){ var l = ls[0]; return done('🎓 محاضرتك الجاية: **' + l.name + '**\n' + (i === 0 ? 'اليوم' : shortDate(d)) + ' الساعة ' + l.start + (l.end ? '–' + l.end : '') + (l.room ? '\n📍 ' + l.room : '') + (i === 0 ? '\n⏰ بعد ' + hmDiff(hm0, l.start) : ''), [go('timetable', 'افتح الجدول')]); }
    }
    return done('ما لقيت محاضرات ' + (c.cOwn ? 'لـ' + c.cOwn.name + ' ' : '') + 'بالأسبوع الجاي حسب جدولك.');
  }
  function hmDiff(a, b){ var x = (+b.slice(0, 2)) * 60 + (+b.slice(3)) - ((+a.slice(0, 2)) * 60 + (+a.slice(3))); return x >= 60 ? Math.floor(x / 60) + ' س و' + (x % 60) + ' د' : x + ' د'; }

  /* --- الامتحانات --- */
  function hExams(c){
    var n = c.n; if(!R.examQ.test(n)) return null;
    if(R.planW.test(n) && !/(متي|كم باقي|موعد)/.test(n)) return null;   /* خطة المراجعة تعالَج بالمعالج الخاص */
    mem.last = { id: 'exams' };
    var list = upcomingExams(c.cOwn), kw = /(?:^|\s)(?:ال)?(ميد|فاينل|كويز|نهائي|نصفي)/.exec(n);
    if(kw){ var kn = norm(kw[1] === 'نهائي' ? 'فاينل' : kw[1] === 'نصفي' ? 'ميد' : kw[1]); list = list.filter(function(e){ return norm(e.name).indexOf(kn) > -1; }); }
    if(!list.length) return done(c.cOwn ? 'ما عندك امتحانات قادمة لـ«' + c.cOwn.name + '» مسجّلة.' : '✨ ما عندك امتحانات قادمة مسجّلة.', [say('➕ ضيف امتحان', 'ضيف امتحان'), go('exams', 'افتح الامتحانات')]);
    var L = ['⏳ **امتحاناتك القادمة:**'];
    list.slice(0, 6).forEach(function(e){
      var d = diff(e.date); L.push('• ' + e.name + (e.course ? ' — ' + e.course : '') + ': ' + shortDate(e.date) + (e.time ? ' ' + e.time : '') + ' (' + whenWord(d) + ')');
    });
    var first = list[0], d0 = diff(first.date);
    if(d0 <= 3) L.push('', '🔥 «' + first.name + '» ' + (d0 === 0 ? 'اليوم' : 'قريب') + ' — ركّز عليه.');
    return done(L.join('\n'), [{ label: '🎯 خطة مراجعة لـ«' + first.name + '»', say: 'خطة مراجعة لامتحان ' + (first.course || first.name) }, go('exams', 'افتح الامتحانات')]);
  }
  function hStudyPlan(c){
    var n = c.n, urgent = R.examW.test(n) && /(نسيت|ما درست|مادرست|ما ذاكرت|مش جاهز|مو جاهز|ضيعت|متاخر بالدراسه)/.test(n);
    if(!urgent && !(R.planW.test(n) && (R.examW.test(n) || c.course))) return null;
    if(R.dayPlan.test(n) || /(يومي|اليوم)/.test(n) && !R.examW.test(n)) return null;
    if(/(جدول)/.test(n) && !/(مراجعه|ادرس|استعداد)/.test(n)) return null;
    var synth = urgent && c.date && diff(c.date) >= 0;
    var ex = synth ? { name: 'الامتحان', course: c.cOwn ? c.cOwn.name : '', date: c.date } : (upcomingExams(c.course)[0] || (!c.course ? upcomingExams()[0] : null));
    if(!ex){
      if(c.course) return done('ما عندك امتحان مسجّل لـ«' + c.course.name + '». ضيفه وبعملك خطة (مثال: «ضيف امتحان ' + c.course.name + ' الأحد»).', [say('➕ ضيف امتحان', 'ضيف امتحان ' + c.course.name)]);
      return done('ما عندك امتحانات قادمة مسجّلة لأعملك خطة لإلها.', [say('➕ ضيف امتحان', 'ضيف امتحان')]);
    }
    var d = diff(ex.date), L = ['🎯 **خطة مراجعة «' + ex.name + '»' + (ex.course ? ' — ' + ex.course : '') + '**', '📅 ' + shortDate(ex.date) + ' (' + whenWord(d) + ')', ''];
    if(d === 0){
      L.push('الامتحان اليوم! بس:', '• راجع ملخصاتك وقوانينك فقط، ولا تفتح مواضيع جديدة', '• جهّز أدواتك وهويتك وقاعتك', '• تنفّس وكل شي خفيف 💪');
    } else if(d === 1){
      L.push('باقي يوم واحد:', '• نص اليوم: حل أسئلة سنوات سابقة بوقت محدد', '• بعدها راجع أخطاءك فقط', '• خلّص قبل العشا ونام 7 ساعات على الأقل', '• لا تفتح مواضيع جديدة');
    } else {
      var A = Math.max(1, Math.round(d * 0.5)), B = Math.max(0, Math.round(d * 0.3)), C = d - A - B;
      if(C < 1){ C = 1; if(B > 0) B--; else A--; }
      var s1 = 0, e1 = A - 1, s2 = A, e2 = A + B - 1, s3 = A + B, e3 = d - 1;
      function rng(s, e){ return s === e ? shortDate(addDays(todayStr(), s)) : shortDate(addDays(todayStr(), s)) + ' ← ' + shortDate(addDays(todayStr(), e)); }
      L.push('① **تغطية المادة** (' + daysWord(A) + '): ' + rng(s1, e1), '   قسّم المنهج على الأيام، ولخّص كل موضوع بصفحة واحدة وحوّل الأسئلة لبطاقات.');
      if(B > 0) L.push('② **تدريب وحل أسئلة** (' + daysWord(B) + '): ' + rng(s2, e2), '   سنوات سابقة وتمارين الكتاب بوقت محدد، وسجّل أخطاءك.');
      L.push('③ **مراجعة ختامية** (' + daysWord(C) + '): ' + rng(s3, e3), '   ارجع على أخطائك وملخصاتك وبطاقاتك، ونوم كفاية ليلة الامتحان.');
      var perDay = d >= 10 ? '3–4' : d >= 5 ? '4–6' : '6–8';
      L.push('', '⏱️ حمل مقترح: **' + perDay + ' جلسات بومودورو** باليوم (تقدير عام، عدّله حسب صعوبة المادة وجاهزيتك).');
    }
    var rel = openTasks().filter(function(t){ return ex.course && t.course === ex.course; });
    if(rel.length) L.push('', '📝 مهام مفتوحة للمادة: ' + rel.slice(0, 3).map(function(t){ return t.title; }).join('، '));
    L.push('', '📎 ' + (synth ? 'هاد الامتحان مش مسجّل عندك، بنيت الخطة على كلامك. ' : 'الخطة مبنية على موعد الامتحان المسجّل بس؛ ') + 'ما أعرف تفاصيل المنهج.');
    return done(L.join('\n'), [go('timer', '⏱️ ابدأ جلسة تركيز'), say('➕ ضيف مهمة', 'ضيف مهمة مراجعة ' + (ex.course || ''))]);
  }

  function hDayPlan(c){
    var n = c.n; if(!(R.dayPlan.test(n) || /(?:^|\s)(?:خطط|نظم|رتب)(?:لي|ني)?\s+(?:لي )?(?:يومي|اليوم|وقتي)/.test(n))) return null;
    mem.last = { id: 'dayplan' };
    var t = todayStr(), lec = lecturesOn(t), L = ['📋 **خطة يومك** (' + shortDate(t) + ')'];
    if(lec.length){ L.push('', '🎓 **المحاضرات:**'); lec.forEach(function(l){ L.push(lectureLine(l)); }); }
    var open = openTasks(), od = open.filter(function(x){ return x.due && diff(x.due) < 0; }), td = open.filter(function(x){ return x.due === t; });
    var rest = open.filter(function(x){ return x.due && diff(x.due) > 0; }).sort(function(a, b){ return diff(a.due) - diff(b.due); });
    var pr = od.concat(td, rest).slice(0, 3);
    if(pr.length){ L.push('', '✅ **أولوياتك:**'); pr.forEach(function(x, i){ var d = x.due ? diff(x.due) : null; L.push((i + 1) + '. ' + x.title + (d === null ? '' : d < 0 ? ' ⚠️ متأخرة' : d === 0 ? ' — اليوم' : ' — ' + whenWord(d))); }); }
    var ex = upcomingExams()[0]; if(ex && diff(ex.date) <= 7) L.push('', '⏳ «' + ex.name + '» ' + whenWord(diff(ex.date)) + ' — خصّص جلسة مراجعة.');
    var dc = dueCards(); if(dc) L.push('', '🃏 عندك ' + dc + ' بطاقة مستحقة للمراجعة (10 دقائق).');
    var sessions = Math.max(2, Math.min(6, pr.length * 2 + (ex ? 1 : 0)));
    L.push('', '⏱️ اقتراح: **' + sessions + ' جلسات بومودورو** بين المحاضرات وبعدها، مع راحة 5 دقائق بين كل جلسة.');
    if(!lec.length && !pr.length && !dc) L.push('', 'يومك فاضي حسب البيانات 🎈 استغله بمراجعة خفيفة أو تقدّم مهمة.');
    L.push('', '📎 المصدر: جدولك ومهامك وامتحاناتك وبطاقاتك.');
    return done(L.join('\n'), [go('timer', '⏱️ ابدأ جلسة تركيز'), go('tasks', 'افتح المهام')]);
  }

  /* --- المهام (حسب مادة / متأخرة) --- */
  function hTasks(c){
    var n = c.n; if(!R.taskW.test(n) || R.addV.test(n)) return null;
    mem.last = { id: 'tasks' };
    var open = openTasks(), crs = c.course && !c.inherited ? c.course : null;
    if(crs) open = open.filter(function(t){ return t.course === crs.name; });
    if(/(متاخر|متأخر|فاتت|فاتني|متاخره|late|overdue)/.test(n)) open = open.filter(function(t){ return t.due && diff(t.due) < 0; });
    else if(c.date && !/(بعد|كل)/.test(n)) open = open.filter(function(t){ return t.due === c.date; });
    if(!open.length) return done('✨ ما في مهام ' + (crs ? 'لـ«' + crs.name + '» ' : '') + 'تطابق سؤالك.', [go('tasks', 'افتح المهام')]);
    open.sort(function(a, b){ return (a.due || '9999').localeCompare(b.due || '9999'); });
    var page = R.more.test(n) && mem.page ? mem.page : 0, slice = open.slice(page * 6, page * 6 + 6);
    var L = ['📝 **' + open.length + ' مهمة' + (crs ? ' (' + crs.name + ')' : '') + ':**'];
    slice.forEach(function(t, i){ var d = t.due ? diff(t.due) : null; L.push((page * 6 + i + 1) + '. ' + t.title + (d === null ? '' : d < 0 ? ' ⚠️ متأخرة ' + (-d) + ' يوم' : ' — ' + whenWord(d))); });
    var acts = [go('tasks', 'افتح المهام')];
    if(open.length > (page + 1) * 6){ mem.page = page + 1; acts.unshift(say('➕ كمان', 'كمان مهام')); } else mem.page = 0;
    return done(L.join('\n'), acts);
  }

  /* --- الحضور --- */
  function hAttendance(c){
    var n = c.n; if(!R.attW.test(n)) return null;
    mem.last = { id: 'att' };
    if(!c.course || c.inherited && !R.refW.test(n)){
      var rows = (sp().courses || []).map(function(x){ return { c: x, a: attOf(x) }; }).filter(function(r){ return r.a.tot > 0; });
      if(!rows.length) return done('ما سجّلت حضور لأي مادة لسا. سجّل من تبويب «الحضور».', [go('attendance', 'افتح الحضور')]);
      rows.sort(function(a, b){ return a.a.pct - b.a.pct; });
      return done('✅ **نسبة حضورك** (من الأقل):\n' + rows.map(function(r){ return '• ' + r.c.name + ': ' + r.a.pct + '% (' + r.a.p + ' حضور / ' + r.a.a + ' غياب)' + (r.a.pct < 75 ? ' 🔴' : r.a.pct < 85 ? ' 🟡' : ' 🟢'); }).join('\n') + '\n\n📎 الألوان حسب عتبات التطبيق (85% و75%).', [go('attendance', 'افتح الحضور')]);
    }
    var a = attOf(c.course);
    if(!a.tot) return done('ما سجّلت حضور ولا غياب لـ«' + c.course.name + '» لسا.', [go('attendance', 'افتح الحضور')]);
    var spare = Math.floor(a.p / 0.85 - a.p - a.a + 1e-9), L = ['✅ **' + c.course.name + ':** حضور ' + a.pct + '% (' + a.p + ' حضور، ' + a.a + ' غياب من ' + a.tot + ').'];
    L.push(a.pct >= 85 ? '🟢 وضعك آمن. تقدر تغيب ' + (spare > 0 ? 'حوالي ' + spare + (spare >= 3 && spare <= 10 ? ' محاضرات' : ' محاضرة') + ' إضافية' : 'ولا محاضرة (على الحد)') + ' وتبقى فوق 85%.' : a.pct >= 75 ? '🟡 تحت 85% — حاول ما تغيب أكثر.' : '🔴 تحت 75% — خطر. تواصل مع الدكتور/شؤون الطلبة عن نظام الحرمان.');
    L.push('📎 الحساب على المحاضرات المسجّلة عندك فقط، وعتبة 85% هي اللي يستخدمها التطبيق؛ نظام الجامعة الرسمي قد يختلف، فتأكد منه.');
    return done(L.join('\n'), [go('attendance', 'افتح الحضور')]);
  }

  /* --- العلامات والمعدل --- */
  function parseTarget(raw, n){
    var L = /(?:^|[^a-z])(a-|a\+|a|b\+|b-|b|c\+|c-|c|d\+|d)(?=[^a-z+\-]|$)/i.exec(raw.toLowerCase().replace(/([a-z])\s*(\+|-)/g, '$1$2'));
    var sc = gradeScale();
    if(L){ var f = sc.filter(function(s){ return s.label.toLowerCase() === L[1].toLowerCase(); })[0]; if(f) return { pct: f.min, label: f.label }; }
    var m = /(?:^|\s)(\d{2,3})(?:\s*%|\s*علامه|\s*من 100)?(?=\s|$)/.exec(n);
    if(m && +m[1] >= 10 && +m[1] <= 100) return { pct: +m[1], label: m[1] + '%' };
    return null;
  }
  function hGrades(c){
    var n = c.n; if(!(R.gradeW.test(n) || (R.needW.test(n) && (c.cOwn || /(علامه|علامات|معدل|gpa|نهائي|فاينل|اجيب|انجح|درجه|ماده)/.test(n))))) return null;
    mem.last = { id: 'grades' };
    var crs = c.course;
    if(R.needW.test(n) || /(نهائي|فاينل|الباقي)/.test(n)){
      var tgt = parseTarget(c.raw, n);
      if(/(معدل|gpa)/.test(n) && !c.cOwn){
        var gp = /(\d(?:\.\d+)?)/.exec(n); var want = gp ? parseFloat(gp[1]) : null;
        if(want && want > 0 && want <= 4 && window.Progress && window.Progress.scenarios){
          var hrs = (sp().courses || []).reduce(function(s, x){ return s + (+x.hours || 3); }, 0) || 15, r = window.Progress.scenarios(hrs, want);
          if(!r) return done('أحتاج علاماتك أو معدلك التراكمي المسجّل بتبويب «علاماتي» لأحسبلك.', [go('gradecalc', 'افتح علاماتي')]);
          var txt = r.status === 'done' ? '🎉 معدلك الحالي أصلاً فوق ' + want + ' وبتحافظ عليه حتى بعلامات منخفضة.' : r.status === 'ok' ? '🎯 لتوصل ' + want + ' لازم معدل فصلك القادم (' + hrs + ' ساعة) ≈ **' + r.need.toFixed(2) + '** (تقريباً ' + r.letter + ' وما فوق، أي ≥ ' + r.minPct + '%).' : '⚠️ بفصل واحد ما بتوصل ' + want + (r.semesters ? '، بتحتاج حوالي ' + r.semesters + ' فصول بأعلى علامات.' : '.');
          return done(txt + '\n📎 المصدر: معدلك التراكمي وساعاتك المسجّلة؛ الفصل المفترض ' + hrs + ' ساعة.', [go('gradecalc', 'افتح علاماتي')]);
        }
      }
      if(!crs) return askCourse('العلامة المطلوبة', function(x){ return 'شو لازم أجيب بـ' + x.name + (tgt ? ' لأجيب ' + tgt.label : ''); });
      var g = gradeOf(crs);
      if(!g || !(g.items || []).length) return done('ما أدخلت علامات لـ«' + crs.name + '». أضفها من «علاماتي» وبحسبلك المطلوب.', [go('gradecalc', 'افتح علاماتي')]);
      var earned = 0, doneW = 0; g.items.forEach(function(i){ var w = +i.weight || 0; earned += Math.min(+i.score || 0, w); doneW += w; });
      var rem = Math.max(0, 100 - doneW);
      if(!tgt) tgt = { pct: 60, label: 'النجاح (60%)' };
      if(!rem) return done('«' + crs.name + '» وزنها اكتمل (' + earned.toFixed(1) + '/100). ما في باقي أحسبه.', [go('gradecalc', 'افتح علاماتي')]);
      var needPts = tgt.pct - earned, pctRem = needPts / rem * 100;
      var verdict = needPts <= 0 ? '🎉 مضمون: وصلت ' + tgt.label + ' بمجرد ما أنجزته (' + earned.toFixed(1) + ' من ' + doneW + ').' : pctRem > 100 ? '😬 صعب: بتحتاج ' + needPts.toFixed(1) + ' من أصل ' + rem + ' متبقية (أكثر من العلامة الكاملة) فما في طريقة لـ' + tgt.label + '.' : '🎯 لتوصل ' + tgt.label + ' لازم تجيب **' + needPts.toFixed(1) + ' من ' + rem + '** من الباقي (≈ ' + Math.ceil(pctRem) + '%).';
      return done('📊 **' + crs.name + '**: عندك ' + earned.toFixed(1) + ' من ' + doneW + ' مُنجَز.\n' + verdict + '\n📎 الحساب بافتراض إن باقي الوزن (' + rem + ') لسا ما انحسب. تأكد من أوزان التقييم بخطة المادة.', [go('gradecalc', 'افتح علاماتي')]);
    }
    if(crs && !c.inherited){
      var gg = gradeOf(crs);
      if(!gg || !(gg.items || []).length) return done('ما أدخلت علامات لـ«' + crs.name + '».', [go('gradecalc', 'افتح علاماتي')]);
      var e2 = 0, w2 = 0; gg.items.forEach(function(i){ var w = +i.weight || 0; e2 += Math.min(+i.score || 0, w); w2 += w; });
      return done('📊 **' + crs.name + ':** ' + e2.toFixed(1) + ' من ' + w2 + ' (' + (w2 ? (e2 / w2 * 100).toFixed(1) : 0) + '%) على ما أُنجز، وباقي ' + Math.max(0, 100 - w2) + ' من الوزن.\n' + gg.items.slice(0, 6).map(function(i){ return '• ' + i.name + ': ' + i.score + '/' + i.weight; }).join('\n'), [say('🎯 شو لازم أجيب بنهائي؟', 'شو لازم أجيب بنهائي ' + crs.name), go('gradecalc', 'افتح علاماتي')]);
    }
    if(window.Progress && window.Progress.report){
      var rp = window.Progress.report();
      if(rp && rp.rows && rp.rows.length) return done('📊 **توقع معدل الفصل:** ' + rp.gpa.toFixed(2) + '\n(النطاق الممكن ' + rp.gpaMin.toFixed(2) + ' – ' + rp.gpaMax.toFixed(2) + ')\n' + rp.rows.map(function(r){ return '• ' + r.name + ': ' + (r.letter ? r.letter.label : '—') + ' (' + r.cur.toFixed(1) + '%)'; }).join('\n') + '\n📎 من المواد اللي أدخلت علاماتها فقط.', [say('🎯 كيف أوصل 3.5؟', 'شو لازم أجيب لأوصل معدل 3.5'), go('gradecalc', 'افتح علاماتي')]);
    }
    var v = document.getElementById('gpaVal'), gr = document.getElementById('gpaGrade');
    if(v && parseFloat(v.textContent) > 0) return done('📊 معدلك الحالي: **' + v.textContent + '**' + (gr && gr.textContent ? ' (' + gr.textContent + ')' : ''), [go('gradecalc', 'افتح علاماتي')]);
    return done('📊 ما عندي علامات لأحسب منها. أضف علامات موادك من «علاماتي».', [go('gradecalc', 'افتح علاماتي')]);
  }

  /* --- المواد (معلومات من قاعدة المواد) --- */
  function hCourses(c){
    var n = c.n;
    var wantsInfo = c.cOwn && ((R.coursesW.test(n) && /(كم ساعه|ساعات|متطلب|يسبق|يسبقها|وصف|شو هي|عن الماده|معلومات)/.test(n)) || /(?:^|\s)(?:كود|رقم|رمز)(?:\s|$)/.test(n));
    if(wantsInfo){
      var cr = c.course, db = (window.COURSES_DB || {})[cr.name] || (window.findCourseByCode && cr.code ? window.findCourseByCode(cr.code) : null);
      var L = ['📚 **' + cr.name + '**' + (cr.code ? ' (' + cr.code + ')' : ''), '⏱ ' + (cr.hours || (db && db.h) || 3) + ' ساعات'];
      if(cr.instructor) L.push('👤 ' + cr.instructor);
      if(cr.room) L.push('📍 ' + cr.room);
      if(db){ if(db.pre && db.pre.length) L.push('🔗 متطلب سابق: ' + db.pre.join('، ')); if(db.d) L.push('📝 ' + db.d); }
      var a = attOf(cr), g = gradeOf(cr);
      L.push('', 'حضورك: ' + (a.pct === null ? 'غير مسجّل' : a.pct + '%') + ' · مهام مفتوحة: ' + openTasks().filter(function(t){ return t.course === cr.name; }).length + ' · امتحانات قادمة: ' + upcomingExams(cr).length);
      return done(L.join('\n'), [say('🎯 خطة مراجعة', 'خطة مراجعة ' + cr.name), say('📊 علاماتي فيها', 'علامات ' + cr.name)]);
    }
    if(R.coursesW.test(n) && !R.addV.test(n) && !R.taskW.test(n) && !R.examW.test(n)){
      var cs = sp().courses || [];
      if(!cs.length) return done('📚 ما سجّلت مواد. روح لتبويب «موادي» وأضفها.', [go('courses', 'افتح موادي')]);
      var tot = cs.reduce(function(s, x){ return s + (+x.hours || 3); }, 0);
      return done('📚 **عندك ' + cs.length + ' مادة (' + tot + ' ساعة):**\n' + cs.map(function(x){ return '• ' + x.name + ' (' + (x.hours || 3) + 'س)'; }).join('\n'), [go('courses', 'افتح موادي')]);
    }
    return null;
  }

  /* --- بطاقات / دراسة / إنفاق --- */
  function hCards(c){
    if(!R.cardsW.test(c.n) || R.addV.test(c.n)) return null;
    var decks = sp().decks || [], ui = window.CardsUI;
    if(!decks.length || !ui) return done('🃏 ما عندك بطاقات بعد. أنشئ مجموعة من «بطاقات تعليمية» وأضف سؤال وجواب، أو استورد `سؤال :: جواب`.', [go('flashcards', 'افتح البطاقات')]);
    var due = 0, fresh = 0, tot = 0, rows = [];
    decks.forEach(function(d){ try{ var s = ui.stats(d); due += s.due; fresh += s.fresh; tot += s.total; if(s.due) rows.push('• ' + (d.name || 'مجموعة') + ': ' + s.due + ' مستحقة'); }catch(e){} });
    return done('🃏 **بطاقاتك:** ' + tot + ' بطاقة بـ' + decks.length + ' مجموعة.\n' + (due ? '⏰ مستحقة للمراجعة الآن: **' + due + '**\n' + rows.slice(0, 5).join('\n') : '🎉 ما في بطاقات مستحقة الآن.') + (fresh ? '\n🆕 جديدة لسا ما انراجعت: ' + fresh : ''), [go('flashcards', due ? '▶️ ابدأ المراجعة' : 'افتح البطاقات')]);
  }
  function hStudy(c){
    if(!R.studyW.test(c.n)) return null;
    var today = studyMinutes(1), week = studyMinutes(7), month = studyMinutes(30);
    if(!week) return done('⏱️ ما سجّلت أي وقت تركيز آخر 7 أيام. شغّل بومودورو وبحسبلك وقتك تلقائياً.', [go('timer', 'ابدأ جلسة تركيز')]);
    var log = (window.S && window.S.get('studyLog', {})) || {}, best = '', bm = 0, i;
    for(i = 0; i < 7; i++){ var d = addDays(todayStr(), -i), m = parseInt(log[d], 10) || 0; if(m > bm){ bm = m; best = d; } }
    return done('⏱️ **وقت دراستك (من جلسات التركيز):**\n• اليوم: ' + hm(today) + '\n• آخر 7 أيام: ' + hm(week) + ' (معدل ' + hm(Math.round(week / 7)) + ' باليوم)\n• آخر 30 يوم: ' + hm(month) + '\n' + (best ? '🏆 أفضل يوم هالأسبوع: ' + shortDate(best) + ' (' + hm(bm) + ')' : '') + (streak() > 1 ? '\n🔥 سلسلة متواصلة: ' + streak() + ' أيام' : '') + '\n📎 بحسب الجلسات المسجّلة فقط، مش كل دراستك.', [go('timer', 'ابدأ جلسة تركيز')]);
  }
  function hSpendQ(c){
    var n = c.n; if(!(R.spendQ.test(n) || /(كم|شو).*(مصروف|صرفت|دفعت)/.test(n))) return null;
    if((window.BUDGET_CATS || []).some(function(x){ return n.indexOf(norm(x.l)) > -1; }) && /(?:^|\s)(?:على|ع)\s/.test(n)) return null;   /* تجيبها طبقة ai-context للفئات */
    var b = (sp().budget || []).filter(function(x){ return x.type !== 'income'; }), t = todayStr(), from, label;
    if(/(اسبوع)/.test(n)){ from = addDays(t, -6); label = 'آخر 7 أيام'; }
    else if(/(شهر)/.test(n)){ from = t.slice(0, 8) + '01'; label = 'هذا الشهر'; }
    else if(c.date && /(امس|مبارح)/.test(n)){ from = c.date; t = c.date; label = 'أمس'; }
    else { from = t; label = 'اليوم'; }
    var sel = b.filter(function(x){ return x.date >= from && x.date <= t; }), sum = 0, cats = {};
    sel.forEach(function(x){ var a = parseFloat(x.amount) || 0; sum += a; cats[x.category] = (cats[x.category] || 0) + a; });
    if(!sel.length) return done('💸 ما سجّلت مصاريف ' + label + '.', [say('➕ سجّل مصروف', 'صرفت'), go('budget', 'افتح الميزانية')]);
    var top = Object.keys(cats).sort(function(a, b2){ return cats[b2] - cats[a]; }).slice(0, 3);
    return done('💸 **مصروفك ' + label + ': ' + money(sum) + '** (' + sel.length + ' معاملة)\n' + top.map(function(k){ return '• ' + catLabel(k) + ': ' + money(cats[k]); }).join('\n') + '\n📎 من معاملاتك المسجّلة فقط.', [go('budget', 'افتح الميزانية')]);
  }

  /* --- نصيحة مبنية على وضعك + «شو الوضع» --- */
  function statusFacts(){
    var open = openTasks(), late = open.filter(function(t){ return t.due && diff(t.due) < 0; }), ex = upcomingExams()[0], F = [];
    if(late.length) F.push({ w: 3, t: '⚠️ عندك ' + late.length + ' مهمة متأخرة' + (late.length === 1 ? ' («' + late[0].title + '»)' : '') + ' — ابدأ فيها قبل أي شي جديد.' });
    if(ex && diff(ex.date) <= 3) F.push({ w: 3, t: '⏳ «' + ex.name + '»' + (ex.course ? ' (' + ex.course + ')' : '') + ' ' + whenWord(diff(ex.date)) + ' — خصّص له جلسات مراجعة هسا.' });
    else if(ex && diff(ex.date) <= 10) F.push({ w: 1, t: '📅 أقرب امتحان «' + ex.name + '» ' + whenWord(diff(ex.date)) + ' — بلّش بتغطية المادة بدري.' });
    (sp().courses || []).forEach(function(c){ var a = attOf(c); if(a.tot >= 4 && a.pct < 85) F.push({ w: a.pct < 75 ? 3 : 2, t: '✅ حضورك بـ«' + c.name + '» ' + a.pct + '% — ' + (a.pct < 75 ? 'خطر، لا تغيب أكثر.' : 'قريب من الحد، انتبه.') }); });
    var dc = dueCards(); if(dc) F.push({ w: 1, t: '🃏 ' + dc + ' بطاقة مستحقة — 10 دقائق مراجعة بتثبّت المعلومات.' });
    var st = streak(); if(st >= 3) F.push({ w: 0, t: '🔥 ' + st + ' أيام دراسة متواصلة — حافظ عليها.' }); else if(!studyMinutes(3)) F.push({ w: 1, t: '⏱️ ما سجّلت تركيز آخر 3 أيام — جلسة 25 دقيقة اليوم بتبدأ السلسلة.' });
    var bal = 0; (sp().budget || []).forEach(function(b){ var a = parseFloat(b.amount) || 0; bal += b.type === 'income' ? a : -a; });
    if((sp().budget || []).length && bal < 0) F.push({ w: 2, t: '💰 رصيدك بالسالب (' + money(bal) + ') — راجع مصاريفك.' });
    return F.sort(function(a, b){ return b.w - a.w; });
  }
  function hAdvice(c){
    var n = c.n, isStatus = /(?:^|\s)(?:شو|كيف|ايش)\s+(?:الوضع|وضعي|اوضاعي)(?:\s|$)|^(?:وضعي|اوضاعي)$/.test(n);
    if(!(isStatus || /(?:^|\s)(?:نصيحه|نصايح|نصائح|انصحني|تنصحني|اقتراح|اقتراحات|advice|tip|tips)(?:\s|$)/.test(n))) return null;
    var F = statusFacts(), tips = window.STUDY_TIPS || [], tip = tips.length ? tips[Math.floor(Math.random() * tips.length)] : '💡 ابدأ بأصغر خطوة.';
    if(!F.length) return done((isStatus ? '✅ وضعك مرتّب حسب بياناتك: ما في متأخرات ولا امتحانات قريبة.' : '👌 ما لقيت شي مستعجل ببياناتك.') + '\n' + tip, [say('📋 خططلي يومي')]);
    return done((isStatus ? '📌 **وضعك الحالي:**' : '💡 **نصيحتي لك هسا:**') + '\n' + F.slice(0, isStatus ? 5 : 3).map(function(f){ return f.t; }).join('\n') + (isStatus ? '' : '\n\n' + tip) + '\n📎 مبنية على بياناتك المسجّلة فقط.', [say('📋 خططلي يومي'), go('timer', '⏱️ ابدأ جلسة تركيز')]);
  }

  /* --- ملاحظة جديدة بتأكيد --- */
  function addNoteProposal(c){
    return confirmCard('📔 بسجّل ملاحظة:\n**' + c.title + '**' + (c.body && c.body !== c.title ? '\n' + (c.body.length > 120 ? c.body.slice(0, 120) + '…' : c.body) : '') + (c.course ? '\n📚 ' + c.course.name : '') + '\nأأكّد؟', function(){
      if(!Array.isArray(window.notes)) window.notes = [];
      var nt = { title: c.title, body: c.body || c.title, ts: Date.now(), course: c.course ? c.course.name : '' };
      window.notes.unshift(nt); if(window.S) window.S.set('notes', window.notes); if(window.renderNotes) try{ window.renderNotes(); }catch(e){}
      undoable('أُضيفت الملاحظة', function(){ var i = window.notes.indexOf(nt); if(i > -1){ window.notes.splice(i, 1); if(window.S) window.S.set('notes', window.notes); if(window.renderNotes) try{ window.renderNotes(); }catch(e){} } });
      return '✅ تم حفظ الملاحظة.';
    }, '✅ احفظ الملاحظة');
  }

  /* --- معرفة وأسلوب دراسة وتعليمات التطبيق --- */
  function hKnow(c){
    var n = c.n, i;
    for(i = 0; i < TECH.length; i++) if(TECH[i].r.test(n)) return done(TECH[i].t);
    if(KB_CUE.test(n) || /(?:^|\s)(?:vs|مقابل|ضد)(?:\s|$)/.test(n) || /\?$/.test(c.raw.trim()) || c.toks.length <= 3){
      var e = kbFind(n); if(e) return done(e.t, [say('📚 مثال أو توضيح أكثر', 'مثال على ' + (c.toks[c.toks.length - 1] || ''))]);
    }
    return null;
  }
  function hFaq(c){
    var n = c.n, i; if(/(?:^|\s)(?:كيف|وين|شو|ازاي|طريقه|بدي اعرف|اين|ليش|ليه|لماذا|ايش)/.test(n) || c.toks.length <= 4){
      for(i = 0; i < FAQ.length; i++) if(FAQ[i].r.test(n)) return done(FAQ[i].t, /رفع/.test(FAQ[i].t) ? [go('courses', '📚 افتح موادي')] : []);
    }
    return null;
  }

  /* --- تنقّل/مؤقت/وقت --- */
  var OPEN_STRICT = rx(['افتح', 'افتحلي', 'روح', 'خذني', 'وديني', 'انتقل', 'open', 'go to', 'ودي']);
  function hNavStrict(c){ return OPEN_STRICT.test(c.n) ? hNav(c) : null; }     /* أفعال فتح صريحة تتقدّم على الأسئلة (افتح الامتحانات) */
  function hNav(c){
    var n = c.n;
    if(R.timerV.test(n)){ return done('⏱️ يلا نركّز! بفتحلك المؤقت.', [{ label: '▶️ افتح المؤقت', run: function(){ if(window.switchTab) window.switchTab('timer'); } }]); }
    if(R.openV.test(n) && c.toks.length <= 6){
      var i, k; for(i = 0; i < NAV.length; i++) for(k = 0; k < NAV[i].k.length; k++) if(n.indexOf(NAV[i].k[k]) > -1){
        var tab = NAV[i].tab; if(window.switchTab) setTimeout(function(){ try{ window.switchTab(tab); }catch(e){} }, 0);
        return done('📍 فتحت «' + NAV[i].label + '».', [go(tab, 'افتح ' + NAV[i].label)]);
      }
    }
    return null;
  }
  function hTime(c){
    var n = c.n;
    if(R.dateW.test(n)) return done('📅 اليوم: **' + shortDate(todayStr()) + '** (' + todayStr() + ')');
    if(R.timeW.test(n) && c.toks.length <= 4) return done('🕐 الساعة الآن: **' + nowHM() + '**');
    return null;
  }

  /* --- اقتراح قريب عند عدم الفهم --- */
  var HINTS = [
    ['📅 شو عندي اليوم؟', ['اليوم', 'جدول', 'محاضر', 'عندي', 'برنامج']], ['⏳ امتحاناتي', ['امتحان', 'ميد', 'فاينل', 'اختبار']],
    ['📝 مهامي', ['مهام', 'مهمه', 'واجب', 'تسليم']], ['🎯 خطة مراجعة', ['خطه', 'مراجعه', 'ادرس', 'استعداد']],
    ['✅ حضوري', ['حضور', 'غياب', 'غبت']], ['📊 علاماتي', ['علامه', 'علامات', 'معدل', 'درجه']],
    ['💸 كم صرفت هالشهر؟', ['صرفت', 'مصروف', 'ميزانيه', 'فلوس', 'رصيد']], ['🃏 كم بطاقة مستحقة؟', ['بطاق', 'مراجعه', 'فلاش']]
  ];
  function hFallback(c){
    var toks = c.toks.map(stripTok), scored = HINTS.map(function(h){
      var s = 0; h[1].forEach(function(k){ if(toks.some(function(t){ return t.length >= 3 && (t.indexOf(k) === 0 || k.indexOf(t) === 0 || (t.length >= 4 && k.length >= 4 && lev1(t.slice(0, k.length), k))); })) s++; });
      return { l: h[0], s: s };
    }).filter(function(x){ return x.s > 0; }).sort(function(a, b){ return b.s - a.s; }).slice(0, 3);
    if(c.cOwn){
      return done('«' + c.course.name + '» لقيتها 👍 شو بتحب أعرف عنها؟', [say('📊 علاماتي فيها', 'علامات ' + c.course.name), say('✅ حضوري', 'حضوري ' + c.course.name), say('⏳ امتحانها', 'امتحان ' + c.course.name), say('📝 مهامها', 'مهام ' + c.course.name)]);
    }
    if(scored.length) return done('ما كنت متأكد من قصدك 🤔 تقصد واحد من هدول؟', scored.map(function(x){ return say(x.l); }));
    return done('🤔 ما فهمت قصدك. أنا مساعد محلي بجاوب من بيانات تطبيقك (جدول، مهام، امتحانات، حضور، علامات، ميزانية) وبضيف ويحسب ويرتّب، وعندي قاعدة صغيرة بالبرمجة والشبكات والدراسة. جرّب:', [say('📅 شو عندي اليوم؟'), say('📋 خططلي يومي'), say('💡 شو بتعرف تسوي؟')]);
  }

  /* ---------------------------------------------------------- المتابعات القصيرة (وبكرة؟ / وفيزياء؟ / كمان) */
  function onlyCourse(c){     /* الرسالة = اسم المادة فقط (وربما «و/طيب/كمان») — عندها نكمل على آخر موضوع */
    var cw = courseWords(c.cOwn.name);
    return c.toks.map(stripTok).filter(function(t){
      return t && !/^(?:و|طيب|طب|كمان|بس|برضو|ايضا)$/.test(t) && !cw.some(function(w){ return t === w || (t.length >= 4 && w.indexOf(t) === 0) || (w.length >= 4 && t.indexOf(w) === 0) || (t.length >= 5 && w.length >= 5 && lev1(t, w)); });
    }).length === 0;
  }
  function hFollow(c){
    var last = mem.last && mem.last.id, n = c.n;
    if(!last) return null;
    if(R.more.test(n) && c.toks.length <= 3 && last === 'tasks') return hTasks(ctxOf('مهام'));
    if(last === 'agenda' && c.date && c.toks.length <= 4) return hAgenda(ctxOf('شو عندي ' + c.raw));
    if(c.cOwn && onlyCourse(c) && !R.addV.test(n) && !R.doneV.test(n) && !R.spendV.test(n)){
      var m = { exams: 'امتحان ', tasks: 'مهام ', att: 'حضوري ', grades: 'علامات ' }[last];
      if(m) return route(m + c.course.name, true);
    }
    return null;
  }

  /* ---------------------------------------------------------- الموجّه الرئيسي */
  function route(raw, noFollow){
    if(mem.pending && !noFollow) mem.pending.age = (mem.pending.age || 0) + 1;     /* يُحسب عمر السؤال المعلّق بعدد الرسائل */
    var c = ctxOf(raw), r = null, i;
    var chain = [hPending, hCalc, hSmall, hNavStrict, hSpend, hDone, hAdd, hNextLec, hDayPlan, hStudyPlan, hAgenda, hExams, hTasks, hAttendance, hGrades, hCards, hStudy, hSpendQ, hAdvice, hFaq, hCourses, hNav, hKnow, hTime];
    if(!noFollow) chain.splice(1, 0, hFollow);
    for(i = 0; i < chain.length; i++){
      try{ r = chain[i](c); }catch(e){ console.warn('ai handler', chain[i].name, e); r = null; }
      if(r) return r;
    }
    return hFallback(c);
  }

  window.aiRespond = function(text){
    var t = String(text || '').trim();
    if(!t) return 'اكتب سؤالك 🙂';
    if(t.length > 400) t = t.slice(0, 400);
    var r = route(t);
    window.aiSetActions(r.a || []);
    return r.t;
  };
  window.aiBrain = { norm: norm, pickDate: pickDate, pickTime: pickTime, findCourse: findCourse, calc: calc, mem: mem, route: route };

  /* ---------------------------------------------------------- الواجهة */
  var HIST_KEY = 'ss_ai_hist';
  function loadHist(){ try{ var a = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(a) ? a.slice(-40) : []; }catch(e){ return []; } }
  function saveHist(a){ try{ localStorage.setItem(HIST_KEY, JSON.stringify(a.slice(-40))); }catch(e){} }
  window.aiClearHistory = function(){ try{ localStorage.removeItem(HIST_KEY); }catch(e){} mem.pending = null; mem.last = null; };
  function render(t){
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
  }

  window.bindAIEvents = function(){
    var fab = document.getElementById('aiFab'), panel = document.getElementById('aiPanel'), closeBtn = document.getElementById('aiClose'),
        send = document.getElementById('aiSend'), input = document.getElementById('aiInput'), msgs = document.getElementById('aiMessages'), sugg = document.getElementById('aiSuggestions');
    if(!fab || !panel) return;
    if(fab._aiBound) return;
    fab._aiBound = true;
    var hist = loadHist(), restored = false, sentLog = [], sentIdx = -1;
    if(input){ input.setAttribute('maxlength', '400'); input.setAttribute('autocomplete', 'off'); }

    var suggestions = ['📋 خططلي يومي', '📅 شو عندي اليوم؟', '⏳ امتحاناتي', '🃏 كم بطاقة مستحقة؟', '💡 شو بتعرف تسوي؟'];

    function addMsg(text, cls, noSave){
      if(!msgs) return null;
      var div = document.createElement('div');
      div.className = 'ai-msg ' + cls;
      div.innerHTML = cls === 'bot' ? render(text) : esc(text);
      if(cls === 'bot'){
        var cp = document.createElement('button'); cp.type = 'button'; cp.className = 'ai-copy'; cp.title = 'نسخ الرد'; cp.setAttribute('aria-label', 'نسخ الرد'); cp.textContent = '⧉';
        cp.addEventListener('click', function(){ if(window.copyText) window.copyText(text.replace(/\*\*/g, ''), 'تم نسخ الرد'); });
        div.appendChild(cp);
      }
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      if(!noSave){ hist.push({ c: cls, t: text }); saveHist(hist); }
      return div;
    }
    function attachActions(div, acts){
      if(!acts || !acts.length || !div) return;
      var row = document.createElement('div'); row.className = 'ai-actions';
      acts.forEach(function(a){
        var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ai-act' + (a.cls ? ' ' + a.cls : ''); btn.textContent = a.label;
        btn.addEventListener('click', function(){
          if(a.say){ sendMessage(a.say); return; }
          if(a.once){ row.querySelectorAll('button').forEach(function(b){ b.disabled = true; }); }
          var out; try{ out = a.run(); }catch(e){ console.warn(e); }
          if(typeof out === 'string'){ addMsg(out, 'bot'); }
          else if(panel.classList.contains('show') && window.innerWidth <= 900 && !a.once) panel.classList.remove('show');
        });
        row.appendChild(btn);
      });
      div.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
    }
    function showTyping(){
      var d = document.createElement('div'); d.className = 'ai-msg bot ai-typing'; d.setAttribute('aria-label', 'المساعد يكتب'); d.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d;
    }
    function sendMessage(txt){
      txt = String(txt || '').trim();
      if(!txt) return;
      addMsg(txt, 'user');
      sentLog.push(txt); sentIdx = sentLog.length;
      if(input) input.value = '';
      var typing = showTyping(), reply = window.aiRespond(txt), acts = window.aiTakeActions ? window.aiTakeActions() : [];
      setTimeout(function(){
        if(typing.parentNode) typing.remove();
        attachActions(addMsg(reply, 'bot'), acts);
      }, Math.min(450, 180 + reply.length));
    }
    window.aiSend = sendMessage;

    function open(){
      panel.classList.add('show');
      if(msgs && !msgs.children.length){
        if(hist.length && !restored){
          restored = true; hist.forEach(function(h){ addMsg(h.t, h.c, true); });
          var sep = document.createElement('div'); sep.className = 'ai-sep'; sep.textContent = 'محادثتك السابقة ↑'; msgs.appendChild(sep);
        } else addMsg('أهلاً! 👋 أنا مساعدك الدراسي. اسألني عن جدولك أو امتحاناتك، أو قلّي «ضيف واجب شبكات بكرة»، أو «خططلي يومي».', 'bot');
      }
      if(sugg && !sugg.children.length){
        sugg.innerHTML = suggestions.map(function(s){ return '<button class="ai-suggestion">' + s + '</button>'; }).join('');
        sugg.querySelectorAll('.ai-suggestion').forEach(function(b){ b.addEventListener('click', function(){ sendMessage(b.textContent.replace(/^[^\s]+\s*/, '')); }); });
      }
      setTimeout(function(){ if(input && panel.classList.contains('show')) try{ input.focus(); }catch(e){} }, 120);
    }
    fab.addEventListener('click', function(){ if(panel.classList.contains('show')) panel.classList.remove('show'); else open(); });
    if(closeBtn) closeBtn.addEventListener('click', function(){ panel.classList.remove('show'); });
    if(send) send.addEventListener('click', function(){ sendMessage(input.value); });
    if(input) input.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.isComposing){ e.preventDefault(); sendMessage(input.value); }
      else if(e.key === 'ArrowUp' && sentLog.length && !input.value){ e.preventDefault(); sentIdx = Math.max(0, sentIdx - 1); input.value = sentLog[sentIdx] || ''; }
      else if(e.key === 'ArrowDown' && sentIdx >= 0){ e.preventDefault(); sentIdx = Math.min(sentLog.length, sentIdx + 1); input.value = sentLog[sentIdx] || ''; }
    });
  };

  console.log('🤖 ai.js loaded');
})();
