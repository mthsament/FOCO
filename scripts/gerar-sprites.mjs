// Converte os visuais da pasta Mascote-Canguru-Organizado em sprites prontos para o app:
//   src/lib/mascoteSprites.js   (HTML de cada visual, classes com prefixo "mv-")
//   src/mascote-sprites.css     (CSS escopado por visual, keyframes renomeados)
//   public/mascote/v2/*.png     (camadas usadas)
// Uso: node scripts/gerar-sprites.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const origem = join(raiz, 'Mascote-Canguru-Organizado')
const destImg = join(raiz, 'public', 'mascote', 'v2')
mkdirSync(destImg, { recursive: true })

const VISUAIS = ['forca', 'correndo', 'confiante', 'halter', 'elastico', 'yoga', 'campeao', 'natal', 'modo-foco', 'relax']

// recorta o <div> que fecha o que abre em `ini`
function blocoDiv(html, ini) {
  const re = /<div\b|<\/div>/g
  re.lastIndex = ini
  let n = 0
  for (let m; (m = re.exec(html)); ) {
    n += m[0] === '</div>' ? -1 : 1
    if (n === 0) return html.slice(ini, m.index + m[0].length)
  }
  throw new Error('div não fechado')
}

// prefixa seletores de classe; renomeia @keyframes e referências em animation
function css(txt, nome) {
  const pre = `mv-${nome}-`
  const kf = [...txt.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1])
  const renomeiaAnim = (decl) => decl.replace(/(animation(?:-name)?\s*:)([^;}]*)/g, (_, k, v) => k + v.replace(/[\w-]+/g, (t) => (kf.includes(t) ? pre + t : t)))
  const seletor = (s) => s.split(',').map((x) => `.mv-${nome} ` + x.trim().replace(/\.([A-Za-z_][\w-]*)/g, '.mv-$1')).join(',')
  let out = ''
  let i = 0
  while (i < txt.length) {
    const a = txt.indexOf('{', i)
    if (a < 0) break
    const cab = txt.slice(i, a).trim()
    let d = 1
    let j = a + 1
    while (j < txt.length && d) { if (txt[j] === '{') d++; else if (txt[j] === '}') d--; j++ }
    const corpo = txt.slice(a + 1, j - 1)
    if (cab.startsWith('@keyframes')) out += `@keyframes ${pre}${cab.split(/\s+/)[1]}{${corpo}}\n`
    else out += `${seletor(cab)}{${renomeiaAnim(corpo)}}\n`
    i = j
  }
  return out
}

const sprites = {}
let cssTotal = ''
const copiados = new Set()

for (const nome of VISUAIS) {
  const dir = join(origem, 'pages', nome)
  const tpl = readFileSync(join(dir, 'template.html'), 'utf8')
  const cfg = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'))
  const ini = tpl.indexOf('<div aria-label="Mascote canguru')
  let fig = blocoDiv(tpl, ini)
  const [, W, H] = fig.match(/position: relative; width: (\d+)px; height: (\d+)px/)

  // imagens: uuid -> arquivo copiado
  fig = fig.replace(/src="([0-9a-f-]{36})"/g, (_, id) => {
    const a = cfg.assets[id]
    if (!a) throw new Error(`${nome}: asset ${id}`)
    const arq = a.path.split('/').pop()
    if (!copiados.has(arq)) { copyFileSync(join(origem, 'assets', arq), join(destImg, arq)); copiados.add(arq) }
    return `src="__BASE__mascote/v2/${arq}" loading="lazy" decoding="async"`
  })
  fig = fig
    .replace(/sc-camel-view-box=/g, 'viewBox=')
    .replace(/<div aria-label="[^"]*" class="" role="img" style="[^"]*">/, '<div class="raiz">')
    .replace(/\saria-hidden="true"/g, ' aria-hidden="true" focusable="false"')
    .replace(/class="([^"]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map((x) => 'mv-' + x).join(' ')}"`)
    // a origem da pálpebra agora vem do CSS (topo do próprio elemento)
    .replace(/(class="mv-lid[^"]*") style="transform-origin: [^"]*"/g, '$1')
    // ids de clipPath únicos por visual
    .replace(/id="([\w-]+)"/g, `id="mv-${nome}-$1"`)
    // sombra em % do quadro, para escalar com a altura
    .replace(/(class="mv-shd" style=")([^"]*)"/, (_, p, st) => {
      const g = (k) => parseFloat(st.match(new RegExp(`${k}: (-?[\\d.]+)px`))[1])
      return `${p}position: absolute; left: ${(g('left') / W * 100).toFixed(2)}%; top: ${(g('top') / H * 100).toFixed(2)}%; width: ${(g('width') / W * 100).toFixed(2)}%; height: ${(g('height') / H * 100).toFixed(2)}%; border-radius: 50%; background: rgba(31, 42, 51, .14)"`
    })

  let estilo = readFileSync(join(dir, 'styles.css'), 'utf8')
  estilo = estilo.slice(estilo.indexOf('body{margin:0}') + 'body{margin:0}'.length)
  estilo = estilo.replace(/url\(#([\w-]+)\)/g, `url(#mv-${nome}-$1)`)
  // pálpebra: invisível por padrão e só aparece dentro da animação de piscar.
  // Assim, se a animação não rodar (movimento reduzido, pausa, navegador antigo), o olho fica aberto.
  const cssV = css(estilo, nome)
    .replace(/(@keyframes mv-[\w-]+-blink\{)[^\n]*\n/, (_, k) => `${k}0%,90%,100%{transform:scaleY(0);opacity:0}91%{opacity:1}93%,95%{transform:scaleY(1);opacity:1}96%{opacity:0}}\n`)
    .replace(/\.mv-([\w-]+) \.mv-lid\{transform-box:view-box;/, '.mv-$1 .mv-lid{opacity:0;transform-box:fill-box;transform-origin:50% 0;')
  cssTotal += `/* ${nome} */\n` + cssV
  sprites[nome] = { w: +W, h: +H, html: fig }
}

writeFileSync(
  join(raiz, 'src', 'lib', 'mascoteSprites.js'),
  `// GERADO por scripts/gerar-sprites.mjs. Não edite à mão.\nexport const SPRITES = ${JSON.stringify(sprites, null, 1)}\n`,
)
writeFileSync(join(raiz, 'src', 'mascote-sprites.css'), `/* GERADO por scripts/gerar-sprites.mjs. Não edite à mão. */\n${cssTotal}`)
console.log(`ok: ${VISUAIS.length} visuais, ${copiados.size} imagens`)
