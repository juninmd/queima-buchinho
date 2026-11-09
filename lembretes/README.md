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
