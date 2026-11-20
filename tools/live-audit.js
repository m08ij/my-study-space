/* فحص حيّ داخل المتصفح (لا يُنشر): تباين النصوص الفعلي بكل تاب وكل ثيم + أخطاء الـConsole.
   الاستعمال بالمتصفح (مثلاً الصفحة محلية http://127.0.0.1:8765): await (await fetch('/tools/live-audit.js')).text() ثم eval ثم await LiveAudit.run().
   يوقف الانتقالات والحركات أثناء القياس (وإلا تُقاس ألوان منتصف انتقال الثيم فتظهر أخطاء وهمية). التدرجات اللونية تُتخطّى (لون خلفيتها غير معروف). */
(function(){
  var SECS = ['dashboard','timetable','courses','tasks','exams','attendance','timer','flashcards','budget','notes','gradecalc','plan','hulinks'];
  var errs = [];
  window.addEventListener('error', function(e){ errs.push('err: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', function(e){ errs.push('rej: ' + (e.reason && e.reason.message || e.reason)); });
  function parse(c){ var m = /rgba?\(([^)]+)\)/.exec(c); if(!m) return null; var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; }
  function over(t, b){ var a = t.a; return { r: t.r * a + b.r * (1 - a), g: t.g * a + b.g * (1 - a), b: t.b * a + b.b * (1 - a), a: 1 }; }
  function lum(c){ function f(v){ v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); } return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function ratio(a, b){ var l1 = lum(a), l2 = lum(b); if(l1 < l2){ var t = l1; l1 = l2; l2 = t; } return (l1 + 0.05) / (l2 + 0.05); }
  function effBg(el){
    var stack = [], n = el, grad = false;
    while(n && n.nodeType === 1){
      var cs = getComputedStyle(n), bg = parse(cs.backgroundColor);
      if(cs.backgroundImage && /gradient/.test(cs.backgroundImage)) grad = true;
      if(bg && bg.a > 0){ stack.push(bg); if(bg.a >= 1) break; }
      n = n.parentElement;
    }
    var base = parse(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
    var cur = stack.length && stack[stack.length - 1].a >= 1 ? stack.pop() : (base.a < 1 ? { r: 11, g: 15, b: 26, a: 1 } : base);
    while(stack.length) cur = over(stack.pop(), cur);
    return { c: cur, grad: grad };
  }
  function audit(sec){
    var root = document.getElementById(sec), out = {}, n = 0, els = root.querySelectorAll('*');
    for(var i = 0; i < els.length; i++){
      var el = els[i];
      if(el.closest('[hidden]') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      var r = el.getBoundingClientRect(); if(r.width < 2 || r.height < 2) continue;
      var own = ''; for(var k = 0; k < el.childNodes.length; k++) if(el.childNodes[k].nodeType === 3) own += el.childNodes[k].textContent;
      own = own.trim(); if(own.length < 2 || !/[؀-ۿa-zA-Z0-9]/.test(own)) continue;     /* إيموجي فقط: لون الحرف لا يعني شيئاً */
      var cs = getComputedStyle(el); if(cs.visibility === 'hidden' || cs.display === 'none') continue;
      var op = 1, pp = el; while(pp && pp.nodeType === 1){ op *= parseFloat(getComputedStyle(pp).opacity); pp = pp.parentElement; } if(op < 0.3) continue;
      var fg = parse(cs.color); if(!fg) continue;
      var bgi = effBg(el); if(bgi.grad) continue;
      var ra = ratio(over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * op }, bgi.c), bgi.c);
      var fs = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700, need = (fs >= 24 || (fs >= 18.66 && bold)) ? 3 : 4.5;
      if(ra < need){
        n++; var key = el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(' ').slice(0, 2).join('.') : '');
        out[key] = out[key] || { n: 0, min: 99, ex: own.slice(0, 24) }; out[key].n++; if(ra < out[key].min) out[key].min = +ra.toFixed(2);
      }
    }
    return { total: n, top: Object.keys(out).map(function(k){ return { k: k, n: out[k].n, min: out[k].min, ex: out[k].ex }; }) };
  }
  async function run(themes){
    var st = document.createElement('style'); st.id = '__noanim'; st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}'; document.head.appendChild(st);
    var orig = (document.documentElement.getAttribute('data-theme') || 'dark'), per = {}, rows = [];
    themes = themes || window.THEMES.map(function(t){ return t.id; });
    for(var t = 0; t < themes.length; t++){
      window.applyTheme(themes[t], false); await new Promise(function(r){ setTimeout(r, 120); }); var tot = 0;
      for(var s = 0; s < SECS.length; s++){
        window.switchTab(SECS[s], false); await new Promise(function(r){ setTimeout(r, 90); });
        var a = audit(SECS[s]); tot += a.total; a.top.forEach(function(x){ rows.push({ theme: themes[t], sec: SECS[s], min: x.min, n: x.n, k: x.k, ex: x.ex }); });
      }
      per[themes[t]] = tot;
    }
    window.applyTheme(orig, false); st.remove();
    rows.sort(function(a, b){ return a.min - b.min; });
    return { perTheme: per, worst: rows.slice(0, 15).map(function(r){ return r.min + ' [' + r.theme + '/' + r.sec + '] ' + r.k + ' ×' + r.n + ' «' + r.ex + '»'; }), errs: errs };
  }
  window.LiveAudit = { run: run, audit: audit, errors: errs };
})();
