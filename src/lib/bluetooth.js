// Leitura de balanças de bioimpedância por Bluetooth (Web Bluetooth).
// Funciona com balanças que seguem os serviços padrão do Bluetooth SIG:
//   Body Composition (0x181B) e Weight Scale (0x181D).
// Balanças com protocolo próprio (Xiaomi, Renpho etc.) não expõem esses serviços;
// nesses casos o app avisa e mostra o que o aparelho oferece.
// Requer Chrome/Edge (desktop ou Android) em HTTPS ou localhost. iOS/Safari não tem Web Bluetooth.

export const suportaBluetooth = () => typeof navigator !== 'undefined' && !!navigator.bluetooth

const LB_KG = 0.45359237
const r1 = (n) => Math.round(n * 10) / 10
const r2 = (n) => Math.round(n * 100) / 100

// Weight Measurement (0x2A9D)
export function lerPeso(dv) {
  const flags = dv.getUint8(0)
  const imperial = flags & 1
  const raw = dv.getUint16(1, true)
  const kg = imperial ? raw * 0.01 * LB_KG : raw * 0.005
  return kg > 0 && kg < 400 ? { kg: r2(kg) } : null
}

// Body Composition Measurement (0x2A9C). Os campos opcionais aparecem na ordem dos bits de "flags".
export function lerComposicao(dv) {
  const flags = dv.getUint16(0, true)
  const imperial = flags & 1
  const massa = (v) => (imperial ? v * 0.01 * LB_KG : v * 0.005)
  let o = 2
  const u16 = () => {
    const v = dv.getUint16(o, true)
    o += 2
    return v
  }
  const gord = u16()
  const out = {}
  if (gord !== 0xffff) out.gordura = r1(gord * 0.1)
  if (flags & 0x0002) o += 7 // data e hora
  if (flags & 0x0004) o += 1 // id do usuário
  if (flags & 0x0008) out.tmb = Math.round((u16() * 0.2390057) ) // kJ -> kcal
  if (flags & 0x0010) out.musculo = r1(u16() * 0.1) // % de músculo
  if (flags & 0x0020) out.massaMuscular = r1(massa(u16()))
  if (flags & 0x0040) out.massaMagra = r1(massa(u16())) // massa livre de gordura
  if (flags & 0x0080) o += 2 // massa magra macia
  let aguaKg = null
  if (flags & 0x0100) aguaKg = massa(u16())
  if (flags & 0x0200) out.impedancia = r1(u16() * 0.1)
  if (flags & 0x0400) out.kg = r2(massa(u16()))
  if (flags & 0x0800) o += 2 // altura
  if (aguaKg != null && out.kg) out.agua = r1((aguaKg / out.kg) * 100)
  return Object.keys(out).length ? out : null
}

const nomeUuid = (u) => String(u).replace(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i, '$1')

// Conecta, assina as notificações e chama onLeitura({ kg, gordura, ... }) a cada medição.
// onStatus(texto) recebe o andamento. Retorna { desconectar }.
export async function conectarBalanca({ onLeitura, onStatus, onFim }) {
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: ['body_composition', 'weight_scale', 'device_information', 'battery_service'],
  })
  const nome = device.name || 'Balança'
  onStatus?.(`Conectando a ${nome}…`)
  device.addEventListener('gattserverdisconnected', () => onFim?.())
  const server = await device.gatt.connect()

  const servicos = await server.getPrimaryServices().catch(() => [])
  const lista = servicos.map((s) => nomeUuid(s.uuid))
  let assinou = 0

  const assinar = async (svcNome, chNome, parser) => {
    try {
      const svc = await server.getPrimaryService(svcNome)
      const ch = await svc.getCharacteristic(chNome)
      ch.addEventListener('characteristicvaluechanged', (e) => {
        try {
          const r = parser(e.target.value)
          if (r) onLeitura?.(r)
        } catch {
          /* pacote inválido: ignora */
        }
      })
      await ch.startNotifications()
      assinou++
    } catch {
      /* serviço ou característica ausente neste aparelho */
    }
  }
  await assinar('body_composition', 'body_composition_measurement', lerComposicao)
  await assinar('weight_scale', 'weight_measurement', lerPeso)

  if (!assinou) {
    onStatus?.('Conectado, mas esta balança usa um protocolo próprio e não envia dados no padrão aberto.')
  } else {
    onStatus?.(`Conectado a ${nome}. Suba na balança descalço e aguarde o fim da medição.`)
  }
  return { nome, servicos: lista, assinou, desconectar: () => device.gatt.connected && device.gatt.disconnect() }
}

// ---------- Monitor de frequência cardíaca (cinta, ou relógio com "transmitir FC") ----------
// Serviço padrão Heart Rate (0x180D). Muitos relógios só transmitem se o modo "transmitir FC"
// estiver ligado no próprio relógio.
export const lerFC = (dv) => (dv.getUint8(0) & 1 ? dv.getUint16(1, true) : dv.getUint8(1))

export async function conectarFC({ onFC, onFim }) {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })
  device.addEventListener('gattserverdisconnected', () => onFim?.())
  const server = await device.gatt.connect()
  const svc = await server.getPrimaryService('heart_rate')
  const ch = await svc.getCharacteristic('heart_rate_measurement')
  ch.addEventListener('characteristicvaluechanged', (e) => {
    const v = lerFC(e.target.value)
    if (v > 30 && v < 250) onFC(v)
  })
  await ch.startNotifications()
  return { nome: device.name || 'Monitor de FC', desconectar: () => device.gatt.connected && device.gatt.disconnect() }
}

// ---------- Importação de CSV exportado pelo app da balança ----------
const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const num = (v) => {
  const n = parseFloat(String(v ?? '').replace('%', '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const paraISO = (v) => {
  const t = String(v ?? '').trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}
const CAMPOS = [
  ['data', /^(data|date|dia|time|hora|datetime)/],
  ['kg', /^(peso|weight)/],
  ['gordura', /(gordura|fat|bodyfat)/],
  ['massaMagra', /(massa magra|massa livre|lean|fat free|ffm)/],
  ['agua', /(agua|water)/],
  ['musculo', /(musculo|muscle)/],
  ['visceral', /(visceral)/],
]

export function lerCsv(texto) {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (linhas.length < 2) return []
  const sep = [';', ',', '\t'].map((s) => [s, linhas[0].split(s).length]).sort((a, b) => b[1] - a[1])[0][0]
  const cab = linhas[0].split(sep).map((c) => semAcento(c.replace(/^"|"$/g, '')))
  const idx = {}
  for (const [campo, re] of CAMPOS) {
    const i = cab.findIndex((c, k) => re.test(c) && !Object.values(idx).includes(k))
    if (i >= 0) idx[campo] = i
  }
  if (idx.data == null || idx.kg == null) return []
  const out = []
  for (const l of linhas.slice(1)) {
    const c = l.split(sep).map((x) => x.replace(/^"|"$/g, ''))
    const data = paraISO(c[idx.data])
    const kg = num(c[idx.kg])
    if (!data || !kg) continue
    const reg = { data, kg }
    for (const k of ['gordura', 'massaMagra', 'agua', 'musculo', 'visceral']) {
      const v = idx[k] != null ? num(c[idx[k]]) : null
      if (v != null) reg[k] = v
    }
    out.push(reg)
  }
  return out
}
