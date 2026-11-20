/* ينسخ آخر APK مبني إلى apk/ (للنشر عبر GitHub Pages) ويكتب apk/version.json الذي يفحصه التطبيق.
   الاستخدام:  node tools/release-apk.js "ملاحظة 1|ملاحظة 2"
   - الـAPK من ../studyspace-android/android/app/build/outputs/apk/release/app-release.apk
   - versionCode/versionName من android/app/build.gradle (ارفعهما قبل البناء ليظهر التحديث للمثبّتين)
   - بعدها انشر الموقع (publish.ps1) فيُرفع مجلد apk/ مع الموقع. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const proj = path.resolve(__dirname, '..', '..', 'studyspace-android', 'android');
const apkSrc = path.join(proj, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(apkSrc)) { console.error('✗ ما لقيت الـAPK المبني: ' + apkSrc); process.exit(1); }
const g = fs.readFileSync(path.join(proj, 'app', 'build.gradle'), 'utf8');
const code = +(/versionCode\s+(\d+)/.exec(g) || [])[1], name = (/versionName\s+"([^"]+)"/.exec(g) || [])[1];
if (!code || !name) { console.error('✗ ما قدرت أقرأ versionCode/versionName'); process.exit(1); }
const buf = fs.readFileSync(apkSrc), sha = crypto.createHash('sha256').update(buf).digest('hex');
const dir = path.resolve(__dirname, '..', 'apk'); fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(apkSrc, path.join(dir, 'StudySpace.apk'));
const notes = (process.argv[2] || '').split('|').map(s => s.trim()).filter(Boolean);
const meta = { versionCode: code, versionName: name, url: 'apk/StudySpace.apk', sha256: sha, size: buf.length, notes, date: new Date().toISOString().slice(0, 10) };
fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify(meta, null, 2) + '\n');
console.log('✓ apk/StudySpace.apk + version.json — الإصدار ' + name + ' (' + code + ') · ' + Math.round(buf.length / 1024) + ' KB · sha256 ' + sha.slice(0, 12) + '…');
