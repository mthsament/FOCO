import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { addDays, mondayOf, todayISO } from '../lib/dates.js'
import { aguaDoDia, metaAgua, sequencia, sequenciaAgua, statusDia } from '../lib/metrics.js'
import { fmtSeg, nomeDist, recordes } from '../lib/corrida.js'
import { ouvir } from '../lib/mascoteEventos.js'
import MascoteSprite from './MascoteSprite.jsx'
import { visualDe } from '../lib/mascote.js'
import Chama from './Chama.jsx'
import Icon from './Icon.jsx'
import Medalha from './Medalha.jsx'

// Tela de comemoração (estilo Duolingo): o canguru entra pulando, com confete, raios girando,
// e a chama da ofensiva "sobe" de número. Abre sozinha quando você bate uma meta.
const SEM_DATA = new Date(2024, 0, 3) // data neutra: na comemoração não entram os visuais de Natal/Relax
const MARCOS = [3, 5, 7, 10, 14, 21, 30, 50, 100]
const TEMAS = {
  azul: ['#3cc3ff', '#1259c9'], laranja: ['#ffa23d', '#e0451a'], verde: ['#6fdc7a', '#1b8a55'], ouro: ['#ffd447', '#d17f00'],
  bronze: ['#e0a066', '#8a4a1c'], prata: ['#c6d0da', '#566679'], platina: ['#9ae6ff', '#3f6fb5'],
}
const CORES = ['#ffffff', '#ffd447', '#ff6b35', '#c6f432', '#5eaaff', '#ff8fb1']
const CONFETE = Array.from({ length: 36 }, (_, i) => {
  const a = -Math.PI / 2 + ((i % 18) / 17 - 0.5) * 2.5
  const d = 110 + ((i * 53) % 150)
  return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), r: (i * 97) % 360, c: CORES[i % CORES.length], t: (i % 9) * 35, f: i % 3, w: 7 + (i % 3) * 3 }
})
const ESTRELAS = [[-118, 30, 22, 0], [120, 10, 26, 0.5], [-92, 150, 16, 1.1], [102, 158, 18, 0.3], [4, -10, 20, 0.8]]

const BRASAS = Array.from({ length: 18 }, (_, i) => ({ x: ((i * 37) % 200) - 100, d: 1.6 + (i % 5) * 0.35, t: (i * 130) % 1800, w: 4 + (i % 3) * 2 }))
const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

// Tela de "ofensiva estendida" (estilo Duolingo): fundo escuro, a chama apaga -> acende com explosão,
// o número rola para cima e a faixa da semana marca o check de hoje.
// meta de dias da ofensiva: a salva (se ainda não foi batida) ou a menor marca a partir de hoje
const opcoesMeta = (n) => {
  const maiores = MARCOS.filter((m) => m > n)
  return (maiores.length ? maiores : [n + 10, n + 30, n + 50]).slice(0, 4)
}

