# ATHLON — TWA Android

Projeto [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) que empacota o PWA
`https://athlonsport.vercel.app` como APK (`app.athlon.sport`).

## Arquivos versionados

- `twa-manifest.json` — config do TWA
- `scripts/build-apk.ps1` — build + assinatura
- `.keystore-credentials.example` — modelo de senhas (não commitar o arquivo real)
- `gradle.properties` — inclui `android.overridePathCheck=true` (paths com acentos no Windows)

## Não versionar

- `android.keystore` e `.keystore-credentials`
- Artefatos gerados (`app/`, `*.apk`, Gradle wrapper, etc.) — regeneráveis com `bubblewrap update`

## Build rápido

1. Configure JDK 17 + Android SDK (`npx @bubblewrap/cli doctor`)
2. Coloque `android.keystore` e `.keystore-credentials` nesta pasta
3. `powershell -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1` → gera `ATHLON_Download.apk`

Guia completo: [docs/twa-android.md](../../docs/twa-android.md)  
Texto WhatsApp: [docs/whatsapp-instalacao.md](../../docs/whatsapp-instalacao.md)
