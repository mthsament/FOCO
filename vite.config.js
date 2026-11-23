import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Para GitHub Pages o app fica em /FOCO/. Em outro host: BASE=/ npm run build
const base = process.env.BASE || '/FOCO/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg', 'mascote/*.png'],
      manifest: {
        name: 'FOCO',
        short_name: 'FOCO',
        description: 'Dieta, treino e corrida num lugar só, com evolução e ofensivas.',
        lang: 'pt-BR',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1b2d',
        theme_color: '#0f1b2d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'], importScripts: ['push-sw.js'] },
    }),
  ],
})
