import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import { useNav } from '../App.jsx'
import { fmtBR, planWeek, todayISO, dateOf } from '../lib/dates.js'
import { fmtDur, fmtRitmo, inicioDoPlano, ritmo } from '../lib/metrics.js'
import { lerGps } from '../lib/gps.js'
import { corridaDuplicada, registrarCorrida } from '../lib/registro.js'
import { lerTexto } from '../lib/linkImport.js'
import { DISTANCIAS, fmtSeg, kmPorMes, medalhas, nomeDist, recordes, resumoPeriodo } from '../lib/corrida.js'
import RotaMapa from '../components/RotaMapa.jsx'
import DetalheCorrida from '../components/DetalheCorrida.jsx'
import Gravador from '../components/Gravador.jsx'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import IntervalTimer, { montarFases } from '../components/IntervalTimer.jsx'
import { Empty, Kpi, Seg, num, r1, toast } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const DIAS_CORRIDA = [['qui', 'Quinta'], ['sab', 'Sábado'], ['dom', 'Domingo']]
const vazio = () => ({ data: todayISO(), min: '', km: '', fc: '', esforco: '', obs: '' })

export default function Corrida() {
  const { s, update } = useApp()
  const { go, params } = useNav()
  const [aba, setAba] = useState('atividades')
  const [timer, setTimer] = useState(null) // sessão em andamento
  const [form, setForm] = useState(vazio)
  const [detalhe, setDetalhe] = useState(null) // id da corrida aberta
  const [gravando, setGravando] = useState(false)
  const [distSel, setDistSel] = useState(5000)
  const fileRef = useRef(null)
  const c = s.plan.corrida
  const ini = inicioDoPlano(s)

  useEffect(() => {
    if (params?.iniciar) setTimer(params.iniciar)
  }, [params])

  const semAtual = ini && c ? planWeek(todayISO(), ini) : 0
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

  // grava uma corrida; se a data cai numa sessão do plano, marca como feita
  const gravarCorrida = (reg, x) => registrarCorrida(x, reg)

  const salvar = () => {
    const min = num(form.min)
    if (!min || !form.data) return toast('Informe data e duração')
    update((x) => gravarCorrida({ ...form.extra, data: form.data, min, km: num(form.km), fc: num(form.fc), esforco: num(form.esforco), obs: form.obs, origem: form.origem || 'manual' }, x))
    setForm(vazio())
    toast('Corrida registrada')
    setAba('atividades')
  }

  const paraForm = (r, origem) => {
    const { data, min, km, fc, obs, ...extra } = r
    setForm({ ...vazio(), data: data || todayISO(), min: min ?? '', km: km ?? '', fc: fc ?? '', obs: obs || '', origem, extra })
  }

  const importar = async (ev) => {
    const arqs = [...(ev.target.files || [])]
    ev.target.value = ''
    if (!arqs.length) return
    try {
      const lidas = []
      for (const f of arqs) lidas.push({ ...lerGps(await f.text(), f.name), origem: 'arquivo' })
      if (lidas.length === 1) {
        paraForm(lidas[0], 'arquivo')
        setAba('registro')
        return toast('Arquivo lido. Confira e salve.')
      }
      // vários arquivos: salva direto, sem duplicar o que já existe
      update((x) => {
        for (const r of lidas) {
          const dup = x.logs.corridas.some((y) => y.data === r.data && Math.abs((y.km || 0) - (r.km || 0)) < 0.05 && Math.abs((y.min || 0) - (r.min || 0)) < 0.5)
          if (!r.data || dup) continue
          gravarCorrida(r, x)
        }
      })
      toast(`${lidas.length} arquivos lidos`)
      setAba('atividades')
    } catch (e) {
      toast(e.message)
    }
  }

  // Atalho do iPhone copia as corridas do Apple Saúde; aqui o app lê o que foi copiado.
  const colarSaude = async () => {
    try {
      const r = lerTexto(await navigator.clipboard.readText())
      if (r.erro || !r.corridas.length) return toast(r.erro || 'Nenhuma corrida válida no texto copiado.')
      let novas = 0
      update((x) => {
        for (const reg of r.corridas) {
          if (corridaDuplicada(x, reg)) continue
          registrarCorrida(x, reg)
          novas++
        }
      })
      toast(novas ? `${novas} ${novas === 1 ? 'corrida importada' : 'corridas importadas'} do Apple Saúde` : 'Essas corridas já estavam no FOCO.')
      setAba('atividades')
    } catch {
      toast('Não consegui ler o que foi copiado. Permita colar quando o iPhone perguntar.')
    }
  }

  const apagar = (id) => {
    update((d) => { d.logs.corridas = d.logs.corridas.filter((y) => y.id !== id) })
    setDetalhe(null)
  }

  const rec = recordes(corridas)
  const meds = medalhas(corridas)
  const ganhas = meds.filter((m) => m.ganhoEm)
  const tipoTip = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--txt)' }

  const aberta = detalhe && corridas.find((x) => x.id === detalhe)
  if (aberta) return <DetalheCorrida c={aberta} todas={corridas} onFechar={() => setDetalhe(null)} onApagar={() => apagar(aberta.id)} />

  return (
    <>
      <h1>Corrida</h1>
      <p className="sub">{c ? `${c.semanas.length} semanas até os 5 km · meta: ${c.meta5kMin} min` : 'Suas atividades, recordes e medalhas'}</p>
      <MascoteAba aba="corrida" />

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

      <input ref={fileRef} type="file" accept=".gpx,.tcx,application/gpx+xml" multiple hidden onChange={importar} />

      {gravando && (
        <Gravador
          onFechar={() => setGravando(false)}
          onFim={(r) => { setGravando(false); paraForm(r, 'gps'); setAba('registro'); toast('Corrida gravada. Confira e salve.') }}
        />
      )}

      <div className="kpis">
        {c && <Kpi v={`${feitas}/${c.semanas.length * 3}`} l="Sessões do plano feitas" />}
        <Kpi v={`${r1(kmTotal)} km`} l="Distância registrada" />
        <Kpi v={melhor ? `${fmtRitmo(melhor)} /km` : '–'} l="Melhor ritmo (total)" />
        <Kpi v={String(corridas.length)} l="Corridas" />
        {c && <Kpi v={semAtual >= 1 && semAtual <= c.semanas.length ? `Sem ${semAtual}` : '–'} l="Semana atual" />}
      </div>

      {!gravando && (
        <div className="row wrap" style={{ marginBottom: 14 }}>
          <button className="btn pri" onClick={() => { setGravando(true); window.scrollTo(0, 0) }}><Icon name="pin" /> Gravar com GPS</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="clip" /> Importar do relógio</button>
          <button className="btn" onClick={colarSaude}><Icon name="clip" /> Colar do Apple Saúde</button>
        </div>
      )}

      <div style={{ marginBottom: 14, overflowX: 'auto' }}>
        <Seg value={aba} onChange={setAba} options={[['atividades', 'Atividades'], ['recordes', 'Recordes'], ...(c ? [['plano', 'Plano']] : []), ['registro', 'Registrar'], ...(c ? [['dicas', 'Dicas']] : [])]} />
      </div>

      {aba === 'atividades' && (
        <div>
          {corridas.length === 0 && (
            <div className="card empty">
              <div className="em" aria-hidden="true"><Icon name="rota" size={40} /></div>
              <h2>Nenhuma corrida ainda</h2>
              <p>Grave uma corrida com o GPS do celular ou importe o arquivo GPX/TCX do seu relógio. O trajeto, as parciais e os recordes aparecem aqui.</p>
            </div>
          )}
          {corridas.map((x) => {
            const prs = rec.porCorrida[x.id] || []
            const rs = x.km && x.min ? (x.min * 60) / x.km : null
            return (
              <button key={x.id} type="button" className="atv" onClick={() => setDetalhe(x.id)}>
                <div className="atv-mapa">{x.trilha ? <RotaMapa trilha={x.trilha} altura={160} mini /> : <Icon name="corrida" size={28} />}</div>
                <div className="atv-corpo">
                  <div className="atv-top"><b>{x.km ? `${r1(x.km)} km` : 'Corrida'}</b><span className="mut small">{fmtBR(x.data)}</span></div>
                  <div className="atv-nums">
                    <span><b>{fmtDur(x.min)}</b> tempo</span>
                    {rs && <span><b>{fmtSeg(rs)}</b> /km</span>}
                    {x.subida != null && <span><b>{x.subida} m</b> subida</span>}
                    {x.fc && <span><b>{x.fc}</b> bpm</span>}
                  </div>
                  {prs.length > 0 && <div className="atv-pr"><Icon name="trofeu" /> {prs.length === 1 ? `Recorde de ${nomeDist(prs[0].dist)}` : `${prs.length} recordes`}</div>}
                  {x.obs && <div className="mut small atv-obs">{x.obs}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {aba === 'recordes' && (
        <>
          <div className="kpis">
            {[7, 30, 90].map((d) => {
              const r = resumoPeriodo(corridas, d)
              return <Kpi key={d} v={`${r1(r.km)} km`} l={`Últimos ${d} dias · ${r.n} ${r.n === 1 ? 'corrida' : 'corridas'}`} />
            })}
            <Kpi v={rec.maisLonga ? `${r1(rec.maisLonga.km)} km` : '–'} l="Corrida mais longa" />
          </div>

          <div className="card">
            <h2><Icon name="trofeu" /> Recordes pessoais</h2>
            <div className="scroll">
              <table>
                <thead><tr><th>Distância</th><th>Tempo</th><th>Ritmo</th><th>Quando</th></tr></thead>
                <tbody>
                  {DISTANCIAS.map(([D, nome]) => {
                    const r = rec.atuais[D]
                    return (
                      <tr key={D} className={r ? 'clicavel' : ''} onClick={() => r && setDetalhe(r.id)}>
                        <td><b>{nome}</b></td>
                        <td>{r ? <b className="pr-t">{fmtSeg(r.seg)}</b> : '–'}</td>
                        <td className="mut">{r ? `${fmtSeg(r.seg / (D / 1000))} /km` : ''}</td>
                        <td className="mut">{r ? fmtBR(r.data) : 'ainda não'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mut small" style={{ marginTop: 8 }}>Os recordes saem do melhor trecho de cada corrida com trajeto GPS. Corridas digitadas à mão só entram se a distância for igual à marca.</p>
          </div>

          <div className="grid c2">
            <div className="card">
              <h2>Evolução do tempo</h2>
              <div className="chips-sel" role="group" aria-label="Distância">
                {DISTANCIAS.filter(([D]) => rec.historico[D]?.length).map(([D, nome]) => (
                  <button key={D} type="button" className={'chip sel' + (D === distSel ? ' acc' : '')} aria-pressed={D === distSel} onClick={() => setDistSel(D)}>{nome}</button>
                ))}
              </div>
              {(rec.historico[distSel] || []).length < 1 ? (
                <div className="mut small" style={{ marginTop: 10 }}>Sem marcas para esta distância ainda.</div>
              ) : (
                <div style={{ width: '100%', height: 200, marginTop: 8 }}>
                  <ResponsiveContainer>
                    <LineChart data={rec.historico[distSel].map((h) => ({ d: h.data.slice(8) + '/' + h.data.slice(5, 7), seg: h.seg, pr: h.pr ? h.seg : null }))}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="d" />
                      <YAxis reversed domain={['dataMin - 20', 'dataMax + 20']} width={46} tickFormatter={fmtSeg} />
                      <Tooltip contentStyle={tipoTip} formatter={(v, n) => [fmtSeg(v), n]} />
                      <Line isAnimationActive={false} type="monotone" dataKey="seg" name="Tempo" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line isAnimationActive={false} type="monotone" dataKey="pr" name="Recorde" stroke="none" dot={{ r: 6, fill: 'var(--acc)', stroke: 'var(--card)', strokeWidth: 2 }} activeDot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mut small">Pontos laranja: quando você bateu o recorde. Eixo invertido: mais alto é mais rápido.</div>
            </div>

            <div className="card">
              <h2>Distância por mês (km)</h2>
              {kmPorMes(corridas).length < 1 ? <div className="mut small">Registre corridas com distância.</div> : (
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <BarChart data={kmPorMes(corridas)}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="mes" /><YAxis width={34} />
                      <Tooltip contentStyle={tipoTip} />
                      <Bar isAnimationActive={false} dataKey="km" name="km" fill="var(--acc)" maxBarSize={44} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2><Icon name="medalha" /> Medalhas <span className="mut small">{ganhas.length} de {meds.length}</span></h2>
            <div className="medalhas">
              {meds.map((m) => (
                <div key={m.id} className={'medalha' + (m.ganhoEm ? ' on' : '')}>
                  <div className="hex"><Icon name={m.icone} /></div>
                  <b>{m.nome}</b>
                  <span className="mut small">{m.ganhoEm ? fmtBR(m.ganhoEm) : m.progresso != null ? `${Math.round(m.progresso * 100)}%` : m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {aba === 'plano' && c && (
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
                    <button className={'check' + (feita(w.sem, k) ? ' on' : '')} onClick={() => toggle(w.sem, k)} aria-label={`Marcar ${l} da semana ${w.sem}`}>{feita(w.sem, k) ? <Icon name="check" /> : null}</button>
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
              <label className="fld"><span className="f">Data</span><input autoComplete="off" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></label>
              <label className="fld"><span className="f">Duração (min)</span><input autoComplete="off" type="number" inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></label>
              <label className="fld"><span className="f">Distância (km)</span><input autoComplete="off" type="number" inputMode="decimal" step="0.01" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} /></label>
              <label className="fld"><span className="f">FC média (bpm)</span><input autoComplete="off" type="number" inputMode="numeric" value={form.fc} onChange={(e) => setForm({ ...form, fc: e.target.value })} /></label>
              <label className="fld"><span className="f">Esforço (0-10)</span><input autoComplete="off" type="number" inputMode="numeric" min="0" max="10" value={form.esforco} onChange={(e) => setForm({ ...form, esforco: e.target.value })} /></label>
            </div>
            <label className="fld" style={{ marginTop: 10 }}><span className="f">Observações (dor, sono, clima)</span><input autoComplete="off" type="text" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} /></label>
            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn pri" onClick={salvar}>Salvar corrida</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="clip" /> Importar GPX/TCX</button>
            </div>
            <p className="mut small">Do relógio: no Fitbeing ou no Strava, exporte a atividade em GPX ou TCX e importe aqui. A distância, o tempo e o trajeto vêm do relógio. Escolha vários arquivos de uma vez para trazer seu histórico e montar os recordes.</p>
          </div>

        </>
      )}

      {aba === 'dicas' && c && (
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
