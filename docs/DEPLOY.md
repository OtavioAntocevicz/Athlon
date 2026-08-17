# Migração de infraestrutura — AthonSport

Este documento resume a arquitetura após a remoção do Supabase.

## Arquitetura atual

- **Frontend:** Vercel → https://athlonsport.app.br
- **API:** Railway → https://api.athlonsport.app.br
- **Banco:** PostgreSQL no Railway (`pg` / node-postgres)
- **Storage:** Cloudflare R2 (`comprovantes/`, `turmas-fotos/`)
- **E-mail:** Resend (configurado em produção)
- **App Play Store:** `apps/mobile` (Expo + WebView) — ver [docs/play-store-mobile.md](./play-store-mobile.md)
- **Crons:** `node-cron` no processo Express (Railway)

## Variáveis de ambiente

### Railway (backend)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | PostgreSQL (Railway injeta automaticamente) |
| `JWT_SECRET` | Sim | Secret do access token |
| `JWT_REFRESH_SECRET` | Sim | Secret do refresh token |
| `CORS_ORIGIN` | Sim | `https://athlonsport.app.br` |
| `APP_URL` | Sim | `https://athlonsport.app.br` |
| `R2_ACCOUNT_ID` | Sim* | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Sim* | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Sim* | R2 secret key |
| `R2_BUCKET` | Não | Default: `athonsport` |
| `R2_PUBLIC_BASE_URL` | Sim* | URL pública do bucket (fotos de turma) |
| `RESEND_API_KEY` | Prod | E-mail transacional |
| `EMAIL_FROM` | Prod | Ex: `ATHLON <noreply@athlonsport.app.br>` |
| `CRON_SECRET` | **Sim (prod)** | Protege endpoints `/api/cron/*`; obrigatório com `NODE_ENV=production` |
| `CRON_ENABLED` | Não | Default `true` |
| `NODE_ENV` | **Sim (prod)** | Deve ser `production` no Railway |
| `RECOVERY_SHOW_CODE` | **Não em prod** | Deve ser `false` ou ausente em produção |
| `VAPID_*` | Opcional | Web Push |

\* Obrigatório para upload de arquivos.

### Vercel (frontend)

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://api.athlonsport.app.br/api/v1` |

**Não** configure variáveis de backend na Vercel.

## Banco de dados

Migrations em `apps/backend/migrations/`. Para banco novo:

```bash
pnpm db:migrate
pnpm seed:admin
```

## Crons (node-cron)

| Job | Schedule | Função |
|-----|----------|--------|
| Avisos agendados | `0 * * * *` (horário) | `runAvisosJob` |
| Diário | `0 6 * * *` | Atrasos, bloqueios, notificações |
| Mensal | `0 7 1 * *` | Gera mensalidades do mês |

Endpoints manuais (opcional, com `CRON_SECRET`): `GET /api/cron/avisos`, `/diario`, `/mensal`.

## DNS (configuração manual)

### Registro.br / Cloudflare

- `athlonsport.app.br` → Vercel (já configurado)
- `api.athlonsport.app.br` → Railway (CNAME do serviço)
- Resend: registros SPF, DKIM, DMARC para `athlonsport.app.br`

### Cloudflare R2

- Bucket com prefixos `comprovantes/` (privado) e `turmas-fotos/` (público via custom domain ou R2.dev)

## Railway — passos

1. Criar projeto no Railway
2. Adicionar serviço **PostgreSQL**
3. Adicionar serviço **GitHub repo** apontando para este repositório
4. Root directory: `/` (usa `railway.toml`)
5. Vincular `DATABASE_URL` do Postgres ao serviço da API
6. Configurar variáveis listadas acima
7. Deploy e verificar `GET /health`
8. Configurar domínio customizado `api.athlonsport.app.br`

### Variáveis de segurança (produção)

Após autenticar no Railway CLI (`railway login`), execute na raiz do repositório:

```bash
./scripts/configure-railway-production-security.sh
railway redeploy --yes
```

O script define `CRON_SECRET` (gerado automaticamente) e `RECOVERY_SHOW_CODE=false`.
Não defina `NODE_ENV` manualmente no Railway — isso quebra o build (pnpm ignora devDependencies).
O Railway já injeta `RAILWAY_ENVIRONMENT=production` em runtime.

## Vercel — passos

1. Manter deploy do frontend
2. Definir `VITE_API_URL=https://api.athlonsport.app.br/api/v1`
3. Remover variáveis `SUPABASE_*` e secrets do backend antigo
4. Build command: `pnpm run build:frontend` (via `vercel.json`)
