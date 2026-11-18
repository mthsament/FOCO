// Recebe corridas por link, para o app Atalhos do iPhone (que lê o Apple Health).
//
//   https://SEU-SITE/FOCO/?importar=corrida&data=2026-11-17&min=32,5&km=5,2&fc=151
// ou várias de uma vez:
//   https://SEU-SITE/FOCO/?importar=corrida&dados=[{"data":"2026-11-17","min":32.5,"km":5.2,"fc":151}]
//
// Aceita vírgula ou ponto nos números e data em AAAA-MM-DD ou DD/MM/AAAA.

const num = (v) => {
  if (v == null || v === '') return null
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const dataISO = (v) => {
  const t = String(v ?? '').trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

const limpar = (r) => {
  const data = dataISO(r?.data)
  const min = num(r?.min)
  const km = num(r?.km)
  const fc = num(r?.fc)
  if (!data || !min || min <= 0 || min > 24 * 60) return null
  if (km != null && (km < 0 || km > 300)) return null
  const out = { data, min, km: km || null, obs: 'Do Apple Health (Fitbeing)', origem: 'apple-saude' }
  if (fc && fc > 30 && fc < 230) out.fc = Math.round(fc)
  return out
}

const daBruta = (brutas) => {
  const corridas = brutas.map(limpar).filter(Boolean)
  return { corridas, descartadas: brutas.length - corridas.length }
}

// Texto JSON (objeto ou lista) colado da área de transferência, como o Atalho copia.
export function lerTexto(texto) {
  try {
    const j = JSON.parse(String(texto).trim())
    return daBruta(Array.isArray(j) ? j : [j])
  } catch {
    return { corridas: [], descartadas: 0, erro: 'O texto copiado não é de uma corrida. Rode o Atalho antes de importar.' }
  }
}

// Devolve { corridas } se a URL pede importação, ou null se não tem nada a ver com isso.
export function lerLink(search) {
  const q = new URLSearchParams(search)
  if (q.get('importar') !== 'corrida') return null
  const dados = q.get('dados')
  if (dados) return lerTexto(dados)
  return daBruta([{ data: q.get('data'), min: q.get('min'), km: q.get('km'), fc: q.get('fc') }])
}
