import { useState } from 'react'
import { useApp } from '../store.jsx'
import { useNav } from '../App.jsx'
import { DIAS, DIAS_LABEL, addDays, fmtLongo, mondayOf, planWeek, todayISO } from '../lib/dates.js'
import { corridaDoDia, inicioDoPlano, metas, pesoAtual, sequencia, sequenciaAgua, statusDia, treinoDoDia } from '../lib/metrics.js'
import { Bar, Check, Empty, Kpi, Streak, num, r1, toast } from '../components/ui.jsx'
import { Habitos, MealList } from '../components/Dia.jsx'
import Icon from '../components/Icon.jsx'
import Agua from '../components/Agua.jsx'

export default function Hoje() {
  const { s, update } = useApp()
  const { go } = useNav()
  const iso = todayISO()
  const ini = inicioDoPlano(s)
  const [peso, setPeso] = useState('')

  if (!s.plan.treinos && !s.plan.dieta && !s.plan.corrida) {
    return (
      <>
        <h1>Bem-vindo ao FOCO</h1>
        <p className="sub">Dieta, treino e corrida num lugar só.</p>
        <Empty icon="upload" title="Importe suas planilhas para começar">
          <p>Traga Plano_Academia, Plano_Corrida e Plano_Alimentacao_Suplementacao. O app monta tudo sozinho.</p>
          <button className="btn pri" onClick={() => go('config')}>Importar planilhas</button>
        </Empty>
      </>
    )
  }

  const semana = ini ? planWeek(iso, ini) : null
  const letra = treinoDoDia(s, iso)
  const cor = corridaDoDia(s, iso)
  const treinoLog = s.logs.treinos[iso]
  const treino = letra ? s.plan.treinos?.[letra] : null
  const setsTot = treino ? treino.exercicios.reduce((a, e) => a + e.series, 0) : 0
  const setsFeitos = treino ? treino.exercicios.reduce((a, e) => a + (treinoLog?.ex?.[e.id]?.sets || []).filter(Boolean).length, 0) : 0
  const corFeita = cor && (s.logs.corridasFeitas[cor.key] || s.logs.corridas.some((c) => c.data === iso))

  const seqT = sequencia(s, 'treino')
  const seqD = sequencia(s, 'dieta')
  const seqC = sequencia(s, 'creatina')
  const seqA = sequenciaAgua(s)
  const m = metas(s.perfil)
  const ref = pesoAtual(s)

  const segunda = mondayOf(iso)
  const semanaDias = DIAS.map((d, i) => {
    const di = addDays(segunda, i)
    return { d, di, st: statusDia(s, di).treino, rest: statusDia(s, di).treino === 'rest' }
  })

  const salvarPeso = () => {
    const kg = num(peso)
    if (!kg) return
    update((x) => {
      const i = x.logs.pesagens.findIndex((p) => p.data === iso)
      if (i >= 0) x.logs.pesagens[i].kg = kg
      else x.logs.pesagens.push({ data: iso, kg })
    })
    setPeso('')
    toast('Peso salvo')
  }

  const toggleCor = () =>
    update((x) => {
      if (x.logs.corridasFeitas[cor.key]) delete x.logs.corridasFeitas[cor.key]
      else x.logs.corridasFeitas[cor.key] = true
    })

  return (
    <>
      <h1>Hoje</h1>
      <p className="sub">
        {fmtLongo(iso)}
        {semana && semana >= 1 ? ` · Semana ${semana} do plano` : ''}
      </p>

      <div className="kpis">
        <Kpi cls="fire" v={<Streak n={seqT.atual} />} l={`Ofensiva de treino (melhor: ${seqT.melhor})`} />
        <Kpi cls="fire" v={<Streak n={seqD.atual} />} l={`Ofensiva de dieta (melhor: ${seqD.melhor})`} />
        <Kpi cls="fire" v={<Streak n={seqC.atual} />} l="Ofensiva da creatina" />
        <Kpi cls="fire azul" v={<Streak n={seqA.atual} azul />} l={`Ofensiva de água (melhor: ${seqA.melhor})`} />
        <Kpi v={ref ? `${r1(ref)} kg` : '–'} l={m ? `IMC ${r1(m.imc)}` : 'Peso atual'} />
      </div>

      <div className="card">
        <div className="week">
          {semanaDias.map(({ d, di, st, rest }) => (
            <div key={d} className={'d' + (di === iso ? ' today' : '') + (st === 'ok' ? ' ok' : st === 'miss' ? ' miss' : '')}>
              {DIAS_LABEL[d]}
              <b>{di.slice(8)}</b>
              <span className="wd">{rest ? <Icon name="minus" /> : st === 'ok' ? <Icon name="check" /> : st === 'miss' ? <Icon name="close" /> : <Icon name="ring" />}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid c2">
        <div className="card">
          <div className="row">
            <h2 className="sp"><Icon name="treino" /> Musculação</h2>
            {treinoLog?.feito && <span className="chip ok"><Icon name="check" /> Concluído</span>}
          </div>
          {treino ? (
            <>
              <div><span className="tag">{letra}</span> <b>{treino.nome}</b></div>
              <div className="mut small" style={{ margin: '6px 0' }}>{treino.exercicios.length} exercícios · {setsFeitos}/{setsTot} séries</div>
              <Bar pct={setsTot ? setsFeitos / setsTot : 0} />
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn pri" onClick={() => go('treino')}>{treinoLog?.feito ? 'Ver treino' : 'Abrir treino'}</button>
              </div>
            </>
          ) : (
            <div className="mut">Hoje não tem musculação. Descanse ou aproveite a corrida.</div>
          )}
        </div>

        <div className="card">
          <div className="row">
            <h2 className="sp"><Icon name="corrida" /> Corrida</h2>
            {corFeita && <span className="chip ok"><Icon name="check" /> Feita</span>}
          </div>
          {cor ? (
            <>
              <div><b>{cor.sessao.texto}</b></div>
              <div className="mut small" style={{ margin: '6px 0' }}>Semana {cor.semana} · {cor.fase}<br />Meta: {cor.meta}</div>
              <div className="row wrap" style={{ marginTop: 8 }}>
                <button className="btn pri" onClick={() => go('corrida', { iniciar: cor })}>Iniciar timer</button>
                <button className="btn" onClick={toggleCor}>{corFeita ? 'Desmarcar' : 'Marcar como feita'}</button>
              </div>
            </>
          ) : (
            <div className="mut">Sem corrida planejada hoje (corridas: quinta, sábado e domingo).</div>
          )}
        </div>
      </div>

      <div className="card">
        <h2><Icon name="dieta" /> Refeições de hoje</h2>
        <MealList iso={iso} />
      </div>

      <Agua iso={iso} />

      <div className="card">
        <h2>Hábitos do dia</h2>
        <Habitos iso={iso} />
      </div>

      <div className="card">
        <h2><Icon name="bio" /> Pesagem de hoje</h2>
        <div className="row">
          <input type="number" inputMode="decimal" step="0.1" placeholder="Peso em kg, em jejum…" aria-label="Peso em kg" autoComplete="off" value={peso} onChange={(e) => setPeso(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && salvarPeso()} />
          <button className="btn pri" onClick={salvarPeso}>Salvar</button>
        </div>
        <div className="mut small" style={{ marginTop: 6 }}>O plano pede 3 pesagens por semana, em jejum. Gordura e massa magra entram na aba Bio.</div>
      </div>
    </>
  )
}
