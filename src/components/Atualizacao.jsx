import { useState } from 'react'
import { VERSAO, aplicarAtualizacao, buscarAtualizacao, dispensar, liberarCache, useAtualizacao } from '../lib/atualizacao.js'
import Icon from './Icon.jsx'

// Aviso fixo acima do menu quando existe uma versão nova
export function AvisoAtualizacao() {
  const { nova, dispensada } = useAtualizacao()
  if (!nova || dispensada) return null
  return (
    <div className="atualiza" role="status">
      <Icon name="download" />
      <span className="sp"><b>Nova versão disponível</b></span>
      <button className="btn sm" onClick={dispensar}>Depois</button>
      <button className="btn sm pri" onClick={aplicarAtualizacao}>Atualizar</button>
    </div>
  )
}

const dataBR = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

// Card de Ajustes: versão instalada, buscar atualização e liberar cache
export function CardVersao() {
  const { nova } = useAtualizacao()
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const buscar = async () => {
    setOcupado(true)
    setMsg('Procurando…')
    try {
      const r = await buscarAtualizacao()
      setMsg(r === 'nova' ? 'Nova versão encontrada. Toque em Atualizar.' : r === 'atual' ? 'Você já está na versão mais recente.' : 'Atualização indisponível neste modo (abra pelo site publicado).')
    } catch {
      setMsg('Não consegui verificar. Confira a internet.')
    }
    setOcupado(false)
  }
  const limpar = async () => {
    if (!confirm('Liberar o cache do app?\n\nSeus dados (treinos, dieta, corridas, pesagens) NÃO são apagados. O app recarrega com a versão mais nova. Se as notificações estiverem ativas, ative de novo em Lembretes.')) return
    setOcupado(true)
    try {
      await liberarCache()
    } catch {
      setMsg('Não consegui liberar o cache.')
      setOcupado(false)
    }
  }

  return (
    <div className="card">
      <h2><Icon name="download" /> Versão e atualização</h2>
      <p className="small" style={{ margin: '2px 0' }}>
        Versão <b>{VERSAO.numero}</b>{VERSAO.commit ? <span className="mut"> · {VERSAO.commit}</span> : null}
      </p>
      {VERSAO.build && <p className="mut small" style={{ margin: '2px 0 10px' }}>Compilada em {dataBR(VERSAO.build)}</p>}
      {msg && <p className="small" role="status" style={{ margin: '4px 0 10px' }}>{msg}</p>}
      <div className="row wrap">
        {nova ? (
          <button className="btn pri" onClick={aplicarAtualizacao}>Atualizar agora</button>
        ) : (
          <button className="btn pri" onClick={buscar} disabled={ocupado}>Buscar atualização</button>
        )}
        <button className="btn" onClick={limpar} disabled={ocupado}>Liberar cache</button>
      </div>
      <p className="mut small" style={{ marginTop: 10 }}>
        Liberar o cache resolve o app preso numa versão antiga. Seus dados ficam no aparelho e na nuvem, e não são tocados.
      </p>
    </div>
  )
}
