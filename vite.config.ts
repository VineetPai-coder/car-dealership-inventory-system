import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'client',

  plugins: [react()],

  css: {
    // Vite expects the directory containing postcss.config.js, not the file path.
    postcss: path.resolve('.'),
  },

  build: {
    outDir: '../client/dist',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the Express server during development
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
