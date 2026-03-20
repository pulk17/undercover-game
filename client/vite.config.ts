import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Undercover',
        short_name: 'Undercover',
        theme_color: '#E8C547',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        // Runtime cache rules
        runtimeCaching: [
          // CacheFirst: existing word pairs rule (7-day expiry)
          {
            urlPattern: /\/api\/v1\/words\/pairs(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'word-pairs-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                maxEntries: 10,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // CacheFirst: Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                maxEntries: 10,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // CacheFirst: Google Fonts static assets
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                maxEntries: 20,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // StaleWhileRevalidate: word categories
          {
            urlPattern: /\/api\/v1\/words\/categories(\?.*)?$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'word-categories-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24, // 1 day
                maxEntries: 5,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // NetworkOnly: auth endpoints
          {
            urlPattern: /\/api\/v1\/auth\/.*/,
            handler: 'NetworkOnly',
          },
          // NetworkOnly: Socket.IO
          {
            urlPattern: /\/socket\.io\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@undercover/shared': path.resolve(__dirname, '../shared/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['@sentry/react', '@sentry/core'],
  },
  server: {
    allowedHosts: ['unwitnessed-peg-spherulate.ngrok-free.dev'],
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
