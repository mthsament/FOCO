import { useEffect, useState } from 'react'
import { addDays, fmtLongo, todayISO } from '../lib/dates.js'
import { aplicarTema, lerPref, salvarPref } from '../lib/theme.js'
import Icon from './Icon.jsx'
import Chama from './Chama.jsx'

export const Check = ({ on, onClick, label }) => (
  <button type="button" className={'check' + (on ? ' on' : '')} onClick={onClick} aria-pressed={!!on} aria-label={label}>
    {on ? <Icon name="check" /> : null}
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

export const Streak = ({ n, azul = false, on }) => (
  <span className="streak">
    <Chama on={on ?? n > 0} azul={azul} />
    {/* key: ao subir a ofensiva o número "pula" */}
    <span key={n} className="streak-n">{n}</span>
  </span>
)

export const Empty = ({ icon = 'hoje', title, children }) => (
  <div className="card empty">
    <div className="em" aria-hidden="true"><Icon name={icon} size={40} /></div>
    <h2>{title}</h2>
    <div>{children}</div>
  </div>
)

export function Seg({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => (
        <button key={v} type="button" className={v === value ? 'on' : ''} aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  )
}

export function DayPicker({ iso, onChange }) {
  return (
    <div className="row" style={{ marginBottom: 12 }}>
      <button className="iconbtn" onClick={() => onChange(addDays(iso, -1))} aria-label="Dia anterior"><Icon name="chevL" /></button>
      <div className="sp" style={{ textAlign: 'center' }}>
        <div className="cap" style={{ fontWeight: 700 }}>{fmtLongo(iso)}</div>
        {iso !== todayISO() && (
          <button className="btn sm ghost" onClick={() => onChange(todayISO())}>Voltar para hoje</button>
        )}
      </div>
      <button className="iconbtn" onClick={() => onChange(addDays(iso, 1))} aria-label="Próximo dia"><Icon name="chevR" /></button>
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
  return msg ? <div className="toast" role="status" aria-live="polite">{msg}</div> : null
}

// Botão de tema (claro/escuro) para a barra superior e o menu lateral
export function ThemeToggle({ className = 'iconbtn', rotulo = false }) {
  const [, force] = useState(0)
  useEffect(() => {
    const h = () => force((n) => n + 1)
    window.addEventListener('foco-theme', h)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const sys = () => lerPref() === 'auto' && aplicarTema('auto')
    mq.addEventListener('change', sys)
    return () => { window.removeEventListener('foco-theme', h); mq.removeEventListener('change', sys) }
  }, [])
  const escuro = document.documentElement.dataset.theme === 'dark'
  return (
    <button type="button" className={className} onClick={() => salvarPref(escuro ? 'light' : 'dark')} aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}>
      <span className="ic"><Icon name={escuro ? 'sun' : 'moon'} /></span>
      {rotulo && <span>{escuro ? 'Tema claro' : 'Tema escuro'}</span>}
    </button>
  )
}

export function ThemeSeg() {
  const [pref, setPref] = useState(lerPref)
  return <Seg value={pref} onChange={(v) => { setPref(v); salvarPref(v) }} options={[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']]} />
}

export const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))
export const r1 = (n) => (n == null ? '–' : (Math.round(n * 10) / 10).toLocaleString('pt-BR'))
export const r0 = (n) => (n == null ? '–' : Math.round(n).toLocaleString('pt-BR'))
