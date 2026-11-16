// Lê GPX e TCX (exportados do Strava, Fitbeing, Garmin etc.) e devolve { data, min, km, fc }.
import { toISO } from './dates.js'

const rad = (d) => (d * Math.PI) / 180
function haversine(a, b) {
  const R = 6371000
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const tag = (el, name) => el.getElementsByTagNameNS('*', name)

export function lerGps(texto, nome = '') {
  const doc = new DOMParser().parseFromString(texto, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Arquivo inválido')
  const raiz = doc.documentElement.localName.toLowerCase()
  if (raiz === 'gpx') return lerGpx(doc, nome)
  if (raiz.includes('trainingcenter')) return lerTcx(doc, nome)
  throw new Error('Formato não suportado (use GPX ou TCX)')
}

function lerGpx(doc, nome) {
  const pts = [...tag(doc, 'trkpt')].map((p) => ({
    lat: +p.getAttribute('lat'),
    lon: +p.getAttribute('lon'),
    t: tag(p, 'time')[0] ? new Date(tag(p, 'time')[0].textContent).getTime() : null,
    hr: tag(p, 'hr')[0] ? +tag(p, 'hr')[0].textContent : null,
  }))
  if (pts.length < 2) throw new Error('GPX sem pontos de trajeto')
  let m = 0
  for (let i = 1; i < pts.length; i++) m += haversine(pts[i - 1], pts[i])
  const t0 = pts.find((p) => p.t)?.t
  const t1 = [...pts].reverse().find((p) => p.t)?.t
  const min = t0 && t1 ? (t1 - t0) / 60000 : null
  return {
    data: t0 ? toISO(new Date(t0)) : null,
    min: min ? Math.round(min * 10) / 10 : null,
    km: Math.round((m / 1000) * 100) / 100,
    fc: Math.round(avg(pts.map((p) => p.hr).filter(Boolean)) || 0) || null,
    obs: `Importado de ${nome}`,
  }
}

function lerTcx(doc, nome) {
  const laps = [...tag(doc, 'Lap')]
  if (!laps.length) throw new Error('TCX sem voltas')
  let seg = 0
  let metros = 0
  for (const l of laps) {
    seg += +(tag(l, 'TotalTimeSeconds')[0]?.textContent || 0)
    metros += +(tag(l, 'DistanceMeters')[0]?.textContent || 0)
  }
  const hrs = [...tag(doc, 'HeartRateBpm')].map((h) => +(tag(h, 'Value')[0]?.textContent || 0)).filter(Boolean)
  const t0 = tag(doc, 'Time')[0]?.textContent
  return {
    data: t0 ? toISO(new Date(t0)) : null,
    min: Math.round((seg / 60) * 10) / 10,
    km: Math.round((metros / 1000) * 100) / 100,
    fc: Math.round(avg(hrs) || 0) || null,
    obs: `Importado de ${nome}`,
  }
}
