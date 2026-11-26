import { useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import { useNav } from '../App.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import Chama from '../components/Chama.jsx'
import Icon from '../components/Icon.jsx'
import AvatarBase from '../components/Avatar.jsx'
import CriarArroba from '../components/CriarArroba.jsx'
import { Empty, Seg, toast } from '../components/ui.jsx'
import { todayISO } from '../lib/dates.js'
import {
  NOME_TIPO, TIPOS, aceitarConvite, aceitarPedido, adicionarAmigo, ativarAmigos, calcularOfensiva, criarOfensiva,
  definirUsuario, encerrarOfensiva, fmtId, limpaUsuario, removerAmizade, sairDaOfensiva, useAmigos,
} from '../lib/amigos.js'

function Avatar({ perfil, estado, tam = 40, eu = false }) {
  const { s } = useApp()
  const foto = eu ? s.perfil.foto || perfil?.avatar : perfil?.avatar
  return <AvatarBase src={foto} nome={perfil?.apelido} seed={perfil?.user_id} tam={tam} estado={estado} />
}

const ROT_ESTADO = { ok: 'cumpriu', pend: 'falta hoje', miss: 'falhou', rest: 'descanso' }

export default function Amigos() {
  const { sync, s } = useApp()
  const { go, entrar } = useNav()
  const sessao = sync.sessao
  const A = useAmigos(sessao)
  const [secao, setSecao] = useState('ofensivas')
  const [ocupado, setOcupado] = useState(false)

  const tenta = async (fn, msg) => {
    if (ocupado) return
    setOcupado(true)
    try {
      const r = await fn()
      if (msg) toast(typeof msg === 'function' ? msg(r) : msg)
      await A.recarregar()
      return r
    } catch (e) {
      toast(e.message || 'Não deu certo')
    } finally {
      setOcupado(false)
    }
  }

  const cabeca = (
    <>
      <h1>Amigos</h1>
      <p className="sub">Treine, coma bem e beba água junto: a ofensiva só continua se todo mundo cumprir</p>
      <MascoteAba aba="amigos" />
    </>
  )

  if (!sessao) {
    return (
      <>
        {cabeca}
        <Empty icon="amigos" title="Entre na sua conta para usar amigos">
          <p>Amigos e ofensivas em grupo precisam de uma conta, para os seus dados chegarem aos outros aparelhos. Crie a sua com um @ e um ID só seus.</p>
          <button className="btn pri" onClick={entrar}>Entrar ou criar conta</button>
        </Empty>
      </>
    )
  }
  if (A.semTabelas) return <>{cabeca}<SemTabelas /></>
  if (!A.dados) {
    return (
      <>
        {cabeca}
        {A.erro ? <div className="note warn">{A.erro} <button className="btn sm" onClick={A.recarregar}>Tentar de novo</button></div> : <div className="card"><div className="gc-vazio">Carregando seus amigos…</div></div>}
      </>
    )
  }
  const D = A.dados
  if (!D.eu?.usuario) {
    return (
      <>
        {cabeca}
        <div className="card"><h2>Crie seu @ para usar amigos</h2><CriarArroba apelido0={s.perfil.apelido || D.eu?.apelido || sessao.meta?.apelido || ''} texto="Como no X: você escolhe um @ único. Seus amigos te acham pelo @ e por um ID de 8 números que o app cria para você." onSalvar={async (d) => { await definirUsuario(sessao.id, d); ativarAmigos(sessao.id); await A.recarregar(); toast('Seu @ está pronto! Agora convide um amigo.') }} /></div>
      </>
    )
  }
  ativarAmigos(sessao.id)

  return (
    <>
      {cabeca}
      <MeuCodigo eu={D.eu} irPerfil={() => go('perfil')} />
      <div className="ev-abas"><Seg value={secao} onChange={setSecao} options={[['ofensivas', 'Ofensivas juntos'], ['amigos', 'Amigos']]} /></div>
      {A.erro && <div className="note warn" style={{ marginBottom: 12 }}>{A.erro}</div>}
      {secao === 'ofensivas' && <Ofensivas D={D} uid={sessao.id} tenta={tenta} ocupado={ocupado} irAmigos={() => setSecao('amigos')} />}
      {secao === 'amigos' && <Lista D={D} uid={sessao.id} tenta={tenta} ocupado={ocupado} />}
    </>
  )
}

function SemTabelas() {
  return (
    <div className="card">
      <h2><Icon name="warn" /> Falta uma configuração única</h2>
      <p>As tabelas de amigos ainda não existem no seu Supabase. Para ativar:</p>
      <ol className="clean small" style={{ paddingLeft: 18 }}>
        <li>Abra o projeto no Supabase e vá em <b>SQL Editor</b> → <b>New query</b>.</li>
        <li>Cole o conteúdo do arquivo <b>supabase/amigos.sql</b> deste projeto.</li>
        <li>Clique em <b>Run</b> e volte aqui.</li>
      </ol>
      <p className="mut small">O SQL cria só tabelas de amigos, com regras de segurança por linha. Seus dados atuais não são tocados.</p>
    </div>
  )
}

function MeuCodigo({ eu, irPerfil }) {
  const texto = `@${eu.usuario || ''} · ID ${fmtId(eu.codigo)}`
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); toast('Copiado') } catch { toast(texto) }
  }
  const compartilhar = async () => {
    const msg = `Me adiciona no FOCO! Meu @ é @${eu.usuario} e meu ID é ${fmtId(eu.codigo)}.`
    if (navigator.share) { try { await navigator.share({ title: 'FOCO', text: msg, url: location.origin + location.pathname }); return } catch { /* cancelou */ } }
    try { await navigator.clipboard.writeText(msg + ' ' + location.origin + location.pathname); toast('Convite copiado') } catch { toast(msg) }
  }
  return (
    <section className="amg-hero" aria-label="Seu @ e ID de amigo">
      <div className="ah-esq">
        <Avatar perfil={eu} tam={56} eu />
        <div className="ah-nome">
          <b>{eu.apelido}</b>
          {eu.usuario && <span className="ah-arroba" translate="no">@{eu.usuario}</span>}
          <button className="ah-edit" onClick={irPerfil}>editar perfil</button>
        </div>
      </div>
      <div className="ah-cod">
        <small>Seu ID de amigo</small>
        <b translate="no">{fmtId(eu.codigo)}</b>
      </div>
      <div className="ah-acoes">
        <button className="btn sm" onClick={copiar}><Icon name="clip" /> Copiar</button>
        <button className="btn sm pri" onClick={compartilhar}><Icon name="upload" /> Convidar</button>
      </div>
    </section>
  )
}

