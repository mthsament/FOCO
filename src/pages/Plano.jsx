import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../store.jsx'
import { useNav } from '../App.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import Icon from '../components/Icon.jsx'
import { Bar } from '../components/ui.jsx'
import { todayISO } from '../lib/dates.js'
import { corridaDoDia, refeicoesDoDia, treinoDoDia } from '../lib/metrics.js'
import Treino from './Treino.jsx'
import Dieta from './Dieta.jsx'
import Corrida from './Corrida.jsx'

// Treino, dieta e corrida numa aba só. Os três cartões do topo resumem o dia de hoje e também
// servem para trocar de seção; embaixo fica a tela completa de cada um.
const SECOES = ['treino', 'dieta', 'corrida']
const ROT = { treino: 'Musculação', dieta: 'Alimentação', corrida: 'Corrida' }

function resumoDeHoje(s) {
  const iso = todayISO()
  // treino
  const letra = treinoDoDia(s, iso)
  const t = letra ? s.plan.treinos?.[letra] : null
  const log = s.logs.treinos[iso]
  const tot = t ? t.exercicios.reduce((a, e) => a + e.series, 0) : 0
  const fe = t ? t.exercicios.reduce((a, e) => a + (log?.ex?.[e.id]?.sets || []).filter(Boolean).length, 0) : 0
  const treino = !s.plan.treinos
    ? { titulo: 'Monte seu treino', sub: 'Crie do zero ou importe', pct: 0 }
    : !t
      ? { titulo: 'Descanso', sub: 'Sem musculação hoje', pct: 0 }
      : { titulo: `Treino ${letra}`, sub: t.nome || `${t.exercicios.length} exercícios`, pct: tot ? fe / tot : 0, ok: !!log?.feito, extra: log?.feito ? '' : `${fe}/${tot}` }
  // dieta
  const refs = s.plan.dieta ? refeicoesDoDia(s, iso).filter((m) => !m.opcional) : []
  const feitas = refs.filter((m) => m.feita).length
  const dieta = !s.plan.dieta
    ? { titulo: 'Sem dieta', sub: 'Importe a planilha', pct: 0 }
    : { titulo: `${feitas}/${refs.length} refeições`, sub: refs.length && feitas === refs.length ? 'Dia completo' : 'feitas hoje', pct: refs.length ? feitas / refs.length : 0, ok: refs.length > 0 && feitas === refs.length }
  // corrida
  const cor = corridaDoDia(s, iso)
  const corFeita = cor && (s.logs.corridasFeitas[cor.key] || s.logs.corridas.some((c) => c.data === iso))
  const corrida = cor
    ? { titulo: 'Corrida de hoje', sub: cor.sessao.texto, pct: corFeita ? 1 : 0, ok: !!corFeita, extra: corFeita ? '' : 'pendente' }
    : { titulo: 'Sem corrida', sub: s.logs.corridas.length ? `${s.logs.corridas.length} no histórico` : 'Nada planejado hoje', pct: 0 }
  return { treino, dieta, corrida }
}

export default function Plano() {
  const { s } = useApp()
  const { params } = useNav()
  const [secao, setSecao] = useState(SECOES.includes(params?.secao) ? params.secao : 'treino')
  const [foco, setFoco] = useState(false) // editor de treino ou detalhe de corrida abertos: esconde o painel
  const onFoco = useCallback((v) => setFoco(v), [])

  useEffect(() => {
    if (SECOES.includes(params?.secao)) setSecao(params.secao)
  }, [params])

  const r = resumoDeHoje(s)

  return (
    <>
      {!foco && (
        <>
          <h1>Plano</h1>
          <p className="sub">Treino, dieta e corrida de hoje, e o plano completo de cada um</p>
          <MascoteAba aba={secao} />
          <div className="plano-tiles" role="tablist" aria-label="Seções do plano">
            {SECOES.map((k) => {
              const d = r[k]
              return (
                <button key={k} role="tab" aria-selected={secao === k} className={'plano-tile' + (secao === k ? ' on' : '') + (d.ok ? ' ok' : '')} onClick={() => setSecao(k)}>
                  <span className="pt-ico"><Icon name={k} /></span>
                  <span className="pt-txt">
                    <small>{ROT[k]}</small>
                    <b>{d.titulo}</b>
                    <em>{d.sub}</em>
                  </span>
                  {d.ok ? <span className="pt-ok"><Icon name="check" /></span> : d.extra ? <span className="pt-extra">{d.extra}</span> : null}
                  <span className="pt-bar"><Bar pct={d.pct} cls={k === 'dieta' ? 'blue' : ''} /></span>
                </button>
              )
            })}
          </div>
        </>
      )}
      {secao === 'treino' && <Treino onFoco={onFoco} />}
      {secao === 'dieta' && <Dieta />}
      {secao === 'corrida' && <Corrida onFoco={onFoco} />}
    </>
  )
}
