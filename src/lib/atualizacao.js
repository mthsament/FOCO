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
export const aplicarAtualizacao = () => (atualizarSW ? atualizarSW(true) : location.reload())

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
