import { addDays, diffDays, todayISO } from './dates.js'
import { aguaDoDia, inicioDoPlano, metaAgua, pesagensOrdenadas, pesoAtual, sequencia, sequenciaAgua, statusDia } from './metrics.js'
import { recordes } from './corrida.js'

// Conquistas: cada uma tem 4 níveis (bronze, prata, ouro, platina) com metas crescentes.
// O progresso é calculado a partir dos seus registros, então nada precisa ser marcado à mão.
export const TIERS = ['bronze', 'prata', 'ouro', 'platina']
export const NOME_TIER = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', platina: 'Platina' }
export const CATEGORIAS = [
  ['treino', 'Treino'],
  ['alimentacao', 'Alimentação'],
  ['corrida', 'Corrida'],
  ['corpo', 'Corpo'],
  ['constancia', 'Constância'],
]

const r1 = (n) => Math.round(n * 10) / 10
export const fmtNum = (n) => String(n).replace('.', ',')
const SINGULAR = { dias: 'dia', treinos: 'treino', corridas: 'corrida', pesagens: 'pesagem', 'medições': 'medição', recordes: 'recorde' }
export const unidade = (n, un) => (n === 1 ? SINGULAR[un] || un : un)

export function estatisticas(s, hoje = todayISO()) {
  const meta = metaAgua(s)
  const treinosFeitos = Object.values(s.logs.treinos).filter((t) => t?.feito).length
  let diasAgua = 0
  let ml = 0
  for (const v of Object.values(s.logs.dieta)) {
    const a = v?.agua || 0
    ml += a
    if (a >= meta) diasAgua++
  }

  // dias "perfeitos": treino (ou descanso), dieta e água em dia
  const ini = inicioDoPlano(s)
  const comAgua = Object.keys(s.logs.dieta).filter((d) => s.logs.dieta[d]?.agua > 0 && d <= hoje).sort()
  const comeco = [ini, comAgua[0]].filter(Boolean).sort()[0]
  let perfeitos = 0
  if (comeco && comeco <= hoje) {
    const total = diffDays(hoje, comeco)
    for (let i = 0; i <= total; i++) {
      const iso = addDays(comeco, i)
      const st = statusDia(s, iso, hoje)
      if ((st.treino === 'ok' || st.treino === 'rest') && st.dieta === 'ok' && aguaDoDia(s, iso) >= meta) perfeitos++
    }
  }

  const cor = s.logs.corridas
  const rec = recordes(cor)
  const pes = pesagensOrdenadas(s)
  const base = s.perfil.pesoInicial || pes[0]?.kg
  const atual = pesoAtual(s)

  return {
    treinosFeitos,
    seqTreino: sequencia(s, 'treino').melhor,
    seqDieta: sequencia(s, 'dieta').melhor,
    seqCreatina: sequencia(s, 'creatina').melhor,
    diasAgua,
    seqAgua: sequenciaAgua(s).melhor,
    litros: Math.floor(ml / 1000),
    corridas: cor.length,
    km: r1(cor.reduce((a, c) => a + (c.km || 0), 0)),
    maiorKm: cor.reduce((m, c) => Math.max(m, c.km || 0), 0),
    subida: Math.round(cor.reduce((a, c) => a + (c.subida || 0), 0)),
    recordes: Object.values(rec.porCorrida).flat().filter((x) => x.anterior != null).length,
    pesagens: pes.length,
    composicoes: pes.filter((p) => p.gordura != null).length,
    perdido: base && atual ? r1(Math.max(0, base - atual)) : 0,
    perfeitos,
  }
}

