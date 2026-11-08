import { defineConfig } from 'vite';
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', headers: isolation },
  preview: { host: '0.0.0.0', headers: isolation },
  worker: { format: 'es' },
});
