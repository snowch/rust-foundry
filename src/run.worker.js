import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from '@bjorn3/browser_wasi_shim';
import { validateFiles } from './files.js';
let used = false;
self.onmessage = async ({ data: { bytes, stdin = '', args = [], files } }) => {
  if (used) return;
  used = true;
  let stdout = '', stderr = '', outputBytes = 0;
  const outDecoder = new TextDecoder(), errDecoder = new TextDecoder();
  const send = (type, payload) => self.postMessage({ type, ...payload });
  const output = (channel, decoder) => new ConsoleStdout((data) => {
    outputBytes += data.length;
    if (outputBytes > 100_000) throw new Error('Output exceeded the 100 KB limit.');
    const text = decoder.decode(data, { stream: true });
    if (channel === 'stdout') stdout += text; else stderr += text;
    send(channel, { text });
  });
  try {
    if (!Array.isArray(args) || args.length > 16 || args.some(x => typeof x !== 'string' || x.length > 100_000)) throw new Error('Invalid program arguments.');
    const root = new PreopenDirectory('/', new Map((files ? validateFiles(files) : []).map(([name, data]) => [name, new File(data)])));
    const module = await WebAssembly.compile(bytes);
    const wasi = new WASI(['main.wasm', ...args], [], [
      new OpenFile(new File(new TextEncoder().encode(stdin))),
      output('stdout', outDecoder), output('stderr', errDecoder),
      root,
    ]);
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    const start = performance.now();
    const exitCode = wasi.start(instance);
    const snapshot = files ? validateFiles([...root.dir.contents].map(([name, file]) => {
      if (!(file instanceof File)) throw new Error('The workspace supports files in one directory.');
      return [name, file.data];
    })) : undefined;
    send('result', { ok: exitCode === 0, stage: 'run', stdout, stderr, exitCode, files: snapshot, runMs: performance.now() - start });
  } catch (error) { send('failure', { message: error?.message || String(error), stdout, stderr }); }
};
