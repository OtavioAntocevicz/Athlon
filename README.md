# ATHLON

Plataforma mobile-first de gestão esportiva para treinadores e alunos.

## Stack

- **Frontend:** React + Vite + PWA + Tailwind + TanStack Query
- **Backend:** Express + Supabase JS + JWT
- **Banco:** Supabase PostgreSQL
- **Storage:** Supabase Storage (comprovantes)

## Estrutura

```
apps/frontend         — PWA React
apps/backend          — API REST Express
apps/backend/supabase/migrations — schema SQL do banco
packages/shared-types — Zod schemas e tipos compartilhados
```

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com) e aplique o schema em `apps/backend/supabase/migrations/20250612000000_schema.sql` (SQL Editor ou `supabase db push`).

2. Cole em `apps/backend/.env`:
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` / `JWT_REFRESH_SECRET`
   - `VAPID_*` (opcional, para Web Push — rode `pnpm --filter @athlon/backend generate-vapid-keys`)

   Teste a conexão: `pnpm test:db`

3. Instale dependências (**use `pnpm`, não `npm`** — este projeto é monorepo):

```bash
pnpm install
```

> `npm install` na raiz quebra com erro `Cannot read properties of null (reading 'matches')`. Isso é esperado.

## Desenvolvimento

```bash
# Terminal 1 — API
pnpm dev:backend

# Terminal 2 — Frontend
pnpm dev:frontend
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Fluxo MVP

1. Treinador cria conta → cria turma com mensalidade e PIX
2. Aluno cria conta com código de convite → vê mensalidades
3. Aluno copia PIX, paga e envia comprovante
4. Treinador aprova/recusa na fila de comprovantes

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Frontend + Backend em paralelo |
| `pnpm build` | Build de produção |
| `pnpm test:db` | Testa conexão com Supabase |

Não use `npm install` neste repo — só `pnpm`.

## Licença

Software proprietário. Todos os direitos reservados a **Otávio Morais Antocevicz**.  
Consulte o arquivo [LICENSE](./LICENSE) para os termos completos de uso.
