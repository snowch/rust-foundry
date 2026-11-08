// Uses the exact browser compiler/sysroot shipped with this site. Build Vite first.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createWorker, loadToolchain } from '../test/worker-helper.mjs';
const fullSource = await readFile('native/tinydb.rs', 'utf8');
const source = fullSource.split('\n#[cfg(test)]\nmod tests')[0].trimEnd() + '\n';
const toolchain = await loadToolchain();
const worker = createWorker('compiler');
try {
  const bytes = await new Promise((resolve, reject) => {
    worker.onerror = reject;
    worker.onmessage = ({ data }) => {
      if (data.type === 'compiled') resolve(data.bytes);
      if (data.type === 'diagnostic') process.stderr.write(data.text);
      if (data.type === 'result' || data.type === 'failure') reject(new Error(data.message || 'TinyDB compilation failed.'));
    };
    worker.postMessage({ ...toolchain, source });
  });
  const sha = data => createHash('sha256').update(data).digest('hex');
  await mkdir('public/programs', { recursive: true });
  await writeFile('public/programs/tinydb.rs', source);
  await writeFile('public/programs/tinydb.wasm', bytes);
  await writeFile('public/programs/tinydb.json', JSON.stringify({ version: 1, sourceSha256: sha(source), wasmSha256: sha(bytes), bytes: bytes.length, compiler: 'Vendored rustc/wasm32-wasip1; see toolchain/manifest.json' }, null, 2) + '\n');
  console.log(`Built TinyDB: ${bytes.length} bytes; source ${Buffer.byteLength(source)} bytes.`);
} finally { await worker.terminate(); }
