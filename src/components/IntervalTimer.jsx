import { useEffect, useRef, useState } from 'react'

// Monta as fases da sessão: 5' de caminhada, blocos de corrida/caminhada, 5' de volta à calma.
export function montarFases(sessao) {
  const f = [{ label: 'Aquecimento (caminhada)', tipo: 'walk', seg: 300 }]
  if (sessao.tipo === 'intervalado') {
    for (let i = 1; i <= sessao.reps; i++) {
      f.push({ label: `Corrida ${i}/${sessao.reps}`, tipo: 'run', seg: sessao.corre * 60 })
      f.push({ label: `Caminhada ${i}/${sessao.reps}`, tipo: 'walk', seg: sessao.anda * 60 })
    }
  } else if (sessao.tipo === 'continuo') {
    f.push({ label: `Corrida contínua (${sessao.corre} min)`, tipo: 'run', seg: sessao.corre * 60 })
  } else if (sessao.tipo === 'teste') {
    f.push({ label: 'TESTE DE 5 KM (até 45 min)', tipo: 'run', seg: 45 * 60 })
  } else return null
  f.push({ label: 'Volta à calma (caminhada)', tipo: 'walk', seg: 300 })
  return f
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function IntervalTimer({ sessao, onFim, onFechar }) {
  const fases = montarFases(sessao)
  const [estado, setEstado] = useState('pronto') // pronto | rodando | pausado | fim
  const [decorrido, setDecorrido] = useState(0)
  const base = useRef(0)
  const inicio = useRef(0)
  const idxAnt = useRef(-1)
  const audio = useRef(null)
  const lock = useRef(null)

  const total = fases.reduce((a, x) => a + x.seg, 0)
  let acc = 0
  let idx = fases.findIndex((x) => (acc += x.seg) > decorrido)
  if (idx < 0) idx = fases.length - 1
  const iniFase = fases.slice(0, idx).reduce((a, x) => a + x.seg, 0)
  const restante = Math.max(0, fases[idx].seg - (decorrido - iniFase))

  const beep = (vezes, freq) => {
    const ctx = audio.current
    if (!ctx) return
    for (let i = 0; i < vezes; i++) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = freq
      g.gain.value = 0.25
      o.connect(g)
      g.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.22
      o.start(t)
      o.stop(t + 0.14)
    }
    navigator.vibrate?.(vezes === 2 ? [120, 80, 120] : 200)
  }

  useEffect(() => {
    if (estado !== 'rodando') return
    const id = setInterval(() => {
      const d = base.current + (Date.now() - inicio.current) / 1000
      if (d >= total) {
        setDecorrido(total)
        setEstado('fim')
        beep(3, 988)
        return
      }
      setDecorrido(d)
    }, 250)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  // sinal sonoro a cada troca de fase
  useEffect(() => {
    if (estado !== 'rodando') return
    if (idxAnt.current !== -1 && idxAnt.current !== idx) beep(fases[idx].tipo === 'run' ? 2 : 1, fases[idx].tipo === 'run' ? 880 : 520)
    idxAnt.current = idx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, estado])

  const iniciar = async () => {
    audio.current = audio.current || new (window.AudioContext || window.webkitAudioContext)()
    audio.current.resume?.()
    try { lock.current = await navigator.wakeLock?.request('screen') } catch { /* sem wake lock */ }
    inicio.current = Date.now()
    setEstado('rodando')
    beep(1, 700)
  }
  const pausar = () => {
    base.current = decorrido
    lock.current?.release?.()
    setEstado('pausado')
  }
  const retomar = async () => {
    try { lock.current = await navigator.wakeLock?.request('screen') } catch { /* ok */ }
    inicio.current = Date.now()
    setEstado('rodando')
  }
  useEffect(() => () => lock.current?.release?.(), [])

  const fase = fases[idx]
  return (
    <div className={'card timer ' + (estado === 'fim' ? '' : fase.tipo)}>
      <div className="phase">{estado === 'pronto' ? `Sessão: ${sessao.texto}` : estado === 'fim' ? 'Sessão concluída' : fase.label}</div>
      <div className="clock">{estado === 'pronto' ? fmt(total) : estado === 'fim' ? fmt(total) : fmt(restante)}</div>
      <div className="mut small">
        {estado === 'pronto' && `Duração total: ${Math.round(total / 60)} min. Deixe a tela ligada para ouvir os avisos.`}
        {(estado === 'rodando' || estado === 'pausado') && `Decorrido ${fmt(decorrido)} de ${fmt(total)} · fase ${idx + 1}/${fases.length}`}
        {estado === 'fim' && 'Registre a distância que o relógio mediu para entrar na evolução.'}
      </div>
      <div className="row wrap" style={{ justifyContent: 'center', marginTop: 14 }}>
        {estado === 'pronto' && <button className="btn pri" onClick={iniciar}>▶ Iniciar</button>}
        {estado === 'rodando' && <button className="btn" onClick={pausar}>⏸ Pausar</button>}
        {estado === 'pausado' && <button className="btn pri" onClick={retomar}>▶ Continuar</button>}
        {estado === 'fim' && <button className="btn pri" onClick={() => onFim(Math.round((total / 60) * 10) / 10)}>Registrar corrida</button>}
        <button className="btn ghost" onClick={onFechar}>{estado === 'fim' ? 'Fechar' : 'Cancelar'}</button>
      </div>
    </div>
  )
}
