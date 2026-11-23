import { useMemo } from 'react'
import { useApp } from '../store.jsx'
import { mascoteDaAba } from '../lib/mascote.js'
import Mascote from './Mascote.jsx'

// O mascote em cada aba: pose, animação e fala mudam conforme o que você está vendo.
export default function MascoteAba({ aba }) {
  const { s, sync } = useApp()
  const m = useMemo(() => mascoteDaAba(aba, s, { sync }), [aba, s, sync?.sessao])
  return <Mascote {...m} altura={108} className="compacto" />
}
