/* ============================================================
   ux.js — ترابط بصري وتجربة متكيّفة (بدون ميزات دراسية جديدة ولا تغيير ببنية البيانات)
   1) روابط المادة: اسم المادة بالمهام/الامتحانات/الحضور/العلامات يفتح نافذة المادة الموجودة (Hub.openCourse)
   2) حالات الفراغ: زر إجراء يظهر فقط عندما تكون البيانات فارغة فعلاً (يستدعي زر الإضافة الموجود بالصفحة)
   كل شيء قراءة فقط من space؛ لا كتابة ولا حفظ.
   ============================================================ */
(function(){
  'use strict';
  function esc(s){ return window.esc ? window.esc(s) : String(s == null ? '' : s); }
  function sp(){ return window.space || {}; }

  /* ---------- 1) روابط المادة ---------- */
  function courseExists(name){
    var list = sp().courses || [];
    for(var i = 0; i < list.length; i++) if(list[i].name === name) return true;
    return false;
  }
  /* يرجع نصاً عادياً إن لم تكن المادة موجودة بقائمة المواد (لا روابط ميتة) */
  window.courseLink = function(name, prefix){
    var label = (prefix || '') + esc(name);
    if(!name || !courseExists(name) || !(window.Hub && window.Hub.openCourse)) return label;
    return '<span class="course-link" data-open-course="' + esc(name) + '" role="link" tabindex="0" title="فتح صفحة المادة">' + label + '</span>';
  };
  function openFrom(el, e){
    var name = el.getAttribute('data-open-course');
    if(!name || !window.Hub || !window.Hub.openCourse) return;
    if(e){ e.preventDefault(); e.stopPropagation(); }
    window.Hub.openCourse(name);
  }
  document.addEventListener('click', function(e){
    var el = e.target.closest && e.target.closest('[data-open-course]'); if(el) openFrom(el, e);
  }, true);
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest && e.target.closest('[data-open-course]'); if(el && e.target === el) openFrom(el, e);
  }, true);

  /* ---------- 2) حالات الفراغ التفاعلية ---------- */
  var CTA = {
    tasks:      { btn: 'btnAddTask',    empty: function(s){ return !(s.tasks || []).length; } },
    exams:      { btn: 'btnAddExam',    empty: function(s){ return !(s.exams || []).length; } },
    attendance: { btn: 'btnAddAtt',     empty: function(s){ return !Object.keys(s.attendance || {}).length; } },
    budget:     { btn: 'btnAddExpense', empty: function(s){ return !(s.budget || []).length; } },
    courses:    { btn: 'btnAddCourse',  empty: function(s){ return !(s.courses || []).length; } }
  };
  function enhance(){
    var s = sp();
    document.querySelectorAll('.empty:not([data-cta])').forEach(function(box){
      var sec = box.closest && box.closest('section.section'); if(!sec) return;
      var def = CTA[sec.id]; if(!def) return;
      box.setAttribute('data-cta', '1');
      if(box.querySelector('button') || !def.empty(s)) return;
      var src = document.getElementById(def.btn); if(!src) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-sm empty-cta';
      b.textContent = src.textContent.trim();
      b.addEventListener('click', function(){ src.click(); });
      box.appendChild(b);
    });
  }
  var pending = false;
  function schedule(){ if(pending) return; pending = true; (window.requestAnimationFrame || setTimeout)(function(){ pending = false; try{ enhance(); }catch(e){ console.warn('ux', e); } }); }
  function init(){
    var main = document.querySelector('main'); if(!main || typeof MutationObserver === 'undefined') return;
    new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
    schedule();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /* ---------- 3) تنبيه الغياب (نفس حد التنبيه 75% المستخدم بألوان بطاقة الحضور) ---------- */
  /* عدد محاضرات المادة بالأسبوع من الجدول (تطابق تام باسم المادة؛ 0 إن لم توجد) */
  window.weeklyLectures = function(name){
    var tt = sp().timetable || {}, n = 0;
    Object.keys(tt).forEach(function(k){ if(tt[k] && tt[k].name === name) n++; });
    return n;
  };
  /* weekly (اختياري): محاضرات المادة بالأسبوع؛ إن وُجد يضاف توقع «لو غبت أسبوعاً كاملاً» */
  window.attendanceHint = function(present, absent, weekly){
    present = +present || 0; absent = +absent || 0; weekly = +weekly || 0;
    var total = present + absent; if(total <= 0) return null;
    var h = null;
    if(present / total < 0.75) return { level: 'danger', text: 'نسبة حضورك تحت 75% (حد التنبيه بالتطبيق). تأكد من شروط مادتك بالجامعة.' };
    var allowed = Math.floor(present / 3 + 1e-9) - absent;   /* غيابات إضافية ممكنة قبل النزول تحت 75% بدون حضور جديد */
    if(allowed <= 0) h = { level: 'warn', text: 'غياب واحد إضافي ينزّلك تحت 75% (حد التنبيه بالتطبيق) ما لم تحضر محاضرات جديدة.' };
    else if(allowed <= 2) h = { level: 'warn', text: 'تقدر تغيب ' + allowed + (allowed === 1 ? ' مرة' : ' مرات') + ' إضافية فقط قبل 75% (حد التنبيه) بدون حضور جديد.' };
    if(weekly > 0){
      var after = Math.round(present / (total + weekly) * 100), wk = 'لو غبت أسبوعاً كاملاً (' + weekly + (weekly === 1 ? ' محاضرة' : ' محاضرات') + ' بجدولك) بتصير نسبتك ' + after + '%.';
      if(h) h.text += ' ' + wk;
      else if(present / (total + weekly) < 0.75) h = { level: 'warn', text: wk + ' (تحت 75%)' };
    }
    return h;
  };

  /* ---------- 4) وضع الامتحانات: يظهر تلقائياً إذا كان في امتحان خلال 7 أيام ---------- */
      /* ---------- 5) تذكير النسخة الاحتياطية (مرة كل 7 أيام كحدّ أقصى؛ لا ينسخ شيئاً تلقائياً) ---------- */
  var DAY = 86400000, NAG_AFTER = 7 * DAY;
  function lsNum(k){ try{ return parseInt(localStorage.getItem(k), 10) || 0; }catch(e){ return 0; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, String(v)); }catch(e){} }
  function hasUserData(){ var s = sp(); return (s.courses || []).length + (s.tasks || []).length + (s.exams || []).length + (s.budget || []).length + (window.notes || []).length > 0; }
  function maybeNag(){
    if(document.getElementById('backupNag') || !hasUserData()) return;
    var now = Date.now(), first = lsNum('ss_first_seen'); if(!first){ lsSet('ss_first_seen', now); return; }
    var ref = lsNum('ss_last_backup') || first;
    if(now - ref < NAG_AFTER || now - lsNum('ss_backup_nag') < NAG_AFTER) return;
    if(document.querySelector('.modal-backdrop,.welcome-overlay.show,#onbOverlay[style*="flex"]')) return;
    var days = Math.floor((now - ref) / DAY), nag = document.createElement('div');
    nag.id = 'backupNag'; nag.className = 'backup-nag'; nag.setAttribute('role', 'status');
    nag.innerHTML = '<span>💾 ' + (lsNum('ss_last_backup') ? 'آخر نسخة احتياطية قبل ' + days + ' يوم.' : 'ما أخذت نسخة احتياطية لبياناتك بعد.') + '</span>' +
      '<button class="btn btn-sm" type="button" data-nag="now">خذ نسخة الآن</button><button class="btn btn-sm btn-ghost" type="button" data-nag="later">لاحقاً</button>';
    document.body.appendChild(nag);
    nag.addEventListener('click', function(ev){
      var b = ev.target.closest && ev.target.closest('[data-nag]'); if(!b) return;
      lsSet('ss_backup_nag', Date.now());
      if(b.getAttribute('data-nag') === 'now' && window.downloadBackup) window.downloadBackup(false);
      nag.remove();
    });
  }
  setTimeout(maybeNag, 7000);

  
  /* حبس Tab لكل نافذة .modal-backdrop تُضاف للصفحة (مزامنة، ICS، سجل الأخطاء، إدخال سريع، بطاقات...).
     النوافذ التي تحبس بنفسها (showModal / customConfirm) تضع bd._trap فتُتخطّى. */
  function trapDialogs(){
    if(typeof MutationObserver === 'undefined' || !document.body) return;
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        Array.prototype.forEach.call(m.addedNodes, function(bd){
          if(!bd.classList || !bd.classList.contains('modal-backdrop') || bd._trap) return;
          bd._trap = true;
          bd.addEventListener('keydown', function(e){
            if(e.key !== 'Tab') return;
            var f = Array.prototype.filter.call(bd.querySelectorAll('input,select,textarea,button,a[href],[tabindex]:not([tabindex="-1"])'), function(n){ return !n.disabled && !n.closest('[hidden]'); });
            if(!f.length) return;
            var first = f[0], last = f[f.length - 1];
            if(!bd.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
            else if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
            else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
          });
        });
      });
    }).observe(document.body, { childList: true });
  }
  trapDialogs();


  /* ---------- 8) قائمة الإعدادات: حالات العناصر، حجم الخط، ورقة سفلية على الموبايل ---------- */
  var FS_LABEL = { sm: 'صغير', md: 'عادي', lg: 'كبير' };
  function lsv(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function applyFont(v){
    if(v === 'sm' || v === 'lg') document.documentElement.setAttribute('data-fs', v); else document.documentElement.removeAttribute('data-fs');
    var cur = (v === 'sm' || v === 'lg') ? v : 'md';
    document.querySelectorAll('#settingsMenu [data-fs]').forEach(function(b){ b.setAttribute('aria-pressed', b.getAttribute('data-fs') === cur ? 'true' : 'false'); });
    var s = document.getElementById('fontSub'); if(s) s.textContent = FS_LABEL[cur];
  }
  window.refreshSettingsMenu = function(){
    var th = document.documentElement.getAttribute('data-theme') || 'dark', ts = document.getElementById('themeSub');
    if(ts){ var f = (window.THEMES || []).filter(function(x){ return x.id === th; })[0]; ts.textContent = f ? f.name : th; }
    applyFont(lsv('ss_font'));
    var d = document.getElementById('densityBtn'); if(d){ var on = lsv('ss_density') === 'compact', t = d.querySelector('.db-t'); if(t) t.textContent = on ? 'مضغوطة' : 'مريحة'; d.setAttribute('aria-checked', on ? 'true' : 'false'); }
    if(window.updateNotifBtn) try{ window.updateNotifBtn(); }catch(e){}
    var ss = document.getElementById('syncMenuSub'); if(ss && window.getSyncStatus) try{ ss.textContent = window.getSyncStatus().text; }catch(e){}
  };
  /* على الموبايل تُنقل القائمة إلى body (الشريط العلوي له backdrop-filter فيحبس العناصر fixed بداخله) وتصير ورقة سفلية */
  var smWrap = null;
  window.settingsMenuSync = function(){
    var m = document.getElementById('settingsMenu'); if(!m) return;
    if(!smWrap) smWrap = m.parentNode;
    var open = m.classList.contains('show'), phone = true;   /* نافذة كاملة فوق كل شي: تُنقل دائماً لـbody (الشريط العلوي له backdrop-filter يحبس العناصر fixed) */
    if(open && phone && m.parentNode !== document.body) document.body.appendChild(m);
    else if((!open || !phone) && m.parentNode === document.body && smWrap) smWrap.appendChild(m);
    if(open) window.refreshSettingsMenu();
  };
  function initSettingsMenu(){
    var m = document.getElementById('settingsMenu'); if(!m || m._smInit) return; m._smInit = true;
    applyFont(lsv('ss_font'));
    m.addEventListener('click', function(e){
      /* ملاحظة: <html> نفسه يحمل data-fs عند الخط الصغير/الكبير، فـclosest('[data-fs]') بدون تحديد الزر كان يلتقط html لأي نقرة داخل القائمة ويبلع كل الأزرار (إغلاق ✕ وغيرها) */
      var f = e.target.closest && e.target.closest('button[data-fs]');
      if(f){ var v = f.getAttribute('data-fs'); try{ if(v === 'md') localStorage.removeItem('ss_font'); else localStorage.setItem('ss_font', v); }catch(x){} applyFont(v); return; }
      if((e.target === m || e.target.closest('#smClose')) && window.closeSettingsMenu) window.closeSettingsMenu();   /* النقر على الخلفية المعتمة أو زر ✕ */
    });
    /* سحب المقبض للأسفل يغلق الورقة */
    var y0 = null;
    var dlg = m.querySelector('.sm-dialog') || m;
    m.addEventListener('pointerdown', function(e){ if(window.innerWidth <= 760 && e.target.closest && e.target.closest('.sm-handle')){ y0 = e.clientY; try{ m.setPointerCapture(e.pointerId); }catch(x){} } });
    m.addEventListener('pointermove', function(e){ if(y0 !== null){ var dy = Math.max(0, e.clientY - y0); dlg.style.transform = 'translateY(' + dy + 'px)'; } });
    function endDrag(e){ if(y0 === null) return; var dy = e.clientY - y0; y0 = null; dlg.style.transform = ''; if(dy > 70 && window.closeSettingsMenu) window.closeSettingsMenu(); }
    m.addEventListener('pointerup', endDrag); m.addEventListener('pointercancel', function(){ y0 = null; dlg.style.transform = ''; });
    window.addEventListener('resize', function(){ window.settingsMenuSync(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && m.classList.contains('show') && window.closeSettingsMenu) window.closeSettingsMenu(); });
    window.refreshSettingsMenu();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSettingsMenu); else initSettingsMenu();

  /* ---------- 9) السحب على المهام (لمس فقط): يمين = إنجاز، يسار = حذف (مع «تراجع») ---------- */
  var SWIPE_GO = 90;
  function initSwipe(){}
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSwipe); else initSwipe();

  var _enhance = enhance;
  enhance = function(){ _enhance(); };
  window.UX = { enhance: function(){ enhance(); }, maybeNag: maybeNag };
})();


