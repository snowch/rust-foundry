// Browser checks for original concept models. Run after the course build.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
 const config=JSON.parse(fs.readFileSync('docs/visual-opportunities.json','utf8'));
 const course=config.course,root=path.resolve(course==='go'?'.build/site':'dist');
 const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.wasm':'application/wasm'};
 const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);let target=path.join(root,pathname);if(!target.startsWith(root+path.sep)&&target!==root){res.writeHead(403).end();return;}try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.end(fs.readFileSync(target));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath()),headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({serviceWorkers:'block'}),errors=[],runtime=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/(?:clang\.gz|rustc.*\.gz|sysroot.*\.(?:gz|bin)|guest-\d+\.bin|disk\.img)/.test(r.url()))runtime.push(r.url());});
 const selected=config.lessons.filter(l=>l.design);
 fs.mkdirSync('test-results',{recursive:true});let states=0;
 for(const width of [390,768,1440])for(const theme of ['light','dark'])for(const lesson of selected){
  const publicURL=new URL(lesson.url),suffix=publicURL.pathname.replace('/'+course+'-foundry/','')+publicURL.search+publicURL.hash;
  await page.setViewportSize({width,height:1000});await page.goto(base+suffix);const figure=page.locator('.learning-model');await figure.waitFor();
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  assert.equal(await figure.count(),1,lesson.id+' duplicate model');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,lesson.id+' page overflow '+width+' '+theme);
  const small=await figure.locator('strong,.lm-index,.lm-tag,.lm-edge-label,.lm-object-label,th,td,.lm-graph-edge').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none'&&parseFloat(getComputedStyle(n).fontSize)<16).map(n=>n.textContent));
  assert.deepEqual(small,[],lesson.id+' small essential type');
  const overlap=await figure.locator('.lm-graph').evaluateAll(graphs=>graphs.flatMap(g=>{const nodes=[...g.querySelectorAll('.lm-vertex')];return nodes.flatMap((a,i)=>nodes.slice(i+1).filter(b=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1;}).map(b=>a.textContent+' overlaps '+b.textContent));}));
  assert.deepEqual(overlap,[],lesson.id+' overlapping graph nodes '+width);
  const description=figure.locator('details').last();await description.locator('summary').click();assert.ok((await description.locator('p').innerText()).length>80,lesson.id+' text equivalent');
  const model=lesson.design;assert.ok(model.question&&model.note&&model.description);
  function check(value){if(value&&typeof value==='object'){if(value.kind==='bytes')assert.equal(value.groups.reduce((n,g)=>n+g.size,0),value.values.length,lesson.id+' byte grouping');if(value.kind==='graph'){const ids=new Set(value.nodes.map(n=>n.id));assert.equal(ids.size,value.nodes.length);for(const e of value.edges){assert.ok(ids.has(e.from)&&ids.has(e.to));assert.notEqual(e.from,e.to);}}Object.values(value).forEach(check);}}
  check(model);
  if(width===768&&theme==='light'&&['copying','dsa-dijkstra','tdb-index-split','moves','unicode','alg-trees','worker-pool','slice-aliases','db-publish','lib-vector-invalidation','ring-buffer','release-acquire-data'].includes(lesson.id))await figure.screenshot({path:'test-results/visual-'+lesson.id.replaceAll('/','-')+'.png'});
  states++;
 }
 assert.deepEqual(errors,[]);assert.deepEqual(runtime,[],'Opening a figure must not download/start the compiler or guest');
 console.log(`PASS ${course}: ${selected.length} curated figures, ${states} viewport/theme states, readable labels, no page overflow or overlapping graph nodes, text equivalents, valid byte groups/edges and no compiler/guest startup`);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
