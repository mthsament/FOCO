import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Para GitHub Pages o app fica em /FOCO/. Em outro host: BASE=/ npm run build
const base = process.env.BASE || '/FOCO/'

// Versão mostrada em Ajustes: número do package.json + data do build + commit
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
let commit = (process.env.GITHUB_SHA || '').slice(0, 7)
if (!commit) {
  try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { commit = 'local' }
}

// Política de segurança de conteúdo (CSP) + referrer, só no build (no `npm run dev` o Vite precisa de scripts inline).
// O script inline do tema é liberado pelo hash dele, então nenhum outro script inline roda.
function segurancaHtml() {
  return {
    name: 'foco-seguranca-html',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
        const csp = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https:", // https: porque o endereço do worker de lembretes é você quem digita
          "worker-src 'self'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return html.replace('<head>', `<head>
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />`)
      },
    },
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(new Date().toISOString()),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  plugins: [
    react(),
    segurancaHtml(),
    VitePWA({
      registerType: 'prompt', // a nova versão espera o seu OK (botão "Atualizar") em vez de trocar sozinha
      injectRegister: false, // o registro é feito em src/lib/atualizacao.js
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
