/* الربط مع n8n: العنوان، المساعد (/assistant)، قراءة الصور (/gemini)، الأخطاء — خادم n8n مُحاكى بدون شبكة */
const { boot } = require('./e2elib'); const sl = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const o = {};
  const { w } = boot({ ss_n8n_base: 'off', welcomeDone: 'true', ss_onboarding_done_v1: 'true', space: JSON.stringify({ profile: { name: 'سامي' }, courses: [{ name: 'برمجة', code: '1', hours: 3 }], tasks: [], exams: [] }) });
  await sl(1500);
  const N = w.N8n;
  o.N_default = /^https:\/\/m08ij\.app\.n8n\.cloud\/webhook$/.test(w.eval("(function(){localStorage.removeItem('ss_n8n_base');var b=N8n.base();localStorage.setItem('ss_n8n_base','off');return b})()"));
  o.N_off = !!N && N.enabled() === false;                                   // بدون عنوان: غير مربوط
  o.N_offErr = await N.ask('x').then(() => false, e => e.code === 'off');
  o.N_ocrOff = w.GeminiLab && w.GeminiLab.hasKey() === false;               // قراءة الصور بدون n8n ولا مفتاح
  w.localStorage.setItem('ss_n8n_base', 'https://demo.app.n8n.cloud/webhook/');
  o.N_on = N.enabled() && N.base() === 'https://demo.app.n8n.cloud/webhook';  // الشرطة الأخيرة بتنشال
  o.N_ocrOn = w.GeminiLab.hasKey() === true;                                // صار في «مفتاح» عبر n8n
  const calls = [];
  w.fetch = (url, opts) => { const body = JSON.parse(opts.body); calls.push({ url, body });
    if(/\/gemini$/.test(url)) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] })) });
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ answer: 'تمام' })) }); };
  const a = await N.ask('شو عندي؟', [{ role: 'user', content: 'قبل' }], '{"now":"x"}');
  o.N_ask = a.answer === 'تمام' && calls[0].url === 'https://demo.app.n8n.cloud/webhook/assistant' && calls[0].body.question === 'شو عندي؟' && calls[0].body.history.length === 1;
  const g = await N.gemini('gemini-flash-latest', { contents: [{ parts: [{ text: 'hi' }] }] });
  o.N_gemini = !!g.candidates && calls[1].url.endsWith('/gemini') && calls[1].body.model === 'gemini-flash-latest' && !!calls[1].body.request.contents;
  /* GeminiLab (خطة المادة/مذاكرة القسم) بيمرّ من n8n لما ما في مفتاح شخصي */
  const gl = await w.GeminiLab.json({ parts: [{ text: 'x' }] }).catch(e => ({ err: e.message }));
  o.N_geminiLab = gl && gl.ok === true && calls[2] && calls[2].url.endsWith('/gemini');
  /* أخطاء الخادم: رسالة عربية واضحة */
  w.fetch = () => Promise.resolve({ ok: false, status: 429, text: () => Promise.resolve('{"error":"rate"}') });
  const e1 = await N.ask('x').catch(e => e);
  o.N_err429 = e1.status === 429 && /ضغط/.test(N.explain(e1));
  w.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
  const e2 = await N.ask('x').catch(e => e);
  o.N_errNet = e2.code === 'network' && /n8n/.test(N.explain(e2));
  /* إعدادات: كرت n8n بدل OpenRouter */
  w.FocusUI.go('settings'); await sl(300);
  o.N_settingsCard = !!w.document.querySelector('.fx-n8n') && !w.document.getElementById('fxOrKey');
  /* الإضافة السريعة بدون المساعد القديم: «بكرة» والمادة */
  w.FocusUI.go('tasks'); await sl(300);
  const f = w.document.querySelector('.fx-add'), inp = f.querySelector('input'); inp.value = 'واجب برمجة بكرة';
  f.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); await sl(200);
  const t = (w.space.tasks || []).slice(-1)[0], tm = new Date(); tm.setDate(tm.getDate() + 1);
  const ymd = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  o.N_quickParse = !!t && t.due === ymd(tm) && t.course === 'برمجة';
  o.N_noOldAI = typeof w.aiRespond === 'undefined' && typeof w.AiCloud === 'undefined';
  console.log(JSON.stringify(o, null, 1)); process.exit(0);
})();
