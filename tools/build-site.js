/* يبني نسخة النشر من المصدر: node tools/build-site.js [مجلد_الناتج=_site]
   - ينسخ ملفات التشغيل فقط (html/js/css/json/ico بالجذر + css/ icons/ apk/ fonts/) — بدون tests/tools/n8n/supabase
   - بعدين tools/bundle.js --clean: سكربت واحد app.bundle.js وتنسيق واحد app.bundle.css مصغّرين
   يُستعمل بـGitHub Actions (.github/workflows/deploy.yml) ومحلياً للتجربة. */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const src = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(src, '_site'));
const ROOT_EXT = ['.html', '.js', '.css', '.json', '.ico'], SKIP = ['package.json', 'package-lock.json'], DIRS = ['css', 'icons', 'apk', 'fonts'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let n = 0;
const copy = (rel) => { const to = path.join(out, rel); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(src, rel), to); n++; };
fs.readdirSync(src, { withFileTypes: true })
  .filter(e => e.isFile() && ROOT_EXT.includes(path.extname(e.name)) && !SKIP.includes(e.name))
  .forEach(e => copy(e.name));
DIRS.forEach(d => { const p = path.join(src, d); if(fs.existsSync(p)) fs.readdirSync(p, { withFileTypes: true }).filter(e => e.isFile()).forEach(e => copy(d + '/' + e.name)); });
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('✓ نسخت ' + n + ' ملف إلى ' + path.relative(src, out));
execFileSync(process.execPath, [path.join(__dirname, 'bundle.js'), out, '--clean'], { stdio: 'inherit' });
