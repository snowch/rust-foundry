import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory } from '@bjorn3/browser_wasi_shim';
let used = false;
self.onmessage = async ({ data: { bytes, stdin } }) => {
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
    const module = await WebAssembly.compile(bytes);
    const wasi = new WASI(['main.wasm'], [], [
      new OpenFile(new File(new TextEncoder().encode(stdin))),
      output('stdout', outDecoder), output('stderr', errDecoder),
      new PreopenDirectory('/', new Map()),
    ]);
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    const start = performance.now();
    const exitCode = wasi.start(instance);
    send('result', { ok: exitCode === 0, stage: 'run', stdout, stderr, exitCode, runMs: performance.now() - start });
  } catch (error) { send('failure', { message: error?.message || String(error), stdout, stderr }); }
};
