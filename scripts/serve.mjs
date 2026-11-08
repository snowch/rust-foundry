// Static file serving only. Compilation and execution stay in browser workers.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = http.createServer(async (request, response) => {
  const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Content-Type-Options': 'nosniff' };
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, headers).end(); return; }
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let target = resolve(root, '.' + path);
    if (target !== root && !target.startsWith(root + sep)) { response.writeHead(403, headers).end(); return; }
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
    const bytes = await readFile(target);
    response.writeHead(200, { ...headers, 'Content-Type': types[extname(target)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404, headers).end('Not found'); }
});
server.listen(Number(process.env.PORT || 4173), '0.0.0.0', () => console.log('Rust Foundry: http://localhost:' + server.address().port));
