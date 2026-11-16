import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { useNav } from '../App.jsx'
import { fmtBR, planWeek, todayISO, dateOf } from '../lib/dates.js'
import { fmtDur, fmtRitmo, inicioDoPlano, ritmo } from '../lib/metrics.js'
import { lerGps } from '../lib/gps.js'
import IntervalTimer, { montarFases } from '../components/IntervalTimer.jsx'
import { Empty, Kpi, Seg, num, r1, toast } from '../components/ui.jsx'

const DIAS_CORRIDA = [['qui', 'Quinta'], ['sab', 'Sábado'], ['dom', 'Domingo']]
const vazio = () => ({ data: todayISO(), min: '', km: '', fc: '', esforco: '', obs: '' })

export default function Corrida() {
  const { s, update } = useApp()
  const { go, params } = useNav()
  const [aba, setAba] = useState('plano')
  const [timer, setTimer] = useState(null) // sessão em andamento
  const [form, setForm] = useState(vazio)
  const fileRef = useRef(null)
  const c = s.plan.corrida
  const ini = inicioDoPlano(s)

  useEffect(() => {
    if (params?.iniciar) setTimer(params.iniciar)
  }, [params])

  if (!c) {
    return (
      <Empty emoji="🏃" title="Nenhum plano de corrida importado">
        <button className="btn pri" onClick={() => go('config')}>Importar Plano_Corrida.xlsx</button>
      </Empty>
    )
  }

  const semAtual = ini ? planWeek(todayISO(), ini) : 0
  const feita = (sem, dia) => !!s.logs.corridasFeitas[`${sem}|${dia}`]
  const toggle = (sem, dia) =>
    update((x) => {
      const k = `${sem}|${dia}`
      if (x.logs.corridasFeitas[k]) delete x.logs.corridasFeitas[k]
      else x.logs.corridasFeitas[k] = true
    })

  const corridas = [...s.logs.corridas].sort((a, b) => b.data.localeCompare(a.data))
  const kmTotal = corridas.reduce((a, x) => a + (x.km || 0), 0)
  const melhor = corridas.reduce((m, x) => { const r = ritmo(x.min, x.km); return r && (!m || r < m) ? r : m }, null)
  const feitas = Object.keys(s.logs.corridasFeitas).length

  const salvar = () => {
    const min = num(form.min)
    if (!min || !form.data) return toast('Informe data e duração')
    update((x) => {
      x.logs.corridas.push({ id: `c-${Date.now()}`, data: form.data, min, km: num(form.km), fc: num(form.fc), esforco: num(form.esforco), obs: form.obs, origem: form.origem || 'manual' })
      // se a data cai numa sessão do plano, marca como feita
      if (ini) {
        const w = planWeek(form.data, ini)
        const dia = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date(form.data + 'T12:00:00').getDay()]
        if (w >= 1 && w <= c.semanas.length && ['qui', 'sab', 'dom'].includes(dia)) x.logs.corridasFeitas[`${w}|${dia}`] = true
      }
    })
    setForm(vazio())
    toast('Corrida registrada 🏃')
    setAba('registro')
  }

  const importar = async (ev) => {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    try {
      const r = lerGps(await f.text(), f.name)
      setForm({ ...vazio(), data: r.data || todayISO(), min: r.min ?? '', km: r.km ?? '', fc: r.fc ?? '', obs: r.obs, origem: 'arquivo' })
      setAba('registro')
      toast('Arquivo lido. Confira e salve.')
    } catch (e) {
      toast(e.message)
    }
  }

  return (
    <>
      <h1>Corrida</h1>
      <p className="sub">{c.semanas.length} semanas até os 5 km · meta: {c.meta5kMin} min</p>

      {timer && (
        <IntervalTimer
          sessao={timer.sessao}
          onFechar={() => setTimer(null)}
          onFim={(min) => {
            setForm({ ...vazio(), min, obs: `Sessão ${timer.sessao.texto}` })
            setTimer(null)
            setAba('registro')
          }}
        />
      )}

      <div className="kpis">
        <Kpi v={`${feitas}/${c.semanas.length * 3}`} l="Sessões do plano feitas" />
        <Kpi v={`${r1(kmTotal)} km`} l="Distância registrada" />
        <Kpi v={melhor ? `${fmtRitmo(melhor)} /km` : '–'} l="Melhor ritmo (total)" />
        <Kpi v={semAtual >= 1 && semAtual <= c.semanas.length ? `Sem ${semAtual}` : '–'} l="Semana atual" />
      </div>

      <div style={{ marginBottom: 14, overflowX: 'auto' }}>
        <Seg value={aba} onChange={setAba} options={[['plano', 'Plano'], ['registro', 'Registrar'], ['dicas', 'Dicas']]} />
      </div>

      {aba === 'plano' && (
        <div className="card">
          <p className="mut small">Toda sessão tem 5 min de caminhada antes e 5 min depois. Toque em ▶ para o timer com avisos sonoros, ou na caixa para marcar como feita.</p>
          <div className="wks">
            {c.semanas.map((w) => (
              <div key={w.sem} className={'wk' + (w.sem === semAtual ? ' cur' : '')}>
                <div className="row">
                  <b>Semana {w.sem}</b>
                  <span className="mut small">{ini ? `a partir de ${fmtBR(dateOf(ini, w.sem, 'seg')).slice(0, 5)}` : ''}</span>
                  <span className="sp" />
                  <span className={'chip' + (w.sem === semAtual ? ' acc' : '')}>{w.fase}</span>
                </div>
                <div className="mut small" style={{ margin: '2px 0 6px' }}>Meta: {w.meta}</div>
                {DIAS_CORRIDA.map(([k, l]) => (
                  <div className="ses" key={k}>
                    <button className={'check' + (feita(w.sem, k) ? ' on' : '')} onClick={() => toggle(w.sem, k)} aria-label={`Marcar ${l} da semana ${w.sem}`}>{feita(w.sem, k) ? '✓' : ''}</button>
                    <span className="mut">{l}</span>
                    <b>{w[k].texto}</b>
                    {montarFases(w[k]) ? <button className="btn sm" onClick={() => { setTimer({ sessao: w[k] }); window.scrollTo(0, 0) }} aria-label="Iniciar timer">▶</button> : <span />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {aba === 'registro' && (
        <>
          <div className="card">
            <h2>Registrar corrida</h2>
            <div className="form">
              <div><label className="f">Data</label><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              <div><label className="f">Duração (min)</label><input type="number" inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
              <div><label className="f">Distância (km)</label><input type="number" inputMode="decimal" step="0.01" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} /></div>
              <div><label className="f">FC média (bpm)</label><input type="number" inputMode="numeric" value={form.fc} onChange={(e) => setForm({ ...form, fc: e.target.value })} /></div>
              <div><label className="f">Esforço (0-10)</label><input type="number" inputMode="numeric" min="0" max="10" value={form.esforco} onChange={(e) => setForm({ ...form, esforco: e.target.value })} /></div>
            </div>
            <div style={{ marginTop: 10 }}><label className="f">Observações (dor, sono, clima)</label><input type="text" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} /></div>
            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn pri" onClick={salvar}>Salvar corrida</button>
              <button className="btn" onClick={() => fileRef.current?.click()}>📎 Importar GPX/TCX</button>
              <input ref={fileRef} type="file" accept=".gpx,.tcx,application/gpx+xml" hidden onChange={importar} />
            </div>
            <p className="mut small">Do relógio: no Fitbeing ou no Strava, exporte a atividade em GPX ou TCX e importe aqui. A distância e o tempo vêm do relógio, não do timer.</p>
          </div>

          <div className="card">
            <h2>Histórico</h2>
            {corridas.length === 0 && <div className="mut">Nenhuma corrida registrada ainda.</div>}
            <div className="scroll">
              <table>
                <tbody>
                  {corridas.map((x) => (
                    <tr key={x.id}>
                      <td><b>{fmtBR(x.data)}</b><div className="mut small">{x.obs}</div></td>
                      <td>{fmtDur(x.min)}</td>
                      <td>{x.km ? `${r1(x.km)} km` : '–'}</td>
                      <td>{x.km ? `${fmtRitmo(ritmo(x.min, x.km))}/km` : ''}</td>
                      <td>{x.fc ? `${x.fc} bpm` : ''}</td>
                      <td><button className="btn sm ghost danger" onClick={() => update((d) => { d.logs.corridas = d.logs.corridas.filter((y) => y.id !== x.id) })} aria-label="Apagar">🗑</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {aba === 'dicas' && (
        <div className="card">
          <h2>Intensidade e cuidados</h2>
          {Object.values(c.horarios).length > 0 && (
            <ul className="clean">{DIAS_CORRIDA.map(([k, l]) => c.horarios[k] && <li key={k}><b>{l} · {c.horarios[k].hora}:</b> <span className="mut">{c.horarios[k].nota}</span></li>)}</ul>
          )}
          <ul className="clean">{c.dicas.map((d) => <li key={d.titulo}><b>{d.titulo}:</b> <span className="mut">{d.texto}</span></li>)}</ul>
        </div>
      )}
    </>
  )
}
