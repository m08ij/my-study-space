/* ============================================================
   🧪 tests.js v4 — اختبارات أساسية سريعة
   ============================================================ */
(function(){
  'use strict';
  var results = [], pass = 0, fail = 0;

  function assert(name, cond, detail){
    results.push({ok: !!cond, name: name, detail: detail || ''});
    if(cond) pass++; else fail++;
    console.log((cond ? '✅ ' : '❌ ') + name, detail || '');
  }

  window.testAll = function(){
    console.clear();
    console.log('%c🧪 اختبار شامل', 'color:#a78bfa;font-weight:bold;font-size:16px');
    results = []; pass = 0; fail = 0;

    /* Globals */
    assert('space موجود', window.space !== null && typeof window.space === 'object');
    assert('S موجودة', typeof window.S === 'object');
    assert('SB موجود', typeof window.SB === 'object');
    assert('esc دالة', typeof window.esc === 'function');
    assert('uid دالة', typeof window.uid === 'function');
    assert('today دالة', typeof window.today === 'function');

    /* Features */
    ['renderDashboard','renderTasks','renderExams','renderCourses',
     'renderBudget','renderNotes','renderGpa','renderGradeCalc',
     'renderAttendance','renderDecks','renderPlan','renderHuLinks',
     'addTask','addExam','addMyCourse','addBudgetItem','addNote',
     'toggleTimer','switchTab','switchSubTab'].forEach(function(fn){
      assert('window.' + fn + ' موجودة', typeof window[fn] === 'function');
    });

    /* Hub: يومي الجامعي + مركز المواد + لوحة الأوامر */
    assert('Schedule.status موجودة', !!window.Schedule && typeof window.Schedule.status === 'function');
    assert('Hub.openCourse موجودة', !!window.Hub && typeof window.Hub.openCourse === 'function');
    assert('لوحة الأوامر موجودة', typeof window.openCommandPalette === 'function' && !!window.HubUI);
    assert('يومي الجامعي يُرسم', typeof window.renderMyDay === 'function' && !!document.getElementById('myDay'));
    assert('DashLayout موجود', !!window.DashLayout && window.DashLayout.sections.length === 9);
    (function(){ var ks = Array.prototype.slice.call(document.querySelectorAll('#dashboard > [data-dsec]')).filter(function(e){ return !e.classList.contains('dash-hidden'); }); var last = ks[ks.length - 1]; var saved = null; try{ saved = localStorage.getItem('dash_layout'); }catch(e){} assert('اللوحة: آخر قسم هو التحليلات (ما لم يخصّص المستخدم)', !!saved || (last && last.getAttribute('data-dsec') === 'insights')); })();
    assert('لوحة التحكم: كل قسم له data-dsec', document.querySelectorAll('#dashboard > [data-dsec]').length === 9);
    try{
      var sst = window.Schedule.status(new Date(2026, 9, 3, 10, 30));
      assert('Schedule.status يرجّع بنية سليمة', Array.isArray(sst.today) && typeof sst.nowMin === 'number');
    }catch(e){ assert('Schedule.status يرجّع بنية سليمة', false, e.message); }

    /* AI */
    assert('aiRespond موجودة', typeof window.aiRespond === 'function');
    try{ var r = window.aiRespond('السلام عليكم'); assert('AI يرد على تحية', typeof r === 'string' && r.length > 5); }
    catch(e){ assert('AI يرد على تحية', false, e.message); }

    /* Data */
    assert('COURSES_DB محمّل', typeof window.COURSES_DB === 'object');
    assert('عدد المواد ≥ 100', Object.keys(window.COURSES_DB || {}).length >= 100);
    assert('SEMESTERS محمّل', Array.isArray(window.SEMESTERS));
    assert('GRADES محمّل', typeof window.GRADES === 'object');

    /* UTC check */
    var d = new Date();
    var expected = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    assert('today() محلي', window.today() === expected);

    /* GPA math */
    var g = { name: 'test', items: [{ score: 30, weight: 40 }] };
    var pct = window.computeGradePercentage ? window.computeGradePercentage(g) : null;
    assert('GPA 30/40 = 75%', pct === 75);

    /* Summary */
    var total = pass + fail;
    var pct2 = total ? Math.round((pass/total)*100) : 0;
    var color = fail === 0 ? '#34d399' : fail < 3 ? '#fbbf24' : '#f87171';
    console.log('%c📊 ' + pass + ' / ' + total + ' (' + pct2 + '%)',
      'color:' + color + ';font-weight:bold;font-size:14px');
    return { pass: pass, fail: fail, results: results };
  };

  window.testQuick = function(){ return window.testAll(); };

  console.log('🧪 tests.js v4 — اكتب testAll()');
})();