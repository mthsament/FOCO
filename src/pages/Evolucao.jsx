import { useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { useApp } from '../store.jsx'
import { useNav } from '../App.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import { Delta, Grad, useAnima } from '../components/Graficos.jsx'
import { pesagensOrdenadas, pesoAtual } from '../lib/metrics.js'
import { Seg, r1 } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import VisaoGeral from './evolucao/VisaoGeral.jsx'
import Medir from './evolucao/Medir.jsx'
import Historico from './evolucao/Historico.jsx'

// Evolução + bioimpedância numa aba só: um painel com o resumo do corpo em cima e três seções embaixo.
const SECOES = [['visao', 'Visão geral'], ['medir', 'Medir'], ['historico', 'Histórico']]

export default function Evolucao() {
  const { s } = useApp()
  const { params } = useNav()
  const anima = useAnima()
  const [secao, setSecao] = useState(SECOES.some((x) => x[0] === params?.secao) ? params.secao : 'visao')

  const pes = pesagensOrdenadas(s)
  const ref = pesoAtual(s)
  const base = s.perfil.pesoInicial || pes[0]?.kg
  const variacao = ref && base ? ref - base : null
  const imc = ref && s.perfil.altura ? ref / s.perfil.altura ** 2 : null
  const comp = pes.filter((p) => p.gordura != null || p.massaMagra != null || p.agua != null || p.musculo != null)
  const ult = comp[comp.length - 1]
  const ant = comp[comp.length - 2]
  const dif = (k) => (ult?.[k] != null && ant?.[k] != null ? ult[k] - ant[k] : null)
  const cint = [...s.logs.cintura].sort((a, b) => a.data.localeCompare(b.data))
  const cm = cint[cint.length - 1]?.cm
  const cmAnt = cint[cint.length - 2]?.cm
  const spark = pes.slice(-45).map((p) => ({ d: p.data, kg: p.kg }))

  const stats = [
    ['IMC', imc != null ? r1(imc) : '–', '', null],
    ['Gordura', ult?.gordura != null ? `${r1(ult.gordura)}%` : '–', '', dif('gordura') != null ? <Delta de={0} para={dif('gordura')} melhor="menor" un=" pp" /> : null],
    ['Massa magra', ult?.massaMagra != null ? `${r1(ult.massaMagra)} kg` : '–', '', dif('massaMagra') != null ? <Delta de={0} para={dif('massaMagra')} melhor="maior" un=" kg" /> : null],
    ['Água', ult?.agua != null ? `${r1(ult.agua)}%` : '–', '', null],
    ['Músculo', ult?.musculo != null ? `${r1(ult.musculo)}%` : '–', '', null],
    ['Cintura', cm != null ? `${r1(cm)} cm` : '–', '', cm != null && cmAnt != null ? <Delta de={cmAnt} para={cm} melhor="menor" un=" cm" /> : null],
  ]

  return (
    <>
      <h1>Evolução</h1>
      <p className="sub">Seu corpo, suas medições e a sua constância num lugar só</p>
      <MascoteAba aba="evolucao" />

      <section className="corpo-hero" aria-label="Resumo do corpo">
        <div className="ch-topo">
          <div className="ch-main">
            <span className="ch-rot">Peso atual</span>
            {ref ? (
              <>
                <div className="ch-num"><b key={ref}>{r1(ref)}</b><span>kg</span></div>
                <div className="ch-linha">
                  <Delta de={base} para={ref} melhor="menor" un=" kg" />
                  <span className="ch-sub">desde o início ({base ? `${r1(base)} kg` : '–'})</span>
                </div>
              </>
            ) : (
              <>
                <div className="ch-num"><b>–</b></div>
                <div className="ch-sub">Registre a primeira pesagem para começar a acompanhar.</div>
              </>
            )}
            <button className="btn sm pri ch-btn" onClick={() => setSecao('medir')}><Icon name="plus" /> Registrar medição</button>
          </div>
          <div className="ch-spark" aria-hidden="true">
            {spark.length > 1 ? (
              <ResponsiveContainer>
                <AreaChart data={spark} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
                  <defs><Grad id="g-hero" cor="var(--acc)" topo={0.5} /></defs>
                  <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                  <Area {...anima} type="monotone" dataKey="kg" stroke="var(--acc)" strokeWidth={3} fill="url(#g-hero)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="ch-vazio">O gráfico aparece com duas pesagens ou mais</div>}
          </div>
        </div>
        <dl className="ch-stats">
          {stats.map(([rot, val, , delta]) => (
            <div key={rot}>
              <dt>{rot}</dt>
              <dd>{val}</dd>
              {delta}
            </div>
          ))}
        </dl>
      </section>

      <div className="ev-abas"><Seg value={secao} onChange={setSecao} options={SECOES} /></div>

      {secao === 'visao' && <VisaoGeral />}
      {secao === 'medir' && <Medir />}
      {secao === 'historico' && <Historico />}
    </>
  )
}
