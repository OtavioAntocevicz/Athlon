# Migração de infraestrutura — AthonSport

Este documento resume a arquitetura após a remoção do Supabase.

## Arquitetura atual

- **Frontend:** Vercel → https://athonsport.app.br
- **API:** Railway → https://api.athonsport.app.br
- **Banco:** PostgreSQL no Railway (`pg` / node-postgres)
- **Storage:** Cloudflare R2 (`comprovantes/`, `turmas-fotos/`)
- **E-mail:** Resend
- **Crons:** `node-cron` no processo Express (Railway)

## Variáveis de ambiente

### Railway (backend)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | PostgreSQL (Railway injeta automaticamente) |
| `JWT_SECRET` | Sim | Secret do access token |
| `JWT_REFRESH_SECRET` | Sim | Secret do refresh token |
| `CORS_ORIGIN` | Sim | `https://athonsport.app.br` |
| `APP_URL` | Sim | `https://athonsport.app.br` |
| `R2_ACCOUNT_ID` | Sim* | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Sim* | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Sim* | R2 secret key |
| `R2_BUCKET` | Não | Default: `athonsport` |
| `R2_PUBLIC_BASE_URL` | Sim* | URL pública do bucket (fotos de turma) |
| `RESEND_API_KEY` | Prod | E-mail transacional |
| `EMAIL_FROM` | Prod | Ex: `ATHLON <noreply@athonsport.app.br>` |
| `CRON_SECRET` | Não | Protege endpoints `/api/cron/*` manuais |
| `CRON_ENABLED` | Não | Default `true` |
| `VAPID_*` | Opcional | Web Push |

\* Obrigatório para upload de arquivos.

### Vercel (frontend)

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://api.athonsport.app.br/api/v1` |

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

- `athonsport.app.br` → Vercel (já configurado)
- `api.athonsport.app.br` → Railway (CNAME do serviço)
- Resend: registros SPF, DKIM, DMARC para `athonsport.app.br`

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
8. Configurar domínio customizado `api.athonsport.app.br`

## Vercel — passos

1. Manter deploy do frontend
2. Definir `VITE_API_URL=https://api.athonsport.app.br/api/v1`
3. Remover variáveis `SUPABASE_*` e secrets do backend antigo
4. Build command: `pnpm run build:frontend` (via `vercel.json`)
