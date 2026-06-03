import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// The Gemini API key is no longer injected into the client bundle. All Gemini
// calls are proxied through the geminiGenerate Cloud Function, which holds the
// key in Secret Manager server-side.
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split large, stable vendor libs into their own cacheable chunks so the
          // main bundle shrinks and these rarely-changing deps cache across deploys.
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('@google/genai')) return 'genai';
            if (id.includes('@zxing')) return 'zxing';
            if (id.includes('react-big-calendar')) return 'calendar';
            if (id.includes('motion')) return 'motion';
            if (id.includes('react')) return 'react';
            return 'vendor';
          },
        },
      },
    },
    server: {
      hmr: false,
    },
  };
});
