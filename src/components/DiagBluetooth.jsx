import { useRef, useState } from 'react'
import { diagnosticar } from '../lib/bluetoothDiag.js'
import { toast } from './ui.jsx'
import Icon from './Icon.jsx'

export default function DiagBluetooth() {
  const [linhas, setLinhas] = useState([])
  const [ativo, setAtivo] = useState(false)
  const sessao = useRef(null)
  const preRef = useRef(null)

  const add = (t) => {
    setLinhas((l) => [...l.slice(-400), t])
    requestAnimationFrame(() => preRef.current && (preRef.current.scrollTop = preRef.current.scrollHeight))
  }

  const iniciar = async () => {
    setLinhas([])
    setAtivo(true)
    try {
      sessao.current = await diagnosticar({ onLinha: add, onFim: () => setAtivo(false) })
    } catch (e) {
      add(e.name === 'NotFoundError' ? 'Nenhum dispositivo escolhido.' : `Erro: ${e.message}`)
      setAtivo(false)
    }
  }
  const parar = () => {
    sessao.current?.parar()
    setAtivo(false)
  }
  const copiar = async () => {
    const texto = linhas.join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      toast('Registro copiado')
    } catch {
      const r = document.createRange()
      r.selectNodeContents(preRef.current)
      getSelection().removeAllRanges()
      getSelection().addRange(r)
      toast('Selecionei o texto: use Copiar do sistema')
    }
  }

  return (
    <details className="card">
      <summary><h2 style={{ display: 'inline' }}><Icon name="bluetooth" /> Diagnóstico da balança (avançado)</h2></summary>
      <p className="mut small" style={{ marginTop: 8 }}>
        Para balanças com protocolo próprio. Registra tudo que a balança envia, para o app aprender a ler o seu modelo.
        Toque em iniciar, escolha a balança na lista, suba descalço, espere o resultado final e anote o que o app original dela mostrou (peso, gordura, água…).
      </p>
      <div className="row wrap">
        {!ativo ? <button className="btn pri" onClick={iniciar}><Icon name="bluetooth" /> Iniciar diagnóstico</button> : <button className="btn" onClick={parar}>Parar</button>}
        <button className="btn" onClick={copiar} disabled={!linhas.length}>Copiar registro</button>
        <button className="btn ghost" onClick={() => setLinhas([])} disabled={!linhas.length}>Limpar</button>
      </div>
      {linhas.length > 0 && <pre ref={preRef} className="diag-log" tabIndex={0} aria-label="Registro do diagnóstico">{linhas.join('\n')}</pre>}
    </details>
  )
}
