import { useState } from 'react'
import { useApp } from '../store.jsx'
import Icon from './Icon.jsx'
import { toast } from './ui.jsx'

const quando = (iso) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '')

export default function Sincronia() {
  const { sync } = useApp()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  const entrar = async (e) => {
    e.preventDefault()
    setErro('')
    setEntrando(true)
    try {
      await sync.entrar(email.trim(), senha)
      setSenha('')
    } catch (err) {
      setErro(err.message)
    }
    setEntrando(false)
  }

  if (!sync.sessao) {
    return (
      <div className="card">
        <h2><Icon name="phone" /> Sincronizar aparelhos</h2>
        <p className="mut small">Entre com a mesma conta no computador e no celular. Tudo que você importar ou registrar aparece nos dois.</p>
        <form onSubmit={entrar}>
          <label className="fld"><span className="f">E-mail</span><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="fld"><span className="f">Senha</span><input type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} /></label>
          {erro && <div className="small" role="alert" style={{ color: 'var(--bad)', margin: '6px 0' }}>{erro}</div>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn pri" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    )
  }

  const st = {
    enviando: 'Enviando…',
    baixando: 'Conferindo a nuvem…',
    ok: `Sincronizado${sync.ultima ? ` às ${quando(sync.ultima)}` : ''}`,
    erro: sync.msg,
    conflito: 'Os dois aparelhos têm dados diferentes',
    off: '',
  }[sync.status]

  return (
    <div className="card">
      <h2><Icon name="phone" /> Sincronizar aparelhos</h2>
      <p className="small" style={{ margin: '2px 0' }}>Conectado como <b>{sync.sessao.email}</b></p>
      <p className="small" role="status" style={{ margin: '2px 0', color: sync.status === 'erro' ? 'var(--bad)' : sync.status === 'ok' ? 'var(--ok)' : 'var(--mut)' }}>{st}</p>

      {sync.conflito && (
        <div className="reading" role="alert">
          <b>Qual versão manter?</b>
          <p className="small mut" style={{ margin: '6px 0 10px' }}>
            Este aparelho e a nuvem têm dados diferentes. A versão que você não escolher será substituída.
          </p>
          <div className="row wrap">
            <button className="btn pri" onClick={() => { sync.usarNuvem(); toast('Dados da nuvem carregados') }}>Usar a nuvem</button>
            <button className="btn" onClick={() => { sync.usarLocal(); toast('Enviando os dados deste aparelho') }}>Usar este aparelho</button>
          </div>
        </div>
      )}

      <div className="row wrap" style={{ marginTop: 10 }}>
        <button className="btn" onClick={() => sync.agora()} disabled={sync.status === 'enviando' || sync.status === 'baixando'}>Sincronizar agora</button>
        <button className="btn ghost" onClick={() => sync.sair()}>Sair</button>
      </div>
    </div>
  )
}
