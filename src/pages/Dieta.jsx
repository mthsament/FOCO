import { useState } from 'react'
import { useApp } from '../store.jsx'
import { useNav } from '../App.jsx'
import { DIAS, DIAS_LABEL, todayISO } from '../lib/dates.js'
import { metas } from '../lib/metrics.js'
import { DayPicker, Empty, Seg, num, r0, r1 } from '../components/ui.jsx'
import { Habitos, MealList } from '../components/Dia.jsx'
import Icon from '../components/Icon.jsx'
import Agua from '../components/Agua.jsx'

export default function Dieta() {
  const { s } = useApp()
  const { go } = useNav()
  const [aba, setAba] = useState('dia')
  const [iso, setIso] = useState(todayISO())
  if (!s.plan.dieta) {
    return (
      <Empty icon="dieta" title="Nenhuma dieta importada">
        <button className="btn pri" onClick={() => go('config')}>Importar Plano_Alimentacao_Suplementacao.xlsx</button>
      </Empty>
    )
  }
  return (
    <>
      <p className="sub">Refeições, cardápio da semana, opções e metas</p>
      <div style={{ marginBottom: 14, overflowX: 'auto' }}>
        <Seg value={aba} onChange={setAba} options={[['dia', 'Dia'], ['cardapio', 'Cardápio'], ['opcoes', 'Opções'], ['metas', 'Metas e rotina']]} />
      </div>
      {aba === 'dia' && (
        <>
          <DayPicker iso={iso} onChange={setIso} />
          <div className="card"><MealList iso={iso} agrupar /></div>
          <Agua iso={iso} />
          <div className="card"><h2>Hábitos</h2><Habitos iso={iso} /></div>
        </>
      )}
      {aba === 'cardapio' && <Cardapio />}
      {aba === 'opcoes' && <Opcoes />}
      {aba === 'metas' && <Metas />}
    </>
  )
}

