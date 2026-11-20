/* تدقيق CSS خفيف: keyframes غير مستخدمة + قواعد مكررة حرفياً. للقراءة فقط (يقرأ كل ملفات css/ بالترتيب):  node css-audit.js */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const cssDir = path.join(root, 'css'), cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).sort();
let css = cssFiles.map(f => fs.readFileSync(path.join(cssDir, f), 'utf8')).join('\n');
const others = ['index.html', 'app.js', 'features.js', 'hub.js', 'study.js', 'extras.js', 'integrations.js', 'course-sync.js', 'widgets.js', 'assistant.js', 'n8n.js', 'core.js', 'pwa.js', 'supabase.js', 'data.js', 'budget-plan.js', 'ai-context.js', 'progress.js', 'ics-import.js', 'ux.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const kf = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
const used = n => new RegExp('animation(-name)?\\s*:[^;}]*\\b' + n + '\\b').test(css) || new RegExp('\\\\b' + n + '\\\\b').test(others);
const unused = kf.filter(n => !used(n));
console.log('keyframes: ' + kf.length + ' | غير مستخدمة: ' + unused.length + (unused.length ? ' → ' + unused.join(', ') : ''));
/* قواعد مكررة حرفياً (نفس المحدد ونفس التصريحات) خارج @media/@keyframes */
const seen = new Map(), dups = [];
let depth = 0, buf = '', sel = '';
const top = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...top.matchAll(/(^|\})\s*([^{}@][^{}]*)\{([^{}]*)\}/g)].map(m => [m[2].trim().replace(/\s+/g, ' '), m[3].trim().replace(/\s+/g, ' ')]);
rules.forEach(([s, d]) => { const k = s + '{' + d + '}'; if(seen.has(k)) dups.push(s); else seen.set(k, 1); });
console.log('قواعد مكررة حرفياً: ' + dups.length + (dups.length ? ' → ' + [...new Set(dups)].slice(0, 15).join(' | ') : ''));
