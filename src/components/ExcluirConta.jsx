import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

// Confirmação para excluir a conta: lista o que some, pergunta pelos dados do aparelho e pede para digitar EXCLUIR.
export default function ExcluirConta({ email, onCancelar, onExcluir }) {
  const [texto, setTexto] = useState('')
  const [limpar, setLimpar] = useState(true)
  const [erro, setErro] = useState('')
  const [indo, setIndo] = useState(false)
  const campo = useRef(null)
  useEffect(() => {
    campo.current?.focus()
    const esc = (e) => e.key === 'Escape' && !indo && onCancelar()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [indo, onCancelar])

  const ok = texto.trim().toUpperCase() === 'EXCLUIR'
  const confirmar = async (e) => {
    e.preventDefault()
    if (!ok || indo) return
    setErro('')
    setIndo(true)
    try {
      await onExcluir({ limparAparelho: limpar })
    } catch (er) {
      setErro(er.message || 'Não consegui excluir a conta. Tente de novo.')
      setIndo(false)
    }
  }

  return (
    <div className="mdl" role="dialog" aria-modal="true" aria-labelledby="mdl-t" onMouseDown={(e) => e.target === e.currentTarget && !indo && onCancelar()}>
      <form className="mdl-card" onSubmit={confirmar}>
        <h2 id="mdl-t"><Icon name="warn" /> Excluir sua conta?</h2>
        <p className="mut small" style={{ marginTop: 0 }}>Conta: <b>{email}</b>. Isso não pode ser desfeito.</p>
        <ul className="mdl-lista">
          <li>Seu perfil (@, ID, foto e “sobre”) e seus dados salvos na nuvem são apagados.</li>
          <li>Suas amizades e seus check-ins somem para os amigos.</li>
          <li>Ofensivas em grupo que <b>você criou</b> são encerradas para todos. Nas outras, você sai.</li>
        </ul>
        <label className="row small" style={{ margin: '10px 0' }}>
          <input type="checkbox" checked={limpar} onChange={(e) => setLimpar(e.target.checked)} />
          <span>Apagar também os dados deste aparelho (treinos, pesagens, corridas…)</span>
        </label>
        <label className="fld"><span className="f">Digite <b>EXCLUIR</b> para confirmar</span>
          <input ref={campo} type="text" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="EXCLUIR" />
        </label>
        {erro && <div className="note warn" role="alert" style={{ marginTop: 10 }}>{erro}</div>}
        <div className="row wrap" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button type="button" className="btn ghost" onClick={onCancelar} disabled={indo}>Cancelar</button>
          <button className="btn danger-solid" disabled={!ok || indo}>{indo ? 'Excluindo…' : 'Excluir definitivamente'}</button>
        </div>
      </form>
    </div>
  )
}
