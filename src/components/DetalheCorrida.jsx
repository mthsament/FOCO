import { useMemo } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtBR } from '../lib/dates.js'
import { fmtSeg, melhoresDe, nomeDist, recordes } from '../lib/corrida.js'
import { fmtDur } from '../lib/metrics.js'
import RotaMapa from './RotaMapa.jsx'
import Icon from './Icon.jsx'
import { Kpi, r1 } from './ui.jsx'

const tip = { contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--txt)' }, labelStyle: { color: 'var(--mut)' } }

export default function DetalheCorrida({ c, todas, onFechar, onApagar }) {
  const rec = useMemo(() => recordes(todas), [todas])
  const prs = rec.porCorrida[c.id] || []
  const ritmoSeg = c.km && c.min ? (c.min * 60) / c.km : null
  const t = c.trilha

  const dados = useMemo(() => {
    if (!t || t.length < 3) return []
    return t.map((p, i) => {
      const a = t[Math.max(0, i - 3)]
      const b = t[Math.min(t.length - 1, i + 3)]
      const dd = b[5] - a[5]
      const dt = b[2] - a[2]
      const pace = dd > 8 && dt > 0 ? Math.min(720, Math.max(150, (dt / dd) * 1000)) : null
      return { km: +(p[5] / 1000).toFixed(2), ele: p[3], pace, fc: p[4] }
    })
  }, [t])

  const temEle = dados.some((d) => d.ele != null)
  const temFc = dados.some((d) => d.fc)
  const parciais = c.parciais || []
  const maisRapido = parciais.length ? Math.min(...parciais.filter((p) => p.km >= 0.9).map((p) => p.seg / p.km)) : null
  const maisLento = parciais.length ? Math.max(...parciais.map((p) => p.seg / p.km)) : null
  const melhoresAqui = Object.entries(melhoresDe(c))

  return (
    <div className="detalhe">
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="btn sm" onClick={onFechar}><Icon name="chevL" /> Voltar</button>
        <span className="sp" />
        <button className="btn sm ghost danger" onClick={onApagar} aria-label="Apagar corrida"><Icon name="trash" /> Apagar</button>
      </div>
      <h1>{c.km ? `${r1(c.km)} km` : 'Corrida'}</h1>
      <p className="sub">{fmtBR(c.data)}{c.obs ? ` · ${c.obs}` : ''}</p>

      {prs.length > 0 && (
        <div className="prs">
          {prs.map((p) => (
            <div key={p.dist} className="pr">
              <Icon name="trofeu" />
              <div>
                <b>Recorde de {nomeDist(p.dist)}</b>
                <span>{fmtSeg(p.seg)}{p.anterior ? ` · ${fmtSeg(p.anterior - p.seg)} mais rápido que antes` : ' · primeira marca'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card mapa-card">
        <RotaMapa trilha={t} />
        {t && t.length > 1 && <div className="legenda"><span>Mais lento</span><i /><span>Mais rápido</span></div>}
      </div>

      <div className="kpis">
        <Kpi v={fmtDur(c.min)} l="Tempo" />
        <Kpi v={ritmoSeg ? `${fmtSeg(ritmoSeg)} /km` : '–'} l="Ritmo médio" />
        {c.subida != null && <Kpi v={`${c.subida} m`} l="Subida" />}
        {c.fc && <Kpi v={`${c.fc} bpm`} l={c.fcMax ? `FC média · máx ${c.fcMax}` : 'FC média'} />}
      </div>

      {dados.length > 2 && (temEle || temFc) && (
        <div className="grid c2">
          {temEle && (
            <div className="card">
              <h2><Icon name="montanha" /> Altitude (m)</h2>
              <div style={{ width: '100%', height: 150 }}>
                <ResponsiveContainer>
                  <AreaChart data={dados}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="km" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => `${v}`} unit=" km" />
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} width={40} tickFormatter={(v) => Math.round(v)} />
                    <Tooltip {...tip} formatter={(v) => [`${Math.round(v)} m`, 'Altitude']} labelFormatter={(v) => `${v} km`} />
                    <Area isAnimationActive={false} type="monotone" dataKey="ele" stroke="var(--violet)" strokeWidth={2} fill="var(--violet)" fillOpacity={0.18} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="card">
            <h2><Icon name="corrida" /> Ritmo{temFc ? ' e FC' : ''}</h2>
            <div style={{ width: '100%', height: 150 }}>
              <ResponsiveContainer>
                <LineChart data={dados}>
                  <CartesianGrid stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="km" type="number" domain={[0, 'dataMax']} unit=" km" />
                  <YAxis yAxisId="a" reversed domain={['dataMin - 20', 'dataMax + 20']} width={44} tickFormatter={fmtSeg} />
                  {temFc && <YAxis yAxisId="b" orientation="right" width={36} domain={['dataMin - 5', 'dataMax + 5']} />}
                  <Tooltip {...tip} formatter={(v, n) => (n === 'Ritmo' ? [`${fmtSeg(v)} /km`, n] : [`${v} bpm`, n])} labelFormatter={(v) => `${v} km`} />
                  <Line isAnimationActive={false} yAxisId="a" type="monotone" dataKey="pace" name="Ritmo" stroke="var(--acc)" strokeWidth={2} dot={false} connectNulls />
                  {temFc && <Line isAnimationActive={false} yAxisId="b" type="monotone" dataKey="fc" name="FC" stroke="var(--bad)" strokeWidth={1.5} dot={false} connectNulls />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mut small">Eixo do ritmo invertido: quanto mais alto, mais rápido.</div>
          </div>
        </div>
      )}

      {parciais.length > 0 && (
        <div className="card">
          <h2><Icon name="lista" /> Parciais por km</h2>
          <div className="parciais">
            {parciais.map((p, i) => {
              const pace = p.seg / p.km
              const largura = maisLento && maisRapido ? 40 + 60 * (1 - (pace - maisRapido) / Math.max(1, maisLento - maisRapido)) : 70
              const melhor = p.km >= 0.9 && pace === maisRapido
              return (
                <div key={i} className={'parcial' + (melhor ? ' best' : '')}>
                  <span className="n">{p.km < 0.9 ? r1(p.km) : i + 1}</span>
                  <span className="t">{fmtSeg(pace)}</span>
                  <span className="b"><i style={{ width: `${largura}%` }} /></span>
                  <span className="m">{p.fc ? `${p.fc} bpm` : ''}</span>
                  <span className="m">{p.subida ? `+${p.subida} m` : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {melhoresAqui.length > 0 && (
        <div className="card">
          <h2><Icon name="bolt" /> Melhores esforços</h2>
          <div className="scroll">
            <table>
              <tbody>
                {melhoresAqui.map(([d, seg]) => {
                  const ehPr = rec.atuais[d]?.id === c.id
                  return (
                    <tr key={d}>
                      <td><b>{nomeDist(d)}</b></td>
                      <td>{fmtSeg(seg)}</td>
                      <td className="mut">{fmtSeg(seg / (Number(d) / 1000))} /km</td>
                      <td>{ehPr ? <span className="chip acc"><Icon name="trofeu" /> Recorde atual</span> : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
