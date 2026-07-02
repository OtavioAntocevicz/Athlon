# ATHLON

Plataforma mobile-first de gestão esportiva para treinadores e alunos.

Disponível como **PWA instalável** no celular (Android: prompt nativo; iOS: tutorial manual) e no **navegador**.

## Stack

- **Frontend:** React + Vite + PWA + Tailwind + TanStack Query
- **Backend:** Express + Supabase JS + JWT
- **Banco:** Supabase PostgreSQL
- **Storage:** Supabase Storage (comprovantes)
- **Push:** Web Push (VAPID)

## Estrutura

```
apps/frontend         - PWA React (fonte de verdade da UI)
apps/backend          - API REST Express
apps/backend/supabase/migrations - schema SQL do banco
packages/shared-types - Zod schemas e tipos compartilhados
```

## Documentação

Documentação completa do sistema (jornadas, APIs, banco, deploy, env vars): **[docs/DOCUMENTACAO.md](./docs/DOCUMENTACAO.md)**

## Configuração

1. Crie um projeto no [Supabase](https://supabase.com) e aplique o schema em `apps/backend/supabase/migrations/20250612000000_schema.sql` (SQL Editor ou `supabase db push`).

2. Em bancos já existentes, aplique também as migrations incrementais em `apps/backend/supabase/migrations/`.

3. Cole em `apps/backend/.env`:
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET` / `JWT_REFRESH_SECRET`
   - `VAPID_*` (opcional, para Web Push - rode `pnpm --filter @athlon/backend generate-vapid-keys`)

   Teste a conexão: `pnpm test:db`

4. Instale dependências (**use `pnpm`, não `npm`** - este projeto é monorepo):

```bash
pnpm install
```

> `npm install` na raiz quebra com erro `Cannot read properties of null (reading 'matches')`. Isso é esperado.

## Desenvolvimento

```bash
# Terminal 1 - API
pnpm dev:backend

# Terminal 2 - Frontend
pnpm dev:frontend

# Ou ambos:
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Instalação PWA

- **Android / Chrome:** após login, um banner oferece "Instalar app" (prompt nativo do navegador).
- **iOS / Safari:** banner com tutorial em 3 passos (Compartilhar → Adicionar à Tela de Início).

Detalhes em [docs/DOCUMENTACAO.md §13](./docs/DOCUMENTACAO.md#13-pwa-e-web-push).

## Testes (antes do deploy)

```bash
pnpm test
```

Valida lógica do frontend PWA (push, instalação). Detalhes em [docs/DOCUMENTACAO.md §22](./docs/DOCUMENTACAO.md#22-testes-automatizados).

## Fluxo MVP

1. ADM cria professor → professor cria turma com mensalidade e PIX
2. Aluno cria conta com código de convite → vê mensalidades
3. Aluno copia PIX, paga e envia comprovante
4. Treinador aprova/recusa na fila de comprovantes

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Frontend + Backend em paralelo |
| `pnpm test` | Testes automatizados do frontend |
| `pnpm build` | Build de produção |
| `pnpm test:db` | Testa conexão com Supabase |
| `pnpm seed:admin` | Cria usuário ADM |

Não use `npm install` neste repo - só `pnpm`.

## Licença

Software proprietário. Todos os direitos reservados a **Otávio Morais Antocevicz**.  
Consulte o arquivo [LICENSE](./LICENSE) para os termos completos de uso.
