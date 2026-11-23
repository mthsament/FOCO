import { aguaDoDia, corridaDoDia, metaAgua, sequencia, sequenciaAgua, statusDia, treinoDoDia } from './metrics.js'

// Escolhe a pose, a animação e a fala do mascote conforme o seu dia.
const MARCOS = [3, 5, 7, 10, 14, 21, 30, 50, 100]
const L = (ml) => (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export function mascoteDoDia(s, iso, hora = new Date().getHours()) {
  const st = statusDia(s, iso)
  const letra = treinoDoDia(s, iso)
  const cor = corridaDoDia(s, iso)
  const ml = aguaDoDia(s, iso)
  const meta = metaAgua(s)
  const aguaOk = ml >= meta
  const treinoFeito = !!s.logs.treinos[iso]?.feito
  const corFeita = cor && (s.logs.corridasFeitas[cor.key] || s.logs.corridas.some((c) => c.data === iso))
  const seqT = sequencia(s, 'treino').atual
  const seqA = sequenciaAgua(s)

  if (st.treino === 'ok' && MARCOS.includes(seqT)) return { pose: 1, anim: 'celebra', fala: `${seqT} dias seguidos de treino! Isso é constância.` }
  if (seqA.hojeOk && MARCOS.includes(seqA.atual)) return { pose: 5, anim: 'celebra', fala: `${seqA.atual} dias seguidos batendo a meta de água!` }
  if (st.treino === 'ok' && aguaOk) return { pose: 1, anim: 'celebra', fala: 'Treino feito e água em dia. Dia ganho!' }
  if (st.treino === 'ok') return { pose: 1, anim: 'pula', fala: 'Treino feito! Agora cuide da dieta e da água.' }
  if (letra && !treinoFeito) return { pose: 4, anim: 'treina', fala: `Hoje é dia de treino ${letra}. Bora levantar peso?` }
  if (cor && !corFeita) return { pose: 2, anim: 'corre', fala: `Dia de corrida: ${cor.sessao.texto}. Cada km conta.` }
  if (aguaOk) return { pose: 5, anim: 'pula', fala: 'Meta de água batida. Hidratação em dia!' }
  if (hora >= 14 && ml < meta * 0.5) return { pose: 5, anim: 'pula', fala: `Só ${L(ml)} L hoje. Faltam ${L(meta - ml)} L, bora beber água!` }
  if (!letra && !cor) return { pose: 6, anim: 'idle', fala: 'Dia de descanso. Alongue um pouco e se hidrate.' }
  return { pose: 3, anim: 'idle', fala: 'Foco no plano de hoje.' }
}
