# Gera as chaves do updater e do APK e grava os secrets do repositório (Windows/PowerShell).
# Requisitos: gh (logado), bun e keytool (JDK) no PATH. Rode dentro da pasta lembretes/.
param([string]$Repo = 'juninmd/queima-buchinho')
$ErrorActionPreference = 'Stop'

$chars = [char[]]([char]'a'..[char]'z' + [char]'A'..[char]'Z' + [char]'0'..[char]'9')
$Pass = -join (1..32 | ForEach-Object { $chars[[System.Security.Cryptography.RandomNumberGenerator]::GetInt32($chars.Length)] })
$Dir = Join-Path $env:TEMP ("lembretes-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $Dir | Out-Null

try {
  # 1) Chave do updater do Tauri
  bunx tauri signer generate --ci -p $Pass -w "$Dir\updater.key"
  Get-Content "$Dir\updater.key" -Raw | gh secret set TAURI_SIGNING_PRIVATE_KEY --repo $Repo
  gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo $Repo --body $Pass
  Get-Content "$Dir\updater.key.pub" -Raw | gh secret set TAURI_UPDATER_PUBKEY --repo $Repo

  # 2) Keystore fixa do Android
  keytool -genkeypair -keystore "$Dir\ks.jks" -alias lembretes -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $Pass -keypass $Pass -dname "CN=Queima Lembretes"
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
