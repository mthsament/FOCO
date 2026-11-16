import fs from 'node:fs'
import { lerPlanilha, resumir } from '../src/importer.js'
for (const f of process.argv.slice(2)) {
  const buf = fs.readFileSync(f)
  const r = lerPlanilha(new Uint8Array(buf), f.split('/').pop())
  console.log('\n==', r.tipo, f.split('/').pop())
  console.log(resumir(r))
  if (r.avisos?.length) console.log('avisos:', r.avisos)
  if (process.env.DUMP) console.log(JSON.stringify(r, null, 1))
}
