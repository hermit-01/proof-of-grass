import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Proof of Grass',
        short_name: 'Grass',
        description: 'A walking pact you prove with a photo quest, checked on your phone.',
        theme_color: '#1f6b3a',
        background_color: '#f4f6ef',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell, the worker bundle and embeds.json, so a photo check works with no signal.
        // The model files are not precached: Transformers.js keeps them in Cache Storage itself.
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        navigateFallback: '/index.html',
        // Never answer an API address with the app shell.
        navigateFallbackDenylist: [/^\/api\//],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  worker: { format: 'es' },
  // Transformers.js ships its own WebAssembly loader; Vite's dependency pre-bundling breaks it.
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  server: { proxy: { '/api': 'http://localhost:3000' } },
});
