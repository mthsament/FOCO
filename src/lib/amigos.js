import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { addDays, diffDays, todayISO } from './dates.js'
import { aguaDoDia, metaAgua, statusDia } from './metrics.js'
import { estatisticas } from './conquistas.js'

// Amigos e ofensivas em grupo (tabelas criadas por supabase/amigos.sql).
// O que sai do aparelho: apelido, código de amigo e, por dia, "treino / dieta / água cumpridos".

export const TIPOS = [
  ['geral', 'Geral', 'Treino e dieta em dia'],
  ['treino', 'Treino', 'Treino planejado feito'],
  ['dieta', 'Dieta', 'Refeições do dia em dia'],
  ['agua', 'Água', 'Meta de água batida'],
]
export const NOME_TIPO = Object.fromEntries(TIPOS.map(([k, n]) => [k, n]))

// ID de amigo: 8 números (mostrado como 4821 7305). Para adicionar alguém é preciso o @ e o ID.
const novoId = () => String(Math.floor(Math.random() * 1e8)).padStart(8, '0')
export const soDigitos = (t) => String(t || '').replace(/\D/g, '')
export const fmtId = (id) => { const d = soDigitos(id); return d.length === 8 ? `${d.slice(0, 4)} ${d.slice(4)}` : String(id || '') }
export const USUARIO_RE = /^[a-z0-9_]{3,20}$/
export const limpaUsuario = (u) => String(u || '').trim().replace(/^@+/, '').toLowerCase()
export const erroUsuario = (u) => {
  const x = limpaUsuario(u)
  if (x.length < 3) return 'O @ precisa de pelo menos 3 caracteres.'
  if (!USUARIO_RE.test(x)) return 'Use só letras minúsculas, números e _ (até 20).'
  return ''
}

export const privacidade = (s) => ({ pedidos: true, progresso: true, foto: true, ...(s?.perfil?.privacidade || {}) })

