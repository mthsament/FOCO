import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { erroSenha, limpaFalhas, registraFalha, segundosBloqueado } from './senha.js'

// Sincronização entre aparelhos: um único documento por usuário (tabela `estados`).
// Cada aparelho guarda em meta.editadoEm quando mexeu e em meta.sincEm a última versão sincronizada.
//   - só a nuvem mudou  -> baixa
//   - só este aparelho  -> envia
//   - os dois mudaram   -> pergunta qual manter (nunca sobrescreve sem avisar)

const agora = () => new Date().toISOString()

const vazio = (s) =>
  !s.plan?.treinos && !s.plan?.dieta && !s.plan?.corrida &&
  !s.logs?.pesagens?.length && !s.logs?.corridas?.length &&
  !Object.keys(s.logs?.dieta || {}).length && !Object.keys(s.logs?.treinos || {}).length

function traduzir(e) {
  const m = e?.message || String(e)
  if (e?.code === 'PGRST205' || e?.code === '42P01' || /does not exist|schema cache/i.test(m)) return 'A tabela "estados" não existe no Supabase. Rode o SQL de criação.'
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail (veja a caixa de entrada e o spam) e entre de novo.'
  if (/already registered|already been registered/i.test(m)) return 'Esse e-mail já tem conta. Use "Entrar".'
  if (/same.*password|different from the old/i.test(m)) return 'A senha nova precisa ser diferente da atual.'
  if (/password.*(weak|pwned|easy to guess|known)/i.test(m)) return 'Essa senha é fraca ou já vazou em algum site. Escolha outra.'
  if (/password should|at least \d+ char|should contain at least one character/i.test(m)) return 'A senha não atende à política: 8+ caracteres com maiúscula, minúscula, número e caractere especial.'
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Espere um minuto e tente de novo.'
  if (/valid email|invalid.*email/i.test(m)) return 'Esse e-mail não parece válido.'
  if (/fetch|network|Failed/i.test(m)) return 'Sem conexão. As alterações ficam salvas e sobem quando voltar.'
  return m
}

