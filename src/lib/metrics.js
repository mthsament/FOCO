import { DIAS, addDays, dateOf, diffDays, fromISO, mondayOf, planWeek, todayISO, weekdayKey } from './dates.js'

export const inicioDoPlano = (s) => s.perfil.inicio || s.plan.corrida?.inicio || s.plan.academiaInicio || null

// ---------- Metas calculadas (mesmas fórmulas da planilha: Mifflin-St Jeor) ----------
export function metas(perfil) {
  const { pesoInicial: peso, altura, idade, sexo, fatorAtividade, deficit, protKg, gordKg } = perfil
  if (!peso || !altura || !idade) return null
  const tmb = 10 * peso + 6.25 * altura * 100 - 5 * idade + (String(sexo).toUpperCase() === 'M' ? 5 : -161)
  const gasto = tmb * (fatorAtividade || 1.5)
  const meta = gasto - (deficit || 0)
  const prot = peso * (protKg || 1.5)
  const gord = peso * (gordKg || 0.6)
  const carb = (meta - prot * 4 - gord * 9) / 4
  return { imc: peso / altura ** 2, tmb, gasto, meta, prot, gord, carb, perdaSemanal: ((deficit || 0) * 7) / 7700 }
}

// ---------- O que o plano diz para uma data ----------
export function treinoDoDia(s, iso) {
  const r = s.plan.rodizio
  const ini = inicioDoPlano(s)
  if (!r || !ini) return null
  const w = planWeek(iso, ini)
  if (w < 1) return null
  const par = ((w - 1) % 2 === 0 ? r.s1 : r.s2)
  return par[weekdayKey(iso)] || null
}

export function corridaDoDia(s, iso) {
  const c = s.plan.corrida
  const ini = inicioDoPlano(s)
  if (!c?.semanas?.length || !ini) return null
  const w = planWeek(iso, ini)
  const dia = weekdayKey(iso)
  if (w < 1 || w > c.semanas.length || !['qui', 'sab', 'dom'].includes(dia)) return null
  const sem = c.semanas.find((x) => x.sem === w)
  return sem ? { semana: w, dia, sessao: sem[dia], fase: sem.fase, meta: sem.meta, key: `${w}|${dia}` } : null
}

export function refeicoesDoDia(s, iso) {
  const d = s.plan.dieta
  if (!d) return []
  const dia = weekdayKey(iso)
  const log = s.logs.dieta[iso] || {}
  const out = []
  for (const m of d.distribuicao) {
    const planejado = d.cardapio?.[dia]?.[m.key]
    const cod = log.troca?.[m.key] ?? planejado ?? null
    if (m.key === 'lancheFac' && !cod) continue
    const livre = cod && /livre/i.test(cod)
    const opt = (d.opcoes[m.key] || []).find((o) => o.cod === cod)
    out.push({
      ...m,
      cod,
      desc: livre ? 'Refeição livre (sem neura, regra 80/20)' : opt?.desc || '',
      feita: !!log.feitas?.[m.key],
    })
  }
  return out
}

// ---------- Resultado de um dia ----------
export function statusDia(s, iso, hoje = todayISO()) {
  const ini = inicioDoPlano(s)
  const out = { treino: 'rest', dieta: 'rest', creatina: 'rest' }
  if (!ini || diffDays(iso, mondayOf(ini)) < 0) return out
  const futuro = iso > hoje
  const isHoje = iso === hoje
  const pend = (ok) => (ok ? 'ok' : futuro || isHoje ? 'pending' : 'miss')

  const letra = treinoDoDia(s, iso)
  const cor = corridaDoDia(s, iso)
  const planejados = []
  if (letra) planejados.push(!!s.logs.treinos[iso]?.feito)
  if (cor) planejados.push(!!s.logs.corridasFeitas[cor.key] || s.logs.corridas.some((c) => c.data === iso))
  if (planejados.length) out.treino = pend(planejados.every(Boolean))

  const refs = refeicoesDoDia(s, iso).filter((m) => !m.opcional)
  if (refs.length) out.dieta = pend(refs.filter((m) => m.feita).length / refs.length >= 0.8)

  out.creatina = pend(!!s.logs.dieta[iso]?.creatina)
  return out
}

// Sequência atual e melhor sequência. 'rest' é neutro; 'pending' (hoje) não quebra; 'miss' quebra.
export function sequencia(s, tipo, hoje = todayISO()) {
  const ini = inicioDoPlano(s)
  if (!ini) return { atual: 0, melhor: 0 }
  const inicio = ini
  const total = diffDays(hoje, inicio)
  let atual = 0
  let melhor = 0
  let corrente = 0
  for (let i = 0; i <= total; i++) {
    const iso = addDays(inicio, i)
    const st = statusDia(s, iso, hoje)[tipo]
    if (st === 'ok') {
      corrente++
      melhor = Math.max(melhor, corrente)
    } else if (st === 'miss') corrente = 0
  }
  atual = corrente
  return { atual, melhor }
}

