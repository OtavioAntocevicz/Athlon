# Lançar o ATHLON na Play Store

O app da loja é o shell em `apps/mobile` (Expo + WebView do site https://athlonsport.app.br). Web, PWA e Play Store compartilham o mesmo frontend.

Textos prontos para colar na Console: [play-store-ficha.md](./play-store-ficha.md).

---

## O que você já tem

- Conta Google Play Developer e taxa de US$ 25
- Logo 512×512 (`apps/frontend/public/icon-512.png` e `apps/mobile/store-assets/play-icon-512.png`)
- Ícones do APK em `apps/mobile/assets/`
- Feature graphic 1024×500 em `apps/mobile/store-assets/feature-graphic-1024x500.png`
- Política: https://athlonsport.app.br/privacidade
- Termos: https://athlonsport.app.br/termos
- Package Android: `br.app.athlonsport` (não mude depois do primeiro upload)

## O que ainda falta (nesta ordem)

1. Verificar identidade na Play Console (RG/CNH + selfie)
2. Criar o app na Console e preencher a ficha
3. Capturar screenshots no celular (mínimo 2, ideal 4–8 em 1080×1920)
4. Preencher Data safety, classificação IARC, anúncios e contas de revisão
5. Configurar EAS e gerar o **AAB**
6. Subir o AAB no **teste fechado**
7. **12 testers inscritos por 14 dias seguidos** (conta pessoal criada depois de 13/11/2023)
8. Pedir acesso à produção → revisão do Google → publicar

O passo 7 é o mais longo. Teste interno (até 100 e-mails) **não conta** para liberar produção.

---

## 1. Conta Play Console

Depois de pagar a taxa:

1. Abra [play.google.com/console](https://play.google.com/console)
2. Complete **verificação de identidade** do desenvolvedor (documento com foto)
3. Confirme o perfil (conta **pessoal** vs organização). Conta pessoal nova precisa do teste fechado de 14 dias. Organização (CNPJ + D-U-N-S) não tem essa trava, mas o D-U-N-S demora.

Não publique com o nome do pacote errado. O ATHLON usa `br.app.athlonsport`.

---

## 2. Criar o app e a ficha

Play Console → **Criar app**

- Nome: `ATHLON`
- Idioma padrão: português (Brasil)
- Tipo: app (não jogo)
- Gratuito
- Declarações de política: aceite as que se aplicam

### Assets da loja

| Item | Arquivo / spec |
|------|----------------|
| Ícone 512×512 | `apps/mobile/store-assets/play-icon-512.png` |
| Feature graphic 1024×500 | `apps/mobile/store-assets/feature-graphic-1024x500.png` (PNG sem transparência) |
| Screenshots telefone | 2 a 8 imagens, 9:16, ideal 1080×1920 |

Textos: [play-store-ficha.md](./play-store-ficha.md).

### Screenshots (você captura)

No Android, abra https://athlonsport.app.br (ou o APK de preview) com contas de teste, sem dados reais:

1. Escolha de perfil (Aluno / Professor)
2. Dashboard
3. Turma com foto
4. Mensalidades + PIX
5. Envio de comprovante
6. Avisos / eventos

---

## 3. Conteúdo do app (formulários)

Complete **Política do app** / **Conteúdo do app** antes do teste fechado:

| Formulário | Onde está a resposta |
|------------|----------------------|
| Política de privacidade | `https://athlonsport.app.br/privacidade` |
| Segurança dos dados | [play-store-ficha.md](./play-store-ficha.md) |
| Anúncios | Não |
| Classificação IARC | Questionário; público 18+ no lançamento |
| Público-alvo | 18 anos ou mais |
| Acesso ao app | Login obrigatório — duas contas de demo |
| Recursos financeiros | Não processa PIX; só registra chave, valor e comprovante |
| Notícias / COVID / governo / saúde clínica | Não |

Crie as contas de revisão **antes** de enviar. Sem login o Google rejeita.

---

## 4. Build AAB (EAS)

O `projectId` em `apps/mobile/app.json` ainda é placeholder. Na primeira vez:

```bash
npm install -g eas-cli
cd apps/mobile
npx eas-cli login
npx eas-cli build:configure
```

Isso grava o `projectId` real no `app.json`. **Commite esse valor.**

Build de produção (AAB para a loja):

```bash
cd apps/mobile
npx eas-cli build -p android --profile production
```

Build de teste interno no celular (APK, opcional):

```bash
npx eas-cli build -p android --profile preview
```

O perfil `production` em `eas.json` já gera `app-bundle`. A Play Console **não aceita APK** em apps novos.

Assinatura: use **Play App Signing** (padrão da Console). O EAS gera o upload key.

Não altere `android.package` (`br.app.athlonsport`) depois do primeiro AAB enviado.

---

## 5. Teste interno (opcional, rápido)

Útil para você e 1–2 pessoas testarem o AAB em minutos.

1. Play Console → Teste e lançamento → Teste interno
2. Upload do `.aab`
3. Adicione e-mails Gmail
4. Testers abrem o link de participação e instalam pela Play Store

Checklist no dispositivo real:

- Login aluno e professor
- Verificação de e-mail
- Entrar em turma
- Upload de comprovante (câmera e galeria)
- Botão voltar do Android dentro do WebView
- Banner “Instalar PWA” **não** aparece

Isso **não** substitui o teste fechado.

---

## 6. Teste fechado (obrigatório para produção)

Contas **pessoais** criadas depois de **13 de novembro de 2023** só liberam Produção depois disto:

- Faixa **Teste fechado** (não interno, não aberto)
- Pelo menos **12 testers inscritos** (opt-in pelo link oficial da Play Store)
- Esses 12 precisam permanecer inscritos **14 dias seguidos**
- Se cair abaixo de 12, o relógio pode reiniciar

Convide **15 a 20** pessoas (amigos, treinadores, familiares com Android). Peça para:

1. Abrir o link de participação da Console (não basta instalar um APK)
2. Aceitar com a conta Google do celular
3. Instalar o ATHLON pela Play Store
4. **Não sair do teste** por 14 dias
5. Usar login, turma e PIX e mandar um feedback

Quando a Console mostrar 12+ inscritos contínuos por 14 dias:

1. Painel → **Solicitar acesso à produção**
2. Responda o questionário (rascunho em [play-store-ficha.md](./play-store-ficha.md))
3. Espere a análise (em geral até ~7 dias)

---

## 7. Produção web antes de publicar

O app só abre o site. Se o site quebrar, a loja quebra.

- [ ] Resend no ar (`RESEND_API_KEY`, domínio verificado)
- [ ] `RECOVERY_SHOW_CODE=false` em produção
- [ ] Frontend (Vercel) e API (Railway) estáveis
- [ ] Contas de revisão funcionando

---

## Permissões Android

Em `app.json`, para comprovante via WebView:

- `CAMERA`
- `READ_MEDIA_IMAGES`
- `READ_EXTERNAL_STORAGE` (Android antigo)

Declare no Data safety que o app usa foto/arquivo de comprovante.

---

## Integração com o frontend

O shell define:

- `window.__ATHLON_APP__ = true`
- User-Agent com sufixo `AthlonMobile/1.0`

O frontend (`apps/frontend/src/lib/is-athlon-app.ts`) oculta o banner **Instalar PWA** dentro do app da loja.

---

## Política de WebView (atenção)

A Play Store recusa wrappers genéricos de site de terceiros. O ATHLON é o **seu** produto, com splash, botão voltar, permissões de câmera/galeria e detecção nativa. Na ficha, descreva o app como gestão esportiva (turmas, mensalidades, PIX), não como “atalho para o site”.

Se a revisão pedir mais valor nativo, o próximo passo é push FCM — fora deste lançamento.

---

## Limitações conhecidas

| Recurso | Web/PWA | App WebView |
|---------|---------|-------------|
| Login, turmas, mensalidades | Sim | Sim |
| Upload comprovante | Sim | Sim (com permissões) |
| Web Push na barra | Em investigação | Limitado; FCM nativo seria fase 2 |
| Instalar PWA | Sim | Não se aplica (já é app) |

---

## Publicação iOS (App Store)

O mesmo shell pode gerar iOS (`eas build -p ios`) com conta Apple Developer (US$ 99/ano). Fora do lançamento inicial; no iPhone o canal atual é PWA no Safari.

---

## Ordem resumida na Console

1. Identidade verificada
2. Criar app `ATHLON` / pacote `br.app.athlonsport`
3. Ficha + feature graphic + ícone + screenshots
4. Privacidade, Data safety, IARC, acesso ao app
5. `eas build -p android --profile production`
6. Upload do AAB no teste fechado
7. 12 testers × 14 dias
8. Solicitar produção → publicar
