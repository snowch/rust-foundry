import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { readdir } from 'node:fs/promises';
import { startRun, runBinary } from '../src/runner.js';
import { examples, matchesOutput } from '../src/examples.js';

const assets = await readdir(new URL('../dist/assets/', import.meta.url));
const url = (name) => new URL('../dist/assets/' + assets.find(x => x.startsWith(name + '-') && x.endsWith('.js')), import.meta.url).href;
function workerAt(path) {
  const worker = new Worker(new URL('./browser-worker.mjs', import.meta.url), { workerData: { url: path } });
  worker.on('message', data => worker.onmessage?.({ data }));
  worker.on('error', error => worker.onerror?.(error));
  return worker;
}
const createWorker = kind => workerAt(url(kind === 'compiler' ? 'engine.worker' : 'run.worker'));
async function load() {
  const worker = workerAt(url('loader.worker'));
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

test('real production Wasm toolchain and worker lifecycle', { timeout: 240_000 }, async t => {
  const toolchain = await load();
  assert.equal(toolchain.files.length, 30);
  assert.equal(toolchain.total, 57_789_547);
  await t.test('standard library uses one shared buffer across compiler workers', () => {
    assert.equal(new Set(toolchain.files.map(([, bytes]) => bytes.buffer)).size, 1);
    assert.ok(toolchain.files[0][1].buffer instanceof SharedArrayBuffer);
  });
  let artifact;
  const source = `use std::io::{self, Read};
fn main() {
  let mut input = String::new();
  io::stdin().read_to_string(&mut input).unwrap();
  let mut words = input.split_whitespace();
  match words.next().unwrap_or("hello") {
    "sum" => println!("{}", words.map(|word| word.parse::<i64>().unwrap()).sum::<i64>()),
    "unicode" => print!("café 🦀"),
    "exit" => std::process::exit(7),
    "panic" => panic!("intentional test panic"),
    "limit" => print!("{}", "x".repeat(100_001)),
    "loop" => { println!("started"); loop { std::hint::spin_loop(); } },
    "file" => { assert!(std::fs::read_to_string("transient").is_err()); std::fs::write("transient", "test").unwrap(); println!("fresh filesystem"); },
    "persist" => { let old = std::fs::read_to_string("saved").unwrap_or_default(); std::fs::write("saved", format!("{old}+new")).unwrap(); println!("{}", std::env::args().nth(1).unwrap()); },
    "writepanic" => { std::fs::write("saved", "bad snapshot").unwrap(); panic!("intentional write panic"); },
    "writeloop" => { std::fs::write("saved", "bad snapshot").unwrap(); loop { std::hint::spin_loop(); } },
    "largefile" => { std::fs::write("large", vec![0u8; 2_097_153]).unwrap(); },
    _ => { let message = String::from("Hello, Rust!"); let borrowed = &message; println!("{borrowed}"); }
  }
}`;
  await t.test('compile, link and execute arbitrary Rust locally with stdin', async () => {
    const events = [];
    const task = startRun({ toolchain, source, stdin: 'sum 19 23', createWorker,
      onEvent: data => { events.push(data.type); if (data.type === 'artifact') artifact = data.bytes; },
    });
    const result = await task.finished;
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.stdout, '42\n');
    assert.equal(result.exitCode, 0);
    assert.ok(result.compileMs < 20_000, `Compilation took ${result.compileMs}ms; check the descriptor-mapping delay regression.`);
    assert.ok(artifact instanceof Uint8Array);
    assert.deepEqual([...artifact.slice(0, 4)], [0, 97, 115, 109]);
    assert.ok(events.includes('artifact'));
  });

  const execute = (stdin, { timeout = 5_000, cancelOnOutput = false } = {}) => new Promise((resolve, reject) => {
    const worker = createWorker('runtime');
    let output = '';
    const timer = setTimeout(() => { worker.terminate(); resolve({ stage: 'timeout', stdout: output }); }, timeout);
    worker.onerror = error => { clearTimeout(timer); worker.terminate(); reject(error); };
    worker.onmessage = ({ data }) => {
      if (data.type === 'stdout') {
        output += data.text;
        if (cancelOnOutput) { clearTimeout(timer); worker.terminate(); resolve({ stage: 'cancelled', stdout: output }); }
      }
      if (['result', 'failure'].includes(data.type)) { clearTimeout(timer); worker.terminate(); resolve(data); }
    };
    worker.postMessage({ bytes: artifact, stdin });
  });
  await t.test('prints real output and preserves Unicode without a trailing newline', async () => {
    assert.equal((await execute('hello')).stdout, 'Hello, Rust!\n');
    assert.equal((await execute('unicode')).stdout, 'café 🦀');
  });
  await t.test('handles nonzero exits and panic diagnostics', async () => {
    const exit = await execute('exit');
    assert.equal(exit.ok, false); assert.equal(exit.exitCode, 7);
    const panic = await execute('panic');
    assert.equal(panic.type, 'failure'); assert.match(panic.stderr, /intentional test panic/);
  });
  await t.test('enforces an output cap even without newlines', async () => {
    const limit = await execute('limit');
    assert.equal(limit.type, 'failure'); assert.match(limit.message, /100 KB/);
  });
  await t.test('cancels an actual infinite loop and permits a subsequent run', async () => {
    assert.equal((await execute('loop', { cancelOnOutput: true })).stage, 'cancelled');
    assert.equal((await execute('loop', { timeout: 150 })).stage, 'timeout');
    assert.equal((await execute('sum 2 3')).stdout, '5\n');
  });
  await t.test('program files reset between runs', async () => {
    assert.equal((await execute('file')).stdout, 'fresh filesystem\n');
    assert.equal((await execute('file')).stdout, 'fresh filesystem\n');
  });
  await t.test('persistent filesystem snapshots include writes only after normal exits', async () => {
    const options = { bytes: artifact, createWorker, files: [['saved', new TextEncoder().encode('original')]], args: ['café'] };
    const result = await runBinary({ ...options, stdin: 'persist' }).finished;
    assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(result.stdout, 'café\n');
    assert.equal(new TextDecoder().decode(result.files[0][1]), 'original+new');
    for (const stdin of ['writepanic', 'largefile']) {
      const failed = await runBinary({ ...options, stdin }).finished;
      assert.equal(failed.ok, false); assert.equal(failed.files, undefined);
    }
    const timed = await runBinary({ ...options, stdin: 'writeloop', runLimit: 150 }).finished;
    assert.equal(timed.stage, 'timeout'); assert.equal(timed.files, undefined);
    const cancelled = runBinary({ ...options, stdin: 'writeloop' }); cancelled.cancel();
    assert.equal((await cancelled.finished).stage, 'cancelled'); assert.equal((await cancelled.finished).files, undefined);
    assert.equal(new TextDecoder().decode(options.files[0][1]), 'original');
  });
  await t.test('real borrow checker rejects moved values without a Wasm artifact', async () => {
    let diagnostics = '', emitted = false;
    const result = await startRun({ toolchain, source: examples.find(x => x.id === 'borrow').source, stdin: '', createWorker,
      onEvent: data => { if (data.type === 'diagnostic') diagnostics += data.text; if (data.type === 'artifact') emitted = true; },
    }).finished;
    assert.equal(result.ok, false); assert.equal(result.stage, 'compile');
    assert.match(diagnostics, /E0382/); assert.match(diagnostics, /borrow of moved value/); assert.equal(emitted, false);
  });
  await t.test('successive edits compile correctly without descriptor-mapping stalls', async () => {
    for (const value of [17, 29, 43]) {
      const result = await startRun({ toolchain,
        source: `fn main() { let value = ${value}; println!("{}", value * 2); }`,
        stdin: '', createWorker,
      }).finished;
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.stdout, `${value * 2}\n`);
      assert.ok(result.compileMs < 20_000, `Successive compilation stalled: ${result.compileMs}ms`);
    }
  });
  await t.test('Stop during compilation terminates the real compiler worker tree', async () => {
    const task = startRun({ toolchain, source, stdin: '', createWorker });
    await new Promise(resolve => setTimeout(resolve, 150));
    task.cancel();
    assert.equal((await task.finished).stage, 'cancelled');
  });
});

test('output checks normalize line endings but retain meaningful content', () => {
  assert.equal(matchesOutput('Hello, Rust!\r\n', 'Hello, Rust!\n'), true);
  assert.equal(matchesOutput('42\n', '43\n'), false);
  assert.equal(matchesOutput(' 42\n', '42\n'), false);
});
