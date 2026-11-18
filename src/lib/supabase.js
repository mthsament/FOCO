import { createClient } from '@supabase/supabase-js'

// A chave "publishable" foi feita para ficar no app: quem protege os dados é o login + as regras
// de segurança por linha (RLS) da tabela `estados`. NUNCA coloque a chave "secret" aqui.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://mpptfeitcrsegjspaduh.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_04iKFN7oYuWn7kSbtDyP-A_BfqJNfqx'

export const supabase = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } })
