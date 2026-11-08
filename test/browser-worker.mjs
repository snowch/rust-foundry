// Browser worker adapter for Node integration tests. No browser or HTTP server.
import { parentPort, workerData, Worker as NodeWorker } from 'node:worker_threads';
import { resolveObjectURL } from 'node:buffer';
import { readFile } from 'node:fs/promises';

globalThis.self = globalThis;
globalThis.crossOriginIsolated = true;
globalThis.fetch = async (input) => {
  const url = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
  if (url.protocol !== 'file:') throw new Error('Network access is disabled in the integration harness.');
  try { return new Response(await readFile(url)); }
  catch { return new Response('Missing test asset', { status: 404 }); }
};
globalThis.postMessage = (data, transfer) => parentPort.postMessage(data, transfer);
globalThis.addEventListener = (type, fn) => { if (type === 'message') parentPort.on('message', data => fn({ data })); };
const pending = [];
parentPort.on('message', data => {
  if (globalThis.onmessage) globalThis.onmessage({ data });
  else pending.push(data);
});

globalThis.Worker = class BrowserWorker {
  constructor(url) {
    this.ready = (async () => {
      const value = String(url);
      const source = value.startsWith('blob:') ? await resolveObjectURL(value).text() : null;
      this.inner = new NodeWorker(new URL(import.meta.url), { workerData: source ? { source } : { url: value } });
      this.inner.on('message', data => { this.onmessage?.({ data }); for (const fn of this.listeners || []) fn({ data }); });
      this.inner.on('error', error => { this.onerror?.(error); console.error('Child worker error:', error); });
    })();
  }
  postMessage(data, transfer) { this.ready.then(() => this.inner.postMessage(data, transfer)); }
  addEventListener(type, fn) { if (type === 'message') (this.listeners ??= []).push(fn); }
  terminate() { this.ready.then(() => this.inner.terminate()); }
};
globalThis.Worker.toString = () => 'function BrowserWorker() { /* Node worker adapter */ }';

if (workerData.source) {
  await import('data:text/javascript;base64,' + Buffer.from(workerData.source).toString('base64'));
} else {
  await import(workerData.url);
}
for (const data of pending) globalThis.onmessage?.({ data });
