// Lê GPX e TCX (exportados do Strava, Fitbeing, Garmin etc.) e devolve a corrida completa:
// { data, min, km, fc, fcMax, subida, trilha, parciais, melhores, obs }.
import { toISO } from './dates.js'
import { analisar } from './corrida.js'

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const tag = (el, name) => el.getElementsByTagNameNS('*', name)
const txt = (el, name) => tag(el, name)[0]?.textContent
const numOuNull = (v) => (v == null || v === '' || !Number.isFinite(+v) ? null : +v)

export function lerGps(texto, nome = '') {
  const doc = new DOMParser().parseFromString(texto, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Arquivo inválido')
  const raiz = doc.documentElement.localName.toLowerCase()
  if (raiz === 'gpx') return lerGpx(doc, nome)
  if (raiz.includes('trainingcenter')) return lerTcx(doc, nome)
  throw new Error('Formato não suportado (use GPX ou TCX)')
}

// Converte pontos em corrida com análise completa
export function corridaDePontos(pts, obs) {
  const a = analisar(pts)
  if (!a) return null
  const { t0, ...resto } = a
  return { data: toISO(new Date(t0)), ...resto, obs }
}

function lerGpx(doc, nome) {
  const pts = [...tag(doc, 'trkpt')].map((p) => {
    const t = txt(p, 'time')
    return { lat: +p.getAttribute('lat'), lon: +p.getAttribute('lon'), t: t ? new Date(t).getTime() : null, ele: numOuNull(txt(p, 'ele')), hr: numOuNull(txt(p, 'hr')) }
  })
  if (pts.length < 2) throw new Error('GPX sem pontos de trajeto')
  const r = corridaDePontos(pts, `Importado de ${nome}`)
  if (!r) throw new Error('O GPX não tem horário nos pontos, então não dá para calcular o ritmo')
  return r
}

function lerTcx(doc, nome) {
  const tps = [...tag(doc, 'Trackpoint')]
  const pts = tps
    .map((p) => {
      const t = txt(p, 'Time')
      const pos = tag(p, 'Position')[0]
      const hrEl = tag(p, 'HeartRateBpm')[0]
      return {
        lat: pos ? numOuNull(txt(pos, 'LatitudeDegrees')) : NaN,
        lon: pos ? numOuNull(txt(pos, 'LongitudeDegrees')) : NaN,
        t: t ? new Date(t).getTime() : null,
        ele: numOuNull(txt(p, 'AltitudeMeters')),
        hr: hrEl ? numOuNull(txt(hrEl, 'Value')) : null,
      }
    })
    .filter((p) => p.lat != null && p.lon != null)
  if (pts.length >= 2) {
    const r = corridaDePontos(pts, `Importado de ${nome}`)
    if (r) return r
  }

  // sem GPS (esteira): usa só os totais das voltas
  const laps = [...tag(doc, 'Lap')]
  if (!laps.length) throw new Error('TCX sem voltas')
  let seg = 0
  let metros = 0
  for (const l of laps) {
    seg += +(txt(l, 'TotalTimeSeconds') || 0)
    metros += +(txt(l, 'DistanceMeters') || 0)
  }
  const hrs = [...tag(doc, 'HeartRateBpm')].map((h) => +(txt(h, 'Value') || 0)).filter(Boolean)
  const t0 = txt(doc, 'Time')
  return {
    data: t0 ? toISO(new Date(t0)) : null,
    min: Math.round((seg / 60) * 10) / 10,
    km: Math.round((metros / 1000) * 100) / 100,
    fc: Math.round(avg(hrs) || 0) || null,
    obs: `Importado de ${nome}`,
  }
}
