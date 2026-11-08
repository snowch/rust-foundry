import { WASIFarmAnimal } from '@oligami/browser_wasi_shim-threads';
import threadUrl from './thread.worker.js?worker&url';
self.onmessage = async ({ data: { module, farm } }) => {
  try {
    const wasi = new WASIFarmAnimal([farm], [
      'rustc', '/main.rs', '--edition=2021', '--sysroot', '/sysroot',
      '--target', 'wasm32-wasip1', '-Ccodegen-units=1', '-Copt-level=0',
      '-Cpanic=abort', '-Clinker-flavor=wasm-ld', '-Clinker=wasm-ld',
      '--color=never', '-o', '/tmp/main.wasm',
    ], ['RUST_MIN_STACK=16777216', 'RUST_BACKTRACE=0'], {
      can_thread_spawn: true,
      thread_spawn_worker_url: new URL(threadUrl, import.meta.url).href,
      thread_spawn_wasm: module,
    });
    await wasi.wait_worker_background_worker();
    wasi.get_share_memory().grow(200);
    const code = await wasi.async_start_on_thread();
    self.postMessage({ code });
  } catch (error) { self.postMessage({ error: error?.message || String(error) }); }
};
