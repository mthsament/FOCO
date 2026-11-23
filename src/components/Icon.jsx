// Ícones próprios do FOCO.
// Assinatura: traço fino e arredondado (1,75 px na grade de 24) + um preenchimento translúcido
// ("d") que dá volume à forma principal + um ponto sólido ("s") — o "foco" — em cada ícone.
const D = (p) => <path className="d" d={p} />
const S = (cx, cy, r = 1.3) => <circle className="s" cx={cx} cy={cy} r={r} />

const G = {
  hoje: (
    <>
      <circle className="d" cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.6" />
      {S(12, 12, 1.5)}
    </>
  ),
  treino: (
    <>
      <rect className="d" x="6.2" y="6.5" width="3" height="11" rx="1" />
      <rect className="d" x="14.8" y="6.5" width="3" height="11" rx="1" />
      <rect x="6.2" y="6.5" width="3" height="11" rx="1" />
      <rect x="14.8" y="6.5" width="3" height="11" rx="1" />
      <path d="M3 10v4M21 10v4M9.2 12h5.6" />
    </>
  ),
  dieta: (
    <>
      {D('M3.5 11.5h17a8.5 8.5 0 0 1-17 0z')}
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0zM9 7.8c0-1.4 1-1.9 1-3.3M14 7.8c0-1.4 1-1.9 1-3.3" />
      {S(12, 16, 1.2)}
    </>
  ),
  corrida: (
    <>
      <circle className="d" cx="12" cy="13.5" r="7.5" />
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M9.5 2.8h5M12 2.8v3.2M12 13.5l3-3.2M18.6 7.2l1.2-1.2" />
      {S(12, 13.5, 1.4)}
    </>
  ),
  bio: (
    <>
      <rect className="d" x="4.5" y="3" width="15" height="18" rx="4.5" />
      <rect x="4.5" y="3" width="15" height="18" rx="4.5" />
      <path d="M8.2 10.2a5 5 0 0 1 7.6 0M12 10.6l1.6-2" />
      <path d="M8.6 16.8h2.6M12.8 16.8h2.6" />
      {S(12, 10.9, 1.1)}
    </>
  ),
  evolucao: (
    <>
      <rect className="d" x="4.6" y="13" width="3.4" height="7" rx="1" />
      <rect className="d" x="10.3" y="9" width="3.4" height="11" rx="1" />
      <rect className="d" x="16" y="4.5" width="3.4" height="15.5" rx="1" />
      <path d="M3 20.5h18M6.3 13v7M12 9v11M17.7 4.5V20" />
      {S(17.7, 4.5, 1.3)}
    </>
  ),
  config: (
    <>
      <path d="M3.5 7h9M18.5 7h2M3.5 17h2M11.5 17h9" />
      <circle className="d" cx="15.5" cy="7" r="2.6" />
      <circle cx="15.5" cy="7" r="2.6" />
      <circle className="d" cx="8.5" cy="17" r="2.6" />
      <circle cx="8.5" cy="17" r="2.6" />
    </>
  ),
  check: <path className="bold" d="M5.5 12.8l4.2 4.2L18.8 7.6" />,
  close: <path className="bold" d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  minus: <path className="bold" d="M6 12h12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  calendario: (
    <>
      <rect className="d" x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      {S(8.5, 14.2, 1.2)}{S(12, 14.2, 1.2)}{S(15.5, 14.2, 1.2)}{S(8.5, 17.3, 1.2)}{S(12, 17.3, 1.2)}
    </>
  ),
  cadeado: (
    <>
      <rect className="d" x="5" y="10.5" width="14" height="10" rx="3" />
      <rect x="5" y="10.5" width="14" height="10" rx="3" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      {S(12, 15.5, 1.4)}
    </>
  ),
  gota: (
    <>
      {D('M12 3.2c3.6 4.4 6.2 7.3 6.2 10.8a6.2 6.2 0 0 1-12.4 0c0-3.5 2.6-6.4 6.2-10.8z')}
      <path d="M12 3.2c3.6 4.4 6.2 7.3 6.2 10.8a6.2 6.2 0 0 1-12.4 0c0-3.5 2.6-6.4 6.2-10.8z" />
      <path d="M8.9 14.3a3.2 3.2 0 0 0 2.4 3" />
    </>
  ),
  flame: (
    <>
      {D('M12 3.2c.7 3.2-3.6 5.1-3.6 9.3a5.6 5.6 0 0 0 11.2 0c0-2.2-1-3.8-2.2-4.9-.2 1.7-.9 2.6-2 2.9.6-3.2-.8-5.9-3.4-7.3z')}
      <path d="M12 3.2c.7 3.2-3.6 5.1-3.6 9.3a5.6 5.6 0 0 0 11.2 0c0-2.2-1-3.8-2.2-4.9-.2 1.7-.9 2.6-2 2.9.6-3.2-.8-5.9-3.4-7.3z" />
      {S(12, 15.4, 1.4)}
    </>
  ),
  trash: (
    <>
      {D('M6.5 7h11l-.9 13h-9.2z')}
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.9 13h9.2l.9-13M10.3 11v5.5M13.7 11v5.5" />
    </>
  ),
  upload: <path d="M12 16V4.5M7.5 9L12 4.5 16.5 9M4.5 15v4.5h15V15" />,
  download: <path d="M12 4.5V16M7.5 11.5L12 16l4.5-4.5M4.5 15v4.5h15V15" />,
  clip: <path d="M17.5 11.5l-6 6a3.6 3.6 0 0 1-5.1-5.1l7-7a2.4 2.4 0 0 1 3.4 3.4l-7 7a1.2 1.2 0 0 1-1.7-1.7l6-6" />,
  bulb: (
    <>
      {D('M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3.5z')}
      <path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3.5zM9.8 19h4.4M10.6 21h2.8" />
    </>
  ),
  warn: (
    <>
      {D('M12 4l9 16H3z')}
      <path d="M12 4l9 16H3zM12 10v4.2" />
      {S(12, 17, 1.1)}
    </>
  ),
  sun: (
    <>
      <circle className="d" cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </>
  ),
  moon: (
    <>
      {D('M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z')}
      <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z" />
    </>
  ),
  bluetooth: <path d="M7 7.6l10 8.8-5 4.4V3.2l5 4.4-10 8.8" />,
  chevL: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  chevR: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  phone: (
    <>
      <rect className="d" x="6.8" y="2.8" width="10.4" height="18.4" rx="2.8" />
      <rect x="6.8" y="2.8" width="10.4" height="18.4" rx="2.8" />
      {S(12, 18.2, 1.1)}
    </>
  ),
  save: (
    <>
      {D('M5 4h11l3 3v13H5z')}
      <path d="M5 4h11l3 3v13H5zM8.5 4v5h6V4M8.5 20v-6h7v6" />
    </>
  ),
  watch: (
    <>
      <rect className="d" x="7" y="6.5" width="10" height="11" rx="3" />
      <rect x="7" y="6.5" width="10" height="11" rx="3" />
      <path d="M9 6.5L9.7 2.8h4.6L15 6.5M9 17.5l.7 3.7h4.6l.7-3.7M12 10.2v2l1.4.9" />
    </>
  ),
  trofeu: (
    <>
      {D('M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0z')}
      <path d="M7.5 4h9v5.5a4.5 4.5 0 0 1-9 0zM7.5 6H4.5v1.5a3 3 0 0 0 3 3M16.5 6h3v1.5a3 3 0 0 1-3 3M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z" />
      {S(12, 8.4, 1.2)}
    </>
  ),
  medalha: (
    <>
      <circle className="d" cx="12" cy="14.5" r="5.5" />
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M8.6 10.2L6.5 3.5h4l1.5 3.3M15.4 10.2l2.1-6.7h-4L12 6.8" />
      {S(12, 14.5, 1.5)}
    </>
  ),
  rota: (
    <>
      <circle className="d" cx="6.5" cy="17.5" r="2.5" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="6.5" r="2.5" />
      <path d="M9 17.5h6.2a3 3 0 0 0 0-6H8.8a3 3 0 0 1 0-6H15" />
    </>
  ),
  montanha: (
    <>
      {D('M3 19.5l6-10.5 3.5 6 2-3 6.5 7.5z')}
      <path d="M3 19.5l6-10.5 3.5 6 2-3 6.5 7.5zM9 9l1.6 2.7" />
    </>
  ),
  bolt: (
    <>
      {D('M13 3L5.5 13.5H12l-1 7.5 7.5-10.5H12z')}
      <path d="M13 3L5.5 13.5H12l-1 7.5 7.5-10.5H12z" />
    </>
  ),
  play: (
    <>
      {D('M8 5.5v13l10.5-6.5z')}
      <path d="M8 5.5v13l10.5-6.5z" />
    </>
  ),
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" className="bold" />,
  stop: (
    <>
      <rect className="d" x="6" y="6" width="12" height="12" rx="2.5" />
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </>
  ),
  coracao: (
    <>
      {D('M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z')}
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
    </>
  ),
  pin: (
    <>
      {D('M12 21s6.5-5.8 6.5-11a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11 6.5 11z')}
      <path d="M12 21s6.5-5.8 6.5-11a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11 6.5 11z" />
      {S(12, 10, 2)}
    </>
  ),
  lista: <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20M4 6.5h.01M4 12h.01M4 17.5h.01" className="bold" />,
  dot: <circle className="s" cx="12" cy="12" r="3" />,
  ring: <circle cx="12" cy="12" r="5" />,
}

export default function Icon({ name, size, className = '', title }) {
  const g = G[name === 'chama' ? 'flame' : name]
  if (!g) return null
  return (
    <svg
      className={'ico ' + className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
    >
      {g}
    </svg>
  )
}
