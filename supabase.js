/* ============================================================
   ☁️ supabase.js — Config + Client
   ============================================================ */
(function(){
  'use strict';

  var CFG = {
    url: 'https://serlheaqobgnyuzfnqtl.supabase.co',
    anonKey: 'sb_publishable_vUjj_AksIR77ShK5JGf_Bw_fXspAXSk',
    bucket: 'course-files'
  };

  var client = null;
  var codeKey = 'ss_sync_code';
  var code = null;

  function genCode(){
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var out = '';
    for(var i = 0; i < 6; i++){ out += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return out;
  }
  function ensureCode(){
    if(code) return code;
    try{ code = localStorage.getItem(codeKey); }catch(e){}
    if(!code){ code = genCode(); try{ localStorage.setItem(codeKey, code); }catch(e){} }
    return code;
  }
  function getCode(){ return ensureCode(); }
  function setCode(newCode){
    code = String(newCode || '').trim().toUpperCase();
    try{ localStorage.setItem(codeKey, code); ['ss_space_ts', 'ss_cloud_ver', 'ss_synced_hash'].forEach(function(x){ localStorage.removeItem(x); }); }catch(e){}  /* رمز جديد = سحابته هي المرجع */
    if(typeof window.__perfClearFileCache === 'function') window.__perfClearFileCache();
    return code;
  }

  function init(){
    if(client) return client;
    if(!CFG.url || !CFG.anonKey || CFG.url.indexOf('YOUR-') > -1) return null;
    if(typeof window.supabase === 'undefined' || !window.supabase.createClient) return null;
    try{
      /* ترويسة x-space-code برمز المستخدم الحالي مع كل طلب: سياسات التخزين (supabase/04-storage-own-folder.sql) تقصر القراءة/الحذف/الرفع على مجلد رمزه فقط.
         تُقرأ وقت الطلب لا وقت الإنشاء، فتتبع تغيير الرمز. لا أثر لها إن لم تُفعَّل السياسات. */
      client = window.supabase.createClient(CFG.url, CFG.anonKey, {
        auth: { persistSession: false },
        global: { fetch: function(input, init){
          init = init || {};
          try{ var h = new Headers(init.headers || (input && input.headers) || {}); h.set('x-space-code', ensureCode()); init.headers = h; }catch(e){}
          return fetch(input, init);
        } }
      });
      console.log('☁️ Supabase client ready');
    }catch(e){ console.error('Supabase init failed:', e); client = null; }
    return client;
  }

  /* ---------- وضع RPC (جاهز لكنه معطّل افتراضياً (CFG.useRpc=false) حتى تُنشأ الدوال بالخادم؛ ومع التفعيل يرجع للجدول تلقائياً إن لم توجد) ----------
     عند تشغيل ملفات supabase/*.sql (الدوال get_space/put_space/peek_space) يُفعَّل هذا الوضع لتتوقف القراءة/الكتابة المباشرة
     على جدول spaces. إن كانت الدالة غير موجودة بالخادم نرجع للجدول المباشر ونتذكر ذلك طوال الجلسة (طلب واحد فاشل فقط). */
  CFG.useRpc = true;    /* الدوال get_space/put_space/peek_space/list_course_files أُنشئت بالخادم (02a)؛ إن غابت يرجع للجدول تلقائياً */
  var rpcMissing = false, listRpcMissing = false;
  try{ rpcMissing = sessionStorage.getItem('ss_rpc_missing') === '1'; }catch(e){}   /* لا نكرر الطلب الفاشل أثناء الجلسة */
  function markMissing(){ rpcMissing = true; try{ sessionStorage.setItem('ss_rpc_missing', '1'); }catch(e){} }
  function rpcAvailable(c){ return CFG.useRpc && !rpcMissing && c && typeof c.rpc === 'function'; }
  function isMissingFn(err){
    var m = String((err && (err.message || err.details || '')) || '');
    return !!err && (err.code === 'PGRST202' || err.code === '42883' || err.status === 404 || /Could not find the function|does not exist/i.test(m));
  }

  /* lastLoadStatus: 'ok' | 'empty' (ما في صف بالسحابة) | 'error' (فشل التحميل) */
  async function load(){
    var c = init();
    if(!c){ api.lastLoadStatus = 'error'; return null; }
    var k = ensureCode();
    try{
      if(rpcAvailable(c)){
        var rr = await c.rpc('get_space', { p_code: k });
        if(!rr.error){
          if(!rr.data){ api.lastLoadStatus = 'empty'; return null; }
          api.lastLoadStatus = 'ok';
          return { data: rr.data.data, updated_at: rr.data.updated_at };
        }
        if(isMissingFn(rr.error)) markMissing();
        else { console.warn('Supabase rpc load error:', rr.error); api.lastLoadStatus = 'error'; return null; }
      }
      var res = await c.from('spaces').select('data, updated_at').eq('code', k).maybeSingle();
      if(res.error){ console.warn('Supabase load error:', res.error); api.lastLoadStatus = 'error'; return null; }
      if(!res.data){ api.lastLoadStatus = 'empty'; return null; }
      api.lastLoadStatus = 'ok';
      return res.data;
    }catch(e){ console.warn('Supabase load failed:', e); api.lastLoadStatus = 'error'; return null; }
  }

  /* قراءة updated_at فقط (خفيفة) — لكشف التعديل من جهاز آخر قبل الحفظ */
  async function peekUpdatedAt(){
    var c = init(); if(!c) return { status: 'error' };
    try{
      if(rpcAvailable(c)){
        var rr = await c.rpc('peek_space', { p_code: ensureCode() });
        if(!rr.error) return rr.data ? { status: 'ok', updated_at: rr.data } : { status: 'empty' };
        if(isMissingFn(rr.error)) markMissing(); else return { status: 'error' };
      }
      var res = await c.from('spaces').select('updated_at').eq('code', ensureCode()).maybeSingle();
      if(res.error) return { status: 'error' };
      if(!res.data) return { status: 'empty' };
      return { status: 'ok', updated_at: res.data.updated_at };
    }catch(e){ return { status: 'error' }; }
  }

  async function save(snapshot){
    var c = init(); if(!c) return false;
    var k = ensureCode();
    try{
      if(rpcAvailable(c)){
        var rr = await c.rpc('put_space', { p_code: k, p_data: snapshot, p_updated_at: new Date().toISOString() });
        if(!rr.error) return true;
        if(isMissingFn(rr.error)) markMissing();
        else { console.warn('Supabase rpc save error:', rr.error); return false; }
      }
      var res = await c.from('spaces').upsert(
        { code: k, data: snapshot, updated_at: new Date().toISOString() },
        { onConflict: 'code' }
      );
      if(res.error){ console.warn('Supabase save error:', res.error); return false; }
      return true;
    }catch(e){ console.warn('Supabase save failed:', e); return false; }
  }

  /* كاش قصير + دمج الطلبات المتزامنة: renderCourses بتنادي لكل مادة أكثر من مرة */
  var FILES_TTL = 30000;
  var filesCache = {};
  window.__perfClearFileCache = function(){ filesCache = {}; };
  /* عند refresh/إغلاق الصفحة المتصفح يلغي الطلبات الجارية (Firefox: NetworkError) — سلوك طبيعي */
  var unloading = false;
  window.addEventListener('pagehide', function(){ unloading = true; });
  window.addEventListener('beforeunload', function(){ unloading = true; });

  /* يرجّع null عند الفشل (غير [] = ما في ملفات) */
  function listCourseFiles(courseId, force){
    var hit = filesCache[courseId];
    if(!force && hit && Date.now() - hit.ts < FILES_TTL) return hit.promise;
    /* فشل مؤقت: محاولة ثانية واحدة فقط، وبدون محاولة إذا الصفحة عم تنغلق (refresh) */
    var p = fetchCourseFiles(courseId).then(function(r){
      if(r !== null || unloading) return r;
      return new Promise(function(done){ setTimeout(done, 1200); })
        .then(function(){ return unloading ? null : fetchCourseFiles(courseId); });
    });
    filesCache[courseId] = { ts: Date.now(), promise: p };
    p.then(function(r){ if(r === null && filesCache[courseId] && filesCache[courseId].promise === p) delete filesCache[courseId]; });
    return p;
  }

  /* قائمة ملفات عدة مجلدات (id المادة + مجلدات مرتبطة بها عبر filesFrom).
     يرجّع null إذا فشل أي مجلد — حتى لا يظهر "لا ملفات" بسبب فشل جزئي. */
  function listCourseFilesMulti(ids, force){
    var uniq = [];
    (ids || []).forEach(function(i){ if(i && uniq.indexOf(i) === -1) uniq.push(i); });
    return Promise.all(uniq.map(function(i){ return listCourseFiles(i, force); })).then(function(parts){
      var all = [];
      for(var k = 0; k < parts.length; k++){ if(parts[k] === null) return null; all = all.concat(parts[k]); }
      all.sort(function(a, b){ return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
      return all;
    });
  }

  async function fetchCourseFiles(courseId){
    var c = init(); if(!c) return null;
    var k = ensureCode();
    var path = k + '/courses/' + courseId;
    try{
      /* صفحات من 100 (حتى 1000 ملف): فشل أي صفحة = null حتى لا تظهر قائمة ناقصة كأنها كاملة */
      var rows = [];
      for(var page = 0; page < 10; page++){
        var got;
        if(rpcAvailable(c) && !listRpcMissing){
          /* القائمة عبر دالة تأخذ الرمز (لا يوجد list مباشر على الـ bucket): لا يمكن سرد مجلدات الرموز كلها */
          var rr = await c.rpc('list_course_files', { p_code: k, p_course: String(courseId), p_limit: 100, p_offset: page * 100 });
          if(rr.error){
            if(isMissingFn(rr.error)){ listRpcMissing = true; rows = []; page = -1; continue; }
            if(!unloading) console.warn('list files rpc error:', rr.error); return null;
          }
          got = rr.data || [];
        } else {
          var res = await c.storage.from(CFG.bucket).list(path, {
            limit: 100, offset: page * 100, sortBy: {column:'created_at', order:'desc'}
          });
          if(res.error){ if(!unloading) console.warn('list files error:', res.error); return null; }
          got = res.data || [];
        }
        rows = rows.concat(got);
        if(got.length < 100) break;
      }
      return rows.map(function(f){
        var urlRes = c.storage.from(CFG.bucket).getPublicUrl(path + '/' + f.name);
        return {
          name: f.name,
          size: f.metadata ? f.metadata.size : 0,
          mimetype: f.metadata ? f.metadata.mimetype : '',
          createdAt: f.created_at,
          url: urlRes.data.publicUrl,
          path: path + '/' + f.name
        };
      });
    }catch(e){ if(!unloading) console.warn('listCourseFiles failed:', e); return null; }
  }

  /* اسم التخزين: ASCII آمن للمفتاح + (إن اختلف عن الأصل) الاسم الأصلي بالـ hex بعد __x ليظهر بالعربي. الملفات القديمة تبقى كما هي. */
  function toHex(s){ var b = unescape(encodeURIComponent(s)), o = ''; for(var i = 0; i < b.length; i++) o += ('0' + b.charCodeAt(i).toString(16)).slice(-2); return o; }
  function fromHex(h){ try{ var b = ''; for(var i = 0; i < h.length; i += 2) b += String.fromCharCode(parseInt(h.substr(i, 2), 16)); return decodeURIComponent(escape(b)); }catch(e){ return null; } }
  function storedFileName(orig){
    orig = String(orig || 'file');
    var m = /(\.[A-Za-z0-9]{1,10})$/.exec(orig), ext = m ? m[1] : '', base = ext ? orig.slice(0, -ext.length) : orig;
    var ascii = base.replace(/[^\w\-]/g, '_').replace(/_+/g, '_').slice(0, 40) || 'file';
    var plain = base.replace(/[^\w.\-]/g, '_');
    if(plain === base && base.length <= 80) return Date.now() + '_' + base + ext;   /* اسم ASCII بسيط: كما كان */
    var keep = base; while(toHex(keep + ext).length > 200 && keep.length > 1) keep = keep.slice(0, -1);
    return Date.now() + '_' + ascii + '__x' + toHex(keep + ext) + ext;
  }
  function displayFileName(stored){
    var s = String(stored || ''), m = /^\d+_.*__x([0-9a-f]+)(?:\.[A-Za-z0-9]{1,10})?$/.exec(s);
    if(m){ var d = fromHex(m[1]); if(d) return d; }
    return s.replace(/^\d+_/, '');
  }
  async function uploadCourseFile(courseId, file){
    var c = init(); if(!c) return {error: 'no client'};
    var k = ensureCode();
    var safeName = storedFileName(file.name);
    var path = k + '/courses/' + courseId + '/' + safeName;
    try{
      var res = await c.storage.from(CFG.bucket).upload(path, file, {
        upsert: false,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600'
      });
      if(res.error) return {error: res.error.message || 'فشل الرفع'};
      delete filesCache[courseId];
      var urlRes = c.storage.from(CFG.bucket).getPublicUrl(path);
      return {url: urlRes.data.publicUrl, path: path, name: safeName};
    }catch(e){ return {error: e.message || 'خطأ غير متوقع'}; }
  }

  async function deleteCourseFile(path){
    var c = init(); if(!c) return false;
    try{
      var res = await c.storage.from(CFG.bucket).remove([path]);
      if(!res.error) filesCache = {};
      return !res.error;
    }catch(e){ return false; }
  }

  function formatFileSize(bytes){
    if(!bytes || bytes < 1024) return (bytes || 0) + ' B';
    if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }
  function getFileIcon(name){
    var ext = String(name || '').split('.').pop().toLowerCase();
    var map = {
      pdf:'📄', doc:'📝', docx:'📝', ppt:'📊', pptx:'📊', xls:'📊', xlsx:'📊',
      txt:'📃', md:'📃',
      jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', webp:'🖼️', svg:'🖼️',
      zip:'🗜️', rar:'🗜️', '7z':'🗜️',
      mp4:'🎬', mov:'🎬', mp3:'🎵', wav:'🎵'
    };
    return map[ext] || '📎';
  }

  function showSyncPanel(){
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop show';
    var escFn = window.esc || function(s){ return String(s==null?'':s); };
    bd.innerHTML =
      '<div class="modal sync-modal" role="dialog" aria-modal="true" aria-label="رمز المزامنة">' +
        '<div class="sync-head"><span class="sync-ic" aria-hidden="true">☁️</span><div><h3>رمز المزامنة</h3><p class="sync-sub">مفتاح مساحتك في السحابة</p></div>' +
          '<button class="sync-x" id="syncX" type="button" aria-label="إغلاق">✕</button></div>' +
        '<div class="sync-code-box"><label for="syncCodeInput">رمزك</label>' +
          '<input id="syncCodeInput" class="sync-code" value="' + escFn(getCode()) + '" readonly dir="ltr" aria-label="رمز المزامنة"></div>' +
        '<div class="sync-actions">' +
          '<button class="btn" id="syncCopy" type="button">📋 نسخ الرمز</button>' +
          '<button class="btn" id="syncShare" type="button">📤 مشاركة</button>' +
        '</div>' +
        '<div class="sync-steps"><b>كيف تستخدمه؟</b><span>على جهاز آخر: افتح التطبيق ← المزامنة السحابية ← «تغيير» وأدخل هذا الرمز، فتظهر نفس بياناتك.</span></div>' +
        '<div class="sync-warn">🔐 أي شخص يملك هذا الرمز يصل لبياناتك. احفظه بمكان آمن ولا تنشره.</div>' +
        '<div class="sync-backup"><div class="sync-backup-head"><b>💾 نسخة احتياطية على جهازك</b><span id="syncBkInfo"></span></div>' +
          '<div class="sync-actions"><button class="btn btn-sm btn-ghost" id="syncBkExport" type="button">⬇️ تصدير نسخة</button><button class="btn btn-sm btn-ghost" id="syncBkImport" type="button">⬆️ استيراد نسخة</button></div></div>' +
        '<details class="sync-qr-box"><summary>عرض رمز QR (اختياري)</summary>' +
          '<p>يُنشأ الـQR عبر خدمة خارجية (api.qrserver.com) وبتستقبل الرمز لحظة العرض. استخدمه فقط إن كنت تقبل ذلك.</p>' +
          '<button class="btn btn-sm btn-ghost" id="syncQrBtn" type="button">إنشاء QR</button><div id="syncQr" class="sync-qr"></div></details>' +
        '<div class="sync-footer"><button class="btn btn-ghost" id="syncChange" type="button">🔄 تغيير الرمز</button><button class="btn btn-ghost" id="syncClose" type="button">إغلاق</button></div>' +
      '</div>';
    document.body.appendChild(bd);

    var input = bd.querySelector('#syncCodeInput');
    bd.querySelector('#syncCopy').onclick = function(){
      input.select();
      try{
        navigator.clipboard.writeText(input.value);
        if(window.toast) window.toast('📋 نُسخ الرمز', 'success');
      }catch(e){ document.execCommand('copy'); }
    };
    bd.querySelector('#syncShare').onclick = function(){
      var c = getCode();
      var msg = '🎓 مساحتي الدراسية\n\nرمز المزامنة: ' + c + '\n\nافتح: ' +
                location.origin + location.pathname;
      if(navigator.share) navigator.share({ title: 'مساحتي الدراسية', text: msg }).catch(function(){});
      else if(navigator.clipboard){
        navigator.clipboard.writeText(msg);
        if(window.toast) window.toast('📋 نُسخ الرابط', 'success');
      }
    };
    bd.querySelector('#syncQrBtn').onclick = function(){
      var qr = bd.querySelector('#syncQr'), c = getCode();
      if(qr && !qr.innerHTML){
        var img = document.createElement('img'); img.alt = 'QR'; img.className = 'sync-qr-img';
        img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(c);
        qr.appendChild(img);
      }
    };
    bd.querySelector('#syncChange').onclick = function(){
      bd.remove();
      if(typeof window.showModal === 'function'){
        window.showModal('🔄 تغيير رمز المزامنة', [
          { key: 'code', label: 'الرمز الجديد (اتركه فارغاً للتوليد)', placeholder: 'ABC123' }
        ], { code: '' }, function(data){
          var newCode = String(data.code || '').trim().toUpperCase() || genCode();
          setCode(newCode);
          if(window.toast) window.toast('✅ تم التغيير — جاري إعادة التحميل...', 'success');
          setTimeout(function(){ location.reload(); }, 1000);
          return true;
        });
      }
    };
    bd.querySelector('#syncClose').onclick = function(){ bd.remove(); };
    bd.querySelector('#syncX').onclick = function(){ bd.remove(); };
    function bkInfo(){
      var t = 0; try{ t = parseInt(localStorage.getItem('ss_last_backup'), 10) || 0; }catch(e){}
      var el = bd.querySelector('#syncBkInfo'); if(!el) return;
      if(!t){ el.textContent = 'ما أخذت نسخة بعد'; return; }
      var d = Math.floor((Date.now() - t) / 86400000);
      el.textContent = 'آخر نسخة: ' + (d < 1 ? 'اليوم' : d === 1 ? 'أمس' : 'قبل ' + d + ' يوم');
    }
    bkInfo();
    bd.querySelector('#syncBkExport').onclick = function(){ if(window.downloadBackup) window.downloadBackup(false); setTimeout(bkInfo, 50); };
    bd.querySelector('#syncBkImport').onclick = function(){ bd.remove(); if(window.restoreFromFile) window.restoreFromFile(); };
    bd.addEventListener('keydown', function(e){ if(e.key === 'Escape') bd.remove(); });
    setTimeout(function(){ var c = bd.querySelector('#syncCopy'); if(c) c.focus(); }, 60);
    bd.onclick = function(e){ if(e.target === bd) bd.remove(); };
  }

  var api = window.SB = {
    setUseRpc: function(v){ CFG.useRpc = !!v; rpcMissing = false; try{ sessionStorage.removeItem('ss_rpc_missing'); }catch(e){} },   /* يُفعَّل بعد تشغيل supabase/02a-create-rpc.sql */
    rpcMode: function(){ return CFG.useRpc ? (rpcMissing ? 'fallback' : 'rpc') : 'table'; },
    lastLoadStatus: null,
    init: init, load: load, save: save, peekUpdatedAt: peekUpdatedAt,
    getCode: getCode, setCode: setCode,
    listCourseFiles: listCourseFiles,
    listCourseFilesMulti: listCourseFilesMulti,
    uploadCourseFile: uploadCourseFile,
    displayFileName: displayFileName,
    storedFileName: storedFileName,
    deleteCourseFile: deleteCourseFile,
    formatFileSize: formatFileSize,
    getFileIcon: getFileIcon,
    showSyncPanel: showSyncPanel
  };

  console.log('☁️ supabase.js loaded');
})();