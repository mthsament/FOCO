import { planWeek } from './dates.js'
import { inicioDoPlano } from './metrics.js'

// Grava uma corrida no estado `x` (rascunho). Se a data cai numa sessão do plano, marca como feita.
export function registrarCorrida(x, reg) {
  x.logs.corridas.push({ id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...reg })
  const c = x.plan.corrida
  const ini = inicioDoPlano(x)
  if (ini && c?.semanas?.length) {
    const w = planWeek(reg.data, ini)
    const dia = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date(reg.data + 'T12:00:00').getDay()]
    if (w >= 1 && w <= c.semanas.length && ['qui', 'sab', 'dom'].includes(dia)) x.logs.corridasFeitas[`${w}|${dia}`] = true
  }
}

export const corridaDuplicada = (x, r) =>
  x.logs.corridas.some((y) => y.data === r.data && Math.abs((y.km || 0) - (r.km || 0)) < 0.05 && Math.abs((y.min || 0) - (r.min || 0)) < 0.5)
