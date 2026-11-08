import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync, brotliDecompressSync } from 'node:zlib';
import { resolve } from 'node:path';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceDirectory = process.argv[2] === '--from-directory' ? resolve(process.argv[3]) : undefined;
const inputs = [
  { name: 'compiler', upstream: 'rustc_opt.wasm.br', local: 'rustc-v020.br', sha256: '05b5f6da92ca33981371ea07f300ce927a688da719d9ef113931a2993e06bdd2' },
  { name: 'sysroot', upstream: 'wasm32-wasip1.tar.br', local: 'sysroot-v020.br', sha256: '5c579477e831574ce3fa6abddaa1b9c29543625cd961b298883b5bdeed4191cd' },
];
const manifest = { version: 'rust-wasm-v0.2.0', upstream: 'https://github.com/oligamiq/rust_wasm', assets: {} };
await mkdir('public/toolchain', { recursive: true });
for (const input of inputs) {
  const url = 'https://oligamiq.github.io/rust_wasm/v0.2.0/' + input.upstream;
  console.log('Preparing ' + input.name);
  // curl respects the host's inherited proxy and CA settings.
  const compressed = sourceDirectory ? await readFile(resolve(sourceDirectory, input.local)) : execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', '--max-time', '180', url], { maxBuffer: 100 * 1024 * 1024 });
  if (sha(compressed) !== input.sha256) throw new Error('Upstream hash mismatch: ' + input.upstream);
  const raw = brotliDecompressSync(compressed);
  const gzip = gzipSync(raw, { level: 9 });
  const parts = [];
  for (let offset = 0; offset < gzip.length; offset += 8 * 1024 * 1024) {
    const data = gzip.subarray(offset, offset + 8 * 1024 * 1024);
    const file = input.name + '.' + parts.length + '.gz.part';
    await writeFile('public/toolchain/' + file, data);
    parts.push({ file, bytes: data.length, sha256: sha(data) });
  }
  manifest.assets[input.name] = { bytes: raw.length, gzipBytes: gzip.length, sha256: sha(raw), parts };
}
await writeFile('public/toolchain/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Pinned toolchain assets regenerated and verified.');
