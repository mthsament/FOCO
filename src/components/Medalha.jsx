import Icon from './Icon.jsx'

// Medalha do FOCO: um disco com fita, nos metais bronze, prata, ouro e platina.
// O ícone no centro é o da conquista. Bloqueada vira cinza com cadeado. Ouro e platina brilham.
const COR = {
  bronze: { a: '#f0b27c', b: '#b8672b', c: '#74391a', disco1: '#e39a5b', disco2: '#9a5322', tinta: '#4a2509' },
  prata: { a: '#fafcfe', b: '#b4bfca', c: '#74828f', disco1: '#e9eef3', disco2: '#a3afbb', tinta: '#2f3c49' },
  ouro: { a: '#fff0a0', b: '#f5b820', c: '#a96e00', disco1: '#ffd95a', disco2: '#e09a0a', tinta: '#6a4100' },
  platina: { a: '#f4feff', b: '#a4e3f5', c: '#4f93c4', disco1: '#d3f3fc', disco2: '#7cc4e6', tinta: '#1c4766' },
  bloqueada: { a: '#e3e7eb', b: '#b5bcc4', c: '#8a939d', disco1: '#d6dbe0', disco2: '#aab2ba', tinta: '#6c7681' },
}

export default function Medalha({ tier = 'bronze', icone = 'trofeu', bloqueada = false, tamanho = 84, className = '', titulo }) {
  const k = bloqueada ? 'bloqueada' : tier
  const c = COR[k]
  const brilha = !bloqueada && (tier === 'ouro' || tier === 'platina')
  return (
    <span className={`med ${k} ${className}`} style={{ '--md': `${tamanho}px`, '--tinta': c.tinta }} role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <svg viewBox="0 0 100 112" className="med-svg">
        <defs>
          <linearGradient id={`mg-aro-${k}`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor={c.a} /><stop offset=".5" stopColor={c.b} /><stop offset="1" stopColor={c.c} />
          </linearGradient>
          <linearGradient id={`mg-disco-${k}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor={c.disco1} /><stop offset="1" stopColor={c.disco2} />
          </linearGradient>
          <clipPath id="mg-clip"><circle cx="50" cy="66" r="38" /></clipPath>
        </defs>
        <path d="M27 3h17l16 41H43z" fill={bloqueada ? '#9aa3ad' : '#1f4f9c'} />
        <path d="M73 3H56L40 44h17z" fill={bloqueada ? '#b2bac2' : '#2f74e0'} />
        <circle cx="50" cy="66" r="38" fill={`url(#mg-aro-${k})`} />
        <circle cx="50" cy="66" r="38" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1.5" />
        <circle cx="50" cy="66" r="31" fill={`url(#mg-disco-${k})`} />
        <circle cx="50" cy="66" r="34.5" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.4 4.6" />
        <circle cx="50" cy="66" r="31" fill="none" stroke="rgba(0,0,0,.14)" strokeWidth="1.2" />
        <ellipse cx="38" cy="50" rx="17" ry="8" fill="#fff" opacity={bloqueada ? 0.22 : 0.34} transform="rotate(-32 38 50)" />
        {brilha && (
          <g clipPath="url(#mg-clip)">
            <g transform="rotate(24 50 66)"><rect className="med-brilho" x="-34" y="20" width="16" height="92" fill="#fff" opacity=".6" /></g>
          </g>
        )}
      </svg>
      <span className="med-ico"><Icon name={bloqueada ? 'cadeado' : icone} /></span>
    </span>
  )
}
