import { defineConfig } from 'vite';

// @oligami/browser_wasi_shim-threads 0.1.1 waits one second for every
// descriptor-map update, even after the mapping is complete. Keep the
// existing atomic acknowledgement and async yield, without that fixed pause.
// Match the pinned distribution exactly so upgrades require an explicit review.
function wasiDescriptorMappingFix() {
  return {
    name: 'wasi-descriptor-mapping-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!id.split('?')[0].endsWith('/@oligami/browser_wasi_shim-threads/dist/browser-wasi-shim-threads.es.js')) return;
      const before = 'this.fds_map[fd].push(wasi_farm_ref_id);}await new Promise(resolve=>setTimeout(resolve,1e3));break}}';
      const after = 'this.fds_map[fd].push(wasi_farm_ref_id);}await Promise.resolve();break}}';
      if (code.split(before).length !== 2) throw new Error('Review the pinned WASI descriptor-map delay patch after a runtime upgrade.');
      return { code: code.replace(before, after), map: null };
    },
  };
}
const isolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
export default defineConfig({
  plugins: [wasiDescriptorMappingFix()],
  optimizeDeps: { exclude: ['@oligami/browser_wasi_shim-threads'] },
  base: './',
  server: { host: '0.0.0.0', headers: isolation },
  preview: { host: '0.0.0.0', headers: isolation },
  worker: { format: 'es', plugins: () => [wasiDescriptorMappingFix()] },
});
