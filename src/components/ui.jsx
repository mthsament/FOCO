import { useEffect, useState } from 'react'
import { addDays, fmtLongo, todayISO } from '../lib/dates.js'

export const Check = ({ on, onClick, label }) => (
  <button type="button" className={'check' + (on ? ' on' : '')} onClick={onClick} aria-pressed={!!on} aria-label={label}>
    {on ? '✓' : ''}
  </button>
)

export const Bar = ({ pct, cls = '' }) => (
  <div className={'bar ' + cls}>
    <i style={{ width: `${Math.min(100, Math.max(0, (pct || 0) * 100))}%` }} />
  </div>
)

export const Kpi = ({ v, l, cls = '' }) => (
  <div className={'kpi ' + cls}>
    <div className="v">{v}</div>
    <div className="l">{l}</div>
  </div>
)

export const Empty = ({ emoji = '📋', title, children }) => (
  <div className="card empty">
    <div className="em">{emoji}</div>
    <h2>{title}</h2>
    <div>{children}</div>
  </div>
)

export function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => (
        <button key={v} type="button" className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function DayPicker({ iso, onChange }) {
  return (
    <div className="row" style={{ marginBottom: 12 }}>
      <button className="iconbtn" onClick={() => onChange(addDays(iso, -1))} aria-label="Dia anterior">‹</button>
      <div className="sp" style={{ textAlign: 'center' }}>
        <div className="cap" style={{ fontWeight: 700 }}>{fmtLongo(iso)}</div>
        {iso !== todayISO() && (
          <button className="btn sm ghost" onClick={() => onChange(todayISO())}>Voltar para hoje</button>
        )}
      </div>
      <button className="iconbtn" onClick={() => onChange(addDays(iso, 1))} aria-label="Próximo dia">›</button>
    </div>
  )
}

// Aviso rápido
export const toast = (msg) => window.dispatchEvent(new CustomEvent('foco-toast', { detail: msg }))
export function Toaster() {
  const [msg, setMsg] = useState(null)
  useEffect(() => {
    let t
    const h = (e) => {
      setMsg(e.detail)
      clearTimeout(t)
      t = setTimeout(() => setMsg(null), 2200)
    }
    window.addEventListener('foco-toast', h)
    return () => {
      window.removeEventListener('foco-toast', h)
      clearTimeout(t)
    }
  }, [])
  return msg ? <div className="toast" role="status">{msg}</div> : null
}

export const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))
export const r1 = (n) => (n == null ? '–' : (Math.round(n * 10) / 10).toLocaleString('pt-BR'))
export const r0 = (n) => (n == null ? '–' : Math.round(n).toLocaleString('pt-BR'))
