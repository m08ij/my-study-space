  /* ============================================================
     Smart Timetable v4 — 7 تطويرات
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

  /* Draft helpers */
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

  /* Templates */
  function getTemplates(){
    try{ return JSON.parse(localStorage.getItem('stt_templates') || '[]'); }catch(e){ return []; }
  }
  function saveTemplates(arr){
    try{ localStorage.setItem('stt_templates', JSON.stringify(arr.slice(0, 5))); }catch(e){}
  }

  /* Helpers */
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

  function sttEmptyRow(){
    return {
      code:'', name:'', matched:null, days:[],
      timeFrom:'', timeTo:'', room:'',
      section:'', notes:''
    };
  }
  function sttCreateRows(n){
    var r = []; for(var i = 0; i < n; i++) r.push(sttEmptyRow()); return r;
  }

  /* ============ STT CSS ============ */
  var STT_CSS = 'stt-style-v6';
  function sttInjectCSS(){
    if(document.getElementById(STT_CSS)) return;
    var css = `
      .stt-backdrop{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.78);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px}
      .stt-modal{background:var(--card);border:1px solid var(--border);border-radius:22px;width:100%;max-width:1400px;max-height:94vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6);position:relative}

      .stt-header{display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(34,211,238,.08),rgba(167,139,250,.08));flex-shrink:0;gap:10px;flex-wrap:wrap}
      .stt-header-left{display:flex;align-items:center;gap:10px}
      .stt-header h3{margin:0;font-size:1.05rem;font-weight:800;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
      .stt-header-actions{display:flex;gap:6px;align-items:center}
      .stt-icon-btn{height:34px;padding:0 12px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--muted);cursor:pointer;font-family:inherit;font-size:.78rem;font-weight:700;display:inline-flex;align-items:center;gap:6px;transition:.2s}
      .stt-icon-btn:hover{background:var(--grad-soft);border-color:var(--cyan);color:var(--cyan)}
      .stt-close{width:34px;height:34px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:1.3rem;display:flex;align-items:center;justify-content:center}
      .stt-close:hover{background:rgba(239,68,68,.15);border-color:var(--red);color:var(--red)}

      /* Stats Bar */
      .stt-stats{display:flex;gap:10px;padding:12px 22px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
      .stt-stat{flex:1;min-width:110px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}
      .stt-stat-v{font-size:1.3rem;font-weight:900;color:var(--cyan);line-height:1}
      .stt-stat-l{font-size:.68rem;color:var(--muted);font-weight:600}
      .stt-stat.green .stt-stat-v{color:var(--green)}
      .stt-stat.amber .stt-stat-v{color:var(--amber)}
      .stt-stat.purple .stt-stat-v{color:var(--purple)}

      /* Quickbar */
      .stt-quickbar{padding:10px 22px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap;align-items:center;flex-shrink:0}
      .stt-quickbar-label{font-size:.72rem;color:var(--muted);font-weight:800;margin-left:4px}
      .stt-quick-btn{padding:6px 12px;background:var(--card);border:1px solid var(--border);color:var(--muted);border-radius:20px;font-family:inherit;font-size:.72rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:.2s}
      .stt-quick-btn:hover{border-color:var(--cyan);color:var(--cyan);transform:translateY(-1px)}
      .stt-quick-btn.danger:hover{border-color:var(--red);color:var(--red)}

      /* Draft notice */
      .stt-draft-notice{padding:8px 22px;background:rgba(251,191,36,.1);border-bottom:1px solid rgba(251,191,36,.25);font-size:.75rem;color:var(--amber);display:none;align-items:center;gap:8px}
      .stt-draft-notice.show{display:flex}
      .stt-draft-notice button{margin-right:auto;padding:4px 10px;border-radius:8px;background:transparent;border:1px solid currentColor;color:inherit;cursor:pointer;font-family:inherit;font-size:.7rem;font-weight:700}

      /* Rows container */
      .stt-rows{flex:1;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:8px;background:var(--bg)}

      /* Row */
      .stt-row{display:grid;grid-template-columns:28px 38px 140px minmax(160px,1fr) 240px 170px 100px 90px 90px;gap:8px;align-items:center;padding:12px;background:var(--bg2);border:1.5px solid var(--border);border-radius:14px;transition:.25s;position:relative}
      .stt-row.matched{border-color:rgba(52,211,153,.4);background:linear-gradient(135deg,rgba(52,211,153,.04),transparent)}
      .stt-row.ready{border-color:rgba(52,211,153,.5)}
      .stt-row.dragging{opacity:.4;transform:scale(.98)}
      .stt-row.drag-over{border-color:var(--cyan);box-shadow:0 0 0 3px var(--glow)}

      .stt-drag{width:24px;height:36px;display:flex;align-items:center;justify-content:center;cursor:grab;color:var(--muted2);font-size:1.1rem;border-radius:8px;transition:.2s;user-select:none}
      .stt-drag:hover{background:var(--card2);color:var(--cyan)}
      .stt-drag:active{cursor:grabbing}

      .stt-num{width:32px;height:32px;border-radius:9px;background:var(--grad);color:#0b0f1a;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.85rem}
      .stt-row.matched .stt-num{background:linear-gradient(135deg,#34d399,#10b981)}

      .stt-input{width:100%;background:var(--card);border:1.5px solid var(--border);color:var(--text);padding:8px 10px;border-radius:9px;font-family:inherit;font-size:.85rem;outline:none;height:38px;transition:.2s;min-width:0}
      .stt-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--glow)}
      .stt-code{font-family:ui-monospace,monospace;direction:ltr;text-align:left;letter-spacing:.5px;font-weight:700}

      .stt-name-cell{display:flex;flex-direction:column;gap:2px;min-width:0}
      .stt-name-cell .stt-input{height:36px}
      .stt-match{font-size:.65rem;color:var(--green);font-weight:700;padding:0 4px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:12px}
      .stt-match.no-match{color:var(--amber)}
      .stt-match:empty{display:none}

      /* Days (English) */
      .stt-days{display:flex;gap:2px;padding:4px;background:var(--card);border:1.5px solid var(--border);border-radius:9px;height:38px;align-items:center;justify-content:center}
      .stt-day{flex:1;height:26px;border-radius:6px;background:transparent;border:none;color:var(--muted);cursor:pointer;font-family:inherit;font-size:.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;transition:.2s;padding:0;letter-spacing:.2px;text-transform:uppercase}
      .stt-day:hover{color:var(--text);background:var(--card2)}
      .stt-day.active{background:var(--grad);color:#0b0f1a;transform:scale(1.08);box-shadow:0 2px 6px var(--glow)}

      /* Time */
      .stt-time{display:flex;align-items:center;gap:4px;position:relative}
      .stt-time-sel{flex:1;background:var(--card);border:1.5px solid var(--border);color:var(--text);padding:0 6px;border-radius:9px;font-family:ui-monospace,monospace;font-size:.82rem;outline:none;height:38px;direction:ltr;text-align:center;cursor:pointer;font-weight:700;min-width:0}
      .stt-time-sel:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--glow)}
      .stt-arrow{color:var(--muted2);font-weight:700;font-size:.75rem}
      .stt-duration{position:absolute;bottom:-14px;right:50%;transform:translateX(50%);font-size:.6rem;font-weight:800;color:var(--cyan);background:var(--card);padding:1px 6px;border-radius:5px;border:1px solid var(--border);white-space:nowrap;pointer-events:none}
      .stt-duration:empty{display:none}

      /* Room */
      .stt-room-cell{display:flex;flex-direction:column;gap:2px;position:relative;min-width:0}
      .stt-room-suggest{position:absolute;top:100%;right:0;left:0;z-index:20;background:var(--card);border:1px solid var(--border);border-radius:9px;margin-top:4px;box-shadow:var(--shadow-lg);max-height:160px;overflow-y:auto;display:none}
      .stt-room-suggest.show{display:block}
      .stt-room-suggest-item{padding:8px 12px;font-size:.8rem;cursor:pointer;text-align:right;transition:.15s}
      .stt-room-suggest-item:hover{background:var(--grad-soft);color:var(--cyan)}

      /* Section number */
      .stt-section{width:100%;background:var(--card);border:1.5px solid var(--border);color:var(--text);padding:8px 6px;border-radius:9px;font-family:ui-monospace,monospace;font-size:.82rem;outline:none;height:38px;text-align:center;font-weight:700}
      .stt-section:focus{border-color:var(--cyan);box-shadow:0 0 0 3px var(--glow)}

      /* Notes */
      .stt-notes{width:100%;background:var(--card);border:1.5px dashed var(--border);color:var(--text);padding:8px 10px;border-radius:9px;font-family:inherit;font-size:.78rem;outline:none;height:38px}
      .stt-notes:focus{border-color:var(--purple);border-style:solid;box-shadow:0 0 0 3px rgba(167,139,250,.2)}
      .stt-notes::placeholder{color:var(--muted2)}

      /* Actions */
      .stt-row-actions{display:flex;gap:3px}
      .stt-row-btn{width:32px;height:32px;border-radius:8px;background:transparent;border:1.5px solid var(--border);color:var(--muted);cursor:pointer;font-size:.95rem;display:flex;align-items:center;justify-content:center;transition:.2s;padding:0;font-family:inherit}
      .stt-row-btn:hover{background:var(--card2);border-color:var(--cyan);color:var(--cyan)}
      .stt-row-btn.del:hover{background:rgba(239,68,68,.15);border-color:var(--red);color:var(--red)}
      .stt-row-btn.copy:hover{background:rgba(167,139,250,.15);border-color:var(--purple);color:var(--purple)}

      /* Badges */
      .stt-badges{display:flex;gap:4px;margin-top:2px;flex-wrap:wrap}
      .stt-badge{padding:2px 6px;border-radius:5px;font-size:.6rem;font-weight:800;letter-spacing:.3px}
      .stt-badge.theory{background:rgba(34,211,238,.15);color:var(--cyan)}
      .stt-badge.practical{background:rgba(52,211,153,.15);color:var(--green)}
      .stt-badge.lab{background:rgba(251,191,36,.15);color:var(--amber)}

      /* Footer */
      .stt-footer{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-top:1px solid var(--border);background:var(--card2);gap:10px;flex-wrap:wrap;flex-shrink:0}
      .stt-footer-hint{font-size:.78rem;color:var(--muted);text-align:center;flex:1;min-width:150px}
      .stt-btn{padding:10px 18px;border-radius:11px;font-family:inherit;font-size:.86rem;font-weight:800;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px;transition:.2s}
      .stt-btn-primary{background:var(--grad);color:#0b0f1a;box-shadow:0 6px 20px var(--glow)}
      .stt-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px var(--glow)}
      .stt-btn-primary:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
      .stt-btn-ghost{background:transparent;color:var(--text);border:1.5px solid var(--border)}
      .stt-btn-ghost:hover{background:var(--card);border-color:var(--cyan);color:var(--cyan)}
      .stt-btn-warn{background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#0b0f1a}

      /* Preview Overlay */
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

      /* Templates dropdown */
      .stt-templates-menu{position:absolute;top:60px;left:22px;background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);padding:6px;min-width:250px;z-index:120;display:none}
      .stt-templates-menu.show{display:block}
      .stt-template-item{padding:10px 12px;border-radius:8px;cursor:pointer;font-size:.82rem;display:flex;justify-content:space-between;gap:8px;align-items:center;transition:.15s}
      .stt-template-item:hover{background:var(--grad-soft);color:var(--cyan)}
      .stt-template-empty{padding:14px;text-align:center;font-size:.78rem;color:var(--muted2)}

      /* Responsive */
      @media (max-width: 1100px){
        .stt-row{grid-template-columns:24px 34px 120px minmax(140px,1fr) 200px 150px 80px 80px 70px;gap:6px;padding:10px}
      }
      @media (max-width: 860px){
        .stt-row{
          grid-template-columns:24px 32px 1fr 70px 60px 32px;
          grid-template-areas:
            "drag num name actions actions actions"
            "code code code code code code"
            "days days days days days days"
            "time time time time time time"
            "room room room room room room"
            "section section section notes notes notes";
          gap:6px;padding:10px;
        }
        .stt-drag{grid-area:drag}
        .stt-num{grid-area:num}
        .stt-name-cell{grid-area:name}
        .stt-code{grid-area:code}
        .stt-days{grid-area:days}
        .stt-time{grid-area:time}
        .stt-room-cell{grid-area:room}
        .stt-section{grid-area:section}
        .stt-notes{grid-area:notes}
        .stt-row-actions{grid-area:actions;justify-content:flex-end}
        .stt-input,.stt-section,.stt-notes,.stt-time-sel,.stt-days{height:42px}
      }
      @media (max-width: 520px){
        .stt-modal{border-radius:16px;max-height:96vh}
        .stt-header{padding:12px 14px}
        .stt-header h3{font-size:.9rem}
        .stt-stats{padding:8px 14px}
        .stt-stat{padding:8px 10px;min-width:90px}
        .stt-stat-v{font-size:1.1rem}
        .stt-quickbar{padding:8px 14px}
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

  /* ============ Main openSmartModal ============ */
  function openSmartModal(initialRows){
    sttInjectCSS();
    loadSTTCache();
    document.querySelectorAll('.stt-backdrop').forEach(function(b){ b.remove(); });

    /* Load draft if no initial rows */
    var draft = !initialRows ? loadDraft() : null;
    var startRows = initialRows && initialRows.length ? initialRows :
                    (draft && draft.length ? draft : sttCreateRows(MIN_ROWS));

    var state = {
      rows: startRows,
      dragIdx: null
    };

    var backdrop = document.createElement('div');
    backdrop.className = 'stt-backdrop';
    document.body.appendChild(backdrop);
    var modal = document.createElement('div');
    modal.className = 'stt-modal';
    backdrop.appendChild(modal);

    /* ============ Header ============ */
    var header = document.createElement('div');
    header.className = 'stt-header';
    header.innerHTML =
      '<div class="stt-header-left">' +
        '<h3>✨ إضافة جدول — دفعة واحدة</h3>' +
      '</div>' +
      '<div class="stt-header-actions">' +
        '<button class="stt-icon-btn" data-hdr="templates" type="button">📁 القوالب</button>' +
        '<button class="stt-icon-btn" data-hdr="save-tpl" type="button">💾 حفظ كقالب</button>' +
        '<button class="stt-close" type="button">×</button>' +
      '</div>';
    modal.appendChild(header);

    /* Templates menu */
    var tplMenu = document.createElement('div');
    tplMenu.className = 'stt-templates-menu';
    header.appendChild(tplMenu);

    /* ============ Stats bar ============ */
    var statsBar = document.createElement('div');
    statsBar.className = 'stt-stats';
    statsBar.innerHTML =
      '<div class="stt-stat"><div class="stt-stat-v" data-stat="rows">0</div><div class="stt-stat-l">📋 صفوف جاهزة</div></div>' +
      '<div class="stt-stat green"><div class="stt-stat-v" data-stat="hours">0</div><div class="stt-stat-l">⏱️ ساعة أسبوعياً</div></div>' +
      '<div class="stt-stat purple"><div class="stt-stat-v" data-stat="courses">0</div><div class="stt-stat-l">📚 مواد فريدة</div></div>' +
      '<div class="stt-stat amber"><div class="stt-stat-v" data-stat="conflicts">0</div><div class="stt-stat-l">⚠️ تعارضات محتملة</div></div>';
    modal.appendChild(statsBar);

    /* ============ Draft notice ============ */
    var draftNotice = document.createElement('div');
    draftNotice.className = 'stt-draft-notice';
    draftNotice.innerHTML =
      '<span>📝 عندك مسودّة محفوظة من قبل — استرجعناها لك</span>' +
      '<button type="button" data-draft="clear">مسح المسودّة</button>';
    modal.appendChild(draftNotice);
    if(draft && draft.length) draftNotice.classList.add('show');

    /* ============ Quickbar ============ */
    var quickbar = document.createElement('div');
    quickbar.className = 'stt-quickbar';
    quickbar.innerHTML =
      '<span class="stt-quickbar-label">⚡ سريع:</span>' +
      '<button class="stt-quick-btn" data-quick="weekdays" type="button">🗓️ أيام الدوام Sun-Thu</button>' +
      '<button class="stt-quick-btn" data-quick="1h" type="button">⏱️ ساعة كاملة</button>' +
      '<button class="stt-quick-btn" data-quick="1.5h" type="button">⏱️ ساعة ونصف</button>' +
      '<button class="stt-quick-btn danger" data-quick="clear-days" type="button">✕ مسح الأيام</button>' +
      '<button class="stt-quick-btn danger" data-quick="clear-all" type="button">🗑️ مسح الكل</button>';
    modal.appendChild(quickbar);

    /* ============ Rows container ============ */
    var rowsWrap = document.createElement('div');
    rowsWrap.className = 'stt-rows';
    modal.appendChild(rowsWrap);

    /* ============ Footer ============ */
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

    /* ============ Preview overlay ============ */
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
          if(seen[key]){
            conflicts++;
          } else {
            seen[key] = true;
          }
        });
      });
      return conflicts;
    }

    function updateStats(){
      var ready = state.rows.filter(isRowComplete);
      var totalMin = ready.reduce(function(a, r){
        return a + calcDuration(r.timeFrom, r.timeTo);
      }, 0);
      var uniqCourses = {};
      ready.forEach(function(r){ uniqCourses[r.name] = true; });
      var conflicts = countConflicts();

      statsBar.querySelector('[data-stat="rows"]').textContent = ready.length;
      statsBar.querySelector('[data-stat="hours"]').textContent = (totalMin/60).toFixed(1);
      statsBar.querySelector('[data-stat="courses"]').textContent = Object.keys(uniqCourses).length;
      statsBar.querySelector('[data-stat="conflicts"]').textContent = conflicts;
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

    /* ============ Auto-save Draft ============ */
    var draftTimer = null;
    function scheduleDraftSave(){
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function(){
        saveDraft(state.rows);
      }, 800);
    }

    /* ============ Update row status ============ */
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
          if(info.t) ex.push(info.t === 'faculty' ? 'كلية' : info.t === 'major-c' ? 'تخصص' : info.t === 'uni-c' ? 'جامعة' : '');
          matchEl.textContent = '✓ ' + (ex.length ? ex.filter(Boolean).join(' · ') : row.matched.name);
          matchEl.classList.remove('no-match');
        } else if(row.code && row.code.length >= 6){
          matchEl.textContent = '⚠ كود غير معروف';
          matchEl.classList.add('no-match');
        } else {
          matchEl.textContent = '';
          matchEl.classList.remove('no-match');
        }
      }

      /* Duration badge */
      var durEl = rowEl.querySelector('[data-duration]');
      if(durEl){
        var min = calcDuration(row.timeFrom, row.timeTo);
        durEl.textContent = formatDuration(min);
      }

      rowEl.classList.toggle('matched', !!row.matched);
      rowEl.classList.toggle('ready', isRowComplete(row));
    }

    /* ============ Build Row ============ */
    function buildRowEl(row, idx){
      var el = document.createElement('div');
      el.className = 'stt-row';
      el.dataset.idx = idx;
      el.draggable = false;

      /* Drag handle */
      var drag = document.createElement('div');
      drag.className = 'stt-drag';
      drag.innerHTML = '⋮⋮';
      drag.title = 'اسحب للترتيب';
      drag.draggable = true;
      el.appendChild(drag);

      /* Number */
      var num = document.createElement('div');
      num.className = 'stt-num';
      num.textContent = String(idx + 1);
      el.appendChild(num);

      /* Code */
      var code = document.createElement('input');
      code.type = 'text';
      code.className = 'stt-input stt-code';
      code.placeholder = '0110108101';
      code.value = row.code || '';
      code.autocomplete = 'off';
      code.dataset.field = 'code';
      el.appendChild(code);

      /* Name + match */
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

      /* Days (English) */
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

      /* Time */
      var timeWrap = document.createElement('div');
      timeWrap.className = 'stt-time';
      var fromSel = document.createElement('select');
      fromSel.className = 'stt-time-sel';
      fromSel.dataset.field = 'timeFrom';
      fromSel.innerHTML = '<option value="">--:--</option>' +
        STT_TIME_SLOTS.map(function(t){ return '<option value="' + t + '"' + (row.timeFrom === t ? ' selected' : '') + '>' + t + '</option>'; }).join('');
      timeWrap.appendChild(fromSel);
      var arrow = document.createElement('span');
      arrow.className = 'stt-arrow';
      arrow.textContent = '→';
      timeWrap.appendChild(arrow);
      var toSel = document.createElement('select');
      toSel.className = 'stt-time-sel';
      toSel.dataset.field = 'timeTo';
      toSel.innerHTML = '<option value="">--:--</option>' +
        STT_TIME_SLOTS.map(function(t){ return '<option value="' + t + '"' + (row.timeTo === t ? ' selected' : '') + '>' + t + '</option>'; }).join('');
      timeWrap.appendChild(toSel);
      var durBadge = document.createElement('div');
      durBadge.className = 'stt-duration';
      durBadge.dataset.duration = '1';
      timeWrap.appendChild(durBadge);
      el.appendChild(timeWrap);

      /* Room */
      var roomCell = document.createElement('div');
      roomCell.className = 'stt-room-cell';
      var room = document.createElement('input');
      room.type = 'text';
      room.className = 'stt-input';
      room.placeholder = '104 ح.ب';
      room.value = row.room || '';
      room.autocomplete = 'off';
      room.dataset.field = 'room';
      roomCell.appendChild(room);
      var suggest = document.createElement('div');
      suggest.className = 'stt-room-suggest';
      roomCell.appendChild(suggest);
      el.appendChild(roomCell);

      /* Section number */
      var section = document.createElement('input');
      section.type = 'text';
      section.className = 'stt-section';
      section.placeholder = 'شعبة';
      section.title = 'رقم الشعبة (نظري: 1 · عملي: 0)';
      section.value = row.section || '';
      section.dataset.field = 'section';
      el.appendChild(section);

      /* Notes */
      var notes = document.createElement('input');
      notes.type = 'text';
      notes.className = 'stt-notes';
      notes.placeholder = 'ملاحظات (تيمز/moodle)';
      notes.value = row.notes || '';
      notes.dataset.field = 'notes';
      el.appendChild(notes);

      /* Actions */
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

    /* ============ Render ============ */
    function renderRows(){
      rowsWrap.innerHTML = '';
      state.rows.forEach(function(row, idx){ rowsWrap.appendChild(buildRowEl(row, idx)); });
      updateFooter();
      attachDragHandlers();
    }

    /* ============ Drag & Drop ============ */
    function attachDragHandlers(){
      rowsWrap.querySelectorAll('.stt-drag').forEach(function(handle){
        handle.addEventListener('dragstart', function(e){
          var rowEl = handle.closest('.stt-row');
          state.dragIdx = parseInt(rowEl.dataset.idx, 10);
          rowEl.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          try{ e.dataTransfer.setData('text/plain', String(state.dragIdx)); }catch(err){}
        });
        handle.addEventListener('dragend', function(e){
          rowsWrap.querySelectorAll('.stt-row').forEach(function(r){
            r.classList.remove('dragging','drag-over');
          });
          state.dragIdx = null;
        });
      });

      rowsWrap.querySelectorAll('.stt-row').forEach(function(rowEl){
        rowEl.addEventListener('dragover', function(e){
          e.preventDefault();
          if(state.dragIdx === null) return;
          var thisIdx = parseInt(rowEl.dataset.idx, 10);
          if(thisIdx === state.dragIdx) return;
          rowsWrap.querySelectorAll('.stt-row').forEach(function(r){ r.classList.remove('drag-over'); });
          rowEl.classList.add('drag-over');
        });
        rowEl.addEventListener('dragleave', function(){
          rowEl.classList.remove('drag-over');
        });
        rowEl.addEventListener('drop', function(e){
          e.preventDefault();
          if(state.dragIdx === null) return;
          var targetIdx = parseInt(rowEl.dataset.idx, 10);
          if(targetIdx === state.dragIdx) return;
          var moved = state.rows.splice(state.dragIdx, 1)[0];
          state.rows.splice(targetIdx, 0, moved);
          renderRows();
          toast('↕️ تم الترتيب', 'info', 1200);
        });
      });
    }

    /* ============ Input handler ============ */
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
          } else {
            row.matched = null;
          }
          updateRowStatus(idx);
          updateFooter();
          scheduleDraftSave();
        }, 220);
      } else if(field === 'name'){
        row.name = val.trim();
        updateFooter();
        scheduleDraftSave();
      } else if(field === 'section'){
        row.section = val.trim();
        scheduleDraftSave();
      } else if(field === 'notes'){
        row.notes = val;
        scheduleDraftSave();
      } else if(field === 'room'){
        row.room = val.trim();
        scheduleDraftSave();
        var suggest = rowEl.querySelector('.stt-room-suggest');
        if(suggest){
          var q = val.trim().toLowerCase();
          if(q.length >= 1){
            var matches = STT_CACHE.rooms.filter(function(r){ return r.toLowerCase().indexOf(q) > -1; }).slice(0, 5);
            if(matches.length && STT_CACHE.rooms.indexOf(val.trim()) === -1){
              suggest.innerHTML = matches.map(function(r){
                return '<div class="stt-room-suggest-item">' + r + '</div>';
              }).join('');
              suggest.classList.add('show');
            } else suggest.classList.remove('show');
          } else suggest.classList.remove('show');
        }
      }
    });

    /* ============ Change handler (selects) ============ */
    rowsWrap.addEventListener('change', function(e){
      var sel = e.target.closest('select[data-field]'); if(!sel) return;
      var rowEl = sel.closest('.stt-row'); if(!rowEl) return;
      var idx = parseInt(rowEl.dataset.idx, 10);
      var field = sel.dataset.field;
      var val = sel.value;
      var row = state.rows[idx]; if(!row) return;

      if(field === 'timeFrom'){
        row.timeFrom = val;
        if(val && !row.timeTo){
          row.timeTo = addMinutesToTime(val, 60);
          var toSel = rowEl.querySelector('[data-field="timeTo"]');
          if(toSel) toSel.value = row.timeTo;
        }
        updateRowStatus(idx); updateFooter(); scheduleDraftSave();
      } else if(field === 'timeTo'){
        row.timeTo = val;
        if(row.timeFrom && val && calcDuration(row.timeFrom, val) <= 0){
          row.timeTo = addMinutesToTime(row.timeFrom, 60);
          var toSel2 = rowEl.querySelector('[data-field="timeTo"]');
          if(toSel2) toSel2.value = row.timeTo;
        }
        updateRowStatus(idx); updateFooter(); scheduleDraftSave();
      }
    });

    /* ============ Click handler ============ */
    rowsWrap.addEventListener('click', function(e){
      /* Day */
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
        updateFooter();
        updateRowStatus(idx);
        scheduleDraftSave();
        return;
      }

      /* Copy */
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

      /* Delete */
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

      /* Room suggest */
      var sg = e.target.closest('.stt-room-suggest-item');
      if(sg){
        e.preventDefault();
        var cell = sg.closest('.stt-room-cell');
        var inp = cell.querySelector('input');
        if(inp){
          inp.value = sg.textContent;
          var rEl = inp.closest('.stt-row');
          var i5 = parseInt(rEl.dataset.idx, 10);
          if(state.rows[i5]) state.rows[i5].room = sg.textContent;
        }
        cell.querySelector('.stt-room-suggest').classList.remove('show');
        scheduleDraftSave();
      }
    });

    /* Hide room suggests */
    document.addEventListener('click', function(ev){
      if(!ev.target.closest('.stt-room-cell')){
        rowsWrap.querySelectorAll('.stt-room-suggest').forEach(function(s){ s.classList.remove('show'); });
      }
    });

    /* ============ Quickbar ============ */
    quickbar.addEventListener('click', function(e){
      var btn = e.target.closest('[data-quick]'); if(!btn) return;
      var q = btn.dataset.quick;
      if(q === 'weekdays'){
        state.rows.forEach(function(r){ r.days = ['Sun','Mon','Tue','Wed','Thu']; });
        renderRows(); scheduleDraftSave();
        toast('✅ طُبّقت Sun-Thu على الكل', 'success', 1600);
      } else if(q === '1h'){
        state.rows.forEach(function(r){ if(r.timeFrom){ r.timeTo = addMinutesToTime(r.timeFrom, 60); } });
        renderRows(); scheduleDraftSave();
        toast('✅ طُبّقت ساعة كاملة', 'success', 1600);
      } else if(q === '1.5h'){
        state.rows.forEach(function(r){ if(r.timeFrom){ r.timeTo = addMinutesToTime(r.timeFrom, 90); } });
        renderRows(); scheduleDraftSave();
        toast('✅ طُبّقت ساعة ونصف', 'success', 1600);
      } else if(q === 'clear-days'){
        state.rows.forEach(function(r){ r.days = []; });
        renderRows(); scheduleDraftSave();
      } else if(q === 'clear-all'){
        if(window.customConfirm){
          window.customConfirm('مسح كل الصفوف؟', function(){
            state.rows = sttCreateRows(MIN_ROWS);
            renderRows(); scheduleDraftSave();
          });
        }
      }
    });

    /* ============ Draft notice ============ */
    draftNotice.addEventListener('click', function(e){
      if(e.target.closest('[data-draft="clear"]')){
        clearDraft();
        draftNotice.classList.remove('show');
        toast('🗑 مُسحت المسودّة', 'info', 1500);
      }
    });

    /* ============ Templates ============ */
    function renderTemplatesMenu(){
      var tpls = getTemplates();
      if(!tpls.length){
        tplMenu.innerHTML = '<div class="stt-template-empty">ما في قوالب محفوظة بعد</div>';
        return;
      }
      tplMenu.innerHTML = tpls.map(function(t, i){
        var date = new Date(t.ts).toLocaleDateString('ar-EG');
        return '<div class="stt-template-item" data-tpl="' + i + '">' +
          '<span>📋 ' + (t.name || 'بدون اسم') + ' <span style="color:var(--muted2);font-size:.7rem">(' + t.rows.length + ' صف · ' + date + ')</span></span>' +
          '<span style="color:var(--red);font-size:.9rem" data-tpl-del="' + i + '" title="حذف">×</span>' +
        '</div>';
      }).join('');
    }

    header.addEventListener('click', function(e){
      if(e.target.closest('[data-hdr="templates"]')){
        renderTemplatesMenu();
        tplMenu.classList.toggle('show');
      } else if(e.target.closest('[data-hdr="save-tpl"]')){
        if(!window.showModal) return;
        window.showModal('💾 حفظ كقالب', [
          {key:'name', label:'اسم القالب', placeholder:'جدول الفصل الأول 2026'}
        ], {name:''}, function(data){
          if(!data.name){ toast('أدخل اسم', 'warn'); return false; }
          var tpls = getTemplates();
          tpls.unshift({ name: data.name, rows: JSON.parse(JSON.stringify(state.rows)), ts: Date.now() });
          saveTemplates(tpls);
          toast('✅ حُفظ كقالب', 'success', 2000);
          return true;
        });
      } else if(e.target.closest('.stt-close')){
        close();
      }
    });

    tplMenu.addEventListener('click', function(e){
      var delBtn = e.target.closest('[data-tpl-del]');
      if(delBtn){
        e.stopPropagation();
        var idx = parseInt(delBtn.dataset.tplDel, 10);
        var tpls = getTemplates();
        tpls.splice(idx, 1);
        saveTemplates(tpls);
        renderTemplatesMenu();
        toast('🗑 حُذف القالب', 'info', 1500);
        return;
      }
      var item = e.target.closest('[data-tpl]');
      if(item){
        var i = parseInt(item.dataset.tpl, 10);
        var tpls = getTemplates();
        if(tpls[i]){
          state.rows = JSON.parse(JSON.stringify(tpls[i].rows));
          renderRows();
          scheduleDraftSave();
          tplMenu.classList.remove('show');
          toast('✅ حُمّل القالب', 'success', 1800);
        }
      }
    });

    /* ============ Footer ============ */
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
      } else if(action === 'cancel'){
        close();
      } else if(action === 'preview'){
        showPreview();
      } else if(action === 'save'){
        saveAll();
      }
    });

    /* ============ Preview ============ */
    function showPreview(){
      var body = previewOverlay.querySelector('[data-preview="body"]');
      var ready = state.rows.filter(isRowComplete);
      if(!ready.length){
        toast('ما في صفوف جاهزة', 'warn', 2000);
        return;
      }

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

      /* Detect conflicts per row */
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
        '<th style="width:180px">الأيام</th>' +
        '<th style="width:130px">الوقت</th>' +
        '<th style="width:100px">القاعة</th>' +
        '<th style="width:50px">شعبة</th>' +
      '</tr></thead><tbody>';

      ready.forEach(function(r, i){
        var cls = conflictRows[i] ? 'conflict' : '';
        var daysHtml = (r.days || []).map(function(d){
          return '<span class="stt-preview-day">' + d + '</span>';
        }).join('');
        html += '<tr class="' + cls + '">' +
          '<td>' + (i+1) + '</td>' +
          '<td style="font-family:monospace;direction:ltr;text-align:left;font-size:.72rem">' + esc(r.code || '—') + '</td>' +
          '<td><b>' + esc(r.name) + '</b>' + (r.notes ? '<div style="font-size:.68rem;color:var(--muted);margin-top:2px">📝 ' + esc(r.notes) + '</div>' : '') + '</td>' +
          '<td><div class="stt-preview-days">' + daysHtml + '</div></td>' +
          '<td style="font-family:monospace;direction:ltr;font-size:.75rem">' + (r.timeFrom || '') + ' → ' + (r.timeTo || '') + '</td>' +
          '<td>' + esc(r.room || '—') + '</td>' +
          '<td>' + esc(r.section || '—') + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';

      if(conflicts){
        html = '<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px;margin-bottom:14px;font-size:.82rem;color:var(--red);font-weight:700">' +
          '⚠️ عندك ' + conflicts + ' تعارض — راجع الصفوف الحمراء' +
        '</div>' + html;
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

    /* ============ Close ============ */
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

    /* ============ Save ============ */
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
            name: finalName,
            room: row.room || '',
            instructor: '',
            section: row.section || '',
            notes: row.notes || ''
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