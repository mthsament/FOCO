import { useApp } from '../../store.jsx'
import { fmtBR, fmtCurto, fromISO } from '../../lib/dates.js'
import { pesagensOrdenadas } from '../../lib/metrics.js'
import { r1 } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'

// Todas as medições, da mais nova para a mais antiga (peso, composição e cintura juntos)
export default function Historico() {
  const { s, update } = useApp()
  const cint = Object.fromEntries(s.logs.cintura.map((c) => [c.data, c.cm]))
  const pes = Object.fromEntries(pesagensOrdenadas(s).map((p) => [p.data, p]))
  const datas = [...new Set([...Object.keys(pes), ...Object.keys(cint)])].sort().reverse()
  const apagar = (data) =>
    update((x) => {
      x.logs.pesagens = x.logs.pesagens.filter((p) => p.data !== data)
      x.logs.cintura = x.logs.cintura.filter((c) => c.data !== data)
    })

  return (
    <div className="card">
      <div className="row">
        <h2 className="sp">Histórico de medições</h2>
        <span className="chip">{datas.length}</span>
      </div>
      {datas.length === 0 ? (
        <div className="mut small">Nenhuma medição ainda. Registre a primeira na seção Medir.</div>
      ) : (
        <ul className="hist-lista">
          {datas.map((d) => {
            const p = pes[d] || {}
            const chips = [['Gordura', p.gordura, '%'], ['Massa magra', p.massaMagra, ' kg'], ['Água', p.agua, '%'], ['Músculo', p.musculo, '%'], ['Cintura', cint[d], ' cm']].filter(([, n]) => n != null)
            const dt = fromISO(d)
            return (
              <li key={d}>
                <div className="hl-data">
                  <b>{fmtCurto(d)}</b>
                  <span>{dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} · {dt.getFullYear()}</span>
                </div>
                <div className="hl-peso">{p.kg != null ? <><b>{r1(p.kg)}</b><small>kg</small></> : <span className="mut">sem peso</span>}</div>
                <div className="hl-chips">{chips.map(([r, n, un]) => <span key={r} className="chip"><em>{r}</em> <b>{r1(n)}{un}</b></span>)}</div>
                <button className="btn sm ghost danger" onClick={() => confirm(`Apagar a medição de ${fmtBR(d)}?`) && apagar(d)} aria-label={`Apagar medição de ${fmtBR(d)}`}><Icon name="trash" /></button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
