/* ============================================================
   🔄 sync.js v3 — Cross-tab + Exact matching + Attendance fix
   ============================================================ */
(function(){
  'use strict';
  if(window._syncLoaded) return;
  window._syncLoaded = true;

  function toast(m,t,d){ if(window.toast) window.toast(m,t,d); }
  function saveSpace(){ if(window.saveSpace) window.saveSpace(); }
  function space(){ return window.space || {}; }
  function getS(){ return window.S || {get:function(k,d){return d;},set:function(){}}; }

  /* ============ Helpers ============ */
  function getCodeFromRow(row){
    if(row.dataset && row.dataset.code) return row.dataset.code;
    var text = row.textContent || '';
    var m = text.match(/\b(0?\d{9,10})\b/);
    if(m) return m[1];
    var m2 = text.match(/\b(0?\d{6,8})\b/);
    if(m2) return m2[1];
    return null;
  }

  function getCourseFromRow(row){
    var code = getCodeFromRow(row);
    if(!code) return null;
    if(typeof window.findCourseByCode === 'function'){
      var r = window.findCourseByCode(code);
      if(r && r.name) return { name: r.name, info: r.info, code: code };
    }
    var DB = window.COURSES_DB || {};
    var normalized = code.replace(/^0+/, '');
    var keys = Object.keys(DB);
    for(var i = 0; i < keys.length; i++){
      var info = DB[keys[i]];
      if(String(info.code).replace(/^0+/, '') === normalized){
        return { name: keys[i], info: info, code: code };
      }
      if(info.aliases){
        for(var a = 0; a < info.aliases.length; a++){
          var av = info.aliases[a];
          if(typeof av === 'string' && av.replace(/^0+/, '') === normalized){
            return { name: keys[i], info: info, code: code };
          }
        }
      }
    }
    return null;
  }

  function isInMyCourses(course){
    if(!course) return false;
    var courses = space().courses || [];
    var normCode = String(course.code || '').replace(/^0+/, '');
    for(var i = 0; i < courses.length; i++){
      var c = courses[i];
      if(c.code && String(c.code).replace(/^0+/, '') === normCode) return true;
      if(c.name === course.name) return true;
    }
    return false;
  }

  /* ============ 1. CSS ============ */
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

  /* ============ 2. Add course from anywhere ============ */
  window.addCourseFromAnywhere = function(name, code, hours, options){
    options = options || {};
    var sp = space();
    if(!sp.courses) sp.courses = [];

    var exists = sp.courses.some(function(c){
      return c.name === name || (code && c.code && String(c.code).replace(/^0+/,'') === String(code).replace(/^0+/,''));
    });
    if(exists){
      if(!options.silent) toast('⚠️ المادة موجودة أصلاً', 'info', 2000);
      return false;
    }

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

  /* ============ 3. Sync all tabs ============ */
  window.syncAllTabs = function(){
    var sp = space();

    /* Timetable → courses */
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

    /* Attendance → courses (تجاهل المحذوفة) */
    var att = sp.attendance || {};
    var deletedAtt = getS().get('ss_deleted_attendance', []);
    Object.keys(att).forEach(function(name){
      if(deletedAtt.indexOf(name) > -1) return;
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

    saveSpace();

    try{ if(window.renderCourses) window.renderCourses(); }catch(e){}
    try{ if(window.renderPlan) window.renderPlan(); }catch(e){}
    try{ if(window.renderTimetable) window.renderTimetable(); }catch(e){}
    try{ if(window.renderDashboard) window.renderDashboard(); }catch(e){}
    try{ if(window.renderAttendance) window.renderAttendance(); }catch(e){}

    setTimeout(refreshAllPlanButtons, 100);
  };

  /* ============ 4. Refresh plan buttons (exact) ============ */
  function refreshAllPlanButtons(){
    var sem = document.getElementById('semesters');
    if(!sem) return;

    sem.querySelectorAll('.sem-body > div').forEach(function(row){
      var course = getCourseFromRow(row);
      if(!course) return;

      var btn = row.querySelector('.plan-add-btn');
      if(!btn){
        btn = document.createElement('button');
        btn.className = 'plan-add-btn';
        btn.type = 'button';
        btn.title = 'أضف إلى موادي';
        btn.textContent = '+';
        btn.addEventListener('click', function(e){
          e.stopPropagation(); e.preventDefault();
          if(btn.disabled) return;
          var added = window.addCourseFromAnywhere(
            course.name,
            course.info ? course.info.code : course.code,
            course.info ? course.info.h : 3
          );
          if(added){
            btn.classList.add('added');
            btn.textContent = '✓';
            btn.disabled = true;
          }
        });

        var lastChild = row.lastElementChild;
        if(lastChild){
          var wrapper = document.createElement('div');
          wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;flex-shrink:0';
          row.insertBefore(wrapper, lastChild);
          wrapper.appendChild(lastChild);
          wrapper.appendChild(btn);
        } else {
          row.appendChild(btn);
        }
      }

      if(isInMyCourses(course)){
        btn.classList.add('added');
        btn.textContent = '✓';
        btn.disabled = true;
      } else {
        btn.classList.remove('added');
        btn.textContent = '+';
        btn.disabled = false;
      }
    });
  }

  /* ============ 5. Watch courses ============ */
  var lastHash = '';
  function watchCourses(){
    setInterval(function(){
      var sp = space();
      var hash = JSON.stringify((sp.courses || []).map(function(c){
        return (c.code || '').replace(/^0+/, '') + '|' + c.name;
      }).sort());
      if(hash !== lastHash){
        lastHash = hash;
        refreshAllPlanButtons();
      }
    }, 800);
  }

  /* ============ 6. Hooks ============ */
  function hookTabSwitch(){
    if(window._syncTabPatched) return;
    if(typeof window.switchTab !== 'function') return;
    var orig = window.switchTab;
    window.switchTab = function(tab){
      var r = orig.apply(this, arguments);
      setTimeout(function(){
        if(tab === 'plan'){ refreshAllPlanButtons(); }
        if(tab === 'courses'){ syncAllTabs(); }
      }, 150);
      return r;
    };
    window._syncTabPatched = true;
  }

  function hookRenderPlan(){
    if(window._syncRenderPlanPatched) return;
    if(typeof window.renderPlan !== 'function') return;
    var orig = window.renderPlan;
    window.renderPlan = function(){
      var r = orig.apply(this, arguments);
      setTimeout(refreshAllPlanButtons, 150);
      return r;
    };
    window._syncRenderPlanPatched = true;
  }

  function hookAddMyCourse(){
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

  function hookImportFromPlan(){
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

  /* ============ 7. Fix removeAttendance ============ */
  function hookRemoveAttendance(){
    if(typeof window.removeAttendance !== 'function') return;
    if(window._removeAttPatched) return;
    var orig = window.removeAttendance;
    window.removeAttendance = function(name){
      /* سجّل المادة كمحذوفة */
      var deleted = getS().get('ss_deleted_attendance', []);
      if(deleted.indexOf(name) === -1) deleted.push(name);
      getS().set('ss_deleted_attendance', deleted);

      var r = orig.apply(this, arguments);
      setTimeout(function(){
        if(window.syncAllTabs) window.syncAllTabs();
      }, 200);
      return r;
    };
    window._removeAttPatched = true;
  }

  /* ============ 8. Sync Toast ============ */
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

  /* ============ INIT ============ */
  function init(){
    injectPlanBtnCSS();
    hookTabSwitch();
    hookRenderPlan();
    hookAddMyCourse();
    hookImportFromPlan();
    hookRemoveAttendance();
    watchCourses();

    setTimeout(refreshAllPlanButtons, 1000);
    setTimeout(refreshAllPlanButtons, 2500);
    setTimeout(refreshAllPlanButtons, 4000);

    console.log('🔄 sync.js v3 loaded (exact matching + attendance fix)');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();