export class ErroAmigos extends Error {
  constructor(msg, semTabelas = false) { super(msg); this.semTabelas = semTabelas }
}
function traduz(e) {
  const m = e?.message || String(e)
  if (['PGRST205', '42P01', 'PGRST202', 'PGRST204', '42703', '42883'].includes(e?.code) || /schema cache|does not exist|Could not find the (table|function|'[^']+' column)/i.test(m)) return new ErroAmigos('As tabelas de perfil e amigos ainda não estão no Supabase (ou falta atualizar o SQL).', true)
  if (e?.code === '23505' && /usuario/i.test(m)) return new ErroAmigos('Esse @ já está em uso. Escolha outro.')
  if (e?.code === '23505') return new ErroAmigos('Isso já existe (pedido ou amizade com essa pessoa).')
  if (/fetch|network|Failed/i.test(m)) return new ErroAmigos('Sem conexão. Tente de novo quando voltar a internet.')
  if (/row-level security|permission/i.test(m)) return new ErroAmigos('Sem permissão para isso. Confira se rodou o SQL de amigos completo.')
  return new ErroAmigos(m)
}
const ok = ({ data, error }) => { if (error) throw traduz(error); return data }

// SQL antigo (sem agua_ml / meta_agua_ml): o app continua funcionando, só sem mostrar os litros
const semColunaAgua = (e) => e && (e.code === '42703' || e.code === 'PGRST204' || /agua_ml|meta_agua_ml/.test(e.message || ''))

const semColunaResumo = (e) => e && (e.code === '42703' || e.code === 'PGRST204' || /resumo/.test(e.message || ''))

// ---------- leitura ----------
export async function carregar(uid, hoje = todayISO()) {
  const colPerfis = 'user_id, apelido, usuario, codigo, bio, avatar, aceita_pedidos'
  const [perfis, amizades, ofensivas, membros] = await Promise.all([
    supabase.from('perfis').select(colPerfis + ', resumo').then((r) => (r.error && semColunaResumo(r.error) ? supabase.from('perfis').select(colPerfis) : r)).then(ok),
    supabase.from('amizades').select('id, de, para, status, criado_em').then(ok),
    supabase.from('ofensivas').select('id, nome, tipo, criada_por, inicio, encerrada').then(ok),
    supabase.from('ofensiva_membros').select('ofensiva_id, user_id, status').then(ok),
  ])
  const inicios = ofensivas.map((o) => o.inicio)
  const desde = [addDays(hoje, -40), ...inicios].sort()[0]
  const ids = perfis.map((p) => p.user_id)
  let lista = []
  if (ids.length) {
    const q = (cols) => supabase.from('checkins').select(cols).in('user_id', ids).gte('data', desde)
    let r = await q('user_id, data, treino, dieta, agua, agua_ml, meta_agua_ml')
    if (r.error && semColunaAgua(r.error)) r = await q('user_id, data, treino, dieta, agua') // SQL antigo: sem litros
    lista = ok(r)
  }
  const checkins = {}
  for (const c of lista) (checkins[c.user_id] = checkins[c.user_id] || {})[c.data] = c
  const porId = Object.fromEntries(perfis.map((p) => [p.user_id, p]))
  return { eu: porId[uid] || null, perfis: porId, amizades, ofensivas, membros, checkins }
}

// ---------- escrita ----------
export async function criarPerfil(uid, { usuario, apelido }) {
  const u = limpaUsuario(usuario)
  const msg = erroUsuario(u)
  if (msg) throw new ErroAmigos(msg)
  const nome = String(apelido || '').trim() || u
  for (let i = 0; i < 6; i++) {
    const { error } = await supabase.from('perfis').insert({ user_id: uid, apelido: nome.slice(0, 24), usuario: u, codigo: novoId() })
    if (!error) return
    if (error.code === '23505' && /usuario/i.test(error.message || '')) throw traduz(error)
    if (error.code === '23505' && /pkey|user_id/i.test(error.message || '')) return // já existia
    if (error.code !== '23505') throw traduz(error)
  }
  throw new ErroAmigos('Não consegui gerar um ID livre. Tente de novo.')
}
// Define ou troca o @ (o ID de amigo continua o mesmo). Cria o perfil se a conta ainda não tiver um.
export async function definirUsuario(uid, { usuario, apelido }) {
  const u = limpaUsuario(usuario)
  const msg = erroUsuario(u)
  if (msg) throw new ErroAmigos(msg)
  const atual = await meuPerfil(uid)
  if (!atual) return criarPerfil(uid, { usuario: u, apelido })
  const campos = { usuario: u }
  if (apelido && apelido.trim().length >= 2) campos.apelido = apelido.trim().slice(0, 24)
  const { error } = await supabase.from('perfis').update(campos).eq('user_id', uid)
  if (error) throw traduz(error)
}
export async function atualizarPerfil(uid, campos) {
  let r = await supabase.from('perfis').update(campos).eq('user_id', uid)
  if (r.error && semColunaResumo(r.error)) { const { resumo, ...resto } = campos; r = await supabase.from('perfis').update(resto).eq('user_id', uid) } // SQL antigo
  ok(r)
}

// Números do perfil que os amigos podem ver: maior ofensiva, água total e as estatísticas das conquistas
export function resumoPerfil(s, hoje = todayISO()) {
  const e = estatisticas(s, hoje)
  return { ...e, maiorOfensiva: Math.max(e.seqTreino, e.seqDieta, e.seqAgua) }
}
export async function usuarioDisponivel(u) {
  const { data, error } = await supabase.rpc('usuario_disponivel', { u: limpaUsuario(u) })
  if (error) return null // sem o SQL ainda: não dá para saber
  return !!data
}
export async function meuPerfil(uid) {
  const { data, error } = await supabase.from('perfis').select('user_id, apelido, usuario, codigo, bio, avatar, aceita_pedidos').eq('user_id', uid).maybeSingle()
  if (error) throw traduz(error)
  return data
}

export async function adicionarAmigo(uid, usuario, id, dados) {
  const u = limpaUsuario(usuario)
  if (!USUARIO_RE.test(u)) throw new ErroAmigos('Digite o @ do seu amigo.')
  if (soDigitos(id).length !== 8) throw new ErroAmigos('O ID tem 8 números, como 4821 7305.')
  const achados = ok(await supabase.rpc('buscar_amigo', { u, c: soDigitos(id) }))
  const alvo = achados?.[0]
  if (!alvo) throw new ErroAmigos('Não achei ninguém com esse @ e esse ID. Confira os dois (ou a pessoa pausou os pedidos).')
  if (alvo.user_id === uid) throw new ErroAmigos('Esse é o seu próprio perfil.')
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
    out.push({ data, treino: mapa(st.treino), dieta: mapa(st.dieta), agua: aguaDoDia(s, data) >= metaAgua(s), agua_ml: Math.round(aguaDoDia(s, data)), meta_agua_ml: Math.round(metaAgua(s)) })
  }
  return out
}
const CHAVE = 'foco-amigos-uid'
export const amigosAtivo = (uid) => { try { return localStorage.getItem(CHAVE) === uid } catch { return false } }
export const ativarAmigos = (uid) => { try { localStorage.setItem(CHAVE, uid) } catch { /* sem armazenamento */ } }

