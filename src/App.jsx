import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Toaster, ThemeToggle, toast } from './components/ui.jsx'
import { useApp } from './store.jsx'
import { lerLink } from './lib/linkImport.js'
import { montarAgenda } from './lib/lembretes.js'
import { enviarProgresso, lerCfg, sincronizarAgenda } from './lib/push.js'
import { aguaDoDia, metaAgua } from './lib/metrics.js'
import { todayISO } from './lib/dates.js'
import { corridaDuplicada, registrarCorrida } from './lib/registro.js'
import { usePerfilPublico, usePublicarCheckins } from './lib/amigos.js'
import Avatar from './components/Avatar.jsx'
import TelaEntrada from './components/TelaEntrada.jsx'
import { usePendenciasAmigos } from './lib/amigos.js'
import TelaNovaSenha from './components/TelaNovaSenha.jsx'
import Icon from './components/Icon.jsx'
import { AvisoAtualizacao } from './components/Atualizacao.jsx'
import CelebracaoHost from './components/Celebracao.jsx'
import ConquistasHost from './components/ConquistasHost.jsx'
import Hoje from './pages/Hoje.jsx'
import Plano from './pages/Plano.jsx'
import Evolucao from './pages/Evolucao.jsx'
import Amigos from './pages/Amigos.jsx'
import Conquistas from './pages/Conquistas.jsx'
import Perfil from './pages/Perfil.jsx'

const TABS = [
  ['hoje', 'Hoje', 'hoje', Hoje],
  ['plano', 'Plano', 'lista', Plano],
  ['evolucao', 'Evolução', 'evolucao', Evolucao],
  ['amigos', 'Amigos', 'amigos', Amigos],
  ['conquistas', 'Conquistas', 'trofeu', Conquistas],
  ['perfil', 'Perfil', 'config', Perfil],
]

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

// Abas que foram juntadas em outras: treino, dieta e corrida viraram seções do Plano; a bio foi para a Evolução; os ajustes foram para o Perfil
const FUNDIDAS = { treino: ['plano', 'treino'], dieta: ['plano', 'dieta'], corrida: ['plano', 'corrida'], bio: ['evolucao', 'medir'], config: ['perfil', 'ajustes'] }
const tabFromHash = () => {
  const h = location.hash.replace('#', '')
  if (FUNDIDAS[h]) return FUNDIDAS[h][0]
  return TABS.some((t) => t[0] === h) ? h : 'hoje'
}
const paramsFromHash = () => {
  const f = FUNDIDAS[location.hash.replace('#', '')]
  return f ? { secao: f[1] } : {}
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

// Quem já criou perfil em Amigos publica, sozinho, se cumpriu treino, dieta e água
function usePublicarCheckinsDoApp() {
  const { s, sync, update } = useApp()
  usePerfilPublico(s, sync?.sessao, update)
  usePublicarCheckins(s, sync?.sessao)
}

// "Continuar sem conta": lembra a escolha neste aparelho até a pessoa entrar ou sair de uma conta
const CHAVE_SEM_CONTA = 'foco-sem-conta'
const lerSemConta = () => { try { return localStorage.getItem(CHAVE_SEM_CONTA) === '1' } catch { return false } }
const gravarSemConta = (v) => { try { v ? localStorage.setItem(CHAVE_SEM_CONTA, '1') : localStorage.removeItem(CHAVE_SEM_CONTA) } catch { /* sem armazenamento */ } }

export default function App() {
  const { s, sync } = useApp()
  const [semConta, setSemConta] = useState(lerSemConta)
  const [tab, setTab] = useState(tabFromHash)
  const [params, setParams] = useState(paramsFromHash)
  useImportarLink()
  useSincronizarLembretes()
  usePublicarCheckinsDoApp()

  const go = useCallback((t, p = {}) => {
    const f = FUNDIDAS[t] // go('treino'), go('dieta'), go('corrida') e go('bio') continuam valendo
    if (f) { t = f[0]; p = { secao: f[1], ...p } }
    setParams(p)
    setTab(t)
    history.replaceState(null, '', '#' + t)
    window.scrollTo(0, 0)
  }, [])

  // entrou numa conta: some a escolha de "sem conta"; sair mostra a tela de entrada de novo
  useEffect(() => {
    if (sync.sessao && semConta) { gravarSemConta(false); setSemConta(false) }
  }, [sync.sessao, semConta])
  const pular = useCallback(() => { gravarSemConta(true); setSemConta(true) }, [])
  const entrar = useCallback(() => { gravarSemConta(false); setSemConta(false) }, [])

  useEffect(() => {
    const h = () => { setTab(tabFromHash()); setParams(paramsFromHash()) }
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  const pend = usePendenciasAmigos(sync.sessao)
  const Page = TABS.find((t) => t[0] === tab)[3]
  const principais = TABS.filter((t) => t[0] !== 'perfil')
  const nomePerfil = s.perfil.apelido || sync.sessao?.meta?.apelido || sync.sessao?.email || ''

  // ainda lendo se há alguém logado: não pisca a tela de entrada
  if (!sync.sessaoLida) return <div className="app" />
  if (sync.sessao && sync.recuperando) return <><TelaNovaSenha /><Toaster /></>
  if (!sync.sessao && !semConta) return <><TelaEntrada onPular={pular} /><Toaster /></>

  return (
    <NavCtx.Provider value={{ tab, go, params, entrar }}>
      <div className="app">
        <a className="skip" href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById('conteudo')?.focus() }}>Ir para o conteúdo</a>
        <header className="top">
          <span className="logo" translate="no">FOCO</span>
          <span className="sp" />
          <ThemeToggle />
          <button className="iconbtn perfilbtn" onClick={() => go('perfil')} aria-label="Perfil e ajustes">
            <Avatar src={s.perfil.foto} nome={nomePerfil} seed={sync.sessao?.id || nomePerfil} tam={32} />
          </button>
        </header>
        <nav className="nav" aria-label="Navegação">
          <div className="brand" translate="no">FOCO</div>
          {principais.map(([k, l, ic]) => (
            <button key={k} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>
              <span className="ic"><Icon name={ic} />{k === 'amigos' && pend.total > 0 && <b className="bolinha" role="status" aria-label={`${pend.total} ${pend.total === 1 ? 'novidade' : 'novidades'} em Amigos`}>{pend.total > 9 ? '9+' : pend.total}</b>}</span>
              <span>{l}</span>
            </button>
          ))}
          <div className="grow" />
          <ThemeToggle className="cfg" rotulo />
          <button className={'cfg ' + (tab === 'perfil' ? 'on' : '')} aria-current={tab === 'perfil' ? 'page' : undefined} onClick={() => go('perfil')}>
            <span className="ic"><Avatar src={s.perfil.foto} nome={nomePerfil} seed={sync.sessao?.id || nomePerfil} tam={28} /></span>
            <span>Perfil</span>
          </button>
        </nav>
        <main id="conteudo" tabIndex={-1}>
          <Page key={tab} />
        </main>
        <AvisoAtualizacao />
        <CelebracaoHost />
        <ConquistasHost />
        <Toaster />
      </div>
    </NavCtx.Provider>
  )
}
