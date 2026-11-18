import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

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
  if (/Email not confirmed/i.test(m)) return 'E-mail ainda não confirmado no Supabase.'
  if (/fetch|network|Failed/i.test(m)) return 'Sem conexão. As alterações ficam salvas e sobem quando voltar.'
  return m
}

export function useSincronia(state, setRaw, normalizar) {
  const [sessao, setSessao] = useState(null)
  const [info, setInfo] = useState({ status: 'off', msg: '', ultima: null })
  const [conf, setConf] = useState(null)
  const [pronto, setPronto] = useState(false)
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

  const puxar = useCallback((uid) => rodar(async () => {
    setInfo((i) => ({ ...i, status: 'baixando', msg: '' }))
    const { data: row, error } = await supabase.from('estados').select('dados, atualizado_em').maybeSingle()
    if (error) throw error
    const local = ref.current
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
  }), [rodar, enviar, aplicarNuvem])

  // sessão de login
  useEffect(() => {
    const dados = (ses) => (ses ? { id: ses.user.id, email: ses.user.email } : null)
    supabase.auth.getSession().then(({ data }) => setSessao(dados(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, ses) => setSessao(dados(ses)))
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
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw new Error(traduzir(error))
  }
  const sair = () => supabase.auth.signOut()
  const agoraSync = () => sessao && puxar(sessao.id)
  const usarNuvem = () => { aplicarNuvem(conf); setConf(null) }
  const usarLocal = () => {
    setRaw((p) => ({ ...p, meta: { ...p.meta, editadoEm: agora(), sincEm: '' } }))
    setConf(null)
  }

  return { sessao, ...info, conflito: !!conf, entrar, sair, agora: agoraSync, usarNuvem, usarLocal }
}
