import { useApp } from '../store.jsx'
import { refeicoesDoDia } from '../lib/metrics.js'
import { Bar, Check, r0 } from './ui.jsx'

const diaLog = (draft, iso) => (draft.logs.dieta[iso] = draft.logs.dieta[iso] || {})

// Refeições do dia com marcação, troca de opção e totais
export function MealList({ iso, compacto = false }) {
  const { s, update } = useApp()
  const refs = refeicoesDoDia(s, iso)
  const d = s.plan.dieta
  if (!d || !refs.length) return <div className="mut">Sem refeições planejadas para este dia.</div>

  const toggle = (key) =>
    update((x) => {
      const l = diaLog(x, iso)
      l.feitas = l.feitas || {}
      l.feitas[key] = !l.feitas[key]
    })
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
      {refs.map((m) => {
        const ops = d.opcoes[m.key] || []
        return (
          <div key={m.key} className={'meal' + (m.feita ? ' done' : '')}>
            <Check on={m.feita} onClick={() => toggle(m.key)} label={`Marcar ${m.nome}`} />
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
      })}
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
