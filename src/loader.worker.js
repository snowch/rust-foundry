import { readSysroot } from './tar.js';
const hex = (bytes) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const digest = async (bytes) => hex(await crypto.subtle.digest('SHA-256', bytes));

self.onmessage = async ({ data: { manifestUrl } }) => {
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error('The compiler manifest could not be loaded.');
    const manifest = await response.json();
    const assets = Object.values(manifest.assets);
    const total = assets.reduce((n, a) => n + a.gzipBytes, 0);
    let loaded = 0;
    let cache;
    try { cache = await caches.open('rust-foundry-' + manifest.version); } catch { /* Works without persistent cache. */ }
    const report = (label, cacheHit = false) => self.postMessage({ type: 'progress', loaded, total, label, cacheHit });
    const getAsset = async (name, label) => {
      const asset = manifest.assets[name];
      const chunks = [];
      for (const part of asset.parts) {
        const url = new URL(part.file, manifestUrl);
        if (url.origin !== new URL(manifestUrl).origin) throw new Error('Toolchain files must come from this site.');
        let result = await cache?.match(url);
        let cacheHit = !!result;
        if (!result) result = await fetch(url);
        if (!result.ok) throw new Error('Could not download ' + part.file + '. Try loading the compiler again.');
        const reader = result.body.getReader();
        const pieces = [];
        let count = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pieces.push(value); count += value.length; loaded += value.length; report(label, cacheHit);
        }
        const bytes = new Uint8Array(count);
        let offset = 0;
        for (const piece of pieces) { bytes.set(piece, offset); offset += piece.length; }
        if (count !== part.bytes || await digest(bytes) !== part.sha256) {
          await cache?.delete(url);
          throw new Error('A compiler download failed its integrity check. Try loading again.');
        }
        if (!cacheHit) { try { await cache?.put(url, new Response(bytes)); } catch { /* Quota/private browsing: memory-only. */ } }
        chunks.push(bytes);
      }
      report('Preparing ' + label.toLowerCase());
      const raw = await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      if (raw.byteLength !== asset.bytes || await digest(raw) !== asset.sha256) throw new Error('Compiler integrity verification failed.');
      return raw;
    };
    const prepareCompiler = async () => {
      const compiler = await getAsset('compiler', 'Rust compiler');
      report('Preparing WebAssembly compiler');
      return WebAssembly.compile(compiler);
    };
    const module = await prepareCompiler();
    const library = await getAsset('sysroot', 'Standard library');
    // Keep one shared, read-only sysroot across the tab and compiler workers.
    // This avoids cloning 74 MB for every run and copying every archive entry.
    const sharedLibrary = new SharedArrayBuffer(library.byteLength);
    new Uint8Array(sharedLibrary).set(new Uint8Array(library));
    const files = readSysroot(sharedLibrary);
    report('Ready to compile');
    self.postMessage({ type: 'ready', module, files, total });
  } catch (error) { self.postMessage({ type: 'failure', message: error?.message || String(error) }); }
};
