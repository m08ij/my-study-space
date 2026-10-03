/* ============================================================
   📱 pwa.js — Service Worker + Install Prompt + Sync Button
   ============================================================ */
(function(){
  'use strict';

  function registerSW(){
    if(!('serviceWorker' in navigator)) return;
    if(location.protocol !== 'https:' && location.hostname !== 'localhost'){
      console.warn('⚠️ Service Worker يحتاج HTTPS');
      return;
    }
    /* عند استلام نسخة جديدة من الـ SW لجلسة كانت مفتوحة بنسخة قديمة: أعد التحميل مرة واحدة، إلا إذا كان المستخدم يكتب/نافذة مفتوحة فنكتفي بتنبيه */
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if(!hadController) return;
      try{ if(sessionStorage.getItem('ss_sw_reloaded')) return; sessionStorage.setItem('ss_sw_reloaded', '1'); }catch(e){ return; }
      var ae = document.activeElement, typing = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
      if(typing || document.querySelector('.modal-backdrop, .hub-sheet-backdrop')){
        if(window.toast) window.toast('🔄 نسخة جديدة جاهزة — أعد تحميل الصفحة (Ctrl+Shift+R)', 'info', 6000);
        return;
      }
      location.reload();
    });
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(function(reg){ console.log('✅ SW registered:', reg.scope); })
      .catch(function(err){ console.warn('SW registration failed:', err); });
  }

  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    var btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.style.display = 'flex';
  });

  window.addEventListener('appinstalled', function(){
    var btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.style.display = 'none';
    if(window.toast) window.toast('🎉 تم تثبيت التطبيق', 'success', 2500);
  });

  function bindInstallBtn(){
    var btn = document.getElementById('pwaInstallBtn');
    if(!btn || btn._pwaBound) return;
    btn._pwaBound = true;
    btn.addEventListener('click', async function(){
      var menu = document.getElementById('settingsMenu');
      if(menu) menu.classList.remove('show');
      if(!deferredPrompt){
        if(window.toast) window.toast('التطبيق مثبت بالفعل أو غير مدعوم', 'info', 2200);
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.style.display = 'none';
    });
  }

  function bindSyncBtn(){
    var btn = document.getElementById('syncCodeBtn');
    if(!btn || btn._syncBound) return;
    btn._syncBound = true;
    btn.addEventListener('click', function(){
      var menu = document.getElementById('settingsMenu');
      if(menu) menu.classList.remove('show');
      if(window.SB && window.SB.showSyncPanel) window.SB.showSyncPanel();
      else if(window.toast) window.toast('خدمة المزامنة غير متوفرة', 'warn', 2200);
    });
  }

  function init(){
    registerSW();
    setTimeout(bindInstallBtn, 400);
    setTimeout(bindSyncBtn, 400);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('📱 pwa.js loaded');
})();