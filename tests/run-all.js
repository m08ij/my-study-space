/* تشغيل كل اختبارات jsdom بأمر واحد:  cd tests && npm install && npm test
   كل اختبار يطبع JSON أو أسطر PASS/FAIL. نعدّ: صحيح = ": true" / "PASS"، وفشل = ": false" / "FAIL" / خطأ تنفيذ.
   هذه محاكاة محلية (jsdom + Supabase وهمي) — لا تُثبت نجاح المزامنة الحقيقية. */
const { spawnSync } = require('child_process');
const path = require('path');

const SUITES = [
  { name: 'boot' }, { name: 'fx1', label: 'fx1 (الواجهة الجديدة: الشاشات/الخطوة الجاية/الأدوات)' }, { name: 'exam1', label: 'exam1 (استيراد الامتحانات والعلامات من صورة + المعدل المتوقع)' }, { name: 'rename' }, { name: 'del2' }, { name: 'files2' }, { name: 'restore' }, { name: 'filelife3' },
  { name: 'ocr2', label: 'ocr2 (استيراد الجدول v143: موافقة/نماذج/عدة صور/لصق/نتيجة)' }, { name: 'n8n1', label: 'n8n1 (المساعد وقراءة الصور عبر n8n)' }, { name: 'dayplan1', label: 'dayplan1 (خطتي اليوم: اقتراحات/سلسلة/مراجعة/تذكيرات)' }, { name: 'coach1', label: 'coach1 (اقتراحات/صحة المادة/ما الجديد/مشاركة الجدول)' }, { name: 'hub3' }, { name: 'hub7' }, { name: 'skel1', label: 'skel1 (هيكل التحميل الأول)' }, { name: 'ocr1', label: 'ocr1 (استيراد جدول من صورة)' }, { name: 'syl1', label: 'syl1 (خطة المادة + ربط الكتاب)' }, { name: 'course1', label: 'course1 (ورقة المادة بتبويبات/خريطة v2)' }, { name: 'native1', label: 'native1 (جسر أندرويد: إشعارات/تنزيل/قارئ الكتاب)' }, { name: 'tools1' }, { name: 'map2', label: 'map2 (خريطة: وين أروح؟ + معايرة GPS)' }, { name: 'sys2', label: 'sys2 (schemaVersion + رمز المزامنة)' }, { name: 'campus1', label: 'campus1 (خريطة الجامعة)' }, { name: 'budget1', label: 'budget1 (تخطيط الميزانية)' }, { name: 'e2e1', label: 'e2e1 (وظيفي شامل)' }, { name: 'new3', label: 'new3 (سجل أخطاء/مزامنة/صباح/جدول/تركيز)' }, { name: 'fuzz1', label: 'fuzz1 (متانة محلل ICS)' }, { name: 'new2', label: 'new2 (غياب/وضع الامتحانات/نسخ/محاضرات ICS)' }, { name: 'ux2', label: 'ux2 (نماذج/تحقق/تركيز)' }, { name: 'daily1', label: 'daily1 (يومك/ذروة/لون/قوائم/سيناريوهات/أداء)' }, { name: 'bundle1', label: 'bundle1 (النشر المجمّع)' }, { name: 'toast1', label: 'toast1 (التنبيهات/كرت البدء)' }, { name: 'audit-static', label: 'audit-static (فحص ساكن)' }, { name: 'clock1', label: 'clock1 (حدود التواريخ)' }, { name: 'monkey', label: 'monkey (نقر عشوائي)', args: ['21','250'] }, { name: 'upload2', label: 'upload2 (رفع الملفات)' }, { name: 'courses-all', label: 'courses-all (130 مادة + الخطة + الجدول + التراجع + السلامة)' }, { name: 'pinned1', label: 'pinned1 (منجزة/أرشيف الفصول/جدول المذاكرة/نسخ احتياطي)' }, { name: 'notif1', label: 'notif1 (مركز التنبيهات/هدوء/ICS)' }, { name: 'polish1', label: 'polish1 (متكررة/شو أبدأ/حماية الجدول/توقع المعدل)' }, { name: 'session1', label: 'session1 (إصلاحات جلسة الاستخدام)' }, { name: 'contrast', label: 'contrast (تباين الثيمات)' }, { name: 'ics1', label: 'ics1 (قائمة/رمز المزامنة/استيراد ICS)' }, { name: 'new1', label: 'new1 (تقدم/تركيز/أهداف/المساعد)' }, { name: 'hub11', label: 'hub11 (RPC بمحاكاة)', args: ['cloudNew'] },
  { name: 'hub9', label: 'hub9 (مستخدم جديد)', args: ['empty'], env: { WMODE: 'new' } },
  { name: 'hub9', label: 'hub9 (مستخدم قديم)', args: ['error', 'local'], env: { WMODE: 'existing' } },
  { name: 'hub9', label: 'hub9 (بدون اسم)', args: ['empty'], env: { WMODE: 'noname' } },
  { name: 'twodev' }, { name: 'twodev2' }, { name: 'autosnap1', label: 'autosnap1 (نسخ تلقائية يومية + استرجاع)' }, { name: 'slowcloud1', label: 'slowcloud1 (إقلاع بسحابة بطيئة: رسم محلي ثم قرار آمن)' }, { name: 'swtest', label: 'swtest (منطق SW بمحاكاة)' }
];
/* مفاتيح JSON مسموح أن تكون false (حالات وصفية لا اختبارات) */
const NOT_ASSERTIONS = /bootSyncing/;
/* مجموعة سريعة (~30 ث) للنشر العادي: إقلاع، تدفقات أساسية، التجميع، SW، التباين، فحص ساكن، الاستيراد من صورة. الشاملة: node run-all.js بدون وسيط */
const QUICK = ['boot', 'fx1', 'n8n1', 'exam1', 'dayplan1', 'autosnap1', 'bundle1', 'swtest', 'contrast', 'audit-static', 'skel1', 'ocr1', 'syl1', 'course1', 'native1', 'campus1', 'tools1', 'coach1', 'ocr2', 'map2', 'sys2'];
const only = process.argv[2];
const quick = only === 'quick';
let totalPass = 0, totalFail = 0; const rows = [];

