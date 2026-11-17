// Análise de corridas: trilha, parciais por km, melhores esforços, recordes (PR) e medalhas.
// Formato guardado em cada corrida (compacto, cabe no IndexedDB):
//   trilha:   [[lat, lon, segundos, altitude, fc, distânciaM], ...]  (até ~350 pontos)
//   parciais: [{ km, seg, fc, subida }]   (km = distância do trecho; o último pode ser parcial)
//   melhores: { '1000': seg, '5000': seg, ... }  menor tempo para cada distância dentro da corrida
//   subida, fcMax, movSeg

export const DISTANCIAS = [
  [1000, '1 km'],
  [1609, '1 milha'],
  [3000, '3 km'],
  [5000, '5 km'],
  [10000, '10 km'],
  [15000, '15 km'],
  [21097, 'Meia maratona'],
]
export const nomeDist = (m) => DISTANCIAS.find((d) => d[0] === Number(m))?.[1] || `${m} m`

const rad = (d) => (d * Math.PI) / 180
export function haversine(a, b) {
  const R = 6371000
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

// pts: [{ lat, lon, t (ms), ele?, hr? }]
export function analisar(pts) {
  const p = []
  for (const x of pts) {
    if (!Number.isFinite(x.lat) || !Number.isFinite(x.lon) || !x.t) continue
    if (p.length && x.t <= p[p.length - 1].t) continue
    p.push(x)
  }
  if (p.length < 2) return null
  const t0 = p[0].t
  const d = [0]
  const s = [0]
  for (let i = 1; i < p.length; i++) {
    d.push(d[i - 1] + haversine(p[i - 1], p[i]))
    s.push((p[i].t - t0) / 1000)
  }
  const total = d[d.length - 1]
  const dur = s[s.length - 1]

  // tempo em movimento: ignora trechos parados (< 0,5 m/s)
  let mov = 0
  for (let i = 1; i < p.length; i++) {
    const dt = s[i] - s[i - 1]
    const v = (d[i] - d[i - 1]) / dt
    if (v >= 0.5 || dt < 1) mov += dt
  }

  // tempo (s) em que a distância acumulada chegou a x metros (interpolado)
  const tempoEm = (x) => {
    let lo = 0
    let hi = d.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (d[mid] < x) lo = mid + 1
      else hi = mid
    }
    if (lo === 0) return s[0]
    const f = (x - d[lo - 1]) / (d[lo] - d[lo - 1] || 1)
    return s[lo - 1] + f * (s[lo] - s[lo - 1])
  }

  // parciais por km
  const parciais = []
  let ini = 0
  for (let m = 1000; ; m += 1000) {
    const fim = Math.min(m, total)
    if (fim - ini < 50) break
    const a = tempoEm(ini)
    const b = tempoEm(fim)
    const idx = []
    for (let i = 0; i < p.length; i++) if (d[i] >= ini && d[i] <= fim) idx.push(i)
    const hrs = idx.map((i) => p[i].hr).filter(Boolean)
    let sub = 0
    for (let k = 1; k < idx.length; k++) {
      const e0 = p[idx[k - 1]].ele
      const e1 = p[idx[k]].ele
      if (e0 != null && e1 != null && e1 > e0) sub += e1 - e0
    }
    parciais.push({ km: Math.round(((fim - ini) / 1000) * 100) / 100, seg: Math.round(b - a), fc: hrs.length ? Math.round(hrs.reduce((x, y) => x + y, 0) / hrs.length) : null, subida: Math.round(sub) })
    ini = fim
    if (fim >= total) break
  }

  // melhores esforços (janela deslizante)
  const melhores = {}
  for (const [D] of DISTANCIAS) {
    if (total < D) continue
    let best = Infinity
    let i = 0
    for (let j = 0; j < d.length; j++) {
      if (d[j] < D) continue
      // início da janela: maior i com d[i] <= d[j] - D
      while (i + 1 < j && d[i + 1] <= d[j] - D) i++
      const tIni = s[i] + ((d[j] - D - d[i]) / (d[i + 1] - d[i] || 1)) * (s[i + 1] - s[i])
      const dt = s[j] - tIni
      if (dt > 0 && dt < best) best = dt
    }
    if (Number.isFinite(best)) melhores[D] = Math.round(best)
  }

  // ganho de elevação com histerese (ignora ruído < 2 m)
  const eles = p.map((x) => x.ele).filter((e) => e != null)
  let subida = 0
  if (eles.length > 2) {
    const sm = eles.map((_, i) => {
      const w = eles.slice(Math.max(0, i - 2), i + 3)
      return w.reduce((a, b) => a + b, 0) / w.length
    })
    let ref = sm[0]
    for (const e of sm) {
      if (e - ref >= 2) { subida += e - ref; ref = e }
      else if (ref - e >= 2) ref = e
    }
  }
  const hrAll = p.map((x) => x.hr).filter(Boolean)

  // trilha compacta
  const N = 350
  const passo = Math.max(1, Math.ceil(p.length / N))
  const trilha = []
  for (let i = 0; i < p.length; i += passo) trilha.push(linha(p, d, s, i))
  if ((p.length - 1) % passo !== 0) trilha.push(linha(p, d, s, p.length - 1))

  return {
    km: Math.round((total / 1000) * 100) / 100,
    min: Math.round((dur / 60) * 10) / 10,
    movSeg: Math.round(mov),
    fc: hrAll.length ? Math.round(hrAll.reduce((a, b) => a + b, 0) / hrAll.length) : null,
    fcMax: hrAll.length ? Math.max(...hrAll) : null,
    subida: Math.round(subida),
    t0,
    trilha,
    parciais,
    melhores,
  }
}

