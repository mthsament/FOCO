import { useApp } from '../store.jsx'
import { reagir } from '../lib/mascoteEventos.js'
import { refeicoesDoDia } from '../lib/metrics.js'
import { PERIODOS, periodoDaRefeicao, usePeriodoAgora } from '../lib/periodos.js'
import { Bar, Check, r0 } from './ui.jsx'

const diaLog = (draft, iso) => (draft.logs.dieta[iso] = draft.logs.dieta[iso] || {})

// Refeições do dia com marcação, troca de opção e totais.
//   periodo="agora": só as refeições do período atual (manhã, tarde ou noite); os totais continuam sendo do dia inteiro
//   agrupar: todas as refeições, separadas por período (o atual fica marcado)
export function MealList({ iso, compacto = false, periodo, agrupar = false, aoVerTodas }) {
  const { s, update } = useApp()
  const agora = usePeriodoAgora()
  const refs = refeicoesDoDia(s, iso)
  const d = s.plan.dieta
  if (!d || !refs.length) return <div className="mut">Sem refeições planejadas para este dia.</div>

  const toggle = (key) =>
    update((x) => {
      const l = diaLog(x, iso)
      l.feitas = l.feitas || {}
      l.feitas[key] = !l.feitas[key]
    })
  const marcar = (key) => {
    if (!refs.find((m) => m.key === key)?.feita) reagir('pula', ['Refeição feita!', 'Combustível no tanque.', 'Boa escolha!', 'Segue o plano!'])
    toggle(key)
  }
  const troca = (key, cod) =>
    update((x) => {
      const l = diaLog(x, iso)
      l.troca = l.troca || {}
      l.troca[key] = cod
    })

  const core = refs.filter((m) => !m.opcional)
  const feitas = refs.filter((m) => m.feita)
  const kcal = feitas.reduce((a, m) => a + m.kcal, 0)
  const prot = feitas.reduce((a, m) => a + m.prot, 0)
  const kcalPlan = core.reduce((a, m) => a + m.kcal, 0)
  const protPlan = core.reduce((a, m) => a + m.prot, 0)

  // quais refeições aparecem
  const doPeriodo = periodo === 'agora' ? refs.filter((m) => periodoDaRefeicao(m).id === agora.id) : refs
  const mostrar = periodo === 'agora' && doPeriodo.length ? doPeriodo : refs // sem refeição no período: mostra tudo

  const cartao = (m) => {
    const ops = d.opcoes[m.key] || []
    return (
      <div key={m.key} className={'meal' + (m.feita ? ' done' : '')}>
        <Check on={m.feita} onClick={() => marcar(m.key)} label={`Marcar ${m.nome}`} />
        <div className="body">
          <div className="t">
            {m.nome} <span className="mut small">{m.hora} · ~{m.kcal} kcal{m.opcional ? ' · opcional' : ''}</span>
          </div>
          <div className="d">{m.desc || 'Escolha uma opção'}</div>
          {!compacto && ops.length > 0 && (
            <select value={m.cod || ''} onChange={(e) => troca(m.key, e.target.value)} aria-label={`Trocar opção de ${m.nome}`}>
              {m.key === 'pre' && <option value="Refeição livre">Refeição livre</option>}
              {ops.map((o) => (
                <option key={o.cod} value={o.cod}>
                  {o.cod} · {o.desc.slice(0, 60)}
                  {o.desc.length > 60 ? '…' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid c2" style={{ marginBottom: 6 }}>
        <div>
          <div className="row small"><span>Calorias</span><span className="sp" /><b>{r0(kcal)}</b><span className="mut">/ {r0(kcalPlan)} kcal</span></div>
          <Bar pct={kcal / (kcalPlan || 1)} />
        </div>
        <div>
          <div className="row small"><span>Proteína</span><span className="sp" /><b>{r0(prot)}</b><span className="mut">/ {r0(protPlan)} g</span></div>
          <Bar pct={prot / (protPlan || 1)} cls="blue" />
        </div>
      </div>
      {periodo === 'agora' && (
        <div className="periodo-topo">
          <span className="chip acc">{agora.nome}</span>
          <span className="mut small">{mostrar === refs && doPeriodo.length === 0 ? 'Todas as refeições' : `${mostrar.filter((m) => m.feita).length}/${mostrar.length} feitas neste período`}</span>
          <span className="sp" />
          {aoVerTodas && <button className="btn sm ghost" onClick={aoVerTodas}>Ver todas</button>}
        </div>
      )}
      {agrupar
        ? PERIODOS.map((p) => {
            const lista = refs.filter((m) => periodoDaRefeicao(m).id === p.id)
            if (!lista.length) return null
            return (
              <div key={p.id} className="periodo-bloco">
                <div className="periodo-titulo">
                  <b>{p.nome}</b>
                  {p.id === agora.id && <span className="chip acc">agora</span>}
                  <span className="mut small">{lista.filter((m) => m.feita).length}/{lista.length}</span>
                </div>
                {lista.map(cartao)}
              </div>
            )
          })
        : mostrar.map(cartao)}
    </div>
  )
}

// Creatina e whey do dia (a água tem o card próprio em Agua.jsx)
export function Habitos({ iso }) {
  const { s, update } = useApp()
  const l = s.logs.dieta[iso] || {}
  const set = (k, v) =>
    update((x) => {
      diaLog(x, iso)[k] = v
    })
  return (
    <div className="grid c2">
      <div className="row">
        <Check on={!!l.creatina} onClick={() => set('creatina', !l.creatina)} label="Creatina" />
        <div>
          <b>Creatina</b>
          <div className="mut small">3 a 5 g com o café</div>
        </div>
      </div>
      <div>
        <div className="row small"><b>Whey</b><span className="sp" /><span className="mut">{l.whey || 0}/2 scoops</span></div>
        <div className="row" style={{ marginTop: 6 }}>
          {[1, 2].map((n) => (
            <button key={n} className={'set' + ((l.whey || 0) >= n ? ' on' : '')} onClick={() => set('whey', (l.whey || 0) >= n ? n - 1 : n)} aria-label={`Scoop ${n}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
