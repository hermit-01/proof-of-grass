import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  // Transformers.js ships its own WebAssembly loader; Vite's dependency pre-bundling breaks it.
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
