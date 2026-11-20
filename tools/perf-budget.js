/* ميزانية الأداء (لا تُنشر): تقيس حجم الحزمة المضغوط (gzip) وتقارنه بحدود ثابتة، فيظهر أي تضخّم قبل ما يوصل للمستخدم.
   الاستعمال: node tools/perf-budget.js <مجلد فيه app.bundle.js/css — مثلاً مجلد النشر بعد bundle.js>   (يرجع 1 إن تجاوز الحدّ)
   الحدود = الحجم الحالي + هامش ~6%؛ ارفعها عمداً فقط بعد التأكد أن الميزة تستاهل. */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const BUDGET = { js: 300 * 1024, css: 68 * 1024, fonts: 70 * 1024, lazy: 70 * 1024 };   /* gzip */
const gz = f => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length;
function check(dir){
  const out = { rows: [], ok: true };
  function row(name, size, limit){ const ok = size <= limit; out.rows.push({ name, size, limit, ok }); if(!ok) out.ok = false; }
  const js = path.join(dir, 'app.bundle.js'), css = path.join(dir, 'app.bundle.css');
  if(!fs.existsSync(js)) throw new Error('app.bundle.js غير موجود بـ' + dir + ' — شغّل tools/bundle.js أولاً');
  row('app.bundle.js (gzip)', gz(js), BUDGET.js);
  if(fs.existsSync(css)) row('app.bundle.css (gzip)', gz(css), BUDGET.css);
  const fd = path.join(dir, 'fonts'); let fsz = 0;
  if(fs.existsSync(fd)) fs.readdirSync(fd).filter(f => /\.woff2$/.test(f)).forEach(f => { fsz += fs.statSync(path.join(fd, f)).size; });
  if(fsz) row('fonts (woff2)', fsz, BUDGET.fonts);
  const v = path.join(dir, 'vendor-supabase.js'); if(fs.existsSync(v)) row('vendor-supabase.js (lazy, gzip)', gz(v), BUDGET.lazy);
  return out;
}
module.exports = { check, BUDGET };
if(require.main === module){
  const dir = path.resolve(process.argv[2] || '.');
  try{
    const r = check(dir);
    r.rows.forEach(x => console.log((x.ok ? '✓' : '✗') + ' ' + x.name.padEnd(34) + (x.size / 1024).toFixed(1).padStart(8) + ' KB / ' + (x.limit / 1024).toFixed(0) + ' KB'));
    console.log(r.ok ? 'الميزانية سليمة' : 'تجاوز الميزانية!'); process.exit(r.ok ? 0 : 1);
  }catch(e){ console.error(e.message); process.exit(2); }
}