// Pendências para o selinho do menu: pedidos de amizade recebidos + convites de ofensiva.
// Consulta leve (só contagem); quem nunca usou Amigos neste aparelho não consulta nada.
const EVENTO = 'foco-amigos-mudou'
export const avisaMudouAmigos = () => window.dispatchEvent(new Event(EVENTO))
export function usePendenciasAmigos(sessao) {
  const [n, setN] = useState({ pedidos: 0, convites: 0 })
  const uid = sessao?.id
  useEffect(() => {
    if (!uid) { setN({ pedidos: 0, convites: 0 }); return }
    let vivo = true
    const ler = async () => {
      if (!amigosAtivo(uid) || document.visibilityState === 'hidden') return
      try {
        const [a, b] = await Promise.all([
          supabase.from('amizades').select('id', { count: 'exact', head: true }).eq('para', uid).eq('status', 'pendente'),
          supabase.from('ofensiva_membros').select('ofensiva_id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'convidado'),
        ])
        if (vivo && !a.error && !b.error) setN({ pedidos: a.count || 0, convites: b.count || 0 })
      } catch { /* sem conexão: tenta na próxima */ }
    }
    ler()
    const t = setInterval(ler, 60000)
    document.addEventListener('visibilitychange', ler)
    window.addEventListener(EVENTO, ler)
    return () => { vivo = false; clearInterval(t); document.removeEventListener('visibilitychange', ler); window.removeEventListener(EVENTO, ler) }
  }, [uid])
  return { ...n, total: n.pedidos + n.convites }
}

export async function publicarCheckins(uid, linhas) {
  const up = (ls) => supabase.from('checkins').upsert(ls.map((l) => ({ user_id: uid, ...l })), { onConflict: 'user_id,data' })
  let r = await up(linhas)
  if (r.error && semColunaAgua(r.error)) r = await up(linhas.map(({ agua_ml, meta_agua_ml, ...resto }) => resto))
  ok(r)
}

// Publica sozinho (depois de a pessoa criar o perfil em Amigos) sempre que o dia muda
export function usePublicarCheckins(s, sessao) {
  const ultimo = useRef('')
  const uid = sessao?.id
  const linhas = s ? checkinsRecentes(s) : null
  const chave = linhas ? JSON.stringify(linhas) : ''
  useEffect(() => {
    if (!uid || !linhas || !amigosAtivo(uid) || chave === ultimo.current || !privacidade(s).progresso) return
    const t = setTimeout(() => {
      publicarCheckins(uid, linhas).then(() => { ultimo.current = chave }).catch(() => {})
    }, 4000)
    return () => clearTimeout(t)
  }, [uid, chave])
}

// Espelha apelido, foto e "sobre" no perfil público (respeitando a privacidade) e garante que o perfil exista
export function usePerfilPublico(s, sessao, atualizar) {
  const uid = sessao?.id
  const meta = sessao?.meta
  const ultimo = useRef('')
  const priv = s ? privacidade(s) : null
  const meu = !!s && s.meta?.donoId === uid // dados deste aparelho são desta conta?
  const campos = s && meu
    ? {
        ...(s.perfil.apelido ? { apelido: s.perfil.apelido.slice(0, 24) } : {}),
        bio: priv.foto ? (s.perfil.sobre || '').slice(0, 160) || null : null,
        avatar: priv.foto ? s.perfil.foto || null : null,
        aceita_pedidos: priv.pedidos,
        resumo: priv.progresso ? resumoPerfil(s) : null,
      }
    : null
  const chave = JSON.stringify(campos)

  // 1) conta nova: cria o perfil com o @ escolhido no cadastro e traz o apelido para este aparelho
  useEffect(() => {
    if (!uid || !s) return
    let vivo = true
    ;(async () => {
      try {
        let eu = await meuPerfil(uid)
        if (!eu && meta?.usuario) {
          await criarPerfil(uid, { usuario: meta.usuario, apelido: meta.apelido })
          eu = await meuPerfil(uid)
        }
        // IDs antigos (formato FOCO-XXXXXX) viram o ID numérico de 8 dígitos
        if (eu && (soDigitos(eu.codigo).length !== 8 || /\D/.test(eu.codigo))) {
          for (let i = 0; i < 5; i++) {
            const novo = novoId()
            const { error } = await supabase.from('perfis').update({ codigo: novo }).eq('user_id', uid)
            if (!error) { eu.codigo = novo; break }
            if (error.code !== '23505') break
          }
        }
        if (eu && vivo) {
          ativarAmigos(uid)
          if (meu && !s.perfil.apelido && eu.apelido) atualizar((x) => { x.perfil.apelido = eu.apelido })
        }
      } catch { /* sem o SQL ainda: o perfil local continua funcionando */ }
    })()
    return () => { vivo = false }
  }, [uid, !!s, meu])

  // 2) mudanças no perfil local sobem para o perfil público
  useEffect(() => {
    if (!uid || !campos || !amigosAtivo(uid) || chave === ultimo.current) return
    const t = setTimeout(() => {
      atualizarPerfil(uid, campos).then(() => { ultimo.current = chave }).catch(() => {})
    }, 3000)
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
      avisaMudouAmigos()
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