// ---------- Água ----------
export const META_AGUA_PADRAO = 3500
export const metaAgua = (s) => s.perfil.metaAgua || META_AGUA_PADRAO
export const aguaDoDia = (s, iso) => s.logs.dieta[iso]?.agua || 0

// Ofensiva de água: dias seguidos batendo a meta. Hoje ainda em andamento não quebra a sequência.
// Começa no primeiro dia em que você registrou água (não depende do plano).
export function sequenciaAgua(s, hoje = todayISO()) {
  const meta = metaAgua(s)
  const dias = Object.keys(s.logs.dieta).filter((d) => s.logs.dieta[d]?.agua > 0 && d <= hoje).sort()
  if (!dias.length) return { atual: 0, melhor: 0, hojeOk: false }
  const total = diffDays(hoje, dias[0])
  let corrente = 0
  let melhor = 0
  for (let i = 0; i <= total; i++) {
    const iso = addDays(dias[0], i)
    if (aguaDoDia(s, iso) >= meta) {
      corrente++
      melhor = Math.max(melhor, corrente)
    } else if (iso !== hoje) corrente = 0
  }
  return { atual: corrente, melhor, hojeOk: aguaDoDia(s, hoje) >= meta }
}

// Aderência dos últimos N dias (somente dias com algo planejado)
export function aderencia(s, tipo, dias = 7, hoje = todayISO()) {
  let ok = 0
  let tot = 0
  for (let i = dias - 1; i >= 0; i--) {
    const iso = addDays(hoje, -i)
    const st = statusDia(s, iso, hoje)[tipo]
    if (st === 'ok') {
      ok++
      tot++
    } else if (st === 'miss') tot++
  }
  return tot ? ok / tot : null
}

// ---------- Peso e composição ----------
export const pesagensOrdenadas = (s) => [...s.logs.pesagens].sort((a, b) => a.data.localeCompare(b.data))

export function pesoAtual(s) {
  const p = pesagensOrdenadas(s)
  return p.length ? p[p.length - 1].kg : s.perfil.pesoInicial
}

export function pesoSemanal(s) {
  const ini = inicioDoPlano(s)
  if (!ini) return []
  const g = {}
  for (const p of s.logs.pesagens) {
    const w = planWeek(p.data, ini)
    ;(g[w] = g[w] || []).push(p.kg)
  }
  return Object.keys(g)
    .map(Number)
    .sort((a, b) => a - b)
    .map((w) => ({ semana: w, kg: +(g[w].reduce((a, b) => a + b, 0) / g[w].length).toFixed(2) }))
}

// ---------- Corrida ----------
export const ritmo = (min, km) => (min && km ? min / km : null)
export const fmtRitmo = (r) => {
  if (!r) return '–'
  const m = Math.floor(r)
  const sec = Math.round((r - m) * 60)
  return `${m}:${String(sec === 60 ? 0 : sec).padStart(2, '0')}`
}
export const fmtDur = (min) => {
  if (min == null) return '–'
  const h = Math.floor(min / 60)
  const m = Math.floor(min % 60)
  const s = Math.round((min - Math.floor(min)) * 60)
  return h ? `${h}h${String(m).padStart(2, '0')}` : s ? `${m}min ${String(s).padStart(2, '0')}s` : `${m} min`
}

export function kmPorSemana(s) {
  const ini = inicioDoPlano(s)
  if (!ini) return []
  const g = {}
  for (const c of s.logs.corridas) {
    if (!c.km) continue
    const w = planWeek(c.data, ini)
    g[w] = (g[w] || 0) + c.km
  }
  return Object.keys(g)
    .map(Number)
    .sort((a, b) => a - b)
    .map((w) => ({ semana: w, km: +g[w].toFixed(2) }))
}

// ---------- Cargas por exercício ----------
export function historicoCarga(s, exId) {
  return Object.entries(s.logs.treinos)
    .map(([data, t]) => ({ data, kg: t.ex?.[exId]?.kg }))
    .filter((x) => typeof x.kg === 'number' && x.kg > 0)
    .sort((a, b) => a.data.localeCompare(b.data))
}
export const ultimaCarga = (s, exId, antesDe = '9999-99-99') => {
  const h = historicoCarga(s, exId).filter((x) => x.data < antesDe)
  return h.length ? h[h.length - 1].kg : null
}

export { DIAS, dateOf, fromISO }
