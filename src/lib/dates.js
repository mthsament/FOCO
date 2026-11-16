// Datas sempre como string ISO local "YYYY-MM-DD" (sem fuso) para evitar erros de virada de dia.
const pad = (n) => String(n).padStart(2, '0')

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const todayISO = () => toISO(new Date())
export const addDays = (iso, n) => {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const diffDays = (a, b) => Math.round((fromISO(a) - fromISO(b)) / 86400000)

// Serial do Excel -> ISO (as planilhas guardam datas como número de dias desde 1899-12-30).
export const excelToISO = (serial) => {
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

// Dias da semana começando na segunda (como nas planilhas).
export const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
export const DIAS_LABEL = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' }
export const DIAS_LONGO = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' }

// 0 = segunda ... 6 = domingo
export const weekdayIndex = (iso) => (fromISO(iso).getDay() + 6) % 7
export const weekdayKey = (iso) => DIAS[weekdayIndex(iso)]

// Número da semana do plano (1 = semana de início). Pode ser <1 ou >12.
export const planWeek = (iso, startISO) => Math.floor(diffDays(iso, mondayOf(startISO)) / 7) + 1
export const mondayOf = (iso) => addDays(iso, -weekdayIndex(iso))
export const weekStart = (startISO, week) => addDays(mondayOf(startISO), 7 * (week - 1))
export const dateOf = (startISO, week, diaKey) => addDays(weekStart(startISO, week), DIAS.indexOf(diaKey))

export const fmtBR = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
export const fmtCurto = (iso) => {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
export const fmtLongo = (iso) =>
  fromISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
