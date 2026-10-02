/* ============================================================
   🔄 sync.js — Cross-tab consistency + UI fixes
   - Fix + button (turns green)
   - Cross-tab sync (timetable ↔ courses ↔ plan)
   - Better feedback when adding courses
   ============================================================ */
(function(){
  'use strict';
  if(window._syncLoaded) return;
  window._syncLoaded = true;

  function toast(m,t,d){ if(window.toast) window.toast(m,t,d); }
  function saveSpace(){ if(window.saveSpace) window.saveSpace(); }
  function space(){ return window.space || {}; }

  /* ============ 1. زر الإضافة — حقن CSS مباشرة ============ */
  function injectPlanBtnCSS(){
    if(document.getElementById('plan-btn-fix')) return;
    var s = document.createElement('style');
    s.id = 'plan-btn-fix';
    s.textContent = `
      .plan-add-btn{
        width:34px;height:34px;border-radius:10px;
        background:var(--grad);color:#0b0f1a;
        border:none;cursor:pointer;font-family:inherit;
        font-size:1.2rem;font-weight:900;line-height:1;
        display:flex;align-items:center;justify-content:center;
        flex-shrink:0;transition:all .25s cubic-bezier(.34,1.56,.64,1);
        padding:0;box-shadow:0 3px 10px var(--glow);
      }
      .plan-add-btn:hover{transform:scale(1.12);box-shadow:0 5px 16px var(--glow)}
      .plan-add-btn:active{transform:scale(.94)}
      .plan-add-btn.added,
      .plan-add-btn[disabled]{
        background:linear-gradient(135deg,#10b981,#34d399) !important;
        color:#fff !important;cursor:default !important;
        box-shadow:0 3px 12px rgba(52,211,153,.5) !important;
        animation:planPop .5s cubic-bezier(.34,1.56,.64,1);
      }
      .plan-add-btn.added:hover,
      .plan-add-btn[disabled]:hover{transform:none;box-shadow:0 3px 12px rgba(52,211,153,.5) !important}
      @keyframes planPop{
        0%{transform:scale(.5);opacity:.4}
        60%{transform:scale(1.25);opacity:1}
        100%{transform:scale(1);opacity:1}
      }

      /* Sync badge — يعرض حالة المزامنة */
      .sync-toast{
        position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
        z-index:9998;padding:10px 20px;border-radius:24px;
        background:var(--card);border:1px solid var(--border);
        box-shadow:var(--shadow-lg);font-size:.85rem;font-weight:600;
        color:var(--cyan);display:flex;align-items:center;gap:8px;
        animation:syncToastIn .4s cubic-bezier(.34,1.56,.64,1);
        pointer-events:none;
      }
      @keyframes syncToastIn{
        from{opacity:0;transform:translateX(-50%) translateY(20px) scale(.9)}
        to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}
      }
      .sync-toast.out{animation:syncToastOut .3s forwards}
      @keyframes syncToastOut{to{opacity:0;transform:translateX(-50%) translateY(-15px)}}
    `;
    document.head.appendChild(s);
  }

  /* ============ 2. Cross-tab sync — إضافة مادة من أي مكان ============ */
  window.addCourseFromAnywhere = function(name, code, hours, options){
    options = options || {};
    var sp = space();
    if(!sp.courses) sp.courses = [];

    /* التحقق من الوجود */
    var exists = sp.courses.some(function(c){
      return c.name === name || (code && c.code && String(c.code).replace(/^0+/,'') === String(code).replace(/^0+/,''));
    });
    if(exists){
      if(!options.silent) toast('⚠️ المادة موجودة أصلاً', 'info', 2000);
      return false;
    }

    /* إذا الكود غير ممرر، حاول تلاقيه */
    var DB = window.COURSES_DB || {};
    if(!code && DB[name]) code = DB[name].code;
    if(!hours && DB[name]) hours = DB[name].h;

    sp.courses.push({
      id: (window.uid ? window.uid() : Date.now().toString(36) + Math.random().toString(36).slice(2,6)),
      name: name,
      code: code || '',
      hours: parseInt(hours) || 3,
      instructor: options.instructor || '',
      room: options.room || '',
      completed: options.completed || false
    });

    saveSpace();

    /* Cross-tab sync */
    syncAllTabs();

    if(!options.silent) toast('✅ أُضيفت "' + name + '"', 'success', 2200);
    return true;
  };

  window.removeCourseFromAnywhere = function(name){
    var sp = space();
    if(!sp.courses) return false;
    var before = sp.courses.length;
    sp.courses = sp.courses.filter(function(c){ return c.name !== name; });
    if(sp.courses.length < before){
      saveSpace();
      syncAllTabs();
      return true;
    }
    return false;
  };

  /* المزامنة الشاملة بين كل التابات */
  window.syncAllTabs = function(){
    var sp = space();

    /* 1. Timetable sync — أي مادة في الجدول لازم تكون في sp.courses */
    var tt = sp.timetable || {};
    var seen = {};
    Object.keys(tt).forEach(function(key){
      var cls = tt[key];
      if(!cls || !cls.name) return;
      if(seen[cls.name]) return;
      seen[cls.name] = true;
      var exists = (sp.courses || []).some(function(c){ return c.name === cls.name; });
      if(!exists){
        var DB = window.COURSES_DB || {};
        var info = DB[cls.name];
        if(!sp.courses) sp.courses = [];
        sp.courses.push({
          id: (window.uid ? window.uid() : Date.now().toString(36)),
          name: cls.name,
          code: info ? info.code : '',
          hours: info ? info.h : 3,
          instructor: cls.instructor || '',
          room: cls.room || ''
        });
      }
    });

    /* 2. Attendance sync — كل مادة بحضور لازم تكون موجودة */
    var att = sp.attendance || {};
    Object.keys(att).forEach(function(name){
      var exists = (sp.courses || []).some(function(c){ return c.name === name; });
      if(!exists){
        var DB2 = window.COURSES_DB || {};
        var info2 = DB2[name];
        if(!sp.courses) sp.courses = [];
        sp.courses.push({
          id: (window.uid ? window.uid() : Date.now().toString(36)),
          name: name,
          code: info2 ? info2.code : '',
          hours: info2 ? info2.h : 3,
          instructor: '',
          room: ''
        });
      }
    });

    /* 3. Sync courses الحالية إلى plan (المادة لازم تنميز "مضافة" في الخطة) */
    saveSpace();

    /* 4. إعادة رسم كل التابات */
    try{ if(window.renderCourses) window.renderCourses(); }catch(e){}
    try{ if(window.renderPlan) window.renderPlan(); }catch(e){}
    try{ if(window.renderTimetable) window.renderTimetable(); }catch(e){}
    try{ if(window.renderDashboard) window.renderDashboard(); }catch(e){}
    try{ if(window.renderAttendance) window.renderAttendance(); }catch(e){}

    /* 5. تحديث كل أزرار + في صفحة الخطة */
    setTimeout(refreshPlanButtons, 100);
  };

  /* ============ 3. تحديد حالة زر + في الخطة ============ */
  function refreshPlanButtons(){
    var sp = space();
    var courses = sp.courses || [];
    document.querySelectorAll('.plan-add-btn').forEach(function(btn){
      if(btn.disabled) return;
      var row = btn.closest('div[style*="border-top"], .sem-body > div, [data-plan-row]');
      if(!row) return;
      var text = (row.textContent || '').trim();
      var DB = window.COURSES_DB || {};
      /* Find course name in this row */
      var foundName = null;
      var keys = Object.keys(DB);
      for(var i = 0; i < keys.length; i++){
        if(text.indexOf(keys[i]) > -1){ foundName = keys[i]; break; }
      }
      if(!foundName) return;
      var exists = courses.some(function(c){ return c.name === foundName; });
      if(exists){
        btn.classList.add('added');
        btn.textContent = '✓';
        btn.disabled = true;
      }
    });
  }

  /* ============ 4. حقن زر الإضافة الذكي في خطة المواد ============ */
  function enhancePlanUI(){
    var sem = document.getElementById('semesters');
    if(!sem) return;
    var DB = window.COURSES_DB || {};
    var sp = space();
    var courses = sp.courses || [];

    sem.querySelectorAll('.sem-body > div').forEach(function(row){
      if(row.dataset.syncEnhanced) return;
      row.dataset.syncEnhanced = '1';

      /* Find course name */
      var text = (row.textContent || '').trim();
      var foundName = null;
      var codeMatch = text.match(/\b(0?\d{6,10})\b/);
      if(codeMatch && window.findCourseByCode){
        var r = window.findCourseByCode(codeMatch[1]);
        if(r) foundName = r.name;
      }
      if(!foundName){
        var keys = Object.keys(DB);
        for(var j = 0; j < keys.length; j++){
          if(text.indexOf(keys[j]) > -1){ foundName = keys[j]; break; }
        }
      }
      if(!foundName) return;

      if(row.querySelector('.plan-add-btn')) return;
      var btn = document.createElement('button');
      btn.className = 'plan-add-btn';
      btn.type = 'button';
      btn.title = 'أضف إلى موادي';
      var exists = courses.some(function(c){ return c.name === foundName; });
      if(exists){ btn.classList.add('added'); btn.textContent = '✓'; btn.disabled = true; }
      else { btn.textContent = '+'; }

      var info = DB[foundName];
      btn.addEventListener('click', function(e){
        e.stopPropagation(); e.preventDefault();
        if(btn.disabled) return;
        var added = window.addCourseFromAnywhere(foundName, info ? info.code : '', info ? info.h : 3);
        if(added){
          btn.classList.add('added');
          btn.textContent = '✓';
          btn.disabled = true;
        }
      });

      var lastChild = row.lastElementChild;
      if(lastChild && lastChild !== btn){
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0';
        row.insertBefore(wrapper, lastChild);
        wrapper.appendChild(lastChild);
        wrapper.appendChild(btn);
      } else {
        row.appendChild(btn);
      }
    });
  }

  /* ============ 5. مراقب التغييرات في sp.courses ============ */
  function watchCourses(){
    if(window._coursesWatcher) return;
    window._coursesWatcher = true;
    var lastHash = '';
    setInterval(function(){
      var sp = space();
      var hash = JSON.stringify((sp.courses || []).map(function(c){ return c.name + '|' + c.code; }));
      if(hash !== lastHash){
        lastHash = hash;
        refreshPlanButtons();
      }
    }, 1500);
  }

  /* ============ 6. إصلاح Smart Timetable — يقبل الأكواد الرسمية ============ */
  function patchSmartTimetable(){
    /* The findCourseByCode function is called from sttLookupByCode */
    /* Already supports aliases via data.js v7 */
    /* Just make sure normalize is right */
  }

  /* ============ 7. شريط المزامنة ============ */
  window.showSyncToast = function(msg, icon){
    var existing = document.querySelector('.sync-toast');
    if(existing) existing.remove();
    var t = document.createElement('div');
    t.className = 'sync-toast';
    t.innerHTML = '<span>' + (icon || '🔄') + '</span><span>' + msg + '</span>';
    document.body.appendChild(t);
    setTimeout(function(){
      t.classList.add('out');
      setTimeout(function(){ t.remove(); }, 300);
    }, 2200);
  };

  /* ============ 8. Patch addMyCourse — sync + celebration ============ */
  function patchAddMyCourse(){
    if(typeof window.addMyCourse !== 'function') return;
    if(window._addMyCoursePatched) return;
    var orig = window.addMyCourse;
    window.addMyCourse = function(){
      var r = orig.apply(this, arguments);
      setTimeout(syncAllTabs, 200);
      return r;
    };
    window._addMyCoursePatched = true;
  }

  /* ============ 9. Patch importFromPlan ============ */
  function patchImportFromPlan(){
    if(typeof window.importFromPlan !== 'function') return;
    if(window._importPlanPatched) return;
    var orig = window.importFromPlan;
    window.importFromPlan = function(){
      var r = orig.apply(this, arguments);
      setTimeout(syncAllTabs, 300);
      return r;
    };
    window._importPlanPatched = true;
  }

  /* ============ 10. Patch renderPlan — re-enhance after render ============ */
  function patchRenderPlan(){
    if(typeof window.renderPlan !== 'function') return;
    if(window._renderPlanSyncPatched) return;
    var orig = window.renderPlan;
    window.renderPlan = function(){
      var r = orig.apply(this, arguments);
      setTimeout(enhancePlanUI, 100);
      setTimeout(refreshPlanButtons, 200);
      return r;
    };
    window._renderPlanSyncPatched = true;
  }

  /* ============ INIT ============ */
  function init(){
    injectPlanBtnCSS();
    patchAddMyCourse();
    patchImportFromPlan();
    patchRenderPlan();
    watchCourses();

    setTimeout(function(){
      enhancePlanUI();
      refreshPlanButtons();
    }, 800);
    setTimeout(function(){
      enhancePlanUI();
      refreshPlanButtons();
    }, 2500);

    /* Re-run on plan tab */
    if(window.switchTab && !window._syncTabPatched){
      var origSwitch = window.switchTab;
      window.switchTab = function(tab){
        var r = origSwitch.apply(this, arguments);
        setTimeout(function(){
          if(tab === 'plan'){ enhancePlanUI(); refreshPlanButtons(); }
          if(tab === 'courses'){ syncAllTabs(); }
        }, 150);
        return r;
      };
      window._syncTabPatched = true;
    }

    console.log('🔄 sync.js loaded');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();