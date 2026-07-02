# Web Push em Produção - ATHLON

Este guia explica como ativar notificações push (barra do sistema / PWA) no ambiente de produção.

## Pré-requisitos

- Frontend servido via **HTTPS** (obrigatório para Push API e Service Worker)
- Backend acessível pelo frontend (`VITE_API_URL` ou proxy `/api/v1`)
- Node.js no servidor do backend com o pacote `web-push` instalado

## 1. Gerar chaves VAPID

No servidor (ou localmente, copiando depois para o `.env` de produção):

```bash
cd apps/backend
pnpm generate-vapid-keys
```

Isso grava em `apps/backend/.env`:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ex.: `mailto:suporte@athlon.app`)

**Importante:** use o mesmo par de chaves em todos os ambientes de produção. Se regenerar, todos os dispositivos precisarão se inscrever novamente.

## 2. Variáveis de ambiente do backend

No host de produção (Railway, Render, VPS, etc.):

```env
VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
VAPID_SUBJECT=mailto:seu-email@dominio.com
CORS_ORIGIN=https://seu-dominio.com
```

## 3. Build e deploy do frontend

```bash
pnpm --filter @athlon/frontend build
```

O PWA inclui:

- Service Worker gerado pelo `vite-plugin-pwa`
- Script `public/push-handler.js` para exibir notificações com app fechado

Publique a pasta `apps/frontend/dist` em um host estático com fallback para `index.html` (SPA).

## 4. Fluxo no app (aluno)

1. Aluno faz login
2. O componente de notificações pede permissão ao navegador
3. O frontend busca a chave pública em `GET /api/v1/notificacoes/vapid-public-key`
4. Cria a subscription via `PushManager` e envia para `POST /api/v1/dispositivos` (`pushProvider: WEB`). O endpoint legado `POST /notificacoes/push-token` ainda funciona.
5. Quando o backend cria uma notificação in-app, também dispara push via `web-push`

## 5. Testar em produção

1. Acesse o site via HTTPS no celular ou desktop
2. Instale o PWA (opcional, mas recomendado)
3. Aceite permissão de notificações
4. Dispare um evento (ex.: professor aprova comprovante)
5. Verifique notificação na barra do sistema

### Troubleshooting

| Problema | Solução |
|----------|---------|
| Permissão não aparece | Site precisa ser HTTPS; testar em aba normal antes do PWA |
| `publicKey` null na API | `VAPID_PUBLIC_KEY` não configurada no backend |
| Push não chega com app fechado | Verificar se SW está registrado (DevTools → Application → Service Workers) |
| Erro 410/404 no push | Subscription expirada; aluno precisa abrir o app novamente |
| iOS | Requer PWA instalado na tela inicial (iOS 16.4+) |

## 6. Segurança

- **Nunca** commite `VAPID_PRIVATE_KEY` no Git
- Rotacione chaves apenas se houver comprometimento
- `VAPID_SUBJECT` deve ser um `mailto:` ou URL do seu domínio

## 7. Checklist rápido

- [ ] Chaves VAPID no `.env` de produção do backend
- [ ] Backend reiniciado após configurar env
- [ ] Frontend em HTTPS
- [ ] `CORS_ORIGIN` apontando para o domínio do frontend
- [ ] Teste com aluno real aceitando permissão
- [ ] Cron do backend rodando (notificações automáticas de atraso)
