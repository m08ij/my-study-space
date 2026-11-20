/* ============================================================
   widgets.js — منطق «حضرت» المشترك (الواجهة الجديدة + ودجت أندرويد)
   (الشريط الجانبي «الأدوات السريعة» وشاشة التركيز القديمة ومواقيت الصلاة الجانبية انحذفوا بإصدار 158 — الواجهة الجديدة focus.js فيها بدائلهم)
   ============================================================ */
(function(){
  'use strict';
  function toast(msg, type){ if(typeof window.toast === 'function') window.toast(msg, type || 'info', 2200); }

  var ATT_KEY = 'ss_att_applied';   /* نفس مفتاح تطبيق الحضور القادم من ودجات أندرويد (name|startMs) فلا يتكرر التسجيل */
  function attKeys(){ try{ return JSON.parse(localStorage.getItem(ATT_KEY) || '[]'); }catch(e){ return []; } }
  function attAdd(k){ var a = attKeys(); if(a.indexOf(k) < 0){ a.push(k); try{ localStorage.setItem(ATT_KEY, JSON.stringify(a.slice(-120))); }catch(e){} } }
  function lecStartMs(e){ var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime() + e.start * 60000; }
  function placeOf(e){
    var CM = window.CampusMap, r = CM && CM.resolve ? CM.resolve(e) : null, room = String(e.room || '').trim();
    if(r && r.b && r.b.ab) room = room.split(r.b.ab).join('');
    room = room.replace(/^[\s\-–·:]*(قاعة|قاعه|room)\s*/i, '').replace(/[()]/g, '').trim();
    if(/^[A-Za-z]?\d+[A-Za-z]?$/.test(room)) room = 'قاعة ' + room;
    var b = r && r.b ? r.b.n + (r.fl ? ' · ط' + r.fl : '') : (e.building || '');
    return { text: [room, b].filter(Boolean).join(' · '), bid: r && r.b ? r.b.id : '' };
  }
  /* نفس نافذة زر «حضرت» بالودجت: الجارية، أو اللي تبدأ خلال 20 د، أو انتهت قبل <30 د */
  function attendTarget(st){
    if(st.current) return st.current;
    if(st.next && st.next.start - st.nowMin <= 20) return st.next;
    var last = null; (st.today || []).forEach(function(e){ if(e.state === 'done' && st.nowMin - e.end <= 30 && (!last || e.end > last.end)) last = e; });
    return last;
  }
  function markPresent(name, key){
    if(attKeys().indexOf(key) > -1) return false;
    attAdd(key); if(typeof window.markAttendance === 'function') window.markAttendance(name, 'present');
    toast('✅ سُجّل حضورك: ' + name, 'success'); return true;
  }
  window.TodayLogic = { attendTarget: attendTarget, attKeys: attKeys, lecStartMs: lecStartMs, placeOf: placeOf, markPresent: markPresent };
})();
