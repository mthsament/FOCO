import { useMemo, useState } from 'react'
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../../store.jsx'
import { addDays, dateOf, fmtCurto, planWeek, todayISO } from '../../lib/dates.js'
import { GarrafaKpi } from '../../components/Agua.jsx'
import { aderencia, aguaDoDia, metaAgua, historicoCarga, inicioDoPlano, kmPorSemana, pesagensOrdenadas, ritmo, sequencia, sequenciaAgua, statusDia } from '../../lib/metrics.js'
import { Kpi, Seg, Streak, r1 } from '../../components/ui.jsx'
import { Anel, COR, Delta, GCard, Grad, GradV, TT, cursor, eixo, pontoAtivo, useAnima } from '../../components/Graficos.jsx'

const pace = (v) => {
  const m = Math.floor(v)
  const sec = Math.round((v - m) * 60)
  return `${sec === 60 ? m + 1 : m}:${String(sec === 60 ? 0 : sec).padStart(2, '0')}`
}
const PERIODOS = [[30, '30 dias'], [90, '90 dias'], [0, 'Tudo']]
const arred = (v) => Math.round(v)

export default function VisaoGeral() {
  const { s } = useApp()
  const anima = useAnima()
  const ini = inicioDoPlano(s)
  const hoje = todayISO()
  const [per, setPer] = useState(90)

  const pes = pesagensOrdenadas(s)
  const base = s.perfil.pesoInicial
  const semAtual = ini ? planWeek(hoje, ini) : 0

  // período escolhido (0 = tudo)
  const corte = per ? addDays(hoje, -per) : '0000-00-00'
  const no = (arr) => arr.filter((x) => x.data >= corte)
  const prim = (arr, k) => arr.find((x) => x[k] != null)?.[k]
  const ult = (arr, k) => [...arr].reverse().find((x) => x[k] != null)?.[k]

  const dadosPeso = useMemo(() => {
    const g = {}
    pes.forEach((p) => { const w = ini ? planWeek(p.data, ini) : 0; (g[w] = g[w] || []).push(p.kg) })
    return pes.map((p) => {
      const arr = g[ini ? planWeek(p.data, ini) : 0]
      return { data: p.data, d: fmtCurto(p.data), kg: p.kg, media: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) }
    })
  }, [pes, ini])
  const pesoP = no(dadosPeso)
  const comp = no(pes.filter((p) => p.gordura != null || p.massaMagra != null)).map((p) => ({ data: p.data, d: fmtCurto(p.data), gordura: p.gordura, massaMagra: p.massaMagra }))
  const cintura = no([...s.logs.cintura].sort((a, b) => a.data.localeCompare(b.data)).map((c) => ({ data: c.data, d: fmtCurto(c.data), cm: c.cm })))

  // exercício com cargas
  const exercicios = Object.values(s.plan.treinos || {}).flatMap((t) => t.exercicios.map((e) => ({ ...e, letra: t.letra })))
  const comDados = exercicios.filter((e) => historicoCarga(s, e.id).length)
  const [exSel, setExSel] = useState('')
  const exId = exSel || comDados[0]?.id || exercicios[0]?.id
  const cargas = exId ? no(historicoCarga(s, exId)).map((h) => ({ data: h.data, d: fmtCurto(h.data), kg: h.kg })) : []
  const pr = cargas.reduce((mx, c) => (mx == null || c.kg >= mx.kg ? c : mx), null)

  // aderência por semana
  const aderSem = []
  if (ini) {
    for (let w = 1; w <= Math.min(Math.max(semAtual, 1), 12); w++) {
      const t = [0, 0]
      const d = [0, 0]
      for (let i = 0; i < 7; i++) {
        const st = statusDia(s, dateOf(ini, w, ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'][i]), hoje)
        if (st.treino === 'ok') { t[0]++; t[1]++ } else if (st.treino === 'miss') t[1]++
        if (st.dieta === 'ok') { d[0]++; d[1]++ } else if (st.dieta === 'miss') d[1]++
      }
      aderSem.push({ s: `S${w}`, treino: t[1] ? Math.round((t[0] / t[1]) * 100) : null, dieta: d[1] ? Math.round((d[0] / d[1]) * 100) : null })
    }
  }

  const corridas = no([...s.logs.corridas].sort((a, b) => a.data.localeCompare(b.data)))
  const ritmos = corridas.filter((c) => c.km && c.min).map((c) => ({ data: c.data, d: fmtCurto(c.data), ritmo: +ritmo(c.min, c.km).toFixed(2), fc: c.fc }))
  const km = kmPorSemana(s).map((x) => ({ s: `S${x.semana}`, km: x.km, atual: x.semana === semAtual }))
  const kmTotal = km.reduce((a, x) => a + x.km, 0)

  const seq = { treino: sequencia(s, 'treino'), dieta: sequencia(s, 'dieta'), creatina: sequencia(s, 'creatina') }
  const seqA = sequenciaAgua(s)
  const ad7 = { treino: aderencia(s, 'treino', 7), dieta: aderencia(s, 'dieta', 7) }
  const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}%`)

  return (
    <>
      <div className="kpis">
        <Kpi cls="fire" v={<Streak n={seq.treino.atual} />} l={`Treino · melhor ${seq.treino.melhor}`} />
        <Kpi cls="fire" v={<Streak n={seq.dieta.atual} />} l={`Dieta · melhor ${seq.dieta.melhor}`} />
        <Kpi
          cls="fire azul"
          v={<GarrafaKpi pct={aguaDoDia(s, hoje) / metaAgua(s)} n={seqA.atual} />}
          l={`Água · melhor ${seqA.melhor}`}
        />
        <Kpi v={pct(ad7.treino)} l="Treino, últimos 7 dias" />
        <Kpi v={pct(ad7.dieta)} l="Dieta, últimos 7 dias" />
      </div>

      <div className="gper">
        <h2 className="sp">Gráficos</h2>
        <Seg value={per} onChange={setPer} options={PERIODOS} />
      </div>

      <div className="card gc gc-resumo">
        <h2>Constância</h2>
        <div className="aneis">
          <Anel pct={ad7.treino} cor={COR.acc} rotulo="Treino · 7 dias" />
          <Anel pct={ad7.dieta} cor={COR.blue} rotulo="Dieta · 7 dias" />
          <Anel pct={metaAgua(s) ? Math.min(1, aguaDoDia(s, hoje) / metaAgua(s)) : 0} cor={COR.violet} rotulo="Água hoje" />
        </div>
        <div className="gc-plot" style={{ height: 190, marginTop: 6 }}>
          {aderSem.length < 1 ? <div className="gc-vazio">O gráfico aparece quando o plano começar.</div> : (
            <ResponsiveContainer>
              <BarChart data={aderSem} barGap={3}>
                <defs><GradV id="gb-t" cor={COR.acc} /><GradV id="gb-d" cor={COR.blue} /></defs>
                <CartesianGrid stroke={COR.grid} vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="s" {...eixo} />
                <YAxis domain={[0, 100]} width={34} ticks={[0, 50, 100]} {...eixo} />
                <Tooltip cursor={{ fill: 'var(--acc-soft)' }} content={<TT unidades={{ treino: '%', dieta: '%' }} />} />
                <Bar {...anima} dataKey="treino" name="Treino" fill="url(#gb-t)" radius={[6, 6, 0, 0]} maxBarSize={22} />
                <Bar {...anima} dataKey="dieta" name="Dieta" fill="url(#gb-d)" radius={[6, 6, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mut small" style={{ marginTop: 6 }}>Treino: sessões planejadas concluídas. Dieta: dias com 80% ou mais das refeições marcadas.</div>
      </div>

      <div className="grid c2">
        <GCard
          titulo="Peso" cor={COR.acc}
          valor={ult(pesoP, 'kg') != null ? r1(ult(pesoP, 'kg')) : null} un="kg"
          delta={<Delta de={prim(pesoP, 'kg')} para={ult(pesoP, 'kg')} melhor="menor" un=" kg" />}
          sub={pesoP.length > 1 ? `${pesoP.length} pesagens no período` : null}
          vazio={pesoP.length < 1 && 'Registre pesagens para ver o gráfico.'}
          nota="Linha tracejada azul: média da semana do plano, a referência da meta de 0,5 a 1 kg por semana."
        >
          <ComposedChart data={pesoP}>
            <defs><Grad id="g-peso" cor={COR.acc} /></defs>
            <CartesianGrid stroke={COR.grid} vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="d" {...eixo} minTickGap={24} />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} width={40} tickFormatter={arred} allowDecimals={false} {...eixo} />
            <Tooltip cursor={cursor} content={<TT unidades={{ kg: ' kg', media: ' kg' }} />} />
            {base && <ReferenceLine y={base} stroke={COR.warn} strokeDasharray="2 4" ifOverflow="hidden" label={{ value: 'início', fill: 'var(--mut)', fontSize: 11, position: 'insideTopRight' }} />}
            <Area {...anima} type="monotone" dataKey="kg" name="Peso" stroke={COR.acc} strokeWidth={3} fill="url(#g-peso)" dot={{ r: 3, strokeWidth: 0, fill: COR.acc }} activeDot={{ ...pontoAtivo, fill: COR.acc }} />
            <Line {...anima} type="monotone" dataKey="media" name="Média semanal" stroke={COR.blue} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ ...pontoAtivo, fill: COR.blue }} />
          </ComposedChart>
        </GCard>

        <GCard
          titulo="Composição corporal" cor={COR.warn}
          valor={ult(comp, 'gordura') != null ? r1(ult(comp, 'gordura')) : null} un="% gordura"
          delta={<Delta de={prim(comp, 'gordura')} para={ult(comp, 'gordura')} melhor="menor" un=" pp" />}
          sub={ult(comp, 'massaMagra') != null ? `Massa magra ${r1(ult(comp, 'massaMagra'))} kg` : null}
          vazio={comp.length < 1 && 'Sem dados de bioimpedância ainda. Registre na seção Medir.'}
        >
          <ComposedChart data={comp}>
            <defs><Grad id="g-gord" cor={COR.warn} /></defs>
            <CartesianGrid stroke={COR.grid} vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="d" {...eixo} minTickGap={24} />
            <YAxis yAxisId="a" width={36} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={arred} allowDecimals={false} {...eixo} />
            <YAxis yAxisId="b" orientation="right" width={36} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={arred} allowDecimals={false} {...eixo} />
            <Tooltip cursor={cursor} content={<TT unidades={{ gordura: ' %', massaMagra: ' kg' }} />} />
            <Area {...anima} yAxisId="a" type="monotone" dataKey="gordura" name="Gordura" stroke={COR.warn} strokeWidth={3} fill="url(#g-gord)" connectNulls dot={{ r: 3, strokeWidth: 0, fill: COR.warn }} activeDot={{ ...pontoAtivo, fill: COR.warn }} />
            <Line {...anima} yAxisId="b" type="monotone" dataKey="massaMagra" name="Massa magra" stroke={COR.violet} strokeWidth={2.5} connectNulls dot={false} activeDot={{ ...pontoAtivo, fill: COR.violet }} />
          </ComposedChart>
        </GCard>

        <GCard
          titulo="Cintura" cor={COR.violet}
          valor={ult(cintura, 'cm') != null ? r1(ult(cintura, 'cm')) : null} un="cm"
          delta={<Delta de={prim(cintura, 'cm')} para={ult(cintura, 'cm')} melhor="menor" un=" cm" />}
          vazio={cintura.length < 1 && 'Registre a cintura para acompanhar.'}
        >
          <ComposedChart data={cintura}>
            <defs><Grad id="g-cint" cor={COR.violet} /></defs>
            <CartesianGrid stroke={COR.grid} vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="d" {...eixo} minTickGap={24} />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} width={40} tickFormatter={arred} allowDecimals={false} {...eixo} />
            <Tooltip cursor={cursor} content={<TT unidades={{ cm: ' cm' }} />} />
            <Area {...anima} type="monotone" dataKey="cm" name="Cintura" stroke={COR.violet} strokeWidth={3} fill="url(#g-cint)" dot={{ r: 3, strokeWidth: 0, fill: COR.violet }} activeDot={{ ...pontoAtivo, fill: COR.violet }} />
          </ComposedChart>
        </GCard>

        <GCard
          titulo="Carga por exercício" cor={COR.acc}
          valor={pr ? r1(pr.kg) : null} un="kg · recorde"
          delta={<Delta de={cargas[0]?.kg} para={cargas[cargas.length - 1]?.kg} melhor="maior" un=" kg" />}
          acao={exercicios.length > 0 && (
            <select value={exId} onChange={(e) => setExSel(e.target.value)} aria-label="Exercício" className="gc-sel">
              {exercicios.map((e) => <option key={e.id} value={e.id}>{e.letra} · {e.nome || 'sem nome'}</option>)}
            </select>
          )}
          vazio={(exercicios.length === 0 && 'Monte ou importe o seu treino para acompanhar as cargas.') || (cargas.length < 1 && 'Sem cargas registradas para este exercício neste período.')}
          altura={200}
        >
          <ComposedChart data={cargas}>
            <defs><Grad id="g-carga" cor={COR.acc} /></defs>
            <CartesianGrid stroke={COR.grid} vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="d" {...eixo} minTickGap={24} />
            <YAxis domain={['dataMin - 2', 'dataMax + 4']} width={40} tickFormatter={arred} allowDecimals={false} {...eixo} />
            <Tooltip cursor={cursor} content={<TT unidades={{ kg: ' kg' }} />} />
            <Area {...anima} type="monotone" dataKey="kg" name="Carga" stroke={COR.acc} strokeWidth={3} fill="url(#g-carga)" dot={{ r: 3, strokeWidth: 0, fill: COR.acc }} activeDot={{ ...pontoAtivo, fill: COR.acc }} />
            {pr && <ReferenceDot x={pr.d} y={pr.kg} r={7} fill={COR.warn} stroke="var(--card)" strokeWidth={3} ifOverflow="extendDomain" label={{ value: 'recorde', position: 'top', fill: 'var(--warn)', fontSize: 11, fontWeight: 700 }} />}
          </ComposedChart>
        </GCard>

        <GCard
          titulo="Corrida: km por semana" cor={COR.acc}
          valor={km.length ? r1(kmTotal) : null} un="km no total"
          sub={km.length ? `${km.length} semana(s) com corrida` : null}
          vazio={km.length < 1 && 'Registre corridas com distância.'}
        >
          <BarChart data={km}>
            <defs><GradV id="g-km" cor={COR.acc} /><GradV id="g-km2" cor={COR.blue} /></defs>
            <CartesianGrid stroke={COR.grid} vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="s" {...eixo} />
            <YAxis width={34} {...eixo} />
            <Tooltip cursor={{ fill: 'var(--acc-soft)' }} content={<TT unidades={{ km: ' km' }} />} />
            <Bar {...anima} dataKey="km" name="Distância" radius={[8, 8, 0, 0]} maxBarSize={34}>
              {km.map((x) => <Cell key={x.s} fill={x.atual ? 'url(#g-km)' : 'url(#g-km2)'} />)}
            </Bar>
          </BarChart>
        </GCard>

        <GCard
          titulo="Corrida: ritmo e FC" cor={COR.blue}
          valor={ritmos.length ? pace(ritmos[ritmos.length - 1].ritmo) : null} un="min/km"
          delta={<Delta de={ritmos[0]?.ritmo} para={ritmos[ritmos.length - 1]?.ritmo} melhor="menor" casas={2} un=" min" />}
          vazio={ritmos.length < 1 && 'Registre corridas com tempo e distância.'}
          nota="Ritmo menor é melhor (eixo invertido: mais alto no gráfico = mais rápido). Inclui caminhada."
        >
          <ComposedChart data={ritmos}>
            <defs><Grad id="g-rit" cor={COR.blue} /></defs>
            <CartesianGrid stroke={COR.grid} vertical={false} strokeDasharray="3 5" />
            <XAxis dataKey="d" {...eixo} minTickGap={24} />
            <YAxis yAxisId="a" reversed domain={['dataMin - 0.5', 'dataMax + 0.5']} width={40} tickFormatter={pace} {...eixo} />
            <YAxis yAxisId="b" orientation="right" width={36} domain={['dataMin - 5', 'dataMax + 5']} tickFormatter={arred} allowDecimals={false} {...eixo} />
            <Tooltip cursor={cursor} content={<TT fmt={{ ritmo: pace }} unidades={{ ritmo: ' min/km', fc: ' bpm' }} />} />
            <Area {...anima} yAxisId="a" type="monotone" dataKey="ritmo" name="Ritmo" stroke={COR.blue} strokeWidth={3} fill="url(#g-rit)" dot={{ r: 3, strokeWidth: 0, fill: COR.blue }} activeDot={{ ...pontoAtivo, fill: COR.blue }} />
            <Line {...anima} yAxisId="b" type="monotone" dataKey="fc" name="FC média" stroke={COR.bad} strokeWidth={2} connectNulls dot={false} activeDot={{ ...pontoAtivo, fill: COR.bad }} />
          </ComposedChart>
        </GCard>
      </div>
    </>
  )
}
