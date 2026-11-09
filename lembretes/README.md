# Queima Lembretes (Tauri v2)

Widget de lembretes (desktop + Android) que substitui os avisos do Telegram, lendo a API do bot
(`GET /api/app/today`, `PUT /api/habits/:key`, `POST /api/metrics`). Sem API configurada, usa dados de exemplo.

```bash
bun install
bun run dev                 # protótipo no navegador (?widget=1 = visual compacto)
bun run tauri dev           # desktop
bun run tauri icon ../dashboard/public/icons/icon-512.png   # gera ícones (1ª vez)
bun run tauri android init && bun run tauri android build --apk
```

Na primeira abertura, informe a URL do bot e o `DASHBOARD_TOKEN` em "Conexão com a API".
CI: `.github/workflows/lembretes.yml` gera desktop (Linux) e o APK.

## Release e auto-update

Commits semânticos em `lembretes/` no `master` disparam `.github/workflows/lembretes-release.yml`:
`feat:` → minor, `fix:`/`perf:` → patch, `feat!:` ou `BREAKING CHANGE` → major; `chore/docs/ci` não geram release.
O fluxo cria a tag `lembretes-vX.Y.Z`, compila Linux/Windows/macOS (assinados) e o APK, verifica o
`latest.json` e só então publica. O manifesto do updater também vai para a release fixa `lembretes-latest`.

- **Desktop:** o app checa o `latest.json`, verifica a assinatura e mostra "Atualizar e reiniciar".
- **Android:** o app consulta a release e oferece "Baixar APK" (o Tauri updater é só desktop).

Configuração única (uma vez):

```bash
bunx tauri signer generate -w ~/.tauri/lembretes.key
```

Secrets do repositório: `TAURI_SIGNING_PRIVATE_KEY` (conteúdo da chave privada), `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`,
`TAURI_UPDATER_PUBKEY` (conteúdo do `.key.pub`) e, para o APK atualizar por cima, `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`. Nunca commite a chave privada.
- `scripts/setup-release.sh`: gera as chaves e grava todos os secrets de uma vez (precisa de `gh` logado com permissão de admin).