/* ===== إعدادات بتبويبات + الوضع البسيط + لمسات تفاعلية ===== */
(function(){
  function lsv(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lss(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  var root = document.documentElement;

  /* --- تبويبات قائمة الإعدادات --- */
  var SM_TABS = ['look', 'work', 'data', 'sys'];
  function setSmTab(name){
    var m = document.getElementById('settingsMenu'); if(!m) return;
    if(SM_TABS.indexOf(name) < 0) name = 'look';
    m.setAttribute('data-sm', name); lss('ss_sm_tab', name);
    m.querySelectorAll('.sm-tab').forEach(function(b){ var on = b.getAttribute('data-sm') === name; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
  }
  function initSmTabs(){
    var m = document.getElementById('settingsMenu'); if(!m || m._tabs) return; m._tabs = true;
    setSmTab(lsv('ss_sm_tab') || 'look');
    var bl = document.getElementById('smBuild'); if(bl) bl.textContent = window.APP_BUILD || '—';
    function buildSmThemes(){
      var src = document.getElementById('themeGrid'), dst = document.getElementById('smThemeGrid'); if(!src || !dst) return;
      if(!src.children.length && window.buildThemePanel) window.buildThemePanel();
      var cur = (window.S && window.S.get('theme', 'dark')) || root.getAttribute('data-theme') || 'dark';   /* المحفوظ (قد يكون «auto») */
      dst.innerHTML = src.innerHTML;
      var nm = '';
      [].forEach.call(dst.querySelectorAll('.theme-swatch'), function(sw){ var on = sw.getAttribute('data-theme') === cur; sw.classList.toggle('active', on); sw.setAttribute('aria-pressed', on ? 'true' : 'false'); if(on) nm = sw.getAttribute('title') || ''; });
      var n = document.getElementById('smThemeName'); if(n) n.textContent = nm;
    }
    var smg = document.getElementById('smThemeGrid');
    if(smg){
      var pickTheme = function(sw){ if(!sw || !window.applyTheme) return; window.applyTheme(sw.getAttribute('data-theme'), true); if(window.toast) window.toast('🎨 تم تفعيل ثيم «' + (sw.getAttribute('title') || '').replace(/ \(فاتح\)/, '') + '»', 'success', 1600); setTimeout(buildSmThemes, 60); };
      smg.addEventListener('click', function(e){ pickTheme(e.target.closest && e.target.closest('.theme-swatch')); });
      smg.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ var sw = e.target.closest && e.target.closest('.theme-swatch'); if(sw){ e.preventDefault(); pickTheme(sw); } } });
    }
    var wasOpen = false, opener = null;
    /* الإعدادات تُفتح من زر الشريط العلوي أو من أسفل القائمة الجانبية: نتذكر الفاتح لنعيد له التركيز عند الإغلاق */
    var navS = document.getElementById('navSettings'), topS = document.getElementById('settingsBtn');
    if(topS) topS.addEventListener('click', function(){ opener = topS; }, true);
    if(navS){
      navS.addEventListener('click', function(e){
        e.stopPropagation(); opener = navS;
        if(window.closeSidebar) window.closeSidebar();
        if(window.toggleSettingsMenu) window.toggleSettingsMenu();
      });
    }
    new MutationObserver(function(){
      var on = m.classList.contains('show'); if(on === wasOpen) return; wasOpen = on;
      document.documentElement.classList.toggle('sm-open', on);
      [navS, topS].forEach(function(b){ if(b) b.setAttribute('aria-expanded', on ? 'true' : 'false'); });
      if(navS) navS.classList.toggle('active', on);   /* تمييز «الإعدادات» بالقائمة الجانبية طالما الصفحة مفتوحة */
      if(on) buildSmThemes();
      if(on){ var t = m.querySelector('.sm-tab[aria-selected="true"]'); if(t) setTimeout(function(){ t.focus(); }, 40); }
      else {
        /* لو الفاتح هو «الإعدادات» بدرج جانبي مسكّر (هاتف) نرجّع التركيز لزر الشريط العلوي بدل عنصر غير ظاهر */
        var drawer = opener && opener.closest && opener.closest('.sidebar'), drawerShut = drawer && window.matchMedia && window.matchMedia('(max-width:900px)').matches && !drawer.classList.contains('open');
        var sb = (opener && document.contains(opener) && !drawerShut) ? opener : topS;
        if(sb && (!document.activeElement || document.activeElement === document.body || m.contains(document.activeElement))) sb.focus();
      }
    }).observe(m, { attributes: true, attributeFilter: ['class'] });
    /* حبس Tab داخل النافذة */
    m.addEventListener('keydown', function(e){
      if(e.key !== 'Tab' || !m.classList.contains('show')) return;
      var f = [].filter.call(m.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'), function(x){ return !x.disabled && x.offsetParent !== null; });
      if(!f.length) return; var first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
    m.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.sm-tab'); if(b) setSmTab(b.getAttribute('data-sm')); });
    m.addEventListener('keydown', function(e){
      var b = e.target.closest && e.target.closest('.sm-tab'); if(!b || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) < 0) return;
      var i = SM_TABS.indexOf(b.getAttribute('data-sm')), d = (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? 1 : -1;   /* RTL: السهم الأيسر = التالي */
      setSmTab(SM_TABS[(i + d + SM_TABS.length) % SM_TABS.length]);
      var nb = m.querySelector('.sm-tab[aria-selected="true"]'); if(nb) nb.focus();
    });
  }

  /* --- الوضع البسيط: يخفي التبويبات والبطاقات الثانوية فقط (لا يحذف أي بيانات) --- */
  var SIMPLE_TABS = ['dashboard', 'timetable', 'courses', 'tasks', 'exams'];
  function isSimple(){ return lsv('ss_simple') === '1'; }
  function paintSimple(){
    var on = isSimple();
    root.classList.toggle('simple', on);
    var b = document.getElementById('simpleBtn');
    if(b){ b.setAttribute('aria-checked', on ? 'true' : 'false'); var t = b.querySelector('.sp-t'); if(t) t.textContent = on ? 'مفعّل — الأساسيات فقط' : 'كل الميزات ظاهرة'; }
    /* لو كان التبويب المفتوح مخفياً بالوضع البسيط نرجع للوحة */
    if(on){
      var cur = document.querySelector('.section.active');
      if(cur && SIMPLE_TABS.indexOf(cur.id) < 0 && window.switchTab) window.switchTab('dashboard');
    }
  }
  function setSimple(on, quiet){
    lss('ss_simple', on ? '1' : '0'); paintSimple();
    if(!quiet && window.toast) window.toast(on ? '🧘 الوضع البسيط — الأساسيات فقط (من ⚙️ ← المظهر ترجع للكامل)' : '🧰 رجعت كل الميزات', 'info', 2200);
  }
  window.SimpleMode = { isOn: isSimple, set: setSimple, toggle: function(){ setSimple(!isSimple()); } };
  paintSimple();
  function bindSimple(){
    initSmTabs();
    var b = document.getElementById('simpleBtn');
    if(b && !b._sp){ b._sp = true; b.addEventListener('click', function(){ if(window.closeSettingsMenu) window.closeSettingsMenu(); window.SimpleMode.toggle(); }); }
    paintSimple();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindSimple); else bindSimple();
  setTimeout(bindSimple, 400);

  /* --- تموّج عند الضغط على الأزرار (يُلغى مع «تقليل الحركة») --- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce){
    document.addEventListener('pointerdown', function(e){
      var h = e.target.closest && e.target.closest('.btn, .sm-tab'); if(!h || h.disabled) return;
      var r = h.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6, s = document.createElement('span');
      s.className = 'ripple'; s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
      h.classList.add('rip-host'); h.appendChild(s);
      setTimeout(function(){ if(s.parentNode) s.parentNode.removeChild(s); }, 650);
    }, { passive: true });
  }
})();


/* ===== شريط «المحاضرة الجاية» (يظهر أعلى الصفحات ما عدا لوحة التحكم) =====
   يبيّن الحالية (مع تقدّمها وباقي الوقت) أو التالية (عدّاد تنازلي)، مع المبنى بالخريطة وعدد محاضرات اليوم المتبقية؛
   الضغط عليه يفتح تفاصيل المحاضرة، وزر 🗺️ يفتح الخريطة، وزر ✕ يخفيه لحد المحاضرة التالية. */
(function(){
            var lastKey = '';
  function updateStrip(){}
  function bindStrip(){}
  /* روابط الجامعة على التلفون: مجموعات قابلة للطيّ (الأولى مفتوحة) بدل صفحة طويلة جداً */
  function bindHuFold(){
    var sec = document.getElementById('hulinks'); if(!sec || sec._hf) return; sec._hf = true;
    var heads = [].filter.call(sec.querySelectorAll(':scope > h3'), function(h){ return h.nextElementSibling && h.nextElementSibling.classList.contains('grid'); });
    heads.forEach(function(h, i){
      h.classList.add('hu-grp'); h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); if(i === 0) h.classList.add('open');
      h.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
      function tg(){ var on = !h.classList.contains('open'); h.classList.toggle('open', on); h.setAttribute('aria-expanded', on ? 'true' : 'false'); }
      h.addEventListener('click', tg);
      h.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); tg(); } });
    });
    function fit(){ sec.classList.toggle('hu-fold', window.innerWidth <= 700); }
    fit(); window.addEventListener('resize', fit);
  }
  function init(){ bindStrip(); bindHuFold(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(init, 600); setTimeout(updateStrip, 1500);
})();

/* ===== لمس: اهتزاز خفيف عند إنجاز مهمة / تسجيل حضور (يحترم «تقليل الحركة»؛ يعمل حيث يدعم الجهاز navigator.vibrate) ===== */
(function(){
  function reduced(){ try{ return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
  function haptic(p){ try{ if(!reduced() && navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function wrapOnce(name, after){
    var o = window[name]; if(typeof o !== 'function' || o._hp) return;
    var n = function(){ var r = o.apply(this, arguments); try{ after.apply(null, arguments); }catch(e){} return r; }; n._hp = true; window[name] = n;
  }
  function init(){
    wrapOnce('toggleTask', function(id){ var t = ((window.space || {}).tasks || []).filter(function(x){ return x.id === id; })[0]; haptic(t && t.done ? [14] : [6]); });
    wrapOnce('markAttendance', function(n, type){ haptic(type === 'present' ? [10, 40, 10] : [30]); });
  }
  window.Haptic = haptic;
  setTimeout(init, 900); setTimeout(init, 3000);
})();

/* ===== تجربة الهاتف: زر الرجوع، لوحة المفاتيح، العودة من الخلفية، الروابط ===== */
(function(){
  'use strict';
  var W = window, D = document, root = D.documentElement;
  function mm(q){ try{ return !!(W.matchMedia && W.matchMedia(q).matches); }catch(e){ return false; } }
  function isNative(){ try{ return !!(W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform()); }catch(e){ return false; } }

  /* ---------- 1) زر الرجوع (أندرويد/لمس/تطبيق مثبّت) ----------
     الترتيب: نافذة/درج مفتوح ← يُغلق أولاً (نفس منطق مفتاح Esc الشامل)؛ ثم رجوع بين الصفحات (سجل المتصفح)؛ وعند مدخل «القاعدة» (الصفحة الأولى)
     رسالة «اضغط رجوع مرة ثانية للخروج»، والضغطة الثانية تخرج من التطبيق فعلاً (لا يوجد مدخل أقدم). سطح المكتب: سلوك المتصفح كما هو. */
  var OVERLAYS = '.modal-backdrop,.hub-sheet-backdrop,.cmdk-backdrop,.ocri-overlay,.rd-overlay,#sidebar.open,#settingsMenu.show,#aiPanel.show,#fabMenu.show,#examCountdownScreen.open,#focusScreen.open,#themePanel.show';
  var enabled = mm('(pointer:coarse)') || mm('(display-mode:standalone)') || isNative();
  var ignore = false, ignoreT = null, armed = false, armT = null;
  function overlayOpen(){ try{ return !!D.querySelector(OVERLAYS); }catch(e){ return false; } }
  function closeTop(){
    try{
      var rd = D.querySelector('.rd-bar [data-rd="close"]'); if(rd){ rd.click(); return; }
      var oc = D.querySelector('.ocri-overlay');
      if(oc){ var b = oc.querySelector('.ocri-btn.ghost,[data-x],button[aria-label="إغلاق"]'); if(b) b.click(); else if(oc.parentNode) oc.parentNode.removeChild(oc); return; }
      D.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }catch(e){}
  }
  function skipNextPop(){ ignore = true; clearTimeout(ignoreT); ignoreT = setTimeout(function(){ ignore = false; }, 600); }
  function forward(){ skipNextPop(); try{ W.history.forward(); }catch(e){ ignore = false; } }
  var BackNav = W.BackNav = { enabled: enabled, onPop: function(e){
    if(!enabled) return false;
    if(ignore){ ignore = false; clearTimeout(ignoreT); return true; }
    if(overlayOpen()){ closeTop(); forward(); return true; }          /* رجوع = إغلاق النافذة ثم نعيد السجل لمكانه */
    if(e && e.state && e.state.base){
      if(!armed){
        armed = true; clearTimeout(armT);
        if(W.toast) W.toast('اضغط رجوع مرة ثانية للخروج', 'info', 2200);
        armT = setTimeout(function(){ armed = false; try{ if(W.history.state && W.history.state.base) forward(); }catch(err){} }, 2300);
      }
      return true;                                                      /* لا تبديل صفحة عند القاعدة */
    }
    return false;
  } };

  /* ---------- 2) لوحة المفاتيح ---------- */
  var layoutH = W.innerHeight, kbOpen = false;
  function isField(el){
    if(!el || !el.tagName) return false;
    var t = el.tagName;
    if(t === 'TEXTAREA' || t === 'SELECT') return true;
    if(t === 'INPUT') return !/^(checkbox|radio|button|submit|range|color|file|reset|image)$/.test(el.type || 'text');
    return !!el.isContentEditable;
  }
  function kbUpdate(){
    var vv = W.visualViewport, typing = isField(D.activeElement);
    if(!typing){ layoutH = Math.max(W.innerHeight, vv ? vv.height + (vv.offsetTop || 0) : 0); }     /* ارتفاع الشاشة بدون كيبورد (يتحدّث مع تدوير الشاشة) */
    var vh = vv ? vv.height : W.innerHeight, top = vv ? (vv.offsetTop || 0) : 0;
    var kb = Math.max(0, layoutH - vh - top, layoutH - W.innerHeight);
    var open = typing && kb > 120;
    root.style.setProperty('--vvh', Math.round(vh) + 'px');
    root.style.setProperty('--kb', open ? Math.round(kb) + 'px' : '0px');
    if(open !== kbOpen){ kbOpen = open; root.classList.toggle('kb-open', open); }
  }
  function revealField(el){
    try{
      if(!isField(el) || !el.getBoundingClientRect) return;
      var vv = W.visualViewport, vh = vv ? vv.height : W.innerHeight, r = el.getBoundingClientRect();
      if(r.bottom > vh - 24 || r.top < 72) el.scrollIntoView({ block: 'center', behavior: mm('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth' });
    }catch(e){}
  }
  if(W.visualViewport){ W.visualViewport.addEventListener('resize', kbUpdate); W.visualViewport.addEventListener('scroll', kbUpdate); }
  W.addEventListener('resize', kbUpdate);
  W.addEventListener('orientationchange', function(){ setTimeout(function(){ layoutH = W.innerHeight; kbUpdate(); }, 350); });
  D.addEventListener('focusin', function(e){ if(!isField(e.target)) return; kbUpdate(); setTimeout(function(){ kbUpdate(); revealField(e.target); }, 320); });
  D.addEventListener('focusout', function(){ setTimeout(kbUpdate, 150); });
  kbUpdate();

  /* ---------- 3) العودة من الخلفية: يوم جديد ← تحديث الشاشات؛ الصفحة المستعادة من الكاش ← نفس الشيء ---------- */
  var lastDay = W.today ? W.today() : '', hiddenAt = 0;
  function onResume(force){
    try{
      var d = W.today ? W.today() : '';
      if(force || (d && d !== lastDay)){
        lastDay = d;
        if(W.syncAllUI) W.syncAllUI(); else if(W.renderDashboard) W.renderDashboard();
      }
      kbUpdate();
    }catch(e){}
  }
  D.addEventListener('visibilitychange', function(){
    if(D.hidden){ hiddenAt = Date.now(); return; }
    onResume(hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000);   /* غياب أكثر من نصف ساعة: حدّث كل شي (التحديث الدوري متوقف بالخلفية) */
  });
  W.addEventListener('pageshow', function(e){ if(e && e.persisted) onResume(true); });

  /* ---------- 4) روابط خارجية بنافذة جديدة: أمان الخصوصية (بدون وصول للصفحة الأصلية) ---------- */
  D.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[target="_blank"]') : null;
    if(a && !/noopener/.test(a.rel || '')) a.rel = ((a.rel || '') + ' noopener noreferrer').trim();
  }, true);
})();
