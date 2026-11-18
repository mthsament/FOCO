import { useEffect, useState } from 'react'
import { useApp } from '../store.jsx'
import { cfgLembretes, horaSugerida, montarAgenda } from '../lib/lembretes.js'
import { ativarPush, desativarPush, enviarTeste, lerCfg, permissao, salvarCfg, sincronizarAgenda, suportaPush } from '../lib/push.js'
import { toast } from './ui.jsx'
import Icon from './Icon.jsx'

const Linha = ({ ativo, onAtivo, titulo, children }) => (
  <div className="lem-linha">
    <label className="row small sp">
      <input type="checkbox" checked={!!ativo} onChange={(e) => onAtivo(e.target.checked)} />
      <span>{titulo}</span>
    </label>
    {children}
  </div>
)

export default function Lembretes() {
  const { s, update } = useApp()
  const c = cfgLembretes(s)
  const [cfg, setCfg] = useState({ url: '', token: '', ativo: false })
  const [ocupado, setOcupado] = useState(false)
  const suporta = suportaPush()

  useEffect(() => {
    lerCfg().then(setCfg)
  }, [])

  const set = (k, v) => update((x) => { x.perfil.lembretes = { ...cfgLembretes(x), [k]: { ...cfgLembretes(x)[k], ...v } } })
  const guardar = (novo) => {
    setCfg(novo)
    salvarCfg(novo)
  }
  const executar = async (fn, ok) => {
    setOcupado(true)
    try {
      await fn()
      if (ok) toast(ok)
    } catch (e) {
      toast(e.message || 'Algo deu errado.')
    } finally {
      setOcupado(false)
      lerCfg().then(setCfg)
    }
  }

  const ativar = () => executar(() => ativarPush(cfg, montarAgenda(s)), 'Notificações ativadas')
  const desativar = () => executar(() => desativarPush(cfg), 'Notificações desativadas')
  const testar = () => executar(async () => { await sincronizarAgenda(cfg, montarAgenda(s)); await enviarTeste(cfg) }, 'Teste enviado: aguarde alguns segundos')

  const preenchido = cfg.url.trim() && cfg.token.trim()

  return (
    <div className="card">
      <h2><Icon name="gota" /> Lembretes e notificações</h2>

      {!suporta && (
        <div className="note warn">
          Para receber avisos no iPhone, abra o FOCO pelo <b>ícone na tela de início</b> (Safari, Compartilhar, Adicionar à Tela de Início). Dentro do Safari comum o iOS não libera notificações.
        </div>
      )}

      <div className="row wrap" style={{ marginBottom: 8 }}>
        <span className={'chip ' + (cfg.ativo && permissao() === 'granted' ? 'ok' : 'warn')}>
          {cfg.ativo && permissao() === 'granted' ? 'Ativadas neste aparelho' : permissao() === 'denied' ? 'Bloqueadas no iPhone' : 'Desativadas'}
        </span>
      </div>

      <label className="fld">
        <span className="f">Endereço do servidor de lembretes</span>
        <input type="text" autoComplete="off" autoCapitalize="none" spellCheck="false" placeholder="https://foco-lembretes.seunome.workers.dev" value={cfg.url} onChange={(e) => guardar({ ...cfg, url: e.target.value })} />
      </label>
      <label className="fld" style={{ marginTop: 8 }}>
        <span className="f">Senha do servidor</span>
        <input type="text" autoComplete="off" autoCapitalize="none" spellCheck="false" value={cfg.token} onChange={(e) => guardar({ ...cfg, token: e.target.value })} />
      </label>

      <div className="row wrap" style={{ margin: '12px 0' }}>
        {cfg.ativo ? (
          <>
            <button className="btn pri" onClick={testar} disabled={ocupado}>Enviar teste</button>
            <button className="btn" onClick={desativar} disabled={ocupado}>Desativar</button>
          </>
        ) : (
          <button className="btn pri" onClick={ativar} disabled={ocupado || !preenchido || !suporta}>{ocupado ? 'Ativando…' : 'Ativar notificações'}</button>
        )}
      </div>
      <p className="mut small">O servidor é o Worker da pasta <b>worker</b> (passo a passo no README). Sem ele o iPhone não recebe avisos com o app fechado.</p>

      <h3 style={{ marginTop: 16 }}>O que lembrar</h3>

      <Linha ativo={c.agua.ativo} onAtivo={(v) => set('agua', { ativo: v })} titulo="Beber água (para quando a meta do dia é batida)">
        <div className="lem-campos">
          <label className="fld"><span className="f">Das</span><input type="time" value={c.agua.inicio} onChange={(e) => set('agua', { inicio: e.target.value })} /></label>
          <label className="fld"><span className="f">Até</span><input type="time" value={c.agua.fim} onChange={(e) => set('agua', { fim: e.target.value })} /></label>
          <label className="fld">
            <span className="f">A cada</span>
            <select value={c.agua.cadaMin} onChange={(e) => set('agua', { cadaMin: Number(e.target.value) })}>
              {[60, 90, 120, 150, 180].map((m) => <option key={m} value={m}>{m / 60} h</option>)}
            </select>
          </label>
        </div>
      </Linha>

      <Linha ativo={c.supl.ativo} onAtivo={(v) => set('supl', { ativo: v })} titulo="Suplementação">
        {(s.plan.suplementos || []).length === 0 ? (
          <p className="mut small">Importe a planilha de alimentação e suplementação para listar os suplementos.</p>
        ) : (
          <div className="lem-lista">
            {s.plan.suplementos.map((sp) => (
              <label key={sp.nome} className="lem-supl">
                <span className="small"><b>{sp.nome}</b>{sp.horario ? <span className="mut"> · {sp.horario}</span> : null}</span>
                <input type="time" aria-label={`Horário de ${sp.nome}`} value={c.supl.horas[sp.nome] || horaSugerida(sp.horario)} onChange={(e) => set('supl', { horas: { ...c.supl.horas, [sp.nome]: e.target.value } })} />
              </label>
            ))}
          </div>
        )}
      </Linha>

      <Linha ativo={c.refeicoes.ativo} onAtivo={(v) => set('refeicoes', { ativo: v })} titulo="Refeições (nos horários do plano de dieta)" />

      <Linha ativo={c.treino.ativo} onAtivo={(v) => set('treino', { ativo: v })} titulo="Dia de musculação">
        <div className="lem-campos"><label className="fld"><span className="f">Horário</span><input type="time" value={c.treino.hora} onChange={(e) => set('treino', { hora: e.target.value })} /></label></div>
      </Linha>

      <Linha ativo={c.corrida.ativo} onAtivo={(v) => set('corrida', { ativo: v })} titulo="Dia de corrida">
        <div className="lem-campos"><label className="fld"><span className="f">Horário</span><input type="time" value={c.corrida.hora} onChange={(e) => set('corrida', { hora: e.target.value })} /></label></div>
      </Linha>

      <Linha ativo={c.peso.ativo} onAtivo={(v) => set('peso', { ativo: v })} titulo="Pesagem em jejum (segunda, quarta e sexta)">
        <div className="lem-campos"><label className="fld"><span className="f">Horário</span><input type="time" value={c.peso.hora} onChange={(e) => set('peso', { hora: e.target.value })} /></label></div>
      </Linha>

      <p className="mut small" style={{ marginTop: 10 }}>Os avisos de treino e corrida cobrem os próximos 14 dias do plano. Abra o FOCO de vez em quando para renovar.</p>
    </div>
  )
}
