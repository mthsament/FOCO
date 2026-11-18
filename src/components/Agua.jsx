import { useEffect, useId, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { addDays, todayISO } from '../lib/dates.js'
import { aguaDoDia, metaAgua, sequenciaAgua } from '../lib/metrics.js'
import { Streak, toast } from './ui.jsx'
import Icon from './Icon.jsx'

const L = (ml) => (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const INICIAL = 'DSTQQSS'

// Corpo da garrafa: y=208 é o fundo, y=56 é o nível "cheio".
const CORPO = 'M48 30H72V44C72 52 98 56 98 76V196Q98 208 86 208H34Q22 208 22 196V76C22 56 48 52 48 44Z'
const FUNDO = 208
const TOPO = 58

export function Garrafa({ pct, className = '' }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const p = Math.min(1, Math.max(0, pct || 0))
  const cheia = p >= 1
  const dy = (1 - p) * (FUNDO - TOPO)
  return (
    <svg className={'garrafa' + (cheia ? ' cheia' : '') + (className ? ' ' + className : '')} viewBox="0 0 120 220" role="img" aria-label={`Garrafa ${Math.round(p * 100)}% cheia`}>
      <defs>
        <clipPath id={`g-corpo-${uid}`}><path d={CORPO} /></clipPath>
        <linearGradient id={`g-agua-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5ccbff" />
          <stop offset="1" stopColor="#1478e0" />
        </linearGradient>
      </defs>
      <ellipse className="g-sombra" cx="60" cy="214" rx="38" ry="4" />
      <path className="g-vidro" d={CORPO} />
      <g clipPath={`url(#g-corpo-${uid})`}>
        <g className="g-nivel" style={{ transform: `translateY(${dy}px)`, opacity: p > 0 ? 1 : 0 }}>
          <g className="g-onda g-onda2"><path d="M0 58q15 -7 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0V230H0z" fill="#8bdcff" opacity=".55" /></g>
          <g className="g-onda"><path d="M0 60q15 -8 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0V230H0z" fill={`url(#g-agua-${uid})`} /></g>
          <circle className="g-bolha b1" cx="44" cy="190" r="3" />
          <circle className="g-bolha b2" cx="70" cy="200" r="2.2" />
          <circle className="g-bolha b3" cx="58" cy="196" r="1.6" />
        </g>
        {[1, 2, 3, 4].map((i) => <path key={i} className="g-marca" d={`M22 ${FUNDO - i * 32}h${i % 2 ? 16 : 10}`} />)}
      </g>
      <path className="g-borda" d={CORPO} />
      <path className="g-brilho" d="M31 82V176" />
      <rect className="g-tampa" x="45" y="9" width="30" height="15" rx="4.5" />
      <path className="g-tampa-l" d="M51 12.5v8M57 12.5v8M63 12.5v8M69 12.5v8" />
    </svg>
  )
}

// Confete de gotas quando a meta é batida
const GOTAS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.2
  const d = 70 + (i % 3) * 26
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d * 0.75 - 20), s: 6 + (i % 4) * 2, t: (i % 5) * 28 }
})
const BOLHAS = [
  [8, 14, 7.2, 0], [20, 9, 9, 1.8], [34, 18, 6.4, 0.7], [47, 11, 8.6, 3.1], [61, 15, 7, 1.2], [74, 8, 9.4, 2.4], [86, 17, 6.8, 0.3], [94, 12, 8, 3.6],
]

export default function Agua({ iso }) {
  const { s, update } = useApp()
  const meta = metaAgua(s)
  const ml = aguaDoDia(s, iso)
  const pct = ml / meta
  const cheia = pct >= 1
  const seq = sequenciaAgua(s)
  const hoje = todayISO()
  const [festa, setFesta] = useState(0)
  const ant = useRef(ml >= meta)

  // Dispara a comemoração só quando a meta é cruzada agora (não ao abrir a tela já cumprida)
  useEffect(() => {
    if (cheia && !ant.current) {
      setFesta((n) => n + 1)
      navigator.vibrate?.([30, 40, 60])
      toast('Meta de água batida!')
    }
    ant.current = cheia
  }, [cheia])

  const add = (v) =>
    update((x) => {
      const d = (x.logs.dieta[iso] = x.logs.dieta[iso] || {})
      d.agua = Math.max(0, (d.agua || 0) + v)
    })

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(iso, i - 6)
    return { d, ok: aguaDoDia(s, d) >= meta, hoje: d === hoje, ml: aguaDoDia(s, d) }
  })
  const falta = Math.max(0, meta - ml)

  return (
    <div className={'agua' + (cheia ? ' cheia' : '')}>
      {cheia && (
        <div className="agua-fundo" aria-hidden="true">
          {BOLHAS.map(([x, s2, d, t], i) => <i key={i} style={{ left: `${x}%`, '--s': `${s2}px`, '--d': `${d}s`, '--t': `-${t}s` }} />)}
        </div>
      )}
      {festa > 0 && (
        <div key={festa} className="agua-festa" aria-hidden="true">
          {GOTAS.map((g, i) => <i key={i} style={{ '--x': `${g.x}px`, '--y': `${g.y}px`, '--s': `${g.s}px`, '--t': `${g.t}ms` }} />)}
        </div>
      )}

      <div className={'agua-garrafa' + (festa ? ' pula' : '')} key={festa ? 'f' + festa : 'n'}>
        <Garrafa pct={pct} />
      </div>

      <div className="agua-info">
        <div className="row">
          <h2 className="sp"><Icon name="gota" /> Água</h2>
          <Streak n={seq.atual} azul on={seq.atual > 0} />
        </div>
        <div className="agua-v"><b>{L(ml)}</b><span> / {L(meta)} L</span></div>
        <div className="agua-msg">
          {cheia ? 'Meta batida! Hidratação em dia.' : ml === 0 ? 'Comece a encher a garrafa.' : `Faltam ${L(falta)} L (${Math.round(pct * 100)}%)`}
        </div>
        <div className="row wrap agua-btns">
          <button className="btn sm" onClick={() => add(-250)} aria-label="Remover 250 mililitros" disabled={ml === 0}>−250</button>
          <button className="btn sm" onClick={() => add(250)}>+250 ml</button>
          <button className="btn sm" onClick={() => add(500)}>+500</button>
        </div>
        <div className="agua-sem" role="group" aria-label="Últimos 7 dias">
          {dias.map(({ d, ok, hoje: h, ml: m }) => (
            <span key={d} className={'dia' + (ok ? ' ok' : '') + (h ? ' hoje' : '')} title={`${d.slice(8)}/${d.slice(5, 7)}: ${L(m)} L`}>
              <Icon name="gota" />
              <em>{INICIAL[new Date(d + 'T12:00').getDay()]}</em>
              <span className="sr">{ok ? 'meta batida' : 'meta não batida'}</span>
            </span>
          ))}
        </div>
        <div className="agua-rod">Melhor ofensiva: {seq.melhor} {seq.melhor === 1 ? 'dia' : 'dias'}</div>
      </div>
    </div>
  )
}
