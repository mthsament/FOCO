import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../store.jsx'
import { addDays, dateOf, fmtCurto, planWeek, todayISO } from '../lib/dates.js'
import { Garrafa } from '../components/Agua.jsx'
import { aderencia, aguaDoDia, metaAgua, historicoCarga, inicioDoPlano, kmPorSemana, metas, pesagensOrdenadas, pesoAtual, ritmo, sequencia, sequenciaAgua, statusDia } from '../lib/metrics.js'
import { Kpi, Streak, num, r1, toast } from '../components/ui.jsx'

const C = { acc: 'var(--acc)', blue: 'var(--blue)', violet: 'var(--violet)', warn: 'var(--warn)', bad: 'var(--bad)', grid: 'var(--line)' }
const tip = { contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--txt)' }, labelStyle: { color: 'var(--mut)' } }

function ChartCard({ titulo, children, vazio, nota }) {
  return (
    <div className="card">
      <h2>{titulo}</h2>
      {vazio ? <div className="mut small">{vazio}</div> : <div style={{ width: '100%', height: 220 }}><ResponsiveContainer>{children}</ResponsiveContainer></div>}
      {nota && <div className="mut small" style={{ marginTop: 6 }}>{nota}</div>}
    </div>
  )
}

export default function Evolucao() {
  const { s, update } = useApp()
  const ini = inicioDoPlano(s)
  const hoje = todayISO()
  const [f, setF] = useState({ data: hoje, kg: '', gordura: '', massaMagra: '', agua: '', cintura: '' })

  const pes = pesagensOrdenadas(s)
  const ref = pesoAtual(s)
  const m = metas(s.perfil)
  const base = s.perfil.pesoInicial
  const semAtual = ini ? planWeek(hoje, ini) : 0

  const salvar = () => {
    const kg = num(f.kg)
    const cm = num(f.cintura)
    if (!kg && !cm) return toast('Informe o peso ou a cintura')
    update((x) => {
      if (kg) {
        const extra = { gordura: num(f.gordura), massaMagra: num(f.massaMagra), agua: num(f.agua) }
        const i = x.logs.pesagens.findIndex((p) => p.data === f.data)
        const reg = { data: f.data, kg, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v != null)) }
        if (i >= 0) x.logs.pesagens[i] = { ...x.logs.pesagens[i], ...reg }
        else x.logs.pesagens.push(reg)
      }
      if (cm) {
        const i = x.logs.cintura.findIndex((p) => p.data === f.data)
        if (i >= 0) x.logs.cintura[i].cm = cm
        else x.logs.cintura.push({ data: f.data, cm })
      }
    })
    setF({ ...f, kg: '', gordura: '', massaMagra: '', agua: '', cintura: '' })
    toast('Medição salva')
  }

  const dadosPeso = useMemo(() => {
    const g = {}
    pes.forEach((p) => { const w = ini ? planWeek(p.data, ini) : 0; (g[w] = g[w] || []).push(p.kg) })
    return pes.map((p) => {
      const w = ini ? planWeek(p.data, ini) : 0
      const arr = g[w]
      return { d: fmtCurto(p.data), kg: p.kg, media: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) }
    })
  }, [pes, ini])

  const comp = pes.filter((p) => p.gordura != null || p.massaMagra != null).map((p) => ({ d: fmtCurto(p.data), gordura: p.gordura, massaMagra: p.massaMagra, agua: p.agua }))
  const cintura = [...s.logs.cintura].sort((a, b) => a.data.localeCompare(b.data)).map((c) => ({ d: fmtCurto(c.data), cm: c.cm }))

  // exercício com cargas
  const exercicios = Object.values(s.plan.treinos || {}).flatMap((t) => t.exercicios.map((e) => ({ ...e, letra: t.letra })))
  const comDados = exercicios.filter((e) => historicoCarga(s, e.id).length)
  const [exSel, setExSel] = useState('')
  const exId = exSel || comDados[0]?.id || exercicios[0]?.id
  const cargas = exId ? historicoCarga(s, exId).map((h) => ({ d: fmtCurto(h.data), kg: h.kg })) : []

  // aderência por semana
  const aderSem = []
  if (ini) {
    for (let w = 1; w <= Math.min(Math.max(semAtual, 1), 12); w++) {
      let t = [0, 0], d = [0, 0]
      for (let i = 0; i < 7; i++) {
        const st = statusDia(s, dateOf(ini, w, ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'][i]), hoje)
        if (st.treino === 'ok') { t[0]++; t[1]++ } else if (st.treino === 'miss') t[1]++
        if (st.dieta === 'ok') { d[0]++; d[1]++ } else if (st.dieta === 'miss') d[1]++
      }
      aderSem.push({ s: `S${w}`, treino: t[1] ? Math.round((t[0] / t[1]) * 100) : null, dieta: d[1] ? Math.round((d[0] / d[1]) * 100) : null })
    }
  }

  const corridas = [...s.logs.corridas].sort((a, b) => a.data.localeCompare(b.data))
  const ritmos = corridas.filter((c) => c.km && c.min).map((c) => ({ d: fmtCurto(c.data), ritmo: +ritmo(c.min, c.km).toFixed(2), fc: c.fc }))
  const km = kmPorSemana(s).map((x) => ({ s: `S${x.semana}`, km: x.km }))

  const seq = { treino: sequencia(s, 'treino'), dieta: sequencia(s, 'dieta'), creatina: sequencia(s, 'creatina') }
  const seqA = sequenciaAgua(s)
  const ad7 = { treino: aderencia(s, 'treino', 7), dieta: aderencia(s, 'dieta', 7) }
  const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}%`)
  const variacao = ref && base ? ref - base : null

  return (
    <>
      <h1>Evolução</h1>
      <p className="sub">Peso, composição, cargas, corrida e constância</p>

      <div className="kpis">
        <Kpi v={ref ? `${r1(ref)} kg` : '–'} l="Peso atual" />
        <Kpi v={variacao == null ? '–' : `${variacao > 0 ? '+' : ''}${r1(variacao)} kg`} l={`Desde o início (${base ? r1(base) : '–'} kg)`} />
        <Kpi v={m && ref ? r1(ref / s.perfil.altura ** 2) : '–'} l="IMC" />
        <Kpi cls="fire" v={<Streak n={seq.treino.atual} />} l={`Treino · melhor ${seq.treino.melhor}`} />
        <Kpi cls="fire" v={<Streak n={seq.dieta.atual} />} l={`Dieta · melhor ${seq.dieta.melhor}`} />
        <Kpi
          cls="fire azul"
          v={<span className="streak"><Garrafa pct={aguaDoDia(s, todayISO()) / metaAgua(s)} className="mini" /><span key={seqA.atual} className="streak-n">{seqA.atual}</span></span>}
          l={`Água · melhor ${seqA.melhor}`}
        />
        <Kpi v={pct(ad7.treino)} l="Treino, últimos 7 dias" />
        <Kpi v={pct(ad7.dieta)} l="Dieta, últimos 7 dias" />
      </div>

      <div className="card">
        <h2>Registrar medição</h2>
        <div className="form">
          <label className="fld"><span className="f">Data</span><input autoComplete="off" type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
          <label className="fld"><span className="f">Peso (kg)</span><input autoComplete="off" type="number" inputMode="decimal" step="0.1" value={f.kg} onChange={(e) => setF({ ...f, kg: e.target.value })} /></label>
          <label className="fld"><span className="f">Gordura (%)</span><input autoComplete="off" type="number" inputMode="decimal" step="0.1" value={f.gordura} onChange={(e) => setF({ ...f, gordura: e.target.value })} /></label>
          <label className="fld"><span className="f">Massa magra (kg)</span><input autoComplete="off" type="number" inputMode="decimal" step="0.1" value={f.massaMagra} onChange={(e) => setF({ ...f, massaMagra: e.target.value })} /></label>
          <label className="fld"><span className="f">Água (%)</span><input autoComplete="off" type="number" inputMode="decimal" step="0.1" value={f.agua} onChange={(e) => setF({ ...f, agua: e.target.value })} /></label>
          <label className="fld"><span className="f">Cintura (cm)</span><input autoComplete="off" type="number" inputMode="decimal" step="0.5" value={f.cintura} onChange={(e) => setF({ ...f, cintura: e.target.value })} /></label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn pri" onClick={salvar}>Salvar medição</button>
          <span className="mut small">Para gordura, massa magra e água direto da balança, use a aba Bio.</span>
        </div>
      </div>

      <div className="grid c2">
        <ChartCard titulo="Peso (kg)" vazio={dadosPeso.length < 1 && 'Registre pesagens para ver o gráfico.'} nota="Linha tracejada: média da semana do plano, que é a referência da meta de 0,5 a 1 kg por semana.">
          <LineChart data={dadosPeso}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="d" /><YAxis domain={['dataMin - 1', 'dataMax + 1']} width={40} /><Tooltip {...tip} />
            <Line isAnimationActive={false} type="monotone" dataKey="kg" name="Peso" stroke={C.acc} strokeWidth={2.5} dot={{ r: 3 }} />
            <Line isAnimationActive={false} type="stepAfter" dataKey="media" name="Média semanal" stroke={C.blue} strokeDasharray="5 4" dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard titulo="Composição corporal" vazio={comp.length < 1 && 'Sem dados de bioimpedância ainda. Registre na aba Bio.'}>
          <LineChart data={comp}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="d" /><YAxis yAxisId="a" width={40} /><YAxis yAxisId="b" orientation="right" width={40} /><Tooltip {...tip} /><Legend />
            <Line isAnimationActive={false} yAxisId="a" type="monotone" dataKey="gordura" name="Gordura %" stroke={C.warn} strokeWidth={2} connectNulls />
            <Line isAnimationActive={false} yAxisId="b" type="monotone" dataKey="massaMagra" name="Massa magra kg" stroke={C.violet} strokeWidth={2} connectNulls />
          </LineChart>
        </ChartCard>

        <ChartCard titulo="Cintura (cm)" vazio={cintura.length < 1 && 'Registre a cintura para acompanhar.'}>
          <LineChart data={cintura}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="d" /><YAxis domain={['dataMin - 2', 'dataMax + 2']} width={40} /><Tooltip {...tip} />
            <Line isAnimationActive={false} type="monotone" dataKey="cm" name="Cintura" stroke={C.violet} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ChartCard>

        <div className="card">
          <div className="row">
            <h2 className="sp">Carga por exercício (kg)</h2>
          </div>
          {exercicios.length === 0 ? <div className="mut small">Importe o plano de treino.</div> : (
            <>
              <select value={exId} onChange={(e) => setExSel(e.target.value)} style={{ marginBottom: 10 }}>
                {exercicios.map((e) => <option key={e.id} value={e.id}>{e.letra} · {e.nome}</option>)}
              </select>
              {cargas.length < 1 ? <div className="mut small">Sem cargas registradas para este exercício.</div> : (
                <div style={{ width: '100%', height: 190 }}>
                  <ResponsiveContainer>
                    <LineChart data={cargas}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="d" /><YAxis domain={['dataMin - 2', 'dataMax + 2']} width={40} /><Tooltip {...tip} />
                      <Line isAnimationActive={false} type="monotone" dataKey="kg" name="Carga" stroke={C.acc} strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>

        <ChartCard titulo="Constância por semana (%)" vazio={aderSem.length < 1 && 'O gráfico aparece quando o plano começar.'} nota="Treino: sessões planejadas que você concluiu. Dieta: dias com 80% ou mais das refeições marcadas.">
          <BarChart data={aderSem}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="s" /><YAxis domain={[0, 100]} width={34} /><Tooltip {...tip} /><Legend />
            <Bar isAnimationActive={false} dataKey="treino" name="Treino" fill={C.acc} radius={[4, 4, 0, 0]} />
            <Bar isAnimationActive={false} dataKey="dieta" name="Dieta" fill={C.blue} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard titulo="Corrida: km por semana" vazio={km.length < 1 && 'Registre corridas com distância.'}>
          <BarChart data={km}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="s" /><YAxis width={34} /><Tooltip {...tip} />
            <Bar isAnimationActive={false} dataKey="km" name="km" fill={C.acc} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard titulo="Corrida: ritmo (min/km) e FC" vazio={ritmos.length < 1 && 'Registre corridas com tempo e distância.'} nota="Ritmo menor é melhor. Inclui caminhada, então é mais lento que o ritmo só correndo.">
          <LineChart data={ritmos}>
            <CartesianGrid stroke={C.grid} vertical={false} />
            <XAxis dataKey="d" /><YAxis yAxisId="a" domain={['dataMin - 0.5', 'dataMax + 0.5']} width={40} /><YAxis yAxisId="b" orientation="right" width={40} /><Tooltip {...tip} /><Legend />
            <Line isAnimationActive={false} yAxisId="a" type="monotone" dataKey="ritmo" name="Ritmo" stroke={C.acc} strokeWidth={2.5} dot={{ r: 3 }} />
            <Line isAnimationActive={false} yAxisId="b" type="monotone" dataKey="fc" name="FC média" stroke={C.bad} strokeWidth={2} connectNulls />
          </LineChart>
        </ChartCard>
      </div>
    </>
  )
}