// ---------- Ofensivas juntos ----------
function Ofensivas({ D, uid, tenta, ocupado, irAmigos }) {
  const [novo, setNovo] = useState(false)
  const hoje = todayISO()
  const amigos = useMemo(() => amigosDe(D, uid), [D, uid])

  const meus = D.membros.filter((m) => m.user_id === uid)
  const convites = meus.filter((m) => m.status === 'convidado').map((m) => D.ofensivas.find((o) => o.id === m.ofensiva_id)).filter(Boolean)
  const ativas = meus.filter((m) => m.status === 'aceito').map((m) => D.ofensivas.find((o) => o.id === m.ofensiva_id)).filter(Boolean)

  return (
    <>
      {convites.length > 0 && (
        <div className="card amg-convites">
          <h2>Convites de ofensiva</h2>
          {convites.map((o) => (
            <div className="amg-linha" key={o.id}>
              <Avatar perfil={D.perfis[o.criada_por]} />
              <div className="sp">
                <b>{o.nome}</b>
                <div className="mut small">{D.perfis[o.criada_por]?.apelido || 'Alguém'} te chamou · {NOME_TIPO[o.tipo]}</div>
              </div>
              <button className="btn sm pri" disabled={ocupado} onClick={() => tenta(() => aceitarConvite(o.id, uid), 'Ofensiva aceita!')}>Entrar</button>
              <button className="btn sm ghost" disabled={ocupado} onClick={() => tenta(() => sairDaOfensiva(o.id, uid))}>Recusar</button>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ marginBottom: 12 }}>
        <h2 className="sp" style={{ margin: 0 }}>Suas ofensivas</h2>
        <button className="btn sm pri" onClick={() => setNovo((v) => !v)}>{novo ? 'Fechar' : '+ Nova ofensiva'}</button>
      </div>

      {novo && (
        <NovaOfensiva
          amigos={amigos}
          ocupado={ocupado}
          irAmigos={irAmigos}
          onCriar={(dados, ids) => tenta(async () => { await criarOfensiva(uid, dados, ids); setNovo(false) }, 'Ofensiva criada! Os convites foram enviados.')}
        />
      )}

      {ativas.length === 0 && !novo && (
        <div className="card empty">
          <div className="em" aria-hidden="true"><Chama on={false} /></div>
          <h2>Nenhuma ofensiva em grupo ainda</h2>
          <p>Chame um amigo e comecem juntos. Cada dia em que todos cumprirem soma na sequência; se um falhar, a ofensiva de todos recomeça.</p>
          <button className="btn pri" onClick={() => (amigos.length ? setNovo(true) : irAmigos())}>{amigos.length ? 'Criar a primeira ofensiva' : 'Adicionar um amigo primeiro'}</button>
        </div>
      )}

      <div className="grid c2">
        {ativas.map((o) => {
          const uids = D.membros.filter((m) => m.ofensiva_id === o.id && m.status === 'aceito').map((m) => m.user_id)
          const pendentes = D.membros.filter((m) => m.ofensiva_id === o.id && m.status === 'convidado').map((m) => m.user_id)
          const r = calcularOfensiva(o, uids, D.checkins, hoje)
          const faltam = r.falta.map((u) => (u === uid ? 'você' : D.perfis[u]?.apelido || 'amigo'))
          const souDono = o.criada_por === uid
          return (
            <article className={'gr-card' + (r.hojeOk ? ' feita' : '')} key={o.id}>
              <header className="gr-topo">
                <div className="sp">
                  <b className="gr-nome">{o.nome}</b>
                  <span className="chip acc">{NOME_TIPO[o.tipo]}</span>
                </div>
                <button className="btn sm ghost danger" disabled={ocupado} onClick={() => {
                  if (!confirm(souDono ? `Encerrar “${o.nome}” para todos?` : `Sair de “${o.nome}”?`)) return
                  tenta(() => (souDono ? encerrarOfensiva(o.id) : sairDaOfensiva(o.id, uid)), souDono ? 'Ofensiva encerrada' : 'Você saiu da ofensiva')
                }}>{souDono ? 'Encerrar' : 'Sair'}</button>
              </header>
              <div className="gr-centro">
                <Chama on={r.atual > 0} />
                <b key={r.atual} className="gr-n">{r.atual}</b>
                <span className="gr-dias">{r.atual === 1 ? 'dia' : 'dias'} juntos<small>recorde {r.melhor}</small></span>
              </div>
              <div className="gr-membros">
                {uids.map((u) => (
                  <div className="gr-m" key={u}>
                    <Avatar perfil={D.perfis[u]} estado={r.hoje[u]} eu={u === uid} />
                    <span>{u === uid ? 'Você' : D.perfis[u]?.apelido || 'Amigo'}</span>
                    <small className={'st-' + r.hoje[u]}>{ROT_ESTADO[r.hoje[u]] || ''}</small>
                  </div>
                ))}
                {pendentes.map((u) => (
                  <div className="gr-m espera" key={u}>
                    <Avatar perfil={D.perfis[u]} />
                    <span>{D.perfis[u]?.apelido || 'Amigo'}</span>
                    <small>convidado</small>
                  </div>
                ))}
              </div>
              <footer className={'gr-rodape' + (r.hojeOk ? ' ok' : '')}>
                {r.hojeOk ? <><Icon name="check" /> Todo mundo cumpriu hoje. A ofensiva está salva!</> : faltam.length ? <>Falta hoje: <b>{faltam.join(', ')}</b></> : <>Dia de descanso para todos.</>}
              </footer>
            </article>
          )
        })}
      </div>
    </>
  )
}

function NovaOfensiva({ amigos, onCriar, ocupado, irAmigos }) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('geral')
  const [sel, setSel] = useState([])
  const alterna = (id) => setSel((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
  if (!amigos.length) {
    return (
      <div className="card">
        <p>Você ainda não tem amigos adicionados. Adicione alguém pelo código e volte para criar a ofensiva.</p>
        <button className="btn pri" onClick={irAmigos}>Ir para Amigos</button>
      </div>
    )
  }
  return (
    <div className="card nova-gr">
      <label className="fld"><span className="f">Nome da ofensiva</span>
        <input type="text" maxLength={40} autoComplete="off" placeholder="Ex.: Squad da academia" value={nome} onChange={(e) => setNome(e.target.value)} />
      </label>
      <div>
        <span className="f">O que conta como dia cumprido</span>
        <Seg value={tipo} onChange={setTipo} options={TIPOS.map(([k, n]) => [k, n])} />
        <p className="mut small" style={{ margin: '6px 0 0' }}>{TIPOS.find((t) => t[0] === tipo)[2]}. Dias de descanso não quebram a sequência.</p>
      </div>
      <div>
        <span className="f">Quem vai junto</span>
        <div className="amg-escolha">
          {amigos.map((a) => (
            <button key={a.user_id} type="button" className={'amg-pick' + (sel.includes(a.user_id) ? ' on' : '')} aria-pressed={sel.includes(a.user_id)} onClick={() => alterna(a.user_id)}>
              <Avatar perfil={a} tam={30} /> {a.apelido}
            </button>
          ))}
        </div>
      </div>
      <button className="btn pri" disabled={ocupado || nome.trim().length < 2 || !sel.length} onClick={() => onCriar({ nome, tipo }, sel)}>Começar ofensiva</button>
    </div>
  )
}

// ---------- Amigos ----------
function amigosDe(D, uid) {
  return D.amizades
    .filter((a) => a.status === 'aceita')
    .map((a) => D.perfis[a.de === uid ? a.para : a.de])
    .filter(Boolean)
    .sort((a, b) => a.apelido.localeCompare(b.apelido, 'pt-BR'))
}

const BOLAS = [['treino', 'Treino', 'treino'], ['dieta', 'Dieta', 'dieta'], ['agua', 'Água', 'gota']]
function Hoje({ ch }) {
  const v = (k) => (k === 'agua' ? (ch?.agua ? 'ok' : 'pend') : ch?.[k] || 'pend')
  return (
    <span className="amg-bolas" aria-label="Hoje">
      {BOLAS.map(([k, n, ic]) => (
        <span key={k} className={'bola ' + v(k)} title={`${n}: ${ROT_ESTADO[v(k)] || ''}`}><Icon name={ic} /></span>
      ))}
    </span>
  )
}

function Lista({ D, uid, tenta, ocupado }) {
  const [arroba, setArroba] = useState('')
  const [idAmigo, setIdAmigo] = useState('')
  const hoje = todayISO()
  const recebidos = D.amizades.filter((a) => a.status === 'pendente' && a.para === uid)
  const enviados = D.amizades.filter((a) => a.status === 'pendente' && a.de === uid)
  const amigos = D.amizades.filter((a) => a.status === 'aceita')

  const adicionar = () =>
    tenta(async () => {
      const r = await adicionarAmigo(uid, arroba, idAmigo, D)
      setArroba('')
      setIdAmigo('')
      return r
    }, (r) => (r.aceito ? `${r.apelido} agora é seu amigo!` : `Pedido enviado para ${r.apelido}`))

  return (
    <>
      <div className="card">
        <h2>Adicionar amigo</h2>
        <p className="mut small" style={{ margin: '0 0 10px' }}>Peça ao seu amigo o <b>@</b> e o <b>ID</b> dele (estão no topo desta tela, na dele). Precisa dos dois.</p>
        <div className="amg-add">
          <span className="ent-arroba"><i>@</i><input type="text" autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={20} placeholder="usuario" value={arroba.replace(/^@+/, '')} onChange={(e) => setArroba(limpaUsuario(e.target.value))} aria-label="@ do amigo" /></span>
          <input type="text" inputMode="numeric" autoComplete="off" maxLength={9} placeholder="ID: 4821 7305" value={idAmigo} onChange={(e) => setIdAmigo(e.target.value.replace(/[^\d ]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && adicionar()} aria-label="ID do amigo" />
          <button className="btn pri" disabled={ocupado || !limpaUsuario(arroba) || idAmigo.replace(/\D/g, '').length !== 8} onClick={adicionar}>Adicionar</button>
        </div>
      </div>

      {recebidos.length > 0 && (
        <div className="card amg-convites">
          <h2>Pedidos de amizade</h2>
          {recebidos.map((a) => (
            <div className="amg-linha" key={a.id}>
              <Avatar perfil={D.perfis[a.de]} />
              <b className="sp">{D.perfis[a.de]?.apelido || 'Alguém'}</b>
              <button className="btn sm pri" disabled={ocupado} onClick={() => tenta(() => aceitarPedido(a.id), 'Amizade aceita!')}>Aceitar</button>
              <button className="btn sm ghost" disabled={ocupado} onClick={() => tenta(() => removerAmizade(a.id))}>Recusar</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="row"><h2 className="sp">Seus amigos</h2><span className="chip">{amigos.length}</span></div>
        {amigos.length === 0 && <div className="gc-vazio">Ninguém por aqui ainda. Adicione o primeiro amigo pelo código.</div>}
        {amigos.map((a) => {
          const outro = a.de === uid ? a.para : a.de
          const p = D.perfis[outro]
          return (
            <div className="amg-linha" key={a.id}>
              <Avatar perfil={p} />
              <div className="sp"><b>{p?.apelido || 'Amigo'}</b><div className="mut small">{p?.usuario ? `@${p.usuario} · hoje` : 'hoje'}</div></div>
              <Hoje ch={D.checkins[outro]?.[hoje]} />
              <button className="btn sm ghost danger" disabled={ocupado} aria-label={`Remover ${p?.apelido}`} onClick={() => confirm(`Remover ${p?.apelido} dos amigos?`) && tenta(() => removerAmizade(a.id), 'Amigo removido')}><Icon name="trash" /></button>
            </div>
          )
        })}
        {enviados.length > 0 && (
          <div className="amg-env">
            <div className="mut small" style={{ margin: '12px 0 4px' }}>Aguardando resposta</div>
            {enviados.map((a) => (
              <div className="amg-linha" key={a.id}>
                <Avatar perfil={D.perfis[a.para] || { user_id: a.para, apelido: '?' }} />
                <span className="sp">{D.perfis[a.para]?.apelido || 'Convite enviado'}</span>
                <button className="btn sm ghost" disabled={ocupado} onClick={() => tenta(() => removerAmizade(a.id), 'Pedido cancelado')}>Cancelar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
