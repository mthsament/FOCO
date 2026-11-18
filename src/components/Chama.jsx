// Foguinho da ofensiva: três camadas que "dançam" em ritmos diferentes.
// `on` = ofensiva ativa (colorida e animada); desligado vira cinza e parado.
// `azul` = variante da ofensiva de água.
export default function Chama({ on = true, azul = false, className = '' }) {
  return (
    <svg className={`chama${on ? ' on' : ''}${azul ? ' azul' : ''} ${className}`} viewBox="0 0 24 30" aria-hidden="true">
      <g className="ch-corpo">
        <path className="ch-ext" d="M12 1.5c1.2 5.2 8.6 8.6 8.6 17.2A8.6 8.6 0 0 1 3.4 18.7C3.4 14.3 6 12 7.4 9.3c.9 1.9 1.6 2.6 2.6 3C9.3 8 10.4 4.6 12 1.5z" />
        <g className="ch-miolo">
          <path className="ch-mid" d="M12 11c.8 3.4 5.6 5.4 5.6 10.2a5.6 5.6 0 0 1-11.2 0c0-2.6 1.6-4 2.6-5.8.5 1.1 1 1.6 1.7 1.9C10 14.3 11 12.8 12 11z" />
          <path className="ch-int" d="M12 18.5c.5 2 2.8 2.9 2.8 5a2.8 2.8 0 0 1-5.6 0c0-1.6 1.2-2.4 1.8-3.5.4.7.7 1 1 1z" />
        </g>
      </g>
    </svg>
  )
}
