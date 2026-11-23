import {snapshotDraftMemory,restoreDraftMemory} from './drafts.js';
import {resultSnapshot,restoreResults} from './result-state.js';
const marker='rust-foundry:reading-snapshot';let composing=false,lock,timer,restoring=false,reloadReady=false,saving=false;
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
async function database(){const open=indexedDB.open('rust-foundry-restart-v1',1);open.onupgradeneeded=()=>open.result.createObjectStore('snapshots');return request(open);}
async function store(record){
 const db=await database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(record,record.token);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Snapshot could not be saved.'));});
  const saved=await request(db.transaction('snapshots').objectStore('snapshots').get(record.token));if(saved?.token!==record.token)throw Error('The browser did not retain the snapshot.');
 }finally{db.close();}
}
async function discard(token){if(!token)return;const db=await database();try{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').delete(token);}finally{db.close();}}
export function initializeReadingState(app){
 async function save(){
  if(saving||restoring||composing||document.readyState!=='complete'||app.isBusy()||window.rustFoundryRunner.introOpen)throw Error('Finish typing and wait for the current run or file operation to finish.');
  saving=true;const controls=[...document.querySelectorAll('#course-view,#database-view,#practice-view,.header,.mode-nav')],previous=controls.map(node=>node.inert);controls.forEach(node=>node.inert=true);
  try{app.flush();const token=crypto.randomUUID();const record={token,hash:location.hash,scroll:[scrollX,scrollY],app:app.snapshot(),drafts:snapshotDraftMemory(),results:resultSnapshot(),details:[...document.querySelectorAll('main details')].map((node,index)=>[index,node.open]),feedback:[...document.querySelectorAll('.prediction [role=status]')].map(node=>[node.textContent,node.className])};
  await store(record);sessionStorage.setItem(marker,token);if(sessionStorage.getItem(marker)!==token)throw Error('This window could not save its place. Keep it open and export your work before reloading.');reloadReady=true;setTimeout(()=>{reloadReady=false;},2000);return token;}finally{saving=false;controls.forEach((node,index)=>node.inert=previous[index]);}
 }
 async function restore(){
  const token=sessionStorage.getItem(marker);if(!token)return;restoring=true;const views=[...document.querySelectorAll('main')];views.forEach(node=>node.inert=true);
  try{const db=await database();let record;try{record=await request(db.transaction('snapshots').objectStore('snapshots').get(token));}finally{db.close();}
   if(record?.hash!==location.hash){sessionStorage.removeItem(marker);await discard(token);return;}
   restoreDraftMemory(record.drafts);restoreResults(record.results);await app.restore(record.app);
   const nodes=[...document.querySelectorAll('main details')];for(const[index,open]of record.details||[])if(nodes[index])nodes[index].open=open;
   document.querySelectorAll('.prediction [role=status]').forEach((node,index)=>{const value=record.feedback?.[index];if(value){node.textContent=value[0];node.className=value[1];}});
   requestAnimationFrame(()=>scrollTo(...record.scroll));sessionStorage.removeItem(marker);
   const clean=await database();try{const tx=clean.transaction('snapshots','readwrite');tx.objectStore('snapshots').delete(token);}finally{clean.close();}
  }catch(error){window.rustFoundryRunner.recovery.open();throw error;}
  finally{restoring=false;views.forEach(node=>node.inert=false);}
 }
 function unlock(abort=false){if(abort){const token=sessionStorage.getItem(marker);sessionStorage.removeItem(marker);discard(token).catch(()=>{});}clearTimeout(timer);lock=null;document.querySelectorAll('#course-view,#database-view,#practice-view,.header,.mode-nav').forEach(node=>node.inert=false);}
 document.addEventListener('compositionstart',()=>composing=true);document.addEventListener('compositionend',()=>composing=false);
 navigator.serviceWorker?.addEventListener('message',async({data,ports})=>{
  if(data?.type==='PREPARE_RESTART')try{if(lock)throw Error('This window is already restarting.');lock=data.token;document.querySelectorAll('#course-view,#database-view,#practice-view,.header,.mode-nav').forEach(node=>node.inert=true);const token=await save();if(lock!==data.token){if(sessionStorage.getItem(marker)===token)sessionStorage.removeItem(marker);throw Error('The restart request expired. Try again.');}timer=setTimeout(()=>unlock(true),12000);ports[0].postMessage({ready:true});}catch(error){unlock();ports[0].postMessage({ready:false,error:error.message});}
  if(data?.type==='ABORT_RESTART'&&data.token===lock){unlock(true);}
  if(data?.type==='COMMIT_RESTART'&&data.token===lock)location.reload();
 });
 const ready=restore();window.rustFoundryState={save,ready,get canReload(){return reloadReady||!!lock;}};ready.catch(()=>{}).finally(()=>dispatchEvent(new Event('rust-app-ready')));return ready;
}
