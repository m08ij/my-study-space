/* ============================================================
   sw.js — شبكة أولاً + كاش احتياطي (v90)
   ============================================================ */
var CACHE_NAME = 'ss-cache-v112';
var NET_WAIT_MS = 3500;   /* أقصى انتظار للشبكة قبل خدمة النسخة المخزّنة */
var URLS_TO_CACHE = [
  './', './index.html', './app.css', './css/01-base.css', './css/02-motion-themes.css', './css/03-hub-dashboard-welcome.css', './css/04-responsive-components-phases.css',
  './app.bundle.js?v=112', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
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

  var isLocal = url.indexOf(self.location.origin) === 0;
  var isStatic = isLocal && /\/(icons\/[^?#]+|manifest\.json)(\?|#|$)/.test(url);

  /* أيقونات والـ manifest: كاش أولاً + تحديث بالخلفية (لا تتغير بين إصدار وآخر عملياً، وتفتح فوراً بلا شبكة) */
  if(isStatic){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        var net = fetch(e.request).then(function(res){
          if(res && res.status === 200){ var c = res.clone(); caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, c).catch(function(){}); }); }
          return res;
        }).catch(function(){ return cached || Response.error(); });
        return cached || net;
      })
    );
    return;
  }

  /* الشبكة أولاً لكل ملفات الموقع (HTML/JS/CSS) مع revalidate صريح (يتجاوز كاش المتصفح لـ10 دقائق على GitHub Pages)،
     والكاش احتياط عند انقطاع الإنترنت أو بطء الشبكة (أكثر من NET_WAIT_MS مع وجود نسخة مخزّنة: نخدم المخزّنة فوراً
     ويكمل التحميل بالخلفية فيتحدّث الكاش). حارس الإصدار بـ index.html يعالج أي خلط إصدارات ناتج عن ذلك. */
  e.respondWith(new Promise(function(resolve){
    var settled = false;
    function fallback(){
      return caches.match(e.request).then(function(cached){
        if(cached) return cached;
        var isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').indexOf('text/html') > -1;
        return isHTML ? caches.match('./index.html') : null;
      });
    }
    var timer = isLocal ? setTimeout(function(){
      fallback().then(function(c){ if(c && !settled){ settled = true; resolve(c); } });
    }, NET_WAIT_MS) : null;
    fetch(e.request, { cache: 'no-cache' }).then(function(res){
      clearTimeout(timer);
      if(res && res.status === 200 && isLocal){
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(e.request, clone).catch(function(){}); });
      }
      if(!settled){ settled = true; resolve(res); }
    }).catch(function(){
      clearTimeout(timer);
      if(settled) return;
      fallback().then(function(c){ settled = true; resolve(c || Response.error()); });
    });
  }));
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