SUITES.filter(s => quick ? QUICK.indexOf(s.name) > -1 : (!only || s.name === only)).forEach(s => {
  const r = spawnSync(process.execPath, [path.join(__dirname, s.name + '.js')].concat(s.args || []), {
    env: Object.assign({}, process.env, s.env || {}), encoding: 'utf8', timeout: 180000, cwd: __dirname
  });
  const out = (r.stdout || '') + '\n' + (r.stderr || '');
  const lines = out.split('\n');
  const pass = lines.filter(l => /:\s*true\b|^PASS/.test(l)).length;
  const failLines = lines.filter(l => (/:\s*false\b|^FAIL|TypeError|ReferenceError|Error:/.test(l)) && !NOT_ASSERTIONS.test(l) && !/JSDOMERR/.test(l));
  const crashed = r.status !== 0;
  const timedOut = r.error && r.error.code === 'ETIMEDOUT';
  const fail = failLines.length + (timedOut ? 1 : 0) + (crashed ? 1 : 0);
  totalPass += pass; totalFail += fail;
  rows.push({ suite: s.label || s.name, pass, fail });
  if (fail) failLines.slice(0, 5).forEach(l => console.log('   ✗ ' + (s.label || s.name) + ': ' + l.trim()));
  if (timedOut) console.log('   ✗ ' + (s.label || s.name) + ': انتهت المهلة');
});

console.log('\nالمجموعة'.padEnd(34) + 'ناجح'.padStart(6) + 'فاشل'.padStart(6));
rows.forEach(r => console.log(r.suite.padEnd(32) + String(r.pass).padStart(6) + String(r.fail).padStart(6) + (r.fail ? '  ❌' : '')));
console.log('\nالإجمالي: ' + totalPass + ' ناجح، ' + totalFail + ' فاشل');
process.exit(totalFail ? 1 : 0);
