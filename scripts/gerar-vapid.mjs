// Gera o par de chaves VAPID usado pelas notificações. Rode uma vez: node scripts/gerar-vapid.mjs
// Guarde a chave privada só no Cloudflare (secret). Não publique nem faça commit dela.
import { webcrypto as c } from 'node:crypto'

const par = await c.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const jwk = await c.subtle.exportKey('jwk', par.privateKey)
const b = (s) => Buffer.from(s, 'base64url')
const publica = Buffer.concat([Buffer.from([4]), b(jwk.x), b(jwk.y)]).toString('base64url')
const privada = JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d })

console.log('VAPID_PUBLIC (vai no wrangler.toml, em [vars]):\n' + publica + '\n')
console.log('VAPID_PRIVATE_JWK (secret, NÃO divulgue):\n' + privada)
