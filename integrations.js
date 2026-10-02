/* ============================================================
   🔗 integrations.js v3 — Part 1 + Part 2 + Smart Timetable v7
   ============================================================ */
(function(){
  'use strict';
  if(window._integrationsLoaded) return;
  window._integrationsLoaded = true;

  /* ============ Helpers ============ */
  function esc(s){
    return window.esc ? window.esc(s) : String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function uid(){ return window.uid ? window.uid() : Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function toast(m, t, d){ if(window.toast) window.toast(m, t, d); }
  function saveSpace(){ if(window.saveSpace) window.saveSpace(); }
  function today(){
    if(window.today) return window.today();
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function space(){ return window.space || {}; }
  function getS(){ return window.S || { get:function(k,d){return d;}, set:function(){} }; }
  function pad2(n){ return String(n).padStart(2, '0'); }
  function localDate(d){
    if(!(d instanceof Date)) d = new Date(d);
    return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
  }

  /* ============================================================
     showModal
     ============================================================ */
  window.showModal = function(title, fields, values, onSubmit, onDelete){
    document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop show';
    var fieldsHtml = '';
    fields.forEach(function(f){
      var val = values[f.key] !== undefined ? values[f.key] : '';
      var inputHtml;
      if(f.type === 'select'){
        var opts = '';
        f.options.forEach(function(o){
          opts += '<option value="' + esc(o.v) + '"' + (String(val) === String(o.v) ? ' selected' : '') + '>' + esc(o.l) + '</option>';
        });
        inputHtml = '<select id="mf_' + f.key + '">' + opts + '</select>';
      } else if(f.type === 'textarea'){
        inputHtml = '<textarea id="mf_' + f.key + '" rows="3">' + esc(val) + '</textarea>';
      } else {
        inputHtml = '<input id="mf_' + f.key + '" type="' + (f.type || 'text') + '" value="' + esc(val) + '" placeholder="' + esc(f.placeholder || '') + '">';
      }
      fieldsHtml += '<div class="form-group"><label>' + esc(f.label) + '</label>' + inputHtml + '</div>';
    });
    bd.innerHTML = '<div class="modal"><h3>' + esc(title) + '</h3>' + fieldsHtml +
      '<div class="modal-actions">' +
        (onDelete ? '<button class="btn btn-sm btn-danger" id="mDel">🗑 حذف</button>' : '') +
        '<button class="btn btn-sm btn-ghost" id="mCancel">إلغاء</button>' +
        '<button class="btn btn-sm" id="mSave">حفظ</button>' +
      '</div></div>';
    document.body.appendChild(bd);

    function close(){ bd.remove(); }
    bd.querySelector('#mCancel').onclick = close;
    bd.onclick = function(e){ if(e.target === bd) close(); };

    bd.querySelector('#mSave').onclick = function(){
      var data = {};
      fields.forEach(function(f){
        var el = document.getElementById('mf_' + f.key);
        data[f.key] = el ? el.value.trim() : '';
      });
      var result;
      try{ result = onSubmit(data); }
      catch(e){ console.error('showModal error:', e); return; }
      if(result === false) return;
      close();
    };
    if(onDelete) bd.querySelector('#mDel').onclick = function(){ onDelete(); close(); };
    setTimeout(function(){
      var i = bd.querySelector('input,textarea') || bd.querySelector('select');
      if(i) i.focus();
    }, 100);
  };

  /* ============================================================
     parseQuickCapture
     ============================================================ */
  window.parseQuickCapture = function(text){
    var t = String(text || '').trim();
    if(!t) return null;

    var result = { type:'task', title:t, due:'', amount:0, category:'other-expense', note:'' };

    if(/^\s*(امتحان|اختبار|exam|فاينل)/i.test(t)){
      result.type = 'exam';
      result.title = t.replace(/^\s*(امتحان|اختبار|exam|فاينل)\s*/i, '').trim();
    } else if(/^\s*(واجب|مهمة|task|assignment|homework|هومورك)/i.test(t)){
      result.type = 'task';
      result.title = t.replace(/^\s*(واجب|مهمة|task|assignment|homework|هومورك)\s*/i, '').trim();
    } else if(/^\s*(مصروف|صرفت|دفعت|expense|صرف)/i.test(t)){
      result.type = 'expense';
      result.title = t.replace(/^\s*(مصروف|صرفت|دفعت|expense|صرف)\s*/i, '').trim();
    } else if(/^\s*(دخل|راتب|income|وارد)/i.test(t)){
      result.type = 'income';
      result.title = t.replace(/^\s*(دخل|راتب|income|وارد)\s*/i, '').trim();
    } else if(/^\s*(ملاحظة|note|مذكرة)\s*:?/i.test(t)){
      result.type = 'note';
      result.title = t.replace(/^\s*(ملاحظة|note|مذكرة)\s*:?\s*/i, '').trim();
    }

    if(result.type === 'expense' || result.type === 'income'){
      var amtMatch = t.match(/(\d+(?:\.\d+)?)\s*(?:د(?:ينار)?|jd|دولار|\$|usd)?/i);
      if(amtMatch) result.amount = parseFloat(amtMatch[1]) || 0;
    }

    var todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    var dateStr = '';

    if(/اليوم|today/i.test(t)){
      dateStr = localDate(todayDate);
    } else if(/بعد\s*غد|day after/i.test(t)){
      var d2 = new Date(todayDate); d2.setDate(d2.getDate() + 2);
      dateStr = localDate(d2);
    } else if(/غد|بكرة|tomorrow/i.test(t)){
      var tm = new Date(todayDate); tm.setDate(tm.getDate() + 1);
      dateStr = localDate(tm);
    } else {
      var afterMatch = t.match(/بعد\s*(\d+)\s*(يوم|أيام|ايام|day)/);
      if(afterMatch){
        var d3 = new Date(todayDate);
        d3.setDate(d3.getDate() + parseInt(afterMatch[1], 10));
        dateStr = localDate(d3);
      } else {
        var dateMatch = t.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{2,4}))?/);
        if(dateMatch){
          var dd = parseInt(dateMatch[1], 10);
          var mm = parseInt(dateMatch[2], 10);
          var yr = dateMatch[3] ? parseInt(dateMatch[3], 10) : todayDate.getFullYear();
          if(yr < 100) yr += 2000;
          if(dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12){
            var dt = new Date(yr, mm - 1, dd);
            if(!dateMatch[3] && dt.getTime() < todayDate.getTime()) dt.setFullYear(yr + 1);
            dateStr = localDate(dt);
          }
        } else {
          var dayNames = {
            'الأحد':0,'الاحد':0,'sunday':0,
            'الاثنين':1,'monday':1,
            'الثلاثاء':2,'tuesday':2,
            'الأربعاء':3,'الاربعاء':3,'wednesday':3,
            'الخميس':4,'thursday':4,
            'الجمعة':5,'friday':5,
            'السبت':6,'saturday':6
          };
          var lowerT = t.toLowerCase();
          for(var dn in dayNames){
            if(t.indexOf(dn) > -1 || lowerT.indexOf(dn) > -1){
              var target = dayNames[dn];
              var cur = todayDate.getDay();
              var diff = (target - cur + 7) % 7;
              if(diff === 0) diff = 7;
              var dt2 = new Date(todayDate);
              dt2.setDate(dt2.getDate() + diff);
              dateStr = localDate(dt2);
              break;
            }
          }
        }
      }
    }
    if(dateStr) result.due = dateStr;

    result.title = result.title
      .replace(/^\s*(امتحان|اختبار|exam|فاينل|واجب|مهمة|task|assignment|homework|هومورك|مصروف|صرفت|دفعت|expense|صرف|دخل|راتب|income|وارد|ملاحظة|note|مذكرة)\s*:?\s*/i, '')
      .replace(/\d{1,2}\s*[\/\-]\s*\d{1,2}(?:\s*[\/\-]\s*\d{2,4})?/g, '')
      .replace(/(\d+(?:\.\d+)?)\s*(?:د(?:ينار)?|jd|دولار|\$|usd)(\s|$)/gi, ' ')
      .replace(/(^|\s)(اليوم|today)(\s|$)/gi, ' ')
      .replace(/(^|\s)(غدًا|غدا|بكرة|tomorrow)(\s|$)/gi, ' ')
      .replace(/(^|\s)(بعد\s*غد|day after)(\s|$)/gi, ' ')
      .replace(/(^|\s)بعد\s*(\d+)\s*(يوم|أيام|ايام|day)(\s|$)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if(!result.title) result.title = t;

    if(result.type === 'expense'){
      if(/بنزين|بترول|وقود|ديزل|مواصلات|باص|تاكسي|أوبر|كريم|مترو|transport|fuel|gas|uber|careem/i.test(t)) result.category = 'transport';
      else if(/طعام|أكل|مطعم|بقالة|سوبر|food|قهوة|كافيه|ساندويش|فطور|غدا|عشا/i.test(t)) result.category = 'food';
      else if(/(^|\s)بن(\s|$)/i.test(t)) result.category = 'food';
      else if(/كتاب|قرطاسية|books/i.test(t)) result.category = 'books';
      else if(/إنترنت|انترنت|شحن|رصيد|internet/i.test(t)) result.category = 'internet';
      else if(/دواء|صحة|health/i.test(t)) result.category = 'health';
      else if(/ملابس|clothing/i.test(t)) result.category = 'clothing';
      else if(/ترفيه|لعبة|سينما|entertainment/i.test(t)) result.category = 'entertainment';
      else result.category = 'other-expense';
    }
    if(result.type === 'income'){
      if(/راتب|salary/i.test(t)) result.category = 'salary';
      else if(/منحة|scholarship/i.test(t)) result.category = 'scholarship';
      else if(/عمل حر|فريلانس|freelance/i.test(t)) result.category = 'freelance';
      else if(/دعم|أهل|عائلة|family/i.test(t)) result.category = 'family';
      else result.category = 'other-income';
    }

    return result;
  };

  /* ============================================================
     Quick Capture
     ============================================================ */
  window.openQuickCapture = function(){
    document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop show';
    bd.innerHTML =
      '<div class="modal quick-capture-modal">' +
        '<div class="qc-header">' +
          '<div class="qc-icon">⚡</div>' +
          '<div><div class="qc-title">إضافة سريعة</div>' +
          '<div class="qc-sub">اكتب أي شي — مهمة، امتحان، مصروف، ملاحظة</div></div>' +
        '</div>' +
        '<input type="text" class="qc-input" id="qcInput" placeholder="مثال: واجب رياضيات يوم الأحد" autocomplete="off">' +
        '<div class="qc-hints">' +
          '<button class="qc-hint" data-qc-hint="واجب شبكات غدًا">📝 مهمة</button>' +
          '<button class="qc-hint" data-qc-hint="امتحان شبكات 15/5">⏳ امتحان</button>' +
          '<button class="qc-hint" data-qc-hint="صرفت 20 د أكل">💰 مصروف</button>' +
          '<button class="qc-hint" data-qc-hint="ملاحظة: راجعت الفصل 3">📔 ملاحظة</button>' +
        '</div>' +
        '<div class="qc-preview" id="qcPreview"></div>' +
        '<div class="qc-actions">' +
          '<button class="btn btn-ghost btn-sm" id="qcCancel">إلغاء</button>' +
          '<button class="btn btn-sm" id="qcSave" disabled>💾 حفظ</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bd);

    var input = bd.querySelector('#qcInput');
    var preview = bd.querySelector('#qcPreview');
    var saveBtn = bd.querySelector('#qcSave');
    var currentParsed = null;

    function renderPreview(){
      var text = input.value.trim();
      if(!text){ preview.classList.remove('show'); saveBtn.disabled = true; currentParsed = null; return; }
      var p = window.parseQuickCapture(text);
      currentParsed = p;
      if(!p){ preview.classList.remove('show'); saveBtn.disabled = true; return; }
      var typeLabel = { task:'📝 مهمة', exam:'⏳ امتحان', expense:'💰 مصروف', income:'📈 دخل', note:'📔 ملاحظة' }[p.type] || '—';
      var rows = '<div class="qc-preview-row"><span class="qc-preview-label">النوع</span><span class="qc-preview-val">' + typeLabel + '</span></div>';
      rows += '<div class="qc-preview-row"><span class="qc-preview-label">العنوان</span><span class="qc-preview-val">' + esc(p.title) + '</span></div>';
      if(p.due) rows += '<div class="qc-preview-row"><span class="qc-preview-label">التاريخ</span><span class="qc-preview-val">' + p.due + '</span></div>';
      if(p.amount > 0) rows += '<div class="qc-preview-row"><span class="qc-preview-label">المبلغ</span><span class="qc-preview-val">' + p.amount + ' د</span></div>';
      preview.innerHTML = rows;
      preview.classList.add('show');
      saveBtn.disabled = false;
    }

    input.addEventListener('input', renderPreview);
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); if(!saveBtn.disabled) saveBtn.click(); }
    });

    bd.querySelectorAll('[data-qc-hint]').forEach(function(b){
      b.addEventListener('click', function(){
        input.value = b.dataset.qcHint; input.focus(); renderPreview();
      });
    });

    bd.querySelector('#qcCancel').onclick = function(){ bd.remove(); };
    bd.onclick = function(e){ if(e.target === bd) bd.remove(); };

    saveBtn.onclick = function(){
      if(!currentParsed) return;
      var p = currentParsed;
      try{
        var sp = window.space;
        if(p.type === 'task'){
          if(!sp.tasks) sp.tasks = [];
          sp.tasks.push({ id: uid(), title: p.title, type:'task', course:'', due: p.due || '', done: false });
          saveSpace();
          if(window.renderTasks) window.renderTasks();
          if(window.renderDashboard) window.renderDashboard();
          toast('✓ أُضيفت مهمة: ' + p.title, 'success', 2000);
        } else if(p.type === 'exam'){
          if(!p.due){ p.due = today(); }
          if(!sp.exams) sp.exams = [];
          sp.exams.push({ id: uid(), name: p.title, course:'', date: p.due, time:'', room:'' });
          saveSpace();
          if(window.renderExams) window.renderExams();
          if(window.renderDashboard) window.renderDashboard();
          toast('✓ أُضيف امتحان: ' + p.title, 'success', 2000);
        } else if(p.type === 'expense' || p.type === 'income'){
          if(!p.amount){ toast('⚠️ لم أجد المبلغ', 'warn', 2500); return; }
          if(!sp.budget) sp.budget = [];
          sp.budget.push({ id: uid(), type: p.type, category: p.category, amount: p.amount, date: today(), note: p.title });
          saveSpace();
          if(window.renderBudget) window.renderBudget();
          if(window.renderDashboard) window.renderDashboard();
          toast('✓ أُضيف ' + (p.type === 'expense' ? 'مصروف' : 'دخل') + ': ' + p.amount + ' د', 'success', 2000);
        } else if(p.type === 'note'){
          window.notes.unshift({ title: p.title.slice(0, 60), body: p.title, ts: Date.now() });
          getS().set('notes', window.notes);
          if(window.renderNotes) window.renderNotes();
          if(window.renderDashboard) window.renderDashboard();
          toast('✓ أُضيفت ملاحظة', 'success', 2000);
        }
        bd.remove();
      }catch(err){
        console.error(err);
        toast('حدث خطأ أثناء الحفظ', 'warn', 2500);
      }
    };

    setTimeout(function(){ input.focus(); }, 120);
  };

  /* ============================================================
     Smart Timetable v7
     ============================================================ */
  var STT_DAYS_ALL = [
    {k:'Sun', l:'Sun', full:'الأحد'},
    {k:'Mon', l:'Mon', full:'الاثنين'},
    {k:'Tue', l:'Tue', full:'الثلاثاء'},
    {k:'Wed', l:'Wed', full:'الأربعاء'},
    {k:'Thu', l:'Thu', full:'الخميس'},
    {k:'Fri', l:'Fri', full:'الجمعة'},
    {k:'Sat', l:'Sat', full:'السبت'}
  ];

  var STT_TIME_SLOTS = [];
  for(var _h = 7; _h <= 20; _h++){
    STT_TIME_SLOTS.push(String(_h).padStart(2,'0') + ':00');
    STT_TIME_SLOTS.push(String(_h).padStart(2,'0') + ':30');
  }

  var STT_CACHE = { rooms: [] };
  function loadSTTCache(){
    try{
      var r = JSON.parse(localStorage.getItem('stt_rooms') || '[]');
      STT_CACHE.rooms = Array.isArray(r) ? r : [];
    }catch(e){ STT_CACHE.rooms = []; }
  }
  function addToSTTCache(key, value){
    if(!value || !value.trim()) return;
    value = value.trim();
    var arr = STT_CACHE[key];
    if(!Array.isArray(arr)) return;
    var i = arr.indexOf(value);
    if(i > -1) arr.splice(i, 1);
    arr.unshift(value);
    if(arr.length > 15) arr.length = 15;
    try{ localStorage.setItem('stt_' + key, JSON.stringify(arr)); }catch(e){}
  }

  function saveDraft(rows){
    try{ localStorage.setItem('stt_draft', JSON.stringify({rows: rows, ts: Date.now()})); }catch(e){}
  }
  function loadDraft(){
    try{
      var d = JSON.parse(localStorage.getItem('stt_draft') || 'null');
      if(d && Array.isArray(d.rows) && d.rows.length) return d.rows;
    }catch(e){}
    return null;
  }
  function clearDraft(){ try{ localStorage.removeItem('stt_draft'); }catch(e){} }

  function addMinutesToTime(time, minutes){
    if(!time) return '';
    var p = time.split(':');
    var total = parseInt(p[0],10)*60 + (parseInt(p[1],10)||0) + minutes;
    return String(Math.floor(total/60) % 24).padStart(2,'0') + ':' + String(total % 60).padStart(2,'0');
  }
  function calcDuration(from, to){
    if(!from || !to) return 0;
    var f = from.split(':'), t = to.split(':');
    return Math.max(0, (parseInt(t[0],10)*60 + (parseInt(t[1],10)||0)) - (parseInt(f[0],10)*60 + (parseInt(f[1],10)||0)));
  }
  function formatDuration(min){
    if(min <= 0) return '';
    if(min < 60) return min + ' د';
    var h = Math.floor(min/60), m = min % 60;
    if(m === 0) return h + ' س';
    if(m === 30) return h + '.5 س';
    return h + 'س' + m + 'د';
  }

  var MIN_ROWS = 4;

  function sttEmptyRow(){
    return {
      code:'', name:'', matched:null, days:[],
      timeFrom:'', timeTo:'', room:''
    };
  }
  function sttCreateRows(n){
    var r = []; for(var i = 0; i < n; i++) r.push(sttEmptyRow()); return r;
  }

  var STT_CSS = 'stt-style-v7';
  function sttInjectCSS(){
    var old1 = document.getElementById('stt-style-v6');
    if(old1) old1.remove();
    if(document.getElementById(STT_CSS)) return;
    var css = `
      .stt-backdrop{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px}
      .stt-modal{background:var(--card);border:1px solid var(--border);border-radius:22px;width:100%;max-width:1200px;max-height:94vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6);position:relative}
      .stt-header{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(167,139,250,.08));flex-shrink:0;gap:10px;flex-wrap:wrap}
      .stt-header h3{margin:0;font-size:1.05rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
      .stt-close{width:34px;height:34px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:1.3rem;display:flex;align-items:center;justify-content:center;font-family:inherit;line-height:1}
      .stt-close:hover{background:rgba(239,68,68,.15);border-color:var(--red);color:var(--red)}
      .stt-stats{display:flex;gap:10px;padding:12px 22px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
      .stt-stat{flex:1;min-width:110px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}
      .stt-stat-v{font-size:1.3rem;font-weight:900;color:var(--cyan);line-height:1}
      .stt-stat-l{font-size:.68rem;color:var(--muted);font-weight:600}
      .stt-stat.green .stt-stat-v{color:var(--green)}
      .stt-stat.amber .stt-stat-v{color:var(--amber)}
      .stt-stat.purple .stt-stat-v{color:var(--purple)}
      .stt-draft-notice{padding:8px 22px;background:rgba(251,191,36,.1);border-bottom:1px solid rgba(251,191,36,.25);font-size:.75rem;color:var(--amber);display:none;align-items:center;gap:8px}
      .stt-draft-notice.show{display:flex}
      .stt-draft-notice button{margin-right:auto;padding:4px 10px;border-radius:8px;background:transparent;border:1px solid currentColor;color:inherit;cursor:pointer;font-family:inherit;font-size:.7rem;font-weight:700}
      .stt-rows-head{display:grid;grid-template-columns:36px 130px minmax(160px,1fr) 240px 220px 130px 70px;gap:8px;padding:8px 22px;background:var(--bg2);border-bottom:1px solid var(--border);font-size:.7rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.3px}
      .stt-rows-head > div{text-align:center}
      .stt-rows{flex:1;overflow-y:auto;padding:12px 22px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}
      .stt-row{display:grid;grid-template-columns:36px 130px minmax(160px,1fr) 240px 220px 130px 70px;gap:8px;align-items:center;padding:10px;background:var(--bg2);border:1.5px solid var(--border);border-radius:12px;transition:.25s}
      .stt-row.matched{border-color:rgba(52,211,153,.4);background:linear-gradient(135deg,rgba(52,211,153,.04),transparent)}
      .stt-row.ready{border-color:rgba(52,211,153,.5)}
      .stt-num{width:28px;height:28px;border-radius:8px;background:var(--grad);color:#0b0f1a;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8rem;justify-self:center}
      .stt-row.matched .stt-num{background:linear-gradient(135deg,#34d399,#10b981)}
      .stt-input{width:100%;background:var(--card);border:1.5px solid var(--border);color:var(--text);padding:8px 10px;border-radius:9px;font-family:inherit;font-size:.85rem;outline:none;height:38px;transition:.2s;min-width:0}
      .stt-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--glow)}
      .stt-code{font-family:ui-monospace,monospace;direction:ltr;text-align:left;letter-spacing:.5px;font-weight:700}
      .stt-name-cell{display:flex;flex-direction:column;gap:2px;min-width:0}
      .stt-name-cell .stt-input{height:38px}
      .stt-match{font-size:.65rem;color:var(--green);font-weight:700;padding:0 4px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:12px}
      .stt-match.no-match{color:var(--amber)}
      .stt-match:empty{display:none}
      .stt-days{display:flex;gap:3px;padding:4px;background:var(--card);border:1.5px solid var(--border);border-radius:9px;height:38px;align-items:center;justify-content:center}
      .stt-day{flex:1;height:26px;border-radius:6px;background:transparent;border:none;color:var(--muted);cursor:pointer;font-family:inherit;font-size:.62rem;font-weight:800;display:flex;align-items:center;justify-content:center;transition:.2s;padding:0;letter-spacing:.2px;text-transform:uppercase}
      .stt-day:hover{color:var(--text);background:var(--card2)}
      .stt-day.active{background:var(--grad);color:#0b0f1a;box-shadow:0 2px 6px var(--glow)}
      .stt-time{display:flex;align-items:center;gap:4px;position:relative}
      .stt-time input[type="time"]{flex:1;background:var(--card);border:1.5px solid var(--border);color:var(--text);padding:0 6px;border-radius:9px;font-family:ui-monospace,monospace;font-size:.82rem;outline:none;height:38px;direction:ltr;text-align:center;font-weight:700;min-width:0;color-scheme:dark}
      .stt-time input[type="time"]::-webkit-calendar-picker-indicator{filter:invert(.7);cursor:pointer}
      .stt-time input[type="time"]:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--glow)}
      .stt-arrow{color:var(--muted2);font-weight:700;font-size:.75rem;flex-shrink:0}
      .stt-duration{position:absolute;bottom:-11px;right:50%;transform:translateX(50%);font-size:.6rem;font-weight:800;color:var(--cyan);background:var(--card);padding:1px 6px;border-radius:5px;border:1px solid var(--border);white-space:nowrap;pointer-events:none}
      .stt-duration:empty{display:none}
      .stt-row-actions{display:flex;gap:3px;justify-content:flex-end}
      .stt-row-btn{width:30px;height:30px;border-radius:8px;background:transparent;border:1.5px solid var(--border);color:var(--muted);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:.2s;padding:0;font-family:inherit;line-height:1}
      .stt-row-btn:hover{background:var(--card2);border-color:var(--cyan);color:var(--cyan)}
      .stt-row-btn.del:hover{background:rgba(239,68,68,.15);border-color:var(--red);color:var(--red)}
      .stt-row-btn.copy:hover{background:rgba(167,139,250,.15);border-color:var(--purple);color:var(--purple)}
      .stt-footer{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-top:1px solid var(--border);background:var(--card2);gap:10px;flex-wrap:wrap;flex-shrink:0}
      .stt-footer-hint{font-size:.78rem;color:var(--muted);text-align:center;flex:1;min-width:150px}
      .stt-btn{padding:10px 18px;border-radius:11px;font-family:inherit;font-size:.86rem;font-weight:800;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px;transition:.2s}
      .stt-btn-primary{background:var(--grad);color:#0b0f1a;box-shadow:0 6px 20px var(--glow)}
      .stt-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px var(--glow)}
      .stt-btn-primary:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
      .stt-btn-ghost{background:transparent;color:var(--text);border:1.5px solid var(--border)}
      .stt-btn-ghost:hover{background:var(--card);border-color:var(--cyan);color:var(--cyan)}
      .stt-btn-warn{background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#0b0f1a}
      .stt-preview{position:absolute;inset:0;background:var(--card);z-index:100;display:none;flex-direction:column;overflow:hidden;border-radius:22px}
      .stt-preview.show{display:flex}
      .stt-preview-header{padding:16px 22px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(167,139,250,.08))}
      .stt-preview-header h3{margin:0;font-size:1rem;font-weight:800;color:var(--cyan)}
      .stt-preview-body{flex:1;overflow-y:auto;padding:18px 22px}
      .stt-preview-table{width:100%;border-collapse:collapse;font-size:.82rem;background:var(--bg2);border-radius:12px;overflow:hidden}
      .stt-preview-table th{background:var(--card2);padding:10px 8px;text-align:right;font-weight:800;color:var(--cyan);font-size:.72rem;border-bottom:1px solid var(--border)}
      .stt-preview-table td{padding:10px 8px;border-bottom:1px solid var(--border);font-size:.78rem}
      .stt-preview-table tr:last-child td{border-bottom:none}
      .stt-preview-table tr.conflict{background:rgba(239,68,68,.08)}
      .stt-preview-table tr.conflict td{color:var(--red)}
      .stt-preview-days{display:flex;gap:3px;flex-wrap:wrap}
      .stt-preview-day{padding:2px 6px;background:var(--grad-soft);color:var(--cyan);border-radius:4px;font-size:.65rem;font-weight:800}
      .stt-preview-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px}
      .stt-preview-stat{background:var(--grad-soft);border:1px solid var(--glow);border-radius:12px;padding:12px;text-align:center}
      .stt-preview-stat-v{font-size:1.5rem;font-weight:900;color:var(--cyan);line-height:1}
      .stt-preview-stat-l{font-size:.68rem;color:var(--muted);margin-top:4px}
      .stt-preview-footer{padding:14px 22px;border-top:1px solid var(--border);background:var(--card2);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
      .stt-issue-row{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;margin-bottom:6px}
      .stt-issue-ic{font-size:1.1rem;flex-shrink:0}
      .stt-issue-body{flex:1;min-width:0;font-size:.82rem;line-height:1.6}
      @media (max-width: 1100px){
        .stt-rows-head, .stt-row{grid-template-columns:36px 110px minmax(140px,1fr) 200px 180px 100px 60px;gap:6px}
      }
      @media (max-width: 860px){
        .stt-rows-head{display:none}
        .stt-row{
          grid-template-columns:32px 1fr 60px;
          grid-template-areas:
            "num name actions"
            "code code code"
            "days days days"
            "time time time"
            "room room room";
          gap:8px;padding:12px;
        }
        .stt-num{grid-area:num}
        .stt-code{grid-area:code}
        .stt-name-cell{grid-area:name}
        .stt-days{grid-area:days}
        .stt-time{grid-area:time}
        .stt-room-input{grid-area:room}
        .stt-row-actions{grid-area:actions}
        .stt-input,.stt-time input[type="time"]{height:44px}
        .stt-days{height:44px}
      }
      @media (max-width: 520px){
        .stt-modal{border-radius:16px;max-height:96vh}
        .stt-header{padding:12px 14px}
        .stt-header h3{font-size:.9rem}
        .stt-stats{padding:8px 14px}
        .stt-stat{padding:8px 10px;min-width:90px}
        .stt-stat-v{font-size:1.1rem}
        .stt-rows{padding:10px;gap:10px}
        .stt-footer{padding:10px 14px}
      }
    `;
    var s = document.createElement('style');
    s.id = STT_CSS;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function sttLookupByCode(code){
    if(!code) return null;
    code = String(code).trim();
    if(code.length < 6) return null;
    if(typeof window.findCourseByCode === 'function'){
      var r = window.findCourseByCode(code);
      if(r && r.name) return r;
    }
    return null;
  }

  function openSmartModal(initialRows){
    sttInjectCSS();
    loadSTTCache();
    document.querySelectorAll('.stt-backdrop').forEach(function(b){ b.remove(); });

    var draft = !initialRows ? loadDraft() : null;
    var startRows = initialRows && initialRows.length ? initialRows :
                    (draft && draft.length ? draft : sttCreateRows(MIN_ROWS));

    var state = { rows: startRows };

    var backdrop = document.createElement('div');
    backdrop.className = 'stt-backdrop';
    document.body.appendChild(backdrop);
    var modal = document.createElement('div');
    modal.className = 'stt-modal';
    backdrop.appendChild(modal);

    /* Header */
    var header = document.createElement('div');
    header.className = 'stt-header';
    header.innerHTML =
      '<h3>✨ إضافة جدول — دفعة واحدة</h3>' +
      '<button class="stt-close" type="button" title="إغلاق">×</button>';
    modal.appendChild(header);

    /* Stats */
    var statsBar = document.createElement('div');
    statsBar.className = 'stt-stats';
    statsBar.innerHTML =
      '<div class="stt-stat"><div class="stt-stat-v" data-stat="rows">0</div><div class="stt-stat-l">📋 صفوف جاهزة</div></div>' +
      '<div class="stt-stat green"><div class="stt-stat-v" data-stat="hours">0</div><div class="stt-stat-l">⏱️ ساعة أسبوعياً</div></div>' +
      '<div class="stt-stat purple"><div class="stt-stat-v" data-stat="courses">0</div><div class="stt-stat-l">📚 مواد فريدة</div></div>' +
      '<div class="stt-stat amber"><div class="stt-stat-v" data-stat="conflicts">0</div><div class="stt-stat-l">⚠️ تعارضات</div></div>';
    modal.appendChild(statsBar);

    /* Draft notice */
    var draftNotice = document.createElement('div');
    draftNotice.className = 'stt-draft-notice';
    draftNotice.innerHTML = '<span>📝 عندك مسودّة محفوظة — استرجعناها لك</span>' +
      '<button type="button" data-draft="clear">مسح المسودّة</button>';
    modal.appendChild(draftNotice);
    if(draft && draft.length) draftNotice.classList.add('show');

    /* Rows head */
    var rowsHead = document.createElement('div');
    rowsHead.className = 'stt-rows-head';
    rowsHead.innerHTML = '<div>#</div><div>الكود</div><div>المادة</div><div>الأيام</div><div>الوقت</div><div>القاعة</div><div></div>';
    modal.appendChild(rowsHead);

    var rowsWrap = document.createElement('div');
    rowsWrap.className = 'stt-rows';
    modal.appendChild(rowsWrap);

    var footer = document.createElement('div');
    footer.className = 'stt-footer';
    footer.innerHTML =
      '<button class="stt-btn stt-btn-ghost" data-action="add-row" type="button">+ إضافة صف</button>' +
      '<div class="stt-footer-hint" data-hint></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="stt-btn stt-btn-ghost" data-action="cancel" type="button">إلغاء</button>' +
        '<button class="stt-btn stt-btn-warn" data-action="preview" type="button">👁️ معاينة</button>' +
        '<button class="stt-btn stt-btn-primary" data-action="save" type="button" disabled>💾 حفظ الكل</button>' +
      '</div>';
    modal.appendChild(footer);

    var previewOverlay = document.createElement('div');
    previewOverlay.className = 'stt-preview';
    previewOverlay.innerHTML =
      '<div class="stt-preview-header">' +
        '<h3>👁️ معاينة الجدول</h3>' +
        '<button class="stt-close" data-preview="close" type="button">×</button>' +
      '</div>' +
      '<div class="stt-preview-body" data-preview="body"></div>' +
      '<div class="stt-preview-footer">' +
        '<button class="stt-btn stt-btn-ghost" data-preview="close2" type="button">↩ رجوع</button>' +
        '<button class="stt-btn stt-btn-primary" data-preview="confirm" type="button">✅ تأكيد وحفظ</button>' +
      '</div>';
    modal.appendChild(previewOverlay);

    /* ============ Helpers ============ */
    function isRowComplete(row){
      return !!(row.name && row.days && row.days.length && row.timeFrom && row.timeTo);
    }
    function countConflicts(){
      var seen = {};
      var conflicts = 0;
      state.rows.forEach(function(row){
        if(!row.name || !row.days || !row.days.length || !row.timeFrom) return;
        row.days.forEach(function(d){
          var key = d + '-' + row.timeFrom;
          if(seen[key]) conflicts++;
          else seen[key] = true;
        });
      });
      return conflicts;
    }
    function updateStats(){
      var ready = state.rows.filter(isRowComplete);
      var totalMin = ready.reduce(function(a, r){ return a + calcDuration(r.timeFrom, r.timeTo); }, 0);
      var uniqCourses = {};
      ready.forEach(function(r){ uniqCourses[r.name] = true; });
      statsBar.querySelector('[data-stat="rows"]').textContent = ready.length;
      statsBar.querySelector('[data-stat="hours"]').textContent = (totalMin/60).toFixed(1);
      statsBar.querySelector('[data-stat="courses"]').textContent = Object.keys(uniqCourses).length;
      statsBar.querySelector('[data-stat="conflicts"]').textContent = countConflicts();
    }
    function updateFooter(){
      var ready = state.rows.filter(isRowComplete).length;
      var saveBtn = footer.querySelector('[data-action="save"]');
      var previewBtn = footer.querySelector('[data-action="preview"]');
      var hint = footer.querySelector('[data-hint]');
      if(ready === 0){
        saveBtn.disabled = true;
        previewBtn.disabled = true;
        saveBtn.textContent = '💾 حفظ الكل';
        hint.textContent = 'املأ صف واحد على الأقل';
      } else {
        saveBtn.disabled = false;
        previewBtn.disabled = false;
        saveBtn.textContent = '💾 حفظ الكل (' + ready + ')';
        hint.textContent = ready + ' صف جاهز من ' + state.rows.length;
      }
      updateStats();
    }
    var draftTimer = null;
    function scheduleDraftSave(){
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function(){ saveDraft(state.rows); }, 800);
    }
    function updateRowStatus(idx){
      var row = state.rows[idx]; if(!row) return;
      var rowEl = rowsWrap.querySelector('.stt-row[data-idx="' + idx + '"]');
      if(!rowEl) return;
      var matchEl = rowEl.querySelector('[data-match]');
      if(matchEl){
        if(row.matched){
          var info = row.matched.info || {};
          var ex = [];
          if(info.h) ex.push(info.h + ' ساعات');
          matchEl.textContent = '✓ ' + (ex.length ? ex.join(' · ') : row.matched.name);
          matchEl.classList.remove('no-match');
        } else if(row.code && row.code.length >= 6){
          matchEl.textContent = '⚠ كود غير معروف';
          matchEl.classList.add('no-match');
        } else {
          matchEl.textContent = '';
          matchEl.classList.remove('no-match');
        }
      }
      var durEl = rowEl.querySelector('[data-duration]');
      if(durEl){
        var min = calcDuration(row.timeFrom, row.timeTo);
        durEl.textContent = formatDuration(min);
      }
      rowEl.classList.toggle('matched', !!row.matched);
      rowEl.classList.toggle('ready', isRowComplete(row));
    }

    function buildRowEl(row, idx){
      var el = document.createElement('div');
      el.className = 'stt-row';
      el.dataset.idx = idx;

      var num = document.createElement('div');
      num.className = 'stt-num';
      num.textContent = String(idx + 1);
      el.appendChild(num);

      var code = document.createElement('input');
      code.type = 'text';
      code.className = 'stt-input stt-code';
      code.placeholder = '0110108101';
      code.value = row.code || '';
      code.autocomplete = 'off';
      code.dataset.field = 'code';
      el.appendChild(code);

      var nameCell = document.createElement('div');
      nameCell.className = 'stt-name-cell';
      var nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'stt-input stt-name';
      nameInput.placeholder = 'اسم المادة';
      nameInput.value = row.name || '';
      nameInput.autocomplete = 'off';
      nameInput.dataset.field = 'name';
      nameCell.appendChild(nameInput);
      var matchEl = document.createElement('div');
      matchEl.className = 'stt-match';
      matchEl.dataset.match = '1';
      nameCell.appendChild(matchEl);
      el.appendChild(nameCell);

      var days = document.createElement('div');
      days.className = 'stt-days';
      STT_DAYS_ALL.forEach(function(d){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stt-day';
        btn.dataset.day = d.k;
        btn.title = d.full;
        btn.textContent = d.l;
        if(row.days && row.days.indexOf(d.k) > -1) btn.classList.add('active');
        days.appendChild(btn);
      });
      el.appendChild(days);

      var timeWrap = document.createElement('div');
      timeWrap.className = 'stt-time';
      var fromInput = document.createElement('input');
      fromInput.type = 'time';
      fromInput.dataset.field = 'timeFrom';
      fromInput.value = row.timeFrom || '';
      timeWrap.appendChild(fromInput);
      var arrow = document.createElement('span');
      arrow.className = 'stt-arrow';
      arrow.textContent = '→';
      timeWrap.appendChild(arrow);
      var toInput = document.createElement('input');
      toInput.type = 'time';
      toInput.dataset.field = 'timeTo';
      toInput.value = row.timeTo || '';
      timeWrap.appendChild(toInput);
      var durBadge = document.createElement('div');
      durBadge.className = 'stt-duration';
      durBadge.dataset.duration = '1';
      timeWrap.appendChild(durBadge);
      el.appendChild(timeWrap);

      var room = document.createElement('input');
      room.type = 'text';
      room.className = 'stt-input stt-room-input';
      room.placeholder = '104';
      room.value = row.room || '';
      room.autocomplete = 'off';
      room.dataset.field = 'room';
      el.appendChild(room);

      var actions = document.createElement('div');
      actions.className = 'stt-row-actions';
      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'stt-row-btn copy';
      copyBtn.title = 'نسخ الصف';
      copyBtn.textContent = '⧉';
      copyBtn.dataset.action = 'copy-row';
      actions.appendChild(copyBtn);
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'stt-row-btn del';
      delBtn.title = 'حذف';
      delBtn.textContent = '×';
      delBtn.dataset.action = 'del';
      actions.appendChild(delBtn);
      el.appendChild(actions);

      updateRowStatus(idx);
      return el;
    }

    function renderRows(){
      rowsWrap.innerHTML = '';
      state.rows.forEach(function(row, idx){ rowsWrap.appendChild(buildRowEl(row, idx)); });
      updateFooter();
    }

    /* ============ Events ============ */
    rowsWrap.addEventListener('input', function(e){
      var input = e.target.closest('[data-field]'); if(!input) return;
      var rowEl = input.closest('.stt-row'); if(!rowEl) return;
      var idx = parseInt(rowEl.dataset.idx, 10);
      var field = input.dataset.field;
      var val = input.value;
      var row = state.rows[idx]; if(!row) return;

      if(field === 'code'){
        row.code = val.trim();
        clearTimeout(row._lookupTimer);
        row._lookupTimer = setTimeout(function(){
          var found = sttLookupByCode(row.code);
          var nameInput = rowEl.querySelector('.stt-name');
          if(found){
            row.matched = found;
            row.name = found.name;
            if(nameInput) nameInput.value = found.name;
          } else row.matched = null;
          updateRowStatus(idx);
          updateFooter();
          scheduleDraftSave();
        }, 220);
      } else if(field === 'name'){ row.name = val.trim(); updateFooter(); scheduleDraftSave(); }
      else if(field === 'room'){ row.room = val.trim(); scheduleDraftSave(); }
    });

    rowsWrap.addEventListener('change', function(e){
      var inp = e.target.closest('input[type="time"][data-field]');
      if(!inp) return;
      var rowEl = inp.closest('.stt-row'); if(!rowEl) return;
      var idx = parseInt(rowEl.dataset.idx, 10);
      var field = inp.dataset.field;
      var val = inp.value;
      var row = state.rows[idx]; if(!row) return;

      if(field === 'timeFrom'){
        row.timeFrom = val;
        /* Auto-fill وقت النهاية = بداية + 60 دقيقة */
        if(val && (!row.timeTo || calcDuration(val, row.timeTo) <= 0)){
          row.timeTo = addMinutesToTime(val, 60);
          var toInp = rowEl.querySelector('[data-field="timeTo"]');
          if(toInp) toInp.value = row.timeTo;
        }
        updateRowStatus(idx); updateFooter(); scheduleDraftSave();
      } else if(field === 'timeTo'){
        row.timeTo = val;
        if(row.timeFrom && val && calcDuration(row.timeFrom, val) <= 0){
          row.timeTo = addMinutesToTime(row.timeFrom, 60);
          var toInp2 = rowEl.querySelector('[data-field="timeTo"]');
          if(toInp2) toInp2.value = row.timeTo;
        }
        updateRowStatus(idx); updateFooter(); scheduleDraftSave();
      }
    });

    rowsWrap.addEventListener('click', function(e){
      var dayBtn = e.target.closest('.stt-day');
      if(dayBtn){
        e.preventDefault();
        var rowEl = dayBtn.closest('.stt-row');
        var idx = parseInt(rowEl.dataset.idx, 10);
        var dayKey = dayBtn.dataset.day;
        var row = state.rows[idx]; if(!row) return;
        if(!row.days) row.days = [];
        var pos = row.days.indexOf(dayKey);
        if(pos > -1) row.days.splice(pos, 1);
        else row.days.push(dayKey);
        var order = STT_DAYS_ALL.map(function(d){ return d.k; });
        row.days.sort(function(a,b){ return order.indexOf(a) - order.indexOf(b); });
        dayBtn.classList.toggle('active');
        updateFooter(); updateRowStatus(idx); scheduleDraftSave();
        return;
      }
      var copyBtn = e.target.closest('[data-action="copy-row"]');
      if(copyBtn){
        e.preventDefault();
        var rowEl3 = copyBtn.closest('.stt-row');
        var idx3 = parseInt(rowEl3.dataset.idx, 10);
        var orig = state.rows[idx3];
        if(!orig) return;
        var copy = JSON.parse(JSON.stringify(orig));
        copy._lookupTimer = null;
        state.rows.splice(idx3 + 1, 0, copy);
        renderRows();
        scheduleDraftSave();
        toast('📋 نُسخ الصف', 'info', 1200);
        return;
      }
      var delBtn = e.target.closest('[data-action="del"]');
      if(delBtn){
        e.preventDefault();
        var rowEl4 = delBtn.closest('.stt-row');
        var idx4 = parseInt(rowEl4.dataset.idx, 10);
        if(state.rows.length <= 1){ toast('لازم يبقى صف واحد', 'warn'); return; }
        state.rows.splice(idx4, 1);
        while(state.rows.length < MIN_ROWS) state.rows.push(sttEmptyRow());
        renderRows();
        scheduleDraftSave();
        return;
      }
    });

    draftNotice.addEventListener('click', function(e){
      if(e.target.closest('[data-draft="clear"]')){
        clearDraft();
        draftNotice.classList.remove('show');
        toast('🗑 مُسحت المسودّة', 'info', 1500);
      }
    });

    header.addEventListener('click', function(e){
      if(e.target.closest('.stt-close')) close();
    });

    footer.addEventListener('click', function(e){
      var btn = e.target.closest('[data-action]'); if(!btn) return;
      var action = btn.dataset.action;
      if(action === 'add-row'){
        state.rows.push(sttEmptyRow());
        renderRows();
        scheduleDraftSave();
        setTimeout(function(){
          rowsWrap.scrollTop = rowsWrap.scrollHeight;
          var last = rowsWrap.querySelector('.stt-row:last-child .stt-code');
          if(last) last.focus();
        }, 60);
      } else if(action === 'cancel'){ close(); }
      else if(action === 'preview'){ showPreview(); }
      else if(action === 'save'){ saveAll(); }
    });

    function showPreview(){
      var body = previewOverlay.querySelector('[data-preview="body"]');
      var ready = state.rows.filter(isRowComplete);
      if(!ready.length){ toast('ما في صفوف جاهزة', 'warn', 2000); return; }
      var totalMin = ready.reduce(function(a,r){ return a + calcDuration(r.timeFrom, r.timeTo); }, 0);
      var uniq = {};
      ready.forEach(function(r){ uniq[r.name] = true; });
      var conflicts = countConflicts();
      var html = '<div class="stt-preview-stats">' +
        '<div class="stt-preview-stat"><div class="stt-preview-stat-v">' + ready.length + '</div><div class="stt-preview-stat-l">صفوف</div></div>' +
        '<div class="stt-preview-stat"><div class="stt-preview-stat-v">' + Object.keys(uniq).length + '</div><div class="stt-preview-stat-l">مواد</div></div>' +
        '<div class="stt-preview-stat"><div class="stt-preview-stat-v">' + (totalMin/60).toFixed(1) + '</div><div class="stt-preview-stat-l">ساعة</div></div>' +
        '<div class="stt-preview-stat"><div class="stt-preview-stat-v" style="color:' + (conflicts ? 'var(--red)' : 'var(--green)') + '">' + conflicts + '</div><div class="stt-preview-stat-l">تعارضات</div></div>' +
      '</div>';
      var seen = {};
      var conflictRows = {};
      ready.forEach(function(r, i){
        r.days.forEach(function(d){
          var k = d + '-' + r.timeFrom;
          if(seen[k]){ conflictRows[i] = true; conflictRows[seen[k].idx] = true; }
          else seen[k] = { idx: i };
        });
      });
      html += '<table class="stt-preview-table"><thead><tr>' +
        '<th style="width:36px">#</th>' +
        '<th style="width:100px">الكود</th>' +
        '<th>المادة</th>' +
        '<th style="width:200px">الأيام</th>' +
        '<th style="width:140px">الوقت</th>' +
        '<th style="width:100px">القاعة</th>' +
      '</tr></thead><tbody>';
      ready.forEach(function(r, i){
        var cls = conflictRows[i] ? 'conflict' : '';
        var daysHtml = (r.days || []).map(function(d){ return '<span class="stt-preview-day">' + d + '</span>'; }).join('');
        var dur = formatDuration(calcDuration(r.timeFrom, r.timeTo));
        html += '<tr class="' + cls + '">' +
          '<td>' + (i+1) + '</td>' +
          '<td style="font-family:monospace;direction:ltr;text-align:left;font-size:.72rem">' + esc(r.code || '—') + '</td>' +
          '<td><b>' + esc(r.name) + '</b></td>' +
          '<td><div class="stt-preview-days">' + daysHtml + '</div></td>' +
          '<td style="font-family:monospace;direction:ltr;font-size:.75rem">' + (r.timeFrom || '') + ' → ' + (r.timeTo || '') +
            (dur ? ' <span style="color:var(--muted2);font-size:.65rem">(' + dur + ')</span>' : '') + '</td>' +
          '<td>' + esc(r.room || '—') + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
      if(conflicts){
        html = '<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px;margin-bottom:14px;font-size:.82rem;color:var(--red);font-weight:700">' +
          '⚠️ عندك ' + conflicts + ' تعارض — راجع الصفوف الحمراء</div>' + html;
      }
      body.innerHTML = html;
      previewOverlay.classList.add('show');
    }

    previewOverlay.addEventListener('click', function(e){
      if(e.target.closest('[data-preview="close"]') || e.target.closest('[data-preview="close2"]')){
        previewOverlay.classList.remove('show');
      } else if(e.target.closest('[data-preview="confirm"]')){
        previewOverlay.classList.remove('show');
        saveAll();
      }
    });

    function close(){
      clearTimeout(draftTimer);
      document.removeEventListener('keydown', escHandler);
      backdrop.remove();
    }
    backdrop.addEventListener('click', function(e){ if(e.target === backdrop) close(); });
    var escHandler = function(e){
      if(e.key === 'Escape'){
        if(previewOverlay.classList.contains('show')) previewOverlay.classList.remove('show');
        else close();
      }
    };
    document.addEventListener('keydown', escHandler);

    function saveAll(){
      var sp = window.space;
      if(!sp.timetable) sp.timetable = {};
      if(!sp.courses) sp.courses = [];
      if(!sp.attendance) sp.attendance = {};

      var stats = { courses: 0, classes: 0, skipped: [], incomplete: [], unknownCodes: [] };

      state.rows.forEach(function(row, idx){
        if(!isRowComplete(row)){
          var missing = [];
          if(!row.name) missing.push('الاسم');
          if(!row.days || !row.days.length) missing.push('الأيام');
          if(!row.timeFrom) missing.push('وقت البداية');
          if(!row.timeTo) missing.push('وقت النهاية');
          if(missing.length && (row.code || row.name)){
            stats.incomplete.push({ row: idx + 1, missing: missing.join(' + ') });
          }
          return;
        }
        if(row.code && row.code.length >= 6 && !row.matched){
          stats.unknownCodes.push({ row: idx + 1, code: row.code, name: row.name });
        }
        var finalName = row.matched ? row.matched.name : row.name;
        var finalCode = row.code || (row.matched && row.matched.info ? row.matched.info.code : '');
        var hours = (row.matched && row.matched.info && row.matched.info.h) ? row.matched.info.h : 3;
        var exists = sp.courses.some(function(c){
          return c.name === finalName || (finalCode && c.code && String(c.code) === String(finalCode));
        });
        if(!exists){
          sp.courses.push({
            id: uid(), name: finalName, code: finalCode, hours: hours,
            instructor: '', room: row.room || ''
          });
          stats.courses++;
        }
        row.days.forEach(function(dayKey){
          var key = dayKey + '-' + row.timeFrom;
          if(sp.timetable[key] && sp.timetable[key].name !== finalName){
            stats.skipped.push({ row: idx + 1, day: dayKey, time: row.timeFrom, newName: finalName, conflictWith: sp.timetable[key].name });
            return;
          }
          sp.timetable[key] = {
            name: finalName, room: row.room || '', instructor: ''
          };
          stats.classes++;
        });
        if(!sp.attendance[finalName]) sp.attendance[finalName] = { present: 0, absent: 0 };
        if(row.room) addToSTTCache('rooms', row.room);
      });

      saveSpace();
      clearDraft();
      try{ window.renderTimetable && window.renderTimetable(); }catch(e){}
      try{ window.renderCourses && window.renderCourses(); }catch(e){}
      try{ window.renderDashboard && window.renderDashboard(); }catch(e){}
      try{ window.renderAttendance && window.renderAttendance(); }catch(e){}
      try{ window.renderGradeCalc && window.renderGradeCalc(); }catch(e){}

      var issues = stats.skipped.length + stats.incomplete.length + stats.unknownCodes.length;
      if(issues === 0){
        var msg = '✅ ' + stats.courses + ' مادة · ' + stats.classes + ' محاضرة';
        if(stats.courses === 0 && stats.classes === 0) toast('لم تُضف أي شيء جديد', 'info', 3000);
        else toast(msg, 'success', 4000);
        close();
      } else {
        close();
        showSaveResult(stats);
      }
    }

    renderRows();
    setTimeout(function(){
      var firstCode = rowsWrap.querySelector('.stt-code');
      if(firstCode) firstCode.focus();
    }, 200);
  }

  function showSaveResult(stats){
    document.querySelectorAll('.stt-result-backdrop').forEach(function(b){ b.remove(); });
    var backdrop = document.createElement('div');
    backdrop.className = 'stt-backdrop stt-result-backdrop';
    document.body.appendChild(backdrop);
    var modal = document.createElement('div');
    modal.className = 'stt-modal';
    modal.style.maxWidth = '600px';
    backdrop.appendChild(modal);

    var hasSuccess = stats.courses > 0 || stats.classes > 0;
    var header = document.createElement('div');
    header.className = 'stt-header';
    header.innerHTML = '<h3>' + (hasSuccess ? '⚠️ تم الحفظ مع ملاحظات' : '⚠️ لم يُحفظ شيء') + '</h3><button class="stt-close" type="button">×</button>';
    modal.appendChild(header);

    var body = document.createElement('div');
    body.style.cssText = 'padding:18px 22px;overflow-y:auto;max-height:65vh';
    var summary = '';
    if(stats.courses > 0) summary += '✅ ' + stats.courses + ' مادة جديدة\n';
    if(stats.classes > 0) summary += '✅ ' + stats.classes + ' محاضرة\n';
    if(stats.skipped.length) summary += '❌ ' + stats.skipped.length + ' تعارض\n';
    if(stats.incomplete.length) summary += '⚠️ ' + stats.incomplete.length + ' صف ناقص\n';
    if(stats.unknownCodes.length) summary += '⚠️ ' + stats.unknownCodes.length + ' كود غير معروف\n';

    var html = '<div style="padding:12px;background:var(--bg2);border-radius:10px;font-family:monospace;font-size:.78rem;line-height:1.8;white-space:pre-line;margin-bottom:14px">' + esc(summary.trim()) + '</div>';

    if(stats.skipped.length){
      html += '<div style="margin-bottom:14px"><div style="font-size:.85rem;font-weight:800;color:var(--red);margin-bottom:8px">❌ تعارضات (' + stats.skipped.length + ')</div>';
      stats.skipped.forEach(function(s){
        html += '<div class="stt-issue-row" style="border-color:rgba(248,113,113,.4)"><div class="stt-issue-ic">🚫</div><div class="stt-issue-body"><b>الصف ' + s.row + '</b> — ' + esc(s.day) + ' ' + esc(s.time) + '<br>المادة: <b>' + esc(s.newName) + '</b><br>متعارضة مع: <b style="color:var(--red)">' + esc(s.conflictWith) + '</b></div></div>';
      });
      html += '</div>';
    }
    if(stats.incomplete.length){
      html += '<div style="margin-bottom:14px"><div style="font-size:.85rem;font-weight:800;color:var(--amber);margin-bottom:8px">⚠️ صفوف ناقصة (' + stats.incomplete.length + ')</div>';
      stats.incomplete.forEach(function(s){
        html += '<div class="stt-issue-row" style="border-color:rgba(251,191,36,.4)"><div class="stt-issue-ic">📝</div><div class="stt-issue-body"><b>الصف ' + s.row + '</b><br>ينقص: <b>' + esc(s.missing) + '</b></div></div>';
      });
      html += '</div>';
    }
    if(stats.unknownCodes.length){
      html += '<div style="margin-bottom:14px"><div style="font-size:.85rem;font-weight:800;color:var(--amber);margin-bottom:8px">⚠️ أكواد غير معروفة (' + stats.unknownCodes.length + ')</div>';
      stats.unknownCodes.forEach(function(s){
        html += '<div class="stt-issue-row" style="border-color:rgba(251,191,36,.4)"><div class="stt-issue-ic">🔍</div><div class="stt-issue-body"><b>الصف ' + s.row + '</b> — <code style="direction:ltr">' + esc(s.code) + '</code></div></div>';
      });
      html += '</div>';
    }
    body.innerHTML = html;
    modal.appendChild(body);

    var footer = document.createElement('div');
    footer.className = 'stt-footer';
    footer.style.justifyContent = 'flex-end';
    footer.innerHTML = '<button class="stt-btn stt-btn-primary" type="button">حسناً</button>';
    modal.appendChild(footer);

    function closeResult(){ backdrop.remove(); }
    header.querySelector('.stt-close').addEventListener('click', closeResult);
    backdrop.addEventListener('click', function(e){ if(e.target === backdrop) closeResult(); });
    footer.querySelector('button').addEventListener('click', closeResult);
  }

  window.openSmartTimetable = function(initialRows){ openSmartModal(initialRows); };
  window.openSmartTimetableAtKey = function(key){
    if(!key){ openSmartModal(); return; }
    var parts = key.split('-');
    var day = parts[0], time = parts[1];
    var row = sttEmptyRow();
    row.days = [day];
    row.timeFrom = time || '';
    if(time){
      var tp = time.split(':');
      var hh = parseInt(tp[0], 10);
      var mm = parseInt(tp[1], 10) || 0;
      var endH = (hh + 1) % 24;
      row.timeTo = String(endH).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
    }
    var rows = [row];
    while(rows.length < MIN_ROWS) rows.push(sttEmptyRow());
    openSmartModal(rows);
  };

  function injectSmartBtn(){
    if(document.getElementById('btnSmartAddClass')) return;
    var existing = document.getElementById('btnAddClass');
    if(!existing) return;
    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.id = 'btnSmartAddClass';
    btn.type = 'button';
    btn.innerHTML = '✨ إضافة دفعة';
    btn.style.cssText = 'background:var(--grad);color:#0b0f1a;font-weight:800';
    btn.onclick = function(){ openSmartModal(); };
    existing.parentNode.insertBefore(btn, existing.nextSibling);
  }

  /* ============================================================
     Timetable UI Replacement
     ============================================================ */
  function timetableUiRun(){
    var uploadZone = document.getElementById('uploadZone');
    if(!uploadZone) return;
    var card = uploadZone.closest('.card');
    if(!card) return;
    if(card.getAttribute('data-tui-replaced') === '1') return;
    card.setAttribute('data-tui-replaced', '1');

    card.innerHTML =
      '<div style="text-align:center;padding:36px 20px 32px">' +
        '<div style="font-size:2.6rem;line-height:1;margin-bottom:14px">📅</div>' +
        '<div style="font-size:1.15rem;font-weight:800;margin-bottom:8px">إضافة جدول</div>' +
        '<div style="font-size:.85rem;color:var(--muted);line-height:1.7;margin-bottom:22px">' +
          'اكتب رقم المادة — نعبّي الاسم والساعات تلقائياً.<br>اختر الأيام والوقت بضغطة واحدة.' +
        '</div>' +
        '<button class="btn" id="btnOpenSmartTimetable" ' +
          'style="background:var(--grad);color:#0b0f1a;font-weight:800;padding:12px 32px;' +
          'font-size:.95rem;border-radius:12px;width:100%;max-width:420px;' +
          'box-shadow:0 6px 20px var(--glow);justify-content:center">' +
          '➕ إضافة جدول' +
        '</button>' +
      '</div>';

    var btn = document.getElementById('btnOpenSmartTimetable');
    if(btn) btn.addEventListener('click', function(){ openSmartModal(); });

    var sub = document.querySelector('#timetable .page-sub');
    if(sub) sub.textContent = 'أضف موادك بشكل تفاعلي ذكي';

    ['ocrProgress','ocrPreview','ocrResult','ocrFile','ocrTextarea',
     'btnParseOcr','btnClearOcr','ocrBar','ocrText','btnPasteOcr'].forEach(function(id){
      var el = document.getElementById(id);
      if(el && el.style) el.style.display = 'none';
    });
  }

  /* ============================================================
     Bottom Nav
     ============================================================ */
  var BN_TABS = [
    { id: 'dashboard', icon: '📊', label: 'الرئيسية' },
    { id: 'tasks',     icon: '📝', label: 'المهام' },
    { id: 'timetable', icon: '📅', label: 'الجدول' },
    { id: 'gradecalc', icon: '📈', label: 'علاماتي' },
    { id: 'budget',    icon: '💰', label: 'الميزانية' }
  ];

  function bnInject(){
    if(document.getElementById('bn-style')) return;
    var s = document.createElement('style');
    s.id = 'bn-style';
    s.textContent = `
      .bn-bar{position:fixed;bottom:0;left:0;right:0;z-index:350;display:none;background:var(--topbar-bg);backdrop-filter:blur(24px);border-top:1px solid var(--border);padding:6px 8px calc(6px + env(safe-area-inset-bottom, 0px));box-shadow:0 -8px 32px rgba(0,0,0,.25)}
      @media (max-width: 900px){
        .bn-bar{ display: flex; }
        .fab-main{ bottom: 90px !important; }
        .fab-menu{ bottom: 158px !important; }
        .ai-fab{ bottom: 90px !important; }
        .ai-panel{ bottom: 158px !important; max-height: calc(100vh - 240px) !important; }
        main{ padding-bottom: 100px !important; }
      }
      .bn-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;background:transparent;border:none;color:var(--muted);font-family:inherit;font-size:.68rem;font-weight:600;cursor:pointer;border-radius:12px;position:relative}
      .bn-item.active{ color: var(--cyan); background: var(--grad-soft); }
      .bn-item.active::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:24px;height:3px;border-radius:3px;background:var(--grad)}
      .bn-item .bn-ic{ font-size: 1.3rem; }
      .bn-item .bn-lbl{ font-size: .62rem; white-space: nowrap; }
    `;
    document.head.appendChild(s);
  }
  function bnInjectBar(){
    if(document.getElementById('bnBar')) return;
    var bar = document.createElement('div');
    bar.className = 'bn-bar';
    bar.id = 'bnBar';
    var html = '';
    BN_TABS.forEach(function(t){
      html += '<button class="bn-item" data-bn-tab="' + t.id + '" type="button">' +
        '<span class="bn-ic">' + t.icon + '</span><span class="bn-lbl">' + t.label + '</span></button>';
    });
    bar.innerHTML = html;
    document.body.appendChild(bar);
    bar.querySelectorAll('[data-bn-tab]').forEach(function(b){
      b.addEventListener('click', function(){
        if(window.switchTab) window.switchTab(b.dataset.bnTab);
        if(navigator.vibrate) navigator.vibrate(10);
      });
    });
  }
  function bnSync(){
    var currentTab = (getS().get('activeTab', 'dashboard')) || 'dashboard';
    document.querySelectorAll('.bn-item').forEach(function(b){
      b.classList.toggle('active', b.dataset.bnTab === currentTab);
    });
  }
  function bnUpdateVisibility(){
    var ai = document.getElementById('aiPanel');
    var focus = document.getElementById('focusScreen');
    var bar = document.getElementById('bnBar');
    if(!bar) return;
    var shouldHide = (ai && ai.classList.contains('show')) || (focus && focus.classList.contains('open'));
    bar.style.transform = shouldHide ? 'translateY(100%)' : 'translateY(0)';
  }

  /* ============================================================
     Notifications
     ============================================================ */
  window.isNotifSupported = function(){ return 'Notification' in window; };
  window.getNotifPermission = function(){
    if(!window.isNotifSupported()) return 'unsupported';
    return Notification.permission;
  };
  window.requestNotifPermission = async function(){
    if(!window.isNotifSupported()){ toast('المتصفح ما يدعم الإشعارات', 'warn', 2500); return 'unsupported'; }
    try{
      var perm = await Notification.requestPermission();
      getS().set(window.NOTIF_ASKED_KEY, true);
      if(perm === 'granted'){
        toast('🔔 تم تفعيل الإشعارات!', 'success', 3000);
        window.showNotif('✅ تم التفعيل', 'رح توصلك التنبيهات هنا.');
      } else if(perm === 'denied'){
        toast('⚠️ رفضت الإشعارات', 'warn', 4000);
      }
      if(typeof window.updateNotifBtn === 'function') window.updateNotifBtn();
      return perm;
    }catch(e){ return 'error'; }
  };
  window.showNotif = function(title, body, options){
    options = options || {};
    if(!window.isNotifSupported()) return false;
    if(Notification.permission !== 'granted') return false;
    var opts = { body: body || '', dir: 'rtl', lang: 'ar', tag: options.tag || 'ss-notif-' + Date.now(), requireInteraction: options.requireInteraction || false };
    if(options.data) opts.data = options.data;
    if(navigator.serviceWorker && navigator.serviceWorker.controller){
      navigator.serviceWorker.ready.then(function(reg){
        reg.showNotification(title, opts).catch(function(){
          try{ new Notification(title, opts); }catch(e){}
        });
      }).catch(function(){ try{ new Notification(title, opts); }catch(e){} });
      return true;
    }
    try{
      var n = new Notification(title, opts);
      n.onclick = function(){
        window.focus();
        if(options.data && options.data.tab) window.switchTab(options.data.tab);
        n.close();
      };
      return true;
    }catch(e){ return false; }
  };
  window.updateNotifBtn = function(){
    var txt = document.getElementById('notifBtnText');
    if(!txt) return;
    var perm = window.getNotifPermission();
    if(perm === 'granted') txt.textContent = 'الإشعارات (مفعّلة ✅)';
    else if(perm === 'denied') txt.textContent = 'الإشعارات (محظورة ❌)';
    else if(perm === 'unsupported') txt.textContent = 'الإشعارات (غير مدعومة)';
    else txt.textContent = 'تفعيل الإشعارات';
  };

  /* ============================================================
     Lecture Reminders
     ============================================================ */
  var FIRED_KEY = 'ss_fired_lecture_reminders';
  function loadFired(){ try{ return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') || {}; }catch(e){ return {}; } }
  function saveFired(o){ try{ localStorage.setItem(FIRED_KEY, JSON.stringify(o)); }catch(e){} }
  function playChime(){
    try{
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      var ctx = new Ctx();
      [523.25, 659.25, 783.99].forEach(function(freq, i){
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = freq;
        var t0 = ctx.currentTime + i * 0.15;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.15, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
        o.start(t0); o.stop(t0 + 0.5);
      });
    }catch(e){}
  }
  function checkLectures(){
    var sp = space();
    var tt = sp.timetable || {};
    var DAYS_EN = window.DAYS_EN || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var DAYS_AR = window.DAYS_AR || ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    var now = new Date();
    var todayKey = DAYS_EN[now.getDay()];
    if(!todayKey) return;
    var nowMs = now.getTime();
    var fired = loadFired();
    var todayStr = today();

    Object.keys(tt).forEach(function(key){
      var parts = key.split('-');
      if(parts[0] !== todayKey) return;
      var time = parts[1];
      var tp = time.split(':');
      var hh = parseInt(tp[0], 10);
      var mm = parseInt(tp[1], 10) || 0;
      if(isNaN(hh)) return;
      var lecture = tt[key];
      if(!lecture || !lecture.name) return;
      var lecDate = new Date(now);
      lecDate.setHours(hh, mm, 0, 0);
      var diffMs = lecDate.getTime() - nowMs;
      var diffMin = Math.round(diffMs / 60000);
      [['15', 15, 10], ['5', 5, 1], ['0', 0, -2]].forEach(function(range){
        var key2 = todayStr + '_' + key + '_' + range[0];
        if(diffMin <= range[1] && diffMin > range[2] && !fired[key2]){
          fired[key2] = true; saveFired(fired);
          showLectureReminder(lecture, diffMin, DAYS_AR[now.getDay()]);
        }
      });
    });
  }
  function showLectureReminder(lecture, minutes, dayName){
    var msg = minutes <= 0 ? '🎓 بدأت محاضرتك الآن!' :
              minutes <= 5 ? '🚨 باقي ' + minutes + ' دقائق!' :
              '⏰ باقي ' + minutes + ' دقيقة على محاضرتك';
    var body = lecture.name;
    if(lecture.room) body += ' — 📍 ' + lecture.room;
    toast(msg + ' ' + body, minutes <= 5 ? 'warn' : 'info', 8000);
    playChime();
    if(typeof window.showNotif === 'function'){
      window.showNotif(msg, body, { tag: 'lecture-' + Date.now(), requireInteraction: minutes <= 0, data: { tab: 'timetable' } });
    }
  }
  window.testLectureReminder = function(){
    var first = null;
    Object.keys(space().timetable || {}).forEach(function(k){ if(!first) first = { key: k, cls: space().timetable[k] }; });
    if(!first){ toast('ما عندك محاضرات', 'warn'); return; }
    showLectureReminder(first.cls, 15, 'اليوم');
  };

  /* ============================================================
     Calendar Sync
     ============================================================ */
  var DAYS_ICAL = ['SU','MO','TU','WE','TH','FR','SA'];

  function icsEscape(s){
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
      .replace(/\n/g, '\\n').replace(/\r/g, '');
  }
  function foldLine(line){
    var seg = 73;
    if(line.length <= seg) return line;
    var out = '';
    for(var j = 0; j < line.length; j += seg){
      out += (j === 0 ? '' : '\r\n ') + line.substr(j, seg);
    }
    return out;
  }
  function icsDateLocal(y, m, d, h, mi){
    return y + pad2(m) + pad2(d) + 'T' + pad2(h) + pad2(mi) + '00';
  }
  function icsDateUTC(dt){
    return dt.getUTCFullYear() + pad2(dt.getUTCMonth()+1) + pad2(dt.getUTCDate()) + 'T' +
      pad2(dt.getUTCHours()) + pad2(dt.getUTCMinutes()) + pad2(dt.getUTCSeconds()) + 'Z';
  }
  function getNextDayOfWeek(dayIdx, hour, minute){
    var now = new Date();
    var current = now.getDay();
    var diff = (dayIdx - current + 7) % 7;
    if(diff === 0){
      var t = new Date(now);
      t.setHours(hour, minute, 0, 0);
      if(t.getTime() <= now.getTime()) diff = 7;
    }
    var dt = new Date(now);
    dt.setDate(dt.getDate() + diff);
    dt.setHours(hour, minute, 0, 0);
    return dt;
  }
  function hashString(s){
    var h = 0;
    for(var i = 0; i < s.length; i++){ h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return h;
  }
  function buildICS(){
    var sp = space();
    var name = (sp.profile && sp.profile.name) || 'طالب';
    var nowUtc = icsDateUTC(new Date());
    var DAYS_EN = window.DAYS_EN || ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    var lines = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StudySpace//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsEscape('مساحتي الدراسية — ' + name),
      'X-WR-TIMEZONE:Asia/Amman','BEGIN:VTIMEZONE','TZID:Asia/Amman',
      'BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0300','TZOFFSETTO:+0300',
      'TZNAME:+03','END:STANDARD','END:VTIMEZONE'
    ];

    Object.keys(sp.timetable || {}).forEach(function(key){
      var parts = key.split('-');
      var dayEn = parts[0], time = parts[1];
      var dayIdx = DAYS_EN.indexOf(dayEn);
      if(dayIdx === -1) return;
      var cls = sp.timetable[key];
      if(!cls || !cls.name) return;
      var tp = time.split(':');
      var hh = parseInt(tp[0], 10), mm = parseInt(tp[1], 10) || 0;
      var start = getNextDayOfWeek(dayIdx, hh, mm);
      var dtEnd = new Date(start); dtEnd.setHours(dtEnd.getHours() + 1);
      var uidBase = 'tt-' + dayEn + '-' + pad2(hh) + pad2(mm) + '-' + Math.abs(hashString(cls.name)).toString(36);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + uidBase + '@studyspace');
      lines.push('DTSTAMP:' + nowUtc);
      lines.push('DTSTART;TZID=Asia/Amman:' + icsDateLocal(start.getFullYear(), start.getMonth()+1, start.getDate(), hh, mm));
      lines.push('DTEND;TZID=Asia/Amman:' + icsDateLocal(dtEnd.getFullYear(), dtEnd.getMonth()+1, dtEnd.getDate(), dtEnd.getHours(), dtEnd.getMinutes()));
      lines.push('SUMMARY:' + icsEscape('📚 ' + cls.name));
      if(cls.room) lines.push('LOCATION:' + icsEscape(cls.room));
      lines.push('RRULE:FREQ=WEEKLY;COUNT=16;BYDAY=' + DAYS_ICAL[dayIdx]);
      lines.push('END:VEVENT');
    });

    (sp.exams || []).forEach(function(e){
      if(!e.date) return;
      var p = e.date.split('-'); if(p.length !== 3) return;
      var y = parseInt(p[0],10), m = parseInt(p[1],10), d = parseInt(p[2],10);
      var hh = 9, mm = 0;
      if(e.time && /^\d{1,2}:\d{2}/.test(e.time)){
        var tp = e.time.split(':'); hh = parseInt(tp[0],10); mm = parseInt(tp[1],10) || 0;
      }
      var dtEnd = new Date(y, m-1, d, hh, mm); dtEnd.setHours(dtEnd.getHours()+2);
      var uidBase = 'exam-' + y + pad2(m) + pad2(d) + '-' + Math.abs(hashString(e.name || e.id || 'x')).toString(36);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + uidBase + '@studyspace');
      lines.push('DTSTAMP:' + nowUtc);
      lines.push('DTSTART;TZID=Asia/Amman:' + icsDateLocal(y, m, d, hh, mm));
      lines.push('DTEND;TZID=Asia/Amman:' + icsDateLocal(dtEnd.getFullYear(), dtEnd.getMonth()+1, dtEnd.getDate(), dtEnd.getHours(), dtEnd.getMinutes()));
      lines.push('SUMMARY:' + icsEscape('📝 امتحان: ' + (e.name || '')));
      if(e.room) lines.push('LOCATION:' + icsEscape(e.room));
      lines.push('BEGIN:VALARM'); lines.push('TRIGGER:-PT2H'); lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:' + icsEscape(e.name || '')); lines.push('END:VALARM');
      lines.push('END:VEVENT');
    });

    (sp.tasks || []).forEach(function(t){
      if(t.done || !t.due) return;
      var p = t.due.split('-'); if(p.length !== 3) return;
      var y = parseInt(p[0],10), m = parseInt(p[1],10), d = parseInt(p[2],10);
      var uidBase = 'task-' + y + pad2(m) + pad2(d) + '-' + Math.abs(hashString(t.title || t.id || 'x')).toString(36);
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + uidBase + '@studyspace');
      lines.push('DTSTAMP:' + nowUtc);
      lines.push('DTSTART;TZID=Asia/Amman:' + icsDateLocal(y, m, d, 23, 0));
      lines.push('DTEND;TZID=Asia/Amman:' + icsDateLocal(y, m, d, 23, 30));
      lines.push('SUMMARY:' + icsEscape('⏰ تسليم: ' + (t.title || '')));
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join('\r\n');
  }
  window.downloadICS = function(){
    try{
      var ics = buildICS();
      var blob = new Blob([ics], {type: 'text/calendar;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'study-space-' + today() + '.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
      toast('📅 تم تنزيل ملف التقويم', 'success', 4000);
    }catch(e){
      console.error(e);
      toast('فشل التصدير', 'warn');
    }
  };
  window.buildICS = buildICS;

  function injectCalSyncBtn(){
    var menu = document.getElementById('settingsMenu');
    if(!menu || menu.querySelector('#calSyncBtn')) return;
    var btn = document.createElement('button');
    btn.className = 'settings-item';
    btn.id = 'calSyncBtn';
    btn.innerHTML = '<span>📅</span> مزامنة التقويم (.ics)';
    btn.addEventListener('click', function(){
      if(window.closeSettingsMenu) window.closeSettingsMenu();
      window.downloadICS();
    });
    var pdfBtn = menu.querySelector('#pdfBtn');
    if(pdfBtn) menu.insertBefore(btn, pdfBtn);
    else menu.appendChild(btn);
  }

  /* ============================================================
     Insights
     ============================================================ */
  function computeStreak(log){
    var streak = 0, d = new Date();
    for(var i = 0; i < 365; i++){
      var ds = localDate(d);
      if(log[ds] && log[ds] > 0) streak++;
      else if(i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
  function renderHeatmap(){
    var log = getS().get('studyLog', {});
    var container = document.getElementById('insightsHeatmap'); if(!container) return;
    var days = [], now = new Date(), startDay = new Date(now);
    startDay.setDate(startDay.getDate() - 111);
    startDay.setDate(startDay.getDate() - startDay.getDay());
    var maxMin = 0;
    for(var i = 0; i < 119; i++){
      var d = new Date(startDay); d.setDate(d.getDate() + i);
      var ds = localDate(d);
      var m = log[ds] || 0;
      if(m > maxMin) maxMin = m;
      days.push({date: ds, minutes: m});
    }
    if(maxMin === 0) maxMin = 60;
    var colors = ['var(--bg2)', 'rgba(34,211,238,.25)', 'rgba(34,211,238,.5)', 'rgba(34,211,238,.75)', 'var(--cyan)'];
    var html = '<div style="display:flex;gap:3px;overflow-x:auto;padding:8px 0;direction:ltr">';
    for(var w = 0; w < 17; w++){
      html += '<div style="display:flex;flex-direction:column;gap:3px">';
      for(var dd = 0; dd < 7; dd++){
        var idx = w * 7 + dd;
        if(idx >= days.length){ html += '<div style="width:13px;height:13px"></div>'; continue; }
        var day = days[idx];
        var intensity = day.minutes === 0 ? 0 : Math.min(4, Math.ceil((day.minutes / maxMin) * 4));
        html += '<div title="' + day.date + ' - ' + day.minutes + ' min" style="width:13px;height:13px;border-radius:3px;background:' + colors[intensity] + '"></div>';
      }
      html += '</div>';
    }
    html += '</div>';
    var totalMin = days.reduce(function(a,d){ return a + d.minutes; }, 0);
    var activeDays = days.filter(function(d){ return d.minutes > 0; }).length;
    var streak = computeStreak(log);
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-top:14px">';
    html += '<div style="background:var(--bg2);border-radius:10px;padding:10px;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:var(--cyan)">' + (totalMin/60).toFixed(1) + '</div><div style="font-size:.68rem;color:var(--muted)">ساعات (16 أسبوع)</div></div>';
    html += '<div style="background:var(--bg2);border-radius:10px;padding:10px;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:var(--green)">' + activeDays + '</div><div style="font-size:.68rem;color:var(--muted)">أيام نشطة</div></div>';
    html += '<div style="background:var(--bg2);border-radius:10px;padding:10px;text-align:center"><div style="font-size:1.2rem;font-weight:800;color:var(--amber)">' + streak + '</div><div style="font-size:.68rem;color:var(--muted)">ستريك</div></div>';
    html += '</div>';
    container.innerHTML = html;
  }
  function renderTrends(){
    var log = getS().get('studyLog', {});
    var thisWeek = 0, lastWeek = 0;
    for(var i = 0; i < 7; i++){
      var d1 = new Date(Date.now() - i * 86400000);
      thisWeek += log[localDate(d1)] || 0;
      var d2 = new Date(Date.now() - (i + 7) * 86400000);
      lastWeek += log[localDate(d2)] || 0;
    }
    var diff = lastWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    var color = diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--muted)';
    var html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
    html += '<div style="background:var(--bg2);border-radius:10px;padding:12px"><div style="font-size:.7rem;color:var(--muted)">هذا الأسبوع</div><div style="font-size:1.3rem;font-weight:800;color:var(--cyan);margin-top:4px">' + (thisWeek/60).toFixed(1) + ' س</div></div>';
    html += '<div style="background:var(--bg2);border-radius:10px;padding:12px"><div style="font-size:.7rem;color:var(--muted)">الأسبوع الماضي</div><div style="font-size:1.3rem;font-weight:800;margin-top:4px">' + (lastWeek/60).toFixed(1) + ' س</div><div style="font-size:.68rem;color:' + color + ';margin-top:4px;font-weight:700">' + (diff >= 0 ? '+' : '') + diff + '%</div></div>';
    html += '</div>';
    var container = document.getElementById('insightsTrends');
    if(container) container.innerHTML = html;
  }
  function computeGradePercentage(g){
    var total = 0, earned = 0;
    (g.items || []).forEach(function(it){
      total += parseFloat(it.weight) || 0;
      earned += parseFloat(it.score) || 0;
    });
    return total > 0 ? (earned / total) * 100 : 0;
  }
  window.computeGradePercentage = computeGradePercentage;
  function renderCoursePerformance(){
    var grades = space().grades || [];
    var container = document.getElementById('insightsCourses'); if(!container) return;
    if(!grades.length){
      container.innerHTML = '<div class="empty" style="padding:24px"><div class="ic">📊</div><p>لا توجد علامات</p></div>';
      return;
    }
    var data = grades.map(function(g){ return {name: g.name, pct: computeGradePercentage(g)}; }).sort(function(a,b){ return b.pct - a.pct; });
    var html = '<div style="display:flex;flex-direction:column;gap:8px">';
    data.forEach(function(d){
      var color = d.pct >= 85 ? 'var(--green)' : d.pct >= 70 ? 'var(--cyan)' : d.pct >= 50 ? 'var(--amber)' : 'var(--red)';
      html += '<div style="padding:10px 12px;background:var(--bg2);border-radius:10px">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
        '<span style="font-size:.85rem;font-weight:600">' + esc(d.name) + '</span>' +
        '<span style="font-weight:800;color:' + color + '">' + d.pct.toFixed(1) + '%</span></div>' +
        '<div style="height:5px;background:var(--card);border-radius:5px;overflow:hidden">' +
        '<div style="height:100%;width:' + d.pct + '%;background:' + color + '"></div></div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }
  function renderGpaForecast(){
    var grades = space().grades || [];
    var container = document.getElementById('insightsGpa'); if(!container) return;
    if(!grades.length){
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:.85rem">أضف علامات أولاً</div>';
      return;
    }
    var courses = space().courses || [];
    var totalPts = 0, totalHrs = 0;
    grades.forEach(function(g){
      var pct = computeGradePercentage(g);
      var hrs = 3;
      var found = courses.find(function(c){ return c.name === g.name; });
      if(found && found.hours) hrs = found.hours;
      var pts = pct >= 90 ? 4.0 : pct >= 85 ? 3.75 : pct >= 80 ? 3.5 : pct >= 75 ? 3.0 :
                pct >= 70 ? 2.75 : pct >= 65 ? 2.5 : pct >= 60 ? 2.0 : pct >= 55 ? 1.75 :
                pct >= 50 ? 1.5 : pct >= 45 ? 1.0 : 0;
      totalPts += pts * hrs;
      totalHrs += hrs;
    });
    var currentGpa = totalHrs > 0 ? totalPts / totalHrs : 0;
    var label = currentGpa >= 3.75 ? 'ممتاز' : currentGpa >= 3.5 ? 'جيد جدًا مرتفع' :
                currentGpa >= 3.0 ? 'جيد جداً' : currentGpa >= 2.5 ? 'جيد' :
                currentGpa >= 2.0 ? 'مقبول' : 'يحتاج تحسين';
    container.innerHTML = '<div style="text-align:center;padding:16px">' +
      '<div style="font-size:.78rem;color:var(--muted)">معدل متوقع</div>' +
      '<div style="font-size:2.6rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:8px 0">' + currentGpa.toFixed(2) + '</div>' +
      '<div style="font-size:.85rem;color:var(--cyan);font-weight:700">' + label + '</div>' +
      '<div style="font-size:.72rem;color:var(--muted);margin-top:12px">' + totalHrs + ' ساعة من ' + grades.length + ' مادة</div></div>';
  }
  function renderInsights(){
    renderHeatmap(); renderTrends(); renderCoursePerformance(); renderGpaForecast();
  }
  window.renderInsights = renderInsights;

  function injectInsightsSection(){
    var dash = document.getElementById('dashboard'); if(!dash) return;
    if(document.getElementById('insightsSection')) return;
    var section = document.createElement('div');
    section.id = 'insightsSection';
    section.className = 'card';
    section.style.marginTop = '16px';
    section.innerHTML =
      '<div class="card-head"><h3>📈 تحليلات متقدمة</h3>' +
      '<span class="card-action" id="insightsRefresh">🔄 تحديث</span></div>' +
      '<div style="margin-bottom:16px">' +
        '<div class="chart-title" style="margin-bottom:10px">ساعات الدراسة (16 أسبوع)</div>' +
        '<div id="insightsHeatmap"></div>' +
      '</div>' +
      '<div style="margin-bottom:16px">' +
        '<div class="chart-title" style="margin-bottom:10px">هذا الأسبوع vs الماضي</div>' +
        '<div id="insightsTrends"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">' +
        '<div><div class="chart-title" style="margin-bottom:10px">أداء المواد</div>' +
        '<div id="insightsCourses"></div></div>' +
        '<div><div class="chart-title" style="margin-bottom:10px">توقع المعدل</div>' +
        '<div id="insightsGpa" style="background:var(--grad-soft);border-radius:12px;border:1px solid var(--glow)"></div></div>' +
      '</div>';
    var lastCard = null;
    for(var i = 0; i < dash.children.length; i++){
      var ch = dash.children[i];
      if(ch.classList && ch.classList.contains('card')) lastCard = ch;
    }
    try{
      if(lastCard && lastCard.parentNode === dash) dash.insertBefore(section, lastCard);
      else dash.appendChild(section);
    }catch(e){ dash.appendChild(section); }
    var refresh = document.getElementById('insightsRefresh');
    if(refresh && !refresh._bound){
      refresh._bound = true;
      refresh.addEventListener('click', function(){ renderInsights(); toast('تم التحديث', 'success'); });
    }
  }

  /* ============================================================
     Plan Simulator
     ============================================================ */
  function ensureCompletedCourses(){
    var sp = space();
    if(Array.isArray(sp.completedCourses)) return sp.completedCourses;
    var list = [];
    (sp.courses || []).forEach(function(c){ if(c && c.completed === true && c.name) list.push(c.name); });
    if(!window.space.completedCourses) window.space.completedCourses = list;
    saveSpace();
    return list;
  }
  window.getCompletedCourses = function(){
    ensureCompletedCourses();
    var done = {};
    (space().completedCourses || []).forEach(function(n){ if(n) done[n] = true; });
    (space().courses || []).forEach(function(c){ if(c && c.completed === true && c.name) done[c.name] = true; });
    return done;
  };
  window.prereqsMet = function(courseName, completed){
    completed = completed || window.getCompletedCourses();
    var DB = window.COURSES_DB || {};
    var info = DB[courseName];
    if(!info || !info.pre || !info.pre.length) return true;
    for(var i = 0; i < info.pre.length; i++){
      if(!completed[info.pre[i]]) return false;
    }
    return true;
  };
  function getProgress(){
    var completed = window.getCompletedCourses();
    var DB = window.COURSES_DB || {};
    var stats = { 'uni-c':0, 'uni-e':0, 'faculty':0, 'major-c':0, 'major-e':0, 'remedial':0, total:0 };
    Object.keys(completed).forEach(function(name){
      var info = DB[name]; if(!info) return;
      var t = info.t || 'major-c';
      if(stats[t] !== undefined) stats[t] += info.h;
      if(t !== 'remedial') stats.total += info.h;
    });
    return stats;
  }
  window.getCurrentSemester = function(){
    var sp = space();
    if(sp.currentSemester && sp.currentSemester >= 1 && sp.currentSemester <= 10) return sp.currentSemester;
    var plan = window.RECOMMENDED_PLAN || {};
    var completed = window.getCompletedCourses();
    var currentSem = 1;
    for(var sem = 1; sem <= 10; sem++){
      var courses = plan[sem] || [];
      if(!courses.length) continue;
      var allDone = courses.every(function(name){ return completed[name]; });
      if(allDone) currentSem = sem + 1;
      else break;
    }
    return Math.min(currentSem, 10);
  };
  window.suggestNextSemester = function(){
    var sp = space();
    var completed = window.getCompletedCourses();
    var DB = window.COURSES_DB || {};
    var plan = window.RECOMMENDED_PLAN || {};
    var currentCourses = (sp.courses || []).map(function(c){ return c.name; });
    var currentSem = window.getCurrentSemester();
    var candidates = plan[currentSem] || [];
    var suggestions = [];
    candidates.forEach(function(name){
      var info = DB[name]; if(!info) return;
      if(completed[name]) return;
      if(currentCourses.indexOf(name) > -1) return;
      var ready = window.prereqsMet(name, completed);
      suggestions.push({
        name: name, info: info, ready: ready,
        blocked: ready ? null : info.pre.filter(function(p){ return !completed[p]; })
      });
    });
    return {
      semester: currentSem,
      suggestions: suggestions,
      totalHours: suggestions.filter(function(s){ return s.ready; }).reduce(function(a,s){ return a + s.info.h; }, 0),
      progress: getProgress()
    };
  };
  window.analyzeGraduationGap = function(){
    var progress = getProgress();
    var total = window.TOTAL_REQUIRED_HOURS || { 'uni-c':18, 'uni-e':6, 'faculty':33, 'major-c':88, 'major-e':15, 'remedial':9, total:160 };
    var remaining = {
      'uni-c': Math.max(0, (total['uni-c'] || 18) - progress['uni-c']),
      'uni-e': Math.max(0, (total['uni-e'] || 6) - progress['uni-e']),
      'faculty': Math.max(0, (total.faculty || 33) - progress.faculty),
      'major-c': Math.max(0, (total['major-c'] || 88) - progress['major-c']),
      'major-e': Math.max(0, (total['major-e'] || 15) - progress['major-e']),
      'remedial': Math.max(0, (total.remedial || 9) - progress.remedial),
      total: Math.max(0, (total.total || 160) - progress.total)
    };
    return { progress: progress, remaining: remaining, totalRequired: total };
  };
  window.renderPlanSimulator = function(){
    var container = document.getElementById('planSimulatorBody'); if(!container) return;
    var result = window.suggestNextSemester();
    var gap = window.analyzeGraduationGap();
    var semNames = ['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
    var pct = Math.round((gap.progress.total / gap.totalRequired.total) * 100);
    var html = '';
    html += '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-head"><h3>📊 تقدمك نحو التخرج</h3>' +
      '<span style="font-size:.85rem;color:var(--cyan);font-weight:800">' + pct + '%</span></div>' +
      '<div class="sc-progress"><div class="sc-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div style="text-align:center;font-size:.75rem;color:var(--muted);margin-top:8px">' +
      gap.progress.total + ' / ' + gap.totalRequired.total + ' ساعة · باقي ' + gap.remaining.total + '</div>' +
      '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" id="psManageCompleted">☑ إدارة المنجزة</button>' +
      '<button class="btn btn-sm btn-ghost" id="psImportFromGpa">📥 استيراد من المعدل</button>' +
      '</div></div>';
    html += '<div class="card"><div class="card-head"><h3>🎯 مقترح للترم القادم (' + (semNames[result.semester] || '—') + ')</h3>' +
      '<span class="badge" style="background:var(--grad-soft);color:var(--cyan)">' + result.totalHours + ' ساعة</span></div>';
    if(!result.suggestions.length){
      html += '<div class="empty"><div class="ic">✨</div><p>ما لقيت مواد مقترحة</p></div>';
    } else {
      html += '<div style="display:flex;flex-direction:column;gap:8px">';
      result.suggestions.forEach(function(s){
        var t = (window.COURSE_TYPES && window.COURSE_TYPES[s.info.t]) || { label:'مادة', icon:'📘', color:'var(--cyan)' };
        var badge = s.ready
          ? '<span style="font-size:.68rem;padding:3px 9px;border-radius:6px;background:rgba(52,211,153,.15);color:var(--green);font-weight:700">✅ جاهز</span>'
          : '<span style="font-size:.68rem;padding:3px 9px;border-radius:6px;background:rgba(251,191,36,.15);color:var(--amber);font-weight:700">⚠️ متطلب</span>';
        html += '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:12px' + (s.ready ? '' : ';opacity:.75') + '">' +
          '<div style="font-size:1.4rem">' + t.icon + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.9rem">' + esc(s.name) + '</div>' +
          '<div style="font-size:.7rem;color:var(--muted2);font-family:monospace">' + esc(s.info.code) + ' · ' + s.info.h + ' ساعات</div>' +
          (s.blocked ? '<div style="font-size:.7rem;color:var(--amber);margin-top:4px">🔒 محجوب بـ: ' + s.blocked.map(esc).join('، ') + '</div>' : '') +
          '</div>' + badge + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    html += '<div class="card" style="margin-top:16px"><h3>⚙️ أدوات</h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" id="psSetSemester">🎯 تحديد الفصل</button>' +
      '<button class="btn btn-sm btn-ghost" id="psExportPlan">📤 تصدير</button>' +
      '<button class="btn btn-sm btn-danger" id="psResetCompleted">🗑 مسح السجل</button>' +
      '</div></div>';
    container.innerHTML = html;
    var manage = document.getElementById('psManageCompleted');
    if(manage) manage.addEventListener('click', openCompletionManager);
    var importGpa = document.getElementById('psImportFromGpa');
    if(importGpa) importGpa.addEventListener('click', importFromGpa);
    var setSem = document.getElementById('psSetSemester');
    if(setSem) setSem.addEventListener('click', setCurrentSemesterDialog);
    var expBtn = document.getElementById('psExportPlan');
    if(expBtn) expBtn.addEventListener('click', exportNextSemester);
    var resBtn = document.getElementById('psResetCompleted');
    if(resBtn) resBtn.addEventListener('click', resetCompleted);
  };

  function openCompletionManager(){
    var DB = window.COURSES_DB || {};
    var SEM = window.SEMESTERS || [];
    var completed = window.getCompletedCourses();
    var seen = {}, groups = { 'uni-c':[], 'uni-e':[], 'faculty':[], 'major-c':[], 'major-e':[], 'remedial':[] };
    SEM.forEach(function(s){
      (s.courses || []).forEach(function(c){
        if(seen[c.n]) return;
        seen[c.n] = true;
        var info = DB[c.n];
        var t = info ? info.t : 'major-c';
        if(!groups[t]) groups[t] = [];
        groups[t].push({ name: c.n, h: c.h, code: c.code || (info && info.code) || '' });
      });
    });
    Object.keys(DB).forEach(function(name){
      if(seen[name]) return;
      seen[name] = true;
      var info = DB[name];
      var t = info.t || 'major-c';
      if(!groups[t]) groups[t] = [];
      groups[t].push({ name: name, h: info.h || 3, code: info.code || '' });
    });
    document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop show';
    var typeLabels = {
      'uni-c': { i:'🏛️', l:'جامعة إجبارية' }, 'uni-e': { i:'🎨', l:'جامعة اختيارية' },
      'faculty': { i:'🏫', l:'كلية' }, 'major-c': { i:'🎯', l:'تخصص إجباري' },
      'major-e': { i:'⭐', l:'تخصص اختياري' }, 'remedial':{ i:'📌', l:'استدراكية' }
    };
    var html = '<div class="modal" style="max-width:640px;padding:22px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<h3 style="margin:0">☑ إدارة المواد المنجزة</h3>' +
      '<span id="cpmCount" style="font-size:.8rem;color:var(--cyan);font-weight:700"></span></div>' +
      '<div style="margin-bottom:12px"><input id="cpmSearch" placeholder="🔍 ابحث..." ' +
      'style="width:100%;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);color:var(--text);border-radius:10px;font-family:inherit"></div>' +
      '<div id="cpmList" style="max-height:55vh;overflow-y:auto;padding:4px">';
    Object.keys(groups).forEach(function(t){
      if(!groups[t].length) return;
      var meta = typeLabels[t] || { i:'📘', l:t };
      html += '<div data-cpm-group="' + t + '" style="margin-bottom:14px"><div style="font-size:.78rem;font-weight:800;color:var(--cyan);margin-bottom:6px">' +
        meta.i + ' ' + meta.l + ' (' + groups[t].length + ')</div>';
      groups[t].forEach(function(c){
        var checked = completed[c.name] ? 'checked' : '';
        html += '<label class="cpm-item" data-name="' + esc(c.name) + '" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:4px;cursor:pointer">' +
          '<input type="checkbox" ' + checked + ' style="width:18px;height:18px;accent-color:var(--cyan);cursor:pointer">' +
          '<span style="flex:1;font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.name) + '</span>' +
          '<span style="font-size:.7rem;color:var(--muted);font-family:monospace">' + esc(c.code) + '</span>' +
          '<span style="font-size:.7rem;color:var(--cyan);font-weight:700">' + c.h + ' س</span></label>';
      });
      html += '</div>';
    });
    html += '</div><div class="modal-actions" style="margin-top:14px">' +
      '<button class="btn btn-sm btn-ghost" id="cpmCancel">إلغاء</button>' +
      '<button class="btn btn-sm" id="cpmSave">💾 حفظ</button></div></div>';
    bd.innerHTML = html;
    document.body.appendChild(bd);
    var list = bd.querySelector('#cpmList');
    var search = bd.querySelector('#cpmSearch');
    var countEl = bd.querySelector('#cpmCount');
    function updateCount(){
      var n = list.querySelectorAll('input[type="checkbox"]:checked').length;
      countEl.textContent = n + ' منجزة';
    }
    updateCount();
    list.addEventListener('change', function(e){ if(e.target.type === 'checkbox') updateCount(); });
    if(search){
      search.addEventListener('input', function(){
        var q = search.value.trim().toLowerCase();
        list.querySelectorAll('.cpm-item').forEach(function(item){
          var name = (item.dataset.name || '').toLowerCase();
          item.style.display = (!q || name.indexOf(q) > -1) ? '' : 'none';
        });
      });
    }
    bd.querySelector('#cpmCancel').onclick = function(){ bd.remove(); };
    bd.onclick = function(e){ if(e.target === bd) bd.remove(); };
    bd.querySelector('#cpmSave').onclick = function(){
      var selected = [];
      list.querySelectorAll('.cpm-item').forEach(function(item){
        var cb = item.querySelector('input[type="checkbox"]');
        if(cb && cb.checked) selected.push(item.dataset.name);
      });
      window.space.completedCourses = selected;
      (space().courses || []).forEach(function(c){
        if(c && c.name) c.completed = selected.indexOf(c.name) > -1;
      });
      saveSpace();
      toast('✅ تم الحفظ — ' + selected.length + ' مادة', 'success', 2500);
      bd.remove();
      window.renderPlanSimulator();
    };
  }

  function importFromGpa(){
    var rows = window.gpaRows || [];
    if(!rows.length){ toast('حاسبة المعدل فاضية', 'warn'); return; }
    var names = rows.filter(function(r){ return r && r.name && parseFloat(r.hrs) > 0; }).map(function(r){ return r.name; });
    if(!names.length){ toast('لا يوجد مواد بأسماء', 'warn'); return; }
    if(!confirm('استيراد ' + names.length + ' مادة كمنجزة؟')) return;
    var current = (space().completedCourses || []).slice();
    names.forEach(function(n){ if(current.indexOf(n) === -1) current.push(n); });
    window.space.completedCourses = current;
    saveSpace();
    toast('✅ استورد ' + names.length + ' مادة', 'success');
    window.renderPlanSimulator();
  }

  function setCurrentSemesterDialog(){
    var current = space().currentSemester || window.getCurrentSemester();
    var names = ['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
    var options = [];
    for(var i = 1; i <= 10; i++) options.push({ v: String(i), l: 'الفصل ' + names[i] });
    window.showModal('🎯 الفصل الحالي', [
      { key: 'sem', label: 'الفصل', type: 'select', options: options }
    ], { sem: String(current) }, function(data){
      window.space.currentSemester = parseInt(data.sem, 10) || 1;
      saveSpace();
      toast('✅ تم التحديث', 'success');
      window.renderPlanSimulator();
      return true;
    });
  }

  function resetCompleted(){
    if(!confirm('مسح كل المواد من قائمة المنجزة؟')) return;
    window.space.completedCourses = [];
    (space().courses || []).forEach(function(c){ if(c) c.completed = false; });
    saveSpace();
    toast('🗑 تم المسح', 'success');
    window.renderPlanSimulator();
  }

  function exportNextSemester(){
    var result = window.suggestNextSemester();
    var semNames = ['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
    var lines = ['📚 خطة ' + (semNames[result.semester] || 'الترم الجاي'), ''];
    result.suggestions.filter(function(s){ return s.ready; }).forEach(function(s){
      lines.push('• ' + s.name + ' (' + s.info.code + ') — ' + s.info.h + ' ساعات');
    });
    lines.push('');
    lines.push('المجموع: ' + result.totalHours + ' ساعة');
    var text = lines.join('\n');
    if(navigator.clipboard){
      navigator.clipboard.writeText(text);
      toast('📋 نُسخت الخطة', 'success');
    } else alert(text);
  }

  function injectPlanSimTab(){
    var planSection = document.getElementById('plan'); if(!planSection) return;
    var tabsWrap = planSection.querySelector('.section-tabs'); if(!tabsWrap) return;
    if(tabsWrap.querySelector('[data-plan-tab="simulator"]')) return;
    var tab = document.createElement('button');
    tab.className = 'section-tab';
    tab.setAttribute('data-plan-tab', 'simulator');
    tab.textContent = '🎓 محاكي الترم الجاي';
    tabsWrap.appendChild(tab);
    var sim = document.createElement('div');
    sim.className = 'subsection';
    sim.setAttribute('data-plan-sub', 'simulator');
    sim.innerHTML = '<div id="planSimulatorBody"></div>';
    planSection.appendChild(sim);
    tab.addEventListener('click', function(){
      if(window.switchSubTab) window.switchSubTab('plan', 'simulator');
      window.renderPlanSimulator();
    });
  }

  /* ============================================================
     Mindmap
     ============================================================ */
  function parseTextToTree(text){
    if(!text) return null;
    var lines = String(text).split(/\r?\n/).map(function(l){ return l.replace(/\t/g, '  '); }).filter(function(l){ return l.trim().length > 0; });
    var root = { label: 'الموضوع', children: [] };
    var stack = [{ node: root, indent: -1 }];
    lines.forEach(function(line){
      var indentMatch = line.match(/^(\s*)/);
      var indent = indentMatch ? indentMatch[1].length : 0;
      var content = line.trim().replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '');
      while(stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      var node = { label: content, children: [] };
      stack[stack.length - 1].node.children.push(node);
      stack.push({ node: node, indent: indent });
    });
    if(root.children.length === 1 && root.children[0].children.length > 0) return root.children[0];
    return root;
  }
  function renderMindmapSVG(layout){
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + layout.width + ' ' + layout.height + '" style="width:100%;height:auto;max-height:75vh;background:var(--bg2);border-radius:14px">';
    layout.links.forEach(function(l){
      var x1 = l.from.x, y1 = l.from.y, x2 = l.to.x, y2 = l.to.y;
      var cx1 = (x1 + x2) / 2, cx2 = (x1 + x2) / 2;
      svg += '<path d="M ' + x1 + ' ' + y1 + ' C ' + cx1 + ' ' + y1 + ', ' + cx2 + ' ' + y2 + ', ' + x2 + ' ' + y2 + '" stroke="' + l.to.color + '" stroke-width="2" fill="none" opacity="0.5"/>';
    });
    layout.nodes.forEach(function(n){
      var fontSize = n.depth === 0 ? 14 : (n.depth === 1 ? 12 : 10);
      var approxWidth = Math.max(70, n.label.length * (fontSize * 0.55) + 24);
      var boxH = fontSize * 1.8;
      svg += '<g>';
      svg += '<rect x="' + (n.x - 4) + '" y="' + (n.y - boxH/2) + '" width="' + approxWidth + '" height="' + boxH + '" rx="10" fill="var(--card)" stroke="' + n.color + '" stroke-width="2"/>';
      svg += '<text x="' + (n.x + approxWidth/2 - 4) + '" y="' + (n.y + fontSize * 0.35) + '" text-anchor="middle" font-family="Tahoma" font-size="' + fontSize + '" fill="var(--text)" style="direction:rtl">' + esc(n.label.slice(0, 40)) + '</text>';
      svg += '</g>';
    });
    svg += '</svg>';
    return svg;
  }
  window.openMindmapManual = function(){
    document.querySelectorAll('.modal-backdrop').forEach(function(m){ m.remove(); });
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop show';
    bd.innerHTML = '<div class="modal" style="max-width:620px">' +
      '<h3>🧠 خريطة ذهنية</h3>' +
      '<div class="form-group"><label>العنوان</label><input id="mmTitle" placeholder="ملخص الفصل 3"></div>' +
      '<div class="form-group"><label>المحتوى</label><textarea id="mmText" rows="12" style="font-family:monospace;direction:rtl;min-height:200px" placeholder="المفاهيم\n  - التعريف\n  - مثال"></textarea></div>' +
      '<div class="modal-actions"><button class="btn btn-sm btn-ghost" id="mmCancel">إلغاء</button>' +
      '<button class="btn btn-sm" id="mmGo">🎨 توليد</button></div></div>';
    document.body.appendChild(bd);
    setTimeout(function(){ var t = document.getElementById('mmText'); if(t) t.focus(); }, 150);
    bd.querySelector('#mmCancel').onclick = function(){ bd.remove(); };
    bd.onclick = function(e){ if(e.target === bd) bd.remove(); };
    bd.querySelector('#mmGo').onclick = function(){
      var title = (document.getElementById('mmTitle').value || '').trim();
      var text = (document.getElementById('mmText').value || '').trim();
      if(!text){ toast('اكتب محتوى', 'warn'); return; }
      bd.remove();
      var tree = parseTextToTree(text);
      if(title && tree) tree.label = title;
      var nodes = [{ id:'n0', x:60, y:200, label: tree.label, depth:0, color:'#22d3ee' }];
      var links = [];
      var colors = ['#22d3ee','#a78bfa','#34d399','#fbbf24','#f472b6','#f87171'];
      (tree.children || []).forEach(function(child, i){
        var childNode = { id:'c'+i, x:260, y:80 + i*80, label: child.label, depth:1, color: colors[i % colors.length] };
        nodes.push(childNode);
        links.push({ from: nodes[0], to: childNode });
      });
      var width = 800, height = Math.max(400, 80 * ((tree.children || []).length) + 100);
      var svg = renderMindmapSVG({ nodes: nodes, links: links, width: width, height: height });
      var bd2 = document.createElement('div');
      bd2.className = 'modal-backdrop show';
      bd2.innerHTML = '<div class="modal" style="max-width:96vw;width:1000px;padding:22px">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:14px"><h3 style="margin:0">🧠 ' + esc(title || 'خريطة') + '</h3>' +
        '<button class="btn btn-sm btn-ghost" id="mmClose2">✕</button></div>' +
        '<div style="overflow:auto;background:var(--bg2);border-radius:14px;padding:8px">' + svg + '</div></div>';
      document.body.appendChild(bd2);
      bd2.querySelector('#mmClose2').onclick = function(){ bd2.remove(); };
      bd2.onclick = function(e){ if(e.target === bd2) bd2.remove(); };
    };
  };
  function injectMindmapBtn(){
    var menu = document.getElementById('settingsMenu');
    if(!menu || menu.querySelector('#mmBtn')) return;
    var btn = document.createElement('button');
    btn.className = 'settings-item';
    btn.id = 'mmBtn';
    btn.innerHTML = '<span>🧠</span> خريطة ذهنية';
    btn.addEventListener('click', function(){
      if(window.closeSettingsMenu) window.closeSettingsMenu();
      window.openMindmapManual();
    });
    var pdfBtn = menu.querySelector('#pdfBtn');
    if(pdfBtn) menu.insertBefore(btn, pdfBtn);
    else menu.appendChild(btn);
  }

  /* ============================================================
     Bindings
     ============================================================ */
  function bindAll(){
    var nbtn = document.getElementById('notifBtn');
    if(nbtn && !nbtn._ib){
      nbtn._ib = true;
      nbtn.addEventListener('click', function(e){
        e.stopPropagation();
        var perm = window.getNotifPermission();
        if(perm === 'granted') window.showNotif('✅ الإشعارات مفعّلة', 'رح تستقبل التنبيهات هنا.');
        else if(perm === 'denied') toast('⚠️ الإشعارات محظورة — فعّلها من إعدادات المتصفح', 'warn', 4000);
        else window.requestNotifPermission();
      });
    }
    bnInject();
    bnInjectBar();
    bnSync();
    if(window.switchTab && !window._bnSwitchWrapped){
      var orig = window.switchTab;
      window.switchTab = function(tab, push){
        var r = orig.apply(this, arguments);
        setTimeout(bnSync, 50);
        return r;
      };
      window._bnSwitchWrapped = true;
    }
    setTimeout(function(){
      var ai = document.getElementById('aiPanel');
      var focus = document.getElementById('focusScreen');
      if(ai || focus){
        var obs = new MutationObserver(bnUpdateVisibility);
        if(ai) obs.observe(ai, { attributes: true, attributeFilter: ['class'] });
        if(focus) obs.observe(focus, { attributes: true, attributeFilter: ['class'] });
      }
      bnUpdateVisibility();
    }, 1500);
  }

  /* ============================================================
     Init
     ============================================================ */
  function init(){
    bindAll();
    injectSmartBtn();
    setTimeout(injectSmartBtn, 1000);
    setTimeout(injectSmartBtn, 2500);
    timetableUiRun();
    setTimeout(timetableUiRun, 600);
    setTimeout(timetableUiRun, 1500);
    setTimeout(checkLectures, 10000);
    setInterval(checkLectures, 60 * 1000);
    if(window.switchTab && !window._ibSwitchWrapped){
      var origSwitch = window.switchTab;
      window.switchTab = function(tab){
        var r = origSwitch.apply(this, arguments);
        setTimeout(function(){
          if(tab === 'timetable'){ injectSmartBtn(); timetableUiRun(); }
        }, 100);
        return r;
      };
      window._ibSwitchWrapped = true;
    }
    injectCalSyncBtn();
    injectMindmapBtn();
    setTimeout(injectPlanSimTab, 500);
    setTimeout(injectPlanSimTab, 1500);
    if(typeof window.renderDashboard === 'function' && !window._insightsWrapped){
      var orig = window.renderDashboard;
      window.renderDashboard = function(){
        var r = orig.apply(this, arguments);
        try{ injectInsightsSection(); renderInsights(); }catch(e){}
        return r;
      };
      window._insightsWrapped = true;
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('🔗 integrations.js v3 loaded (Part 1 + 2 + Smart Timetable v7)');
})();