import {assetURL} from './asset-url.js';
let prepared,pending,loader,abortLoad,phase='Stopped',active=0,preparations=0,beforeStart=async()=>{},failure;
const listeners=new Set();
export function compilerStatus(){return{phase,ready:!!prepared,loading:!!pending,active,preparations};}
export function observeCompiler(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function runtimeFailure(error){failure?.(error);}
export function configureCompiler(hooks){beforeStart=hooks.beforeStart||beforeStart;failure=hooks.failure;}
export function compilerPhase(value){phase=value;for(const fn of listeners)fn(compilerStatus());}
export function enterRun(value){active++;compilerPhase(value);let ended=false;return()=>{if(ended)return;ended=true;active--;compilerPhase(active?'Running':pending?'Starting':prepared?'Ready':'Stopped');};}
export function releaseCompiler(){abortLoad?.();prepared=undefined;compilerPhase(active?'Running':'Stopped');}
export async function loadCompiler({signal,onProgress=()=>{},explicit=false}={}){
 if(signal?.aborted)throw new DOMException('Stopped. You can run again.','AbortError');
 if(prepared)return prepared;
 if(!pending)await beforeStart({signal,explicit});
 if(signal?.aborted)throw new DOMException('Stopped. You can run again.','AbortError');
 if(prepared)return prepared;
 let job=pending;
 if(!pending){
  let resolve,reject;job=pending=new Promise((yes,no)=>{resolve=yes;reject=no;});
  compilerPhase('Starting');preparations++;
  let settled=false;
  const timer=setTimeout(()=>finish(Error('Compiler preparation exceeded five minutes. Check the connection and retry.')),300000);
  function finish(error,result){
   if(settled)return;settled=true;clearTimeout(timer);loader?.terminate();loader=undefined;abortLoad=undefined;pending=undefined;
   if(error){compilerPhase(error.name==='AbortError'?'Stopped':'Could not start');if(error.name!=='AbortError')failure?.(error);reject(error);}
   else{prepared=result;compilerPhase('Ready');resolve(result);}
  }
  abortLoad=()=>finish(new DOMException('Stopped. You can edit and run again.','AbortError'));
  try{
   loader=new Worker(new URL('./loader.worker.js',import.meta.url),{type:'module'});
   loader.onerror=event=>{event.preventDefault();finish(Error(event.message||'The compiler files could not be loaded.'));};
   loader.onmessage=({data})=>{if(settled)return;if(data.type==='progress')onProgress(data);else if(data.type==='ready')finish(undefined,{module:data.module,files:data.files});else if(data.type==='failure')finish(Error(data.message));};
   loader.postMessage({manifestUrl:assetURL('toolchain/manifest.json').href});
  }catch(error){finish(error);}
 }
 if(!job)throw Error('Compiler preparation could not start.');
 const cancel=()=>abortLoad?.();signal?.addEventListener('abort',cancel,{once:true});
 try{return await job;}finally{signal?.removeEventListener('abort',cancel);}
}
