import { useRef, useState } from 'react'
import { useApp } from '../../store.jsx'
import { reagir } from '../../lib/mascoteEventos.js'
import { todayISO } from '../../lib/dates.js'
import { conectarBalanca, lerCsv, suportaBluetooth } from '../../lib/bluetooth.js'
import { num, r1, toast } from '../../components/ui.jsx'
import Icon from '../../components/Icon.jsx'
import DiagBluetooth from '../../components/DiagBluetooth.jsx'

const CAMPOS = [
  ['kg', 'Peso (kg)', 0.1],
  ['gordura', 'Gordura (%)', 0.1],
  ['massaMagra', 'Massa magra (kg)', 0.1],
  ['agua', 'Água (%)', 0.1],
  ['musculo', 'Músculo (%)', 0.1],
  ['visceral', 'Gordura visceral', 1],
  ['cintura', 'Cintura (cm)', 0.5],
]
const VAZIO = { data: todayISO(), kg: '', gordura: '', massaMagra: '', agua: '', musculo: '', visceral: '', cintura: '' }

export default function Medir() {
  const { s, update } = useApp()
  const [f, setF] = useState(VAZIO)
  const [status, setStatus] = useState('')
  const [lendo, setLendo] = useState(false)
  const [conn, setConn] = useState(null)
  const [leitura, setLeitura] = useState(null)
  const csvRef = useRef(null)
  const suporta = suportaBluetooth()

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
    if (!kg && !num(f.cintura)) return toast('Informe o peso ou a cintura')
    const reg = { data: f.data, kg }
    for (const [k] of CAMPOS.slice(1)) {
      if (k === 'cintura') continue
      const v = num(f[k])
      if (v != null) reg[k] = v
    }
    if (kg) gravar(reg)
    const cm = num(f.cintura)
    if (cm) update((x) => {
      const i = x.logs.cintura.findIndex((c) => c.data === f.data)
      if (i >= 0) x.logs.cintura[i].cm = cm
      else x.logs.cintura.push({ data: f.data, cm })
    })
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

  const campo = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="grid c2 medir">
      <div className="col">
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
      </div>
      <div className="col">

      <div className="card">
        <h2><Icon name="save" /> Registrar medição</h2>
        <p className="mut small" style={{ margin: '0 0 10px' }}>Só o peso já basta. Gordura, massa magra, água, músculo e cintura são opcionais.</p>
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
      </div>
    </div>
  )
}
