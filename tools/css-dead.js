/* يحذف تنسيقات CSS الميتة: أي محدِّد فيه صنف (.x) أو معرّف (#x) مش موجود بأي سكربت أو بالصفحة = ما بينطبق على إشي.
   node tools/css-dead.js [--dry]   — يعدّل css/*.css بمكانها ويطبع الحجم قبل/بعد.
   - الأصناف اللي بتنبنى ديناميكياً ('th-' + x) محمية: أي صنف بيبدأ ببادئة مكتوبة بالكود متبوعة بـ + بيضل.
   - @keyframes اللي ما عاد في إشي بيستعملها بتنحذف؛ @font-face و:root والعناصر (body, h1 …) بتضل. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), dry = process.argv.includes('--dry');
const srcFiles = fs.readdirSync(path.join(root, 'js')).filter(f => /\.js$/.test(f) && !/^vendor-/.test(f)).map(f => path.join(root, 'js', f)).concat([path.join(root, 'index.html'), path.join(root, 'sw.js')]);
const SRC = srcFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
/* كل الكلمات (حروف/أرقام/-/_) بالمصادر */
const WORDS = new Set(SRC.match(/[A-Za-z_][\w-]*/g));
/* بادئات ديناميكية: 'abc-' + …  أو  "abc_" + …  أو  `abc-${` */
const PREFIXES = new Set();
SRC.replace(/['"`]([^'"`\n]*?)['"`]\s*\+/g, (m, str) => { const last = str.split(/[\s.]+/).pop(); if(/^[A-Za-z_][\w-]*[-_]$/.test(last)) PREFIXES.add(last); }).replace(/`([A-Za-z_][\w-]*[-_])\$\{/g, (m, p) => PREFIXES.add(p));
/* «صنف1 صنف2» داخل نص مكتوب، والأصناف اللي بتنضاف بـ classList/className كلها كلمات أصلاً */
function alive(tok){ if(WORDS.has(tok)) return true; for(const p of PREFIXES) if(tok.startsWith(p) && tok.length > p.length) return true; return false; }
function selAlive(sel){
  let s = sel.replace(/\[[^\]]*\]/g, '');   /* السمات ما بنحكم عليها */
  /* محتوى :not()/:is()/:where()/:has() ما بنحكم عليه: «:not(.مش-موجود)» = بينطبق على الكل */
  for(let k = 0; k < 4; k++) s = s.replace(/:(not|is|where|has|nth-[\w-]+)\([^()]*\)/g, '');
  const toks = (s.match(/[.#][A-Za-z_][\w-]*/g) || []).map(t => t.slice(1));
  return toks.every(alive);
}
function splitSel(head){ const out = []; let d = 0, cur = ''; for(const ch of head){ if(ch === '(') d++; if(ch === ')') d--; if(ch === ',' && !d){ out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(x => x.trim()).filter(Boolean); }
function parse(css){
  const out = []; let i = 0;
  while(i < css.length){
    const c0 = css.indexOf('/*', i), b0 = css.indexOf('{', i);
    if(c0 !== -1 && (b0 === -1 || c0 < b0)){ const e = css.indexOf('*/', c0) + 2; if(css.slice(i, c0).trim()) { /* نص قبل التعليق */ } out.push({ t: 'raw', s: css.slice(i, e) }); i = e; continue; }
    if(b0 === -1){ out.push({ t: 'raw', s: css.slice(i) }); break; }
    let depth = 1, j = b0 + 1; while(j < css.length && depth){ if(css[j] === '{') depth++; else if(css[j] === '}') depth--; j++; }
    const head = css.slice(i, b0), body = css.slice(b0 + 1, j - 1);
    out.push(/^\s*@(media|supports|layer|container)/.test(head) ? { t: 'at', head, kids: parse(body) } : { t: 'rule', head, body });
    i = j;
  }
  return out;
}
let removedSel = 0, removedRules = 0;
function clean(nodes){
  const out = [];
  for(const n of nodes){
    if(n.t === 'raw'){ if(/^\s*\/\*/.test(n.s) || n.s.trim()) out.push(n); continue; }
    if(n.t === 'at'){ const k = clean(n.kids); if(k.some(x => x.t !== 'raw')) out.push({ t: 'at', head: n.head, kids: k }); else removedRules++; continue; }
    const h = n.head.trim();
    if(/^@/.test(h)){ out.push(n); continue; }                    /* @keyframes / @font-face: بعدين */
    const sels = splitSel(n.head), keep = sels.filter(selAlive);
    removedSel += sels.length - keep.length;
    if(!keep.length){ removedRules++; continue; }
    out.push({ t: 'rule', head: keep.length === sels.length ? n.head : (n.head.match(/^\s*/)[0] + keep.join(',')), body: n.body });
  }
  return out;
}
function emit(nodes){ return nodes.map(n => n.t === 'raw' ? n.s : n.t === 'at' ? n.head + '{' + emit(n.kids) + '}' : n.head + '{' + n.body + '}').join(''); }
const FONLY = (process.argv.find(x => x.startsWith('--files=')) || '').slice(8).split(',').filter(Boolean);
const files = fs.readdirSync(path.join(root, 'css')).filter(f => /\.css$/.test(f) && (!FONLY.length || FONLY.some(p => f.startsWith(p)))).sort();
const outs = {}; let before = 0, after = 0;
for(const f of files){ const css = fs.readFileSync(path.join(root, 'css', f), 'utf8'); before += css.length; outs[f] = emit(clean(parse(css.replace(/\/\*[\s\S]*?\*\//g, '')))); }   /* التعليقات بتنشال أول (تعليق بنص محدِّد كان بيقصّه) */
/* keyframes غير مستعملة (بعد حذف القواعد الميتة) */
const allCss = Object.values(outs).join('\n'), kfUsed = new Set();
allCss.replace(/animation(?:-name)?\s*:([^;}]+)/g, (m, v) => v.split(/[\s,]+/).forEach(w => kfUsed.add(w)));
SRC.replace(/animation(?:Name)?\s*[:=]\s*['"]([^'"]+)['"]/g, (m, v) => v.split(/[\s,]+/).forEach(w => kfUsed.add(w)));
let kfRemoved = 0;
for(const f of files){
  outs[f] = outs[f].replace(/@(?:-webkit-)?keyframes\s+([\w-]+)\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, (m, name) => { if(kfUsed.has(name) || WORDS.has(name) && SRC.indexOf(name) > -1 && new RegExp("['\"`]" + name + "['\"`\\s]").test(SRC)) return m; kfRemoved++; return ''; });
  outs[f] = outs[f].replace(/\n{3,}/g, '\n\n');
  after += outs[f].length;
  if(!dry) fs.writeFileSync(path.join(root, 'css', f), outs[f]);
}
console.log((dry ? '[تجربة] ' : '') + 'محدّدات ميتة: ' + removedSel + ' · قواعد محذوفة: ' + removedRules + ' · keyframes: ' + kfRemoved);
console.log('الحجم: ' + Math.round(before / 1024) + ' KB → ' + Math.round(after / 1024) + ' KB');
files.forEach(f => { const s = fs.statSync(path.join(root, 'css', f)).size; if(!dry) console.log('  ' + f + ': ' + Math.round(s / 1024) + ' KB'); });
