# @athlon/mobile

Shell **React Native (Expo)** que abre o frontend web em produção via **WebView**.

Mantém **um único codebase** de telas (`apps/frontend`); atualizações no site refletem no app da Play Store após o deploy na Vercel.

## Desenvolvimento local

```bash
# Na raiz do monorepo
pnpm install

# Apontar para o Vite local (opcional)
echo 'EXPO_PUBLIC_APP_URL=http://10.0.2.2:5173' > apps/mobile/.env
# 10.0.2.2 = localhost do emulador Android

cd apps/mobile
pnpm start
# Pressione 'a' para Android ou escaneie o QR no dispositivo
```

Produção usa `https://athlonsport.app.br` por padrão.

## Build para Play Store

Guia completo: [docs/play-store-mobile.md](../../docs/play-store-mobile.md)  
Textos da ficha: [docs/play-store-ficha.md](../../docs/play-store-ficha.md)  
Assets da loja: [store-assets/](./store-assets/)

Resumo:

1. Conta [Google Play Console](https://play.google.com/console) (taxa única) + verificação de identidade
2. `npx eas-cli login` e `eas build:configure` (primeira vez — grava o `projectId`)
3. `npx eas-cli build -p android --profile production` (gera o `.aab`)
4. Teste fechado com 12 testers por 14 dias (conta pessoal nova)
5. Solicitar acesso à produção

## Identificação no frontend

O app injeta `window.__ATHLON_APP__ = true` e User-Agent `AthlonMobile/1.0`.  
O PWA oculta o banner "Instalar app" quando detecta o shell nativo.
