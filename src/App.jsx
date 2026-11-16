import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Toaster } from './components/ui.jsx'
import Hoje from './pages/Hoje.jsx'
import Treino from './pages/Treino.jsx'
import Dieta from './pages/Dieta.jsx'
import Corrida from './pages/Corrida.jsx'
import Evolucao from './pages/Evolucao.jsx'
import Config from './pages/Config.jsx'

const TABS = [
  ['hoje', 'Hoje', '🏠', Hoje],
  ['treino', 'Treino', '🏋️', Treino],
  ['dieta', 'Dieta', '🍽️', Dieta],
  ['corrida', 'Corrida', '🏃', Corrida],
  ['evolucao', 'Evolução', '📈', Evolucao],
  ['config', 'Ajustes', '⚙️', Config],
]

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

const tabFromHash = () => {
  const h = location.hash.replace('#', '')
  return TABS.some((t) => t[0] === h) ? h : 'hoje'
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [params, setParams] = useState({})

  const go = useCallback((t, p = {}) => {
    setParams(p)
    setTab(t)
    history.replaceState(null, '', '#' + t)
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const h = () => setTab(tabFromHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  const Page = TABS.find((t) => t[0] === tab)[3]
  const principais = TABS.filter((t) => t[0] !== 'config')

  return (
    <NavCtx.Provider value={{ tab, go, params }}>
      <div className="app">
        <header className="top">
          <span className="logo">FOCO</span>
          <span className="sp" />
          <button className="iconbtn" onClick={() => go('config')} aria-label="Ajustes">⚙️</button>
        </header>
        <nav className="nav" aria-label="Navegação">
          <div className="brand">FOCO</div>
          {principais.map(([k, l, ic]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>
              <span className="ic">{ic}</span>
              <span>{l}</span>
            </button>
          ))}
          <div className="grow" />
          <button className={'cfg ' + (tab === 'config' ? 'on' : '')} onClick={() => go('config')}
          >
            <span className="ic">⚙️</span>
            <span>Ajustes</span>
          </button>
        </nav>
        <main>
          <Page key={tab} />
        </main>
        <Toaster />
      </div>
    </NavCtx.Provider>
  )
}
