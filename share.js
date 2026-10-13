/* ============================================================
   🖼️ share.js — مشاركة الجدول الأسبوعي كصورة PNG (زر «🖼️ مشاركة كصورة» بصفحة الجدول)
   - الرسم بـcanvas محلياً (بدون مكتبات/شبكة)؛ يقرأ الجدول من Schedule.entries() ولا يكتب شيئاً.
   - المشاركة: navigator.share للملف إن توفّر (موبايل)، وإلا تنزيل PNG (بتطبيق أندرويد native-bridge يحوّل التنزيل لمشاركة/حفظ).
   - layout() دالة نقية تُختبر بدون canvas.
   ============================================================ */
(function(){
  'use strict';
  if(window.ShareTT) return;
  var COL_W = 210, ROW_H = 72, HEAD_H = 118, TIME_W = 74, PAD = 28, FOOT_H = 56;

  function DA(){ return window.DAYS_AR || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; }
  function hue(name){ var h = 0, s = String(name); for(var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function hm(m){ return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(Math.round(m % 60)).padStart(2, '0'); }

  /* entries: [{dayIdx,start,end,name,room,building}] ← بالدقائق. RTL: الأحد أقصى اليمين */
  function layout(entries){
    entries = (entries || []).filter(function(e){ return e && e.name && e.end > e.start; });
    if(!entries.length) return null;
    var days = []; entries.forEach(function(e){ if(days.indexOf(e.dayIdx) < 0) days.push(e.dayIdx); }); days.sort(function(a, b){ return a - b; });
    var minS = Math.min.apply(null, entries.map(function(e){ return e.start; })), maxE = Math.max.apply(null, entries.map(function(e){ return e.end; }));
    var h0 = Math.max(6, Math.floor(minS / 60)), h1 = Math.min(23, Math.ceil(maxE / 60));
    if(h1 <= h0) h1 = h0 + 1;
    var W = PAD * 2 + TIME_W + days.length * COL_W, H = HEAD_H + (h1 - h0) * ROW_H + FOOT_H;
    function colX(i){ return W - PAD - TIME_W - (i + 1) * COL_W; }          /* العمود 0 (أبكر يوم) يميناً */
    var out = { w: W, h: H, h0: h0, h1: h1, days: days.map(function(d, i){ return { dayIdx: d, name: DA()[d], x: colX(i), w: COL_W }; }),
      hours: [], blocks: [] };
    for(var hr = h0; hr <= h1; hr++) out.hours.push({ h: hr, y: HEAD_H + (hr - h0) * ROW_H });
    entries.forEach(function(e){
      var i = days.indexOf(e.dayIdx), y = HEAD_H + (e.start - h0 * 60) / 60 * ROW_H, hh = (e.end - e.start) / 60 * ROW_H;
      out.blocks.push({ x: colX(i) + 4, y: y + 2, w: COL_W - 8, h: Math.max(30, hh - 4), name: e.name, place: (e.building ? e.building + (e.room ? ' · ' : '') : '') + (e.room || ''), time: hm(e.start) + ' – ' + hm(e.end), hue: hue(e.name) });
    });
    return out;
  }

  function wrap(ctx, text, maxW, maxLines){
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function(w){ var t = cur ? cur + ' ' + w : w; if(ctx.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; });
    if(cur) lines.push(cur);
    if(lines.length > maxLines){ lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return lines;
  }
  function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function draw(L, title){
    var cv = document.createElement('canvas'), k = 2; cv.width = L.w * k; cv.height = L.h * k;
    var c = cv.getContext('2d'); if(!c) return null;
    c.scale(k, k); c.direction = 'rtl'; c.textBaseline = 'middle';
    var F = '"Tajawal","Segoe UI",Tahoma,sans-serif';
    c.fillStyle = '#f4f6fb'; c.fillRect(0, 0, L.w, L.h);
    c.fillStyle = '#0f2a5c'; rr(c, PAD, 20, L.w - PAD * 2, 72, 20); c.fill();
    c.fillStyle = '#ffffff'; c.textAlign = 'right'; c.font = '800 28px ' + F; c.fillText(title, L.w - PAD - 24, 56);
    c.textAlign = 'left'; c.font = '500 15px ' + F; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText('مساحتي الدراسية', PAD + 24, 56);
    c.fillStyle = '#ffffff'; rr(c, PAD, HEAD_H - 38, L.w - PAD * 2, L.h - HEAD_H - FOOT_H + 38 + 6, 16); c.fill();
    c.strokeStyle = '#e3e8f2'; c.lineWidth = 1;
    L.hours.forEach(function(r){ c.beginPath(); c.moveTo(PAD + 6, r.y); c.lineTo(L.w - PAD - 6, r.y); c.stroke(); c.fillStyle = '#5a6785'; c.textAlign = 'center'; c.font = '600 14px ' + F; c.fillText(String(r.h).padStart(2, '0') + ':00', L.w - PAD - TIME_W / 2, r.y); });
    L.days.forEach(function(d){ c.fillStyle = '#0f1b33'; c.textAlign = 'center'; c.font = '800 17px ' + F; c.fillText(d.name, d.x + d.w / 2, HEAD_H - 16); });
    L.blocks.forEach(function(b){
      c.fillStyle = 'hsl(' + b.hue + ',70%,92%)'; rr(c, b.x, b.y, b.w, b.h, 12); c.fill();
      c.fillStyle = 'hsl(' + b.hue + ',60%,42%)'; c.fillRect(b.x + b.w - 5, b.y + 6, 5, b.h - 12);
      c.fillStyle = '#0f1b33'; c.textAlign = 'right'; c.font = '800 15px ' + F;
      var lines = wrap(c, b.name, b.w - 26, b.h > 60 ? 2 : 1), y = b.y + 18;
      lines.forEach(function(t){ c.fillText(t, b.x + b.w - 16, y); y += 19; });
      c.font = '500 12.5px ' + F; c.fillStyle = '#4f5d7a';
      if(b.h > 52 && y < b.y + b.h - 8){ c.fillText(b.place || b.time, b.x + b.w - 16, y + 2); y += 17; }
      if(b.h > 76 && b.place && y < b.y + b.h - 6) c.fillText(b.time, b.x + b.w - 16, y + 2);
    });
    c.textAlign = 'center'; c.fillStyle = '#5a6785'; c.font = '500 13px ' + F; c.fillText('m08ij.github.io/my-study-space', L.w / 2, L.h - 24);
    return cv;
  }

  function entries(){ return window.Schedule && window.Schedule.entries ? window.Schedule.entries() : []; }
  function toast(m, t){ if(window.toast) window.toast(m, t || 'info', 2500); }

  function share(){
    var L = layout(entries());
    if(!L){ toast('أضف محاضرات للجدول أول', 'warn'); return false; }
    var name = (window.space && window.space.profile && window.space.profile.name) || '';
    var title = 'جدولي الأسبوعي' + (name ? ' — ' + name : '');
    var ready = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('800 20px Tajawal'), document.fonts.load('500 14px Tajawal')]).catch(function(){}) : Promise.resolve();
    ready.then(function(){
      var cv = draw(L, title); if(!cv){ toast('المتصفح ما بدعم رسم الصورة', 'error'); return; }
      cv.toBlob(function(blob){
        if(!blob){ toast('تعذّر إنشاء الصورة', 'error'); return; }
        var file = null; try{ file = new File([blob], 'جدولي-الأسبوعي.png', { type: 'image/png' }); }catch(e){}
        if(file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share){
          navigator.share({ files: [file], title: title }).catch(function(){});
        } else {
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'جدولي-الأسبوعي.png'; document.body.appendChild(a); a.click();
          setTimeout(function(){ a.remove(); URL.revokeObjectURL(a.href); }, 1500); toast('🖼️ نُزّلت صورة الجدول', 'success');
        }
      }, 'image/png');
    });
    return true;
  }
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('#btnShareTt'); if(b){ e.preventDefault(); share(); } });

  window.ShareTT = { layout: layout, share: share, hue: hue, render: function(title){ var L = layout(entries()); return L ? draw(L, title || 'جدولي الأسبوعي') : null; } };
})();
