export const FILE_LIMIT = 2 * 1024 * 1024;
export const TOTAL_LIMIT = 8 * 1024 * 1024;
export function validFilename(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(name);
}
export function validateFiles(files) {
  if (!Array.isArray(files) || files.length > 32) throw new Error('The workspace supports up to 32 files.');
  const seen = new Set(); let total = 0;
  for (const entry of files) {
    if (!Array.isArray(entry) || entry.length !== 2) throw new Error('Invalid workspace file.');
    const [name, bytes] = entry;
    if (!validFilename(name) || seen.has(name)) throw new Error('Use unique, simple filenames with letters, numbers, dots, underscores or hyphens.');
    if (!(bytes instanceof Uint8Array) || bytes.length > FILE_LIMIT) throw new Error('Each workspace file must be at most 2 MB.');
    seen.add(name); total += bytes.length;
  }
  if (total > TOTAL_LIMIT) throw new Error('Workspace files exceed the 8 MB limit.');
  return files;
}
