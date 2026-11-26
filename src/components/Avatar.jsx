import Icon from './Icon.jsx'

// Foto de perfil redonda; sem foto, a inicial do nome numa cor que vem do id da pessoa.
const CORES = ['#ff6b35', '#5eaaff', '#3ddc97', '#a891ff', '#f2a93b', '#ff7b9c']
export const corDe = (seed) => CORES[[...String(seed ?? '')].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length]

export default function Avatar({ src, nome, seed, tam = 40, estado, className = '' }) {
  return (
    <span className={`av${estado ? ' ' + estado : ''} ${className}`} style={{ '--c': corDe(seed ?? nome), width: tam, height: tam, fontSize: tam * 0.42 }} title={nome}>
      {src ? <img src={src} alt="" draggable="false" /> : (nome || '?').trim().charAt(0).toUpperCase()}
      {estado === 'ok' && <i className="av-ok"><Icon name="check" /></i>}
    </span>
  )
}
