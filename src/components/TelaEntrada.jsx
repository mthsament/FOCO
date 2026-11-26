import { useEffect, useState } from 'react'
import { useApp } from '../store.jsx'
import { Seg } from './ui.jsx'
import MascoteSprite from './MascoteSprite.jsx'
import { erroUsuario, limpaUsuario, usuarioDisponivel } from '../lib/amigos.js'

// Tela de entrada: aparece no primeiro acesso e depois de sair da conta.
export default function TelaEntrada({ onPular }) {
  const { sync } = useApp()
  const [modo, setModo] = useState('entrar')
  const [f, setF] = useState({ apelido: '', usuario: '', email: '', senha: '' })
  const [ver, setVer] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [livre, setLivre] = useState(null) // null = não sabe · 'busca' · true · false
  const set = (k) => (e) => setF((a) => ({ ...a, [k]: e.target.value }))

  // o @ está livre? (confere enquanto digita)
  const u = limpaUsuario(f.usuario)
  useEffect(() => {
    if (modo !== 'criar' || erroUsuario(u)) { setLivre(null); return }
    setLivre('busca')
    const t = setTimeout(() => usuarioDisponivel(u).then(setLivre), 450)
    return () => clearTimeout(t)
  }, [u, modo])

  const trocaModo = (m) => { setModo(m); setErro(''); setAviso('') }

  const enviar = async (e) => {
    e.preventDefault()
    setErro('')
    setAviso('')
    const email = f.email.trim()
    if (modo === 'criar') {
      if (f.apelido.trim().length < 2) return setErro('Escolha um apelido com pelo menos 2 letras.')
      const eu = erroUsuario(u)
      if (eu) return setErro(eu)
      if (livre === false) return setErro('Esse @ já está em uso. Escolha outro.')
      if (f.senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    }
    setOcupado(true)
    try {
      if (modo === 'entrar') {
        await sync.entrar(email, f.senha)
      } else {
        const r = await sync.cadastrar(email, f.senha, { usuario: u, apelido: f.apelido.trim() })
        if (!r.logado) {
          setModo('entrar')
          setAviso(`Conta criada! Enviamos um e-mail de confirmação para ${email}. Confirme e depois entre aqui.`)
          setF((a) => ({ ...a, senha: '' }))
        }
      }
    } catch (err) {
      setErro(err.message)
    }
    setOcupado(false)
  }

  const esqueci = async () => {
    setErro('')
    setAviso('')
    if (!f.email.trim()) return setErro('Digite seu e-mail acima para receber o link de recuperação.')
    try {
      await sync.recuperar(f.email.trim())
      setAviso('Pronto! Se esse e-mail tiver conta, você vai receber um link para criar uma senha nova.')
    } catch (err) {
      setErro(err.message)
    }
  }

  return (
    <main className="entrada" id="conteudo">
      <div className="ent-marca" translate="no"><span>FOCO</span><i /></div>
      <div className="ent-card">
        <div className="ent-mascote"><MascoteSprite visual="confiante" altura={118} rotulo="Canguru do FOCO" /></div>
        <h1>{modo === 'entrar' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h1>
        <p className="sub">{modo === 'entrar' ? 'Entre para levar seu plano e suas ofensivas para qualquer aparelho.' : 'Seus dados ficam salvos na nuvem e você pode chamar amigos para treinar junto.'}</p>
        <div style={{ marginBottom: 14 }}><Seg value={modo} onChange={trocaModo} options={[['entrar', 'Entrar'], ['criar', 'Criar conta']]} /></div>

        <form onSubmit={enviar} noValidate>
          {modo === 'criar' && (
            <>
              <label className="fld"><span className="f">Apelido (como te chamam)</span>
                <input type="text" autoComplete="nickname" maxLength={24} value={f.apelido} onChange={set('apelido')} placeholder="Ex.: Math" />
              </label>
              <label className="fld"><span className="f">Seu @ (único)</span>
                <span className="ent-arroba">
                  <i>@</i>
                  <input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={20} value={f.usuario.replace(/^@+/, '')} onChange={set('usuario')} placeholder="seu_usuario" aria-describedby="ent-arroba-msg" />
                </span>
                <small id="ent-arroba-msg" className={'ent-dica' + (livre === true ? ' ok' : livre === false ? ' ruim' : '')}>
                  {!u ? 'Seus amigos vão precisar do @ e do seu ID para te adicionar.' : erroUsuario(u) || (livre === 'busca' ? 'Conferindo…' : livre === true ? 'Disponível' : livre === false ? 'Já está em uso' : 'Letras minúsculas, números e _')}
                </small>
              </label>
            </>
          )}
          <label className="fld"><span className="f">E-mail</span>
            <input type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} placeholder="voce@exemplo.com" required />
          </label>
          <label className="fld"><span className="f">Senha</span>
            <span className="ent-senha">
              <input type={ver ? 'text' : 'password'} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} value={f.senha} onChange={set('senha')} placeholder={modo === 'criar' ? 'Mínimo de 6 caracteres' : ''} required />
              <button type="button" className="btn sm ghost" onClick={() => setVer((v) => !v)} aria-pressed={ver}>{ver ? 'Ocultar' : 'Mostrar'}</button>
            </span>
          </label>

          {erro && <div className="note warn" role="alert" style={{ margin: '10px 0' }}>{erro}</div>}
          {aviso && <div className="note" role="status" style={{ margin: '10px 0' }}>{aviso}</div>}

          <button className="btn pri ent-ok" disabled={ocupado || !f.email || !f.senha}>{ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
          {modo === 'entrar' && <button type="button" className="ent-link" onClick={esqueci}>Esqueci minha senha</button>}
        </form>
      </div>
      <button className="ent-pular" onClick={onPular}>Continuar sem conta por enquanto</button>
      <p className="mut small ent-nota">Sem conta, tudo fica só neste aparelho e você não consegue usar amigos.</p>
    </main>
  )
}
