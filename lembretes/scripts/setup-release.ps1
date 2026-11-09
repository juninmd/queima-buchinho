# Gera as chaves do updater e do APK e grava os secrets do repositório (Windows/PowerShell).
# Requisitos: gh (logado), bun e keytool (JDK) no PATH. Rode dentro da pasta lembretes/.
param([string]$Repo = 'juninmd/queima-buchinho', [switch]$AndroidOnly, [string]$Keytool = 'keytool')
$ErrorActionPreference = 'Stop'
if (-not (Get-Command $Keytool -ErrorAction SilentlyContinue)) {
  throw "keytool não encontrado. Instale o JDK (winget install EclipseAdoptium.Temurin.21.JDK), abra um novo terminal, ou passe -Keytool 'C:\caminho\para\keytool.exe' (Android Studio: C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe)."
}

$chars = [char[]]((97..122) + (65..90) + (48..57))
$bytes = New-Object byte[] 32
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$rng.GetBytes($bytes)
$Pass = -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
$Dir = Join-Path $env:TEMP ("lembretes-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $Dir | Out-Null

try {
  if (-not $AndroidOnly) {
    # 1) Chave do updater do Tauri
    bun install
    if ($LASTEXITCODE) { throw 'bun install falhou' }
    bun run tauri signer generate --ci -p $Pass -w "$Dir\updater.key"
    if ($LASTEXITCODE -or -not (Test-Path "$Dir\updater.key")) { throw 'tauri signer generate falhou' }
    Get-Content "$Dir\updater.key" -Raw | gh secret set TAURI_SIGNING_PRIVATE_KEY --repo $Repo
    gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo $Repo --body $Pass
    Get-Content "$Dir\updater.key.pub" -Raw | gh secret set TAURI_UPDATER_PUBKEY --repo $Repo
  }

  # 2) Keystore fixa do Android
  & $Keytool -genkeypair -keystore "$Dir\ks.jks" -alias lembretes -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $Pass -keypass $Pass -dname "CN=Queima Lembretes"
  if ($LASTEXITCODE -or -not (Test-Path "$Dir\ks.jks")) { throw 'keytool falhou' }
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$Dir\ks.jks"))
  gh secret set ANDROID_KEYSTORE_BASE64 --repo $Repo --body $b64
  gh secret set ANDROID_KEYSTORE_PASSWORD --repo $Repo --body $Pass
  gh secret set ANDROID_KEY_ALIAS --repo $Repo --body lembretes

  # 3) Backup (sem ele o APK instalado não atualiza mais) e conferência
  $Backup = Join-Path $HOME 'lembretes-keystore-BACKUP.jks'
  Copy-Item "$Dir\ks.jks" $Backup
  Set-Content (Join-Path $HOME 'lembretes-keystore-SENHA.txt') $Pass
  gh secret list --repo $Repo
  Write-Host "Pronto. Guarde fora do git: $Backup e lembretes-keystore-SENHA.txt"
}
finally { Remove-Item $Dir -Recurse -Force -ErrorAction SilentlyContinue }