function Cardapio() {
  const { s, update } = useApp()
  const d = s.plan.dieta
  const set = (dia, key, v) =>
    update((x) => {
      x.plan.dieta.cardapio[dia] = x.plan.dieta.cardapio[dia] || {}
      x.plan.dieta.cardapio[dia][key] = v || null
    })
  return (
    <div className="card">
      <h2>Cardápio da semana</h2>
      <p className="mut small">Escolha a opção de cada refeição por dia. Vale para todas as semanas. Se você reimportar a planilha, o cardápio dela substitui este.</p>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              {d.distribuicao.map((m) => <th key={m.key}>{m.nome.replace(' (whey)', '')}</th>)}
              <th>kcal</th>
            </tr>
          </thead>
          <tbody>
            {DIAS.map((dia) => {
              const kcal = d.distribuicao.reduce((a, m) => (m.opcional || !d.cardapio[dia]?.[m.key] ? a : a + m.kcal), 0)
              return (
                <tr key={dia}>
                  <td><b>{DIAS_LABEL[dia]}</b></td>
                  {d.distribuicao.map((m) => (
                    <td key={m.key}>
                      <select value={d.cardapio[dia]?.[m.key] || ''} onChange={(e) => set(dia, m.key, e.target.value)} style={{ minWidth: 64, padding: '5px 6px' }}>
                        <option value="">–</option>
                        {m.key === 'pre' && <option value="Refeição livre">Livre</option>}
                        {(d.opcoes[m.key] || []).map((o) => <option key={o.cod} value={o.cod}>{o.cod}</option>)}
                      </select>
                    </td>
                  ))}
                  <td>{r0(kcal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Opcoes() {
  const { s } = useApp()
  const d = s.plan.dieta
  return (
    <>
      {d.distribuicao.map((m) => (
        <div className="card" key={m.key}>
          <h2>{m.nome} <span className="mut small">{m.hora} · ~{m.kcal} kcal · {m.protTexto || r0(m.prot) + ' g prot.'}</span></h2>
          {(d.opcoes[m.key] || []).map((o) => (
            <div className="row" key={o.cod} style={{ alignItems: 'flex-start', padding: '5px 0' }}>
              <span className="tag">{o.cod}</span>
              <span>{o.desc}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="card">
        <h2>Almoço: monte seu prato</h2>
        <div className="grid c2">
          <div><h3>Proteína (150–180 g)</h3><ul className="clean">{d.montarPrato.proteinas.map((p) => <li key={p}>{p}</li>)}</ul></div>
          <div><h3>Carboidrato (~200 kcal)</h3><ul className="clean">{d.montarPrato.carboidratos.map((p) => <li key={p}>{p}</li>)}</ul></div>
        </div>
      </div>
      <div className="card">
        <h2>Dicas</h2>
        <ul className="clean">{d.dicas.map((t) => <li key={t.titulo}><b>{t.titulo}:</b> <span className="mut">{t.texto}</span></li>)}</ul>
      </div>
    </>
  )
}

const CAMPOS = [
  ['pesoInicial', 'Peso inicial (kg)', '0.1'],
  ['altura', 'Altura (m)', '0.01'],
  ['idade', 'Idade (anos)', '1'],
  ['fatorAtividade', 'Fator de atividade', '0.05'],
  ['deficit', 'Déficit diário (kcal)', '50'],
  ['protKg', 'Proteína (g/kg)', '0.1'],
  ['gordKg', 'Gordura (g/kg)', '0.1'],
]

function Metas() {
  const { s, update } = useApp()
  const p = s.perfil
  const m = metas(p)
  const d = s.plan.dieta
  const totalPlano = d.distribuicao.filter((x) => !x.opcional).reduce((a, x) => a + x.kcal, 0)
  const set = (k, v) => update((x) => { x.perfil[k] = v })
  return (
    <>
      <div className="card">
        <h2>Seus dados</h2>
        <div className="form">
          {CAMPOS.map(([k, l, st]) => (
            <label key={k} className="fld">
              <span className="f">{l}</span>
              <input type="number" inputMode="decimal" autoComplete="off" step={st} value={p[k] ?? ''} onChange={(e) => set(k, num(e.target.value))} />
            </label>
          ))}
          <label className="fld">
            <span className="f">Sexo</span>
            <select value={p.sexo} onChange={(e) => set('sexo', e.target.value)}><option value="M">M</option><option value="F">F</option></select>
          </label>
        </div>
        <p className="mut small">Idade, sexo e fator de atividade eram premissas da planilha. Ajuste para os valores reais.</p>
      </div>

      {m && (
        <div className="card">
          <h2>Metas calculadas</h2>
          <div className="kpis">
            <div className="kpi"><div className="v">{r0(m.meta)}</div><div className="l">kcal por dia (meta)</div></div>
            <div className="kpi"><div className="v">{r0(m.prot)} g</div><div className="l">proteína</div></div>
            <div className="kpi"><div className="v">{r0(m.carb)} g</div><div className="l">carboidrato</div></div>
            <div className="kpi"><div className="v">{r0(m.gord)} g</div><div className="l">gordura</div></div>
            <div className="kpi"><div className="v">{r1(m.imc)}</div><div className="l">IMC</div></div>
            <div className="kpi"><div className="v">{r1(m.perdaSemanal)} kg</div><div className="l">perda estimada/semana</div></div>
          </div>
          <div className="mut small">Gasto basal {r0(m.tmb)} kcal (Mifflin-St Jeor) · gasto diário {r0(m.gasto)} kcal. O cardápio soma {r0(totalPlano)} kcal ({totalPlano - m.meta >= 0 ? '+' : ''}{r0(totalPlano - m.meta)} em relação à meta).</div>
        </div>
      )}

      <div className="card">
        <h2>Rotina do dia (seg a sex)</h2>
        <div className="scroll"><table><tbody>
          {s.plan.rotina.map((r) => <tr key={r.hora}><td style={{ whiteSpace: 'nowrap' }}><b>{r.hora}</b></td><td>{r.titulo}<div className="mut small">{r.detalhe}</div></td></tr>)}
        </tbody></table></div>
        {s.plan.rotinaFds.map((r) => <div key={r.dia} style={{ marginTop: 10 }}><b>{r.dia}:</b> {r.titulo}<div className="mut small">{r.detalhe}</div></div>)}
      </div>

      <div className="card">
        <h2>Suplementação</h2>
        {s.plan.suplementos.map((x) => (
          <div key={x.nome} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
            <b>{x.nome}</b> <span className="chip acc">{x.dose}</span>
            <div className="mut small">{x.horario} · {x.frequencia}</div>
            <div className="small">{x.como}</div>
            {x.cuidados && <div className="mut small"><Icon name="warn" /> {x.cuidados}</div>}
          </div>
        ))}
      </div>
    </>
  )
}
