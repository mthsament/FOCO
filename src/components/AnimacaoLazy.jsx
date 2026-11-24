import { lazy, Suspense } from 'react'

// A biblioteca de movimentos é pesada (CSS das animações): só baixa quando alguém pede para ver o canguru.
const Animacao = lazy(() => import('./AnimacaoExercicio.jsx'))

export default function AnimacaoLazy(props) {
  return (
    <Suspense fallback={<div className={`ca ${props.className || ''}`}><div className="ca-stage ca-carregando" aria-busy="true" /></div>}>
      <Animacao {...props} />
    </Suspense>
  )
}
