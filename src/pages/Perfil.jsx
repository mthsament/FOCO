import { useEffect, useRef, useState } from 'react'
import { del } from 'idb-keyval'
import { estadoInicial, useApp } from '../store.jsx'
import { useNav } from '../App.jsx'
import MascoteAba from '../components/MascoteAba.jsx'
import Avatar from '../components/Avatar.jsx'
import Icon from '../components/Icon.jsx'
import Lembretes from '../components/Lembretes.jsx'
import ExcluirConta from '../components/ExcluirConta.jsx'
import { Seg, toast } from '../components/ui.jsx'
import CriarArroba from '../components/CriarArroba.jsx'
import { ativarAmigos, definirUsuario, fmtId, meuPerfil, privacidade } from '../lib/amigos.js'
import { reduzirFoto } from '../lib/foto.js'
import Ajustes from './perfil/Ajustes.jsx'

// Perfil: quem você é para os amigos, o que fica visível, os avisos e os ajustes do app.
const SECOES = [['perfil', 'Perfil'], ['privacidade', 'Privacidade'], ['notificacoes', 'Notificações'], ['ajustes', 'Ajustes']]

function Chave({ on, onChange, titulo, texto }) {
  return (
    <label className="chave">
      <span className="chave-t"><b>{titulo}</b><small>{texto}</small></span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}

export default function Perfil() {
  const { s, update, setState, sync } = useApp()
  const { params, entrar } = useNav()
  const sessao = sync.sessao
  const [secao, setSecao] = useState(SECOES.some((x) => x[0] === params?.secao) ? params.secao : 'perfil')
  const [eu, setEu] = useState(null) // @usuário e ID, vindos do servidor
  const [carregou, setCarregou] = useState(false)
  const [semSql, setSemSql] = useState(false) // faltam as tabelas / colunas do Supabase
  const [trocando, setTrocando] = useState(false) // formulário de trocar o @ aberto
  const [saindo, setSaindo] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const fotoRef = useRef(null)
  const priv = privacidade(s)

  useEffect(() => { if (SECOES.some((x) => x[0] === params?.secao)) setSecao(params.secao) }, [params])
  useEffect(() => {
    setEu(null)
    setCarregou(false)
    setSemSql(false)
    if (!sessao) return
    let vivo = true
    meuPerfil(sessao.id).then((p) => vivo && setEu(p)).catch((e) => vivo && setSemSql(!!e.semTabelas)).finally(() => vivo && setCarregou(true))
    return () => { vivo = false }
  }, [sessao?.id])
  const salvarArroba = async (d) => {
    await definirUsuario(sessao.id, d)
    ativarAmigos(sessao.id)
    if (d.apelido?.trim().length >= 2) update((x) => { x.perfil.apelido = d.apelido.trim().slice(0, 24) })
    setEu(await meuPerfil(sessao.id))
    setTrocando(false)
    toast('Seu @ está pronto!')
  }

  const nome = s.perfil.apelido || eu?.apelido || sessao?.meta?.apelido || sessao?.email || ''
  const trocarFoto = async (ev) => {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    try {
      const url = await reduzirFoto(f)
      update((x) => { x.perfil.foto = url })
      toast('Foto atualizada')
    } catch (e) {
      toast(e.message)
    }
  }
  const copiar = async (texto, ok) => {
    try { await navigator.clipboard.writeText(texto); toast(ok) } catch { toast(texto) }
  }
  const convidar = async () => {
    const texto = `Me adiciona no FOCO! Meu @ é @${eu.usuario} e meu ID é ${fmtId(eu.codigo)}.`
    if (navigator.share) { try { await navigator.share({ title: 'FOCO', text: texto, url: location.origin + location.pathname }); return } catch { /* cancelou */ } }
    copiar(`${texto} ${location.origin}${location.pathname}`, 'Convite copiado')
  }
  const sairDaConta = async () => {
    if (!confirm('Sair da conta? Seus dados continuam salvos neste aparelho e na nuvem. Para voltar, é só entrar de novo.')) return
    setSaindo(true)
    try { await sync.sair() } catch { toast('Não consegui sair. Tente de novo.') }
    setSaindo(false)
  }
  const excluirConta = async ({ limparAparelho }) => {
    await sync.excluirConta()
    if (limparAparelho) {
      await del('foco-state-v1')
      setState(estadoInicial())
    }
    toast('Conta excluída')
  }
  const setPriv = (k, v) => update((x) => { x.perfil.privacidade = { ...privacidade(x), [k]: v } })

  return (
    <>
      <h1>Perfil</h1>
      <p className="sub">Sua identidade, o que os amigos veem e os ajustes do app</p>
      <MascoteAba aba="perfil" />

      <section className="perfil-hero" aria-label="Seu perfil">
        <div className="ph-foto">
          <Avatar src={s.perfil.foto} nome={nome} seed={sessao?.id || nome} tam={92} />
          <button className="ph-trocar" onClick={() => fotoRef.current?.click()} aria-label="Trocar foto de perfil"><Icon name="plus" /></button>
          <input ref={fotoRef} type="file" accept="image/*" hidden onChange={trocarFoto} />
        </div>
        <div className="ph-info">
          <b className="ph-nome">{nome || 'Seu nome'}</b>
          {eu?.usuario ? <span className="ph-arroba" translate="no">@{eu.usuario}</span> : sessao && carregou && !semSql ? <button className="ph-criar" onClick={() => { setSecao('perfil'); setTimeout(() => document.getElementById('cartao-arroba')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }}>+ Criar meu @</button> : <span className="ph-arroba mut">{sessao ? (carregou ? 'sem @ ainda' : '…') : 'sem conta'}</span>}
          {eu?.codigo && <span className="ph-id" translate="no">ID {fmtId(eu.codigo)}</span>}
          {sessao && <span className="ph-email">{sessao.email}</span>}
        </div>
      </section>

      <div className="ev-abas"><Seg value={secao} onChange={setSecao} options={SECOES} /></div>

      {secao === 'perfil' && (
        <div className="grid c2 perfil-grid">
          <div className="card">
            <h2>Sobre você</h2>
            <label className="fld"><span className="f">Apelido</span>
              <input type="text" maxLength={24} autoComplete="nickname" value={s.perfil.apelido || ''} placeholder={eu?.apelido || 'Como te chamam'} onChange={(e) => update((x) => { x.perfil.apelido = e.target.value })} />
            </label>
            <label className="fld" style={{ marginTop: 10 }}><span className="f">Sobre <em className="mut">({(s.perfil.sobre || '').length}/160)</em></span>
              <textarea rows={3} maxLength={160} value={s.perfil.sobre || ''} placeholder="Ex.: Treino de manhã, corrida aos domingos. Bora?" onChange={(e) => update((x) => { x.perfil.sobre = e.target.value })} />
            </label>
            <div className="row wrap" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => fotoRef.current?.click()}><Icon name="upload" /> {s.perfil.foto ? 'Trocar foto' : 'Adicionar foto'}</button>
              {s.perfil.foto && <button className="btn ghost danger" onClick={() => update((x) => { delete x.perfil.foto })}>Remover foto</button>}
            </div>
          </div>

          <div id="cartao-arroba" className={'card' + (sessao && carregou && !eu?.usuario && !semSql ? ' cartao-arroba-pendente' : '')}>
            <h2><Icon name="amigos" /> Seu @ e ID de amigo</h2>
            {!sessao ? (
              <>
                <p className="mut small">Crie uma conta para ter um @ e um ID. Para te adicionar, seus amigos precisam dos dois.</p>
                <button className="btn pri" onClick={entrar}>Entrar ou criar conta</button>
              </>
            ) : eu?.usuario ? (
              trocando ? (
                <CriarArroba atual={eu.usuario} pedirApelido={false} rotulo="Salvar novo @" onSalvar={salvarArroba} onCancelar={() => setTrocando(false)} texto="Seu ID não muda. Quem já é seu amigo continua amigo; quem for te adicionar passa a usar o @ novo." />
              ) : (
                <>
                  <p className="mut small" style={{ marginTop: 0 }}>Para te adicionar, seu amigo precisa do <b>@</b> e do <b>ID</b> juntos. Só o @ não basta.</p>
                  <div className="id-par">
                    <div><small>@usuário</small><b translate="no">@{eu.usuario}</b></div>
                    <div><small>ID</small><b translate="no">{fmtId(eu.codigo)}</b></div>
                  </div>
                  <div className="row wrap" style={{ marginTop: 12 }}>
                    <button className="btn" onClick={() => copiar(`@${eu.usuario} · ID ${fmtId(eu.codigo)}`, 'Copiado')}><Icon name="clip" /> Copiar</button>
                    <button className="btn pri" onClick={convidar}><Icon name="upload" /> Convidar amigo</button>
                    <button className="btn ghost" onClick={() => setTrocando(true)}>Trocar @</button>
                  </div>
                </>
              )
            ) : semSql ? (
              <div className="note warn">Faltam as tabelas de perfil e amigos no Supabase. Rode o SQL <b>supabase/amigos.sql</b> (SQL Editor → New query → Run) e abra esta tela de novo para criar seu @.</div>
            ) : carregou ? (
              <CriarArroba apelido0={s.perfil.apelido || eu?.apelido || sessao?.meta?.apelido || ''} onSalvar={salvarArroba} titulo={null} texto="Escolha o seu @, como no X. Seus amigos vão te achar por ele e pelo ID de 8 números que o app cria para você." />
            ) : (
              <div className="gc-vazio">Carregando…</div>
            )}
          </div>
        </div>
      )}

      {secao === 'perfil' && sessao && (
        <div className="card conta-card">
          <div className="conta-info">
            <h2><Icon name="cadeado" /> Sua conta</h2>
            <p className="mut small" style={{ margin: 0 }}>Conectado como <b>{sessao.email}</b>. Ao sair, seus dados continuam salvos na nuvem e neste aparelho, e você volta para a tela de entrada.</p>
          </div>
          <div className="conta-botoes">
            <button className="btn danger" onClick={sairDaConta} disabled={saindo}>{saindo ? 'Saindo…' : 'Sair da conta'}</button>
            <button className="btn ghost danger" onClick={() => setExcluindo(true)}>Excluir conta</button>
          </div>
        </div>
      )}
      {excluindo && <ExcluirConta email={sessao.email} onCancelar={() => setExcluindo(false)} onExcluir={excluirConta} />}

      {secao === 'privacidade' && (
        <div className="card">
          <h2><Icon name="cadeado" /> Privacidade</h2>
          <p className="mut small" style={{ marginTop: 0 }}>Seus amigos nunca veem peso, medidas, cargas, corridas nem o cardápio. Aqui você escolhe o resto.</p>
          <Chave on={priv.pedidos} onChange={(v) => setPriv('pedidos', v)} titulo="Aceitar pedidos de amizade" texto="Desligue para pausar: ninguém consegue te encontrar pelo @ e ID." />
          <Chave on={priv.progresso} onChange={(v) => setPriv('progresso', v)} titulo="Compartilhar progresso do dia" texto="Mostra aos amigos se você cumpriu treino, dieta e água. Sem isso, as ofensivas em grupo não contam seus dias." />
          <Chave on={priv.foto} onChange={(v) => setPriv('foto', v)} titulo="Mostrar foto e “sobre”" texto="Amigos veem sua foto e o texto do perfil. Desligado, eles veem só a inicial do seu apelido." />
          {!sessao && <div className="note" style={{ marginTop: 12 }}>Estas opções passam a valer quando você entra numa conta.</div>}
        </div>
      )}

      {secao === 'notificacoes' && (
        <>
          <p className="mut small" style={{ margin: '0 0 12px' }}>Lembretes de treino, corrida, refeições e água. Eles chegam como notificação do celular quando o aparelho permitir.</p>
          <Lembretes />
        </>
      )}

      {secao === 'ajustes' && <Ajustes />}
    </>
  )
}
