import {loadCompiler,releaseCompiler,configureCompiler,observeCompiler,compilerStatus} from './compiler.js';
import {mountRuntimeRecovery} from './runtime-recovery.mjs';
const choices=[5,15,30,60],idleKey='rust-foundry:runner-idle',introKey='rust-foundry:runner-intro:1';
let minutes=30,ack=false,lastUse=0,timer,origin,previousPhase;
try{const saved=Number(localStorage.getItem(idleKey));if(choices.includes(saved))minutes=saved;ack=localStorage.getItem(introKey)==='1';}catch{}
const button=document.getElementById('code-runner-open'),summary=document.getElementById('runner-summary');
const dialog=document.createElement('dialog');dialog.id='code-runner-dialog';dialog.setAttribute('aria-labelledby','runner-title');
dialog.innerHTML=`<div class="status-heading"><h2 id="runner-title">Code runner</h2><button type="button" data-close>Close</button></div><p data-state role="status">Stopped</p><p>The Rust compiler and your programs use this device’s CPU and memory. Keeping the compiler prepared makes later Rust runs faster. Free memory keeps your code, results and saved TinyDB files.</p><label for="runner-idle">Stop after this long without a run</label><select id="runner-idle">${choices.map(n=>`<option value="${n}">${n} minutes</option>`).join('')}</select><p>TinyDB statements use a smaller program and do not need the full compiler.</p><details><summary>Resource measurements</summary><p>A prepared compiler reserves memory. CPU use rises while compiling or running. Browsers do not expose a reliable per-runner CPU percentage or total memory measurement.</p></details><div class="status-actions"><button class="primary" type="button" data-start>Start runner</button><button type="button" data-stop>Free memory</button></div>`;document.body.append(dialog);
const intro=document.createElement('dialog');intro.id='runner-intro';intro.setAttribute('aria-labelledby','runner-intro-title');intro.innerHTML='<h2 id="runner-intro-title">Code runs on your device</h2><p>The Rust compiler and your program use this device’s CPU and memory. The prepared compiler stays ready between lessons and the Rust editor so later runs start faster.</p><p data-time></p><p>Use <strong>Code runner</strong> in the header to change the time or free memory sooner. Your code, results and saved workspace files are kept.</p><button class="primary" type="button" data-continue>Continue run</button><button type="button" data-settings>Runner settings</button>';document.body.append(intro);
const recovery=mountRuntimeRecovery({save:()=>window.rustFoundryState.save(),beforeOpen(){const focus=intro.open?origin:dialog.open?button:document.activeElement;if(intro.open)intro.close('cancel');if(dialog.open)dialog.close();return focus;},runLabel:'Run example or Run code'});
function acknowledge(){ack=true;try{localStorage.setItem(introKey,'1');}catch{}}
function beforeStart({signal,explicit}){
 if(explicit){acknowledge();return Promise.resolve();}if(ack)return Promise.resolve();
 origin=document.activeElement;intro.querySelector('[data-time]').textContent=`It is released after ${minutes} minutes without a run.`;intro.returnValue='';intro.showModal();
 return new Promise((resolve,reject)=>{
  const abort=()=>{if(intro.open)intro.close('cancel');};
  const close=()=>{signal?.removeEventListener('abort',abort);if(intro.returnValue==='continue'&&!signal?.aborted){acknowledge();resolve();}else reject(new DOMException('Run cancelled.','AbortError'));};
  signal?.addEventListener('abort',abort,{once:true});intro.addEventListener('close',close,{once:true});if(signal?.aborted)abort();
 });
}
function render(state=compilerStatus()){
 summary.textContent=state.phase;dialog.querySelector('[data-state]').textContent=state.phase;
 dialog.querySelector('[data-start]').hidden=state.ready;dialog.querySelector('[data-start]').disabled=!crossOriginIsolated||state.loading||state.active>0||state.phase==='Starting';
 dialog.querySelector('[data-stop]').hidden=!state.ready&&!state.loading&&!state.active;
 clearTimeout(timer);if(state.ready&&!state.loading&&!state.active){if(previousPhase!=='Ready')lastUse=Date.now();timer=setTimeout(checkIdle,Math.max(10,minutes*60000-(Date.now()-lastUse)));}previousPhase=state.phase;
}
function free(reason='Stopped'){
 if(intro.open)intro.close('cancel');window.rustFoundryApp?.stopAll();releaseCompiler();window.rustFoundryApp?.releaseCaches();clearTimeout(timer);summary.textContent=reason;dialog.querySelector('[data-state]').textContent=reason;
}
function checkIdle(){const state=compilerStatus();if(!state.ready||state.loading||state.active)return;const left=minutes*60000-(Date.now()-lastUse);if(left<=0)free('Stopped after inactivity');else{clearTimeout(timer);timer=setTimeout(checkIdle,left);}}
configureCompiler({beforeStart,failure:()=>recovery.open()});observeCompiler(render);render();
button.onclick=()=>{origin=button;render();dialog.showModal();};dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>origin?.isConnected&&origin.focus({preventScroll:true}));
dialog.querySelector('[data-start]').onclick=async()=>{try{await loadCompiler({explicit:true});}catch(error){if(error.name!=='AbortError')recovery.open();}};
dialog.querySelector('[data-stop]').onclick=()=>free();
dialog.querySelector('#runner-idle').value=String(minutes);dialog.querySelector('#runner-idle').onchange=event=>{minutes=Number(event.target.value);try{localStorage.setItem(idleKey,String(minutes));}catch{}checkIdle();};
intro.addEventListener('cancel',event=>{event.preventDefault();intro.close('cancel');origin?.focus();});intro.querySelector('[data-continue]').onclick=()=>intro.close('continue');intro.querySelector('[data-settings]').onclick=()=>{intro.close('cancel');dialog.showModal();};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkIdle();});addEventListener('pagehide',()=>free());
window.rustFoundryRunner={free,recovery,status:compilerStatus,get introOpen(){return intro.open;}};
