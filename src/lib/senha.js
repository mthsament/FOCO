// Política de senha do FOCO (usada ao criar conta e ao trocar a senha).
// Obs.: isto protege quem usa o app; a regra "de verdade" também precisa estar ligada no Supabase
// (Authentication → Sign In / Providers → Password), veja supabase/seguranca.md.

export const MIN_SENHA = 8
export const MAX_SENHA = 72 // limite do bcrypt usado pelo Supabase

const COMUNS = [
  '123456', '1234567', '12345678', '123456789', '1234567890', '123123', '111111', '000000', '654321',
  'password', 'senha', 'senha123', 'qwerty', 'qwertyuiop', 'abc123', 'abcdef', 'admin', 'letmein',
  'iloveyou', 'welcome', 'princesa', 'flamengo', 'corinthians', 'palmeiras', 'brasil', 'foco', 'foco123',
  'mudar123', 'minhasenha', 'treino', 'academia',
]

const sequencia = (s) => {
  // 4+ caracteres seguidos em ordem (abcd, 1234, 4321) ou o mesmo caractere repetido (aaaa)
  const t = s.toLowerCase()
  let asc = 1, desc = 1, igual = 1
  for (let i = 1; i < t.length; i++) {
    const d = t.charCodeAt(i) - t.charCodeAt(i - 1)
    asc = d === 1 ? asc + 1 : 1
    desc = d === -1 ? desc + 1 : 1
    igual = d === 0 ? igual + 1 : 1
    if (asc >= 4 || desc >= 4 || igual >= 4) return true
  }
  return false
}

const normaliza = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')

// Cada regra: [id, texto, passou?]
export function regras(senha = '') {
  return [
    ['tam', `Pelo menos ${MIN_SENHA} caracteres`, senha.length >= MIN_SENHA],
    ['min', 'Uma letra minúscula (a-z)', /[a-z]/.test(senha)],
    ['mai', 'Uma letra MAIÚSCULA (A-Z)', /[A-Z]/.test(senha)],
    ['num', 'Um número (0-9)', /\d/.test(senha)],
    ['esp', 'Um caractere especial (! @ # $ % & * …)', /[^A-Za-z0-9\s]/.test(senha)],
  ]
}

// Devolve '' se a senha serve, ou a mensagem do primeiro problema.
// `pessoais` = e-mail, @ e apelido (a senha não pode ser feita deles).
export function erroSenha(senha = '', pessoais = []) {
  if (/\s/.test(senha)) return 'A senha não pode ter espaços.'
  if (senha.length > MAX_SENHA) return `A senha pode ter no máximo ${MAX_SENHA} caracteres.`
  const faltando = regras(senha).find((r) => !r[2])
  if (faltando) return `Senha fraca: falta ${faltando[1].charAt(0).toLowerCase() + faltando[1].slice(1)}.`
  const n = normaliza(senha)
  if (COMUNS.some((c) => n === c || (c.length >= 6 && n.replace(/\d+$/, '') === c))) return 'Essa senha é muito comum. Escolha outra.'
  if (sequencia(senha)) return 'Evite sequências (1234, abcd) e caracteres repetidos (aaaa).'
  for (const p of pessoais) {
    const base = normaliza(String(p || '').split('@')[0])
    if (base.length >= 3 && n.includes(base)) return 'A senha não pode conter seu e-mail, @ ou apelido.'
  }
  return ''
}

// Força de 0 a 4 para a barrinha.
export function forca(senha = '', pessoais = []) {
  if (!senha) return { nivel: 0, texto: '' }
  if (erroSenha(senha, pessoais)) {
    const ok = regras(senha).filter((r) => r[2]).length
    const quase = ok >= 4 && senha.length >= MIN_SENHA
    return { nivel: quase ? 2 : 1, texto: quase ? 'Quase lá' : 'Fraca' }
  }
  if (senha.length >= 14) return { nivel: 4, texto: 'Muito forte' }
  if (senha.length >= 11) return { nivel: 3, texto: 'Forte' }
  return { nivel: 2, texto: 'Aceitável' }
}

// ---- Proteção contra tentativas de adivinhar a senha (neste aparelho) ----
// 5 erros seguidos → espera crescente (30 s, 1 min, 2 min … até 15 min). Zera ao entrar.
// O Supabase também limita no servidor; isto só evita martelar o botão.
const CHAVE = 'foco-login-falhas'
const lerFalhas = () => {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || { n: 0, ate: 0 } } catch { return { n: 0, ate: 0 } }
}
export const segundosBloqueado = () => Math.max(0, Math.ceil((lerFalhas().ate - Date.now()) / 1000))
export function registraFalha() {
  const f = lerFalhas()
  const n = f.n + 1
  const ate = n >= 5 ? Date.now() + Math.min(15 * 60, 30 * 2 ** (n - 5)) * 1000 : 0
  try { localStorage.setItem(CHAVE, JSON.stringify({ n, ate })) } catch { /* sem armazenamento */ }
}
export function limpaFalhas() {
  try { localStorage.removeItem(CHAVE) } catch { /* sem armazenamento */ }
}
