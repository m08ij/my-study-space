/* فحص ساكن شامل: صياغة JS، معرّفات HTML المكررة، مراجع DOM بلا عناصر، متغيرات CSS غير معرّفة، وصول (alt/label/اسم زر)، دوال window غير معرّفة.
   يطبع التقارير ويفشل (FAIL) فقط على ما هو خطأ مؤكد؛ والقوائم الاستكشافية تُطبع كمعلومات (INFO). */
const fs=require('fs'),path=require('path'),vm=require('vm'); const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'); const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const jsFiles=fs.readdirSync(root).filter(f=>/\.js$/.test(f)&&!/^(app\.bundle|sw)\.js$/.test(f)).concat(['sw.js']);
const cssFiles=fs.readdirSync(path.join(root,'css')).filter(f=>/\.css$/.test(f)).map(f=>'css/'+f);
const html=read('index.html'); const src={}; jsFiles.forEach(f=>src[f]=read(f));
let fails=0; const out=[]; const FAIL=(n,d)=>{ fails++; out.push('FAIL '+n+(d?' → '+d:'')); }; const OK=n=>out.push('OK   '+n); const INFO=(n,d)=>out.push('INFO '+n+(d?': '+d:''));

/* 1) صياغة JS */
jsFiles.forEach(f=>{ try{ new vm.Script(src[f],{filename:f}); }catch(e){ FAIL('syntax '+f,e.message); } }); if(!out.some(l=>/^FAIL syntax/.test(l))) OK('syntax: '+jsFiles.length+' ملف JS سليم');

/* 2) معرّفات مكررة بالـHTML */
const dom=new JSDOM(html); const doc=dom.window.document; const seen={}, dups=[];
doc.querySelectorAll('[id]').forEach(e=>{ if(seen[e.id]) dups.push(e.id); seen[e.id]=1; });
dups.length?FAIL('duplicate ids in index.html',dups.join(',')):OK('لا معرّفات مكررة بـ index.html ('+Object.keys(seen).length+')');

