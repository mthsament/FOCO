import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { addDays, diffDays, todayISO } from './dates.js'
import { aguaDoDia, metaAgua, statusDia } from './metrics.js'

// Amigos e ofensivas em grupo (tabelas criadas por supabase/amigos.sql).
// O que sai do aparelho: apelido, código de amigo e, por dia, "treino / dieta / água cumpridos".

export const TIPOS = [
  ['geral', 'Geral', 'Treino e dieta em dia'],
  ['treino', 'Treino', 'Treino planejado feito'],
  ['dieta', 'Dieta', 'Refeições do dia em dia'],
  ['agua', 'Água', 'Meta de água batida'],
]
export const NOME_TIPO = Object.fromEntries(TIPOS.map(([k, n]) => [k, n]))

const ALF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O, 1/I
const novoCodigo = () => 'FOCO-' + Array.from({ length: 6 }, () => ALF[Math.floor(Math.random() * ALF.length)]).join('')
export const normalizaCodigo = (c) => String(c || '').toUpperCase().replace(/\s+/g, '').replace(/^FOCO-?/, 'FOCO-')

export class ErroAmigos extends Error {
  constructor(msg, semTabelas = false) { super(msg); this.semTabelas = semTabelas }
}
function traduz(e) {
  const m = e?.message || String(e)
  if (e?.code === 'PGRST205' || e?.code === '42P01' || e?.code === 'PGRST202' || /schema cache|does not exist|Could not find the (table|function)/i.test(m)) return new ErroAmigos('As tabelas de amigos ainda não existem no Supabase.', true)
  if (e?.code === '23505') return new ErroAmigos('Isso já existe (pedido ou amizade com essa pessoa).')
  if (/fetch|network|Failed/i.test(m)) return new ErroAmigos('Sem conexão. Tente de novo quando voltar a internet.')
  if (/row-level security|permission/i.test(m)) return new ErroAmigos('Sem permissão para isso. Confira se rodou o SQL de amigos completo.')
  return new ErroAmigos(m)
}
const ok = ({ data, error }) => { if (error) throw traduz(error); return data }

// ---------- leitura ----------
export async function carregar(uid, hoje = todayISO()) {
  const [perfis, amizades, ofensivas, membros] = await Promise.all([
    supabase.from('perfis').select('user_id, apelido, codigo').then(ok),
    supabase.from('amizades').select('id, de, para, status, criado_em').then(ok),
    supabase.from('ofensivas').select('id, nome, tipo, criada_por, inicio, encerrada').then(ok),
    supabase.from('ofensiva_membros').select('ofensiva_id, user_id, status').then(ok),
  ])
  const inicios = ofensivas.map((o) => o.inicio)
  const desde = [addDays(hoje, -40), ...inicios].sort()[0]
  const ids = perfis.map((p) => p.user_id)
  const lista = ids.length ? await supabase.from('checkins').select('user_id, data, treino, dieta, agua').in('user_id', ids).gte('data', desde).then(ok) : []
  const checkins = {}
  for (const c of lista) (checkins[c.user_id] = checkins[c.user_id] || {})[c.data] = c
  const porId = Object.fromEntries(perfis.map((p) => [p.user_id, p]))
  return { eu: porId[uid] || null, perfis: porId, amizades, ofensivas, membros, checkins }
}

// ---------- escrita ----------
export async function criarPerfil(uid, apelido) {
  const nome = apelido.trim()
  if (nome.length < 2) throw new ErroAmigos('Escolha um apelido com pelo menos 2 letras.')
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase.from('perfis').insert({ user_id: uid, apelido: nome.slice(0, 24), codigo: novoCodigo() })
    if (!error) return
    if (error.code === '23505' && /user_id|pkey/i.test(error.message || '')) return // já existia
    if (error.code !== '23505') throw traduz(error)
  }
  throw new ErroAmigos('Não consegui gerar um código livre. Tente de novo.')
}
export const mudarApelido = async (uid, apelido) => {
  if (apelido.trim().length < 2) throw new ErroAmigos('Escolha um apelido com pelo menos 2 letras.')
  ok(await supabase.from('perfis').update({ apelido: apelido.trim().slice(0, 24) }).eq('user_id', uid))
}

