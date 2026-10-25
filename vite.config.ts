import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'client',

  plugins: [react()],

  css: {
    postcss: path.resolve('../postcss.config.js'),
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