/* 3) معرّفات تُطلب بالكود ولا تُنشأ بأي مكان (HTML أو JS) */
const created=new Set(Object.keys(seen)); const allJs=Object.values(src).join('\n');
let m; const reCreate=[/\bid=\\?["']([\w\-]+)\\?["']/g,/\.id\s*=\s*['"]([\w\-]+)['"]/g,/\bid:\s*['"]([\w\-]+)['"]/g,/setAttribute\(['"]id['"],\s*['"]([\w\-]+)['"]/g];
reCreate.forEach(re=>{ while((m=re.exec(allJs))) created.add(m[1]); });
/* معرّفات مبنيّة ديناميكياً بدوال (mf_ + key ...) تُعامل ببادئات */
const dynPrefix=['mf_','mt_','dl','cd','qs','sc','tt','stt','hub','ics','bp','td','fc'];
const wanted={}; const reGet=/getElementById\(\s*['"]([\w\-]+)['"]\s*\)/g; Object.keys(src).forEach(f=>{ if(f==='tests.js') return; let mm; while((mm=reGet.exec(src[f]))) (wanted[mm[1]]=wanted[mm[1]]||new Set()).add(f); });
const dangling=Object.keys(wanted).filter(id=>!created.has(id)&&!dynPrefix.some(p=>id.indexOf(p)===0));
dangling.length?INFO('getElementById لمعرّفات غير مُنشأة ('+dangling.length+')',dangling.map(i=>i+'['+[...wanted[i]].join('/')+']').join(', ')):OK('كل معرّفات getElementById لها مصدر');

/* 4) متغيرات CSS مستخدمة بلا تعريف ولا fallback */
const css=cssFiles.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
const defined=new Set(); const reDef=/(--[\w-]+)\s*:/g; while((m=reDef.exec(css))) defined.add(m[1]);
/* المتغيرات المضبوطة بالـJS (style.setProperty) */
const reSet=/setProperty\(\s*['"](--[\w-]+)['"]/g; while((m=reSet.exec(allJs))) defined.add(m[1]);
const used={}; const reUse=/var\(\s*(--[\w-]+)\s*(,)?/g; while((m=reUse.exec(css))){ if(!m[2]) used[m[1]]=(used[m[1]]||0)+1; }
const undef=Object.keys(used).filter(v=>!defined.has(v));
undef.length?FAIL('CSS var() بلا تعريف ولا fallback',undef.join(', ')):OK('كل متغيرات CSS المستخدمة معرّفة ('+Object.keys(used).length+')');

/* 5) وصول: صور بلا alt، أزرار بلا اسم، حقول بلا تسمية (HTML الثابت) */
const noAlt=[...doc.querySelectorAll('img:not([alt])')].length; noAlt?FAIL('img بلا alt',noAlt):OK('كل img لها alt');
const noName=[...doc.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title')).map(b=>b.id||b.className);
noName.length?FAIL('أزرار بلا اسم قابل للقراءة',noName.join(',')):OK('كل أزرار index.html لها اسم');
const unlabeled=[...doc.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea')].filter(i=>{ if(i.getAttribute('aria-label')||i.getAttribute('aria-labelledby')||i.title) return false; if(i.id&&doc.querySelector('label[for="'+i.id+'"]')) return false; if(i.closest('label')) return false; return true; }).map(i=>i.id||i.name||i.type);
unlabeled.length?INFO('حقول بلا label/aria-label ('+unlabeled.length+')',unlabeled.join(',')):OK('كل الحقول الثابتة لها تسمية');
const lang=doc.documentElement.getAttribute('lang'), dir=doc.documentElement.getAttribute('dir'); (lang&&dir)?OK('html lang='+lang+' dir='+dir):FAIL('html بلا lang/dir');
doc.querySelector('meta[name=viewport]')?OK('viewport meta'):FAIL('لا viewport meta'); doc.querySelector('meta[name=theme-color]')?OK('theme-color meta'):INFO('لا theme-color');

/* 6) استدعاء window.X() لدوال لا تُعرَّف بأي مكان */
const defs=new Set(); const reAssign=/window\.([A-Za-z_$][\w$]*)\s*=/g; while((m=reAssign.exec(allJs))) defs.add(m[1]);
const reFnDecl=/(?:^|[;\s{])(?:function|var|let|const)\s+([A-Za-z_$][\w$]*)/g; while((m=reFnDecl.exec(allJs))) defs.add(m[1]);
const reObjKey=/window\.([A-Za-z_$][\w$]*)\s*=\s*window\.\1\s*\|\|/g;
const browser=new Set('open close alert confirm prompt print scrollTo scrollBy matchMedia getComputedStyle requestAnimationFrame cancelAnimationFrame setTimeout setInterval clearTimeout clearInterval addEventListener removeEventListener dispatchEvent fetch focus blur getSelection requestIdleCallback atob btoa postMessage Notification localStorage sessionStorage location history navigator document screen performance innerWidth innerHeight devicePixelRatio supabase Intl Date JSON Math Object Array Promise CustomEvent Event KeyboardEvent MouseEvent URL Blob FileReader File Image FormData AudioContext webkitAudioContext IntersectionObserver MutationObserver ResizeObserver PerformanceObserver DataTransfer'.split(' '));
const called={}; const reCall=/window\.([A-Za-z_$][\w$]*)\s*\(/g; Object.keys(src).forEach(f=>{ if(f==='tests.js') return; let mm; while((mm=reCall.exec(src[f]))){ const n=mm[1]; if(!defs.has(n)&&!browser.has(n)) (called[n]=called[n]||new Set()).add(f); } });
const callNames=Object.keys(called); callNames.length?INFO('window.X() بلا تعريف ظاهر ('+callNames.length+')',callNames.map(n=>n+'['+[...called[n]].join('/')+']').join(', ')):OK('كل window.X() المستدعاة معرّفة');

/* 7) بقايا تطوير: console.log غير مغلّف، TODO/FIXME/debugger */
const dbg=[]; Object.keys(src).forEach(f=>{ if(f==='tests.js') return; src[f].split('\n').forEach((l,i)=>{ if(/\bdebugger\b/.test(l)&&!/\/\//.test(l.split('debugger')[0])) dbg.push(f+':'+(i+1)); }); }); dbg.length?FAIL('debugger',dbg.join(',')):OK('لا debugger');
const todo=[]; Object.keys(src).forEach(f=>{ if(f==='tests.js') return; src[f].split('\n').forEach((l,i)=>{ if(/\b(TODO|FIXME|XXX)\b/.test(l)) todo.push(f+':'+(i+1)); }); }); todo.length?INFO('TODO/FIXME',todo.join(',')):OK('لا TODO/FIXME');

/* 8) مفاتيح localStorage المكتوبة بلا قراءة (تسريب مفاتيح) — معلوماتي */
console.log(out.join('\n')); console.log(JSON.stringify({fails})); process.exit(fails?1:0);
