# FOCO

App (PWA) para celular e PC que controla dieta, treino e corrida a partir das suas planilhas, com ofensivas e gráficos de evolução.

## O que já faz
- **Importa as planilhas** `Plano_Academia`, `Plano_Corrida` e `Plano_Alimentacao_Suplementacao` (.xlsx). Reimportar atualiza o plano e mantém os registros.
- **Hoje**: treino do dia (rodízio A/B/C de 2 semanas), corrida do dia, refeições com troca de opção, creatina, whey, água e pesagem.
- **Treino**: séries, cargas, última carga e sugestão de progressão.
- **Dieta**: cardápio da semana editável, opções, metas calculadas (Mifflin-St Jeor) e rotina.
- **Corrida**: plano de 12 semanas, timer de intervalos com aviso sonoro, registro manual e importação de GPX/TCX.
- **Evolução**: peso, composição corporal, cintura, cargas, constância e corrida.
- **Amigos**: adicione amigos pelo código e comecem uma ofensiva em grupo (treino, dieta, água ou geral). Precisa de conta e de rodar `supabase/amigos.sql` uma vez no Supabase.
- **Backup** em JSON. Os dados ficam no aparelho (IndexedDB).

## Rodar
```bash
npm install
npm run dev        # http://localhost:5173/FOCO/
npm run build      # gera dist/
npm run test:import -- caminho/da/planilha.xlsx
```

## Publicar (GitHub Pages)
1. Suba este projeto para o repositório `FOCO`, branch `main`.
2. No GitHub: Settings → Pages → Source: **GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` publica em `https://<usuario>.github.io/FOCO/`.
4. No iPhone: abra no Safari → Compartilhar → Adicionar à Tela de Início.

## Estrutura
- `src/importer.js`: leitura das planilhas (acha as tabelas pelos cabeçalhos).
- `src/store.jsx`: estado, persistência e regra de mesclagem da importação.
- `src/lib/metrics.js`: plano do dia, ofensivas, metas e séries dos gráficos.
- `src/pages/`: telas.

## Limites conhecidos
- Sem sincronização entre aparelhos (use o backup). Próxima fase: backend.
- iPhone: PWA não lê Apple Health nem Bluetooth. Relógio entra por GPX/TCX; balança, por digitação.
- A leitura de .xlsx usa SheetJS 0.18.5 do npm: importe só planilhas suas.
