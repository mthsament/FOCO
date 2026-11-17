import { useMemo } from 'react'

// Mapa da rota em SVG, sem baixar mapas de fora (funciona offline e não envia sua localização a ninguém).
// A linha muda de cor com o ritmo: azul = mais lento, laranja = mais rápido.
const LENTO = [90, 168, 255]
const RAPIDO = [255, 92, 28]
const mix = (a, b, f) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`

export function projetar(trilha, W = 600, maxH = 420, pad = 28) {
  const lats = trilha.map((p) => p[0])
  const lons = trilha.map((p) => p[1])
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2
  const k = Math.cos((lat0 * Math.PI) / 180)
  const xs = lons.map((l) => l * k)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...lats)
  const maxY = Math.max(...lats)
  const w = Math.max(maxX - minX, 1e-6)
  const h = Math.max(maxY - minY, 1e-6)
  const esc = Math.min((W - pad * 2) / w, (maxH - pad * 2) / h)
  const H = Math.round(h * esc + pad * 2)
  const ox = (W - w * esc) / 2
  return { W, H, pts: trilha.map((_, i) => [ox + (xs[i] - minX) * esc, pad + (maxY - lats[i]) * esc]) }
}

export default function RotaMapa({ trilha, altura = 420, mini = false, className = '' }) {
  const g = useMemo(() => {
    if (!trilha || trilha.length < 2) return null
    const { W, H, pts } = mini ? projetar(trilha, 300, 190, 14) : projetar(trilha, 600, altura, 28)
    // velocidade por trecho (m/s), suavizada em janela de 3 trechos
    const v = []
    for (let i = 1; i < trilha.length; i++) {
      const dt = trilha[i][2] - trilha[i - 1][2]
      v.push(dt > 0 ? (trilha[i][5] - trilha[i - 1][5]) / dt : 0)
    }
    const sm = v.map((_, i) => {
      const w = v.slice(Math.max(0, i - 1), i + 2)
      return w.reduce((a, b) => a + b, 0) / w.length
    })
    const ord = [...sm].sort((a, b) => a - b)
    const lo = ord[Math.floor(ord.length * 0.05)] ?? 0
    const hi = ord[Math.floor(ord.length * 0.95)] ?? 1
    const cor = (x) => mix(LENTO, RAPIDO, hi > lo ? Math.min(1, Math.max(0, (x - lo) / (hi - lo))) : 0.5)
    return { W, H, pts, sm, cor }
  }, [trilha, altura, mini])

  if (!g) return <div className="mapa vazio mut small">Sem trajeto GPS nesta corrida.</div>
  const { W, H, pts, sm, cor } = g
  const w = mini ? 3 : 5
  return (
    <svg className={'mapa ' + (mini ? 'mini ' : '') + className} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mapa do trajeto da corrida">
      {!mini && (
        <g className="mapa-grade" aria-hidden="true">
          {Array.from({ length: 11 }, (_, i) => <line key={'v' + i} x1={(W / 10) * i} y1="0" x2={(W / 10) * i} y2={H} />)}
          {Array.from({ length: Math.ceil(H / (W / 10)) + 1 }, (_, i) => <line key={'h' + i} x1="0" y1={(W / 10) * i} x2={W} y2={(W / 10) * i} />)}
        </g>
      )}
      <polyline className="mapa-sombra" points={pts.map((p) => p.join(',')).join(' ')} strokeWidth={w + 4} />
      {pts.slice(1).map((p, i) => (
        <line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={p[0]} y2={p[1]} stroke={cor(sm[i])} strokeWidth={w} strokeLinecap="round" />
      ))}
      <circle className="mapa-ini" cx={pts[0][0]} cy={pts[0][1]} r={mini ? 4 : 8} />
      <circle className="mapa-fim" cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={mini ? 4 : 8} />
    </svg>
  )
}
