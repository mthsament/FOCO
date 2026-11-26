import { useEffect, useState } from 'react'
import { erroUsuario, limpaUsuario, usuarioDisponivel } from '../lib/amigos.js'

// Escolher (ou trocar) o @, como no X: letras minúsculas, números e _, único no app.
// atual = @ que a pessoa já tem (para trocar). onSalvar({ usuario, apelido }) devolve uma promessa.
export default function CriarArroba({ atual = '', apelido0 = '', pedirApelido = true, onSalvar, onCancelar, rotulo = 'Criar meu @', titulo, texto }) {
  const [apelido, setApelido] = useState(apelido0)
  const [usuario, setUsuario] = useState(atual)
  const [livre, setLivre] = useState(null) // null = não sabe · 'busca' · true · false
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const u = limpaUsuario(usuario)
  const msg = u ? erroUsuario(u) : ''
  const igualAtual = !!atual && u === atual
  useEffect(() => {
    if (!u || msg || igualAtual) { setLivre(null); return }
    setLivre('busca')
    const t = setTimeout(() => usuarioDisponivel(u).then(setLivre), 450)
    return () => clearTimeout(t)
  }, [u, msg, igualAtual])

  const pode = !!u && !msg && !igualAtual && livre !== false && livre !== 'busca' && (!pedirApelido || apelido.trim().length >= 2)
  const dica = !u ? 'Letras minúsculas, números e _ (de 3 a 20)' : msg || (igualAtual ? 'Esse já é o seu @' : livre === 'busca' ? 'Conferindo…' : livre === true ? 'Disponível' : livre === false ? 'Já está em uso' : 'Letras minúsculas, números e _')

  const salvar = async (e) => {
    e?.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      await onSalvar({ usuario: u, apelido })
    } catch (er) {
      setErro(er.message || 'Não deu certo. Tente de novo.')
    }
    setSalvando(false)
  }

  return (
    <form className="crie-arroba" onSubmit={salvar} noValidate>
      {titulo && <h2>{titulo}</h2>}
      {texto && <p className="mut small" style={{ marginTop: 0 }}>{texto}</p>}
      {pedirApelido && (
        <label className="fld"><span className="f">Seu nome (apelido)</span>
          <input type="text" maxLength={24} autoComplete="nickname" value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="Ex.: Math" />
        </label>
      )}
      <label className="fld" style={{ marginTop: pedirApelido ? 10 : 0 }}><span className="f">Seu @ (único)</span>
        <span className="ent-arroba">
          <i>@</i>
          <input type="text" autoCapitalize="none" autoComplete="username" spellCheck={false} maxLength={20} value={usuario.replace(/^@+/, '')} onChange={(e) => setUsuario(e.target.value)} placeholder="seu_usuario" aria-describedby="arroba-dica" />
        </span>
        <small id="arroba-dica" className={'ent-dica' + (livre === true ? ' ok' : livre === false || (msg && u) ? ' ruim' : '')}>{dica}</small>
      </label>
      {erro && <div className="note warn" role="alert" style={{ marginTop: 10 }}>{erro}</div>}
      <div className="row wrap" style={{ marginTop: 12 }}>
        <button className="btn pri" disabled={!pode || salvando}>{salvando ? 'Salvando…' : rotulo}</button>
        {onCancelar && <button type="button" className="btn ghost" onClick={onCancelar}>Cancelar</button>}
      </div>
    </form>
  )
}
