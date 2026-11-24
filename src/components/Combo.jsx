import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Campo com busca: clique para ver a lista completa e escolher, ou digite para ir filtrando.
// options: [{ chave, valor, sub? }]  ·  livre: aceita o texto digitado como valor próprio.
const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function Destaque({ texto, termos }) {
  if (!termos.length) return texto
  const n = norm(texto)
  const marcas = new Array(texto.length).fill(false)
  for (const t of termos) for (let i = n.indexOf(t); i >= 0; i = n.indexOf(t, i + t.length)) for (let k = i; k < i + t.length; k++) marcas[k] = true
  const partes = []
  for (let i = 0; i < texto.length; ) {
    let j = i
    while (j < texto.length && marcas[j] === marcas[i]) j++
    partes.push(marcas[i] ? <mark key={i}>{texto.slice(i, j)}</mark> : texto.slice(i, j))
    i = j
  }
  return partes
}

export default function Combo({ value, options, onPick, placeholder, ariaLabel, livre = false, vazio = 'Nada encontrado' }) {
  const id = useId()
  const [aberto, setAberto] = useState(false)
  const [q, setQ] = useState('')
  const [ativo, setAtivo] = useState(0)
  const inp = useRef(null)
  const lista = useRef(null)

  const termos = useMemo(() => norm(q).split(/\s+/).filter(Boolean), [q])
  const achados = useMemo(
    () => options.filter((o) => { const alvo = norm(o.valor + ' ' + (o.sub || '')); return termos.every((t) => alvo.includes(t)) }),
    [options, termos],
  )
  const textoLivre = q.trim()
  const oferecerLivre = livre && textoLivre && !options.some((o) => norm(o.valor) === norm(textoLivre))
  const itens = oferecerLivre ? [...achados, { chave: '__livre__', valor: textoLivre, livre: true }] : achados

  useEffect(() => { setAtivo(0) }, [q, aberto])
  useEffect(() => {
    if (!aberto) return
    lista.current?.querySelector('[data-ativo="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [ativo, aberto])

  const escolher = (o) => {
    if (!o) return
    onPick(o)
    setAberto(false)
    setQ('')
    inp.current?.blur()
  }
  const tecla = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAberto(true); setAtivo((a) => Math.min(itens.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { if (aberto) { e.preventDefault(); escolher(itens[ativo]) } }
    else if (e.key === 'Escape') { setAberto(false); setQ(''); inp.current?.blur() }
  }

  return (
    <div className="combo">
      <input
        ref={inp}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={id}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={aberto ? q : value || ''}
        onFocus={() => { setAberto(true); setQ('') }}
        onBlur={() => { setAberto(false); setQ('') }}
        onChange={(e) => { setQ(e.target.value); setAberto(true) }}
        onKeyDown={tecla}
      />
      <svg className="combo-seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      {aberto && (
        <ul className="combo-lista" id={id} role="listbox" ref={lista} onMouseDown={(e) => e.preventDefault()}>
          {itens.length === 0 && <li className="combo-vazio">{vazio}</li>}
          {itens.map((o, i) => (
            <li
              key={o.chave || o.valor}
              role="option"
              aria-selected={o.valor === value}
              data-ativo={i === ativo}
              className={'combo-item' + (i === ativo ? ' ativo' : '') + (o.valor === value && !o.livre ? ' atual' : '') + (o.livre ? ' livre' : '')}
              onMouseEnter={() => setAtivo(i)}
              onClick={() => escolher(o)}
            >
              {o.livre ? <span>Usar “<b>{o.valor}</b>” como exercício próprio</span> : (
                <>
                  <span><Destaque texto={o.valor} termos={termos} /></span>
                  {o.sub && <small>{o.sub}</small>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
