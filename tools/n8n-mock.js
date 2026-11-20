/* خادم n8n مُحاكى للتجربة المحلية (لا يُنشر): node tools/n8n-mock.js [port=8791]
   - بيشغّل نفس عقد Code من n8n/workflow.json (Build prompt/Extract answer/Validate)
   - CORS زي إعداد Webhook «Allowed Origins» (بيرفض أي أصل مش بالقائمة)
   - Gemini مُحاكى: رد نصي للمساعد، وJSON تجريبي لطلبات الصور
   الموقع: localStorage.setItem('ss_n8n_base','http://127.0.0.1:8791/webhook') */
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +(process.argv[2] || 8791);
const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'n8n', 'workflow.json'), 'utf8'));
const node = n => wf.nodes.find(x => x.name === n);
const origins = node('Webhook · assistant').parameters.options.allowedOrigins.split(',').concat(['http://127.0.0.1:8773', 'http://localhost:8773']);  /* + خادم التطوير المحلي */
function runCode(name, json){ const fn = new Function('$input', node(name).parameters.jsCode); return fn({ first: () => ({ json }) })[0].json; }
function fakeGemini(model, request){
  const last = (request.contents || []).slice(-1)[0] || {}, parts = last.parts || [];
  const hasImage = parts.some(p => p.inline_data), q = (parts.find(p => p.text) || {}).text || '';
  if(hasImage) return { statusCode: 200, body: { candidates: [{ content: { parts: [{ text: JSON.stringify({ exams: [], results: [], rows: [] }) }] } }] } };
  const sys = request.systemInstruction ? 'نعم' : 'لا';
  return { statusCode: 200, body: { candidates: [{ content: { parts: [{ text: 'وصلني سؤالك عبر n8n: **' + q + '**\n- النموذج: ' + model + '\n- بيانات الطالب مرفقة: ' + sys }] } }] } };
}
http.createServer((req, res) => {
  const o = req.headers.origin, ok = !o || origins.includes(o);
  if(o && ok){ res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'content-type'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); }
  if(req.method === 'OPTIONS'){ res.writeHead(ok ? 204 : 403); return res.end(); }
  if(!ok){ res.writeHead(403); return res.end('origin not allowed'); }
  let raw = ''; req.on('data', c => raw += c); req.on('end', () => {
    try{
      const body = JSON.parse(raw || '{}'), send = (code, j) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(j)); };
      if(req.url === '/webhook/assistant'){ const p = runCode('Build prompt', { body }); const g = fakeGemini(p.model, p.request); const r = runCode('Extract answer', g); return send(r.status, r.body); }
      if(req.url === '/webhook/gemini'){ const p = runCode('Validate', { body }); const g = fakeGemini(p.model, p.request); return send(g.statusCode, g.body); }
      send(404, { message: 'not found' });
    }catch(e){ res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Error in workflow: ' + e.message })); }
  });
}).listen(PORT, () => console.log('n8n mock on http://127.0.0.1:' + PORT + '/webhook  (origins: ' + origins.join(' ') + ')'));
