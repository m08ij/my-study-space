/* يحذف قواعد CSS لمحدّدات ميزات محذوفة فقط (آمن: لا يمسّ أي محدّد لا يطابق قائمة الحذف).
   الاستعمال: node tools/css-prune.js [--dry]  — يعدّل css/0*.css بمكانها. cd-* تُحذف فقط إن لم تُستعمل بأي JS/HTML حيّ (cd-list وأخواتها لوصف المواد). */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), dry = process.argv.includes('--dry');
const live = fs.readdirSync(root).filter(f => /\.(js|html)$/.test(f) && !/^vendor-|^app\.bundle/.test(f)).map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const GONE = [/\.td-/, /\.gap-(card|list|item|ic|tx|est)/, /\.today-(toggle|view)/, /#todayView|#todayToggle|#gapCard|#examMode|#todayBtn/, /\.exam-mode/, /\.em-/, /\.sync-qr/, /\.cards-/, /body\.focus-today/];
function gone(sel){
  if(GONE.some(r => r.test(sel))) return true;
  const m = sel.match(/\.(cd-[a-z0-9-]+)/g);
  if(m) return m.some(c => !live.includes(c.slice(1)));        /* صنف cd-* غير مستعمل بأي مصدر حيّ */
  return false;
}
/* مقسّم كتل CSS بسيط (يتعامل مع @media المتداخلة والتعليقات) */
function parse(css){
  const out = []; let i = 0;
  while(i < css.length){
    const c0 = css.indexOf('/*', i), b0 = css.indexOf('{', i);
    if(c0 !== -1 && (b0 === -1 || c0 < b0) && css.slice(i, c0).trim() === ''){ const e = css.indexOf('*/', c0) + 2; out.push({ t: 'raw', s: css.slice(i, e) }); i = e; continue; }
    if(b0 === -1){ out.push({ t: 'raw', s: css.slice(i) }); break; }
    let depth = 1, j = b0 + 1; while(j < css.length && depth){ if(css[j] === '{') depth++; else if(css[j] === '}') depth--; j++; }
    const head = css.slice(i, b0), body = css.slice(b0 + 1, j - 1);
    out.push(/^\s*@(media|supports|layer)/.test(head) ? { t: 'at', head, kids: parse(body) } : { t: 'rule', head, body });
    i = j;
  }
  return out;
}
let removed = 0;
function prune(nodes){
  return nodes.map(n => {
    if(n.t === 'rule'){
      const sels = n.head.split(',').map(s => s.trim()).filter(Boolean), keep = sels.filter(s => !gone(s));
      if(keep.length === sels.length) return n;
      removed += sels.length - keep.length;
      return keep.length ? { t: 'rule', head: '\n' + keep.join(',\n'), body: n.body } : null;
    }
    if(n.t === 'at'){ const kids = prune(n.kids); return kids.filter(k => k.t !== 'raw' || k.s.trim()).some(k => k.t !== 'raw') ? { t: 'at', head: n.head, kids } : null; }
    return n;
  }).filter(Boolean);
}
function emit(nodes){ return nodes.map(n => n.t === 'raw' ? n.s : n.t === 'at' ? n.head + '{' + emit(n.kids) + '}' : n.head + '{' + n.body + '}').join(''); }
const dir = path.join(root, 'css'); let total = 0;
fs.readdirSync(dir).filter(f => /^0\d-.*\.css$/.test(f)).forEach(f => {
  const p = path.join(dir, f), src = fs.readFileSync(p, 'utf8'), before = removed, out = emit(prune(parse(src)));
  if(removed !== before){ console.log(f + ': ' + (removed - before) + ' محدّد، ' + (src.length - out.length) + ' بايت'); total += src.length - out.length; if(!dry) fs.writeFileSync(p, out); }
});
console.log((dry ? '[dry] ' : '') + 'المجموع: ' + removed + ' محدّد، ' + total + ' بايت');
