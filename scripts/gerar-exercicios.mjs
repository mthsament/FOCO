// Converte a "Biblioteca interativa" (canguru de esqueleto SVG com 340 exercícios) para o app:
//   src/lib/exercicioAnim.js        dados (nome, grupo, animação, equipamentos) + molde do SVG
//   src/exercicio-anim.css          animações das articulações (classes e keyframes com prefixo "ca-")
// Uso: node scripts/gerar-exercicios.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(join(raiz, 'Biblioteca interativa-html', 'Biblioteca.dc.html'), 'utf8')

// ---------- dados (do script da biblioteca) ----------
const script = html.slice(html.indexOf('<script type="text/x-dc" data-dc-script'))
const arr = (nome) => {
  const i = script.indexOf(`const ${nome} = [`) + `const ${nome} = `.length
  let d = 0, j = i
  for (; j < script.length; j++) { if (script[j] === '[') d++; else if (script[j] === ']' && --d === 0) break }
  return JSON.parse(script.slice(i, j + 1))
}
const D = arr('D')
const GR = arr('GR')
const usadas = new Set(D.map((d) => d[2]))

// ---------- CSS ----------
const estilo = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'))
const nomesKf = new Set([...estilo.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]))
const blocos = []
for (let i = 0; i < estilo.length; ) {
  const a = estilo.indexOf('{', i)
  if (a < 0) break
  const cab = estilo.slice(i, a).trim()
  let d = 1, j = a + 1
  for (; j < estilo.length && d; j++) { if (estilo[j] === '{') d++; else if (estilo[j] === '}') d-- }
  blocos.push([cab, estilo.slice(a + 1, j - 1)])
  i = j
}
let css = ''
for (const [cab, corpo] of blocos) {
  if (/exbtn|chip|^body/.test(cab)) continue
  const n = cab.match(/\bt(\d+)-/)
  if (n && !usadas.has(+n[1])) continue
  const anim = (t) => t.replace(/(animation(?:-name)?:)([^;}]*)/g, (_, k, v) => k + v.replace(/[\w-]+/g, (x) => (nomesKf.has(x) ? 'ca-' + x : x)))
  if (cab.startsWith('@keyframes')) css += `@keyframes ca-${cab.split(/\s+/)[1]}{${corpo}}\n`
  else css += `${cab.replace(/\.([A-Za-z_][\w-]*)/g, '.ca-$1')}{${anim(corpo)}}\n`
}

// ---------- molde do SVG ----------
const a = html.indexOf('<svg width="672"')
let svg = html.slice(a, html.indexOf('</svg>', a) + 6)
svg = svg
  .replace(/class="([^"{]*)"/g, (_, c) => `class="${c.split(/\s+/).filter(Boolean).map((x) => 'ca-' + x).join(' ')}"`)
  .replace(/^<svg width="672" height="640" viewBox="0 0 420 400" role="img" aria-label="[^"]*">/, '<svg class="ca-svg" width="100%" height="100%" viewBox="0 0 420 400" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">')
if (!svg.startsWith('<svg class="ca-svg"')) throw new Error('cabeçalho do SVG inesperado')

const saida =
  `// GERADO por scripts/gerar-exercicios.mjs a partir da Biblioteca interativa. Não edite à mão.\n` +
  `// D: [nome, grupo, animação, equip. mão distante, equip. mão próxima, props do cenário, equip. nos pés]\n` +
  `export const D = ${JSON.stringify(D)}\nexport const GR = ${JSON.stringify(GR)}\nexport const TPL = ${JSON.stringify(svg)}\n`
writeFileSync(join(raiz, 'src', 'lib', 'exercicioAnim.js'), saida)
writeFileSync(join(raiz, 'src', 'exercicio-anim.css'), `/* GERADO por scripts/gerar-exercicios.mjs. Não edite à mão. */\n${css}`)
console.log(`ok: ${D.length} exercícios, ${usadas.size} animações, css ${(css.length / 1024).toFixed(0)} KB`)
