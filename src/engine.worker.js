import { WASIFarm } from '@oligami/browser_wasi_shim-threads';
import { File, OpenFile, Directory, PreopenDirectory, ConsoleStdout } from '@bjorn3/browser_wasi_shim';

const encoder = new TextEncoder();
let used = false;
self.onmessage = async ({ data }) => {
  if (used) return;
  used = true;
  const { module, files, source } = data;
  let diagnostics = '';
  const send = (type, payload = {}) => self.postMessage({ type, ...payload });
  const diagnosticDecoder = new TextDecoder();
  const diagnosticFd = () => new ConsoleStdout((bytes) => {
    const text = diagnosticDecoder.decode(bytes, { stream: true });
    if (diagnostics.length + text.length > 100_000) {
      send('failure', { message: 'Compiler diagnostics exceeded 100 KB.' });
      return;
    }
    diagnostics += text;
    send('diagnostic', { text });
  });
  try {
    const libs = new Directory([]);
    for (const [path, bytes] of files) {
      const parts = path.split('/');
      let dir = libs;
      for (const part of parts.slice(0, -1)) {
        if (!dir.contents.has(part)) dir.contents.set(part, new Directory([]));
        dir = dir.contents.get(part);
      }
      const file = new File(new Uint8Array(), { readonly: true });
      file.data = bytes;
      dir.contents.set(parts.at(-1), file);
    }
    const tmp = new Directory([]);
    const root = new Map([
      ['main.rs', new File(encoder.encode(source))],
      ['tmp', tmp],
      ['sysroot', new Directory([['lib', new Directory([['rustlib', new Directory([
        ['wasm32-wasip1', new Directory([['lib', libs]])],
      ])]])]])],
    ]);
    const farm = new WASIFarm(
      new OpenFile(new File(new Uint8Array())),
      diagnosticFd(),
      diagnosticFd(),
      [new PreopenDirectory('/', root)],
      { allocator_size: 64 * 1024 * 1024 },
    );
    send('phase', { phase: 'compiling' });
    const compileStart = performance.now();
    const compiler = new Worker(new URL('./compiler.worker.js', import.meta.url), { type: 'module' });
    const code = await new Promise((resolve, reject) => {
      compiler.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.code);
      compiler.onerror = (error) => reject(new Error(error.message || 'Compiler worker failed.'));
      compiler.postMessage({ module, farm: farm.get_ref() });
    });
    compiler.terminate();
    const compileMs = performance.now() - compileStart;
    const artifact = tmp.contents.get('main.wasm');
    if (code !== 0 || !(artifact instanceof File)) {
      send('result', { ok: false, stage: 'compile', exitCode: code, diagnostics, compileMs });
      return;
    }
    const bytes = artifact.data.slice();
    send('compiled', { bytes, diagnostics, compileMs });
  } catch (error) {
    send('failure', { message: error?.message || String(error), diagnostics });
  }
};
