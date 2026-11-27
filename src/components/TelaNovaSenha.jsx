import { useState } from 'react'
import { useApp } from '../store.jsx'
import CampoSenha from './CampoSenha.jsx'
import MascoteSprite from './MascoteSprite.jsx'
import { erroSenha } from '../lib/senha.js'

// Aparece depois de clicar no link "esqueci minha senha" do e-mail: pede a senha nova antes de qualquer coisa.
export default function TelaNovaSenha() {
  const { sync } = useApp()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const pessoais = [sync.sessao?.email, sync.sessao?.meta?.usuario, sync.sessao?.meta?.apelido]

  const salvar = async (e) => {
    e.preventDefault()
    setErro('')
    const p = erroSenha(a, pessoais)
    if (p) return setErro(p)
    if (a !== b) return setErro('As duas senhas não são iguais.')
    setOcupado(true)
    try { await sync.trocarSenha(a) } catch (err) { setErro(err.message) }
    setOcupado(false)
  }

  return (
    <main className="entrada" id="conteudo">
      <div className="ent-marca" translate="no"><span>FOCO</span><i /></div>
      <div className="ent-card">
        <div className="ent-mascote"><MascoteSprite visual="confiante" altura={118} rotulo="Canguru do FOCO" /></div>
        <h1>Crie uma senha nova</h1>
        <p className="sub">{sync.senhaFraca ? 'Sua senha atual é fraca e não atende à nova política de segurança. Crie uma nova para continuar.' : 'Escolha uma senha forte que você não usa em outro lugar.'}</p>
        <form onSubmit={salvar} noValidate>
          <CampoSenha rotulo="Senha nova" novo politica pessoais={pessoais} value={a} onChange={(e) => setA(e.target.value)} autoFocus />
          <CampoSenha rotulo="Repita a senha nova" novo value={b} onChange={(e) => setB(e.target.value)} />
          {erro && <div className="note warn" role="alert" style={{ margin: '10px 0' }}>{erro}</div>}
          <button className="btn pri ent-ok" disabled={ocupado || !a || !b}>{ocupado ? 'Salvando…' : 'Salvar senha nova'}</button>
          {sync.senhaFraca && <button type="button" className="ent-link" onClick={() => sync.sair()}>Sair da conta</button>}
        </form>
      </div>
    </main>
  )
}
