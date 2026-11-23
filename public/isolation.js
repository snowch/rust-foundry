// One worker supplies both COOP/COEP and verified offline releases.
(()=>{
 const base=new URL(document.querySelector('meta[name="gpu-base"]')?.content||'./',document.baseURI);
 let resolveReady,rejectReady,reloading=false,registration;
 window.rustIsolationReady=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
 window.rustIsolationReady.catch(()=>{});
 window.rustFoundryIsolationPending=!crossOriginIsolated&&isSecureContext&&!!navigator.serviceWorker;
 async function controlled(){
  if(!navigator.serviceWorker.controller?.scriptURL.endsWith('/sw.js'))return;
  resolveReady(registration);
  if(crossOriginIsolated||reloading)return;
  reloading=true;
  try{
   if(!window.rustFoundryState)await new Promise(resolve=>addEventListener('rust-app-ready',resolve,{once:true}));
   await window.rustFoundryState.ready;
   if(document.readyState!=='complete')await new Promise(resolve=>addEventListener('load',resolve,{once:true}));
   const deadline=Date.now()+30000;
   while(window.rustFoundryApp?.isBusy()&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
   await window.rustFoundryState.save();location.reload();
  }catch(error){
   reloading=false;window.rustFoundryRunner?.recovery.open();
   document.querySelector('#compatibility').textContent='Reload is needed to enable the compiler. '+error.message;
   document.querySelector('#compatibility').hidden=false;
  }
 }
 if(!isSecureContext||!navigator.serviceWorker){rejectReady(Error('A secure context and service workers are required.'));return;}
 navigator.serviceWorker.addEventListener('controllerchange',controlled);
 navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.href,updateViaCache:'none'}).then(reg=>{
  registration=reg;
  const migrate=()=>{if(reg.waiting&&reg.active?.scriptURL.endsWith('/coi-serviceworker.js'))reg.waiting.postMessage({type:'UPGRADE_ISOLATION'});};
  migrate();reg.addEventListener('updatefound',()=>{const installing=reg.installing;installing?.addEventListener('statechange',migrate);});
  controlled();
 }).catch(rejectReady);
})();
