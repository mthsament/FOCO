import { useState } from 'react'
import { useApp } from '../store.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import { reagir } from '../lib/mascoteEventos.js'
import { fmtBR, fmtCurto, todayISO } from '../lib/dates.js'
import { treinoDoDia, ultimaCarga, historicoCarga } from '../lib/metrics.js'
import { Bar, DayPicker, Empty, Seg, num, toast } from '../components/ui.jsx'
import { useNav } from '../App.jsx'
import Icon from '../components/Icon.jsx'

const arred = (kg) => Math.round(kg * 2) / 2

export default function Treino() {
  const { s, update } = useApp()
  const { go } = useNav()
  const [iso, setIso] = useState(todayISO())
  const [forca, setForca] = useState(null)
  const treinos = s.plan.treinos

  if (!treinos) {
    return (
      <><MascoteAba aba="treino" /><Empty icon="treino" title="Nenhum treino importado">
        <button className="btn pri" onClick={() => go('config')}>Importar Plano_Academia.xlsx</button>
      </Empty></>
    )
  }

  const planejado = treinoDoDia(s, iso)
  const letra = forca || planejado || Object.keys(treinos)[0]
  const t = treinos[letra]
  const log = s.logs.treinos[iso]
  const logLetra = log?.letra === letra ? log : null

  const ensure = (x) => {
    const e = (x.logs.treinos[iso] = x.logs.treinos[iso] || { letra, feito: false, ex: {} })
    if (e.letra !== letra) {
      e.letra = letra
      e.ex = {}
    }
    e.ex = e.ex || {}
    return e
  }
  const setKg = (id, kg) =>
    update((x) => {
      const e = ensure(x)
      e.ex[id] = e.ex[id] || {}
      e.ex[id].kg = kg
    })
  const toggleSet = (ex, i) =>
    update((x) => {
      const e = ensure(x)
      const cur = (e.ex[ex.id] = e.ex[ex.id] || {})
      cur.sets = Array.from({ length: ex.series }, (_, k) => !!cur.sets?.[k])
      cur.sets[i] = !cur.sets[i]
    })
  const toggleSetComReacao = (ex, i) => {
    if (!s.logs.treinos[iso]?.ex?.[ex.id]?.sets?.[i]) reagir('forca', ['Boa série!', 'É isso, mais uma!', 'Força total!', 'Mandou bem!'])
    toggleSet(ex, i)
  }
  const concluir = () =>
    update((x) => {
      const e = ensure(x)
      e.feito = !e.feito
    })

  const setsTot = t.exercicios.reduce((a, e) => a + e.series, 0)
  const setsFeitos = t.exercicios.reduce((a, e) => a + (logLetra?.ex?.[e.id]?.sets || []).filter(Boolean).length, 0)

  const recentes = Object.entries(s.logs.treinos)
    .filter(([, v]) => v.feito)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8)

  return (
    <>
      <h1>Treino</h1>
      <p className="sub">{planejado ? `Hoje no plano: treino ${planejado}` : 'Sem musculação planejada neste dia'}</p>
      <MascoteAba aba="treino" />
      <DayPicker iso={iso} onChange={(d) => { setIso(d); setForca(null) }} />
      <div style={{ marginBottom: 12 }}>
        <Seg value={letra} onChange={setForca} options={Object.values(treinos).map((x) => [x.letra, `Treino ${x.letra}`])} />
      </div>

      <div className="card">
        <div className="row">
          <h2 className="sp"><span className="tag">{letra}</span> {t.nome}</h2>
          {logLetra?.feito && <span className="chip ok"><Icon name="check" /> Concluído</span>}
        </div>
        <div className="row small mut" style={{ marginBottom: 6 }}><span>{setsFeitos}/{setsTot} séries</span></div>
        <Bar pct={setsTot ? setsFeitos / setsTot : 0} />

        {t.exercicios.map((ex) => {
          const e = logLetra?.ex?.[ex.id] || {}
          const ant = ultimaCarga(s, ex.id, iso)
          const hist = historicoCarga(s, ex.id).filter((h) => h.data < iso)
          const ultima = hist[hist.length - 1]
          return (
            <div className="ex" key={ex.id}>
              <div className="row">
                <div className="sp">
                  <b>{ex.nome}</b>
                  <div className="mut small">{ex.series} × {ex.reps} · descanso {ex.descanso}</div>
                  {ex.obs && <div className="mut small"><Icon name="bulb" /> {ex.obs}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <input className="kg" type="number" inputMode="decimal" step="0.5" placeholder={ant ? String(ant) : 'kg'} value={e.kg ?? ''} onChange={(ev) => setKg(ex.id, num(ev.target.value))} aria-label={`Carga de ${ex.nome} em kg`} />
                </div>
              </div>
              <div className="row small mut" style={{ marginTop: 4 }}>
                {ultima ? <span>Última: {ultima.kg} kg ({fmtCurto(ultima.data)})</span> : <span>Sem carga anterior</span>}
                {ultima && <button className="btn sm ghost" onClick={() => setKg(ex.id, ultima.kg)}>usar {ultima.kg}</button>}
                {ultima && <button className="btn sm ghost" onClick={() => setKg(ex.id, arred(ultima.kg * 1.03))} title="Se fechou o topo das repetições em todas as séries: +2 a 5%">+3%: {arred(ultima.kg * 1.03)}</button>}
              </div>
              <div className="sets">
                {Array.from({ length: ex.series }, (_, i) => (
                  <button key={i} className={'set' + (e.sets?.[i] ? ' on' : '')} onClick={() => toggleSetComReacao(ex, i)} aria-label={`Série ${i + 1} de ${ex.nome}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        <div className="row" style={{ marginTop: 14 }}>
          <button className={'btn ' + (logLetra?.feito ? '' : 'pri')} onClick={() => { concluir(); toast(logLetra?.feito ? 'Treino reaberto' : 'Treino concluído') }}>
            {logLetra?.feito ? 'Reabrir treino' : 'Concluir treino'}
          </button>
        </div>
      </div>

      <div className="grid c2">
        <div className="card">
          <h2>Regras do treino</h2>
          <ul className="clean">
            {s.plan.regrasTreino.map((r) => (
              <li key={r.titulo}><b>{r.titulo}:</b> <span className="mut">{r.texto}</span></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>Treinos recentes</h2>
          {recentes.length === 0 && <div className="mut">Nenhum treino concluído ainda.</div>}
          {recentes.map(([d, v]) => (
            <div className="row" key={d} style={{ padding: '4px 0' }}>
              <span className="tag">{v.letra}</span>
              <span>{fmtBR(d)}</span>
              <span className="sp" />
              <button className="btn sm ghost" onClick={() => { setIso(d); setForca(null) }}>abrir</button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
