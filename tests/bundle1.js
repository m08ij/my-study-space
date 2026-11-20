/* النشر المجمّع: يبني الحزمة بمجلد مؤقت ويشغّل الموقع منها (jsdom) ويتحقق من سلامتها */
const fs=require('fs'),path=require('path'),cp=require('child_process'),os=require('os');
const src=path.resolve(__dirname,'..'); const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ssb-'));
fs.readdirSync(src).filter(f=>/\.(html|js|css|json)$/.test(f)&&!/^package/.test(f)).forEach(f=>fs.copyFileSync(path.join(src,f),path.join(tmp,f)));
['css','icons','fonts'].forEach(d=>{ fs.mkdirSync(path.join(tmp,d)); fs.readdirSync(path.join(src,d)).forEach(f=>fs.copyFileSync(path.join(src,d,f),path.join(tmp,d,f))); });
const r=cp.spawnSync(process.execPath,[path.join(src,'tools','bundle.js'),tmp],{encoding:'utf8'});
process.env.SS_ROOT=tmp; const {boot}=require('./e2elib'); const sl=ms=>new Promise(x=>setTimeout(x,ms));
(async()=>{
 const o={}; o.B_built=r.status===0&&/bundle: \d+ ملف/.test(r.stdout);
 const html=fs.readFileSync(path.join(tmp,'index.html'),'utf8'), sw=fs.readFileSync(path.join(tmp,'sw.js'),'utf8'), bundle=fs.readFileSync(path.join(tmp,'app.bundle.js'),'utf8');
 o.B_oneScriptTag=(html.match(/<script src="[^"h][^"]*\.js[^"]*"><\/script>/g)||[]).length===1&&/app\.bundle\.js\?v=\d+/.test(html);
 o.B_orderKept=['core.js','diag.js','data.js','features.js','daily.js','app.js'].every((f,i,a)=>!i||bundle.indexOf('===== '+f)>bundle.indexOf('===== '+a[i-1]));
 o.B_swUpdated=/app\.bundle\.js\?v=\d+/.test(sw)&&!/'\.\/features\.js'/.test(sw)&&/'\.\/manifest\.json'/.test(sw);
 const bm=/var BUILD = '(\d+)'/.exec(html)[1]; o.B_buildMatches=new RegExp("APP_BUILD\\s*=\\s*['\"]"+bm+"['\"]").test(bundle)&&new RegExp('ss-cache-v'+bm).test(sw);
 o.B_vendorLazy=bundle.indexOf('===== vendor-')<0&&!/vendor-supabase\.js"><\/script>/.test(html)&&/'\.\/vendor-supabase\.js'/.test(sw)&&fs.existsSync(path.join(tmp,'vendor-supabase.js'))&&/libReady/.test(bundle);
 o.B_lazyModules=['ics-import.js','share.js'].every(f=>bundle.indexOf('===== '+f)<0&&html.indexOf(f+'"></script>')<0&&sw.indexOf("'./"+f+"'")>-1&&fs.existsSync(path.join(tmp,f))&&fs.statSync(path.join(tmp,f)).size<fs.statSync(path.join(src,f)).size)&&/withModule/.test(bundle);
 o.B_cssFontsUrl=!/url\(\.\.\/fonts/.test(fs.readFileSync(path.join(tmp,'app.bundle.css'),'utf8'))&&/url\(fonts\/tajawal-arabic-400\.woff2\)/.test(fs.readFileSync(path.join(tmp,'app.bundle.css'),'utf8'))&&fs.existsSync(path.join(tmp,'fonts','tajawal-arabic-400.woff2'));
 const pb=require('../tools/perf-budget.js').check(tmp); o.B_perfBudget=pb.ok; if(!pb.ok) o.B_perfRows=pb.rows.filter(x=>!x.ok).map(x=>x.name+' '+Math.round(x.size/1024)+'KB>'+Math.round(x.limit/1024));
 const {w,errs}=boot({welcomeDone:'true',space:JSON.stringify({courses:[],tasks:[{id:'t1',title:'واجب',course:'',due:'2099-01-01',done:false}],exams:[],attendance:{},grades:[],timetable:{},profile:{name:'T'},decks:[],budget:[],completedCourses:[],currentSemester:1})}); await sl(2400);
 o.B_boots=w.APP_BUILD===bm&&!!w.Daily&&!!w.DiagLog&&typeof w.renderDashboard==='function';
 w.switchTab('tasks',false); await sl(150); o.B_renders=/واجب/.test((w.document.querySelector('#fxMain')||{}).textContent||'');
 o.errs=errs.filter(e=>!/offline|Not implemented|Could not parse/i.test(e)); console.log(JSON.stringify(o,null,1));
 try{ fs.rmSync(tmp,{recursive:true,force:true}); }catch(e){} process.exit(0);
})();
