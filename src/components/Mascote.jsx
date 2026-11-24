import { useCallback, useEffect, useRef, useState } from 'react'
import { ouvir } from '../lib/mascoteEventos.js'
import { visualDe } from '../lib/mascote.js'
import MascoteSprite from './MascoteSprite.jsx'

// Mascote do FOCO (o canguru). Cada pose é uma imagem; a animação é feita por CSS:
//   idle    respira de leve e, de vez em quando, "olha em volta"
//   pula    um pulo com "amassa e estica"
//   celebra pulos repetidos com confete
//   corre   balanço de corrida
//   treina  pulsa como quem levanta peso
//   forca   mostra a força (dois "flex")
// Tocar no mascote faz uma dessas reações (sorteada) e solta uma frase.
// Outras partes do app também podem pedir reações (ex.: beber água) pelo canal de eventos.
const POSES = { 1: 'Mostrando os bíceps', 2: 'Correndo na esteira', 3: 'Braços cruzados', 4: 'Rosca com halter', 5: 'Pulando com elástico', 6: 'Alongando no tapete' }
const FRASES = ['Foco!', 'Bora!', 'Um passo de cada vez.', 'Constância ganha de motivação.', 'Cada repetição conta.', 'Já bebeu água?', 'Você está indo bem.', 'Mais um dia, mais uma meta.']
const REACOES = ['pula'] // ao tocar: só o pulo
const CONFETE = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI / 2 + ((i - 5.5) / 5.5) * 1.15
  const d = 56 + (i % 3) * 22
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), r: (i * 67) % 360, c: ['#ff6b35', '#c6f432', '#5eaaff', '#ffffff', '#ffc800'][i % 5], t: (i % 4) * 40 }
})

export default function Mascote({ pose = 3, anim = 'idle', visual, fala, altura = 130, frases = FRASES, className = '' }) {
  const [reacao, setReacao] = useState({ n: 0, anim: null, fala: null })
  const [micro, setMicro] = useState(0)
  const [parado, setParado] = useState(false)
  const raiz = useRef(null)
  const timer = useRef(null)
  const ultima = useRef(-1)
  useEffect(() => () => clearTimeout(timer.current), [])

  // economiza bateria: pausa as animações em loop quando o mascote sai da tela ou a aba fica oculta
  useEffect(() => {
    const el = raiz.current
    let visivel = true
    const aplica = () => setParado(!visivel || document.visibilityState !== 'visible')
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([e]) => { visivel = e.isIntersecting; aplica() }) : null
    io?.observe(el)
    document.addEventListener('visibilitychange', aplica)
    return () => { io?.disconnect(); document.removeEventListener('visibilitychange', aplica) }
  }, [])

  const reagir = useCallback((efeito, texto) => {
    setReacao((r) => ({ n: r.n + 1, anim: efeito, fala: texto }))
    navigator.vibrate?.(12)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setReacao((r) => ({ ...r, anim: null, fala: null })), 3500)
  }, [])

  // pedidos de outras partes do app (beber água, etc.)
  useEffect(() => ouvir((e) => e.tipo === 'reagir' && reagir(e.anim || 'pula', e.fala)), [reagir])

  // vida própria: de tempos em tempos ele olha em volta
  useEffect(() => {
    if (anim !== 'idle') return
    let t
    const agenda = () => {
      t = setTimeout(() => {
        if (document.visibilityState === 'visible') setMicro((m) => m + 1)
        agenda()
      }, 6500 + Math.random() * 5000)
    }
    agenda()
    return () => clearTimeout(t)
  }, [anim])

  const tocar = () => {
    let i
    do i = Math.floor(Math.random() * frases.length)
    while (i === ultima.current && frases.length > 1)
    ultima.current = i
    reagir(REACOES[Math.floor(Math.random() * REACOES.length)], frases[i])
  }

  const texto = reacao.fala || fala
  const efeito = reacao.anim || anim
  const vis = visual || visualDe(pose, anim)
  return (
    <div ref={raiz} className={`mc a-${efeito}${parado ? ' parado' : ''} ${className}`} style={{ '--mh': `${altura}px` }}>
      <button type="button" className="mc-corpo" onClick={tocar} aria-label="Mascote do FOCO. Toque para animar.">
        <span className="mc-sombra" aria-hidden="true" />
        {anim === 'celebra' && (
          <span className="mc-confete" aria-hidden="true">
            {CONFETE.map((c, i) => <i key={i} style={{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg`, '--c': c.c, '--t': `${c.t}ms` }} />)}
          </span>
        )}
        {reacao.n > 0 && reacao.anim && (
          <span className="mc-brilho" key={'b' + reacao.n} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => <i key={i} style={{ '--a': `${-70 + i * 35}deg`, '--t': `${i * 45}ms` }} />)}
          </span>
        )}
        <span className={'mc-micro' + (micro ? ' on' : '')} key={'m' + micro}>
          <span className="mc-mov" key={reacao.n}>
            {vis && <MascoteSprite key={vis} visual={vis} altura={altura} className="mc-sprite" rotulo={POSES[pose]} />}
          </span>
        </span>
      </button>
      {texto && <div className="mc-balao" key={texto} role="status">{texto}</div>}
    </div>
  )
}
