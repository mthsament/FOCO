import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import { CATEGORIAS, NOME_TIER, TIERS, avaliar, fmtNum, unidade } from '../lib/conquistas.js'
import { Bar } from '../components/ui.jsx'
import Medalha from '../components/Medalha.jsx'
import Icon from '../components/Icon.jsx'

const R = 42
const CIRC = 2 * Math.PI * R

export default function Conquistas() {
  const { s } = useApp()
  const av = useMemo(() => avaliar(s), [s.logs, s.perfil, s.plan])
  const [cat, setCat] = useState('todas')
  const [anim, setAnim] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnim(true), 80)
    return () => clearTimeout(t)
  }, [])

  const pct = Math.round(av.pct * 100)
  const lista = av.itens.filter((i) => cat === 'todas' || i.cat === cat)
  const nivelAtual = (i) => TIERS[Math.max(0, i.nivel - 1)]

  return (
    <>
      <h1>Conquistas</h1>
      <p className="sub">Metas, medalhas e troféus. Cada conquista evolui de bronze até platina.</p>
      <MascoteAba aba="conquistas" />

      <div className="card cq-resumo">
        <div className="cq-anel" role="img" aria-label={`${pct}% das conquistas concluídas`}>
          <svg viewBox="0 0 100 100">
            <circle className="cq-anel-fundo" cx="50" cy="50" r={R} />
            <circle className="cq-anel-valor" cx="50" cy="50" r={R} strokeDasharray={`${anim ? av.pct * CIRC : 0} ${CIRC}`} />
          </svg>
          <div className="cq-anel-txt"><b>{pct}%</b><span>concluído</span></div>
        </div>
        <div className="cq-info">
          <div className="cq-trofeus">
            <Icon name="trofeu" />
            <b>{av.trofeus}</b>
            <span>/ {av.total} troféus</span>
          </div>
          <div className="cq-tiers">
            {TIERS.map((t) => (
              <div key={t} className="cq-tier" title={NOME_TIER[t]}>
                <Medalha tier={t} icone="trofeu" tamanho={34} bloqueada={!av.porTier[t]} />
                <b>{av.porTier[t]}</b>
                <span>{NOME_TIER[t]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {av.proximas.length > 0 && (
        <div className="card">
          <h2><Icon name="hoje" /> Próximas metas</h2>
          <div className="cq-metas">
            {av.proximas.map((i) => (
              <div key={i.id} className="cq-meta">
                <Medalha tier={TIERS[i.nivel]} icone={i.icone} tamanho={46} className="prev" />
                <div className="sp">
                  <b>{i.nome}</b>
                  <div className="mut small">{i.desc(i.proxima)}</div>
                  <Bar pct={i.pct} cls={'t-' + TIERS[i.nivel]} />
                  {(() => {
                    const falta = Math.round((i.proxima - i.valor) * 10) / 10
                    return <div className="small mut">{falta === 1 ? 'Falta' : 'Faltam'} {fmtNum(falta)} {unidade(falta, i.un)} para o nível {NOME_TIER[TIERS[i.nivel]].toLowerCase()}</div>
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chips-sel" role="group" aria-label="Filtrar por categoria">
        <button className={'chip' + (cat === 'todas' ? ' sel' : '')} aria-pressed={cat === 'todas'} onClick={() => setCat('todas')}>Todas</button>
        {CATEGORIAS.map(([c, nome]) => (
          <button key={c} className={'chip' + (cat === c ? ' sel' : '')} aria-pressed={cat === c} onClick={() => setCat(c)}>
            {nome} <span className="cq-chip-n">{av.porCat[c].trofeus}/{av.porCat[c].total}</span>
          </button>
        ))}
      </div>

      <div className="cq-grade">
        {lista.map((i) => (
          <div key={i.id} className={'cq-card' + (i.nivel === 4 ? ' max' : '') + (i.nivel === 0 ? ' zero' : '')}>
            <div className="cq-topo">
              <Medalha tier={nivelAtual(i)} icone={i.icone} bloqueada={i.nivel === 0} tamanho={70} titulo={i.nivel ? `${i.nome}: nível ${NOME_TIER[nivelAtual(i)]}` : `${i.nome}: bloqueada`} />
              <div className="cq-txt">
                <b>{i.nome}</b>
                <span className="mut small">{i.proxima ? i.desc(i.proxima) : 'Platina conquistada. Lenda!'}</span>
                <Bar pct={i.pct} cls={'t-' + (TIERS[i.nivel] || 'platina')} />
                <span className="small mut">{fmtNum(i.valor)}{i.proxima ? ` / ${fmtNum(i.proxima)}` : ''} {unidade(i.proxima ?? i.valor, i.un)}</span>
              </div>
            </div>
            <div className="cq-niveis">
              {i.tiers.map((t) => (
                <span key={t.tier} className={'cq-nv' + (t.ok ? ' ok' : '')}>
                  <Medalha tier={t.tier} icone={i.icone} bloqueada={!t.ok} tamanho={32} />
                  <em>{fmtNum(t.meta)}</em>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
