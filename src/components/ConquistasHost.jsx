import { useEffect } from 'react'
import { useApp } from '../store.jsx'
import { todayISO } from '../lib/dates.js'
import { NOME_TIER, TIERS, avaliar, idsConquistados } from '../lib/conquistas.js'
import { emitir } from '../lib/mascoteEventos.js'

// Detecta troféus novos. A primeira vez só registra o que você já tinha (sem comemorar);
// depois, cada troféu novo vira uma tela de comemoração, se foi você quem acabou de fazer a ação
// (dados que chegam da nuvem entram em silêncio).
const POSE = { bronze: 3, prata: 4, ouro: 1, platina: 5 }

export default function ConquistasHost() {
  const { s, update } = useApp()

  useEffect(() => {
    const av = avaliar(s)
    const ids = idsConquistados(av)
    const mapa = s.meta?.conquistas
    if (!mapa) {
      update((x) => { x.meta.conquistas = Object.fromEntries(ids.map((id) => [id, null])) })
      return
    }
    const novas = ids.filter((id) => !(id in mapa))
    if (!novas.length) return
    const recente = Date.now() - Date.parse(s.meta?.editadoEm || 0) < 4500
    const hoje = todayISO()
    update((x) => { for (const id of novas) x.meta.conquistas[id] = hoje })
    if (!recente) return

    // um aviso por conquista (o nível mais alto que acabou de sair); se forem muitas, junta tudo num só
    const porConquista = new Map()
    for (const id of novas) {
      const [cid, tier] = id.split(':')
      const k = TIERS.indexOf(tier)
      if (!porConquista.has(cid) || k > porConquista.get(cid)) porConquista.set(cid, k)
    }
    const avisos = [...porConquista].map(([cid, k]) => {
      const i = av.itens.find((x) => x.id === cid)
      const tier = TIERS[k]
      return { tipo: 'celebrar', pose: POSE[tier], tema: tier, medalha: { tier, icone: i.icone }, titulo: `Conquista de ${NOME_TIER[tier]}!`, sub: `${i.nome}: ${i.desc(i.metas[k])}` }
    })
    if (avisos.length > 3) emitir({ tipo: 'celebrar', pose: 1, tema: 'ouro', icone: 'trofeu', titulo: `${avisos.length} novas conquistas!`, sub: 'Veja todas na aba Conquistas.' })
    else avisos.forEach(emitir)
  }, [s])

  return null
}
