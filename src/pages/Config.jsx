import { useRef, useState } from 'react'
import { del } from 'idb-keyval'
import { useApp, aplicarImportacao, estadoInicial } from '../store.jsx'
import { lerPlanilha, resumir } from '../importer.js'
import { toast } from '../components/ui.jsx'
import { useNav } from '../App.jsx'

const NOMES = { academia: 'Treino (Plano_Academia)', corrida: 'Corrida (Plano_Corrida)', alimentacao: 'Dieta e suplementação' }

export default function Config() {
  const { s, setState } = useApp()
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
    toast('Planilhas importadas ✓')
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

      <div className="card">
        <h2>📥 Importar planilhas</h2>
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
        <h2>⌚ Relógio e balança</h2>
        <p className="small"><b>Relógio (Fitbeing):</b> exporte a corrida do Fitbeing ou do Strava em GPX/TCX e importe na aba Corrida (botão “Importar GPX/TCX”). Distância, tempo e FC média entram sozinhos.</p>
        <p className="small"><b>Balança de bioimpedância:</b> por enquanto, digite peso, gordura, massa magra e água na aba Evolução. A leitura automática via Apple Health é a próxima fase.</p>
        <div className="note">No iPhone, um app instalado pelo Safari não lê o Apple Health nem usa Bluetooth. Por isso a integração direta precisa de uma camada extra, que está no roadmap.</div>
      </div>

      <div className="card">
        <h2>📲 Instalar no celular</h2>
        <ul className="clean small">
          <li><b>iPhone:</b> abra no Safari → botão Compartilhar → “Adicionar à Tela de Início”.</li>
          <li><b>PC (Chrome/Edge):</b> ícone de instalar na barra de endereço.</li>
          <li>Os dados ficam guardados no aparelho. Celular e PC ainda não se sincronizam: use o backup para levar os dados de um para o outro.</li>
        </ul>
      </div>

      <div className="card">
        <h2>💾 Backup</h2>
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
