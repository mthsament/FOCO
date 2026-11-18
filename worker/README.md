# Servidor de lembretes do FOCO

Cloudflare Worker gratuito que manda os avisos (água, suplementos, refeições, treino, corrida, pesagem) ao iPhone com o app fechado.

## Instalar (uma vez, ~10 min)

Precisa de uma conta grátis em cloudflare.com e do Node instalado. Na pasta `worker`:

1. `npx wrangler login` (abre o navegador para autorizar)
2. `node ../scripts/gerar-vapid.mjs` gera duas chaves.
   Cole a **VAPID_PUBLIC** no `wrangler.toml`, em `VAPID_PUBLIC`.
3. `npx wrangler kv namespace create FOCO_KV` mostra um `id`. Cole no `wrangler.toml`, em `id`.
4. Cadastre os segredos (cada comando pergunta o valor):
   - `npx wrangler secret put VAPID_PRIVATE_JWK` (a linha JSON que o passo 2 mostrou)
   - `npx wrangler secret put VAPID_SUB` (`mailto:seuemail@exemplo.com`)
   - `npx wrangler secret put FOCO_TOKEN` (invente uma senha longa)
5. `npx wrangler deploy` mostra o endereço, tipo `https://foco-lembretes.seunome.workers.dev`.

## Ligar no app

No iPhone, abra o FOCO **pelo ícone da tela de início**, vá em Ajustes, Lembretes e notificações, cole o endereço e a senha, toque em **Ativar notificações**, aceite a permissão e toque em **Enviar teste**.

## Observações

- Pensado para uma pessoa e um aparelho: se ativar em outro aparelho, ele passa a receber no lugar do anterior.
- O horário segue o fuso do aparelho que ativou. Os avisos chegam com até 5 minutos de diferença (o servidor confere a cada 5 minutos).
- Não faça commit da chave privada nem do e-mail.
