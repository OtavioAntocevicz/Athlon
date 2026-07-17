# TWA Android (ATHLON)

O app Android é um **Trusted Web Activity** gerado com [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap), apontando para o PWA em produção:

`https://athlonsport.vercel.app`

Package id: `app.athlon.sport`  
Projeto no monorepo: `apps/twa/`

## O que muda com o TWA

| Tipo de mudança | Precisa de novo APK? |
| --- | --- |
| Telas, bugs, textos, API (deploy Vercel) | **Não** — o APK só abre o site |
| Package, assinatura, ícone launcher, config TWA | **Sim** |

## Pré-requisitos na máquina

- JDK **17** (recomendado: Temurin 17; Bubblewrap rejeita JDK 25)
- Android SDK (Android Studio serve)
- Node.js / `npx`
- Keystore de assinatura (não versionada)

Configuração Bubblewrap (uma vez):

```bash
npx @bubblewrap/cli updateConfig --jdkPath "<caminho-jdk-17>" --androidSdkPath "<caminho-sdk>"
npx @bubblewrap/cli doctor
```

O `androidSdkPath` precisa ter pasta `bin` (cmdline-tools) **ou** `tools` na raiz. No SDK do Android Studio, se faltar `bin` na raiz, instale cmdline-tools e crie um junction `Sdk\bin` → `Sdk\cmdline-tools\latest\bin`.

## Keystore (assinatura)

1. Gere o keystore (só na primeira vez):

```powershell
keytool -genkeypair -v -keystore apps\twa\android.keystore -alias android `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass "<SENHA>" -keypass "<SENHA>" `
  -dname "CN=ATHLON, OU=Mobile, O=Athlon, L=Sao Paulo, ST=SP, C=BR"
```

2. Copie `apps/twa/.keystore-credentials.example` → `.keystore-credentials` e preencha as senhas.
3. **Backup** do `android.keystore` fora do Git (OneDrive pessoal / cofre). Sem ele não dá para atualizar o mesmo app no celular.
4. Confira o SHA-256:

```powershell
keytool -list -v -keystore apps\twa\android.keystore -alias android
```

O fingerprint deve bater com `apps/frontend/public/.well-known/assetlinks.json`.

## Digital Asset Links

Arquivo publicado em:

`https://athlonsport.vercel.app/.well-known/assetlinks.json`

Fonte no repo: `apps/frontend/public/.well-known/assetlinks.json`

Sem esse arquivo (e fingerprint correto), o Chrome mostra a barra do navegador em vez de tela cheia.

Após trocar o keystore, atualize o fingerprint no JSON, no `twa-manifest.json` (`fingerprints`) e faça deploy.

## Gerar o APK

Na pasta `apps/twa`:

```powershell
# Regenerar projeto Android a partir do twa-manifest.json (quando mudar config)
npx @bubblewrap/cli update --skipVersionUpgrade

# Build + assinatura (script local)
powershell -ExecutionPolicy Bypass -File .\scripts\build-apk.ps1
```

Ou manualmente:

```powershell
npx @bubblewrap/cli build --skipPwaValidation --skipSigning
# assinar app-release-unsigned-aligned.apk com apksigner + android.keystore
```

Saída esperada: `apps/twa/app-release-signed.apk`

> No Windows, se o monorepo estiver em caminho com acentos (`Área de Trabalho`), o Gradle precisa de `android.overridePathCheck=true` em `gradle.properties` (já previsto no script de build).

## Distribuição (WhatsApp)

1. Envie o `.apk` ao professor → alunos Android.
2. No celular: permitir instalar de fontes desconhecidas / “este arquivo”.
3. Play Protect pode avisar em apps fora da Play Store — é esperado no sideload.
4. Cada update de **assinatura/config** = novo APK; conteúdo do app continua no deploy Vercel.

Texto pronto para o professor: ver [whatsapp-instalacao.md](./whatsapp-instalacao.md).

## Atualizar depois

1. Edite `apps/twa/twa-manifest.json` se necessário.
2. `npx @bubblewrap/cli update --skipVersionUpgrade`
3. Rode o script de build.
4. Se mudou o SHA do certificado, atualize `assetlinks.json` e faça deploy do frontend.

## Play Store (fase 2, opcional)

O AAB gerado em `app/build/outputs/bundle/release/` pode ir para a Play Console depois. Não é necessário para a distribuição atual via WhatsApp.
