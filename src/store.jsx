import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { get, set } from 'idb-keyval'
import { dateOf, planWeek, weekdayKey, DIAS, addDays } from './lib/dates.js'
import { inicioDoPlano } from './lib/metrics.js'

const KEY = 'foco-state-v1'

export const estadoInicial = () => ({
  v: 1,
  perfil: { pesoInicial: null, altura: null, idade: null, sexo: 'M', fatorAtividade: 1.5, deficit: 800, protKg: 1.5, gordKg: 0.6, inicio: null },
  plan: { treinos: null, rodizio: null, regrasTreino: [], obsSemana: [], academiaInicio: null, corrida: null, dieta: null, rotina: [], rotinaFds: [], suplementos: [] },
  logs: {
    treinos: {}, // { [data]: { letra, feito, ex: { [exId]: { kg, sets: [bool] } } } }
    corridasFeitas: {}, // { 'semana|dia': true }
    corridas: [], // { id, data, min, km, fc, esforco, obs, origem }
    pesagens: [], // { data, kg, gordura?, massaMagra?, agua? }
    cintura: [], // { data, cm }
    dieta: {}, // { [data]: { feitas, troca, creatina, whey, agua } }
    resumoSemanal: {},
  },
  meta: { ultimaImportacao: null },
})

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [state, setState] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    let vivo = true
    get(KEY)
      .then((saved) => {
        if (!vivo) return
        const base = estadoInicial()
        setState(saved ? { ...base, ...saved, logs: { ...base.logs, ...saved.logs }, plan: { ...base.plan, ...saved.plan }, perfil: { ...base.perfil, ...saved.perfil } } : base)
      })
      .catch(() => setState(estadoInicial()))
    navigator.storage?.persist?.().catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

  // Salva no IndexedDB (com pequeno atraso para agrupar toques seguidos)
  useEffect(() => {
    if (!state) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => set(KEY, state).catch(() => {}), 250)
  }, [state])

  const update = useCallback((fn) => {
    setState((prev) => {
      const draft = structuredClone(prev)
      const r = fn(draft)
      return r || draft
    })
  }, [])

  const value = useMemo(() => ({ s: state, update, setState }), [state, update])
  if (!state) return <div className="splash">FOCO</div>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// ------------------------------------------------------------------
// Importação: o plano (treinos, dieta, corrida) é substituído pelo da planilha;
// os registros (cargas, treinos feitos, pesagens, corridas...) são mesclados.
// Por padrão não sobrescreve o que você já registrou no app.
export function aplicarImportacao(prev, resultados, { sobrescrever = false } = {}) {
  const s = structuredClone(prev)
  const validos = resultados.filter((r) => r.tipo)

  // 1) perfil e plano
  for (const r of validos) {
    if (r.tipo === 'academia') {
      Object.assign(s.plan, { treinos: r.plan.treinos, rodizio: r.plan.rodizio || s.plan.rodizio, regrasTreino: r.plan.regrasTreino, obsSemana: r.plan.obsSemana || [], academiaInicio: r.plan.academiaInicio || s.plan.academiaInicio })
    } else if (r.tipo === 'corrida') {
      s.plan.corrida = r.plan.corrida
      if (r.plan.corrida.idade && !s.perfil.idade) s.perfil.idade = r.plan.corrida.idade
    } else if (r.tipo === 'alimentacao') {
      for (const [k, v] of Object.entries(r.perfil)) if (v !== null && v !== undefined && v !== '') s.perfil[k] = v
      Object.assign(s.plan, { dieta: r.plan.dieta, rotina: r.plan.rotina, rotinaFds: r.plan.rotinaFds, suplementos: r.plan.suplementos })
    }
  }
  const ini = inicioDoPlano(s)

  // 2) registros
  const put = (obj, key, val) => {
    if (sobrescrever || obj[key] === undefined) obj[key] = val
  }
  for (const r of validos) {
    if (r.tipo === 'academia' && ini) {
      const rod = s.plan.rodizio
      const letraDe = (semana, dia) => (rod ? ((semana - 1) % 2 === 0 ? rod.s1 : rod.s2)[dia] : null)
      for (const c of r.logs.cargas) {
        // carga "S1..S4" -> primeiro dia da semana N em que esse treino cai
        const dia = DIAS.find((d) => letraDe(c.semanaCarga, d) === c.letra) || 'seg'
        const data = dateOf(ini, c.semanaCarga, dia)
        const t = (s.logs.treinos[data] = s.logs.treinos[data] || { letra: c.letra, feito: false, ex: {} })
        t.ex = t.ex || {}
        t.ex[c.exId] = t.ex[c.exId] || {}
        put(t.ex[c.exId], 'kg', c.kg)
      }
      for (const f of r.logs.treinosFeitos) {
        const data = dateOf(ini, f.semana, f.dia)
        const t = (s.logs.treinos[data] = s.logs.treinos[data] || { letra: letraDe(f.semana, f.dia), feito: false, ex: {} })
        if (sobrescrever || !t.feito) t.feito = true
      }
    }
    if (r.tipo === 'corrida') {
      for (const f of r.logs.corridasFeitas) if (!f.resumoSemana) put(s.logs.corridasFeitas, `${f.semana}|${f.dia}`, true)
      for (const f of r.logs.corridasFeitas) if (f.resumoSemana) put(s.logs.resumoSemanal, `c${f.semana}`, { esforco: f.esforco, obs: f.obs })
      for (const c of r.logs.corridas) {
        const igual = s.logs.corridas.findIndex((x) => x.data === c.data && x.min === c.min && x.km === c.km)
        if (igual < 0) s.logs.corridas.push({ id: `imp-${c.data}-${c.min}`, ...c })
      }
    }
    if (r.tipo === 'alimentacao') {
      for (const p of r.logs.pesagens) {
        const i = s.logs.pesagens.findIndex((x) => x.data === p.data)
        if (i < 0) s.logs.pesagens.push(p)
        else if (sobrescrever) s.logs.pesagens[i] = { ...s.logs.pesagens[i], ...p }
      }
      for (const c of r.logs.cintura) {
        const i = s.logs.cintura.findIndex((x) => x.data === c.data)
        if (i < 0) s.logs.cintura.push(c)
        else if (sobrescrever) s.logs.cintura[i] = c
      }
      for (const d of r.logs.creatina) {
        const dia = (s.logs.dieta[d] = s.logs.dieta[d] || {})
        if (sobrescrever || dia.creatina === undefined) dia.creatina = true
      }
      for (const w of r.logs.resumoSemanal) put(s.logs.resumoSemanal, `a${w.semana}`, w)
    }
  }
  s.meta.ultimaImportacao = new Date().toISOString()
  return s
}

export { planWeek, weekdayKey, addDays }
