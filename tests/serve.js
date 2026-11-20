const http=require('http'),fs=require('fs'),path=require('path'); const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
http.createServer((q,s)=>{ let p=decodeURIComponent(q.url.split('?')[0]); if(p==='/')p='/index.html'; const f=path.resolve(path.join(root,p)); if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.statusCode=404;return s.end('nf');} s.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream'); s.setHeader('Cache-Control','no-store'); fs.createReadStream(f).pipe(s); }).listen(+process.env.PORT||8765,'127.0.0.1',()=>console.log('up'));

