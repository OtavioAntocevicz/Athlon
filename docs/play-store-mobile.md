# App Android (Play Store) — React Native + WebView

O ATHLON usa **três canais** com o **mesmo frontend web**:

| Canal | Como o usuário acessa |
|-------|------------------------|
| **Web** | Navegador → https://athlonsport.app.br |
| **PWA** | Instalar pelo Chrome (Android) ou Safari (iOS) |
| **Play Store** | App nativo shell → WebView apontando para o site em produção |

Não há UI duplicada em Kotlin/Java. O projeto fica em `apps/mobile` (Expo + React Native WebView).

---

## Por que WebView?

- Uma única base de telas (`apps/frontend`)
- Deploy na Vercel atualiza Web, PWA e app da loja ao mesmo tempo
- Sem reescrever o sistema em nativo

---

## Estrutura

```
apps/mobile/
  App.tsx          # WebView + botão voltar Android
  app.json         # package Android, ícones, permissões
  assets/          # ícones (copiados do frontend)
  README.md
```

O app carrega por padrão:

```text
https://athlonsport.app.br
```

Variável opcional: `EXPO_PUBLIC_APP_URL` (ver `apps/mobile/.env.example`).

---

## Desenvolvimento

```bash
pnpm install
pnpm dev:mobile          # expo start em apps/mobile
```

Emulador Android apontando para Vite local:

```bash
# apps/mobile/.env
EXPO_PUBLIC_APP_URL=http://10.0.2.2:5173
```

---

## Checklist Play Store

### 1. Conta e assets

- [ ] Conta Google Play Developer (~US$ 25, taxa única)
- [ ] Ícone 512×512 (já em `apps/mobile/assets/`)
- [x] Telas públicas 1080×1920 em `apps/mobile/store-assets/screenshots/` (escolha de perfil, logins, cadastro)
- [ ] Prints logados no celular: dashboard, turma, mensalidades, comprovante, eventos
- [ ] URL da política de privacidade: `https://athlonsport.app.br/politica-privacidade`
- [ ] URL dos termos: `https://athlonsport.app.br/termos`

### 2. Build (EAS — recomendado)

```bash
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure
eas build -p android --profile production
```

O comando gera um **AAB** (Android App Bundle) para upload na Play Console.

### 3. Teste interno

1. Play Console → **Teste interno**
2. Upload do `.aab`
3. Testar em dispositivo real:
   - Login aluno/professor
   - Verificação de e-mail
   - Entrar em turma
   - Upload de comprovante (câmera/galeria)
   - Chamados

### 4. Produção web antes de publicar

- [ ] Resend configurado (`RESEND_API_KEY`, domínio verificado)
- [ ] `RECOVERY_SHOW_CODE=false` em produção
- [ ] Migration `003_email_verificacao.sql` aplicada
- [ ] API e frontend deployados

---

## Permissões Android

Configuradas em `app.json` para upload de comprovante via WebView:

- `CAMERA`
- `READ_MEDIA_IMAGES`
- `READ_EXTERNAL_STORAGE` (Android antigo)

---

## Integração com o frontend

O shell define:

- `window.__ATHLON_APP__ = true` (injetado antes do carregamento)
- User-Agent com sufixo `AthlonMobile/1.0`

O frontend (`apps/frontend/src/lib/is-athlon-app.ts`):

- Oculta banner **Instalar PWA** dentro do app da loja
- Trata o app como “já instalado” para UX de PWA

---

## Limitações conhecidas

| Recurso | Web/PWA | App WebView |
|---------|---------|-------------|
| Login, turmas, mensalidades | ✅ | ✅ |
| Upload comprovante | ✅ | ✅ (com permissões) |
| Web Push na barra | ⚠️ em investigação | ⚠️ limitado; FCM nativo seria fase 2 |
| Instalar PWA | ✅ | N/A (já é app) |

---

## Publicação iOS (App Store)

O mesmo shell Expo pode gerar build iOS (`eas build -p ios`), sujeito a conta Apple Developer (US$ 99/ano). Fora do escopo inicial; PWA no Safari cobre iOS hoje.
