import { memo, useMemo } from 'react'
import { SPRITES } from '../lib/mascoteSprites.js'
import '../mascote-sprites.css'

// Um visual do mascote: várias camadas de imagem + SVG, animadas só com CSS (ver mascote-sprites.css).
// O HTML vem de scripts/gerar-sprites.mjs, nunca de entrada do usuário.
const base = import.meta.env.BASE_URL

function MascoteSprite({ visual, altura = 130, className = '', rotulo = 'Canguru mascote do FOCO' }) {
  const sp = SPRITES[visual]
  const html = useMemo(() => (sp ? { __html: sp.html.replaceAll('__BASE__', base) } : null), [sp])
  if (!sp) return null
  return (
    <span
      role="img"
      aria-label={rotulo}
      className={`mv mv-${visual} ${className}`}
      style={{ height: altura, aspectRatio: `${sp.w} / ${sp.h}` }}
      dangerouslySetInnerHTML={html}
    />
  )
}
export default memo(MascoteSprite)
