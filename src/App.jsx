import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Toaster, ThemeToggle, toast } from './components/ui.jsx'
import { useApp } from './store.jsx'
import { lerLink } from './lib/linkImport.js'
import { montarAgenda } from './lib/lembretes.js'
import { enviarProgresso, lerCfg, sincronizarAgenda } from './lib/push.js'
import { aguaDoDia, metaAgua } from './lib/metrics.js'
import { todayISO } from './lib/dates.js'
import { corridaDuplicada, registrarCorrida } from './lib/registro.js'
import Icon from './components/Icon.jsx'
import { AvisoAtualizacao } from './components/Atualizacao.jsx'
import CelebracaoHost from './components/Celebracao.jsx'
import Hoje from './pages/Hoje.jsx'
import Treino from './pages/Treino.jsx'
import Dieta from './pages/Dieta.jsx'
import Corrida from './pages/Corrida.jsx'
import Bio from './pages/Bio.jsx'
import Evolucao from './pages/Evolucao.jsx'
import Config from './pages/Config.jsx'

const TABS = [
  ['hoje', 'Hoje', 'hoje', Hoje],
  ['treino', 'Treino', 'treino', Treino],
  ['dieta', 'Dieta', 'dieta', Dieta],
  ['corrida', 'Corrida', 'corrida', Corrida],
  ['bio', 'Bio', 'bio', Bio],
  ['evolucao', 'Evolução', 'evolucao', Evolucao],
  ['config', 'Ajustes', 'config', Config],
]

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

const tabFromHash = () => {
  const h = location.hash.replace('#', '')
  return TABS.some((t) => t[0] === h) ? h : 'hoje'
}

// Importa corridas que chegam por link (?importar=corrida...), vindas do Atalho do iPhone.
let linkTratado = false
function useImportarLink() {
  const { update } = useApp()
  useEffect(() => {
    if (linkTratado) return
    const r = lerLink(location.search)
    if (!r) return
    linkTratado = true
    history.replaceState(null, '', location.pathname + location.hash)
    if (r.erro || !r.corridas.length) return toast(r.erro || 'Nenhuma corrida válida no link.')
    let novas = 0
    update((x) => {
      for (const c of r.corridas) {
        if (corridaDuplicada(x, c)) continue
        registrarCorrida(x, c)
        novas++
      }
    })
    toast(novas ? `${novas} ${novas === 1 ? 'corrida importada' : 'corridas importadas'} do Apple Saúde` : 'Essa corrida já estava no FOCO.')
  }, [update])
}

// Mantém o servidor de lembretes em dia: agenda (muda com plano/ajustes) e água de hoje (para parar de avisar na meta).
function useSincronizarLembretes() {
  const { s } = useApp()
  const agenda = JSON.stringify(montarAgenda(s))
  const hoje = todayISO()
  const ml = aguaDoDia(s, hoje)
  const meta = metaAgua(s)

  useEffect(() => {
    const t = setTimeout(async () => {
      const cfg = await lerCfg()
      if (cfg.ativo && cfg.url && cfg.token) sincronizarAgenda(cfg, JSON.parse(agenda)).catch(() => {})
    }, 2500)
    return () => clearTimeout(t)
  }, [agenda])

  useEffect(() => {
    const t = setTimeout(async () => {
      const cfg = await lerCfg()
      if (cfg.ativo && cfg.url && cfg.token) enviarProgresso(cfg, hoje, ml, meta).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
  }, [hoje, ml, meta])
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [params, setParams] = useState({})
  useImportarLink()
  useSincronizarLembretes()

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
        <a className="skip" href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById('conteudo')?.focus() }}>Ir para o conteúdo</a>
        <header className="top">
          <span className="logo" translate="no">FOCO</span>
          <span className="sp" />
          <ThemeToggle />
          <button className="iconbtn" onClick={() => go('config')} aria-label="Ajustes"><Icon name="config" /></button>
        </header>
        <nav className="nav" aria-label="Navegação">
          <div className="brand" translate="no">FOCO</div>
          {principais.map(([k, l, ic]) => (
            <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>
              <span className="ic"><Icon name={ic} /></span>
              <span>{l}</span>
            </button>
          ))}
          <div className="grow" />
          <ThemeToggle className="cfg" rotulo />
          <button className={'cfg ' + (tab === 'config' ? 'on' : '')} aria-current={tab === 'config' ? 'page' : undefined} onClick={() => go('config')}
          >
            <span className="ic"><Icon name="config" /></span>
            <span>Ajustes</span>
          </button>
        </nav>
        <main id="conteudo" tabIndex={-1}>
          <Page key={tab} />
        </main>
        <AvisoAtualizacao />
        <CelebracaoHost />
        <Toaster />
      </div>
    </NavCtx.Provider>
  )
}
