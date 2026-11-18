import { get, set } from 'idb-keyval'

// Notificações por Web Push. O iPhone só recebe com o app fechado se um servidor (o Worker da pasta /worker)
// disparar o aviso. A URL e a senha do Worker ficam só neste aparelho (fora do backup).
const CFG = 'foco-push-cfg'

export const lerCfg = () => get(CFG).then((c) => c || { url: '', token: '', ativo: false }).catch(() => ({ url: '', token: '', ativo: false }))
export const salvarCfg = (c) => set(CFG, c)

export const suportaPush = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const permissao = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

async function api(cfg, caminho, corpo) {
  const r = await fetch(cfg.url.replace(/\/+$/, '') + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  if (r.status === 401) throw new Error('Senha do servidor incorreta.')
  if (!r.ok) throw new Error(`O servidor respondeu ${r.status}.`)
  return r.json().catch(() => ({}))
}

const chaveBinaria = (b64) => {
  const p = b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4)
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0))
}

// Precisa ser chamado por um toque do usuário (o iOS exige isso para pedir permissão).
export async function ativarPush(cfg, agenda) {
  if (!suportaPush()) throw new Error('Este modo do navegador não recebe notificações. Abra o FOCO pelo ícone da tela de início.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Permissão negada. Libere em Ajustes do iPhone, Notificações, FOCO.')
  const { publicKey } = await api(cfg, '/vapid')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBinaria(publicKey) })
  await api(cfg, '/inscrever', { subscription: sub.toJSON(), agenda })
  await salvarCfg({ ...cfg, ativo: true })
}

export async function desativarPush(cfg) {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    await sub?.unsubscribe()
    await api(cfg, '/cancelar', {})
  } finally {
    await salvarCfg({ ...cfg, ativo: false })
  }
}

export const sincronizarAgenda = (cfg, agenda) => api(cfg, '/agenda', { agenda })
export const enviarProgresso = (cfg, data, ml, meta) => api(cfg, '/progresso', { data, ml, meta })
export const enviarTeste = (cfg) => api(cfg, '/testar', {})
