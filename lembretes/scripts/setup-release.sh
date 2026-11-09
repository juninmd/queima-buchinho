#!/usr/bin/env bash
# Gera as chaves do updater e do APK e grava os secrets do repositório (rode uma vez, logado no `gh`).
set -euo pipefail
REPO="${1:-juninmd/queima-buchinho}"
DIR="$(mktemp -d)"; trap 'rm -rf "$DIR"' EXIT
PASS="$(openssl rand -base64 24)"

# 1) Chave do updater do Tauri (assinatura dos instaladores)
bunx tauri signer generate --ci -p "$PASS" -w "$DIR/updater.key"
gh secret set TAURI_SIGNING_PRIVATE_KEY --repo "$REPO" < "$DIR/updater.key"
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo "$REPO" --body "$PASS"
gh secret set TAURI_UPDATER_PUBKEY --repo "$REPO" < "$DIR/updater.key.pub"

# 2) Keystore fixa do Android (o APK só atualiza por cima se a assinatura for sempre a mesma)
keytool -genkeypair -v -keystore "$DIR/ks.jks" -alias lembretes -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=Queima Lembretes"
base64 -w0 "$DIR/ks.jks" | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO"
gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO" --body "$PASS"
gh secret set ANDROID_KEY_ALIAS --repo "$REPO" --body lembretes

echo "Secrets gravados em $REPO. Guarde um backup do keystore: perdê-lo impede atualizar o APK instalado."
cp "$DIR/ks.jks" "./lembretes-keystore-BACKUP.jks" && echo "Backup: ./lembretes-keystore-BACKUP.jks (guarde fora do git)"