export const CATALOGO = [
  { id: 'treinos', cat: 'treino', nome: 'Rato de academia', icone: 'treino', metas: [5, 25, 75, 200], un: 'treinos', desc: (m) => `Conclua ${m} treinos`, v: (e) => e.treinosFeitos },
  { id: 'seq-treino', cat: 'treino', nome: 'Sequência de ferro', icone: 'flame', metas: [3, 7, 21, 60], un: 'dias', desc: (m) => `Ofensiva de treino de ${m} dias`, v: (e) => e.seqTreino },
  { id: 'seq-dieta', cat: 'alimentacao', nome: 'Prato certo', icone: 'dieta', metas: [3, 7, 21, 60], un: 'dias', desc: (m) => `Ofensiva de dieta de ${m} dias`, v: (e) => e.seqDieta },
  { id: 'seq-creatina', cat: 'alimentacao', nome: 'Química perfeita', icone: 'bolt', metas: [7, 21, 60, 180], un: 'dias', desc: (m) => `Creatina em dia por ${m} dias seguidos`, v: (e) => e.seqCreatina },
  { id: 'agua-dias', cat: 'alimentacao', nome: 'Bem hidratado', icone: 'gota', metas: [3, 15, 50, 150], un: 'dias', desc: (m) => `Bata a meta de água em ${m} dias`, v: (e) => e.diasAgua },
  { id: 'seq-agua', cat: 'alimentacao', nome: 'Maré cheia', icone: 'gota', metas: [3, 7, 21, 60], un: 'dias', desc: (m) => `Ofensiva de água de ${m} dias`, v: (e) => e.seqAgua },
  { id: 'agua-litros', cat: 'alimentacao', nome: 'Oceano', icone: 'gota', metas: [50, 250, 1000, 3000], un: 'L', desc: (m) => `Beba ${m} litros de água no total`, v: (e) => e.litros },
  { id: 'corridas-n', cat: 'corrida', nome: 'Pé na estrada', icone: 'corrida', metas: [3, 15, 50, 150], un: 'corridas', desc: (m) => `Registre ${m} corridas`, v: (e) => e.corridas },
  { id: 'corrida-km', cat: 'corrida', nome: 'Quilômetros rodados', icone: 'rota', metas: [10, 50, 200, 500], un: 'km', desc: (m) => `Corra ${m} km no total`, v: (e) => e.km },
  { id: 'corrida-longa', cat: 'corrida', nome: 'Longa distância', icone: 'pin', metas: [5, 10, 21.1, 42.2], un: 'km', desc: (m) => `Faça uma corrida de ${fmtNum(m)} km`, v: (e) => r1(e.maiorKm) },
  { id: 'corrida-subida', cat: 'corrida', nome: 'Montanhista', icone: 'montanha', metas: [100, 500, 2000, 8000], un: 'm', desc: (m) => `Acumule ${m} m de subida`, v: (e) => e.subida },
  { id: 'recordes', cat: 'corrida', nome: 'Quebrando marcas', icone: 'trofeu', metas: [1, 5, 15, 40], un: 'recordes', desc: (m) => `Bata ${m} ${m === 1 ? 'recorde pessoal' : 'recordes pessoais'}`, v: (e) => e.recordes },
  { id: 'pesagens', cat: 'corpo', nome: 'Na balança', icone: 'bio', metas: [3, 15, 50, 150], un: 'pesagens', desc: (m) => `Registre ${m} pesagens`, v: (e) => e.pesagens },
  { id: 'composicao', cat: 'corpo', nome: 'Raio-x do corpo', icone: 'bio', metas: [1, 5, 20, 50], un: 'medições', desc: (m) => `Registre ${m} ${m === 1 ? 'medição' : 'medições'} com composição corporal`, v: (e) => e.composicoes },
  { id: 'peso-perdido', cat: 'corpo', nome: 'Transformação', icone: 'evolucao', metas: [1, 3, 5, 10], un: 'kg', desc: (m) => `Perca ${m} kg desde o início`, v: (e) => e.perdido },
  { id: 'dias-perfeitos', cat: 'constancia', nome: 'Dia perfeito', icone: 'hoje', metas: [1, 7, 21, 60], un: 'dias', desc: (m) => `${m} ${m === 1 ? 'dia' : 'dias'} com treino, dieta e água em dia`, v: (e) => e.perfeitos },
]

export function avaliar(s, hoje = todayISO()) {
  const est = estatisticas(s, hoje)
  const itens = CATALOGO.map((d) => {
    const valor = d.v(est)
    const nivel = d.metas.filter((m) => valor >= m).length
    const proxima = d.metas[nivel] ?? null
    return {
      ...d,
      valor,
      nivel,
      proxima,
      pct: proxima ? Math.min(1, valor / proxima) : 1,
      tiers: d.metas.map((m, i) => ({ tier: TIERS[i], meta: m, ok: valor >= m })),
    }
  })
  const total = itens.length * TIERS.length
  const trofeus = itens.reduce((a, i) => a + i.nivel, 0)
  const porTier = Object.fromEntries(TIERS.map((t, k) => [t, itens.filter((i) => i.nivel > k).length]))
  const porCat = Object.fromEntries(CATEGORIAS.map(([c]) => {
    const g = itens.filter((i) => i.cat === c)
    return [c, { trofeus: g.reduce((a, i) => a + i.nivel, 0), total: g.length * TIERS.length }]
  }))
  const proximas = itens.filter((i) => i.proxima && i.valor > 0).sort((a, b) => b.pct - a.pct).slice(0, 4)
  return { itens, total, trofeus, pct: total ? trofeus / total : 0, porTier, porCat, proximas }
}

// ids de cada troféu conquistado ("treinos:bronze"), usados para detectar conquistas novas
export const idsConquistados = (av) => av.itens.flatMap((i) => i.tiers.filter((t) => t.ok).map((t) => `${i.id}:${t.tier}`))