const linha = (p, d, s, i) => [
  Math.round(p[i].lat * 1e5) / 1e5,
  Math.round(p[i].lon * 1e5) / 1e5,
  Math.round(s[i]),
  p[i].ele != null ? Math.round(p[i].ele * 10) / 10 : null,
  p[i].hr || null,
  Math.round(d[i]),
]

export const fmtSeg = (seg) => {
  if (seg == null || !Number.isFinite(seg)) return '–'
  const h = Math.floor(seg / 3600)
  const m = Math.floor((seg % 3600) / 60)
  const s = Math.round(seg % 60)
  const ss = String(s === 60 ? 0 : s).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
export const fmtPace = (segPorKm) => (segPorKm ? fmtSeg(segPorKm) : '–')

// ---------- Recordes (PR) ----------
// Melhor tempo de cada distância por corrida. Corridas sem trilha só valem se tiverem
// distância muito próxima da marca (até 5% a mais): aí usa-se o ritmo médio.
export function melhoresDe(c) {
  if (c.melhores && Object.keys(c.melhores).length) return c.melhores
  const out = {}
  if (c.km && c.min) {
    for (const [D] of DISTANCIAS) {
      const km = D / 1000
      if (c.km >= km && c.km <= km * 1.05) out[D] = Math.round(c.min * 60 * (km / c.km))
    }
  }
  return out
}

const ordem = (a, b) => a.data.localeCompare(b.data) || String(a.id).localeCompare(String(b.id))

// { atuais: {dist:{seg,id,data}}, porCorrida: {id:[{dist,seg,anterior}]}, historico: {dist:[{data,seg,pr}]} }
export function recordes(corridas) {
  const lista = [...corridas].sort(ordem)
  const atuais = {}
  const porCorrida = {}
  const historico = {}
  for (const c of lista) {
    const m = melhoresDe(c)
    for (const [D, seg] of Object.entries(m)) {
      const ant = atuais[D]
      const pr = !ant || seg < ant.seg
      ;(historico[D] = historico[D] || []).push({ data: c.data, seg, pr })
      if (pr) {
        if (ant) (porCorrida[c.id] = porCorrida[c.id] || []).push({ dist: Number(D), seg, anterior: ant.seg })
        else (porCorrida[c.id] = porCorrida[c.id] || []).push({ dist: Number(D), seg, anterior: null })
        atuais[D] = { seg, id: c.id, data: c.data }
      }
    }
  }
  const maisLonga = lista.reduce((m, c) => (c.km && (!m || c.km > m.km) ? { km: c.km, id: c.id, data: c.data } : m), null)
  const maiorSubida = lista.reduce((m, c) => (c.subida && (!m || c.subida > m.subida) ? { subida: c.subida, id: c.id, data: c.data } : m), null)
  return { atuais, porCorrida, historico, maisLonga, maiorSubida }
}

// ---------- Medalhas ----------
const semanaISO = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  const dia = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dia)
  return d.toISOString().slice(0, 10)
}

