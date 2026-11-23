import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { addDays, todayISO, weekdayIndex } from '../lib/dates.js'
import { aguaDoDia, metaAgua, sequencia, sequenciaAgua, statusDia } from '../lib/metrics.js'
import { Streak } from './ui.jsx'
import Icon from './Icon.jsx'

// Calendário das ofensivas: escolha o tipo (treino, dieta, água, creatina) e veja os dias cumpridos.
// Dias seguidos se ligam numa faixa colorida; a ofensiva atual aparece em cor viva.
const TIPOS = [
  ['treino', 'Treino', '#ff6b35'],
  ['dieta', 'Dieta', '#22b573'],
  ['agua', 'Água', '#2f9bff'],
  ['creatina', 'Creatina', '#8b6cf0'],
]
const SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function statusTipo(s, iso, tipo, hoje, primeiraAgua) {
  if (iso > hoje) return 'futuro'
  if (tipo === 'agua') {
    if (aguaDoDia(s, iso) >= metaAgua(s)) return 'ok'
    if (iso === hoje) return 'pending'
    return primeiraAgua && iso >= primeiraAgua ? 'miss' : 'rest'
  }
  return statusDia(s, iso, hoje)[tipo]
}

export default function CalendarioOfensiva({ onFechar }) {
  const { s } = useApp()
  const hoje = todayISO()
  const [tipo, setTipo] = useState('treino')
  const [mes, setMes] = useState(hoje.slice(0, 7))
  const fecharRef = useRef(null)

  // foco no botão de fechar, Esc fecha, rolagem da página travada enquanto aberto
  useEffect(() => {
    const antes = document.activeElement
    fecharRef.current?.focus()
    const tecla = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', tecla)
    const ov = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = ov
      antes?.focus?.()
    }
  }, [])

  const cor = TIPOS.find((t) => t[0] === tipo)[2]
  const primeiraAgua = useMemo(() => Object.keys(s.logs.dieta).filter((d) => s.logs.dieta[d]?.agua > 0).sort()[0], [s.logs.dieta])
  const seq = tipo === 'agua' ? sequenciaAgua(s) : sequencia(s, tipo)

  // dias da ofensiva atual: volta a partir de hoje; "descanso" e "hoje pendente" não quebram
  const atual = useMemo(() => {
    const set = new Set()
    let d = hoje
    for (let i = 0; i < 400; i++) {
      const st = statusTipo(s, d, tipo, hoje, primeiraAgua)
      if (st === 'ok') set.add(d)
      else if (st === 'miss') break
      d = addDays(d, -1)
    }
    return set
  }, [s, tipo, hoje, primeiraAgua])

  const [ano, m] = mes.split('-').map(Number)
  const primeiro = `${mes}-01`
  const total = new Date(ano, m, 0).getDate()
  const celulas = [...Array(weekdayIndex(primeiro)).fill(null), ...Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)]
  while (celulas.length % 7) celulas.push(null)
  const info = celulas.map((iso) => (iso ? { iso, st: statusTipo(s, iso, tipo, hoje, primeiraAgua) } : null))
  const cumpridos = info.filter((c) => c?.st === 'ok').length

  const noMesAtual = mes >= hoje.slice(0, 7)
  const nomeMesBruto = new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const nomeMes = nomeMesBruto.charAt(0).toUpperCase() + nomeMesBruto.slice(1)

  return (
    <div className="cal-fundo" onClick={onFechar}>
      <div className="cal-folha" role="dialog" aria-modal="true" aria-label="Calendário de ofensivas" style={{ '--cal': cor }} onClick={(e) => e.stopPropagation()}>
        <div className="cal-topo">
          <h2 className="sp"><Icon name="calendario" /> Ofensivas</h2>
          <button ref={fecharRef} className="iconbtn" onClick={onFechar} aria-label="Fechar calendário"><Icon name="close" /></button>
        </div>

        <div className="cal-tipos" role="group" aria-label="Tipo de ofensiva">
          {TIPOS.map(([k, nome, c]) => (
            <button key={k} className={'cal-tipo' + (tipo === k ? ' on' : '')} style={{ '--tc': c }} aria-pressed={tipo === k} onClick={() => setTipo(k)}>{nome}</button>
          ))}
        </div>

        <div className="cal-resumo">
          <Streak n={seq.atual} azul={tipo === 'agua'} />
          <div>
            <b>{seq.atual} {seq.atual === 1 ? 'dia' : 'dias'} seguidos</b>
            <div className="mut small">Melhor ofensiva: {seq.melhor} {seq.melhor === 1 ? 'dia' : 'dias'}</div>
          </div>
        </div>

        <div className="cal-nav">
          <button className="iconbtn" onClick={() => setMes(addDays(primeiro, -1).slice(0, 7))} aria-label="Mês anterior"><Icon name="chevL" /></button>
          <b className="sp cal-mes">{nomeMes}</b>
          <button className="iconbtn" onClick={() => setMes(addDays(`${mes}-28`, 5).slice(0, 7))} disabled={noMesAtual} aria-label="Próximo mês"><Icon name="chevR" /></button>
        </div>

        <div className="cal-grade" role="grid" aria-label={nomeMes}>
          {SEMANA.map((d) => <div key={d} className="cal-sem" role="columnheader">{d}</div>)}
          {info.map((c, k) => {
            if (!c) return <div key={k} className="cal-d vazio" />
            const col = k % 7
            const ok = c.st === 'ok'
            const le = ok && col > 0 && info[k - 1]?.st === 'ok'
            const ld = ok && col < 6 && info[k + 1]?.st === 'ok'
            const cls = ['cal-d', c.st, ok && atual.has(c.iso) ? 'atual' : '', le ? 'le' : '', ld ? 'ld' : '', c.iso === hoje ? 'hoje' : ''].join(' ')
            const rot = { ok: 'cumprido', miss: 'não cumprido', rest: 'sem meta', pending: 'em andamento', futuro: 'futuro' }[c.st]
            return (
              <div key={c.iso} className={cls} role="gridcell" aria-label={`${Number(c.iso.slice(8))}, ${rot}`}>
                <span className="cal-n">{Number(c.iso.slice(8))}</span>
              </div>
            )
          })}
        </div>

        <div className="cal-leg">
          <span><i className="ok" /> Cumprido</span>
          <span><i className="miss" /> Perdido</span>
          <span><i className="rest" /> Sem meta</span>
          <span className="sp" />
          <span className="mut">{cumpridos} {cumpridos === 1 ? 'dia' : 'dias'} no mês</span>
        </div>
      </div>
    </div>
  )
}
