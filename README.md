# ATHLON (AthonSport)

Plataforma mobile-first de gestão esportiva para treinadores e alunos.

Disponível como **PWA instalável** no celular (Android: prompt nativo; iOS: tutorial manual) e no **navegador**.

**Produção:** https://athlonsport.app.br

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + PWA + Tailwind + TanStack Query (Vercel) |
| API | Node.js + Express + JWT (Railway) |
| Banco | PostgreSQL (Railway) |
| Storage | Cloudflare R2 |
| E-mail | Resend |
| Push | Web Push (VAPID) |

## Arquitetura

```
Vercel (frontend)  →  api.athlonsport.app.br (Railway Express)
                              ↓
                    PostgreSQL (Railway)
                              ↓
                    Cloudflare R2 (comprovantes, turmas-fotos)
```

## Estrutura do monorepo

```
apps/frontend              - PWA React
apps/backend               - API REST Express
apps/backend/migrations/   - Schema SQL (PostgreSQL)
packages/shared-types      - Zod schemas e tipos compartilhados
```

## Configuração local

### 1. Dependências

```bash
pnpm install
```

> Use `pnpm`, não `npm` — este projeto é monorepo.

### 2. PostgreSQL

Crie um banco local e configure `apps/backend/.env` (copie de `apps/backend/.env.example`):

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/athonsport
```

Aplique as migrations:

```bash
pnpm db:migrate
pnpm seed:admin   # cria usuário ADM
pnpm test:db      # testa conexão
```

### 3. Frontend

Configure `apps/frontend/.env`:

```bash
VITE_API_URL=http://localhost:3001/api/v1
```

### 4. Storage (R2) e e-mail (Resend)

Opcional em desenvolvimento. Sem R2, uploads de comprovante/foto retornam erro 503. Sem Resend, recuperação de senha usa `RECOVERY_SHOW_CODE=true` para exibir o código na tela.

## Desenvolvimento

```bash
pnpm dev:backend   # API em http://localhost:3001
pnpm dev:frontend    # PWA em http://localhost:5173
# ou ambos:
pnpm dev
```

## Deploy

| Serviço | Onde | Observação |
|---------|------|------------|
| Frontend | Vercel | `VITE_API_URL=https://api.athlonsport.app.br/api/v1` |
| API + Cron | Railway | `railway.toml` na raiz; health check em `/health` |
| PostgreSQL | Railway | `DATABASE_URL` injetado automaticamente |
| R2 | Cloudflare | Credenciais no Railway |
| Resend | resend.com | DNS em athlonsport.app.br (manual) |

Documentação completa: **[docs/DOCUMENTACAO.md](./docs/DOCUMENTACAO.md)**

## Scripts

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Frontend + Backend em paralelo |
| `pnpm build` | Build completo |
| `pnpm build:frontend` | Build só do frontend (Vercel) |
| `pnpm build:backend` | Build só do backend (Railway) |
| `pnpm db:migrate` | Aplica migrations SQL |
| `pnpm test:db` | Testa conexão PostgreSQL |
| `pnpm seed:admin` | Cria usuário ADM |
| `pnpm test` | Testes do frontend |

## Licença

Software proprietário. Todos os direitos reservados a **Otávio Morais Antocevicz**.
