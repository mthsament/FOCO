import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { D, GR, TPL } from '../lib/exercicioAnim.js'
import Icon from './Icon.jsx'
import '../exercicio-anim.css'

// O canguru executando o exercício escolhido. Esqueleto SVG com articulações animadas só por CSS
// (gerado de "Biblioteca interativa" por scripts/gerar-exercicios.mjs). Carregado sob demanda: ver AnimacaoLazy.jsx.
const NP = 49
const EQT = ['barbell', 'dumbbell', 'kettle', 'medball', 'handle', 'disc', 'band', 'stick', 'wheel']
const J = ['root', 'tail', 'th_f', 'kn_f', 'ft_f', 'th_n', 'kn_n', 'ft_n', 'tr', 'hd', 'sh_f', 'el_f', 'sh_n', 'el_n']
const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

// nome -> entrada(s); com grupo, prefere a do mesmo grupo
const POR_NOME = new Map()
D.forEach((d, i) => { const k = norm(d[0]); POR_NOME.set(k, [...(POR_NOME.get(k) || []), i]) })
export function acharExercicio(nome, grupo) {
  const lista = POR_NOME.get(norm(nome || ''))
  if (!lista) return -1
  const g = GR.indexOf(grupo)
  return lista.find((i) => D[i][1] === g) ?? lista[0]
}

function montar(d) {
  const [, , anim, perto, longe, props, pes] = d
  const mapa = {
    c: Object.fromEntries(J.map((j) => [j, `ca-t${anim}-${j}`])),
    en: Object.fromEntries(EQT.map((k) => [k, longe === k ? '' : 'ca-off'])),
    ef: Object.fromEntries(EQT.map((k) => [k, perto === k ? '' : 'ca-off'])),
    fq: { plate: pes === 'plate' ? '' : 'ca-off', ball: pes === 'ball' ? '' : 'ca-off' },
  }
  return TPL.replace(/\{\{\s*(\w+)\.(\w+)\s*\}\}/g, (_, a, b) => {
    if (a === 'pr') return props.includes(+b.slice(1)) ? '' : 'ca-off'
    return mapa[a]?.[b] ?? ''
  })
}

const reduzido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function AnimacaoExercicio({ nome, grupo, legenda = true, className = '' }) {
  const i = acharExercicio(nome, grupo)
  const html = useMemo(() => (i >= 0 ? { __html: montar(D[i]) } : null), [i])
  const [pausa, setPausa] = useState(reduzido)
  const [fora, setFora] = useState(false)
  const raiz = useRef(null)

  // não gasta bateria quando está fora da tela ou com a aba oculta
  useEffect(() => {
    const el = raiz.current
    if (!el) return
    let visivel = true
    const aplica = () => setFora(!visivel || document.visibilityState !== 'visible')
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([e]) => { visivel = e.isIntersecting; aplica() }) : null
    io?.observe(el)
    document.addEventListener('visibilitychange', aplica)
    return () => { io?.disconnect(); document.removeEventListener('visibilitychange', aplica) }
  }, [i])

  if (i < 0) {
    return (
      <div className={`ca ca-sem ${className}`} ref={raiz}>
        <div className="ca-stage ca-vazio"><span>Sem animação para este exercício ainda.</span></div>
      </div>
    )
  }
  const d = D[i]
  return (
    <figure className={`ca ${pausa || fora ? 'ca-parado' : ''} ${className}`} ref={raiz}>
      <div className="ca-stage" role="img" aria-label={`Canguru fazendo ${d[0]}`}>
        <div className="ca-rig" dangerouslySetInnerHTML={html} />
        <button type="button" className="ca-play" onClick={() => setPausa((p) => !p)} aria-label={pausa ? 'Reproduzir animação' : 'Pausar animação'} aria-pressed={!pausa}>
          <Icon name={pausa ? 'play' : 'pause'} />
        </button>
      </div>
      {legenda && (
        <figcaption className="ca-leg">
          <b>{d[0]}</b>
          <span className="chip">{GR[d[1]]}</span>
        </figcaption>
      )}
    </figure>
  )
}
export default memo(AnimacaoExercicio)