export async function adicionarPorCodigo(uid, codigo, dados) {
  const c = normalizaCodigo(codigo)
  if (c.length < 8) throw new ErroAmigos('Digite o código completo, como FOCO-AB12CD.')
  const achados = ok(await supabase.rpc('buscar_por_codigo', { c }))
  const alvo = achados?.[0]
  if (!alvo) throw new ErroAmigos('Não achei ninguém com esse código.')
  if (alvo.user_id === uid) throw new ErroAmigos('Esse é o seu próprio código.')
  const ja = dados?.amizades?.find((a) => (a.de === uid && a.para === alvo.user_id) || (a.de === alvo.user_id && a.para === uid))
  if (ja?.status === 'aceita') throw new ErroAmigos(`Você e ${alvo.apelido} já são amigos.`)
  if (ja && ja.de === alvo.user_id) { // a pessoa já tinha pedido: aceita direto
    ok(await supabase.from('amizades').update({ status: 'aceita' }).eq('id', ja.id))
    return { apelido: alvo.apelido, aceito: true }
  }
  if (ja) throw new ErroAmigos(`Você já enviou um pedido para ${alvo.apelido}.`)
  ok(await supabase.from('amizades').insert({ de: uid, para: alvo.user_id }))
  return { apelido: alvo.apelido, aceito: false }
}
export const aceitarPedido = async (id) => ok(await supabase.from('amizades').update({ status: 'aceita' }).eq('id', id))
export const removerAmizade = async (id) => ok(await supabase.from('amizades').delete().eq('id', id))

export async function criarOfensiva(uid, { nome, tipo }, amigosIds) {
  if (nome.trim().length < 2) throw new ErroAmigos('Dê um nome para a ofensiva.')
  if (!amigosIds.length) throw new ErroAmigos('Escolha pelo menos um amigo.')
  const o = ok(await supabase.from('ofensivas').insert({ nome: nome.trim().slice(0, 40), tipo, criada_por: uid, inicio: todayISO() }).select('id').single())
  const linhas = [{ ofensiva_id: o.id, user_id: uid, status: 'aceito' }, ...amigosIds.map((a) => ({ ofensiva_id: o.id, user_id: a, status: 'convidado' }))]
  ok(await supabase.from('ofensiva_membros').insert(linhas))
  return o.id
}
export const aceitarConvite = async (ofId, uid) => ok(await supabase.from('ofensiva_membros').update({ status: 'aceito' }).eq('ofensiva_id', ofId).eq('user_id', uid))
export const sairDaOfensiva = async (ofId, uid) => ok(await supabase.from('ofensiva_membros').delete().eq('ofensiva_id', ofId).eq('user_id', uid))
export const encerrarOfensiva = async (ofId) => ok(await supabase.from('ofensivas').delete().eq('id', ofId))

// ---------- cálculo da ofensiva em grupo ----------
// estado de um membro num dia, para o tipo da ofensiva: ok | rest | miss | pend
export function estadoDoMembro(ch, tipo, data, hoje) {
  const futuro = data >= hoje // hoje ainda pode ser cumprido
  const aberto = (v) => (v === 'miss' && futuro ? 'pend' : v)
  if (!ch) return futuro ? 'pend' : 'miss'
  if (tipo === 'agua') return ch.agua ? 'ok' : futuro ? 'pend' : 'miss'
  const t = aberto(ch.treino)
  const d = aberto(ch.dieta)
  if (tipo === 'treino') return t
  if (tipo === 'dieta') return d
  if ([t, d].includes('miss')) return 'miss'
  if ([t, d].includes('pend')) return 'pend'
  return [t, d].includes('ok') ? 'ok' : 'rest'
}
const juntaGrupo = (estados) => (estados.includes('miss') ? 'miss' : estados.includes('pend') ? 'pend' : estados.includes('ok') ? 'ok' : 'rest')

