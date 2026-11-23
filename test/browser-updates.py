"""Two-release interrupted download and all-window restart on a headerless host."""
import atexit,functools,hashlib,http.server,json,os,pathlib,re,shutil,subprocess,tempfile,threading
from contextlib import ExitStack
from playwright.sync_api import sync_playwright,expect
root=pathlib.Path(__file__).resolve().parent.parent
resources=ExitStack();atexit.register(resources.close);temp=pathlib.Path(resources.enter_context(tempfile.TemporaryDirectory(prefix='rust-update-')))
def fixture(label):
 target=temp/label;shutil.copytree(root/'dist',target,ignore=shutil.ignore_patterns('releases','release.json','sw.js'))
 html=(target/'index.html').read_text();html=re.sub(r'\./releases/[a-f0-9]{64}/','./',html);html=re.sub(r'<meta name="gpu-base"[^>]*><meta name="gpu-release"[^>]*><script type="module" src="[^"]*offline.mjs"></script>','',html);html=re.sub(r'<button id="app-status-open".*?</button>','<!-- app-status-control -->',html,flags=re.S);html=re.sub(r'<dialog id="app-status-dialog".*?</dialog>','',html,flags=re.S);(target/'index.html').write_text(html.replace('</head>',f'<!-- {label} --></head>'))
 code="import{buildOffline}from './scripts/offline.mjs';console.log(JSON.stringify(await buildOffline(process.argv[1],{commit:process.argv[2].repeat(40),date:'2026-11-23'})));"
 release=json.loads(subprocess.check_output(['node','--input-type=module','-e',code,str(target),label],cwd=root,text=True));return target,release
aroot,a=fixture('a');broot,b=fixture('b');
# This worker deliberately belongs to the old root graph, outside either manifest.
legacy="self.onmessage=()=>self.postMessage({isolated:crossOriginIsolated,shared:typeof SharedArrayBuffer==='function'});"
for folder in [aroot,broot]:(folder/'assets'/'legacy-loader.js').write_text(legacy)
shutil.copytree(aroot/'releases'/a['id'],broot/'releases'/a['id']);current=temp/'current';current.symlink_to(aroot,target_is_directory=True);blocked=set()
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  path=self.path.split('?')[0]
  if path in blocked:self.send_error(503);return
  super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(current)));resources.callback(server.server_close);resources.callback(server.shutdown);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}/'
a['legacyAssets']=[{'path':'assets/legacy-loader.js','bytes':len(legacy.encode()),'sha256':hashlib.sha256(legacy.encode()).hexdigest()}]
(aroot/'release.json').write_text(json.dumps(a))
subprocess.check_call(['node','--input-type=module','-e',"import{retainForPublish}from './scripts/retain-for-publish.mjs';await retainForPublish(process.argv[1],process.argv[2]);",str(broot),base],cwd=root)
for relative in ['assets/legacy-loader.js',f"releases/{a['id']}/assets/legacy-loader.js",f"releases/{b['id']}/assets/legacy-loader.js"]:assert (broot/relative).read_text()==legacy,relative
assert 'assets/legacy-loader.js' not in [file['path'] for file in b['files']]
print('PASS legacy root graph is retained in current and previous immutable trees without changing their download contracts',flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox']);context=browser.new_context();page=context.new_page();page.goto(base+'#course/first-program',wait_until='domcontentloaded');page.wait_for_function('crossOriginIsolated&&!!window.rustFoundryState',timeout=60000)
 result=page.evaluate('''()=>new Promise((resolve,reject)=>{const worker=new Worker('./assets/legacy-loader.js',{type:'module'});const timer=setTimeout(()=>{worker.terminate();reject(Error('Legacy worker did not start'))},10000);worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.onmessage=e=>{clearTimeout(timer);worker.terminate();resolve(e.data);};worker.postMessage({});})''');assert result=={'isolated':True,'shared':True},result
 page.locator('#lesson-code-first-program-worked').fill('fn main(){println!("draft A");}');page.locator('#course-prediction').fill('Print draft A.');page.get_by_label('Mark lesson complete',exact=True).check();other=context.new_page();other.goto(base+'#course/printing');other.wait_for_function('!!window.rustFoundryState');other.locator('#lesson-code-printing-worked').fill('fn main(){println!("draft B");}');page.bring_to_front();page.locator('#app-status-open').click();page.locator('#download-update').click();expect(page.locator('#version-status')).to_contain_text('Downloaded and ready',timeout=180000)
 current.unlink();current.symlink_to(broot,target_is_directory=True);page.locator('#app-status-details').evaluate('(el)=>el.open=true');page.locator('#check-update').click();expect(page.locator('#download-update')).to_have_text('Update offline copy',timeout=30000);blocked.add('/releases/'+b['id']+'/index.html');page.locator('#download-update').click();expect(page.locator('#app-status-error')).not_to_be_empty(timeout=30000);expect(page.locator('#restart-update')).to_be_hidden();context.set_offline(True)
 plane=context.new_page();plane.goto(base+'#course/printing');plane.wait_for_function('crossOriginIsolated&&!!window.rustFoundryState',timeout=60000);expect(plane.locator('#lesson-code-printing-worked')).to_have_value('fn main(){println!("draft B");}');assert plane.locator('meta[name=gpu-release]').get_attribute('content')==a['id'];plane.close();context.set_offline(False);blocked.clear();page.bring_to_front();expect(page.locator('#restart-update')).to_be_visible(timeout=180000)
 other.evaluate("()=>{window.savedSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('blocked snapshot storage')};}");page.locator('#restart-update').click();expect(page.locator('#app-status-error')).not_to_be_empty(timeout=30000);assert page.locator('meta[name=gpu-release]').get_attribute('content')==a['id'];other.evaluate('()=>{Storage.prototype.setItem=window.savedSet;}');page.locator('#restart-update').click()
 for tab in [page,other]:
  tab.wait_for_function('id=>document.querySelector("meta[name=gpu-release]")?.content===id',arg=b['id'],timeout=60000);tab.wait_for_function('!!window.rustFoundryState');tab.evaluate('()=>rustFoundryState.ready')
 expect(page.locator('#lesson-code-first-program-worked')).to_have_value('fn main(){println!("draft A");}');expect(page.locator('#course-prediction')).to_have_value('Print draft A.');expect(page.get_by_label('Mark lesson complete',exact=True)).to_be_checked();expect(other.locator('#lesson-code-printing-worked')).to_have_value('fn main(){println!("draft B");}')
 context.set_offline(True);page.reload();page.wait_for_function('crossOriginIsolated&&!!window.rustFoundryState');expect(page.locator('#lesson-code-first-program-worked')).to_have_value('fn main(){println!("draft A");}');context.close();browser.close();print('PASS interrupted update retains complete A offline; retry stages B; blocked save vetoes restart; two-window commit preserves distinct drafts, prediction and completion; B reloads isolated offline',flush=True)
