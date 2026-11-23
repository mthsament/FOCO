import { useEffect, useRef, useState } from 'react'

// Mascote do FOCO (o canguru). Cada pose é uma imagem; a animação é feita por CSS:
//   idle    respira de leve (sempre ligado)
//   pula    um pulo com "amassa e estica", uma vez
//   celebra pulos repetidos com confete
//   corre   balanço de corrida
//   treina  pulsa como quem levanta peso
// Tocar no mascote faz ele pular e soltar uma frase.
const base = import.meta.env.BASE_URL
const POSES = { 1: 'Mostrando os bíceps', 2: 'Correndo na esteira', 3: 'Braços cruzados', 4: 'Rosca com halter', 5: 'Pulando com elástico', 6: 'Alongando no tapete' }
const FRASES = ['Foco!', 'Bora!', 'Um passo de cada vez.', 'Constância ganha de motivação.', 'Cada repetição conta.', 'Já bebeu água?', 'Você está indo bem.', 'Mais um dia, mais uma meta.']
const CONFETE = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI / 2 + ((i - 5.5) / 5.5) * 1.15
  const d = 56 + (i % 3) * 22
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), r: (i * 67) % 360, c: ['#ff6b35', '#c6f432', '#5eaaff', '#ffffff', '#ffc800'][i % 5], t: (i % 4) * 40 }
})

export default function Mascote({ pose = 3, anim = 'idle', fala, altura = 130, frases = FRASES, className = '' }) {
  const [reacao, setReacao] = useState(0)
  const [falaToque, setFalaToque] = useState(null)
  const timer = useRef(null)
  const ultima = useRef(-1)
  useEffect(() => () => clearTimeout(timer.current), [])

  const tocar = () => {
    let i
    do i = Math.floor(Math.random() * frases.length)
    while (i === ultima.current && frases.length > 1)
    ultima.current = i
    setFalaToque(frases[i])
    setReacao((n) => n + 1)
    navigator.vibrate?.(12)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setFalaToque(null), 3500)
  }

  const texto = falaToque || fala
  const efeito = reacao && falaToque ? 'pula' : anim
  return (
    <div className={`mc a-${efeito} ${className}`} style={{ '--mh': `${altura}px` }}>
      <button type="button" className="mc-corpo" onClick={tocar} aria-label="Mascote do FOCO. Toque para animar.">
        <span className="mc-sombra" aria-hidden="true" />
        {anim === 'celebra' && (
          <span className="mc-confete" aria-hidden="true">
            {CONFETE.map((c, i) => <i key={i} style={{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg`, '--c': c.c, '--t': `${c.t}ms` }} />)}
          </span>
        )}
        <span className="mc-mov" key={reacao}>
          <img key={pose} className="mc-img" src={`${base}mascote/pose${pose}.png`} alt={POSES[pose]} draggable="false" />
        </span>
      </button>
      {texto && <div className="mc-balao" key={texto} role="status">{texto}</div>}
    </div>
  )
}
