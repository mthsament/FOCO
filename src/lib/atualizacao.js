import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

// Atualização do app (PWA). A versão nova é baixada em segundo plano e fica esperando:
// aparece o aviso "Nova versão disponível" e só troca quando você toca em Atualizar.

export const VERSAO = {
  numero: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
  build: typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '',
  commit: typeof __APP_COMMIT__ !== 'undefined' ? __APP_COMMIT__ : '',
}

let estado = { nova: false, dispensada: false }
let atualizarSW = null
let registro = null
const ouvintes = new Set()
const mudar = (p) => {
  estado = { ...estado, ...p }
  ouvintes.forEach((f) => f())
}

export function iniciarSW() {
  atualizarSW = registerSW({
    immediate: true,
    onNeedRefresh: () => mudar({ nova: true, dispensada: false }),
    onRegisteredSW: (_url, reg) => {
      registro = reg || null
      if (reg) setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000) // confere a cada 30 min
      // Versão nova que ficou esperando de uma abertura anterior: aplica agora, logo ao abrir o app
      // (ainda não há nada em edição). No máximo uma vez por sessão, para nunca entrar em ciclo.
      if (reg?.waiting) {
        try {
          if (sessionStorage.getItem('foco-auto-atualizou')) return
          sessionStorage.setItem('foco-auto-atualizou', '1')
        } catch { /* sem sessionStorage: segue sem a trava */ }
        aplicarAtualizacao()
      }
    },
  })
  // ao voltar para o app, confere se há versão nova
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registro?.update().catch(() => {})
  })
}

export const useAtualizacao = () =>
  useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f) }, () => estado)

export const dispensar = () => mudar({ dispensada: true })
// Troca para a versão nova e recarrega. Não depende só do reload automático da biblioteca (que em alguns casos
// troca o service worker mas deixa a tela antiga aberta): escuta a troca, recarrega e, se nada acontecer em
// poucos segundos, limpa o cache do app e recarrega (os seus dados não são tocados).
export async function aplicarAtualizacao() {
  let feito = false
  const recarregar = () => { if (!feito) { feito = true; location.reload() } }
  navigator.serviceWorker?.addEventListener('controllerchange', recarregar, { once: true })
  const reg = registro || (await navigator.serviceWorker?.getRegistration?.().catch(() => null))
  if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  else if (atualizarSW) atualizarSW(false)
  else return recarregar()
  setTimeout(() => { if (!feito) liberarCache().catch(recarregar) }, 3000)
}

// Procura versão nova agora. Retorna 'nova' | 'atual' | 'indisponivel'.
export async function buscarAtualizacao() {
  if (!registro) return 'indisponivel'
  await registro.update()
  const instalando = registro.installing
  if (instalando) {
    await new Promise((fim) => {
      const f = () => ['installed', 'activated', 'redundant'].includes(instalando.state) && (instalando.removeEventListener('statechange', f), fim())
      instalando.addEventListener('statechange', f)
      setTimeout(fim, 12000)
    })
  }
  if (registro.waiting || estado.nova) {
    mudar({ nova: true, dispensada: false })
    return 'nova'
  }
  return 'atual'
}

// Apaga o cache e o service worker deste site e recarrega. NÃO mexe nos seus dados
// (IndexedDB e localStorage ficam intactos). Desfaz a inscrição de notificações.
export async function liberarCache() {
  const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []
  await Promise.all(regs.map((r) => r.unregister()))
  const chaves = (await globalThis.caches?.keys?.()) || []
  await Promise.all(chaves.map((k) => caches.delete(k)))
  location.reload()
}
