// require-corp works on Safari as well as Chromium. All assets are same-origin.
window.coi = { coepCredentialless: () => false, coepDegrade: () => false, quiet: true };
window.rustFoundryIsolationPending = !window.crossOriginIsolated && window.isSecureContext &&
  !!navigator.serviceWorker && !navigator.serviceWorker.controller;
if (navigator.serviceWorker) {
  // Claiming an already-open page takes effect for isolation on its next navigation.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!window.crossOriginIsolated) window.location.reload();
  }, { once: true });
}
