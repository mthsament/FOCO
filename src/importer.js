// Importador das planilhas do plano (Academia, Corrida, Alimentação/Suplementação).
// Reconhece cada arquivo pelos nomes das abas e pelos cabeçalhos das tabelas, não por posição fixa de célula:
// se você acrescentar linhas ou exercícios na planilha, o importador continua achando.
import * as XLSX from 'xlsx'
import { DIAS, addDays, dateOf, excelToISO, mondayOf } from './lib/dates.js'

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v) => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const isSim = (v) => norm(v) === 'sim'
const isFormula = (v) => typeof v === 'string' && v.startsWith('=')

function rowsOf(wb, name) {
  const ws = wb.Sheets[name]
  if (!ws) return null
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true })
}
const sheetByName = (wb, wanted) => wb.SheetNames.find((n) => norm(n) === norm(wanted))

// média de uma faixa "25-30" ou "30" -> número; texto original preservado
const faixa = (v) => {
  const s = txt(v)
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(?:-|a)\s*(\d+(?:[.,]\d+)?)/)
  if (m) return (Number(m[1].replace(',', '.')) + Number(m[2].replace(',', '.'))) / 2
  return num(s)
}

// ---------------------------------------------------------------- Academia
function parseAcademia(wb) {
  const out = { plan: {}, logs: { cargas: [], treinosFeitos: [] }, avisos: [] }
  const rows = rowsOf(wb, sheetByName(wb, 'Academia'))
  const treinos = {}
  const regras = []
  let cur = null
  let inRegras = false
  for (const r of rows) {
    const a = txt(r[0])
    const mt = a.match(/^TREINO\s+([A-Z])\s*:\s*(.*)$/i)
    if (mt) {
      cur = mt[1].toUpperCase()
      treinos[cur] = { letra: cur, nome: mt[2], exercicios: [] }
      inRegras = false
      continue
    }
    if (norm(a) === 'regras gerais') {
      inRegras = true
      cur = null
      continue
    }
    if (inRegras && a && txt(r[2])) {
      regras.push({ titulo: a, texto: txt(r[2]) })
      continue
    }
    if (cur && /^[A-Z]$/.test(a) && a === cur && txt(r[1])) {
      const ex = {
        id: `${cur}|${txt(r[1])}`,
        nome: txt(r[1]),
        series: num(r[2]) ?? 3,
        reps: txt(r[3]),
        descanso: txt(r[4]),
        obs: txt(r[9]),
      }
      treinos[cur].exercicios.push(ex)
      ;[5, 6, 7, 8].forEach((col, i) => {
        const kg = num(r[col])
        if (kg !== null) out.logs.cargas.push({ exId: ex.id, letra: cur, semanaCarga: i + 1, kg })
      })
    }
  }
  out.plan.treinos = treinos
  out.plan.regrasTreino = regras

  // Semana-modelo (rodízio de 2 semanas)
  const sem = rowsOf(wb, sheetByName(wb, 'Semana'))
  if (sem) {
    const letra = (s) => {
      const m = txt(s).match(/^([A-Z])(?=\s|\(|$)/)
      return m ? m[1] : null
    }
    const rodizio = { s1: {}, s2: {}, corrida: {}, horario: {} }
    let obs = []
    let inObs = false
    for (const r of sem) {
      const a = norm(r[0])
      const d = DIAS.find((k) => k === a.slice(0, 3).replace('sab', 'sab'))
      if (d && a.length <= 4) {
        rodizio.s1[d] = letra(r[1])
        rodizio.s2[d] = letra(r[2])
        rodizio.corrida[d] = txt(r[3])
        rodizio.horario[d] = txt(r[4])
        continue
      }
      if (a === 'observacoes') {
        inObs = true
        continue
      }
      if (inObs && txt(r[0])) obs.push(txt(r[0]))
    }
    out.plan.rodizio = rodizio
    out.plan.obsSemana = obs
  } else out.avisos.push('Aba "Semana" não encontrada: o rodízio A/B/C não foi importado.')

  // Frequência (marcações "Sim" por semana e dia)
  const fr = rowsOf(wb, sheetByName(wb, 'Frequência') || sheetByName(wb, 'Frequencia'))
  if (fr) {
    let start = null
    let header = null
    for (const r of fr) {
      if (norm(r[0]).startsWith('data de inicio') && typeof r[1] === 'number') start = excelToISO(r[1])
      if (norm(r[0]) === 'semana' && norm(r[2]) === 'seg') header = r
      else if (header && typeof r[0] === 'number') {
        header.forEach((h, col) => {
          const k = DIAS.find((dk) => dk === norm(h).slice(0, 3))
          if (k && isSim(r[col])) out.logs.treinosFeitos.push({ semana: r[0], dia: k })
        })
      }
    }
    if (start) out.plan.academiaInicio = start
  }
  return out
}

// ---------------------------------------------------------------- Corrida
// "6 x (1' / 2')" -> {tipo:'intervalado', reps:6, corre:1, anda:2}; "20' contínuos" -> {tipo:'continuo', corre:20}
export function parseSessao(texto) {
  const t = txt(texto)
  let m = t.match(/(\d+)\s*x\s*\(\s*(\d+)\s*['′]?\s*\/\s*(\d+)\s*['′]?\s*\)/i)
  if (m) return { tipo: 'intervalado', reps: +m[1], corre: +m[2], anda: +m[3], texto: t }
  m = t.match(/(\d+)\s*['′]\s*cont/i)
  if (m) return { tipo: 'continuo', corre: +m[1], texto: t }
  if (/teste de 5 km/i.test(t)) return { tipo: 'teste', km: 5, texto: t }
  return { tipo: 'livre', texto: t }
}

function parseCorrida(wb) {
  const out = { plan: {}, logs: { corridasFeitas: [], corridas: [] }, avisos: [] }
  const dados = rowsOf(wb, sheetByName(wb, 'Dados')) || []
  const dd = {}
  for (const r of dados) {
    const k = norm(r[0])
    if (k.startsWith('idade')) dd.idade = num(r[1])
    else if (k.startsWith('data de inicio') && typeof r[1] === 'number') dd.inicio = excelToISO(r[1])
    else if (k.startsWith('meta de tempo')) dd.meta5k = num(r[1])
    else if (['quinta', 'sabado', 'domingo'].includes(k)) {
      dd.horarios = dd.horarios || {}
      dd.horarios[k === 'quinta' ? 'qui' : k === 'sabado' ? 'sab' : 'dom'] = { hora: txt(r[1]), nota: txt(r[2]) }
    }
  }

  const rows = rowsOf(wb, sheetByName(wb, 'Corrida')) || []
  const hi = rows.findIndex((r) => norm(r[0]) === 'sem')
  const semanas = []
  const dicas = []
  if (hi >= 0) {
    const h = rows[hi].map(norm)
    const col = (pred) => h.findIndex(pred)
    const cDom = col((x) => x.startsWith('domingo'))
    const cQui = col((x) => x.startsWith('quinta'))
    const cSab = col((x) => x.startsWith('sabado'))
    const cTempo = col((x) => x.startsWith('tempo total sabado'))
    const cKm = col((x) => x.startsWith('distancia sabado'))
    const cMeta = col((x) => x.startsWith('meta da semana'))
    const cEsf = col((x) => x.startsWith('esforco medio'))
    const cObs = col((x) => x.startsWith('dor'))
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i]
      if (typeof r[0] === 'number') {
        const s = {
          sem: r[0],
          fase: txt(r[1]),
          dom: parseSessao(r[cDom]),
          qui: parseSessao(r[cQui]),
          sab: parseSessao(r[cSab]),
          sabMin: num(r[cTempo]),
          sabKm: num(r[cKm]),
          meta: txt(r[cMeta]),
        }
        semanas.push(s)
        ;[['dom', cDom], ['qui', cQui], ['sab', cSab]].forEach(([dia, c]) => {
          if (isSim(r[c + 1])) out.logs.corridasFeitas.push({ semana: r[0], dia })
        })
        if (num(r[cEsf]) !== null || txt(r[cObs])) {
          out.logs.corridasFeitas.push({ semana: r[0], resumoSemana: true, esforco: num(r[cEsf]), obs: txt(r[cObs]) })
        }
      } else if (semanas.length && norm(r[0]) !== 'total' && norm(r[1]) !== 'referencia' && txt(r[1]) && txt(r[2]) && !txt(r[0])) {
        // tabelas de texto abaixo (intensidade e regras de progressão): rótulo em B, conteúdo em C (e E)
        dicas.push({ titulo: txt(r[1]), texto: [txt(r[2]), txt(r[4])].filter(Boolean).join(' | ') })
      }
    }
  } else out.avisos.push('Aba "Corrida": tabela de semanas não encontrada.')

  const reg = rowsOf(wb, sheetByName(wb, 'Registro')) || []
  const ri = reg.findIndex((r) => norm(r[0]) === 'data')
  if (ri >= 0) {
    for (let i = ri + 1; i < reg.length; i++) {
      const r = reg[i]
      if (typeof r[0] !== 'number' || num(r[3]) === null) continue
      if (/exemplo/i.test(txt(r[8]))) continue // linha de exemplo da planilha
      out.logs.corridas.push({
        data: excelToISO(r[0]),
        min: num(r[3]),
        km: num(r[4]),
        fc: num(r[6]),
        esforco: num(r[7]),
        obs: txt(r[8]),
        origem: 'planilha',
      })
    }
  }
  out.plan.corrida = {
    inicio: dd.inicio || null,
    idade: dd.idade ?? null,
    meta5kMin: dd.meta5k ?? 45,
    horarios: dd.horarios || {},
    semanas,
    dicas,
  }
  return out
}

// ---------------------------------------------------------------- Alimentação / Suplementação
const MEAL_KEYS = [
  ['cafe', /^cafe da manha/],
  ['lancheManha', /^lanche da manha/],
  ['almoco', /^almoco/],
  ['pre', /^pre-?treino/],
  ['pos', /^pos-?treino/],
  ['lancheFac', /^lanche da faculdade/],
  ['jantar', /^jantar/],
]
const mealKey = (s) => {
  const n = norm(s)
  const f = MEAL_KEYS.find(([, re]) => re.test(n))
  return f ? f[0] : null
}
export const MEAL_NOMES = {
  cafe: 'Café da manhã',
  lancheManha: 'Lanche da manhã (whey)',
  almoco: 'Almoço',
  pre: 'Pré-treino',
  pos: 'Pós-treino (whey)',
  lancheFac: 'Lanche da faculdade',
  jantar: 'Jantar',
}

function parseAlimentacao(wb) {
  const out = {
    plan: {},
    logs: { pesagens: [], cintura: [], creatina: [], resumoSemanal: [] },
    perfil: {},
    avisos: [],
  }
  // Perfil (aba Resumo)
  const res = rowsOf(wb, sheetByName(wb, 'Resumo')) || []
  const P = out.perfil
  for (const r of res) {
    const k = norm(r[0])
    const v = r[1]
    if (k.startsWith('peso atual')) P.pesoInicial = num(v)
    else if (k.startsWith('altura')) P.altura = num(v)
    else if (k.startsWith('idade')) P.idade = num(v)
    else if (k.startsWith('sexo')) P.sexo = txt(v).toUpperCase() || 'M'
    else if (k.startsWith('fator de atividade')) P.fatorAtividade = num(v)
    else if (k.startsWith('deficit calorico')) P.deficit = num(v)
    else if (k.startsWith('proteina (g por kg')) P.protKg = num(v)
    else if (k.startsWith('gordura (g por kg')) P.gordKg = num(v)
    else if (k.startsWith('data de inicio') && typeof v === 'number') P.inicio = excelToISO(v)
  }
  const inicio = P.inicio

  // Rotina do dia
  const rot = rowsOf(wb, sheetByName(wb, 'Rotina do dia')) || []
  const rotina = []
  const fds = []
  let inFds = false
  for (const r of rot) {
    if (norm(r[0]).startsWith('fim de semana')) inFds = true
    if (norm(r[0]) === 'horario') continue
    if (/^\d{2}:\d{2}/.test(txt(r[0])) && !inFds) rotina.push({ hora: txt(r[0]), titulo: txt(r[1]), detalhe: txt(r[2]) })
    else if (inFds && ['sabado', 'domingo'].includes(norm(r[0]))) fds.push({ dia: txt(r[0]), titulo: txt(r[1]), detalhe: txt(r[2]) })
  }
  out.plan.rotina = rotina
  out.plan.rotinaFds = fds

  // Dieta
  const die = rowsOf(wb, sheetByName(wb, 'Dieta')) || []
  const distribuicao = []
  const opcoes = {}
  const dicas = []
  let mode = null // 'dist' | 'opcoes' | 'prato' | 'dicas' | 'texto'
  const montarPrato = { proteinas: [], carboidratos: [] }
  for (const r of die) {
    const a = txt(r[0])
    const na = norm(a)
    if (na === 'distribuicao do dia') mode = 'dist'
    else if (
      !txt(r[1]) &&
      !txt(r[2]) &&
      a.slice(0, 5) === a.slice(0, 5).toUpperCase() &&
      /^(cafe da manha|lanche da manha|almoco|pre-?treino|pos-?treino|lanche da faculdade|jantar)/.test(na)
    ) {
      // linha de título (só a coluna A, em maiúsculas): abre a lista de opções da refeição
      mode = /monte seu prato/.test(na) ? 'prato' : 'opcoes'
    } else if (na.startsWith('dicas para')) mode = 'dicas'
    else if (mode === 'dist') {
      if (na.startsWith('total do dia')) mode = 'texto'
      else if (na !== 'refeicao') {
        const key = mealKey(a)
        if (key) {
          distribuicao.push({
            key,
            nome: MEAL_NOMES[key],
            hora: (a.match(/\((\d{2}:\d{2})\)/) || [])[1] || '',
            kcal: num(r[1]) ?? 0,
            prot: faixa(r[2]) ?? 0,
            protTexto: txt(r[2]),
          })
        }
      }
    } else if (mode === 'opcoes') {
      const key = mealKey(a)
      if (key && txt(r[1]) && txt(r[2]) && na !== 'refeicao') {
        ;(opcoes[key] = opcoes[key] || []).push({ cod: txt(r[1]), desc: txt(r[2]) })
      }
    } else if (mode === 'prato') {
      if (na.startsWith('opcao')) {
        if (txt(r[2])) montarPrato.proteinas.push(txt(r[2]))
        if (txt(r[3])) montarPrato.carboidratos.push(txt(r[3]))
      }
    } else if (mode === 'dicas' && a && txt(r[2])) dicas.push({ titulo: a, texto: txt(r[2]) })
  }
  // lanche da faculdade é opcional e não está na tabela de distribuição
  if (opcoes.lancheFac && !distribuicao.find((d) => d.key === 'lancheFac')) {
    const jIdx = distribuicao.findIndex((d) => d.key === 'jantar')
    const item = { key: 'lancheFac', nome: MEAL_NOMES.lancheFac, hora: '20:45', kcal: 200, prot: 12, protTexto: 'opcional', opcional: true }
    distribuicao.splice(jIdx < 0 ? distribuicao.length : jIdx, 0, item)
  }
  out.plan.dieta = { distribuicao, opcoes, montarPrato, dicas }

  // Cardápio da semana
  const card = rowsOf(wb, sheetByName(wb, 'Cardápio da semana') || sheetByName(wb, 'Cardapio da semana')) || []
  const ci = card.findIndex((r) => norm(r[0]) === 'dia')
  const cardapio = {}
  if (ci >= 0) {
    const cols = card[ci].map((h) => mealKey(String(h).replace(/\(.*\)/, '').replace(/ com whey/, '').replace(/ \(opcional\)/, '')) || mealKey(norm(h)))
    // cabeçalhos: "Café", "Lanche manhã com whey", "Almoço", "Pré-treino", "Pós-treino com whey", "Lanche faculdade", "Jantar"
    const alias = (h) => {
      const n = norm(h)
      if (n.startsWith('cafe')) return 'cafe'
      if (n.startsWith('lanche manha')) return 'lancheManha'
      if (n.startsWith('almoco')) return 'almoco'
      if (n.startsWith('pre')) return 'pre'
      if (n.startsWith('pos')) return 'pos'
      if (n.startsWith('lanche fac')) return 'lancheFac'
      if (n.startsWith('jantar')) return 'jantar'
      return null
    }
    for (let i = ci + 1; i < card.length; i++) {
      const d = DIAS.find((k) => k === norm(card[i][0]).slice(0, 3))
      if (!d || norm(card[i][0]).length > 4) continue
      cardapio[d] = {}
      card[ci].forEach((h, c) => {
        const key = alias(h) || cols[c]
        if (!key) return
        const v = txt(card[i][c])
        cardapio[d][key] = v === '-' || v === '' ? null : v
      })
    }
  } else out.avisos.push('Aba "Cardápio da semana" não encontrada.')
  out.plan.dieta.cardapio = cardapio

  // Suplementação
  const sup = rowsOf(wb, sheetByName(wb, 'Suplementação') || sheetByName(wb, 'Suplementacao')) || []
  const suplementos = []
  let semHeader = null
  for (const r of sup) {
    if (norm(r[0]) === 'suplemento') {
      semHeader = 'sup'
      continue
    }
    if (norm(r[0]).startsWith('controle da creatina')) {
      semHeader = 'ctl'
      continue
    }
    if (semHeader === 'sup' && txt(r[0]) && txt(r[1])) {
      suplementos.push({ nome: txt(r[0]), dose: txt(r[1]), horario: txt(r[2]), frequencia: txt(r[3]), como: txt(r[4]), cuidados: txt(r[5]) })
    } else if (semHeader === 'ctl' && norm(r[0]) === 'semana') {
      semHeader = { cols: r.map((h) => DIAS.find((k) => k === norm(h).slice(0, 3)) || null) }
    } else if (semHeader && semHeader.cols && num(r[0]) !== null && !isFormula(r[0])) {
      semHeader.cols.forEach((k, c) => {
        if (k && isSim(r[c]) && inicio) out.logs.creatina.push(dateOf(inicio, num(r[0]), k))
      })
    }
  }
  out.plan.suplementos = suplementos

  // Acompanhamento (pesagens, cintura, resumo semanal)
  const ac = rowsOf(wb, sheetByName(wb, 'Acompanhamento')) || []
  const hi = ac.findIndex((r) => norm(r[0]) === 'semana' && norm(r[2]).startsWith('pesagem'))
  if (hi >= 0 && inicio) {
    for (let i = hi + 1; i < ac.length; i++) {
      const r = ac[i]
      const w = num(r[0])
      if (w === null) continue
      ;[2, 3, 4].forEach((c, k) => {
        const kg = num(r[c])
        if (kg !== null && !isFormula(r[c])) out.logs.pesagens.push({ data: dateOf(inicio, w, ['seg', 'qua', 'sex'][k]), kg, origem: 'planilha' })
      })
      const cm = num(r[7])
      if (cm !== null) out.logs.cintura.push({ data: dateOf(inicio, w, 'seg'), cm })
      const dp = num(r[8])
      const dd = num(r[9])
      if (dp !== null || dd !== null || txt(r[11])) out.logs.resumoSemanal.push({ semana: w, diasProteina: dp, diasDieta: dd, obs: txt(r[11]) })
    }
  } else if (hi >= 0) out.avisos.push('Acompanhamento: sem data de início no Resumo, pesagens não foram datadas.')
  return out
}

// ---------------------------------------------------------------- API pública
export function detectar(wb) {
  const nomes = wb.SheetNames.map(norm)
  if (nomes.includes('academia')) return 'academia'
  if (nomes.includes('corrida') && nomes.includes('registro')) return 'corrida'
  if (nomes.includes('dieta') && nomes.includes('resumo')) return 'alimentacao'
  return null
}

export function lerPlanilha(buffer, nomeArquivo = '') {
  const wb = XLSX.read(buffer, { type: 'array' })
  const tipo = detectar(wb)
  if (!tipo) return { tipo: null, nomeArquivo, avisos: [`Não reconheci "${nomeArquivo}". Esperado: Plano_Academia, Plano_Corrida ou Plano_Alimentacao_Suplementacao.`] }
  const r = { academia: parseAcademia, corrida: parseCorrida, alimentacao: parseAlimentacao }[tipo](wb)
  return { tipo, nomeArquivo, ...r }
}

// Resumo legível do que foi encontrado (para a tela de pré-visualização)
export function resumir(r) {
  if (!r.tipo) return []
  if (r.tipo === 'academia') {
    const t = r.plan.treinos
    const ex = Object.values(t).reduce((n, x) => n + x.exercicios.length, 0)
    return [
      `${Object.keys(t).length} treinos (${Object.keys(t).join(', ')}) com ${ex} exercícios`,
      r.plan.rodizio ? 'Rodízio de 2 semanas (A/B/C)' : null,
      `${r.logs.cargas.length} cargas registradas`,
      `${r.logs.treinosFeitos.length} treinos marcados como feitos`,
    ].filter(Boolean)
  }
  if (r.tipo === 'corrida') {
    const c = r.plan.corrida
    return [
      `${c.semanas.length} semanas de plano (meta: 5 km em ${c.meta5kMin} min)`,
      `${r.logs.corridasFeitas.filter((x) => !x.resumoSemana).length} sessões marcadas como feitas`,
      `${r.logs.corridas.length} corridas no registro`,
    ]
  }
  const d = r.plan.dieta
  return [
    `Perfil: ${r.perfil.pesoInicial} kg, ${r.perfil.altura} m, déficit ${r.perfil.deficit} kcal`,
    `${d.distribuicao.length} refeições, ${Object.values(d.opcoes).reduce((n, o) => n + o.length, 0)} opções de cardápio`,
    `Cardápio de ${Object.keys(d.cardapio).length} dias`,
    `${r.logs.pesagens.length} pesagens, ${r.logs.creatina.length} dias de creatina`,
  ]
}