function CenaOfensiva({ ev, onFechar }) {
  const { s, update } = useApp()
  const tema = TEMAS[ev.tema] || TEMAS.laranja
  const n = ev.chama.n
  const [on, setOn] = useState(false)
  const salva = s.meta?.metasOfensiva?.[ev.tipo]
  const meta = salva || MARCOS.find((m) => m >= n) || n
  const batida = n >= meta
  const opcoes = opcoesMeta(n)
  const [escolhida, setEscolhida] = useState(null)
  const escolhidaRef = useRef(null)
  escolhidaRef.current = escolhida

  const escolher = (m) => {
    setEscolhida(m)
    update((x) => { x.meta.metasOfensiva = { ...(x.meta.metasOfensiva || {}), [ev.tipo]: m } })
  }

  useEffect(() => {
    navigator.vibrate?.([30, 40, 70])
    const acende = setTimeout(() => { setOn(true); navigator.vibrate?.(40) }, 650)
    // com a escolha de meta na tela, não fecha sozinha
    const fim = batida ? null : setTimeout(onFechar, 9000)
    const tecla = (e) => e.key === 'Escape' && !(batida && !escolhidaRef.current) && onFechar()
    window.addEventListener('keydown', tecla)
    return () => {
      clearTimeout(acende)
      clearTimeout(fim)
      window.removeEventListener('keydown', tecla)
    }
  }, [])

  return (
    <div className="cel of" role="status" aria-live="polite" style={{ '--c1': tema[0], '--c2': tema[1] }} onClick={batida && !escolhida ? undefined : onFechar}>
      <div className="of-cena">
        <div className="of-palco" aria-hidden="true">
          <span className="of-brilho" />
          <span className="of-anel" />
          <span className="of-anel b" />
          <span className="of-brasas">
            {BRASAS.map((b, i) => <i key={i} style={{ '--x': `${b.x}px`, '--d': `${b.d}s`, '--t': `${b.t + 700}ms`, '--w': `${b.w}px` }} />)}
          </span>
          <span className="of-chama"><Chama on={on} azul={ev.chama.azul} /></span>
        </div>
        <div className="of-num" aria-label={`${n} dias`}>
          <b className="velho" aria-hidden="true">{Math.max(0, n - 1)}</b>
          <b className="novo">{n}</b>
        </div>
        <h2 className="of-titulo">{n === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}</h2>
        <p className="of-sub">{ev.titulo}{ev.sub ? ` ${ev.sub}` : ''}</p>
        {ev.semana && (
          <div className="of-semana" aria-hidden="true">
            {ev.semana.map((d, i) => (
              <div key={i} className={'of-dia' + (d.ok ? ' ok' : '') + (d.hoje ? ' hoje' : '')}>
                <span>{LETRAS[i]}</span>
                <i><Icon name="check" /></i>
              </div>
            ))}
          </div>
        )}
        {batida ? (
          <div className="of-meta" onClick={(e) => e.stopPropagation()}>
            <p>Meta de {meta} dias batida! Escolha a próxima:</p>
            <div role="group" aria-label="Próxima meta de dias">
              {opcoes.map((m) => (
                <button key={m} className={escolhida === m ? 'on' : ''} aria-pressed={escolhida === m} onClick={() => escolher(m)}>{m}<small>dias</small></button>
              ))}
            </div>
          </div>
        ) : (
          <div className="of-prog" aria-label={`${n} de ${meta} dias`}>
            <div><i style={{ width: `${Math.min(100, (n / meta) * 100)}%` }} /></div>
            <span>Meta: {n}/{meta} dias</span>
          </div>
        )}
        <button className="cel-btn of-btn" disabled={batida && !escolhida} onClick={(e) => { e.stopPropagation(); onFechar() }}>{batida && !escolhida ? 'Escolha uma meta' : 'Continuar'}</button>
      </div>
    </div>
  )
}

