// Canal simples de eventos do mascote.
//   { tipo: 'reagir',   fala, anim }                          -> o mascote da tela Hoje reage (pula, fala)
//   { tipo: 'celebrar', pose, tema, titulo, sub, chama, icone } -> abre a tela de comemoração
const ouvintes = new Set()
export const emitir = (e) => ouvintes.forEach((f) => f(e))
// Atalho: o mascote reage com uma animação e uma fala (sorteada, se for uma lista)
export const reagir = (anim, falas) => emitir({ tipo: 'reagir', anim, fala: Array.isArray(falas) ? falas[Math.floor(Math.random() * falas.length)] : falas })
export const ouvir = (f) => {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}
