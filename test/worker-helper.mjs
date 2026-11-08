import { Worker } from 'node:worker_threads';
import { readdir } from 'node:fs/promises';
const assets = await readdir(new URL('../dist/assets/', import.meta.url));
export function createWorker(kind) {
  const name = kind === 'compiler' ? 'engine.worker' : kind === 'loader' ? 'loader.worker' : 'run.worker';
  const asset = assets.find(x => x.startsWith(name + '-') && x.endsWith('.js'));
  if (!asset) throw new Error(`Build before testing: missing ${name}.`);
  const worker = new Worker(new URL('./browser-worker.mjs', import.meta.url), { workerData: { url: new URL('../dist/assets/' + asset, import.meta.url).href } });
  worker.on('message', data => worker.onmessage?.({ data }));
  worker.on('error', error => worker.onerror?.(error));
  return worker;
}
export async function loadToolchain() {
  const worker = createWorker('loader');
  try {
    return await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') resolve(data);
        if (data.type === 'failure') reject(new Error(data.message));
      };
      worker.onerror = reject;
      worker.postMessage({ manifestUrl: new URL('../dist/toolchain/manifest.json', import.meta.url).href });
    });
  } finally { await worker.terminate(); }
}
