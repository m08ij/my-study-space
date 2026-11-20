/* أداة تطوير (لا تُنشر): تشغيل Edge بدون واجهة ببروفايل مؤقت نظيف والتحكم به عبر Chrome DevTools Protocol — للفحص الآلي بمتصفح حقيقي بدون صور.
   الاستعمال: const b = await require('./cdp.js').launch({ w: 1440, h: 900, mobile: false }); await b.goto(url); await b.eval('...'); await b.close(); */
const { spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
function findEdge(){
  const roots = ['C:\\Program Files (x86)\\Microsoft\\EdgeCore', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application', 'C:\\Program Files\\Microsoft\\Edge\\Application'];
  for (const r of roots) {
    try {
      if (fs.existsSync(path.join(r, 'msedge.exe'))) return path.join(r, 'msedge.exe');
      const vers = fs.readdirSync(r).filter(d => /^\d+\./.test(d)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const v of vers) { const p = path.join(r, v, 'msedge.exe'); if (fs.existsSync(p)) return p; }
    } catch (e) {}
  }
  throw new Error('Edge not found');
}
exports.launch = async function(opts){
  opts = opts || {};
  const port = opts.port || (9300 + Math.floor(Math.random() * 600)), w = opts.w || 1440, h = opts.h || 900;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ssprof-'));
  const proc = spawn(findEdge(), ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + prof, '--no-first-run', '--disable-gpu', '--window-size=' + w + ',' + h, '--lang=ar', 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 60; i++) { try { list = await (await fetch('http://127.0.0.1:' + port + '/json')).json(); if (list.length) break; } catch (e) {} await new Promise(r => setTimeout(r, 200)); }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pend = {}; const logs = [];
  ws.addEventListener('message', m => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) { pend[d.id](d); delete pend[d.id]; }
    else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC ' + ((d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description) || d.params.exceptionDetails.text).split('\n')[0]);
    else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) logs.push((d.params.type === 'error' ? 'ERR ' : 'WARN ') + d.params.args.map(a => a.value || a.description).join(' ').slice(0, 300));
  });
  const send = (method, params) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  await send('Page.enable'); await send('Runtime.enable');
  /* أمان: أدوات الفحص ما بتلمس سحابة الإنتاج (Supabase) إلا بـ{cloud:true} صريح — فتح الموقع الحي ببيانات تجريبية كان بيرفعها كمساحات جديدة */
  if (!opts.cloud) { await send('Network.enable'); await send('Network.setBlockedURLs', { urls: ['*supabase.co*'] }); }
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!opts.mobile });
  if (opts.mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  return {
    logs, send,
    goto: async url => { await send('Page.navigate', { url }); await new Promise(r => setTimeout(r, 1500)); },
    eval: async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) return 'EXC: ' + ((r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description) || r.result.exceptionDetails.text);
      return r.result && r.result.result ? r.result.result.value : undefined;
    },
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    resize: async (W2, H2, mobile) => { await send('Emulation.setDeviceMetricsOverride', { width: W2, height: H2, deviceScaleFactor: 1, mobile: !!mobile }); },
    close: async () => { try { await send('Browser.close'); } catch (e) {} try { proc.kill(); } catch (e) {} setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} }, 1500); }
  };
};
