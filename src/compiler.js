// One on-demand compiler shared by the lesson cards and the full editor.
let prepared, loading = false;
export function loadCompiler({ signal, onProgress = () => {} } = {}) {
  if (signal?.aborted) return Promise.reject(new DOMException('Stopped. You can run again.', 'AbortError'));
  if (prepared) return Promise.resolve(prepared);
  if (loading) return Promise.reject(new Error('Another program is preparing the compiler. Stop it or wait for it to finish.'));
  loading = true;
  return new Promise((resolve, reject) => {
    let worker, timer, settled = false;
    const abort = () => finish(new DOMException('Stopped. You can edit and run again.', 'AbortError'));
    const finish = (error, result) => {
      if (settled) return;
      settled = true; loading = false; clearTimeout(timer); worker?.terminate();
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else { prepared = result; resolve(result); }
    };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      worker = new Worker(new URL('./loader.worker.js', import.meta.url), { type: 'module' });
      timer = setTimeout(() => finish(new Error('Loading exceeded five minutes. Check your connection and run again.')), 300_000);
      worker.onerror = event => { event.preventDefault(); finish(new Error(event.message || 'Compiler loading failed. Run again to retry.')); };
      worker.onmessage = ({ data }) => {
        if (settled) return;
        if (data.type === 'progress') onProgress(data);
        else if (data.type === 'ready') finish(undefined, { module: data.module, files: data.files });
        else if (data.type === 'failure') finish(new Error(data.message));
      };
      worker.postMessage({ manifestUrl: new URL('./toolchain/manifest.json', document.baseURI).href });
    } catch (error) { finish(error); }
  });
}