function Cena({ ev, onFechar }) {
  if (ev.chama) return <CenaOfensiva ev={ev} onFechar={onFechar} />
  const tema = TEMAS[ev.tema] || TEMAS.laranja
  const [num, setNum] = useState(ev.chama ? Math.max(0, ev.chama.n - 1) : null)

  useEffect(() => {
    navigator.vibrate?.([30, 40, 70])
    const sobe = ev.chama ? setTimeout(() => setNum(ev.chama.n), 800) : null
    const fim = setTimeout(onFechar, 7000)
    const tecla = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', tecla)
    return () => {
      clearTimeout(sobe)
      clearTimeout(fim)
      window.removeEventListener('keydown', tecla)
    }
  }, [])

  return (
    <div className="cel" role="status" aria-live="polite" style={{ '--c1': tema[0], '--c2': tema[1] }} onClick={onFechar}>
      <div className="cel-raios" aria-hidden="true" />
      <div className="cel-cena">
        <div className="cel-palco" aria-hidden="true">
          <span className="cel-sombra" />
          <span className="cel-confete">
            {CONFETE.map((c, i) => (
              <i key={i} className={'f' + c.f} style={{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg`, '--c': c.c, '--t': `${c.t + 500}ms`, '--w': `${c.w}px` }} />
            ))}
          </span>
          {ESTRELAS.map(([x, y, s, t], i) => (
            <svg key={i} className="cel-estrela" viewBox="0 0 24 24" style={{ '--ex': `${x}px`, '--ey': `${y}px`, '--es': `${s}px`, '--et': `${t + 0.6}s` }}>
              <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" />
            </svg>
          ))}
          <span className="cel-mov">
            <MascoteSprite visual={ev.pose === 2 || ev.pose === 5 || ev.pose === 3 ? visualDe(ev.pose, 'idle', SEM_DATA) : 'campeao'} altura={232} className="cel-img" rotulo="" />
          </span>
        </div>

        {ev.chama && (
          <div className="cel-selo">
            <Chama on={num > 0} azul={ev.chama.azul} />
            <b key={num}>{num}</b>
          </div>
        )}
        {ev.icone && <div className="cel-selo"><Icon name={ev.icone} /></div>}
        {ev.medalha && <div className="cel-medalha"><Medalha tier={ev.medalha.tier} icone={ev.medalha.icone} tamanho={112} /></div>}
        <h2 className="cel-titulo">{ev.titulo}</h2>
        {ev.sub && <p className="cel-sub">{ev.sub}</p>}
        <button className="cel-btn" onClick={onFechar}>Continuar</button>
      </div>
    </div>
  )
}

export default function CelebracaoHost() {
  const { s } = useApp()
  const [fila, setFila] = useState([])
  const prev = useRef(null)
  const idSeq = useRef(0)
  const empilhar = useCallback((evs) => setFila((f) => [...f, ...evs.map((e) => ({ ...e, id: ++idSeq.current }))]), [])

  useEffect(() => ouvir((e) => e.tipo === 'celebrar' && empilhar([e])), [empilhar])

  // Compara o estado anterior com o atual: se você acabou de bater uma meta, comemora.
  useEffect(() => {
    const iso = todayISO()
    const st = statusDia(s, iso)
    const agora = { iso, agua: aguaDoDia(s, iso) >= metaAgua(s), treino: st.treino === 'ok', dieta: st.dieta === 'ok', ids: new Set(s.logs.corridas.map((c) => c.id)) }
    const p = prev.current
    prev.current = agora
    if (!p || p.iso !== iso) return
    // só comemora mudanças feitas agora por você (não dados que chegaram da nuvem)
    if (Date.now() - Date.parse(s.meta?.editadoEm || 0) > 4000) return

    const semanaDe = (tipo) => {
      const seg = mondayOf(iso)
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(seg, i)
        const ok = d === iso || (d < iso && (tipo === 'agua' ? aguaDoDia(s, d) >= metaAgua(s) : statusDia(s, d)[tipo] === 'ok'))
        return { ok, hoje: d === iso }
      })
    }
    const evs = []
    if (agora.agua && !p.agua) {
      const n = sequenciaAgua(s).atual
      evs.push({ pose: 5, tema: 'azul', tipo: 'agua', semana: semanaDe('agua'), chama: { n, azul: true }, titulo: MARCOS.includes(n) ? `${n} dias de ofensiva de água!` : 'Meta de água batida!', sub: n > 1 ? `${n} dias seguidos batendo a meta.` : 'Hidratação em dia hoje.' })
    }
    if (agora.treino && !p.treino) {
      const n = sequencia(s, 'treino').atual
      evs.push({ pose: 1, tema: 'laranja', tipo: 'treino', semana: semanaDe('treino'), chama: { n }, titulo: MARCOS.includes(n) ? `${n} dias de ofensiva de treino!` : 'Treino concluído!', sub: n > 1 ? `Ofensiva de ${n} dias. Bora manter!` : 'Começou a sua ofensiva de treino.' })
    }
    if (agora.dieta && !p.dieta) {
      const n = sequencia(s, 'dieta').atual
      evs.push({ pose: 3, tema: 'verde', tipo: 'dieta', semana: semanaDe('dieta'), chama: { n }, titulo: MARCOS.includes(n) ? `${n} dias de ofensiva de dieta!` : 'Dieta do dia cumprida!', sub: n > 1 ? `${n} dias seguidos no plano.` : 'Um dia de cada vez.' })
    }
    const novas = s.logs.corridas.filter((c) => !p.ids.has(c.id))
    if (novas.length === 1) {
      const c = novas[0]
      const prs = (recordes(s.logs.corridas).porCorrida[c.id] || []).sort((a, b) => b.dist - a.dist)
      if (prs.length) {
        const m = prs[0]
        const primeira = prs.every((x) => x.anterior == null)
        evs.push({ pose: 2, tema: 'ouro', icone: 'trofeu', titulo: primeira ? 'Primeiras marcas registradas!' : 'Novo recorde pessoal!', sub: `${nomeDist(m.dist)} em ${fmtSeg(m.seg)}${m.anterior ? ` · ${fmtSeg(m.anterior - m.seg)} mais rápido que antes` : ''}` })
      } else if (c.km) {
        evs.push({ pose: 2, tema: 'laranja', icone: 'corrida', titulo: 'Corrida salva!', sub: `${String(c.km).replace('.', ',')} km${c.min ? ` em ${Math.floor(c.min)} min` : ''}. Bom trabalho!` })
      }
    }
    if (evs.length) empilhar(evs)
  }, [s, empilhar])

  const atual = fila[0]
  const fechar = useCallback(() => setFila((f) => f.slice(1)), [])
  return atual ? <Cena key={atual.id} ev={atual} onFechar={fechar} /> : null
}
