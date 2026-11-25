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

## Pareamento por QR code (sem digitar nada)

O app Android só funciona depois de pareado, e o único jeito é escanear um QR gerado no servidor:

```bash
bun run pair            # no servidor: imprime o QR (usa PUBLIC_API_URL; uso único, expira em 5 min)
bun run pair list       # dispositivos pareados
bun run pair revoke 3   # revoga um dispositivo (o app volta para a tela de pareamento)
bun run pair revoke-all
```

O QR leva a URL e um código de uso único; o app troca o código por um token de dispositivo (365 dias,
revogável, só o hash fica no banco). "Desparear" nos Ajustes revoga o token no servidor. No navegador em dev
(`bun run dev`) continuam os dados de exemplo; no desktop o leitor de QR não existe (use o Android).
Rode `bun run migrate` no servidor antes do primeiro pareamento.
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
- `scripts/setup-release.ps1`: o mesmo, para Windows/PowerShell.

## Recursos de uso

- **Notificações agendadas (mobile):** o app reagenda localmente os lembretes de hoje (pendentes) e de amanhã a cada sincronização, então avisam com o app fechado. No desktop continuam saindo enquanto o app está aberto.
- **Soneca:** botão ⏰ em cada lembrete pendente adia 10 min.
- **Fila offline:** água/hábitos marcados sem rede ficam guardados e são reenviados na próxima sincronização.
- **Histórico:** gráfico dos últimos 7 dias (água e atividades) guardado localmente; meta de água editável em Ajustes.