export function calcularOfensiva({ tipo, inicio }, uids, checkins, hoje = todayISO()) {
  const dias = Math.max(0, diffDays(hoje, inicio))
  const porDia = []
  for (let i = 0; i <= dias; i++) {
    const data = addDays(inicio, i)
    porDia.push({ data, membros: Object.fromEntries(uids.map((u) => [u, estadoDoMembro(checkins[u]?.[data], tipo, data, hoje)])) })
  }
  porDia.forEach((d) => { d.grupo = juntaGrupo(Object.values(d.membros)) })
  let melhor = 0
  let corrente = 0
  for (const d of porDia) {
    if (d.grupo === 'ok') { corrente++; melhor = Math.max(melhor, corrente) } else if (d.grupo === 'miss') corrente = 0
  }
  const hojeDia = porDia[porDia.length - 1]
  const quebrou = hojeDia?.grupo === 'miss' // só dá para ser "miss" hoje se alguém desistiu explicitamente
  return {
    atual: quebrou ? 0 : corrente,
    melhor,
    hoje: hojeDia?.membros || {},
    hojeOk: hojeDia?.grupo === 'ok',
    falta: uids.filter((u) => ['pend', 'miss'].includes(hojeDia?.membros?.[u])),
    dias: porDia,
  }
}

// ---------- publicar os check-ins do dia deste aparelho ----------
const mapa = (v) => (v === 'pending' ? 'pend' : v)
export function checkinsRecentes(s, hoje = todayISO(), n = 7) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const data = addDays(hoje, -i)
    const st = statusDia(s, data, hoje)
    out.push({ data, treino: mapa(st.treino), dieta: mapa(st.dieta), agua: aguaDoDia(s, data) >= metaAgua(s) })
  }
  return out
}
const CHAVE = 'foco-amigos-uid'
export const amigosAtivo = (uid) => { try { return localStorage.getItem(CHAVE) === uid } catch { return false } }
export const ativarAmigos = (uid) => { try { localStorage.setItem(CHAVE, uid) } catch { /* sem armazenamento */ } }

export async function publicarCheckins(uid, linhas) {
  ok(await supabase.from('checkins').upsert(linhas.map((l) => ({ user_id: uid, ...l })), { onConflict: 'user_id,data' }))
}

// Publica sozinho (depois de a pessoa criar o perfil em Amigos) sempre que o dia muda
export function usePublicarCheckins(s, sessao) {
  const ultimo = useRef('')
  const uid = sessao?.id
  const linhas = s ? checkinsRecentes(s) : null
  const chave = linhas ? JSON.stringify(linhas) : ''
  useEffect(() => {
    if (!uid || !linhas || !amigosAtivo(uid) || chave === ultimo.current) return
    const t = setTimeout(() => {
      publicarCheckins(uid, linhas).then(() => { ultimo.current = chave }).catch(() => {})
    }, 4000)
    return () => clearTimeout(t)
  }, [uid, chave])
}

// ---------- hook da tela ----------
export function useAmigos(sessao) {
  const [estado, setEstado] = useState({ carregando: !!sessao, dados: null, erro: '', semTabelas: false })
  const uid = sessao?.id
  const vivo = useRef(true)
  useEffect(() => () => { vivo.current = false }, [])

  const recarregar = useCallback(async () => {
    if (!uid) return
    try {
      const dados = await carregar(uid)
      if (vivo.current) setEstado({ carregando: false, dados, erro: '', semTabelas: false })
    } catch (e) {
      const er = e instanceof ErroAmigos ? e : traduz(e)
      if (vivo.current) setEstado((a) => ({ ...a, carregando: false, erro: er.semTabelas ? '' : er.message, semTabelas: !!er.semTabelas }))
    }
  }, [uid])

  useEffect(() => {
    if (!uid) { setEstado({ carregando: false, dados: null, erro: '', semTabelas: false }); return }
    setEstado((a) => ({ ...a, carregando: true }))
    recarregar()
    const volta = () => document.visibilityState === 'visible' && recarregar()
    document.addEventListener('visibilitychange', volta)
    const t = setInterval(volta, 60000)
    return () => { document.removeEventListener('visibilitychange', volta); clearInterval(t) }
  }, [uid, recarregar])

  return { ...estado, recarregar }
}
