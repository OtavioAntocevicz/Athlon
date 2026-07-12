# Configurar Resend + Web Push (produção) - ATHLON

Guia prático, na ordem recomendada. O código já está pronto; falta só ambiente.

Referências extras:
- Resend (detalhe técnico): [DOCUMENTACAO.md §12](./DOCUMENTACAO.md#recuperação-de-senha-esqueci-minha-senha)
- Web Push (troubleshooting): [web-push-producao.md](./web-push-producao.md)

---

## Parte A - Resend (e-mail de recuperação de senha)

### O que você precisa

- Conta em [resend.com](https://resend.com)
- Domínio próprio (ex.: `athlon.app`) com acesso ao DNS
- URL do frontend em produção (ex.: `https://app.seudominio.com`)
- Acesso às variáveis de ambiente do **backend** (Vercel / Railway / etc.)

### Passo 1 - Criar API Key no Resend

1. Entre em [resend.com](https://resend.com) e faça login
2. Vá em **API Keys** → **Create API Key**
3. Nome sugerido: `athlon-backend-prod`
4. Copie a chave (`re_...`) e guarde - ela só aparece uma vez

### Passo 2 - Verificar domínio (obrigatório para e-mail real)

Enquanto o domínio não estiver verificado, o Resend só envia para o e-mail da sua conta (modo de teste).

1. No Resend: **Domains** → **Add Domain**
2. Informe o domínio (ex.: `athlon.app`)
3. Adicione no DNS os registros que o Resend mostrar (SPF, DKIM, etc.)
4. Aguarde status **Verified** (pode levar minutos)

### Passo 3 - Definir remetente

Escolha um endereço no domínio verificado, por exemplo:

```text
ATHLON <noreply@athlon.app>
```

Não use `gmail.com` / `hotmail.com` como remetente.

### Passo 4 - Variáveis no backend (produção)

No painel do host do backend, configure:

```env
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=ATHLON <noreply@seudominio.com>
APP_URL=https://seu-frontend.com
```

Notas:

- `APP_URL` é a URL do **frontend** (usada no link mágico do e-mail)
- Se `APP_URL` não existir, o backend usa `CORS_ORIGIN` como fallback
- Em `.env` local, deixe `RESEND_API_KEY` vazio para testar pelo log `[email:dev]`

Exemplo local (`apps/backend/.env`):

```env
# vazio = não envia; código e link saem no terminal do backend
RESEND_API_KEY=
EMAIL_FROM=ATHLON <onboarding@resend.dev>
APP_URL=http://localhost:5173
```

### Passo 5 - Redeploy / reiniciar o backend

Salve as env vars e faça redeploy (ou reinicie o processo). Variáveis novas só valem após reinício.

### Passo 6 - Testar

1. Abra `/login/aluno/esqueci-senha` (ou professor)
2. Informe um e-mail **cadastrado**
3. Confira a caixa de entrada (e spam)
4. Use o **código de 6 dígitos** ou o **link** do e-mail
5. Defina a nova senha e faça login

### Checklist Resend

- [ ] API Key criada e colada no backend
- [ ] Domínio verificado no Resend
- [ ] `EMAIL_FROM` com esse domínio
- [ ] `APP_URL` apontando para o frontend HTTPS
- [ ] Backend reiniciado / redeploy
- [ ] Teste com e-mail real de aluno e professor

### Problemas comuns (Resend)

| Sintoma | Causa provável |
|---------|----------------|
| Nada chega e no log do backend aparece `[email:dev]` | `RESEND_API_KEY` vazia no ambiente |
| Erro 403 / domain not verified | Domínio não verificado ou `EMAIL_FROM` errado |
| Link abre localhost | `APP_URL` ainda aponta para dev |
| E-mail só chega no seu e-mail pessoal | Ainda no modo teste do Resend (domínio não verificado) |

---

### Sem domínio próprio (contorno temporário)

Se só tiver `*.vercel.app`, ative na Vercel e no `.env`:

```env
RECOVERY_SHOW_CODE=true
EMAIL_FROM=ATHLON <onboarding@resend.dev>
APP_URL=https://athlonsport.vercel.app
```

Com isso, ao pedir recuperação, o **código aparece na própria tela** (não depende do e-mail chegar).  
**Desligue** `RECOVERY_SHOW_CODE` quando tiver domínio verificado no Resend (expor código na tela não é seguro para produção real).

---

### O que você precisa

- Frontend em **HTTPS** (obrigatório)
- Backend com o pacote `web-push` (já no projeto)
- Mesmo par de chaves VAPID em todo o ambiente de produção

### Passo 1 - Gerar chaves VAPID

Na sua máquina (uma vez):

```bash
cd apps/backend
pnpm generate-vapid-keys
```

Isso grava em `apps/backend/.env`:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ex.: `mailto:suporte@athlon.app`)

**Importante:** não regenere em produção sem necessidade. Se mudar as chaves, todos os alunos precisam abrir o app de novo e aceitar notificação.

### Passo 2 - Copiar chaves para o backend de produção

No host do backend:

```env
VAPID_PUBLIC_KEY=sua_chave_publica
VAPID_PRIVATE_KEY=sua_chave_privada
VAPID_SUBJECT=mailto:seu-email@dominio.com
CORS_ORIGIN=https://seu-frontend.com
```

Nunca commite `VAPID_PRIVATE_KEY` no Git.

### Passo 3 - Deploy do frontend em HTTPS

```bash
pnpm --filter @athlon/frontend build
```

Publique `apps/frontend/dist` (Vercel, Netlify, etc.) com:

- HTTPS ativo
- Fallback SPA para `index.html`
- `VITE_API_URL` (se usar) apontando para o backend de produção

### Passo 4 - Redeploy do backend

Reinicie o backend após salvar as variáveis VAPID.

### Passo 5 - Testar no aparelho

1. Abra o site em HTTPS (Chrome Android ou Safari iOS)
2. (Recomendado) Instale o PWA na tela inicial
3. Faça login como **aluno**
4. Aceite a permissão de notificações quando o app pedir
5. Dispare um evento real, por exemplo:
   - Professor aprova ou recusa um comprovante
   - Professor cria um evento de turma
6. Confira a notificação na barra do sistema (app pode estar fechado)

**iOS:** push só funciona com PWA instalado (iOS 16.4+).

### Checklist Web Push

- [ ] Chaves VAPID no backend de produção
- [ ] Backend reiniciado
- [ ] Frontend em HTTPS
- [ ] `CORS_ORIGIN` = domínio do frontend
- [ ] Aluno aceitou permissão de notificação
- [ ] Teste com comprovante ou evento real

### Problemas comuns (Push)

| Sintoma | Solução |
|---------|---------|
| Permissão não aparece | Site precisa ser HTTPS |
| API retorna `publicKey` null | `VAPID_PUBLIC_KEY` ausente no backend |
| Push não chega com app fechado | Service Worker não registrado (DevTools → Application → Service Workers) |
| Erro 410/404 no envio | Subscription expirada - aluno abre o app de novo |
| iOS sem notificação | Instalar na Tela de Início; versão ≥ 16.4 |

Guia com mais detalhes: [web-push-producao.md](./web-push-producao.md)

---

## Ordem sugerida no dia a dia

1. Configurar **Resend** e testar “Esqueci minha senha”
2. Gerar / colar **VAPID** e testar push com um aluno real
3. Só então validar Installability do PWA no Chrome DevTools (opcional)
