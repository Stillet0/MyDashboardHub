import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/MyDashboardHub/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MonHub',
        short_name: 'MonHub',
        description: 'Dashboard personnel : finances, agenda, tâches, habitudes et plus.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#08090b',
        theme_color: '#08090b',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Data lives in the private monhub-data repo via the GitHub API - never cache
        // those requests, only the app shell, so offline always shows the last-synced
        // localStorage snapshot rather than a stale API response.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
