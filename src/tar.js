// Read the small, regular-file-only sysroot archive after integrity verification.
export function readSysroot(buffer) {
  const bytes = ArrayBuffer.isView(buffer) ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) : new Uint8Array(buffer);
  const decoder = new TextDecoder();
  // Browser TextDecoder rejects SharedArrayBuffer views. Copy only each tiny
  // header field; library contents remain views of the shared archive.
  const string = (offset, length) => decoder.decode(bytes.slice(offset, offset + length)).split('\0')[0];
  const files = [];
  for (let offset = 0; offset + 512 <= bytes.length;) {
    const name = string(offset, 100);
    if (!name) break;
    const prefix = string(offset + 345, 155);
    const path = prefix ? prefix + '/' + name : name;
    const size = parseInt(string(offset + 124, 12).trim() || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > bytes.length) throw new Error('Truncated standard library archive.');
    if (path.startsWith('/') || path.split('/').includes('..')) throw new Error('Invalid standard library path.');
    if (/\.(rlib|o|a)$/.test(path)) files.push([path, bytes.subarray(offset + 512, offset + 512 + size)]);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  if (!files.some(([name]) => name.startsWith('libstd-')) || !files.some(([name]) => name === 'self-contained/libc.a')) throw new Error('The standard library is incomplete.');
  return files;
}
