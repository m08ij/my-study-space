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
      client = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: false } });
      console.log('☁️ Supabase client ready');
    }catch(e){ console.error('Supabase init failed:', e); client = null; }
    return client;
  }

  /* lastLoadStatus: 'ok' | 'empty' (ما في صف بالسحابة) | 'error' (فشل التحميل) */
  async function load(){
    var c = init();
    if(!c){ api.lastLoadStatus = 'error'; return null; }
    var k = ensureCode();
    try{
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

  async function fetchCourseFiles(courseId){
    var c = init(); if(!c) return null;
    var k = ensureCode();
    var path = k + '/courses/' + courseId;
    try{
      var res = await c.storage.from(CFG.bucket).list(path, {
        limit: 100, sortBy: {column:'created_at', order:'desc'}
      });
      if(res.error){ if(!unloading) console.warn('list files error:', res.error); return null; }
      return (res.data || []).map(function(f){
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

  async function uploadCourseFile(courseId, file){
    var c = init(); if(!c) return {error: 'no client'};
    var k = ensureCode();
    var safeName = Date.now() + '_' + String(file.name || 'file').replace(/[^\w.\-]/g, '_');
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
      '<div class="modal" style="max-width:440px">' +
        '<h3>☁️ رمز المزامنة</h3>' +
        '<p style="color:var(--muted);font-size:.85rem;line-height:1.7;margin-bottom:16px">' +
          'هذا الرمز هو مفتاح مساحتك في السحابة. أدخله على أي جهاز آخر لترى نفس بياناتك.' +
        '</p>' +
        '<div class="form-group">' +
          '<label>الرمز</label>' +
          '<input id="syncCodeInput" value="' + escFn(getCode()) + '" readonly ' +
          'style="font-family:monospace;text-align:center;font-size:1.3rem;font-weight:800;direction:ltr;letter-spacing:4px">' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
          '<button class="btn btn-sm" id="syncCopy" style="flex:1">📋 نسخ</button>' +
          '<button class="btn btn-sm" id="syncShare" style="flex:1">📤 مشاركة</button>' +
          '<button class="btn btn-sm btn-ghost" id="syncChange" style="flex:1">🔄 تغيير</button>' +
          '<button class="btn btn-sm btn-ghost" id="syncClose" style="flex:1">إغلاق</button>' +
        '</div>' +
        '<div id="syncQr" style="margin-top:14px;text-align:center;display:none"></div>' +
        '<div style="margin-top:14px;padding:10px;background:var(--grad-soft);border-radius:10px;font-size:.78rem;color:var(--muted);line-height:1.7">' +
          '💡 احفظ هذا الرمز في مكان آمن.' +
        '</div>' +
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
      var qr = bd.querySelector('#syncQr');
      if(qr && !qr.innerHTML){
        qr.style.display = 'block';
        qr.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
          encodeURIComponent(c) + '" alt="QR" style="border-radius:10px;background:#fff;padding:8px">';
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
    bd.onclick = function(e){ if(e.target === bd) bd.remove(); };
  }

  var api = window.SB = {
    lastLoadStatus: null,
    init: init, load: load, save: save, peekUpdatedAt: peekUpdatedAt,
    getCode: getCode, setCode: setCode,
    listCourseFiles: listCourseFiles,
    uploadCourseFile: uploadCourseFile,
    deleteCourseFile: deleteCourseFile,
    formatFileSize: formatFileSize,
    getFileIcon: getFileIcon,
    showSyncPanel: showSyncPanel
  };

  console.log('☁️ supabase.js loaded');
})();