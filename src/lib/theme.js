// Tema: 'auto' (segue o sistema), 'light' ou 'dark'. A escolha fica no localStorage.
const KEY = 'foco-theme'
const COR = { light: '#0f1b2d', dark: '#08101a' }

export const lerPref = () => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export const resolver = (pref) => (pref === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref)

export function aplicarTema(pref = lerPref()) {
  const t = resolver(pref)
  const el = document.documentElement
  el.dataset.theme = t
  el.style.colorScheme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR[t])
  return t
}

export function salvarPref(pref) {
  try {
    if (pref === 'auto') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  window.dispatchEvent(new CustomEvent('foco-theme'))
  return aplicarTema(pref)
}
