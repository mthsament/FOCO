// Diagnóstico de balanças com protocolo próprio: registra tudo que o aparelho anuncia e envia,
// para que seja possível descobrir como decodificar o peso e a composição corporal.
// Não grava nada no app: só gera um texto que você copia.

const hex = (dv) => Array.from(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)).map((b) => b.toString(16).padStart(2, '0')).join(' ')
const curto = (u) => String(u).replace(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i, '$1')
const hora = () => new Date().toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0')

// Com acceptAllDevices o navegador só libera serviços declarados antes. Declaramos as faixas
// usadas por quase todas as balanças genéricas (FE00–FFFF) mais os serviços padrão.
const SERVICOS = [
  'generic_access', 'device_information', 'battery_service', 'body_composition', 'weight_scale',
  0x1910, 0xa000, 0xa00a, '6e400001-b5a3-f393-e0a9-e50e24dcca9e', '0000ffe0-0000-1000-8000-00805f9b34fb',
  ...Array.from({ length: 512 }, (_, i) => 0xfe00 + i),
]

export const suportaDiagnostico = () => typeof navigator !== 'undefined' && !!navigator.bluetooth

export async function diagnosticar({ onLinha, onFim }) {
  const log = (t) => onLinha(`[${hora()}] ${t}`)
  const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICOS })
  log(`Dispositivo: ${device.name || '(sem nome)'}`)
  device.addEventListener('gattserverdisconnected', () => {
    log('Desconectou')
    onFim?.()
  })

  // 1) Anúncios: muitas balanças baratas mandam o peso aqui, sem precisar conectar.
  let ultimoAnuncio = ''
  if (device.watchAdvertisements) {
    device.addEventListener('advertisementreceived', (ev) => {
      const partes = []
      ev.manufacturerData?.forEach((dv, id) => partes.push(`fab 0x${id.toString(16)}: ${hex(dv)}`))
      ev.serviceData?.forEach((dv, id) => partes.push(`serv ${curto(id)}: ${hex(dv)}`))
      const t = partes.join(' | ')
      if (t && t !== ultimoAnuncio) {
        ultimoAnuncio = t
        log(`ANÚNCIO rssi=${ev.rssi} ${t}`)
      }
    })
    try {
      await device.watchAdvertisements()
      log('Escutando anúncios…')
    } catch (e) {
      log(`Anúncios indisponíveis: ${e.message}`)
    }
  } else {
    log('Este navegador não lê anúncios (só conexão).')
  }

  // 2) Conexão: lista serviços e características e assina tudo que notifica.
  try {
    log('Conectando…')
    const server = await device.gatt.connect()
    const servicos = await server.getPrimaryServices()
    log(`Serviços: ${servicos.map((s) => curto(s.uuid)).join(', ') || '(nenhum visível)'}`)
    for (const svc of servicos) {
      let chars = []
      try {
        chars = await svc.getCharacteristics()
      } catch (e) {
        log(`  ${curto(svc.uuid)}: sem acesso (${e.message})`)
        continue
      }
      for (const ch of chars) {
        const p = ch.properties
        const props = ['read', 'write', 'writeWithoutResponse', 'notify', 'indicate'].filter((k) => p[k]).join(',')
        log(`  ${curto(svc.uuid)} / ${curto(ch.uuid)} [${props}]`)
        if (p.read) {
          try {
            log(`    leitura: ${hex(await ch.readValue())}`)
          } catch { /* sem permissão */ }
        }
        if (p.notify || p.indicate) {
          ch.addEventListener('characteristicvaluechanged', (ev) => log(`DADO ${curto(svc.uuid)}/${curto(ch.uuid)}: ${hex(ev.target.value)}`))
          try {
            await ch.startNotifications()
            log(`    assinado`)
          } catch (e) {
            log(`    não consegui assinar: ${e.message}`)
          }
        }
      }
    }
    log('Pronto. Suba na balança descalço e espere o resultado final aparecer.')
  } catch (e) {
    log(`Conexão falhou: ${e.message}. Se aparecerem ANÚNCIOS acima, já dá para trabalhar com eles.`)
  }

  return { parar: () => { try { device.gatt?.connected && device.gatt.disconnect() } catch { /* ok */ } } }
}
