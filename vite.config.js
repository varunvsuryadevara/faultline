import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run dev`   -> Vite on :5173, proxying /api to the Express server on :8787
// `npm run build` -> dist/, served by `npm start` on :8787
// `--mode artifact` -> one self-contained HTML file that asks Claude through the claude.ai runtime
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.PORT || '8787';
  const artifact = mode === 'artifact';

  return {
    plugins: [react(), tailwindcss(), ...(artifact ? [viteSingleFile()] : [])],
    server: {
      port: 5173,
      proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
    },
    build: {
      outDir: artifact ? 'dist-artifact' : 'dist',
      emptyOutDir: true,
      // The scenario library (266 scenarios) is one ~880 kB chunk (about 270 kB gzipped), loaded
      // only when the library is opened and warmed in the background on the start page.
      chunkSizeWarningLimit: 1200,
      rollupOptions: artifact
        ? {}
        : {
            output: {
              manualChunks(id) {
                if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
                  return 'pdf-engine';
                }
                if (id.includes('node_modules/jszip')) {
                  return 'zip-engine';
                }
                if (id.includes('node_modules/lucide-react')) {
                  return 'icons';
                }
              },
            },
          },
    },
  };
});
