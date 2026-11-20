/* فحص تباين الألوان (WCAG) للثيمات التسعة من ملفات CSS مباشرة — بدون متصفح.
   النص الأساسي/الثانوي/الألوان الدلالية على الخلفية والبطاقة، ونص الأزرار على لون التمييز.
   حدّ 4.5:1 للنص العادي؛ muted2 (نص ثانوي صغير) حدّه 3.5. تُطبع القيم دائماً. */
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..','css'); const files=fs.readdirSync(dir).filter(f=>/\.css$/.test(f)).sort();
const css=files.map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
const THEMES=['dark','coral','royal','cyberpunk','midnight','glass','glass-light','white'];
const base={}, th={}; THEMES.forEach(t=>th[t]={});
/* كل كتلة { } بمحدداتها: نأخذ فقط :root و [data-theme="x"] المنفردة (بدون محددات فرعية) بترتيب الظهور */
const re=/([^{}]+)\{([^{}]*)\}/g; let m;
while((m=re.exec(css))){
  const sels=m[1].split(',').map(s=>s.trim()); const decl={};
  m[2].split(';').forEach(d=>{ const i=d.indexOf(':'); if(i>0){ const k=d.slice(0,i).trim(); if(/^--/.test(k)) decl[k]=d.slice(i+1).trim(); } });
  if(!Object.keys(decl).length) continue;
  sels.forEach(s=>{
    if(s===':root') Object.assign(base,decl);
    const t=/^\[data-theme="(\w+)"\]$/.exec(s); if(t&&th[t[1]]) Object.assign(th[t[1]],decl);
  });
}
function get(theme,name,depth){
  depth=depth||0; if(depth>8) return null;
  let v=(th[theme][name]!==undefined?th[theme][name]:base[name]); if(v===undefined) return null;
  const mm=/^var\((--[\w-]+)(?:,([^)]*))?\)$/.exec(v); if(mm) return get(theme,mm[1],depth+1)||(mm[2]?mm[2].trim():null);
  return v;
}
function parse(c){
  if(!c) return null; c=c.trim();
  let a=/^#([0-9a-f]{3,8})$/i.exec(c);
  if(a){ let h=a[1]; if(h.length===3||h.length===4) h=h.split('').map(x=>x+x).join(''); return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:h.length>=8?parseInt(h.slice(6,8),16)/255:1}; }
  a=/^rgba?\(([^)]+)\)$/.exec(c); if(a){ const p=a[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return {r:p[0],g:p[1],b:p[2],a:p[3]===undefined?1:p[3]}; }
  return null;
}
const over=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
const lum=c=>{ const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}; return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b); };
const ratio=(a,b)=>{ const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
/* [النص, الخلفية, الحد الأدنى] */
const PAIRS=[['--text','--bg',4.5],['--text','--card',4.5],['--text','--bg2',4.5],['--muted','--bg',4.5],['--muted','--card',4.5],['--muted2','--card',3.5],
 ['--accent','--bg',4.5],['--accent','--card',4.5],['--on-accent','--accent',4.5],['--green','--card',4.5],['--amber','--card',4.5],['--red','--card',4.5]];
const o={}, rows=[]; let fails=0, skipped=0;
THEMES.forEach(t=>PAIRS.forEach(([fg,bg,min])=>{
  const f=parse(get(t,fg)), b=parse(get(t,bg));
  if(!f||!b){ skipped++; rows.push(t+' '+fg+' / '+bg+': تخطّي ('+get(t,fg)+' | '+get(t,bg)+')'); return; }
  const r=ratio(over(f,over(b,{r:0,g:0,b:0,a:1})),over(b,{r:0,g:0,b:0,a:1})), ok=r>=min; if(!ok) fails++;
  rows.push((ok?'OK  ':'FAIL')+' '+t.padEnd(10)+fg.padEnd(12)+'على '+bg.padEnd(8)+r.toFixed(2)+' (≥'+min+')');
  o[t+'|'+fg+'|'+bg]=ok;
}));
console.log(rows.join('\n'));
console.log(JSON.stringify({checked:Object.keys(o).length,skipped,fails}));
const fl={}; Object.keys(o).forEach(k=>{ if(!o[k]) fl[k]=false; });
console.log(JSON.stringify(Object.assign({C_checkedEnough:Object.keys(o).length>=60},fl),null,1)); process.exit(0);
