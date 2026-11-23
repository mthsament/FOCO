import { useEffect, useState } from 'react'
import { ResponsiveContainer } from 'recharts'

// Peças visuais dos gráficos da Evolução: cartão com número em destaque e variação,
// degradês, tooltip própria e anéis de progresso.
export const COR = { acc: 'var(--acc)', blue: 'var(--blue)', violet: 'var(--violet)', warn: 'var(--warn)', bad: 'var(--bad)', ok: 'var(--ok)', grid: 'var(--line)' }

// animações desligadas para quem pede menos movimento
export function useAnima() {
  const [a, setA] = useState(() => !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches))
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const h = () => setA(!mq.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return { isAnimationActive: a, animationDuration: 900, animationEasing: 'ease-out' }
}

// degradê vertical que some para baixo (para áreas)
export const Grad = ({ id, cor, topo = 0.42 }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" style={{ stopColor: cor, stopOpacity: topo }} />
    <stop offset="100%" style={{ stopColor: cor, stopOpacity: 0 }} />
  </linearGradient>
)
// degradê horizontal para barras/linhas
export const GradV = ({ id, cor }) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" style={{ stopColor: cor, stopOpacity: 1 }} />
    <stop offset="100%" style={{ stopColor: cor, stopOpacity: 0.55 }} />
  </linearGradient>
)

export const pontoAtivo = { r: 6, strokeWidth: 3, stroke: 'var(--card)' }
export const cursor = { stroke: 'var(--mut)', strokeDasharray: '4 4', strokeOpacity: 0.55 }
export const eixo = { tickLine: false, axisLine: false, tickMargin: 8 }

// tooltip: data/rótulo em cima, uma linha por série com a bolinha da cor
export function TT({ active, payload, label, fmt = {}, unidades = {} }) {
  if (!active || !payload?.length) return null
  const linhas = payload.filter((p) => p.value != null && p.type !== 'none')
  if (!linhas.length) return null
  return (
    <div className="gtt">
      <div className="gtt-t">{label}</div>
      {linhas.map((p) => (
        <div className="gtt-l" key={p.dataKey}>
          <i style={{ background: p.color || p.stroke || p.fill }} />
          <span>{p.name}</span>
          <b>{fmt[p.dataKey] ? fmt[p.dataKey](p.value) : p.value}{unidades[p.dataKey] || ''}</b>
        </div>
      ))}
    </div>
  )
}

// variação entre o primeiro e o último ponto. melhor: 'menor' | 'maior' | null
export function Delta({ de, para, melhor = null, casas = 1, un = '' }) {
  if (de == null || para == null) return null
  const d = para - de
  const fmt = (n) => (Math.round(n * 10 ** casas) / 10 ** casas).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
  if (Math.abs(d) < 0.5 / 10 ** casas) return <span className="gd neutro">= estável</span>
  const bom = melhor == null ? null : melhor === 'menor' ? d < 0 : d > 0
  return (
    <span className={'gd ' + (bom == null ? 'neutro' : bom ? 'bom' : 'ruim')}>
      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" style={{ transform: d < 0 ? 'rotate(180deg)' : 'none' }}><path d="M6 1.5L10.5 8h-9z" fill="currentColor" /></svg>
      {d > 0 ? '+' : ''}{fmt(d)}{un}
    </span>
  )
}

export function GCard({ titulo, valor, un, delta, sub, vazio, nota, altura = 220, children, acao, cor = COR.acc }) {
  return (
    <div className="card gc" style={{ '--gc': cor }}>
      <div className="gc-top">
        <div className="gc-tit">
          <h2>{titulo}</h2>
          {valor != null && (
            <div className="gc-val"><b key={String(valor)}>{valor}</b>{un && <span>{un}</span>}{delta}</div>
          )}
          {sub && <div className="mut small">{sub}</div>}
        </div>
        {acao}
      </div>
      {vazio ? (
        <div className="gc-vazio">{vazio}</div>
      ) : (
        <div className="gc-plot" style={{ height: altura }}><ResponsiveContainer>{children}</ResponsiveContainer></div>
      )}
      {nota && <div className="mut small" style={{ marginTop: 8 }}>{nota}</div>}
    </div>
  )
}

// anel de progresso (0..1) que "enche" ao aparecer
export function Anel({ pct, cor = COR.acc, rotulo, centro, tam = 92 }) {
  const p = Math.max(0, Math.min(1, pct || 0))
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <div className="anel" style={{ '--cor': cor, width: tam }}>
      <svg viewBox="0 0 100 100" width={tam} height={tam} role="img" aria-label={`${rotulo}: ${Math.round(p * 100)}%`}>
        <circle cx="50" cy="50" r={r} className="anel-fundo" />
        <circle cx="50" cy="50" r={r} className="anel-v" strokeDasharray={c} style={{ '--c': c, '--to': c * (1 - p) }} transform="rotate(-90 50 50)" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="anel-n">{centro ?? `${Math.round(p * 100)}%`}</text>
      </svg>
      <span>{rotulo}</span>
    </div>
  )
}
