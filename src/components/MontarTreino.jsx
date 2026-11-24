import { useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import { DIAS, DIAS_LONGO, mondayOf, todayISO } from '../lib/dates.js'
import { inicioDoPlano } from '../lib/metrics.js'
import { CATEGORIAS, categoriaDe, exerciciosDe } from '../lib/exercicios.js'
import AnimacaoLazy from './AnimacaoLazy.jsx'
import Combo from './Combo.jsx'
import { Seg, num, toast } from './ui.jsx'
import Icon from './Icon.jsx'

// Editor do plano: monta os treinos (exercícios), define em quais dias cada um cai
// e escreve a rotina do dia. Tudo vira o mesmo formato que a importação da planilha gera.
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const novoId = () => `ex-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const exVazio = () => ({ id: novoId(), grupo: '', nome: '', series: 3, reps: '8-12', descanso: '60s', obs: '' })
const diaVazio = () => Object.fromEntries(DIAS.map((d) => [d, null]))

export default function MontarTreino({ onFechar }) {
  const { s, update } = useApp()
  const [aba, setAba] = useState('treinos')
  const treinos = s.plan.treinos || {}
  const letras = Object.keys(treinos)
  const [sel, setSel] = useState(letras[0] || null)
  const atual = sel && treinos[sel] ? sel : letras[0] || null

  const mexe = (fn) => update((x) => { x.plan.treinos = x.plan.treinos || {}; fn(x) })

  // Foto do plano ao abrir: "Cancelar" volta a ela e descarta tudo o que foi mexido aqui.
  const foto = useRef(null)
  if (!foto.current) {
    const { plan, perfil } = s
    foto.current = structuredClone({ treinos: plan.treinos, rodizio: plan.rodizio, rotina: plan.rotina, rotinaFds: plan.rotinaFds, inicio: perfil.inicio })
  }
  const mudou = () => JSON.stringify({ treinos: s.plan.treinos, rodizio: s.plan.rodizio, rotina: s.plan.rotina, rotinaFds: s.plan.rotinaFds, inicio: s.perfil.inicio }) !== JSON.stringify(foto.current)
  const cancelar = () => {
    if (mudou()) {
      if (!confirm('Descartar as alterações feitas nesta edição?')) return
      const f = structuredClone(foto.current)
      update((x) => {
        x.plan.treinos = f.treinos
        x.plan.rodizio = f.rodizio
        x.plan.rotina = f.rotina
        x.plan.rotinaFds = f.rotinaFds
        x.perfil.inicio = f.inicio
      })
      toast('Alterações descartadas')
    }
    onFechar()
  }

  const criarTreino = () => {
    const letra = [...LETRAS].find((l) => !treinos[l])
    if (!letra) return toast('Limite de treinos atingido')
    mexe((x) => { x.plan.treinos[letra] = { letra, nome: '', exercicios: [exVazio()] } })
    setSel(letra)
  }
  const apagarTreino = (letra) => {
    if (!confirm(`Apagar o treino ${letra}? Os registros já feitos continuam salvos.`)) return
    mexe((x) => {
      delete x.plan.treinos[letra]
      const r = x.plan.rodizio
      if (r) for (const sem of [r.s1, r.s2]) for (const d of DIAS) if (sem[d] === letra) sem[d] = null
      if (!Object.keys(x.plan.treinos).length) { x.plan.treinos = null; x.plan.rodizio = null }
    })
    setSel(null)
  }
  const duplicar = (letra) => {
    const nova = [...LETRAS].find((l) => !treinos[l])
    if (!nova) return toast('Limite de treinos atingido')
    mexe((x) => {
      const o = structuredClone(x.plan.treinos[letra])
      x.plan.treinos[nova] = { ...o, letra: nova, nome: o.nome ? `${o.nome} (cópia)` : '', exercicios: o.exercicios.map((e) => ({ ...e, id: novoId() })) }
    })
    setSel(nova)
  }
  const setT = (letra, campo, v) => mexe((x) => { x.plan.treinos[letra][campo] = v })
  const setEx = (letra, i, campo, v) => mexe((x) => { x.plan.treinos[letra].exercicios[i][campo] = v })
  const addEx = (letra) => mexe((x) => { x.plan.treinos[letra].exercicios.push(exVazio()) })
  const delEx = (letra, i) => mexe((x) => { x.plan.treinos[letra].exercicios.splice(i, 1) })
  const move = (letra, i, d) =>
    mexe((x) => {
      const a = x.plan.treinos[letra].exercicios
      const j = i + d
      if (j < 0 || j >= a.length) return
      ;[a[i], a[j]] = [a[j], a[i]]
    })

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}>
        <h1 className="sp" style={{ margin: 0 }}>Montar treino</h1>
        <button className="btn sm ghost" onClick={cancelar}>Cancelar</button>
        <button className="btn sm pri" onClick={onFechar}><Icon name="check" /> Pronto</button>
      </div>
      <p className="sub">Crie seus treinos, escolha os dias da semana e monte a rotina. Toque em Pronto para manter ou em Cancelar para descartar.</p>
      <div style={{ marginBottom: 14, overflowX: 'auto' }}>
        <Seg value={aba} onChange={setAba} options={[['treinos', 'Treinos'], ['semana', 'Semana'], ['rotina', 'Rotina do dia']]} />
      </div>

      {aba === 'treinos' && (
        <>
          <div className="mt-abas" role="tablist" aria-label="Seus treinos">
            {letras.map((l) => (
              <button key={l} role="tab" aria-selected={l === atual} className={'mt-aba' + (l === atual ? ' on' : '')} onClick={() => setSel(l)}>
                <b>{l}</b><span>{treinos[l].nome || 'sem nome'}</span>
              </button>
            ))}
            <button className="mt-aba novo" onClick={criarTreino}><b>+</b><span>Novo treino</span></button>
          </div>

          {!atual && (
            <div className="card empty">
              <h2>Comece pelo seu primeiro treino</h2>
              <p className="mut">Dê um nome (ex.: Peito e tríceps) e adicione os exercícios com séries e repetições.</p>
              <button className="btn pri" onClick={criarTreino}>Criar treino A</button>
            </div>
          )}

          {atual && (() => {
            const t = treinos[atual]
            return (
              <div className="card">
                <div className="row wrap">
                  <span className="tag">{atual}</span>
                  <input className="sp" type="text" autoComplete="off" placeholder="Nome do treino (ex.: Peito e tríceps)" value={t.nome} onChange={(e) => setT(atual, 'nome', e.target.value)} aria-label="Nome do treino" />
                  <button className="btn sm ghost" onClick={() => duplicar(atual)} title="Duplicar treino">Duplicar</button>
                  <button className="btn sm ghost danger" onClick={() => apagarTreino(atual)}>Apagar</button>
                </div>

                {t.exercicios.map((ex, i) => (
                  <div className="mt-ex" key={ex.id}>
                    <div className="row">
                      <span className="mt-n">{i + 1}</span>
                      <button className="iconbtn" onClick={() => move(atual, i, -1)} disabled={i === 0} aria-label="Subir"><Icon name="chevL" className="r90" /></button>
                      <button className="iconbtn" onClick={() => move(atual, i, 1)} disabled={i === t.exercicios.length - 1} aria-label="Descer"><Icon name="chevR" className="r90" /></button>
                      <button className="iconbtn" onClick={() => delEx(atual, i)} aria-label="Remover exercício"><Icon name="trash" /></button>
                    </div>
                    <div className="mt-corpo">
                      <div className="mt-escolha">
                        <EscolherExercicio ex={ex} n={i + 1} onChange={(campos) => mexe((x) => Object.assign(x.plan.treinos[atual].exercicios[i], campos))} />
                      </div>
                    <div className="form" style={{ marginTop: 10 }}>
                      <label className="fld"><span className="f">Séries</span><input type="number" inputMode="numeric" min="1" max="12" value={ex.series} onChange={(e) => setEx(atual, i, 'series', Math.min(12, Math.max(1, num(e.target.value) || 1)))} /></label>
                      <label className="fld"><span className="f">Repetições</span><input type="text" autoComplete="off" placeholder="8-12" value={ex.reps} onChange={(e) => setEx(atual, i, 'reps', e.target.value)} /></label>
                      <label className="fld"><span className="f">Descanso</span><input type="text" autoComplete="off" placeholder="60s" value={ex.descanso} onChange={(e) => setEx(atual, i, 'descanso', e.target.value)} /></label>
                      <label className="fld" style={{ gridColumn: '1 / -1' }}><span className="f">Observação (opcional)</span><input type="text" autoComplete="off" placeholder="Ex.: descida lenta, 3 s" value={ex.obs || ''} onChange={(e) => setEx(atual, i, 'obs', e.target.value)} /></label>
                    </div>
                      {ex.nome && <AnimacaoLazy nome={ex.nome} grupo={ex.grupo || categoriaDe(ex.nome)} />}
                    </div>
                  </div>
                ))}
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={() => addEx(atual)}>+ Adicionar exercício</button>
                  <span className="mut small">{t.exercicios.length} exercício(s) · {t.exercicios.reduce((a, e) => a + e.series, 0)} séries</span>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {aba === 'semana' && <Semana letras={letras} treinos={treinos} />}
      {aba === 'rotina' && <RotinaDia />}
    </>
  )
}

// Em quais dias da semana cada treino acontece (com opção de alternar duas semanas)
function Semana({ letras, treinos }) {
  const { s, update } = useApp()
  const r = s.plan.rodizio
  const alterna = !!r && DIAS.some((d) => (r.s1[d] || null) !== (r.s2[d] || null))
  const [alt, setAlt] = useState(alterna)
  const [q, setQ] = useState(1)
  if (!letras.length) return <div className="card"><div className="mut">Crie pelo menos um treino na aba Treinos para montar a semana.</div></div>

  const sem = (q === 2 && alt ? r?.s2 : r?.s1) || diaVazio()
  const poe = (dia, letra) =>
    update((x) => {
      const cur = x.plan.rodizio || { s1: diaVazio(), s2: diaVazio() }
      const alvo = q === 2 && alt ? 's2' : 's1'
      cur[alvo] = { ...diaVazio(), ...cur[alvo], [dia]: letra || null }
      if (!alt) cur.s2 = { ...cur.s1 }
      x.plan.rodizio = cur
      if (!x.perfil.inicio && !inicioDoPlano(x)) x.perfil.inicio = mondayOf(todayISO())
    })
  const trocaAlt = (v) => {
    setAlt(v)
    setQ(1)
    if (!v) update((x) => { if (x.plan.rodizio) x.plan.rodizio.s2 = { ...x.plan.rodizio.s1 } })
  }

  return (
    <div className="card">
      <h2>Semana de treino</h2>
      <p className="mut small">Escolha o treino de cada dia. Dias sem treino contam como descanso.</p>
      <label className="row" style={{ margin: '8px 0 12px' }}>
        <input type="checkbox" checked={alt} onChange={(e) => trocaAlt(e.target.checked)} style={{ width: 20, height: 20 }} />
        <span>Alternar duas semanas (semana 1 e semana 2 diferentes)</span>
      </label>
      {alt && <div style={{ marginBottom: 12 }}><Seg value={q} onChange={setQ} options={[[1, 'Semana 1'], [2, 'Semana 2']]} /></div>}
      <div className="mt-semana">
        {DIAS.map((d) => (
          <div className="mt-dia" key={d}>
            <b>{DIAS_LONGO[d]}</b>
            <div className="mt-chips">
              <button className={'mt-chip' + (!sem[d] ? ' on' : '')} onClick={() => poe(d, null)}>Descanso</button>
              {letras.map((l) => (
                <button key={l} className={'mt-chip' + (sem[d] === l ? ' on' : '')} onClick={() => poe(d, l)} title={treinos[l].nome}>{l}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {s.plan.rodizio && (
        <p className="mut small" style={{ marginTop: 10 }}>
          {DIAS.filter((d) => sem[d]).length} dia(s) de treino por semana{alt ? ` na semana ${q}` : ''}.
        </p>
      )}
    </div>
  )
}

// Rotina do dia (hora + o que fazer) e do fim de semana
function RotinaDia() {
  const { s, update } = useApp()
  const rot = s.plan.rotina || []
  const fds = s.plan.rotinaFds || []
  const setR = (i, k, v) => update((x) => { x.plan.rotina[i][k] = v })
  const add = () => update((x) => { x.plan.rotina = x.plan.rotina || []; x.plan.rotina.push({ hora: '', titulo: '', detalhe: '' }) })
  const del = (i) => update((x) => { x.plan.rotina.splice(i, 1) })
  const ordenar = () => update((x) => { x.plan.rotina.sort((a, b) => String(a.hora).localeCompare(String(b.hora))) })
  const setF = (i, k, v) => update((x) => { x.plan.rotinaFds[i][k] = v })
  const addF = () => update((x) => { x.plan.rotinaFds = x.plan.rotinaFds || []; x.plan.rotinaFds.push({ dia: 'Sábado', titulo: '', detalhe: '' }) })
  const delF = (i) => update((x) => { x.plan.rotinaFds.splice(i, 1) })

  return (
    <>
      <div className="card">
        <div className="row"><h2 className="sp">Rotina do dia (seg a sex)</h2><button className="btn sm ghost" onClick={ordenar}>Ordenar por hora</button></div>
        {rot.length === 0 && <p className="mut small">Nada ainda. Adicione os horários: acordar, refeições, treino, dormir...</p>}
        {rot.map((r, i) => (
          <div className="mt-ex" key={i}>
            <div className="row">
              <input type="time" value={/^\d\d:\d\d$/.test(r.hora) ? r.hora : ''} onChange={(e) => setR(i, 'hora', e.target.value)} aria-label="Hora" style={{ width: 120, flex: 'none' }} />
              <input className="sp" type="text" autoComplete="off" placeholder="O que fazer (ex.: Treino)" value={r.titulo} onChange={(e) => setR(i, 'titulo', e.target.value)} aria-label="Atividade" />
              <button className="iconbtn" onClick={() => del(i)} aria-label="Remover"><Icon name="trash" /></button>
            </div>
            <input type="text" autoComplete="off" placeholder="Detalhe (opcional)" value={r.detalhe || ''} onChange={(e) => setR(i, 'detalhe', e.target.value)} style={{ marginTop: 8 }} aria-label="Detalhe" />
          </div>
        ))}
        <button className="btn" style={{ marginTop: 12 }} onClick={add}>+ Adicionar horário</button>
      </div>

      <div className="card">
        <h2>Fim de semana</h2>
        {fds.map((r, i) => (
          <div className="mt-ex" key={i}>
            <div className="row">
              <select value={r.dia} onChange={(e) => setF(i, 'dia', e.target.value)} aria-label="Dia" style={{ width: 130, flex: 'none' }}><option>Sábado</option><option>Domingo</option></select>
              <input className="sp" type="text" autoComplete="off" placeholder="Atividade" value={r.titulo} onChange={(e) => setF(i, 'titulo', e.target.value)} aria-label="Atividade" />
              <button className="iconbtn" onClick={() => delF(i)} aria-label="Remover"><Icon name="trash" /></button>
            </div>
            <input type="text" autoComplete="off" placeholder="Detalhe (opcional)" value={r.detalhe || ''} onChange={(e) => setF(i, 'detalhe', e.target.value)} style={{ marginTop: 8 }} aria-label="Detalhe" />
          </div>
        ))}
        <button className="btn" style={{ marginTop: 12 }} onClick={addF}>+ Adicionar</button>
      </div>
    </>
  )
}

// Escolhe a categoria e o exercício, ambos com busca. Sem categoria, a busca olha todos os exercícios.
const CATS = CATEGORIAS.map((c) => ({ chave: c.nome, valor: c.nome }))
const TODOS = CATEGORIAS.flatMap((c) => c.exercicios.map((n) => ({ chave: `${c.nome}|${n}`, valor: n, sub: c.nome, grupo: c.nome })))

function EscolherExercicio({ ex, n, onChange }) {
  const grupo = ex.grupo || categoriaDe(ex.nome)
  const opcoes = grupo ? exerciciosDe(grupo).map((nome) => ({ chave: `${grupo}|${nome}`, valor: nome, grupo })) : TODOS
  return (
    <>
      <Combo
        value={grupo}
        options={CATS}
        placeholder="Categoria (ex.: Peito)"
        ariaLabel={`Categoria do exercício ${n}`}
        onPick={(o) => onChange({ grupo: o.valor, nome: exerciciosDe(o.valor).includes(ex.nome) ? ex.nome : '', outro: false })}
      />
      <Combo
        value={ex.nome}
        options={opcoes}
        livre
        placeholder={grupo ? `Buscar em ${grupo}…` : 'Buscar exercício…'}
        ariaLabel={`Exercício ${n}`}
        onPick={(o) => (o.livre ? onChange({ nome: o.valor, outro: true }) : onChange({ nome: o.valor, grupo: o.grupo || grupo, outro: false }))}
      />
    </>
  )
}
