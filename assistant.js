/* ============================================================
   assistant.js — المساعد الذكي الجديد (عبر n8n)
   الموقع ← n8n Webhook «assistant» ← Gemini ← n8n ← الموقع.
   • بيبعت سؤالك + آخر الرسائل + ملخص مضغوط من بياناتك الدراسية (بعد موافقة مرة وحدة).
   • الرد ممكن يقترح إجراءات <actions>[...]</actions> بتطلع كأزرار تأكيد — ما بينفّذ إشي لحاله.
   • الواجهة: نفس لوحة #aiPanel بـindex.html (الزر #aiFab بيفتحها، وFocusUI بيناديها).
   ============================================================ */
(function(){
  'use strict';
  if(window.Assistant) return;
  var W = window, d = document;
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var HKEY = 'ss_asst_hist', CKEY = 'ss_asst_consent';
  function sp(){ return W.space || {}; }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(x){ return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v){ try{ if(v === undefined) return localStorage.getItem(k); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){ return null; } }

  /* ملخص البيانات — مضغوط ومحدود الحجم */
  function context(){
    var s = sp(), now = new Date(), t = ymd(now), out = {};
    out.now = t + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ' (' + DAYS[now.getDay()] + ')';
    if(s.profile && s.profile.name) out.name = s.profile.name;
    var att = s.attendance || {}, grades = s.grades || [];
    out.courses = (s.courses || []).filter(function(c){ return c && c.name && !c.completed; }).map(function(c){
      var g = (grades.filter(function(x){ return x && x.name === c.name; })[0] || {}).items || [], got = 0, of = 0;
      g.forEach(function(x){ var w = parseFloat(x.weight) || 0, sc = parseFloat(x.score); if(w > 0 && isFinite(sc)){ got += sc; of += w; } });
      var a = att[c.name] || {};
      return { n: c.name, h: c.hours || undefined, marks: of ? got + '/' + of : undefined, att: (a.present || a.absent) ? (a.present || 0) + ' حضور/' + (a.absent || 0) + ' غياب' : undefined };
    });
    try{ out.timetable = (W.Schedule && W.Schedule.entries ? W.Schedule.entries() : []).slice(0, 40).map(function(e){ function hm(m){ return pad(Math.floor(m / 60)) + ':' + pad(m % 60); } return [e.day, e.name, hm(e.start), hm(e.end), e.room || ''].join(' | '); }); }catch(e){}
    out.tasks = (s.tasks || []).filter(function(x){ return x && !x.done; }).sort(function(a, b){ return String(a.due || '9') < String(b.due || '9') ? -1 : 1; }).slice(0, 40)
      .map(function(x){ return { id: x.id, t: x.title, due: x.due || undefined, c: x.course || undefined, hi: x.priority === 'high' || undefined }; });
    out.doneTasksRecent = (s.tasks || []).filter(function(x){ return x && x.done; }).slice(-8).map(function(x){ return x.title; });
    out.exams = (s.exams || []).filter(function(x){ return x && x.date >= t; }).sort(function(a, b){ return a.date < b.date ? -1 : 1; }).slice(0, 15).map(function(x){ return { id: x.id, n: x.name, c: x.course, d: x.date, tm: x.time || undefined, room: x.room || undefined }; });
    var mon = t.slice(0, 7), inc = 0, exp = 0; (s.budget || []).forEach(function(b){ if(b && String(b.date || '').slice(0, 7) === mon){ if(b.type === 'income') inc += +b.amount || 0; else exp += +b.amount || 0; } });
    if(inc || exp) out.budgetThisMonth = { income: inc, expense: exp };
    try{ if(W.DayPlan && W.DayPlan.streakInfo) out.streak = W.DayPlan.streakInfo(now).cur; }catch(e){}
    try{ var log = W.S && W.S.get ? W.S.get('studyLog', {}) : {}, wk = 0; for(var i = 0; i < 7; i++){ wk += +log[ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i))] || 0; } out.studyMin7d = Math.round(wk); }catch(e){}
    try{ var rows = W.gpaRows || [], G = W.GRADES || {}, pts = 0, hrs = 0; rows.forEach(function(r){ var h = +r.hrs || 0; if(h && r.name){ pts += h * (G[r.grade] || 0); hrs += h; } }); if(hrs) out.gpaCalc = (pts / hrs).toFixed(2); }catch(e){}
    try{ if(W.getCompletedCourses) out.completedCourses = Object.keys(W.getCompletedCourses() || {}).length; }catch(e){}
    var j = JSON.stringify(out);
    return j.length > 14000 ? j.slice(0, 14000) : j;
  }

  function parse(raw){
    raw = String(raw).replace(/<think>[\s\S]*?<\/think>/g, '');
    var acts = [], m = String(raw).match(/<actions>([\s\S]*?)<\/actions>/), txt = String(raw).replace(/<actions>[\s\S]*?<\/actions>/g, '').trim();
    if(m){ try{ var arr = JSON.parse(m[1]); if(Array.isArray(arr)) arr.slice(0, 6).forEach(function(a){ var b = toAction(a); if(b) acts.push(b); }); }catch(e){} }
    return { text: txt || 'تمام.', acts: acts };
  }
  function uid(){ return W.uid ? W.uid() : String(Date.now()) + Math.random().toString(36).slice(2, 6); }
  function save(){ if(W.saveSpace) W.saveSpace(); try{ if(W.renderAll) W.renderAll(); }catch(e){} }
  function okDate(d){ return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')); }
  function toAction(a){
    if(!a || typeof a !== 'object') return null;
    var s = sp();
    if(a.type === 'task' && a.title) return { label: '➕ أضف مهمة: ' + String(a.title).slice(0, 40), once: true, run: function(){
      s.tasks = s.tasks || []; s.tasks.push({ id: uid(), title: String(a.title).slice(0, 120), type: 'task', course: String(a.course || ''), due: okDate(a.due) ? a.due : ymd(new Date()), done: false, priority: a.priority === 'high' ? 'high' : 'normal' }); save(); return '✅ انضافت المهمة.'; } };
    if(a.type === 'exam' && a.name && okDate(a.date)) return { label: '📝 أضف امتحان: ' + String(a.name).slice(0, 30) + ' · ' + a.date, once: true, run: function(){
      s.exams = s.exams || []; s.exams.push({ id: uid(), name: String(a.name).slice(0, 80), course: String(a.course || ''), date: a.date, time: /^\d{1,2}:\d{2}$/.test(a.time || '') ? a.time : '', room: '' }); save(); return '✅ انضاف الامتحان.'; } };
    if(a.type === 'expense' && +a.amount > 0) return { label: '💸 سجّل مصروف ' + (+a.amount) + (a.category ? ' · ' + String(a.category).slice(0, 20) : ''), once: true, run: function(){
      s.budget = s.budget || []; s.budget.push({ id: uid(), type: 'expense', category: String(a.category || 'أخرى').slice(0, 30), amount: +a.amount, date: ymd(new Date()), note: String(a.note || '').slice(0, 80) }); save(); return '✅ انسجل المصروف.'; } };
    if(a.type === 'done' && a.id){ var t = (s.tasks || []).filter(function(x){ return String(x.id) === String(a.id); })[0]; if(t && !t.done) return { label: '✓ خلّص: ' + String(t.title).slice(0, 40), once: true, run: function(){ if(W.toggleTask) W.toggleTask(t.id); return '✅ تمام.'; } }; }
    if(a.type === 'go' && a.view && W.FocusUI) return { label: '↗ افتح ' + a.view, run: function(){ W.FocusUI.go(String(a.view)); var p = document.querySelector('.ai-panel'); if(p && W.innerWidth <= 900) p.classList.remove('show'); } };
    return null;
  }

  /* ---------- المحادثة ---------- */
  var hist = []; try{ hist = JSON.parse(ls(HKEY) || '[]') || []; }catch(e){ hist = []; }
  function saveHist(){ ls(HKEY, JSON.stringify(hist.slice(-20))); }

  /* Markdown بسيط وآمن: **عريض** · قوائم · أسطر */
  function md(t){
    function fmt(x){ return x.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>'); }
    var out = '', inList = false;
    esc(t).split(/\n/).forEach(function(l){
      var m = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
      if(m){ if(!inList){ out += '<ul>'; inList = true; } out += '<li>' + fmt(m[1]) + '</li>'; }
      else { if(inList){ out += '</ul>'; inList = false; } if(l.trim()) out += '<p>' + fmt(l) + '</p>'; }
    });
    return out + (inList ? '</ul>' : '');
  }
  function el(){ return { panel: d.getElementById('aiPanel'), msgs: d.getElementById('aiMessages'), input: d.getElementById('aiInput'), send: d.getElementById('aiSend'), sugg: d.getElementById('aiSuggestions'), fab: d.getElementById('aiFab'), close: d.getElementById('aiClose') }; }
  function addMsg(role, html, extraCls){
    var E = el(); if(!E.msgs) return null;
    var m = d.createElement('div'); m.className = 'ai-msg ' + (role === 'user' ? 'user' : 'bot') + (extraCls ? ' ' + extraCls : '');
    m.innerHTML = html; E.msgs.appendChild(m); E.msgs.scrollTop = E.msgs.scrollHeight; return m;
  }
  function welcome(){
    var E = el(); if(!E.msgs) return;
    E.msgs.innerHTML = '';
    var w = d.createElement('div'); w.className = 'asst-welcome';
    w.innerHTML = '<div class="asst-logo">✦</div><b>أهلين! أنا مساعد مساحتي</b><p>اسألني عن جدولك، امتحاناتك، مهامك أو كيف تذاكر — بفهم وضعك من بياناتك.</p>' +
      '<span class="asst-badge">' + (W.N8n && W.N8n.enabled() ? 'مدعوم بـ n8n + Gemini' : 'الخدمة مش مربوطة حالياً') + '</span>';
    E.msgs.appendChild(w);
    hist.forEach(function(x){ addMsg(x.role, x.role === 'user' ? esc(x.content) : md(parse(x.content).text)); });
  }
  function suggestions(){
    var E = el(); if(!E.sugg) return;
    var s = sp(), t = ymd(new Date()), list = [];
    var late = (s.tasks || []).some(function(x){ return x && !x.done && x.due && x.due < t; });
    var ex = (s.exams || []).filter(function(x){ return x && x.date >= t; }).sort(function(a, b){ return a.date < b.date ? -1 : 1; })[0];
    list.push('شو عندي اليوم؟');
    if(ex) list.push('اعملي خطة مراجعة لـ' + String(ex.name || 'الامتحان').slice(0, 30));
    if(late) list.push('عندي مهام متأخرة، رتّبلي أولوياتي');
    list.push('خطّطلي باقي يومي', 'نصيحة للتركيز');
    E.sugg.innerHTML = list.slice(0, 4).map(function(q){ return '<button type="button" class="ai-suggestion">' + esc(q) + '</button>'; }).join('');
  }
  function busy(on){ var E = el(); if(E.send) E.send.disabled = on; if(E.input) E.input.disabled = on; }

  function consent(cb){
    if(ls(CKEY) === '1'){ cb(); return; }
    var msg = 'المساعد بيبعت سؤالك مع ملخص من بياناتك الدراسية (مواد، جدول، مهام، امتحانات، علامات، حضور) لخادم n8n، ومنه لـGoogle Gemini عشان يجاوبك. ما بيتخزّن إشي غير سؤالك وجوابه. موافق؟';
    var yes = function(){ ls(CKEY, '1'); cb(); };
    if(W.customConfirm) W.customConfirm(msg, yes, { danger: false, okLabel: 'موافق', title: 'المساعد الذكي' }); else if(W.confirm(msg)) yes();
  }

  function send(text){
    text = String(text || '').trim(); if(!text) return;
    var E = el(); if(E.input) E.input.value = '';
    consent(function(){
      var w = E.msgs && E.msgs.querySelector('.asst-welcome'); if(w && hist.length === 0) w.classList.add('mini');
      addMsg('user', esc(text));
      var typing = addMsg('bot', '<span></span><span></span><span></span>', 'ai-typing');
      busy(true);
      var slow = setTimeout(function(){ if(typing && typing.parentNode) typing.setAttribute('data-slow', 'الخادم بيصحى… لحظات'); }, 6000);
      var history = hist.slice(-8).map(function(x){ return { role: x.role, content: String(x.content).slice(0, 1200) }; });
      var ctx = context();
      /* النموذج الخفيف أسرع (~1 ث) ورده كافي للمساعد؛ لو مشغول/بطيء نعيد مرة على النموذج الأساسي */
      W.N8n.ask(text, history, ctx, 'gemini-flash-lite-latest').catch(function(e){
        if(e && (e.code === 'timeout' || [429, 500, 502, 503, 504].indexOf(e.status) >= 0)) return W.N8n.ask(text, history, ctx, 'gemini-flash-latest');
        throw e;
      }).then(function(j){
        var raw = String(j.answer || j.text || j.output || ''), p = parse(raw);
        hist.push({ role: 'user', content: text }, { role: 'assistant', content: raw }); saveHist();
        if(typing.parentNode) typing.remove();
        var m = addMsg('bot', md(p.text));
        if(m && p.acts.length){
          var box = d.createElement('div'); box.className = 'ai-acts';
          p.acts.forEach(function(a){ var b = d.createElement('button'); b.type = 'button'; b.className = 'ai-act'; b.textContent = a.label;
            b.addEventListener('click', function(){ var r = a.run(); if(a.once){ b.disabled = true; b.textContent = r || '✓'; } }); box.appendChild(b); });
          m.appendChild(box);
        }
      }).catch(function(e){
        if(typing.parentNode) typing.remove();
        addMsg('bot', '<p>⚠️ ' + esc(W.N8n.explain(e)) + '</p>', 'err');
      }).then(function(){ clearTimeout(slow); busy(false); var i = el().input; if(i) i.focus(); });
    });
  }

  function open(text){
    var E = el(); if(!E.panel) return;
    bind();
    if(!E.panel.classList.contains('show')){ E.panel.classList.add('show'); welcome(); suggestions(); }
    if(text) send(text); else setTimeout(function(){ if(E.input) E.input.focus(); }, 80);
  }
  function close(){ var E = el(); if(E.panel) E.panel.classList.remove('show'); }
  function clear(){ hist = []; saveHist(); welcome(); }

  var bound = false;
  function bind(){
    if(bound) return; var E = el(); if(!E.panel || !E.fab) return; bound = true;
    E.fab.addEventListener('click', function(){ if(E.panel.classList.contains('show')) close(); else open(); });
    if(E.close) E.close.addEventListener('click', close);
    if(E.send) E.send.addEventListener('click', function(){ send(E.input.value); });
    if(E.input) E.input.addEventListener('keydown', function(e){ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(E.input.value); } });
    if(E.sugg) E.sugg.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.ai-suggestion'); if(b) send(b.textContent); });
    d.addEventListener('keydown', function(e){ if(e.key === 'Escape' && E.panel.classList.contains('show') && !d.querySelector('.modal-backdrop,.hub-sheet-backdrop')) close(); });
    /* زر مسح المحادثة بالرأس */
    var head = E.panel.querySelector('.ai-header');
    if(head && !d.getElementById('aiClear')){ var c = d.createElement('button'); c.type = 'button'; c.id = 'aiClear'; c.className = 'ai-close'; c.title = 'محادثة جديدة'; c.setAttribute('aria-label', 'محادثة جديدة'); c.textContent = '↺'; c.addEventListener('click', clear); head.insertBefore(c, E.close); }
    var nm = E.panel.querySelector('.ai-name'), stt = E.panel.querySelector('.ai-status');
    if(nm) nm.textContent = 'مساعد مساحتي'; if(stt) stt.textContent = W.N8n && W.N8n.enabled() ? 'n8n · Gemini' : 'غير مربوط';
    var av = E.panel.querySelector('.ai-avatar'); if(av) av.textContent = '✦';
    if(E.input) E.input.placeholder = 'اسألني أي إشي عن دراستك…';
  }
  if(d.readyState === 'loading') d.addEventListener('DOMContentLoaded', bind); else bind();

  W.Assistant = { open: open, close: close, send: send, clear: clear, bind: bind, context: context, parse: parse };
})();
