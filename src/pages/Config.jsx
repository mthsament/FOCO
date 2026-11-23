import { useRef, useState } from 'react'
import { del } from 'idb-keyval'
import { useApp, aplicarImportacao, estadoInicial } from '../store.jsx'
import { lerPlanilha, resumir } from '../importer.js'
import { ThemeSeg, toast } from '../components/ui.jsx'
import { metaAgua } from '../lib/metrics.js'
import MascoteAba from '../components/MascoteAba.jsx'
import { useNav } from '../App.jsx'
import Icon from '../components/Icon.jsx'
import Lembretes from '../components/Lembretes.jsx'
import Sincronia from '../components/Sincronia.jsx'
import { CardVersao } from '../components/Atualizacao.jsx'

const NOMES = { academia: 'Treino (Plano_Academia)', corrida: 'Corrida (Plano_Corrida)', alimentacao: 'Dieta e suplementação' }

export default function Config() {
  const { s, setState, update } = useApp()
  const { go } = useNav()
  const [lidos, setLidos] = useState([])
  const [sobrescrever, setSobrescrever] = useState(false)
  const [lendo, setLendo] = useState(false)
  const fileRef = useRef(null)
  const backupRef = useRef(null)

  const ler = async (ev) => {
    const files = [...(ev.target.files || [])]
    ev.target.value = ''
    if (!files.length) return
    setLendo(true)
    const out = []
    for (const f of files) {
      try {
        out.push(lerPlanilha(new Uint8Array(await f.arrayBuffer()), f.name))
      } catch (e) {
        out.push({ tipo: null, nomeArquivo: f.name, avisos: [`Erro ao ler: ${e.message}`] })
      }
    }
    setLidos(out)
    setLendo(false)
  }

  const aplicar = () => {
    setState((prev) => aplicarImportacao(prev, lidos, { sobrescrever }))
    toast('Planilhas importadas')
    setLidos([])
    go('hoje')
  }

  const exportar = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `foco-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const restaurar = async (ev) => {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    try {
      const j = JSON.parse(await f.text())
      if (!j.logs || !j.plan) throw new Error('Arquivo não parece um backup do FOCO')
      const base = estadoInicial()
      setState({ ...base, ...j, logs: { ...base.logs, ...j.logs }, plan: { ...base.plan, ...j.plan }, perfil: { ...base.perfil, ...j.perfil } })
      toast('Backup restaurado')
    } catch (e) {
      toast(e.message)
    }
  }
  const apagar = async () => {
    if (!confirm('Apagar TODOS os dados deste aparelho? Isso não pode ser desfeito. Faça um backup antes.')) return
    await del('foco-state-v1')
    setState(estadoInicial())
    toast('Dados apagados')
  }

  const validos = lidos.filter((l) => l.tipo)
  return (
    <>
      <h1>Ajustes</h1>
      <p className="sub">Importar planilhas, backup e integrações</p>
      <MascoteAba aba="config" />

      <div className="card">
        <h2><Icon name="sun" /> Aparência</h2>
        <ThemeSeg />
      </div>

      <Sincronia />

      <div className="card">
        <h2><Icon name="gota" /> Meta de água</h2>
        <label className="fld">
          <span className="f">Meta diária (litros)</span>
          <input type="number" inputMode="decimal" step="0.1" min="0.5" max="10" autoComplete="off" defaultValue={metaAgua(s) / 1000} onChange={(e) => {
            const v = parseFloat(e.target.value.replace(',', '.'))
            if (v >= 0.5 && v <= 10) update((x) => { x.perfil.metaAgua = Math.round(v * 1000) })
          }} />
        </label>
        <p className="mut small">A ofensiva de água conta os dias seguidos em que você bate essa meta. Mudar a meta vale para todos os dias.</p>
      </div>

      <Lembretes />

      <div className="card">
        <h2><Icon name="upload" /> Importar planilhas</h2>
        <p className="mut small">
          Selecione de uma vez as três planilhas (ou só a que mudou). O <b>plano</b> (treinos, dieta, corrida) é atualizado com o da planilha. Seus <b>registros</b> (cargas, treinos feitos, pesagens, corridas) são mantidos e mesclados. Reimporte sempre que editar as planilhas.
        </p>
        <div className="row wrap">
          <button className="btn pri" onClick={() => fileRef.current?.click()} disabled={lendo}>{lendo ? 'Lendo…' : 'Escolher planilhas (.xlsx)'}</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple hidden onChange={ler} />
        </div>

        {lidos.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {lidos.map((l, i) => (
              <div key={i} className="card" style={{ background: 'var(--card2)' }}>
                <div className="row">
                  <b className="sp">{l.tipo ? NOMES[l.tipo] : 'Não reconhecida'}</b>
                  <span className={'chip ' + (l.tipo ? 'ok' : 'warn')}>{l.nomeArquivo}</span>
                </div>
                {l.tipo && <ul className="clean">{resumir(l).map((t) => <li key={t}>{t}</li>)}</ul>}
                {l.avisos?.map((a) => <div key={a} className="note warn" style={{ marginTop: 6 }}>{a}</div>)}
              </div>
            ))}
            <label className="row small" style={{ margin: '8px 0' }}>
              <input type="checkbox" checked={sobrescrever} onChange={(e) => setSobrescrever(e.target.checked)} />
              <span>Sobrescrever registros que já existem no app com os da planilha</span>
            </label>
            <button className="btn pri" disabled={!validos.length} onClick={aplicar}>Aplicar importação</button>
            <button className="btn ghost" onClick={() => setLidos([])} style={{ marginLeft: 8 }}>Cancelar</button>
          </div>
        )}
        {s.meta.ultimaImportacao && <p className="mut small" style={{ marginTop: 10 }}>Última importação: {new Date(s.meta.ultimaImportacao).toLocaleString('pt-BR')}</p>}
      </div>

      <div className="card">
        <h2><Icon name="watch" /> Relógio e balança</h2>
        <p className="small"><b>Relógio (Fitbeing):</b> exporte a corrida do Fitbeing ou do Strava em GPX/TCX e importe na aba Corrida (botão “Importar GPX/TCX”). Distância, tempo e FC média entram sozinhos.</p>
        <p className="small"><b>Balança de bioimpedância:</b> use a aba Bio para conectar por Bluetooth, importar o CSV do app da balança ou digitar as medidas.</p>
        <div className="note">No iPhone, um app instalado pelo Safari não lê o Apple Health nem usa Bluetooth. Por isso a integração direta precisa de uma camada extra, que está no roadmap.</div>
      </div>

      <CardVersao />

      <div className="card">
        <h2><Icon name="phone" /> Instalar no celular</h2>
        <ul className="clean small">
          <li><b>iPhone:</b> abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</li>
          <li><b>PC (Chrome/Edge):</b> ícone de instalar na barra de endereço.</li>
          <li>Os dados ficam no aparelho e, se você entrar na conta em Sincronizar aparelhos, também na nuvem. Sem login, use o backup para levar os dados de um aparelho para outro.</li>
        </ul>
      </div>

      <div className="card">
        <h2><Icon name="save" /> Backup</h2>
        <div className="row wrap">
          <button className="btn" onClick={exportar}>Exportar backup (.json)</button>
          <button className="btn" onClick={() => backupRef.current?.click()}>Restaurar backup</button>
          <input ref={backupRef} type="file" accept=".json,application/json" hidden onChange={restaurar} />
          <span className="sp" />
          <button className="btn danger" onClick={apagar}>Apagar tudo</button>
        </div>
      </div>
    </>
  )
}
