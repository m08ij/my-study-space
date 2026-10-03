/* ============================================================
   sw.js v62 — Cache Clean (بدون ملفات محذوفة)
   ============================================================ */
var CACHE_NAME = 'ss-cache-v83';
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

  var isHTML = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').indexOf('text/html') > -1;

  if(isHTML){
    e.respondWith(
      fetch(e.request).then(function(res){
        if(res && res.status === 200){
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, clone).catch(function(){}); });
        }
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(cached){ return cached || caches.match('./index.html'); });
      })
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(e.request).then(function(cached){
        var networkPromise = fetch(e.request).then(function(res){
          if(res && res.status === 200) cache.put(e.request, res.clone()).catch(function(){});
          return res;
        }).catch(function(){ return cached || caches.match('./index.html'); });
        if(cached){ networkPromise.catch(function(){}); return cached; }
        return networkPromise;
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