export function medalhas(corridas) {
  const lista = [...corridas].filter((c) => c.km).sort(ordem)
  const out = []
  const marco = (id, nome, desc, icone, ganho) => out.push({ id, nome, desc, icone, ganhoEm: ganho || null })

  marco('primeira', 'Primeira corrida', 'Registre sua primeira corrida', 'corrida', lista[0]?.data)
  for (const [km, nome] of [[3, '3 km'], [5, '5 km'], [10, '10 km'], [21.1, 'Meia maratona']]) {
    const c = lista.find((x) => x.km >= km)
    marco(`dist-${km}`, `Primeiros ${nome}`, `Corra ${nome} de uma vez`, 'rota', c?.data)
  }

  // distância acumulada
  const acum = [25, 50, 100, 250, 500, 1000]
  let soma = 0
  const quando = {}
  for (const c of lista) {
    soma += c.km
    for (const a of acum) if (soma >= a && !quando[a]) quando[a] = c.data
  }
  for (const a of acum) {
    const m = { id: `acum-${a}`, nome: `${a} km no total`, desc: `Some ${a} km correndo`, icone: 'medalha', ganhoEm: quando[a] || null }
    if (!m.ganhoEm) m.progresso = Math.min(1, soma / a)
    out.push(m)
  }

  // subida
  const mont = lista.find((c) => (c.subida || 0) >= 100)
  marco('montanha', 'Montanha', 'Suba 100 m ou mais em uma corrida', 'montanha', mont?.data)

  // constância: semanas seguidas com pelo menos 2 corridas
  const porSemana = {}
  for (const c of lista) porSemana[semanaISO(c.data)] = (porSemana[semanaISO(c.data)] || 0) + 1
  const semanas = Object.keys(porSemana).filter((w) => porSemana[w] >= 2).sort()
  let seq = 0
  let melhorSeq = 0
  let fim4 = null
  for (let i = 0; i < semanas.length; i++) {
    const seguida = i > 0 && (new Date(semanas[i]) - new Date(semanas[i - 1])) / 86400000 === 7
    seq = seguida ? seq + 1 : 1
    if (seq > melhorSeq) melhorSeq = seq
    if (seq >= 4 && !fim4) fim4 = semanas[i]
  }
  const m4 = { id: 'const-4', nome: 'Quatro semanas firmes', desc: 'Corra 2 vezes ou mais por semana, 4 semanas seguidas', icone: 'chama', ganhoEm: fim4 }
  if (!fim4) m4.progresso = Math.min(1, melhorSeq / 4)
  out.push(m4)

  // recordes pessoais conquistados
  const rec = recordes(corridas)
  for (const [D, nome] of [[1000, '1 km'], [5000, '5 km'], [10000, '10 km']]) {
    const r = rec.atuais[D]
    marco(`pr-${D}`, `Recorde de ${nome}`, `Bata sua melhor marca nos ${nome}`, 'trofeu', r?.data)
  }
  return out
}

// ---------- Resumos ----------
export function resumoPeriodo(corridas, dias) {
  const lim = new Date()
  lim.setDate(lim.getDate() - dias)
  const iso = lim.toISOString().slice(0, 10)
  const l = corridas.filter((c) => c.data >= iso && c.km)
  return { n: l.length, km: l.reduce((a, c) => a + c.km, 0), min: l.reduce((a, c) => a + (c.min || 0), 0), subida: l.reduce((a, c) => a + (c.subida || 0), 0) }
}

export function kmPorMes(corridas) {
  const g = {}
  for (const c of corridas) if (c.km) g[c.data.slice(0, 7)] = (g[c.data.slice(0, 7)] || 0) + c.km
  return Object.keys(g).sort().map((k) => ({ mes: k.slice(5) + '/' + k.slice(2, 4), km: Math.round(g[k] * 10) / 10 }))
}
