import { aguaDoDia, corridaDoDia, metaAgua, pesagensOrdenadas, pesoAtual, refeicoesDoDia, sequencia, sequenciaAgua, statusDia, treinoDoDia } from './metrics.js'
import { diffDays, todayISO } from './dates.js'
import { fmtSeg, recordes } from './corrida.js'
import { avaliar } from './conquistas.js'

// Escolhe a pose, a animação e a fala do mascote conforme o seu dia.
const MARCOS = [3, 5, 7, 10, 14, 21, 30, 50, 100]
const L = (ml) => (ml / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export function mascoteDoDia(s, iso, hora = new Date().getHours()) {
  const st = statusDia(s, iso)
  const letra = treinoDoDia(s, iso)
  const cor = corridaDoDia(s, iso)
  const ml = aguaDoDia(s, iso)
  const meta = metaAgua(s)
  const aguaOk = ml >= meta
  const treinoFeito = !!s.logs.treinos[iso]?.feito
  const corFeita = cor && (s.logs.corridasFeitas[cor.key] || s.logs.corridas.some((c) => c.data === iso))
  const seqT = sequencia(s, 'treino').atual
  const seqA = sequenciaAgua(s)

  if (st.treino === 'ok' && MARCOS.includes(seqT)) return { pose: 1, anim: 'celebra', fala: `${seqT} dias seguidos de treino! Isso é constância.` }
  if (seqA.hojeOk && MARCOS.includes(seqA.atual)) return { pose: 5, anim: 'celebra', fala: `${seqA.atual} dias seguidos batendo a meta de água!` }
  if (st.treino === 'ok' && aguaOk) return { pose: 1, anim: 'celebra', fala: 'Treino feito e água em dia. Dia ganho!' }
  if (st.treino === 'ok') return { pose: 1, anim: 'pula', fala: 'Treino feito! Agora cuide da dieta e da água.' }
  if (letra && !treinoFeito) return { pose: 4, anim: 'treina', fala: `Hoje é dia de treino ${letra}. Bora levantar peso?` }
  if (cor && !corFeita) return { pose: 2, anim: 'corre', fala: `Dia de corrida: ${cor.sessao.texto}. Cada km conta.` }
  if (aguaOk) return { pose: 5, anim: 'pula', fala: 'Meta de água batida. Hidratação em dia!' }
  if (hora >= 14 && ml < meta * 0.5) return { pose: 5, anim: 'pula', fala: `Só ${L(ml)} L hoje. Faltam ${L(meta - ml)} L, bora beber água!` }
  if (!letra && !cor) return { pose: 6, anim: 'idle', fala: 'Dia de descanso. Alongue um pouco e se hidrate.' }
  return { pose: 3, anim: 'idle', fala: 'Foco no plano de hoje.' }
}

// ---------- Uma fala por aba ----------
const v = (n) => String(n).replace('.', ',')

export function mascoteDaAba(aba, s, { sync } = {}) {
  const iso = todayISO()
  const hora = new Date().getHours()
  switch (aba) {
    case 'treino': {
      if (!s.plan.treinos) return { pose: 4, anim: 'idle', fala: 'Importe o seu plano de treino e eu acompanho cada série.' }
      const letra = treinoDoDia(s, iso)
      if (!letra) return { pose: 6, anim: 'idle', fala: 'Hoje não tem musculação. Recuperar também é treinar.' }
      if (s.logs.treinos[iso]?.feito) return { pose: 1, anim: 'pula', fala: 'Treino concluído! Agora descanse e se alimente bem.' }
      const nome = s.plan.treinos[letra]?.nome
      return { pose: 4, anim: 'treina', fala: `Treino ${letra}${nome ? `: ${nome}` : ''}. Marque cada série e bora!` }
    }
    case 'dieta': {
      if (!s.plan.dieta) return { pose: 3, anim: 'idle', fala: 'Importe a planilha de alimentação e eu cuido do cardápio com você.' }
      const refs = refeicoesDoDia(s, iso).filter((m) => !m.opcional)
      if (!refs.length) return { pose: 3, anim: 'idle', fala: 'Sem refeições planejadas hoje. Mantenha a hidratação em dia.' }
      const f = refs.filter((m) => m.feita).length
      if (f === refs.length) return { pose: 1, anim: 'pula', fala: 'Todas as refeições de hoje feitas. Excelente!' }
      const agua = hora >= 12 && aguaDoDia(s, iso) < metaAgua(s) * 0.5 ? ' E a água?' : ''
      return { pose: 3, anim: 'idle', fala: `${f} de ${refs.length} refeições feitas hoje.${agua}` }
    }
    case 'corrida': {
      const cor = corridaDoDia(s, iso)
      const feita = cor && (s.logs.corridasFeitas[cor.key] || s.logs.corridas.some((c) => c.data === iso))
      if (cor && !feita) return { pose: 2, anim: 'corre', fala: `Dia de corrida: ${cor.sessao.texto}. Bora?` }
      const lista = s.logs.corridas
      if (lista.length) {
        const r5 = recordes(lista).atuais['5000']
        if (r5) return { pose: 2, anim: 'pula', fala: `Seu recorde de 5 km é ${fmtSeg(r5.seg)}. Dá para melhorar?` }
        const km = Math.round(lista.reduce((a, c) => a + (c.km || 0), 0) * 10) / 10
        return { pose: 2, anim: 'idle', fala: `${lista.length} ${lista.length === 1 ? 'corrida' : 'corridas'} e ${v(km)} km no total.` }
      }
      return { pose: 2, anim: 'idle', fala: 'Grave pelo GPS ou importe do relógio para eu acompanhar suas corridas.' }
    }
    case 'evolucao': {
      const pes = pesagensOrdenadas(s)
      const u = pes[pes.length - 1]
      if (!u) return { pose: 3, anim: 'idle', fala: 'Suba na balança em jejum, 3 vezes por semana, e registre na seção Medir.' }
      const dias = diffDays(iso, u.data)
      if (dias >= 4) return { pose: 3, anim: 'idle', fala: `Última pesagem há ${dias} dias (${v(u.kg)} kg). Hora de pesar!` }
      const base = s.perfil.pesoInicial || pesagensOrdenadas(s)[0]?.kg
      const atual = pesoAtual(s)
      if (base && atual && Math.abs(atual - base) >= 0.1) {
        const d = Math.round((atual - base) * 10) / 10
        return d < 0
          ? { pose: 1, anim: 'forca', fala: `${v(Math.abs(d))} kg a menos desde o início. Continue assim!` }
          : { pose: 3, anim: 'idle', fala: `${v(d)} kg a mais desde o início. Vale revisar dieta e treino.` }
      }
      return { pose: 3, anim: 'idle', fala: 'Registre peso, cargas e corridas e eu mostro a sua evolução aqui.' }
    }
    case 'conquistas': {
      const av = avaliar(s)
      if (!av.trofeus) return { pose: 5, anim: 'pula', fala: 'Bata a sua primeira meta para ganhar o primeiro troféu!' }
      if (av.porTier.platina) return { pose: 1, anim: 'celebra', fala: `${av.trofeus} troféus, ${av.porTier.platina} de platina. Lenda!` }
      const p = av.proximas[0]
      return { pose: 1, anim: 'forca', fala: `${av.trofeus} troféus conquistados.${p ? ` Próxima meta: ${p.nome}.` : ''}` }
    }
    case 'amigos':
      return { pose: 1, anim: 'pula', fala: 'Ofensiva em dupla é muito mais difícil de largar. Chame um amigo e comecem juntos!' }
    case 'config':
      return sync?.sessao
        ? { pose: 6, anim: 'idle', fala: 'Tudo sincronizado com a sua conta. Faça um backup de vez em quando.' }
        : { pose: 6, anim: 'idle', fala: 'Entre na sua conta para levar os dados entre o celular e o computador.' }
    default:
      return { pose: 3, anim: 'idle', fala: 'Foco!' }
  }
}

// ---------- Qual visual (sprite animado) mostrar ----------
// Cada pose antiga tem um visual base. Por cima dele entram os visuais temáticos:
//   celebra -> Campeão (medalha + confete) · treina -> Modo foco (faixa de suor)
//   dezembro (até o dia 26) -> Natal · fim de semana em descanso -> Relax
const VISUAL_DA_POSE = { 1: 'forca', 2: 'correndo', 3: 'confiante', 4: 'halter', 5: 'elastico', 6: 'yoga' }
export function visualDe(pose = 3, anim = 'idle', data = new Date()) {
  if (anim === 'celebra') return 'campeao'
  if (anim === 'treina') return 'modo-foco'
  if (anim === 'idle' && (pose === 3 || pose === 6)) {
    if (data.getMonth() === 11 && data.getDate() <= 26) return 'natal'
    if (data.getDay() === 0 || data.getDay() === 6) return 'relax'
  }
  return VISUAL_DA_POSE[pose] || 'confiante'
}
