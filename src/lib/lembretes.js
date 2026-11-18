import { addDays, todayISO } from './dates.js'
import { corridaDoDia, treinoDoDia } from './metrics.js'

// Palpite de horário a partir do texto da planilha ("Manhã", "Pós-treino", "Antes de dormir"...). O usuário ajusta.
export function horaSugerida(texto) {
  const t = String(texto || '').toLowerCase()
  if (/dormir|noite|ceia/.test(t)) return '22:00'
  if (/p[óo]s/.test(t)) return '19:30'
  if (/pr[ée]/.test(t)) return '17:00'
  if (/almo/.test(t)) return '12:30'
  if (/tarde|lanche/.test(t)) return '16:00'
  if (/jejum|manh|caf[ée]/.test(t)) return '07:30'
  return '09:00'
}

export const padrao = () => ({
  agua: { ativo: true, inicio: '08:00', fim: '21:00', cadaMin: 120 },
  supl: { ativo: true, horas: {} },
  refeicoes: { ativo: false },
  treino: { ativo: true, hora: '16:30' },
  corrida: { ativo: true, hora: '06:30' },
  peso: { ativo: false, hora: '07:00' },
})

export const cfgLembretes = (s) => {
  const p = padrao()
  const c = s.perfil.lembretes || {}
  return Object.fromEntries(Object.keys(p).map((k) => [k, { ...p[k], ...(c[k] || {}) }]))
}

const min = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + (m || 0)
}
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// Monta a lista de avisos que o servidor vai disparar. Água, suplementos e refeições repetem todo dia;
// treino, corrida e pesagem só nos dias em que o plano pede (próximos 14 dias).
export function montarAgenda(s, hoje = todayISO()) {
  const c = cfgLembretes(s)
  const itens = []
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'

  if (c.agua.ativo) {
    const passo = Math.max(30, c.agua.cadaMin)
    for (let m = min(c.agua.inicio), i = 0; m <= min(c.agua.fim) && i < 48; m += passo, i++) {
      itens.push({ id: `agua-${m}`, tipo: 'agua', titulo: 'Hora de beber água', corpo: 'Faltam {falta} para a meta de hoje.', hora: hhmm(m) })
    }
  }

  if (c.supl.ativo) {
    for (const sp of s.plan.suplementos || []) {
      const hora = c.supl.horas[sp.nome] || horaSugerida(sp.horario)
      itens.push({ id: `supl-${sp.nome}`, tipo: 'supl', titulo: `Suplemento: ${sp.nome}`, corpo: [sp.dose, sp.como].filter(Boolean).join(' · ') || 'Hora de tomar.', hora })
    }
  }

  if (c.refeicoes.ativo) {
    for (const m of s.plan.dieta?.distribuicao || []) {
      if (m.hora && !m.opcional) itens.push({ id: `ref-${m.key}`, tipo: 'refeicao', titulo: `Hora do ${m.nome}`, corpo: 'Abra o FOCO para ver o que comer.', hora: m.hora })
    }
  }

  const datas = { treino: [], corrida: [], peso: [] }
  for (let i = 0; i < 14; i++) {
    const iso = addDays(hoje, i)
    const letra = treinoDoDia(s, iso)
    const cor = corridaDoDia(s, iso)
    if (letra) datas.treino.push([iso, s.plan.treinos?.[letra]?.nome || `Treino ${letra}`])
    if (cor) datas.corrida.push([iso, cor.sessao?.texto || 'Corrida do dia'])
    const dow = new Date(iso + 'T12:00:00').getDay()
    if ([1, 3, 5].includes(dow)) datas.peso.push([iso, 'Pese-se em jejum.'])
  }
  const porDia = (tipo, cfg, titulo) => {
    for (const [iso, texto] of datas[tipo]) itens.push({ id: `${tipo}-${iso}`, tipo, titulo, corpo: texto, hora: cfg.hora, datas: [iso] })
  }
  if (c.treino.ativo) porDia('treino', c.treino, 'Dia de treino')
  if (c.corrida.ativo) porDia('corrida', c.corrida, 'Dia de corrida')
  if (c.peso.ativo) porDia('peso', c.peso, 'Hora da pesagem')

  return { tz, itens }
}
