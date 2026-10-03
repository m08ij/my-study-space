/* ============================================================
   sw.js — شبكة أولاً + كاش احتياطي (v86)
   ============================================================ */
var CACHE_NAME = 'ss-cache-v86';
var URLS_TO_CACHE = [
  './', './index.html', './app.css',
  './core.js', './data.js', './supabase.js',
  './features.js', './widgets.js', './ai.js', './integrations.js',
  './course-sync.js',    
  './extras.js', './hub.js',
  './pwa.js', './app.js', './tests.js',
  './manifest.json'
];
self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(URLS_TO_CACHE.map(function(url){
        return cache.add(url).catch(function(err){ console.warn('SW skip:', url, err && err.message); });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;
  if(url.indexOf('supabase.co') > -1) return;
  if(url.indexOf('cdn.jsdelivr.net') > -1) return;
  if(url.indexOf('api.qrserver.com') > -1) return;
  if(url.indexOf('open-meteo.com') > -1) return;
  if(url.indexOf('aladhan.com') > -1) return;
  if(e.request.method !== 'GET') return;

  /* الشبكة أولاً لكل ملفات الموقع (HTML/JS/CSS) مع revalidate صريح (يتجاوز كاش المتصفح لـ10 دقائق على GitHub Pages)،
     والكاش احتياط عند انقطاع الإنترنت. هكذا لا يُخدَم سكربت قديم مع HTML جديد (خلط إصدارات). */
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(function(res){
      if(res && res.status === 200 && url.indexOf(self.location.origin) === 0){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, clone).catch(function(){}); });
      }
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(cached){
        if(cached) return cached;
        var isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').indexOf('text/html') > -1;
        return isHTML ? caches.match('./index.html') : Response.error();
      });
    })
  );
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var tab = (e.notification.data || {}).tab || 'dashboard';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for(var i = 0; i < list.length; i++){
        if(list[i].url.indexOf(self.location.origin) === 0){
          list[i].focus();
          list[i].postMessage({ type: 'navigate', tab: tab });
          return;
        }
      }
      if(clients.openWindow) return clients.openWindow('./index.html#' + tab);
    })
  );
});