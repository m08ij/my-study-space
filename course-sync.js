/* ============================================================
   🔄 course-sync.js — نظام موحّد لإدارة المواد
   - زر واحد ➕/🗑️ لكل مادة
   - حذف شامل من كل التابات
   - العلامات + الحضور تلقائيين من "موادي"
   - الامتحانات قائمة اختيار من المواد
   ============================================================ */
(function(){
  'use strict';
  if(window._courseSyncLoaded) return;
  window._courseSyncLoaded = true;

  function space(){ return window.space || {}; }
  function save(){ if(window.saveSpace) window.saveSpace(); }
  function toast(m,t,d){ if(window.toast) window.toast(m,t,d); }
  function esc(s){ return window.esc ? window.esc(s) : String(s==null?'':s); }

  /* ============================================================
     CORE: Add course everywhere (single source of truth)
     ============================================================ */
  window.addCourseEverywhere = function(name, code, hours, options){
    options = options || {};
    var sp = space();
    if(!sp.courses) sp.courses = [];
    if(!sp.attendance) sp.attendance = {};
    if(!sp.grades) sp.grades = [];

    var normCode = String(code || '').replace(/^0+/, '');
    var exists = sp.courses.some(function(c){
      if(normCode && c.code && String(c.code).replace(/^0+/, '') === normCode) return true;
      return c.name === name;
    });
    if(exists){
      if(!options.silent) toast('المادة موجودة أصلاً', 'info', 1800);
      return false;
    }

    var newCourse = {
      id: window.uid ? window.uid() : Date.now().toString(36),
      name: name,
      code: code || '',
      hours: parseInt(hours) || 3,
      instructor: options.instructor || '',
      room: options.room || '',
      completed: false
    };
    sp.courses.push(newCourse);

    /* Auto-create attendance entry */
    if(!sp.attendance[name]) sp.attendance[name] = { present: 0, absent: 0 };

    /* Auto-create grade tracker entry */
    if(!sp.grades.find(function(g){ return g.name === name; })){
      sp.grades.push({ name: name, items: [] });
    }

    save();
    syncAllUI();
    if(!options.silent) toast('✅ أُضيفت "' + name + '"', 'success', 2000);
    if(!options.noPrompt) setTimeout(function(){ window.offerArchivedFiles(newCourse); }, 300);
    return true;
  };

  /* ============================================================
     ملفات المواد (Storage): مربوطة بـ id المادة، ولا تُحذف عند حذف المادة.
     عند حذف مادة لها ملفات نحفظ سجل أرشيف صغير (space.archivedCourses)،
     وعند إعادة إضافة مادة بنفس الكود نسأل المستخدم صراحةً هل يربط الملفات القديمة.
     لا ربط تلقائي أبداً (قد تكون مادة مختلفة بنفس الاسم)، ولا حذف لأي ملف.
     ============================================================ */
  var ARCHIVE_MAX = 50;
  function normCodeOf(c){ return String(c || '').replace(/^0+/, ''); }

  /* مجلدات الملفات الخاصة بمادة: id المادة نفسها + أي مجلدات قديمة ربطها المستخدم بها (filesFrom) */
  function foldersOf(c){
    var out = [c.id];
    (c.filesFrom || []).forEach(function(f){ if(f && out.indexOf(f) === -1) out.push(f); });
    return out;
  }
  function archFolders(a){ return (a.folders && a.folders.length) ? a.folders : [a.id]; }

  function archiveCourse(sp, c, files){
    if(!Array.isArray(sp.archivedCourses)) sp.archivedCourses = [];
    sp.archivedCourses = sp.archivedCourses.filter(function(a){ return a.id !== c.id; });   /* لا أرشفة مكررة لنفس المادة */
    sp.archivedCourses.unshift({
      id: c.id, folders: foldersOf(c), name: c.name, code: c.code || '', hours: c.hours || 3,
      deletedAt: new Date().toISOString(), files: files
    });
    if(sp.archivedCourses.length > ARCHIVE_MAX) sp.archivedCourses.length = ARCHIVE_MAX;
  }

  /* تطابق آمن: إن كان للطرفين كود فالكود هو المعيار، وإلا الاسم الكامل */
  function sameCourse(a, c){
    var ac = normCodeOf(a.code), cc = normCodeOf(c.code);
    if(ac && cc) return ac === cc;
    return a.name === c.name;
  }

  var linkQueue = [], linkBusy = false;
  function nextLinkPrompt(){
    if(linkBusy || !linkQueue.length) return;
    linkBusy = true;
    var job = linkQueue.shift();
    var bd = document.createElement('div');
    bd.className = 'sync-conflict-backdrop';
    bd.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px';
    var names = job.files.slice(0, 3).map(function(f){ return esc(String(f.name || '').replace(/^\d+_/, '')); }).join('، ');
    var when = ''; try{ when = new Date(job.arch.deletedAt).toLocaleDateString('ar-JO'); }catch(e){}
    bd.innerHTML = '<div class="modal" style="max-width:440px;text-align:center;position:relative">' +
      '<div style="font-size:2.4rem;margin-bottom:8px">📎</div>' +
      '<h3 style="margin-bottom:10px">ملفات قديمة لهذه المادة</h3>' +
      '<p style="color:var(--muted);font-size:.88rem;line-height:1.8;margin-bottom:6px">لقيت <b>' + job.files.length + '</b> ملف محفوظ من مادة محذوفة سابقاً: <b>' + esc(job.arch.name) + '</b>' +
      (when ? ' (' + when + ')' : '') + '.</p>' +
      (names ? '<p style="color:var(--muted2);font-size:.78rem;margin-bottom:12px">' + names + (job.files.length > 3 ? ' …' : '') + '</p>' : '') +
      '<p style="color:var(--muted2);font-size:.78rem;margin-bottom:16px">اربطها فقط إذا كانت نفس المادة. بدون ربط تبقى محفوظة ولا يُحذف شي.</p>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="btn btn-sm btn-ghost" id="lfNo">لا، مادة جديدة بدون الملفات القديمة</button>' +
        '<button class="btn btn-sm" id="lfYes">📎 ربط الملفات القديمة بـ "' + esc(job.course.name) + '"</button>' +
      '</div></div>';
    document.body.appendChild(bd);
    function done(){ bd.remove(); linkBusy = false; nextLinkPrompt(); }
    bd.querySelector('#lfNo').onclick = done;
    bd.querySelector('#lfYes').onclick = function(){
      var sp = space();
      var wanted = archFolders(job.arch);
      /* لا ربط إذا كانت هذه المجلدات مرتبطة أصلاً بمادة ثانية حيّة */
      var taken = (sp.courses || []).some(function(x){
        if(x === job.course) return false;
        return foldersOf(x).some(function(f){ return wanted.indexOf(f) > -1; });
      });
      if(taken){ toast('هذه الملفات مرتبطة بمادة ثانية حالياً', 'warn', 2800); done(); return; }
      /* id المادة الجديدة لا يتغيّر ولا يُعاد استخدام أي id قديم: نضيف مرجعاً للمجلد القديم فقط */
      var refs = (job.course.filesFrom || []).slice();
      wanted.forEach(function(f){ if(f !== job.course.id && refs.indexOf(f) === -1) refs.push(f); });
      job.course.filesFrom = refs;
      sp.archivedCourses = (sp.archivedCourses || []).filter(function(a){ return a.id !== job.arch.id; });
      save();
      if(window.__perfClearFileCache) window.__perfClearFileCache();
      syncAllUI();
      toast('✅ تم ربط ' + job.files.length + ' ملف', 'success', 2200);
      done();
    };
  }

  window.offerArchivedFiles = function(course){
    var sp = space();
    if(!course || !Array.isArray(sp.archivedCourses) || !sp.archivedCourses.length) return;
    if(!window.SB || !window.SB.listCourseFiles) return;
    var mine = foldersOf(course);
    var arch = sp.archivedCourses.filter(function(a){
      /* نتجاهل الأرشيف المرتبط أصلاً بهذه المادة (لا سؤال ثانٍ ولا استرجاع مرتين) */
      if(archFolders(a).every(function(f){ return mine.indexOf(f) > -1; })) return false;
      return sameCourse(a, course);
    })[0];
    if(!arch) return;
    if(!window.SB.listCourseFilesMulti) return;
    window.SB.listCourseFilesMulti(archFolders(arch), true).then(function(files){
      if(files === null) return;                       /* تعذّر التحقق: نترك الأرشيف لمحاولة لاحقة */
      if(!files.length){                               /* ما في ملفات فعلية: السجل بلا فائدة */
        sp.archivedCourses = sp.archivedCourses.filter(function(a){ return a.id !== arch.id; });
        save();
        return;
      }
      linkQueue.push({ course: course, arch: arch, files: files });
      nextLinkPrompt();
    }, function(){});
  };

  /* ============================================================
     CORE: Remove course from EVERYWHERE
     opts.archive: احفظ سجل أرشيف (ملفات المادة تبقى على السحابة) — opts.files: عددها أو null إن تعذّر التحقق
     ============================================================ */
  window.removeCourseEverywhere = function(name, opts){
    var sp = space();
    var count = 0;
    opts = opts || {};

    /* 1. From courses */
    if(Array.isArray(sp.courses)){
      var before = sp.courses.length;
      if(opts.archive){
        sp.courses.forEach(function(c){ if(c.name === name) archiveCourse(sp, c, opts.files == null ? null : opts.files); });
      }
      sp.courses = sp.courses.filter(function(c){ return c.name !== name; });
      count += before - sp.courses.length;
    }

    /* 2. From timetable */
    if(sp.timetable){
      Object.keys(sp.timetable).forEach(function(key){
        if(sp.timetable[key] && sp.timetable[key].name === name){
          delete sp.timetable[key];
          count++;
        }
      });
    }

    /* 3. From attendance */
    if(sp.attendance && sp.attendance[name]){
      delete sp.attendance[name];
      count++;
    }

    /* 4. From grades */
    if(Array.isArray(sp.grades)){
      var before2 = sp.grades.length;
      sp.grades = sp.grades.filter(function(g){ return g.name !== name; });
      count += before2 - sp.grades.length;
    }

    /* 5. From exams */
    if(Array.isArray(sp.exams)){
      var before3 = sp.exams.length;
      sp.exams = sp.exams.filter(function(e){ return e.course !== name; });
      count += before3 - sp.exams.length;
    }

    /* 6. From tasks */
    if(Array.isArray(sp.tasks)){
      sp.tasks.forEach(function(t){
        if(t.course === name) t.course = '';
      });
    }

    /* 7. ملاحظات المادة: تبقى (لا تُحذف) لكن تنفصل عن المادة حتى لا تلتصق بمادة جديدة بنفس الاسم */
    var detached = false;
    (window.notes || []).forEach(function(n){ if(n && n.course === name){ n.course = ''; detached = true; } });
    if(detached && window.S) window.S.set('notes', window.notes);

    save();
    syncAllUI();
    toast('🗑 حُذفت "' + name + '"', 'success', 2200);
    return count;
  };

  /* ============================================================
     CORE: Update course (name/code/hours/instructor/room)
     تغيير الاسم يُرحَّل لكل الأماكن المرتبطة بدون فقد بيانات.
     ملفات المادة مربوطة بالـ id فتبقى كما هي.
     ============================================================ */
  window.updateCourseEverywhere = function(id, f){
    var sp = space();
    var c = (sp.courses || []).filter(function(x){ return x.id === id; })[0];
    if(!c) return false;
    f = f || {};
    var newName = String(f.name == null ? c.name : f.name).trim();
    if(!newName){ toast('أدخل اسم المادة', 'warn'); return false; }
    var oldName = c.name;
    var newCode = f.code == null ? c.code : String(f.code).trim();
    var normCode = String(newCode || '').replace(/^0+/, '');

    var clash = sp.courses.some(function(x){
      if(x === c) return false;
      if(x.name === newName) return true;
      return !!(normCode && x.code && String(x.code).replace(/^0+/, '') === normCode);
    });
    if(clash){ toast('في مادة ثانية بنفس الاسم أو الكود', 'warn', 2600); return false; }

    if(newName !== oldName){
      if(sp.attendance && sp.attendance[oldName]){
        sp.attendance[newName] = sp.attendance[oldName];
        delete sp.attendance[oldName];
      }
      if(Array.isArray(sp.grades)){
        var mine = sp.grades.filter(function(g){ return g.name === oldName; })[0];
        if(mine){
          /* إدخال يتيم بالاسم الجديد (فاضي غالباً) يُستبدل ببيانات المادة */
          sp.grades = sp.grades.filter(function(g){ return g === mine || g.name !== newName; });
          mine.name = newName;
        }
      }
      (sp.exams || []).forEach(function(e){ if(e.course === oldName) e.course = newName; });
      (sp.tasks || []).forEach(function(t){ if(t.course === oldName) t.course = newName; });
      /* ملاحظات مرتبطة بالمادة (حقل اختياري تضيفه صفحة المادة) */
      var movedNotes = false;
      (window.notes || []).forEach(function(n){ if(n && n.course === oldName){ n.course = newName; movedNotes = true; } });
      if(movedNotes && window.S) window.S.set('notes', window.notes);
      Object.keys(sp.timetable || {}).forEach(function(k){
        if(sp.timetable[k] && sp.timetable[k].name === oldName) sp.timetable[k].name = newName;
      });
      if(Array.isArray(sp.completedCourses)){
        sp.completedCourses = sp.completedCourses.map(function(n){ return n === oldName ? newName : n; });
      }
    }

    c.name = newName;
    c.code = newCode;
    c.hours = parseInt(f.hours, 10) || c.hours || 3;
    if(f.instructor != null) c.instructor = String(f.instructor).trim();
    if(f.room != null) c.room = String(f.room).trim();

    save();
    syncAllUI();
    toast('✅ تم تعديل "' + newName + '"', 'success', 1800);
    return true;
  };

  /* تأكيد حذف يوضّح البيانات المرتبطة اللي رح تنحذف معها */
  window.confirmRemoveCourse = function(name){
    var sp = space(), parts = [];
    var a = sp.attendance && sp.attendance[name];
    if(a && (a.present || a.absent)) parts.push('الحضور (' + (a.present || 0) + ' حاضر / ' + (a.absent || 0) + ' غائب)');
    var g = (sp.grades || []).filter(function(x){ return x.name === name; })[0];
    if(g && g.items && g.items.length) parts.push(g.items.length + ' علامة');
    var ex = (sp.exams || []).filter(function(e){ return e.course === name; }).length;
    if(ex) parts.push(ex + ' امتحان');
    var tl = Object.keys(sp.timetable || {}).filter(function(k){ return sp.timetable[k] && sp.timetable[k].name === name; }).length;
    if(tl) parts.push(tl + ' محاضرة من الجدول');
    var course = (sp.courses || []).filter(function(x){ return x.name === name; })[0];

    /* ملفات المادة على السحابة: نفحصها قبل التأكيد (بمهلة قصيرة) لنوضح للمستخدم أنها تبقى محفوظة */
    function ask(files){
      var msg = 'حذف "' + name + '" من كل الأماكن؟' + (parts.length ? ' سيُحذف معها: ' + parts.join('، ') + '.' : '');
      if(files > 0) msg += ' الملفات المرفوعة (' + files + ') تبقى محفوظة على السحابة، ولو أضفت المادة من جديد بنسألك إذا بدك تربطها.';
      else if(files === null) msg += ' (تعذّر التحقق من ملفاتها — إن كان لها ملفات فتبقى محفوظة ويمكن ربطها لاحقاً.)';
      var run = function(){ window.removeCourseEverywhere(name, { archive: files === null || files > 0, files: files }); };
      if(window.customConfirm) window.customConfirm(msg, run);
      else if(confirm(msg)) run();
    }
    if(!course || !window.SB || !window.SB.listCourseFilesMulti){ ask(0); return; }
    /* ضغطة مزدوجة على الحذف: نتجاهل الطلب الثاني أثناء فحص/تأكيد الأول */
    if(pendingRemove[name]) return;
    pendingRemove[name] = true;
    var answered = false;
    var release = function(){ setTimeout(function(){ delete pendingRemove[name]; }, 400); };
    var timer = setTimeout(function(){ if(!answered){ answered = true; ask(null); release(); } }, 2500);
    window.SB.listCourseFilesMulti(foldersOf(course), true).then(function(r){
      if(answered) return; answered = true; clearTimeout(timer);
      ask(r === null ? null : r.length); release();
    }, function(){
      if(answered) return; answered = true; clearTimeout(timer); ask(null); release();
    });
  };
  var pendingRemove = {};

  window.editCourseDialog = function(id){
    var c = (space().courses || []).filter(function(x){ return x.id === id; })[0];
    if(!c || !window.showModal) return;
    window.showModal('تعديل مادة', [
      { key: 'name', label: 'اسم المادة' },
      { key: 'code', label: 'رقم المادة' },
      { key: 'hours', label: 'الساعات', type: 'number' },
      { key: 'instructor', label: 'الدكتور' },
      { key: 'room', label: 'القاعة' }
    ], { name: c.name || '', code: c.code || '', hours: c.hours || 3, instructor: c.instructor || '', room: c.room || '' }, function(data){
      return window.updateCourseEverywhere(id, data);
    });
  };

  /* ============================================================
     UI Sync — call every render function
     ============================================================ */
  function syncAllUI(){
    ['renderDashboard','renderCourses','renderAttendance',
     'renderGradeCalc','renderPlan','renderTimetable','renderExams']
      .forEach(function(fn){
        try{ if(window[fn]) window[fn](); }catch(e){}
      });
    setTimeout(refreshAllUnifiedButtons, 80);
  }
  window.syncAllUI = syncAllUI;

  /* ============================================================
     UNIFIED BUTTON — ➕ / 🗑️
     ============================================================ */
  function isCourseAdded(name){
    return (space().courses || []).some(function(c){ return c.name === name; });
  }
  window.isCourseAdded = isCourseAdded;

  function createUnifiedBtn(name, code, hours){
    var btn = document.createElement('button');
    btn.className = 'unified-course-btn';
    btn.type = 'button';
    btn.dataset.courseName = name;
    btn.dataset.code = code || '';
    btn.dataset.hours = hours || 3;
    updateBtnState(btn);
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      e.preventDefault();
      if(isCourseAdded(name)){
        window.confirmRemoveCourse(name);
      } else {
        window.addCourseEverywhere(name, code, hours);
      }
    });
    return btn;
  }
  window.createUnifiedBtn = createUnifiedBtn;

  function updateBtnState(btn){
    var name = btn.dataset.courseName;
    if(isCourseAdded(name)){
      btn.classList.add('added');
      btn.classList.remove('not-added');
      btn.innerHTML = '🗑';
      btn.title = 'حذف من كل الأماكن';
    } else {
      btn.classList.remove('added');
      btn.classList.add('not-added');
      btn.innerHTML = '+';
      btn.title = 'إضافة إلى موادي';
    }
  }

  function refreshAllUnifiedButtons(){
    document.querySelectorAll('.unified-course-btn').forEach(updateBtnState);
  }
  window.refreshAllUnifiedButtons = refreshAllUnifiedButtons;

  /* ============================================================
     CSS
     ============================================================ */
  function injectCSS(){
    if(document.getElementById('unified-course-css')) return;
    var s = document.createElement('style');
    s.id = 'unified-course-css';
    s.textContent = `
      .unified-course-btn{
        width:36px;height:36px;border-radius:10px;
        border:none;cursor:pointer;font-family:inherit;
        font-size:1.1rem;font-weight:900;line-height:1;
        display:inline-flex;align-items:center;justify-content:center;
        flex-shrink:0;
        transition:all .3s cubic-bezier(.34,1.56,.64,1);
        padding:0;position:relative;
      }
      .unified-course-btn.not-added{
        background:var(--grad);color:var(--on-accent);
        box-shadow:0 3px 10px var(--glow);
      }
      .unified-course-btn.not-added:hover{
        transform:scale(1.15);
        box-shadow:0 5px 18px var(--glow);
      }
      .unified-course-btn.added{
        background:linear-gradient(135deg,#ef4444,#dc2626);
        color:#fff;
        box-shadow:0 3px 12px rgba(239,68,68,.45);
      }
      .unified-course-btn.added:hover{
        transform:scale(1.15);
        box-shadow:0 6px 20px rgba(239,68,68,.6);
      }
      .unified-course-btn:active{transform:scale(.9)}
      @keyframes unifiedPulse{
        0%,100%{box-shadow:0 3px 12px rgba(239,68,68,.45)}
        50%{box-shadow:0 3px 16px rgba(239,68,68,.7), 0 0 0 4px rgba(239,68,68,.15)}
      }

      /* Plan row — compact button that fits inline */
      .plan-course-row .unified-course-btn{
        width:28px;
        height:28px;
        border-radius:8px;
        font-size:.95rem;
        margin:0;
        flex-shrink:0;
      }
      .plan-course-row:hover{
        background:var(--grad-soft);
        border-radius:8px;
      }
      .plan-course-row .unified-course-btn.not-added{
        animation:none;
      }
      .plan-course-row .unified-course-btn.added{
        animation:none;
      }
      .plan-course-row .unified-course-btn:hover{
        transform:scale(1.15);
      }

      /* Timetable cell — small button */
      .class-block{
        position:relative;
      }
      .class-block .unified-course-btn{
        position:absolute;
        top:4px;
        left:4px;
        width:22px;height:22px;
        font-size:.75rem;
        border-radius:6px;
      }

      /* Attendance & grade cards */
      .att-card .unified-course-btn,
      .gt-card .unified-course-btn{
        margin-right:0;
      }
    `;
    document.head.appendChild(s);
  }

  /* ============================================================
     OVERRIDE: renderAttendance (auto from courses)
     ============================================================ */
  window.renderAttendance = function(){
    var c = document.getElementById('attendanceList'); if(!c) return;
    var sp = space();
    var courses = sp.courses || [];
    var att = sp.attendance || {};

    if(!courses.length){
      c.innerHTML = '<div class="empty"><div class="ic">✅</div><p>لا توجد مواد بعد</p>' +
        '<p class="sub">أضف موادك من تبويب "الخطة"</p></div>';
      return;
    }

    /* Auto-create missing attendance entries */
    var changed = false;
    courses.forEach(function(course){
      if(!att[course.name]){
        att[course.name] = { present: 0, absent: 0 };
        changed = true;
      }
    });
    sp.attendance = att;
    if(changed) save();

    var html = '';
    courses.forEach(function(course){
      var name = course.name;
      var a = att[name] || { present: 0, absent: 0 };
      var total = a.present + a.absent;
      var hasData = total > 0;
      var pct = hasData ? Math.round(a.present / total * 100) : 0;
      var lvl = !hasData ? 'neutral' : (pct >= 85 ? 'good' : pct >= 75 ? 'warn' : 'danger');

      html += '<div class="att-card">' +
        '<div class="att-head">' +
          '<div class="att-name">📚 ' + esc(name) + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div class="att-pct ' + lvl + '">' + (hasData ? pct + '%' : '—') + '</div>' +
            '<button class="unified-course-btn added" data-course-name="' + esc(name) + '">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div class="att-bar"><div class="att-fill ' + lvl + '" style="width:' + (hasData ? pct : 0) + '%"></div></div>' +
        '<div class="att-actions">' +
          '<span style="margin-right:auto">✅ <b>' + a.present + '</b> · ❌ <b>' + a.absent + '</b></span>' +
          '<button class="btn btn-sm" data-mark-p="' + esc(name) + '">+ حاضر</button>' +
          '<button class="btn btn-sm btn-ghost" data-mark-a="' + esc(name) + '">+ غائب</button>' +
        '</div>' +
      '</div>';
    });
    c.innerHTML = html;

    /* Wire up unified buttons */
    c.querySelectorAll('.unified-course-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var name = btn.dataset.courseName;
        window.confirmRemoveCourse(name);
      });
    });

    /* Mark attendance */
    c.querySelectorAll('[data-mark-p]').forEach(function(b){
      b.addEventListener('click', function(){ window.markAttendance(b.dataset.markP, 'present'); });
    });
    c.querySelectorAll('[data-mark-a]').forEach(function(b){
      b.addEventListener('click', function(){ window.markAttendance(b.dataset.markA, 'absent'); });
    });
  };

  /* ============================================================
     OVERRIDE: renderGradeCalc (auto from courses)
     ============================================================ */
  window.renderGradeCalc = function(){
    var c = document.getElementById('gradeTrackerList'); if(!c) return;
    var sp = space();
    var courses = sp.courses || [];
    var grades = sp.grades || [];

    if(!courses.length){
      c.innerHTML = '<div class="empty"><div class="ic">📊</div><p>لا توجد مواد بعد</p>' +
        '<p class="sub">أضف موادك من تبويب "الخطة" ثم عبّي علاماتك هنا</p></div>';
      return;
    }

    /* Auto-create missing grade entries */
    var changed = false;
    courses.forEach(function(course){
      if(!grades.find(function(g){ return g.name === course.name; })){
        grades.push({ name: course.name, items: [] });
        changed = true;
      }
    });
    sp.grades = grades;
    if(changed) save();

    var html = '';
    courses.forEach(function(course){
      var g = grades.find(function(x){ return x.name === course.name; });
      if(!g) return;
      var total = 0, earned = 0;
      (g.items || []).forEach(function(it){
        total += parseFloat(it.weight) || 0;
        earned += parseFloat(it.score) || 0;
      });
      var pct = total > 0 ? (earned / total * 100) : 0;
      var color = pct >= 85 ? 'var(--green)' : pct >= 70 ? 'var(--cyan)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

      var itemsHtml = '';
      if(!g.items || !g.items.length){
        itemsHtml = '<div style="text-align:center;padding:14px;font-size:.78rem;color:var(--muted2)">' +
          'ما في علامات — اضغط "+ علامة" للبدء</div>';
      } else {
        (g.items || []).forEach(function(it, i){
          itemsHtml += '<div class="gt-item-row">' +
            '<span style="flex:1">' + esc(it.name) + '</span>' +
            '<span style="color:var(--muted)">' + it.score + '/' + it.weight + '</span>' +
            '<button class="btn btn-sm btn-danger" data-gt-del="' + esc(course.name) + '|' + i + '" style="padding:2px 6px;font-size:.7rem">✕</button>' +
          '</div>';
        });
      }

      html += '<div class="card gt-card" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:.98rem">' + esc(course.name) + '</div>' +
            '<div style="font-size:.72rem;color:var(--muted)">' +
              (course.code ? 'كود: ' + esc(course.code) + ' · ' : '') +
              'مجموع: ' + total + '%' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<div style="text-align:center">' +
              '<div style="font-size:1.4rem;font-weight:800;color:' + color + '">' + pct.toFixed(1) + '%</div>' +
              '<div style="font-size:.65rem;color:var(--muted)">حتى الآن</div>' +
            '</div>' +
            '<button class="unified-course-btn added" data-course-name="' + esc(course.name) + '">🗑</button>' +
          '</div>' +
        '</div>' +
        itemsHtml +
        '<div style="display:flex;gap:6px;margin-top:10px">' +
          '<button class="btn btn-sm" data-gt-add="' + esc(course.name) + '">+ علامة</button>' +
        '</div>' +
      '</div>';
    });
    c.innerHTML = html;

    /* Wire unified buttons */
    c.querySelectorAll('.unified-course-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var name = btn.dataset.courseName;
        window.confirmRemoveCourse(name);
      });
    });

    /* Add grade item */
    c.querySelectorAll('[data-gt-add]').forEach(function(b){
      b.addEventListener('click', function(){
        var courseName = b.dataset.gtAdd;
        var g = grades.find(function(x){ return x.name === courseName; });
        if(!g) return;
        window.showModal('علامة في ' + courseName, [
          {key:'name', label:'اسم التقييم (مثل: امتحان 1)'},
          {key:'score', label:'العلامة', type:'number'},
          {key:'weight', label:'من (الوزن)', type:'number'}
        ], {name:'', score:0, weight:10}, function(data){
          if(!data.name){ toast('أدخل اسمًا', 'warn'); return false; }
          var score = parseFloat(data.score) || 0;
          var weight = parseFloat(data.weight) || 0;
          if(score > weight){ toast('⚠️ العلامة أكبر من الوزن', 'warn', 2500); return false; }
          g.items.push({ name: data.name, score: score, weight: weight });
          save();
          window.renderGradeCalc();
          return true;
        });
      });
    });

    /* Delete grade item */
    c.querySelectorAll('[data-gt-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var parts = b.dataset.gtDel.split('|');
        var courseName = parts[0];
        var idx = parseInt(parts[1], 10);
        var g = grades.find(function(x){ return x.name === courseName; });
        if(!g) return;
        g.items.splice(idx, 1);
        save();
        window.renderGradeCalc();
      });
    });
  };

  /* ============================================================
     OVERRIDE: renderCourses (unified button)
     ============================================================ */
  window.renderCourses = function(){
    var g = document.getElementById('myCoursesGrid'); if(!g) return;
    var sp = space();
    if(!(sp.courses || []).length){
      g.innerHTML = '<div class="empty" style="grid-column:1/-1">' +
        '<div class="ic">📚</div><p>لا توجد مواد بعد</p>' +
        '<p class="sub">أضف من تبويب "الخطة" بضغطة واحدة</p></div>';
      return;
    }
    /* ملخص سريع لكل مادة (حضور/علامة/مهام) — كل شريحة تفتح التاب المناسب */
    function courseQuickChips(sp, c){
      var a = (sp.attendance || {})[c.name], tot = a ? (a.present || 0) + (a.absent || 0) : 0;
      var ap = tot ? Math.round((a.present || 0) / tot * 100) : null;
      var ac = ap === null ? 'var(--muted)' : ap >= 85 ? 'var(--green)' : ap >= 75 ? 'var(--amber)' : 'var(--red)';
      var g = (sp.grades || []).filter(function(x){ return x.name === c.name; })[0], gt = 0, ge = 0;
      ((g && g.items) || []).forEach(function(it){ gt += parseFloat(it.weight) || 0; ge += parseFloat(it.score) || 0; });
      var gp = gt > 0 ? Math.round(ge / gt * 100) : null;
      var pend = (sp.tasks || []).filter(function(t){ return t.course === c.name && !t.done; }).length;
      function chip(tab, text, color, title){
        return '<button type="button" class="badge" data-goto-tab="' + tab + '" title="' + title + '" style="cursor:pointer;border:none;font-family:inherit;color:' + color + '">' + text + '</button>';
      }
      return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
        chip('attendance', '✅ ' + (ap === null ? '—' : ap + '%'), ac, 'الحضور') +
        chip('gradecalc', '📊 ' + (gp === null ? '—' : gp + '%'), 'var(--cyan)', 'العلامات') +
        chip('tasks', '📝 ' + pend, pend ? 'var(--amber)' : 'var(--muted)', 'المهام المتبقية') +
        '</div>';
    }

    var html = '';
    sp.courses.forEach(function(c){
      html += '<div class="card" data-course-card="' + c.id + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:10px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:.98rem">' + esc(c.name) + '</div>' +
            (c.code ? '<div style="font-size:.7rem;color:var(--muted2);font-family:monospace">' + esc(c.code) + '</div>' : '') +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center;flex-shrink:0">' +
            '<button type="button" class="btn btn-sm btn-ghost" data-edit-course="' + esc(c.id) + '" title="تعديل المادة" style="padding:6px 9px">✏️</button>' +
            '<button class="unified-course-btn added" data-course-name="' + esc(c.name) + '">🗑</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
          '<span class="badge">' + (c.hours || 3) + ' ساعات</span>' +
          (c.room ? '<span class="badge">📍 ' + esc(c.room) + '</span>' : '') +
          (c.instructor ? '<span class="badge">👤 ' + esc(c.instructor) + '</span>' : '') +
        '</div>' +
        courseQuickChips(sp, c) +
        '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span style="font-size:.78rem;font-weight:700;color:var(--muted)">📎 ملفات المادة</span>' +
            '<span style="font-size:.68rem;color:var(--muted2)" data-files-count="' + c.id + '">—</span>' +
          '</div>' +
          '<div class="course-files-list" data-files-list="' + c.id + '">' +
            '<div style="text-align:center;padding:10px;font-size:.75rem;color:var(--muted2)">جاري التحميل...</div>' +
          '</div>' +
          '<button class="upload-course-btn" data-upload-course="' + c.id + '">📤 رفع ملف</button>' +
          '<input type="file" style="display:none" data-file-input="' + c.id + '">' +
          '<div class="upload-progress-bar" data-upload-progress="' + c.id + '"><div class="inner"></div></div>' +
        '</div>' +
      '</div>';
    });
    g.innerHTML = html;

    g.querySelectorAll('.unified-course-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var name = btn.dataset.courseName;
        window.confirmRemoveCourse(name);
      });
    });

    g.querySelectorAll('[data-goto-tab]').forEach(function(b){
      b.addEventListener('click', function(e){ e.stopPropagation(); if(window.switchTab) window.switchTab(b.dataset.gotoTab); });
    });
    g.querySelectorAll('[data-edit-course]').forEach(function(b){
      b.addEventListener('click', function(e){ e.stopPropagation(); window.editCourseDialog(b.dataset.editCourse); });
    });

    g.querySelectorAll('[data-upload-course]').forEach(function(b){
      b.addEventListener('click', function(){
        var inp = g.querySelector('[data-file-input="' + b.dataset.uploadCourse + '"]');
        if(inp) inp.click();
      });
    });
    g.querySelectorAll('[data-file-input]').forEach(function(inp){
      inp.addEventListener('change', function(e){
        var f = e.target.files[0]; if(!f) return;
        window.handleCourseFileUpload(inp.dataset.fileInput, f);
        inp.value = '';
      });
    });

    /* ملفات المادة تُحمَّل عند ظهور الكرت فقط (بدل طلب لكل المواد دفعة واحدة وهي مخفية) */
    var loadFiles = function(id){ if(window.loadCourseFilesForCard) window.loadCourseFilesForCard(id); };
    if(window._cfObserver){ window._cfObserver.disconnect(); window._cfObserver = null; }
    if(window.IntersectionObserver){
      window._cfObserver = new IntersectionObserver(function(entries, obs){
        entries.forEach(function(en){
          if(!en.isIntersecting) return;
          obs.unobserve(en.target);
          loadFiles(en.target.getAttribute('data-course-card'));
        });
      }, { rootMargin: '200px' });
      g.querySelectorAll('[data-course-card]').forEach(function(card){ window._cfObserver.observe(card); });
    } else {
      sp.courses.forEach(function(c){ loadFiles(c.id); });
    }
  };

  /* ============================================================
     OVERRIDE: renderExams — grouped by course
     ============================================================ */
  /* القادمة أولاً بترتيب الموعد (التاريخ ثم الوقت)، ثم المنتهية (الأحدث أولاً) */
  function sortExams(list){
    var du = window.daysUntil || function(){ return 0; };
    var up = list.filter(function(e){ var d = du(e.date); return d === null || d >= 0; });
    var past = list.filter(function(e){ var d = du(e.date); return d !== null && d < 0; });
    up.sort(function(a, b){ return ((a.date || '') + ' ' + (a.time || '')).localeCompare((b.date || '') + ' ' + (b.time || '')); });
    past.sort(function(a, b){ return (b.date || '').localeCompare(a.date || ''); });
    return up.concat(past);
  }
  function examCard(e, showCourse){
    var r = window.examRemaining ? window.examRemaining(e) : { big: '', label: '', past: false, urgent: false };
    return '<div class="exam-card' + (r.past ? ' past' : '') + '" style="margin-bottom:6px">' +
      '<div class="exam-info">' +
        '<div class="title">📝 ' + esc(e.name) + '</div>' +
        '<div class="meta">' +
          (showCourse && e.course ? '📚 ' + esc(e.course) + ' · ' : '') +
          '📅 <bdi dir="ltr">' + esc(e.date) + '</bdi>' +
          (e.time ? ' · ⏰ <bdi dir="ltr">' + esc(e.time) + '</bdi>' : '') +
          (e.room ? ' · 📍 ' + esc(e.room) : '') +
        '</div>' +
      '</div>' +
      '<div class="exam-countdown ' + (r.urgent ? 'urgent' : '') + '" role="status" aria-label="' + esc(r.past ? 'انتهى الامتحان' : 'المتبقي ' + r.label) + '">' +
        esc(r.big) + '<div class="lbl">' + (r.past ? '' : (r.today ? 'اليوم' : 'متبقي')) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:4px">' +
        '<button type="button" class="btn btn-sm btn-ghost" data-edit-exam="' + e.id + '" aria-label="تعديل الامتحان">✏️</button>' +
        '<button type="button" class="btn btn-sm btn-danger" data-del-exam="' + e.id + '" aria-label="حذف الامتحان">🗑</button>' +
      '</div>' +
    '</div>';
  }
  window.renderExams = function(){
    var c = document.getElementById('examsList'); if(!c) return;
    var sp = space();
    var courses = sp.courses || [];
    var exams = sp.exams || [];

    if(!courses.length && !exams.length){
      c.innerHTML = '<div class="empty"><div class="ic">⏳</div><p>لا توجد مواد بعد</p>' +
        '<p class="sub">أضف موادك أولاً من تبويب "الخطة"</p></div>';
      return;
    }

    var html = '';

    /* Group exams by course */
    var examsByCourse = {};
    var orphanExams = [];
    var courseNames = {}; courses.forEach(function(cc){ courseNames[cc.name] = true; });
    exams.forEach(function(e){
      /* امتحان مادته غير موجودة بقائمة موادي (محذوفة/معاد تسميتها) يظهر ضمن «بدون مادة» بدل أن يختفي */
      if(e.course && courseNames[e.course]){
        if(!examsByCourse[e.course]) examsByCourse[e.course] = [];
        examsByCourse[e.course].push(e);
      } else {
        orphanExams.push(e);
      }
    });

    /* Show each course with its exams */
    courses.forEach(function(course){
      var courseExams = examsByCourse[course.name] || [];
      var total = courseExams.length;

      html += '<div class="card" style="margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:.98rem">📚 ' + esc(course.name) + '</div>' +
            '<div style="font-size:.72rem;color:var(--muted)">' +
              (total ? total + ' امتحان مسجل' : 'ما في امتحانات مسجلة بعد') +
            '</div>' +
          '</div>' +
          '<button class="btn btn-sm" data-add-exam="' + esc(course.name) + '">+ امتحان</button>' +
        '</div>';

      if(courseExams.length){
        sortExams(courseExams).forEach(function(e){ html += examCard(e); });
      } else {
        html += '<div style="text-align:center;padding:14px;font-size:.78rem;color:var(--muted2)">' +
          'ما في امتحانات — اضغط "+ امتحان" لإضافة</div>';
      }

      html += '</div>';
    });

    /* Orphan exams (without course) */
    if(orphanExams.length){
      html += '<div class="card" style="margin-bottom:12px">' +
        '<div style="font-weight:700;font-size:.95rem;margin-bottom:10px">📋 امتحانات بدون مادة</div>';
      sortExams(orphanExams).forEach(function(e){ html += examCard(e, true); });
      html += '</div>';
    }

    c.innerHTML = html;

    c.querySelectorAll('[data-add-exam]').forEach(function(b){
      b.addEventListener('click', function(){ window.addExamForCourse(b.dataset.addExam); });
    });
    c.querySelectorAll('[data-edit-exam]').forEach(function(b){
      b.addEventListener('click', function(){ window.editExam(b.dataset.editExam); });
    });
    c.querySelectorAll('[data-del-exam]').forEach(function(b){
      b.addEventListener('click', function(){ window.deleteExam(b.dataset.delExam); });
    });
  };

  window.addExamForCourse = function(courseName){
    window.showModal('إضافة امتحان — ' + courseName, [
      {key:'name', label:'اسم الامتحان'},
      {key:'date', label:'التاريخ', type:'date'},
      {key:'time', label:'الوقت'},
      {key:'room', label:'القاعة'}
    ], {name:'', date:'', time:'', room:''}, function(data){
      if(!data.name || !data.date){ toast('أدخل الاسم والتاريخ', 'warn'); return false; }
      if(!space().exams) window.space.exams = [];
      window.space.exams.push({
        id: window.uid ? window.uid() : Date.now().toString(36),
        name: data.name,
        course: courseName,
        date: data.date,
        time: data.time || '',
        room: data.room || ''
      });
      save();
      window.renderExams();
      toast('✅ أُضيف الامتحان', 'success', 1800);
      return true;
    });
  };

  /* ============================================================
     OVERRIDE: renderPlan — unified buttons built-in
     ============================================================ */
  window.renderPlan = function(){
    var c = document.getElementById('semesters'); if(!c) return;
    var openSems = window.S.get('openSems', [0]);
    if(!Array.isArray(openSems)) openSems = [0];
    var SEMESTERS = window.SEMESTERS || [];

    c.innerHTML = '';
    SEMESTERS.forEach(function(s, i){
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.year = s.year;
      el.style.marginBottom = '12px';

      var total = s.courses.reduce(function(a, x){ return a + x.h; }, 0);

      /* Build rows with buttons built-in */
      var coursesHtml = '';
      s.courses.forEach(function(x){
        /* Resolve course data from DB (by code) for accurate name/hours */
        var found = null;
        if(x.code && x.code !== '—' && window.findCourseByCode){
          found = window.findCourseByCode(x.code);
        }
        var cName   = found && found.name ? found.name : x.n;
        var cCode   = (found && found.info && found.info.code) ? found.info.code : (x.code || '');
        var cHours  = (found && found.info && found.info.h) ? found.info.h : (x.h || 3);
        var added   = isCourseAdded(cName);

        coursesHtml +=
          '<div class="plan-course-row" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--border);font-size:.86rem">' +
            '<button type="button" class="unified-course-btn ' + (added ? 'added' : 'not-added') + '" ' +
              'data-course-name="' + esc(cName) + '" ' +
              'data-code="' + esc(cCode) + '" ' +
              'data-hours="' + cHours + '" ' +
              'title="' + (added ? 'حذف من كل الأماكن' : 'إضافة إلى موادي') + '">' +
              (added ? '🗑' : '+') +
            '</button>' +
            '<div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
              '<span>' + esc(x.n) + '</span>' +
              (x.code && x.code !== '—'
                ? '<span style="font-size:.7rem;color:var(--muted2);font-family:monospace">' + esc(x.code) + '</span>'
                : '') +
              (x.type === 'lab'
                ? '<span style="font-size:.66rem;padding:1px 7px;border-radius:5px;background:rgba(52,211,153,.15);color:var(--green)">مختبر</span>'
                : '') +
            '</div>' +
            '<span style="color:var(--cyan);font-weight:700;font-size:.8rem;white-space:nowrap;flex-shrink:0">' + x.h + ' س</span>' +
          '</div>';
      });

      el.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" class="sem-head">' +
          '<div style="display:flex;align-items:center;gap:12px">' +
            '<span style="background:var(--grad);color:var(--on-accent);padding:3px 10px;border-radius:20px;font-size:.7rem;font-weight:800">سنة ' + s.year + '</span>' +
            '<h3 style="margin:0">' + esc(s.name) + '</h3>' +
          '</div>' +
          '<div style="display:flex;gap:10px;align-items:center;font-size:.78rem;color:var(--muted)">' +
            '<span style="background:var(--bg2);padding:3px 10px;border-radius:8px;color:var(--cyan)">' + total + ' ساعة</span>' +
            '<span class="arrow">▼</span>' +
          '</div>' +
        '</div>' +
        '<div class="sem-body" style="max-height:0;overflow:hidden;transition:.4s">' + coursesHtml + '</div>';

      /* Collapse/expand */
      var head  = el.querySelector('.sem-head');
      var body  = el.querySelector('.sem-body');
      var arrow = el.querySelector('.arrow');

      if(openSems.indexOf(i) > -1){
        body.style.maxHeight = '2000px';
        arrow.style.transform = 'rotate(180deg)';
      }
      head.addEventListener('click', function(e){
        /* Ignore clicks on buttons inside head (not present but safe) */
        if(e.target.closest('.unified-course-btn')) return;
        var isOpen = body.style.maxHeight && body.style.maxHeight !== '0px';
        body.style.maxHeight = isOpen ? '0px' : '2000px';
        arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
        var arr = window.S.get('openSems', []);
        if(!Array.isArray(arr)) arr = [];
        if(!isOpen){ if(arr.indexOf(i) === -1) arr.push(i); }
        else { var p = arr.indexOf(i); if(p > -1) arr.splice(p, 1); }
        window.S.set('openSems', arr);
      });

      /* Wire buttons */
      el.querySelectorAll('.unified-course-btn').forEach(function(btn){
        btn.addEventListener('click', function(e){
          e.stopPropagation();
          e.preventDefault();
          var name  = btn.dataset.courseName;
          var code  = btn.dataset.code;
          var hours = parseInt(btn.dataset.hours, 10) || 3;
          if(isCourseAdded(name)){
            window.confirmRemoveCourse(name);
          } else {
            window.addCourseEverywhere(name, code, hours);
          }
        });
      });

      c.appendChild(el);
    });
  };

  /* ============================================================
     INIT
     ============================================================ */
  function init(){
    injectCSS();

    /* Re-run on tab switch */
    if(window.switchTab && !window._courseSyncTabPatched){
      var orig = window.switchTab;
      window.switchTab = function(tab){
        var r = orig.apply(this, arguments);
        /* switchTab يرسم التاب الحالي بنفسه — لا حاجة لإعادة رسم كل الأقسام (7 renders)؛ نكتفي بتحديث أزرار +/🗑 */
        setTimeout(function(){
          if(tab === 'courses' || tab === 'attendance' || tab === 'gradecalc' || tab === 'exams' || tab === 'plan'){
            refreshAllUnifiedButtons();
          }
        }, 150);
        return r;
      };
      window._courseSyncTabPatched = true;
    }

    /* Auto-sync on any space change */
    if(window.S && window.S.set && !window.S._courseSyncWrapped){
      var origSet = window.S.set;
      window.S.set = function(k, v){
        var r = origSet.apply(this, arguments);
        if(k === 'space'){
          clearTimeout(window._courseSyncTimer);
          window._courseSyncTimer = setTimeout(function(){
            refreshAllUnifiedButtons();
          }, 200);
        }
        return r;
      };
      window.S._courseSyncWrapped = true;
    }

    console.log('🔄 course-sync.js loaded — unified course management');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();


})();