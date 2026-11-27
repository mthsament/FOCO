import { useState } from 'react'
import { forca, regras } from '../lib/senha.js'

// Campo de senha com "Mostrar/Ocultar". Com `politica`, mostra a barra de força e a lista de requisitos.
export default function CampoSenha({ rotulo = 'Senha', value, onChange, novo = false, politica = false, pessoais = [], placeholder, autoFocus }) {
  const [ver, setVer] = useState(false)
  const f = forca(value, pessoais)
  return (
    <>
      <label className="fld"><span className="f">{rotulo}</span>
        <span className="ent-senha">
          <input
            type={ver ? 'text' : 'password'}
            autoComplete={novo ? 'new-password' : 'current-password'}
            autoFocus={autoFocus}
            maxLength={72}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            aria-describedby={politica ? 'senha-regras' : undefined}
            required
          />
          <button type="button" className="btn sm ghost" onClick={() => setVer((v) => !v)} aria-pressed={ver}>{ver ? 'Ocultar' : 'Mostrar'}</button>
        </span>
      </label>
      {politica && (
        <div id="senha-regras" className="senha-pol">
          <div className="senha-barra" data-n={f.nivel} role="img" aria-label={f.texto ? `Força da senha: ${f.texto}` : 'Digite uma senha'}>
            <i /><i /><i /><i />
          </div>
          {f.texto && <small className="senha-forca" data-n={f.nivel}>{f.texto}</small>}
          <ul>
            {regras(value).map(([id, txt, ok]) => (
              <li key={id} className={value ? (ok ? 'ok' : 'ruim') : ''}>
                <span aria-hidden="true">{ok ? '✓' : '○'}</span> {txt}
                <span className="sr">{ok ? ' — ok' : ' — falta'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
