// Canal simples de eventos do mascote.
//   { tipo: 'reagir',   fala, anim }                          -> o mascote da tela Hoje reage (pula, fala)
//   { tipo: 'celebrar', pose, tema, titulo, sub, chama, icone } -> abre a tela de comemoração
const ouvintes = new Set()
export const emitir = (e) => ouvintes.forEach((f) => f(e))
export const ouvir = (f) => {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}