export function useSincronia(state, setRaw, normalizar) {
  const [sessao, setSessao] = useState(null)
  const [sessaoLida, setSessaoLida] = useState(false) // já sabemos se há alguém logado?
  const [info, setInfo] = useState({ status: 'off', msg: '', ultima: null })
  const [conf, setConf] = useState(null)
  const [pronto, setPronto] = useState(false)
  const [recuperando, setRecuperando] = useState(false) // abriu o link de "esqueci minha senha": falta criar a senha nova
  const ref = useRef(state)
  ref.current = state
  const carregado = !!state
  const ocupado = useRef(false)

  const rodar = useCallback(async (fn) => {
    if (ocupado.current) return
    ocupado.current = true
    try {
      await fn()
    } catch (e) {
      setInfo((i) => ({ ...i, status: 'erro', msg: traduzir(e) }))
    } finally {
      ocupado.current = false
    }
  }, [])

  const enviar = useCallback(async (uid) => {
    setInfo((i) => ({ ...i, status: 'enviando', msg: '' }))
    const s = ref.current
    const ed = s.meta?.editadoEm || agora()
    const dados = { ...s, meta: { ...s.meta, editadoEm: ed } }
    const { error } = await supabase.from('estados').upsert({ user_id: uid, dados, atualizado_em: ed })
    if (error) throw error
    // sincEm = a versão que subiu (se você mexeu durante o envio, continua pendente)
    setRaw((p) => ({ ...p, meta: { ...p.meta, editadoEm: p.meta?.editadoEm || ed, sincEm: ed } }))
    setInfo({ status: 'ok', msg: '', ultima: agora() })
  }, [setRaw])

  const aplicarNuvem = useCallback((row) => {
    const ed = row.dados?.meta?.editadoEm || row.atualizado_em
    setRaw(() => normalizar(row.dados, ed))
    setInfo({ status: 'ok', msg: '', ultima: agora() })
  }, [setRaw, normalizar])

  // Os dados deste aparelho pertencem a UMA conta (meta.donoId). Se outra conta entra aqui, ela começa limpa
  // e baixa os próprios dados da nuvem: nunca herda nem envia os dados de quem usou antes.
  const donoDosDados = useCallback((uid) => {
    let local = ref.current
    const dono = local.meta?.donoId
    if (dono === uid) return local
    local = dono ? normalizar({ meta: { donoId: uid } }) : { ...local, meta: { ...local.meta, donoId: uid } }
    ref.current = local
    setRaw(() => local)
    return local
  }, [setRaw, normalizar])

  const puxar = useCallback((uid) => rodar(async () => {
    setInfo((i) => ({ ...i, status: 'baixando', msg: '' }))
    const { data: row, error } = await supabase.from('estados').select('dados, atualizado_em').maybeSingle()
    if (error) throw error
    const local = donoDosDados(uid)
    if (!row) {
      if (!vazio(local)) await enviar(uid)
      else setInfo({ status: 'ok', msg: '', ultima: agora() })
      return
    }
    const sinc = local.meta?.sincEm
    const edL = local.meta?.editadoEm || ''
    const edR = row.dados?.meta?.editadoEm || row.atualizado_em
    if (!sinc) {
      // primeira vez neste aparelho
      if (vazio(local)) return aplicarNuvem(row)
      setConf(row)
      setInfo({ status: 'conflito', msg: '', ultima: null })
      return
    }
    const remotoNovo = edR > sinc
    const localSujo = edL > sinc
    if (remotoNovo && localSujo) {
      setConf(row)
      setInfo({ status: 'conflito', msg: '', ultima: null })
    } else if (remotoNovo) aplicarNuvem(row)
    else if (localSujo) await enviar(uid)
    else setInfo({ status: 'ok', msg: '', ultima: agora() })
  }), [rodar, enviar, aplicarNuvem, donoDosDados])

  // sessão de login
  useEffect(() => {
    const dados = (ses) => (ses ? { id: ses.user.id, email: ses.user.email, meta: ses.user.user_metadata || {} } : null)
    supabase.auth.getSession().then(({ data }) => { setSessao(dados(data.session)); setSessaoLida(true) }).catch(() => setSessaoLida(true))
    const { data: sub } = supabase.auth.onAuthStateChange((ev, ses) => {
      if (ev === 'PASSWORD_RECOVERY') setRecuperando(true)
      if (ev === 'SIGNED_OUT') setRecuperando(false)
      setSessao(dados(ses))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // ao entrar: sincroniza uma vez; ao voltar para o app ou reconectar: confere a nuvem
  useEffect(() => {
    setPronto(false)
    setConf(null)
    if (!carregado) return // espera os dados do aparelho carregarem, senão a nuvem sobrescreveria
    if (!sessao) {
      setInfo({ status: 'off', msg: '', ultima: null })
      return
    }
    let vivo = true
    puxar(sessao.id).then(() => vivo && setPronto(true))
    const volta = () => document.visibilityState !== 'hidden' && puxar(sessao.id)
    document.addEventListener('visibilitychange', volta)
    window.addEventListener('online', volta)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', volta)
      window.removeEventListener('online', volta)
    }
  }, [sessao?.id, carregado])

  // alterações locais sobem sozinhas (com pequeno atraso para agrupar toques)
  useEffect(() => {
    if (!sessao || !pronto || conf) return
    const ed = state?.meta?.editadoEm
    if (!ed || ed <= (state?.meta?.sincEm || '')) return
    const t = setTimeout(() => rodar(() => enviar(sessao.id)), 2500)
    return () => clearTimeout(t)
  }, [state?.meta?.editadoEm, state?.meta?.sincEm, sessao, pronto, conf, info.status])

  const entrar = async (email, senha) => {
    const espera = segundosBloqueado()
    if (espera > 0) throw new Error(`Muitas tentativas erradas. Espere ${espera > 60 ? Math.ceil(espera / 60) + ' min' : espera + ' s'} para tentar de novo.`)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      if (/Invalid login credentials/i.test(error.message || '')) registraFalha()
      throw new Error(traduzir(error))
    }
    limpaFalhas()
    // conta antiga com senha que não passa na política: marca na conta para forçar a troca (vale também depois de recarregar)
    if (erroSenha(senha, [email, data?.user?.user_metadata?.usuario, data?.user?.user_metadata?.apelido])) {
      await supabase.auth.updateUser({ data: { senha_fraca: true } })
    }
  }
  // Troca a senha de quem está logado (também usada depois do link de recuperação)
  const trocarSenha = async (nova) => {
    const p = erroSenha(nova, [sessao?.email, sessao?.meta?.usuario, sessao?.meta?.apelido])
    if (p) throw new Error(p)
    const { error } = await supabase.auth.updateUser({ password: nova, data: { senha_fraca: false } })
    if (error) throw new Error(traduzir(error))
    setRecuperando(false)
  }
  const cadastrar = async (email, senha, meta) => {
    const p = erroSenha(senha, [email, meta?.usuario, meta?.apelido])
    if (p) throw new Error(p)
    const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: meta, emailRedirectTo: location.origin + import.meta.env.BASE_URL } })
    if (error) throw new Error(traduzir(error))
    return { logado: !!data.session }
  }
  const recuperar = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
    if (error) throw new Error(traduzir(error))
  }
  // Exclui a conta de vez (função excluir_minha_conta do SQL). Depois limpa a sessão deste aparelho.
  const excluirConta = async () => {
    const { error } = await supabase.rpc('excluir_minha_conta')
    if (error) {
      if (['PGRST202', '42883'].includes(error.code) || /Could not find the function|does not exist/i.test(error.message || '')) {
        throw new Error('Falta atualizar o SQL no Supabase (função excluir_minha_conta). Rode o supabase/amigos.sql de novo.')
      }
      throw new Error(traduzir(error))
    }
    await supabase.auth.signOut({ scope: 'local' })
  }
  // antes de sair, manda o que ainda não subiu (para a próxima conta que usar este aparelho não apagar nada)
  const sair = async () => {
    const m = ref.current?.meta
    if (sessao && m?.donoId === sessao.id && (m.editadoEm || '') > (m.sincEm || '')) {
      try { await enviar(sessao.id) } catch { /* sem conexão: sai assim mesmo */ }
    }
    await supabase.auth.signOut()
  }
  const agoraSync = () => sessao && puxar(sessao.id)
  const usarNuvem = () => { aplicarNuvem(conf); setConf(null) }
  const usarLocal = () => {
    setRaw((p) => ({ ...p, meta: { ...p.meta, editadoEm: agora(), sincEm: '' } }))
    setConf(null)
  }

  return { sessao, sessaoLida, recuperando: recuperando || !!sessao?.meta?.senha_fraca, senhaFraca: !!sessao?.meta?.senha_fraca, ...info, conflito: !!conf, entrar, trocarSenha, cadastrar, recuperar, sair, excluirConta, agora: agoraSync, usarNuvem, usarLocal }
}
