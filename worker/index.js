// Servidor de lembretes do FOCO (Cloudflare Worker).
// - Guarda a inscrição de push do seu aparelho e a agenda de avisos (KV).
// - A cada 5 minutos (cron) vê o que está no horário e manda um "toque" Web Push ao iPhone.
//   O texto do aviso o app busca em /mensagem (push sem corpo, não precisa de criptografia).
// Para uma pessoa só: tudo é protegido por uma senha (secret FOCO_TOKEN).

const enc = new TextEncoder()
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64uJson = (o) => b64u(enc.encode(JSON.stringify(o)))

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const getJ = async (env, k) => JSON.parse((await env.FOCO_KV.get(k)) || 'null')
const putJ = (env, k, v, opts) => env.FOCO_KV.put(k, JSON.stringify(v), opts)

// ---------- Web Push (VAPID, ES256) ----------
async function jwtVapid(env, audiencia) {
  const chave = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const cab = b64uJson({ typ: 'JWT', alg: 'ES256' })
  const corpo = b64uJson({ aud: audiencia, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUB })
  const assinatura = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, enc.encode(`${cab}.${corpo}`))
  return `${cab}.${corpo}.${b64u(assinatura)}`
}

async function enviarToque(env, sub) {
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${await jwtVapid(env, new URL(sub.endpoint).origin)}, k=${env.VAPID_PUBLIC}`,
      TTL: '3600',
      Urgency: 'high',
    },
  })
  if (r.status === 404 || r.status === 410) {
    await env.FOCO_KV.delete('sub') // inscrição expirou
    return { ok: false, status: r.status, expirou: true }
  }
  return { ok: r.ok, status: r.status }
}

async function avisar(env, titulo, corpo) {
  const sub = await getJ(env, 'sub')
  if (!sub) return { ok: false, erro: 'sem inscrição' }
  await putJ(env, 'ultima', { titulo, corpo }, { expirationTtl: 3600 })
  return enviarToque(env, sub)
}

// ---------- Hora local ----------
function agora(tz, d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  )
  return { data: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) }
}
const minDe = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + (m || 0)
}
const litros = (ml) => `${(ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`

const JANELA = 5 // minutos, igual ao intervalo do cron

async function tick(env) {
  const agenda = await getJ(env, 'agenda')
  if (!agenda?.itens?.length) return
  const t = agora(agenda.tz || 'America/Sao_Paulo')
  const prog = await getJ(env, 'prog')
  const hoje = prog && prog.data === t.data ? prog : null

  const devidos = agenda.itens.filter((i) => {
    const atraso = (t.min - minDe(i.hora) + 1440) % 1440
    if (atraso >= JANELA) return false
    if (i.datas && !i.datas.includes(t.data)) return false
    if (i.tipo === 'agua' && hoje && hoje.ml >= hoje.meta) return false // meta batida: não incomoda
    return true
  })
  if (!devidos.length) return

  const textoDe = (i) => (i.corpo || '').replace('{falta}', hoje ? litros(Math.max(0, hoje.meta - hoje.ml)) : 'a meta')
  const [primeiro, ...resto] = devidos
  const corpo = resto.length ? `${textoDe(primeiro)} (+${resto.length}: ${resto.map((r) => r.titulo).join(', ')})` : textoDe(primeiro)
  await avisar(env, primeiro.titulo, corpo)
}

// ---------- Rotas ----------
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
    if (req.headers.get('Authorization') !== `Bearer ${env.FOCO_TOKEN}`) return json({ erro: 'não autorizado' }, 401)
    const { pathname } = new URL(req.url)
    const corpo = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    if (pathname === '/vapid') return json({ publicKey: env.VAPID_PUBLIC })
    if (pathname === '/mensagem') return json((await getJ(env, 'ultima')) || { titulo: 'FOCO', corpo: 'Você tem um lembrete.' })
    if (pathname === '/inscrever') {
      if (!corpo.subscription?.endpoint) return json({ erro: 'inscrição inválida' }, 400)
      await putJ(env, 'sub', corpo.subscription)
      if (corpo.agenda) await putJ(env, 'agenda', corpo.agenda)
      return json({ ok: true })
    }
    if (pathname === '/agenda') {
      if (corpo.agenda) await putJ(env, 'agenda', corpo.agenda)
      return json({ ok: true })
    }
    if (pathname === '/progresso') {
      await putJ(env, 'prog', { data: corpo.data, ml: Number(corpo.ml) || 0, meta: Number(corpo.meta) || 3500 })
      return json({ ok: true })
    }
    if (pathname === '/cancelar') {
      await env.FOCO_KV.delete('sub')
      await env.FOCO_KV.delete('agenda')
      return json({ ok: true })
    }
    if (pathname === '/testar') return json(await avisar(env, 'FOCO', 'Teste: as notificações estão funcionando.'))
    return json({ erro: 'rota não existe' }, 404)
  },

  async scheduled(_evento, env, ctx) {
    ctx.waitUntil(tick(env))
  },
}
