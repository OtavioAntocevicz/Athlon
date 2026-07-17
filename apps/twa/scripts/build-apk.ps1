# Gera APK assinado do TWA ATHLON (Bubblewrap + apksigner).
# Pré-requisitos: JDK 17, Android SDK, keystore em apps/twa/android.keystore
# Credenciais: apps/twa/.keystore-credentials (veja .keystore-credentials.example)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$credFile = Join-Path $root ".keystore-credentials"
if (-not (Test-Path $credFile)) {
  throw "Crie .keystore-credentials a partir de .keystore-credentials.example"
}
Get-Content $credFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2].Trim()
  }
}
if (-not $env:BUBBLEWRAP_KEYSTORE_PASSWORD -or -not $env:BUBBLEWRAP_KEY_PASSWORD) {
  throw "Defina BUBBLEWRAP_KEYSTORE_PASSWORD e BUBBLEWRAP_KEY_PASSWORD em .keystore-credentials"
}

$jdkCandidates = @(
  $env:BUBBLEWRAP_JDK,
  "$env:USERPROFILE\.bubblewrap\jdk-17",
  "C:\Program Files\Android\Android Studio\jbr"
) | Where-Object { $_ -and (Test-Path "$_\bin\java.exe") }
if (-not $jdkCandidates) { throw "JDK 17+ não encontrado. Instale Temurin 17 ou defina BUBBLEWRAP_JDK." }
$env:JAVA_HOME = $jdkCandidates[0]

$sdkCandidates = @(
  $env:ANDROID_HOME,
  $env:ANDROID_SDK_ROOT,
  "$env:LOCALAPPDATA\Android\Sdk"
) | Where-Object { $_ -and (Test-Path $_) }
if (-not $sdkCandidates) { throw "Android SDK não encontrado. Defina ANDROID_HOME." }
$env:ANDROID_HOME = $sdkCandidates[0]
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

$sdkDir = ($env:ANDROID_HOME -replace '\\', '/')
"sdk.dir=$sdkDir" | Set-Content (Join-Path $root "local.properties") -Encoding ASCII

# Garante override de path com acentos (OneDrive / Área de Trabalho)
$gp = Join-Path $root "gradle.properties"
if (Test-Path $gp) {
  $gpText = Get-Content $gp -Raw
  if ($gpText -notmatch "android\.overridePathCheck") {
    Add-Content $gp "`nandroid.overridePathCheck=true`n"
  }
}

Write-Host ">> bubblewrap build (unsigned)..."
npx --yes @bubblewrap/cli@latest build --skipPwaValidation --skipSigning

$unsigned = Join-Path $root "app-release-unsigned.apk"
if (-not (Test-Path $unsigned)) {
  $alt = Get-ChildItem $root -Filter "*unsigned*.apk" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($alt) { $unsigned = $alt.FullName }
  else { throw "APK unsigned não encontrado após o build." }
}

$aligned = Join-Path $root "app-release-aligned.apk"
$signed = Join-Path $root "ATHLON_Download.apk"
$buildTools = Get-ChildItem (Join-Path $env:ANDROID_HOME "build-tools") -Directory |
  Sort-Object Name -Descending | Select-Object -First 1
if (-not $buildTools) { throw "build-tools não encontrado no SDK." }

$zipalign = Join-Path $buildTools.FullName "zipalign.exe"
$apksignerJar = Join-Path $buildTools.FullName "lib\apksigner.jar"
& $zipalign -f -p 4 $unsigned $aligned
& "$env:JAVA_HOME\bin\java.exe" -jar $apksignerJar sign `
  --ks (Join-Path $root "android.keystore") `
  --ks-key-alias android `
  --ks-pass "pass:$env:BUBBLEWRAP_KEYSTORE_PASSWORD" `
  --key-pass "pass:$env:BUBBLEWRAP_KEY_PASSWORD" `
  --out $signed `
  $aligned

Write-Host "APK assinado: $signed"
& "$env:JAVA_HOME\bin\java.exe" -jar $apksignerJar verify --verbose $signed
