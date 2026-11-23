import { useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import { reagir } from '../lib/mascoteEventos.js'
import { fmtBR, todayISO } from '../lib/dates.js'
import { pesagensOrdenadas } from '../lib/metrics.js'
import { conectarBalanca, lerCsv, suportaBluetooth } from '../lib/bluetooth.js'
import { Kpi, num, r1, toast } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import DiagBluetooth from '../components/DiagBluetooth.jsx'

const CAMPOS = [
  ['kg', 'Peso (kg)', 0.1],
  ['gordura', 'Gordura (%)', 0.1],
  ['massaMagra', 'Massa magra (kg)', 0.1],
  ['agua', 'Água (%)', 0.1],
  ['musculo', 'Músculo (%)', 0.1],
  ['visceral', 'Gordura visceral', 1],
]
const VAZIO = { data: todayISO(), kg: '', gordura: '', massaMagra: '', agua: '', musculo: '', visceral: '' }

export default function Bio() {
  const { s, update } = useApp()
  const [f, setF] = useState(VAZIO)
  const [status, setStatus] = useState('')
  const [lendo, setLendo] = useState(false)
  const [conn, setConn] = useState(null)
  const [leitura, setLeitura] = useState(null)
  const csvRef = useRef(null)
  const suporta = suportaBluetooth()

  const hist = pesagensOrdenadas(s).filter((p) => p.gordura != null || p.massaMagra != null || p.agua != null || p.musculo != null)
  const ult = hist[hist.length - 1]
  const ant = hist[hist.length - 2]
  const delta = (k) => (ult?.[k] != null && ant?.[k] != null ? ult[k] - ant[k] : null)
  const fmtD = (d, un) => (d == null ? 'sem comparação' : `${d > 0 ? '+' : ''}${r1(d)} ${un} vs. anterior`)

  const gravar = (reg) =>
    update((x) => {
      const i = x.logs.pesagens.findIndex((p) => p.data === reg.data)
      if (i >= 0) x.logs.pesagens[i] = { ...x.logs.pesagens[i], ...reg }
      else x.logs.pesagens.push(reg)
    })

  const conectar = async () => {
    setLendo(true)
    setLeitura(null)
    try {
      const c = await conectarBalanca({
        onStatus: setStatus,
        onLeitura: (r) => setLeitura((a) => ({ ...(a || {}), ...r })),
        onFim: () => {
          setConn(null)
          setStatus('Balança desconectada.')
        },
      })
      setConn(c)
    } catch (e) {
      setStatus(e?.name === 'NotFoundError' ? 'Nenhuma balança escolhida.' : `Não foi possível conectar: ${e?.message || e}`)
    } finally {
      setLendo(false)
    }
  }
  const desconectar = () => {
    conn?.desconectar()
    setConn(null)
  }

  const salvarLeitura = () => {
    if (!leitura?.kg) return toast('A leitura ainda não trouxe o peso')
    const { kg, gordura, massaMagra, agua, musculo, impedancia, tmb } = leitura
    const reg = { data: todayISO(), kg, origem: 'bluetooth' }
    Object.entries({ gordura, massaMagra, agua, musculo, impedancia, tmb }).forEach(([k, v]) => v != null && (reg[k] = v))
    gravar(reg)
    setLeitura(null)
    toast('Medição salva')
    reagir('pula', ['Medição salva!', 'Dados novos, gráficos novos.', 'Registrado!'])
  }

  const salvarManual = () => {
    const kg = num(f.kg)
    if (!kg) return toast('Informe o peso')
    const reg = { data: f.data, kg }
    for (const [k] of CAMPOS.slice(1)) {
      const v = num(f[k])
      if (v != null) reg[k] = v
    }
    gravar(reg)
    setF({ ...VAZIO, data: f.data })
    toast('Medição salva')
    reagir('pula', ['Medição salva!', 'Dados novos, gráficos novos.', 'Registrado!'])
  }

  const importarCsv = async (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    const regs = lerCsv(await file.text())
    if (!regs.length) return toast('Não encontrei colunas de data e peso no arquivo')
    update((x) => {
      for (const r of regs) {
        const i = x.logs.pesagens.findIndex((p) => p.data === r.data)
        if (i >= 0) x.logs.pesagens[i] = { ...x.logs.pesagens[i], ...r }
        else x.logs.pesagens.push(r)
      }
    })
    toast(`${regs.length} medições importadas`)
  }

  const apagar = (data) => update((x) => { x.logs.pesagens = x.logs.pesagens.filter((p) => p.data !== data) })
  const campo = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <>
      <h1>Bioimpedância</h1>
      <p className="sub">Conecte a balança ou registre as medições. Tudo alimenta os gráficos da aba Evolução.</p>
      <MascoteAba aba="bio" />

      <div className="kpis">
        <Kpi v={ult?.gordura != null ? `${r1(ult.gordura)}%` : '–'} l={`Gordura · ${fmtD(delta('gordura'), 'p.p.')}`} />
        <Kpi v={ult?.massaMagra != null ? `${r1(ult.massaMagra)} kg` : '–'} l={`Massa magra · ${fmtD(delta('massaMagra'), 'kg')}`} />
        <Kpi v={ult?.agua != null ? `${r1(ult.agua)}%` : '–'} l="Água corporal" />
        <Kpi v={ult?.musculo != null ? `${r1(ult.musculo)}%` : '–'} l="Músculo" />
      </div>

      <div className="card">
        <div className="row">
          <h2 className="sp"><Icon name="bluetooth" /> Balança por Bluetooth</h2>
          {conn && <span className="chip ok">Conectada</span>}
        </div>
        {!suporta ? (
          <div className="note warn">
            Este navegador não tem Bluetooth na web. Use o Chrome ou o Edge no Android ou no computador. No iPhone, nem o Safari nem o Chrome liberam Bluetooth para sites: abra este endereço no navegador gratuito Bluefy (App Store) ou registre à mão abaixo.
          </div>
        ) : (
          <>
            <p className="mut small">
              Funciona com balanças que usam os serviços abertos do Bluetooth (peso e composição corporal). Ligue a balança, toque em conectar e escolha-a na lista.
            </p>
            <div className="row wrap">
              {!conn ? (
                <button className="btn pri" onClick={conectar} disabled={lendo}>
                  <Icon name="bluetooth" /> {lendo ? 'Procurando…' : 'Conectar balança'}
                </button>
              ) : (
                <button className="btn" onClick={desconectar}>Desconectar</button>
              )}
            </div>
            {status && <p className="small" role="status" aria-live="polite" style={{ marginTop: 10 }}>{status}</p>}
            {conn && conn.assinou === 0 && (
              <div className="note warn" style={{ marginTop: 8 }}>
                Esta balança não envia dados no padrão aberto{conn.servicos.length ? ` (serviços encontrados: ${conn.servicos.join(', ')})` : ''}. Use o app dela, exporte o histórico em CSV e importe abaixo.
              </div>
            )}
            {leitura && (
              <div className="reading">
                <div className="reading-v">{leitura.kg ? `${r1(leitura.kg)} kg` : 'Medindo…'}</div>
                <div className="reading-grid">
                  {leitura.gordura != null && <span><b>{r1(leitura.gordura)}%</b> gordura</span>}
                  {leitura.massaMagra != null && <span><b>{r1(leitura.massaMagra)} kg</b> massa magra</span>}
                  {leitura.agua != null && <span><b>{r1(leitura.agua)}%</b> água</span>}
                  {leitura.musculo != null && <span><b>{r1(leitura.musculo)}%</b> músculo</span>}
                  {leitura.impedancia != null && <span><b>{r1(leitura.impedancia)} Ω</b> impedância</span>}
                </div>
                <button className="btn pri" onClick={salvarLeitura}><Icon name="save" /> Salvar medição</button>
              </div>
            )}
          </>
        )}
      </div>

      {suporta && <DiagBluetooth />}

      <div className="card">
        <h2>Registrar à mão</h2>
        <div className="form">
          <label className="fld"><span className="f">Data</span><input autoComplete="off" type="date" value={f.data} onChange={campo('data')} /></label>
          {CAMPOS.map(([k, l, st]) => (
            <label key={k} className="fld"><span className="f">{l}</span><input autoComplete="off" type="number" inputMode="decimal" step={st} value={f[k]} onChange={campo(k)} /></label>
          ))}
        </div>
        <div className="row wrap" style={{ marginTop: 10 }}>
          <button className="btn pri" onClick={salvarManual}><Icon name="save" /> Salvar medição</button>
          <button className="btn" onClick={() => csvRef.current?.click()}><Icon name="upload" /> Importar CSV da balança</button>
          <input ref={csvRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={importarCsv} />
        </div>
        <p className="mut small" style={{ marginTop: 8 }}>
          O CSV precisa de cabeçalho com colunas de data e peso. Gordura, massa magra, água, músculo e gordura visceral entram se existirem.
        </p>
      </div>

      <div className="card">
        <h2>Histórico</h2>
        {hist.length === 0 ? (
          <div className="mut small">Nenhuma medição de composição ainda. Quando você registrar a primeira, ela aparece aqui.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Data</th><th>Peso</th><th>Gordura</th><th>Magra</th><th>Água</th><th>Músculo</th><th><span className="sr">Apagar</span></th></tr>
              </thead>
              <tbody>
                {[...hist].reverse().map((p) => (
                  <tr key={p.data}>
                    <td>{fmtBR(p.data)}</td>
                    <td>{r1(p.kg)}</td>
                    <td>{p.gordura != null ? `${r1(p.gordura)}%` : '–'}</td>
                    <td>{p.massaMagra != null ? `${r1(p.massaMagra)} kg` : '–'}</td>
                    <td>{p.agua != null ? `${r1(p.agua)}%` : '–'}</td>
                    <td>{p.musculo != null ? `${r1(p.musculo)}%` : '–'}</td>
                    <td>
                      <button className="btn sm ghost danger" onClick={() => apagar(p.data)} aria-label={`Apagar medição de ${fmtBR(p.data)}`}><Icon name="trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
