import { useCallback, useEffect, useRef, useState } from 'react'
import { toISO } from '../lib/dates.js'
import { analisar, fmtSeg, haversine } from '../lib/corrida.js'
import { conectarFC, suportaBluetooth } from '../lib/bluetooth.js'
import RotaMapa from './RotaMapa.jsx'
import Icon from './Icon.jsx'
import { toast } from './ui.jsx'

// Gravador de corrida com o GPS do celular, no estilo do Strava.
// Mantenha a tela ligada e o app aberto durante a corrida (o navegador pausa o GPS em segundo plano).
export default function Gravador({ onFim, onFechar }) {
  const [estado, setEstado] = useState('pronto') // pronto | buscando | gravando | pausado
  const [seg, setSeg] = useState(0)
  const [dist, setDist] = useState(0)
  const [precisao, setPrecisao] = useState(null)
  const [fc, setFc] = useState(null)
  const [fcNome, setFcNome] = useState('')
  const [erro, setErro] = useState('')
  const [rota, setRota] = useState([])

  const pts = useRef([]) // { lat, lon, t, ele, hr }
  const watch = useRef(null)
  const lock = useRef(null)
  const estadoRef = useRef('pronto')
  const inicio = useRef(0)
  const pausaIni = useRef(0)
  const pausado = useRef(0) // ms acumulados em pausa
  const dRef = useRef(0)
  const fcRef = useRef(null)
  const fcConn = useRef(null)

  const muda = (e) => { estadoRef.current = e; setEstado(e) }
  const agora = () => Date.now() - pausado.current // relógio sem as pausas

  const tela = useCallback(async () => {
    try { lock.current = await navigator.wakeLock?.request('screen') } catch { /* sem wake lock */ }
  }, [])

  const parar = useCallback(() => {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current)
    watch.current = null
    lock.current?.release?.().catch(() => {})
    fcConn.current?.desconectar()
  }, [])
  useEffect(() => parar, [parar])

  // cronômetro
  useEffect(() => {
    if (estado !== 'gravando') return
    const i = setInterval(() => {
      setSeg(Math.round((agora() - inicio.current) / 1000))
      const p = pts.current
      const passo = Math.max(1, Math.ceil(p.length / 120))
      setRota(p.filter((_, k) => k % passo === 0 || k === p.length - 1).map((x, k, arr) => [x.lat, x.lon, Math.round((x.t - arr[0].t) / 1000), null, null, k]))
    }, 1000)
    return () => clearInterval(i)
  }, [estado])

  // religa o bloqueio de tela quando o app volta ao primeiro plano
  useEffect(() => {
    const h = () => document.visibilityState === 'visible' && estadoRef.current === 'gravando' && tela()
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [tela])

  const aoPosicao = (pos) => {
    const { latitude: lat, longitude: lon, altitude, accuracy } = pos.coords
    setPrecisao(Math.round(accuracy))
    if (estadoRef.current === 'buscando') {
      if (accuracy > 30) return // espera o GPS firmar
      inicio.current = agora()
      muda('gravando')
    }
    if (estadoRef.current !== 'gravando' || accuracy > 35) return
    const p = { lat, lon, t: agora(), ele: altitude, hr: fcRef.current }
    const ult = pts.current[pts.current.length - 1]
    if (ult) {
      const d = haversine(ult, p)
      if (d < 2) return // parado: ignora tremedeira do GPS
      dRef.current += d
      setDist(dRef.current)
    }
    pts.current.push(p)
  }

  const iniciar = () => {
    if (!navigator.geolocation) return setErro('Este navegador não tem GPS.')
    setErro('')
    pts.current = []
    dRef.current = 0
    pausado.current = 0
    setDist(0)
    setSeg(0)
    muda('buscando')
    tela()
    watch.current = navigator.geolocation.watchPosition(
      aoPosicao,
      (e) => {
        setErro(e.code === 1 ? 'Permissão de localização negada. Libere o GPS para o site nas configurações do navegador.' : 'Não consegui obter o sinal de GPS.')
        parar()
        muda('pronto')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
  }

  const pausar = () => { pausaIni.current = Date.now(); muda('pausado') }
  const retomar = () => { pausado.current += Date.now() - pausaIni.current; muda('gravando') }

  const finalizar = () => {
    if (estadoRef.current === 'pausado') pausado.current += Date.now() - pausaIni.current
    parar()
    const a = analisar(pts.current)
    if (!a || a.km < 0.05) {
      toast('Corrida curta demais para salvar')
      muda('pronto')
      return onFechar()
    }
    const { t0, ...resto } = a
    onFim({ data: toISO(new Date(Date.now())), ...resto, obs: 'Gravada no app', origem: 'gps' })
  }

  const ligarFc = async () => {
    try {
      fcConn.current = await conectarFC({
        onFC: (v) => { fcRef.current = v; setFc(v) },
        onFim: () => { fcRef.current = null; setFc(null); setFcNome('') },
      })
      setFcNome(fcConn.current.nome)
    } catch (e) {
      if (e?.name !== 'NotFoundError') toast('Não consegui conectar ao monitor de FC')
    }
  }

  const ritmoMedio = dist > 50 && seg > 0 ? seg / (dist / 1000) : null
  const ativo = estado === 'gravando' || estado === 'pausado'

  return (
    <div className="card gravador">
      <div className="row">
        <h2 className="sp"><Icon name="pin" /> Gravar com GPS</h2>
        {!ativo && <button className="btn sm ghost" onClick={() => { parar(); onFechar() }}>Fechar</button>}
      </div>

      {estado === 'pronto' && (
        <>
          <p className="mut small">Funciona no celular, em HTTPS. Deixe a tela ligada e o app aberto durante a corrida. O trajeto, o ritmo e os recordes são calculados quando você finalizar.</p>
          {suportaBluetooth() && (
            <div className="row wrap" style={{ marginBottom: 10 }}>
              <button className="btn sm" onClick={ligarFc}><Icon name="coracao" /> {fcNome ? `FC: ${fcNome}` : 'Conectar monitor de FC'}</button>
              <span className="mut small">Cinta ou relógio com “transmitir FC” ligado.</span>
            </div>
          )}
          {erro && <div className="note warn" style={{ marginBottom: 10 }}>{erro}</div>}
          <button className="btn pri" onClick={iniciar}><Icon name="play" /> Iniciar corrida</button>
        </>
      )}

      {estado === 'buscando' && (
        <p role="status" aria-live="polite">Buscando sinal de GPS{precisao ? ` (precisão ${precisao} m)` : ''}… Fique em área aberta. A corrida começa sozinha quando o sinal firmar.</p>
      )}

      {ativo && (
        <>
          <div className="live">
            <div className="live-clock">{fmtSeg(seg)}</div>
            <div className="live-grid">
              <div><b>{(dist / 1000).toFixed(2)}</b><span>km</span></div>
              <div><b>{ritmoMedio ? fmtSeg(ritmoMedio) : '–'}</b><span>ritmo médio /km</span></div>
              <div><b>{fc ?? '–'}</b><span>bpm</span></div>
            </div>
          </div>
          {rota.length > 2 && <RotaMapa trilha={rota} altura={220} mini />}
          <div className="row wrap" style={{ marginTop: 12 }}>
            {estado === 'gravando' ? (
              <button className="btn" onClick={pausar}><Icon name="pause" /> Pausar</button>
            ) : (
              <button className="btn pri" onClick={retomar}><Icon name="play" /> Retomar</button>
            )}
            <button className="btn danger" onClick={finalizar}><Icon name="stop" /> Finalizar</button>
            {precisao != null && <span className="mut small">GPS ±{precisao} m</span>}
          </div>
        </>
      )}
    </div>
  )
}
