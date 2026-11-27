# Segurança de contas — o que ligar no Supabase

O app já valida a senha no navegador (8+ caracteres, maiúscula, minúscula, número, caractere especial,
sem senhas comuns/sequências/dados pessoais), limita tentativas de login no aparelho e manda uma CSP no build.
Mas **regra só no navegador pode ser burlada** chamando a API direto. Por isso, ligue também no servidor:

Painel do Supabase → **Authentication**:

1. **Sign In / Providers → Email → Password requirements**
   - Minimum password length: `8`
   - Required characters: lowercase, uppercase, digits **e** symbols
   - **Prevent use of leaked passwords** (HaveIBeenPwned): ligado (exige plano Pro)
2. **Sign In / Providers → Email → Confirm email**: ligado (já está).
3. **Sign In / Providers → Email → Secure password change** (exige reautenticação para trocar senha): ligado.
4. **Rate Limits**: deixe os padrões ou reduza "Sign-ups and sign-ins" e "Token verifications" por IP.
5. **Attack Protection → CAPTCHA** (hCaptcha ou Turnstile): ligue para bloquear criação de contas por robô
   (depois é preciso passar o `captchaToken` em `signUp`/`signInWithPassword`).
6. **Sessions → Time-box / Inactivity timeout** (plano Pro): ex. 30 dias de inatividade.
7. **URL Configuration**: deixe só o endereço real do app em *Site URL* e em *Redirect URLs* (sem `*` solto).
8. **Multi-Factor Authentication (TOTP)**: opcional, mas é a maior proteção extra para contas.

Também confira que a tabela `estados` e as de amigos continuam com **RLS ligado** (`supabase/amigos.sql`)
e que a chave `secret`/`service_role` nunca entra no app.
