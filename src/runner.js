export function startRun({ toolchain, source, stdin, args, files, onEvent = () => {}, createWorker, compileLimit = 180_000, runLimit = 5_000 }) {
  const factory = createWorker || ((kind) => kind === 'compiler'
    ? new Worker(new URL('./engine.worker.js', import.meta.url), { type: 'module' })
    : new Worker(new URL('./run.worker.js', import.meta.url), { type: 'module' }));
  let active, timer, done = false, stage = 'compile', compileMs = 0;
  let resolveFinished;
  const finished = new Promise(resolve => { resolveFinished = resolve; });
  const settle = (result) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    active?.terminate();
    resolveFinished({ compileMs, ...result });
  };
  const deadline = (limit) => {
    clearTimeout(timer);
    timer = setTimeout(() => settle({ ok: false, stage: 'timeout', message: stage === 'compile' ? 'Compilation exceeded three minutes.' : 'Execution stopped after five seconds.' }), limit);
  };
  const listen = (worker) => {
    worker.onerror = (error) => { error.preventDefault?.(); settle({ ok: false, stage, message: error.message || 'The worker stopped unexpectedly.' }); };
    worker.onmessage = ({ data }) => {
      if (done || active !== worker) return;
      if (data.type === 'compiled') {
        compileMs = data.compileMs;
        onEvent({ type: 'artifact', bytes: data.bytes });
        worker.terminate();
        stage = 'run';
        try {
          active = factory('runtime');
          listen(active);
          deadline(runLimit);
          onEvent({ type: 'phase', phase: 'running', compileMs });
          active.postMessage({ bytes: data.bytes, stdin, args, files });
        } catch (error) { settle({ ok: false, stage, message: error.message }); }
      } else if (data.type === 'result') settle(data);
      else if (data.type === 'failure') settle({ ok: false, stage, ...data });
      else onEvent(data);
    };
  };
  try {
    active = factory('compiler');
    listen(active);
    deadline(compileLimit);
    onEvent({ type: 'phase', phase: 'compiling' });
    active.postMessage({ module: toolchain.module, files: toolchain.files, source });
  } catch (error) { settle({ ok: false, stage, message: error.message }); }
  return { finished, cancel: () => settle({ ok: false, stage: 'cancelled', message: 'Stopped. You can edit and run again.' }) };
}

// Runs a bundled or learner-compiled program without loading the compiler.
export function runBinary({ bytes, stdin = '', args = [], files, onEvent = () => {}, createWorker, runLimit = 5_000 }) {
  let worker, timer, done = false, resolve;
  const finished = new Promise(r => { resolve = r; });
  const settle = result => {
    if (done) return;
    done = true; clearTimeout(timer); worker?.terminate(); resolve(result);
  };
  try {
    worker = createWorker ? createWorker('runtime') : new Worker(new URL('./run.worker.js', import.meta.url), { type: 'module' });
    worker.onerror = error => { error.preventDefault?.(); settle({ ok: false, stage: 'run', message: error.message || 'The worker stopped.' }); };
    worker.onmessage = ({ data }) => {
      if (done) return;
      if (data.type === 'result') settle(data);
      else if (data.type === 'failure') settle({ ok: false, stage: 'run', ...data });
      else onEvent(data);
    };
    timer = setTimeout(() => settle({ ok: false, stage: 'timeout', message: 'Execution stopped after five seconds. Saved files were retained.' }), runLimit);
    worker.postMessage({ bytes, stdin, args, files });
  } catch (error) { settle({ ok: false, stage: 'run', message: error.message }); }
  return { finished, cancel: () => settle({ ok: false, stage: 'cancelled', message: 'Stopped. Saved files were retained.' }) };
}
