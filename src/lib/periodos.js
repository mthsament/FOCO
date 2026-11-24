import { useEffect, useState } from 'react'

// Períodos do dia para as refeições: manhã até 11h59, tarde de 12h às 18h59, noite a partir das 19h.
export const PERIODOS = [
  { id: 'manha', nome: 'Manhã', ate: 12, keys: ['cafe', 'lancheManha'] },
  { id: 'tarde', nome: 'Tarde', ate: 19, keys: ['almoco', 'pre', 'pos'] }, // lanche da tarde = pré-treino
  { id: 'noite', nome: 'Noite', ate: 24, keys: ['jantar', 'lancheFac'] },
]

export const periodoAgora = (d = new Date()) => PERIODOS.find((p) => d.getHours() < p.ate) || PERIODOS[2]

// Em qual período cai uma refeição: pela chave conhecida ou, se for outra, pelo horário dela
export function periodoDaRefeicao(m) {
  const p = PERIODOS.find((x) => x.keys.includes(m.key))
  if (p) return p
  const h = parseInt(String(m.hora || '').slice(0, 2), 10)
  return Number.isNaN(h) ? PERIODOS[1] : PERIODOS.find((x) => h < x.ate) || PERIODOS[2]
}

// Período atual, reavaliado a cada 30 s e quando o app volta para a tela
export function usePeriodoAgora() {
  const [p, setP] = useState(() => periodoAgora())
  useEffect(() => {
    const atualiza = () => setP((cur) => { const n = periodoAgora(); return n.id === cur.id ? cur : n })
    const t = setInterval(atualiza, 30000)
    document.addEventListener('visibilitychange', atualiza)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', atualiza) }
  }, [])
  return p
}
