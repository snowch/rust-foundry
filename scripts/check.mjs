import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { readSysroot } from '../src/tar.js';
for (const folder of ['src', 'scripts', 'test']) {
  for (const file of await readdir(folder)) {
    if (/\.m?js$/.test(file)) execFileSync(process.execPath, ['--check', folder + '/' + file]);
  }
}
const manifest = JSON.parse(await readFile('public/toolchain/manifest.json', 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [name, asset] of Object.entries(manifest.assets)) {
  const chunks = [];
  for (const part of asset.parts) {
    const bytes = await readFile('public/toolchain/' + part.file);
    assert.equal(bytes.length, part.bytes); assert.equal(sha(bytes), part.sha256);
    assert.ok(bytes.length <= 8 * 1024 * 1024); chunks.push(bytes);
  }
  const compressed = Buffer.concat(chunks);
  assert.equal(compressed.length, asset.gzipBytes);
  const raw = gunzipSync(compressed);
  assert.equal(raw.length, asset.bytes); assert.equal(sha(raw), asset.sha256);
  if (name === 'sysroot') assert.equal(readSysroot(raw).length, 30);
  if (name === 'compiler') assert.ok(WebAssembly.validate(raw));
}
const html = await readFile('index.html', 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]));
const app = await readFile('src/app.js', 'utf8');
for (const [, id] of app.matchAll(/\$\('([a-z-]+)'\)/g)) assert.ok(ids.has(id), 'Missing DOM element: ' + id);
const css = await readFile('src/style.css', 'utf8');
assert.ok(!/https?:\/\//.test(css), 'Fonts must be local');
const headers = await readFile('public/_headers', 'utf8');
assert.match(headers, /Cross-Origin-Opener-Policy: same-origin/);
assert.match(headers, /Cross-Origin-Embedder-Policy: require-corp/);
console.log('Syntax, UI element references, toolchain integrity, static asset sizes, and isolation configuration passed.');
