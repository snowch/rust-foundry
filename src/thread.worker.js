import { thread_spawn_on_worker } from '@oligami/browser_wasi_shim-threads';
self.onmessage = async ({ data }) => {
  try { await thread_spawn_on_worker(data); }
  catch (error) { self.postMessage({ msg: 'error', error }); }
};
