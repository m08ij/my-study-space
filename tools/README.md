# tools/

أدوات التطوير والنشر (ما بتنرفع للموقع — `tools/build-site.js` بينسخ ملفات التشغيل بس).

| الملف | شو بيعمل |
|---|---|
| **البناء والنشر** | |
| `build-site.js` | يبني نسخة النشر بـ`_site/` (نسخ + تجميع) — بيستعمله GitHub Actions |
| `bundle.js` | يجمّع ويصغّر السكربتات (`app.bundle.js`) والتنسيقات (`app.bundle.css`) ويحدّث كاش الـSW |
| `publish.ps1` | إصدار جديد: فحص ← رفع رقم الإصدار ← commit/push ← انتظار الموقع |
| `release-apk.js` | ينسخ ملف أندرويد الجديد لـ`apk/` ويكتب `version.json` |
| `perf-budget.js` | حدود حجم الحزمة (بيفحصها اختبار `bundle1`) |
| **n8n** | |
| `n8n-mock.js` | خادم n8n مُحاكى محلياً — بيشغّل نفس كود `n8n/workflow.json` |
| **فحص بمتصفح حقيقي (Edge بدون واجهة)** | |
| `cdp.js` | تشغيل Edge والتحكم فيه (Supabase محجوب افتراضياً) |
| `compare-server.js` | خادم محلي + `/__seed` (بيانات طالب تجريبي) |
| `perf-run.js` | سرعة الفتح على جوال متوسط (4G + معالج ×4) |
| `contrast-run.js` | التباين الفعلي لكل الثيمات والشاشات |
| `edge-run.js` · `real-check.js` · `real-full.js` · `rf-run.js` · `live-audit.js` | فحوص شاملة للشاشات والنوافذ والمسارات |
| `css-prune.js` | يلاقي تنسيقات CSS مش مستعملة |
