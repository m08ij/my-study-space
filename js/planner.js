/* planner.js — (175) شاشة بداية اليوم + «رتبلي أسبوعي»
   window.DayStart: أول فتح باليوم (من 5 الصبح) بتطلع شاشة فيها: محاضراتك، المهام، أقرب امتحان، أهم إشي اليوم،
     وزر «يلا نبدأ» بيفتح جلسة تركيز على المادة الأهم. مرة وحدة باليوم (ss_daystart)، ومش على localhost/jsdom إلا ?daystart=1.
   window.WeekPlan: بيوزّع جلسات مذاكرة على 7 أيام من «جدول المذاكرة المقترح» (StudyPlan.build: فراغاتك + الأقرب امتحاناً)
     وبعد موافقتك بيضيفها كبنود بـ«خطتي اليوم» لكل يوم (DayPlan.addMany). ما بيكتب إشي قبل ما تضغط «أضفها». */
(function(){
  'use strict';
  var W = window, D = document;
  var DA = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function esc(s){ return W.esc ? W.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n){ return (n < 10 ? '0' : '') + n; }
  function ymd(d){ return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function toast(m, t, ms){ if(W.toast) W.toast(m, t, ms); }
  function vib(ms){ try{ if(W.Haptic && W.Haptic.tap) W.Haptic.tap(); else if(navigator.vibrate) navigator.vibrate(ms || 8); }catch(e){} }
  function days(n){ return n === 0 ? 'اليوم' : n === 1 ? 'بكرة' : n === 2 ? 'بعد يومين' : 'بعد ' + n + (n <= 10 ? ' أيام' : ' يوم'); }
  function anyOverlay(){ return !!D.querySelector('.modal-backdrop,.hub-sheet-backdrop,.ocri-overlay,.fx-study,#aiPanel.show,.dp-sheet,.ds-ov,.wp-ov'); }

  /* نافذة عامة (طبقة + بطاقة) مع إغلاق بـEsc والخلفية، وإرجاع التركيز */
  function overlay(cls, html, label){
    var prev = D.activeElement, ov = D.createElement('div');
    ov.className = 'ds-ov ' + cls; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', label);
    ov.innerHTML = '<div class="ds-card">' + html + '</div>';
    function close(){ if(!ov.parentNode) return; ov.classList.add('out'); D.removeEventListener('keydown', key, true); setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 220); try{ if(prev && prev.focus) prev.focus(); }catch(e){} }
    function key(e){ if(e.key === 'Escape'){ e.stopPropagation(); close(); } }
    ov.addEventListener('click', function(e){ if(e.target === ov) close(); });
    D.addEventListener('keydown', key, true);
    D.body.appendChild(ov);
    setTimeout(function(){ var f = ov.querySelector('[data-auto]') || ov.querySelector('button'); try{ if(f) f.focus({ preventScroll: true }); }catch(e){} }, 60);
    return { el: ov, close: close };
  }

  /* ===================== شاشة بداية اليوم ===================== */
  function sunSvg(h){
    var night = h >= 18 || h < 5;
    return night
      ? '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="dsg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><path d="M40 10a22 22 0 1 0 14 38A24 24 0 0 1 40 10z" fill="url(#dsg)"/><circle cx="14" cy="14" r="2" fill="#fff" opacity=".8"/><circle cx="52" cy="22" r="1.5" fill="#fff" opacity=".7"/><circle cx="22" cy="52" r="1.6" fill="#fff" opacity=".6"/></svg>'
      : '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="dsg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs><circle cx="32" cy="32" r="13" fill="url(#dsg)"/><g stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"><path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/></g></svg>';
  }
  function dayStartHtml(x){
    var h = x.now.getHours(), greet = h < 12 ? 'صباح الخير' : h < 18 ? 'نهارك سعيد' : 'مساء الخير';
    var L = x.lectures, lecV = L.length ? String(L.length) : '0', lecS = L.length ? (x.next ? (x.next.now ? 'هسا: ' : 'أولها ') + x.next.start + (x.next.place ? ' · ' + x.next.place : '') : 'خلصت محاضرات اليوم') : 'يوم بلا محاضرات';
    var tkV = String(x.late + x.due), tkS = x.late ? x.late + ' متأخرة' : x.due ? 'مستحقة اليوم' : 'ما في إشي مستعجل';
    var exV = x.exam ? String(x.exam.days) : '—', exS = x.exam ? (x.exam.days === 0 ? 'اليوم! ' : x.exam.days === 1 ? 'بكرة · ' : (x.exam.days <= 10 ? 'أيام · ' : 'يوم · ')) + x.exam.name : 'ما في امتحانات قريبة';
    var top, topC = '';
    if(x.exam && x.exam.days <= 3){ top = 'راجع لـ«' + x.exam.name + '» — ' + days(x.exam.days); topC = x.exam.course; }
    else if(x.top){ top = (x.late ? 'خلّص «' : 'سلّم «') + x.top.title + '»' + (x.late ? ' — متأخرة' : ' — آخر موعد اليوم'); topC = x.top.course || ''; }
    else if(x.next){ top = 'حضّر لمحاضرة ' + x.next.name; topC = x.next.name; }
    else if(x.exam){ top = 'ابدأ تراجع بدري لـ«' + x.exam.name + '» (' + days(x.exam.days) + ')'; topC = x.exam.course; }
    else top = 'جلسة تركيز قصيرة تثبّت فيها اللي أخذته';
    function tile(cls, ic, v, lbl, sub){ return '<div class="ds-tile ' + cls + '"><span class="ds-ti">' + ic + '</span><b>' + esc(v) + '</b><em>' + lbl + '</em><small>' + esc(sub) + '</small></div>'; }
    return '<div class="ds-top"><span class="ds-sun">' + sunSvg(h) + '</span><div><small>' + DA[x.now.getDay()] + '، ' + x.now.getDate() + '/' + (x.now.getMonth() + 1) + '</small>' +
      '<h2 id="dsT">' + greet + (x.name ? '، ' + esc(x.name) : '') + '</h2></div>' + (x.streak ? '<span class="ds-streak" title="سلسلة الأيام">🔥 ' + x.streak + '</span>' : '') + '</div>' +
      '<p class="ds-lead">هاد يومك بنظرة وحدة:</p>' +
      '<div class="ds-tiles">' + tile('t1', '📚', lecV, 'محاضرات', lecS) + tile('t2', '✅', tkV, 'مهام', tkS) + tile('t3', '⏳', exV, 'لأقرب امتحان', exS) + '</div>' +
      '<div class="ds-focus"><small>أهم إشي اليوم</small><b>' + esc(top) + '</b></div>' +
      '<button type="button" class="ds-go" data-ds="go" data-c="' + esc(topC) + '" data-auto><span>يلا نبدأ</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>' +
      '<div class="ds-row"><button type="button" class="ds-ghost" data-ds="week">🗓️ رتبلي أسبوعي</button><button type="button" class="ds-ghost" data-ds="later">بعدين</button></div>';
  }
  function showDayStart(force){
    var F = W.FocusUI; if(!F || !F.dayData || !D.documentElement.classList.contains('fx-on')) return false;
    var t = ymd(new Date());
    if(!force){
      var h = location.hostname, q = location.search || '';
      if((/jsdom/i.test(navigator.userAgent || '') || h === 'localhost' || h === '127.0.0.1') && q.indexOf('daystart=1') < 0) return false;
      if(new Date().getHours() < 5 || lsGet('ss_daystart') === t || anyOverlay()) return false;
      if(lsGet('welcomeDone') !== 'true') return false;
    }
    var x; try{ x = F.dayData(); }catch(e){ return false; }
    if(!force && !x.courses && !x.late && !x.due && !x.exam) return false;   /* حساب فاضي: ما في إشي نلخّصه */
    lsSet('ss_daystart', t); lsSet('ss_dp_seen', t);   /* ما تطلع «خطتي اليوم» كمان فوقها */
    var o = overlay('ds-day', dayStartHtml(x), 'بداية يومك');
    o.el.querySelector('.ds-card').setAttribute('aria-labelledby', 'dsT');
    o.el.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('[data-ds]'); if(!b) return; var a = b.getAttribute('data-ds'); vib(8);
      if(a === 'later') o.close();
      else if(a === 'week'){ o.close(); setTimeout(openWeek, 240); }
      else if(a === 'go'){ var c = b.getAttribute('data-c'); o.close();
        if(c) lsSet('ss_dp_focus', JSON.stringify({ d: t, k: '', c: c }));
        setTimeout(function(){ try{ if(W.FocusUI && W.FocusUI.study) W.FocusUI.study(); }catch(err){} }, 240); }
    });
    return true;
  }

  /* ===================== رتبلي أسبوعي ===================== */
  function openWeek(){
    var SP = W.StudyPlan, P = W.DayPlan;
    if(!SP || !SP.build || !P || !P.addMany){ toast('الميزة مش جاهزة لسا، جرّب بعد ما يكمل التحميل', 'warn', 2500); return; }
    var p; try{ p = SP.build(); }catch(e){ toast('ما قدرت أرتّب الأسبوع', 'error', 2500); return; }
    var c = p.cfg || {};
    if(!p.courses){ toast('ضيف موادك أول عشان أرتّبلك أسبوعك', 'warn', 3000); return; }
    var off = !c.on;
    var items = [];
    (p.days || []).forEach(function(d){ if(!d.off) (d.items || []).forEach(function(it){ items.push({ date: d.date, dow: d.dow, it: it }); }); });
    var byDay = {}; items.forEach(function(x){ (byDay[x.date] = byDay[x.date] || { dow: x.dow, list: [] }).list.push(x.it); });
    var tot = items.length, mins = tot * (c.len || 45);
    var body = (p.days || []).map(function(d){
      var dt = new Date(d.date + 'T00:00:00'), g = byDay[d.date];
      return '<div class="wp-day' + (d.off ? ' off' : '') + '"><div class="wp-dh"><b>' + DA[d.dow] + '</b><small>' + dt.getDate() + '/' + (dt.getMonth() + 1) + '</small></div>' +
        (d.off ? '<span class="wp-rest">راحة 🌿</span>' : g ? g.list.map(function(it){ var hue = W.courseHue ? W.courseHue(it.course) : 260;
          return '<span class="wp-s' + (it.urgent ? ' hot' : '') + '" style="--h:' + hue + '"><em dir="ltr">' + esc(it.start) + '</em>' + esc(it.course) + '</span>'; }).join('') : '<span class="wp-rest">فاضي</span>') + '</div>';
    }).join('');
    var html = '<div class="wp-head"><span class="ds-sun">🗓️</span><div><small>رتبلي أسبوعي</small><h2 id="wpT">' + (tot ? tot + ' جلسة مذاكرة خلال 7 أيام' : 'ما لقيت فراغات بالأسبوع') + '</h2></div></div>' +
      '<p class="ds-lead">' + (tot ? 'وزّعتها على فراغاتك بين المحاضرات، والمواد اللي امتحانها أقرب أخذت جلسات أكثر (المميّزة بالأحمر مستعجلة). المجموع تقريباً ' + Math.round(mins / 60 * 10) / 10 + ' ساعة.' : 'جرّب توسّع ساعات المذاكرة من الإعدادات.') + '</p>' +
      (off ? '<p class="wp-note">جدول المذاكرة المقترح كان مطفي — رح يشتغل لما تضيف الخطة.</p>' : '') +
      '<div class="wp-days">' + body + '</div>' +
      '<div class="wp-foot">' + (tot ? '<button type="button" class="ds-go" data-wp="add" data-auto><span>أضفها لـ«خطتي اليوم»</span></button>' : '') +
      '<div class="ds-row"><button type="button" class="ds-ghost" data-wp="cfg">⚙️ ساعات المذاكرة</button><button type="button" class="ds-ghost" data-wp="close">إغلاق</button></div></div>';
    var o = overlay('wp-week', html, 'رتبلي أسبوعي');
    o.el.querySelector('.ds-card').setAttribute('aria-labelledby', 'wpT');
    o.el.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('[data-wp]'); if(!b) return; var a = b.getAttribute('data-wp'); vib(8);
      if(a === 'close') o.close();
      else if(a === 'cfg'){ o.close(); setTimeout(function(){ SP.openConfig(function(){ setTimeout(openWeek, 200); }); }, 240); }
      else if(a === 'add'){
        if(off && SP.setOn) SP.setOn(true);
        var n = P.addMany(items.map(function(x){ return { date: x.date, course: x.it.course, text: 'جلسة ' + x.it.start + ' — ' + (x.it.reason || 'مراجعة') }; }));
        o.close();
        toast(n ? 'انضافت ' + n + ' جلسة لخطتك — كل يوم رح تلاقي جلساته بـ«خطتي اليوم»' : 'الجلسات موجودة أصلاً بخطتك', n ? 'success' : 'info', 3800);
        try{ if(W.FocusUI && W.FocusUI.render) W.FocusUI.render(false); }catch(err){}
      }
    });
  }

  W.DayStart = { show: function(){ return showDayStart(true); }, maybe: function(){ return showDayStart(false); } };
  W.WeekPlan = { open: openWeek };
  function boot(){ setTimeout(function(){ showDayStart(false); }, 1400); }
  D.addEventListener('visibilitychange', function(){ if(D.visibilityState === 'visible') setTimeout(function(){ showDayStart(false); }, 900); });
  if(D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})();
