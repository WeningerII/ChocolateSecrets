import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The Gemini API key is no longer injected into the client bundle. All Gemini
// calls are proxied through the geminiGenerate Cloud Function, which holds the
// key in Secret Manager server-side.
export default defineConfig(() => {
  return {
    // GitHub Pages serves a project site under /<repo>/. The deploy workflow sets
    // BASE_PATH=/ChocolateSecrets/; local dev and Firebase Hosting stay at root.
    base: process.env.BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Split only React-FREE vendor libs into their own cacheable chunks.
          // Anything that touches React is left to Vite's default chunking:
          // manually pulling React-dependent modules into separate chunks breaks
          // module init order in the static production build (blank screen,
          // "Cannot set properties of undefined (setting 'Activity')").
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('@google/genai')) return 'genai';
            if (id.includes('@zxing')) return 'zxing';
          },
        },
      },
    },
    server: {
      hmr: false,
    },
  };
});
