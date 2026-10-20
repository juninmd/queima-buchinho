# App PWA do Queima Buchinho

App instalável (Android, iOS, desktop) que faz tudo o que o bot faz no Telegram. O código fica em
`dashboard/` (React + Vite) e conversa com a API do bot ([API.md](./API.md)). O Telegram segue funcionando igual.

## Telas e equivalência com o Telegram

| Telegram | App |
|---|---|
| `/menu` `/start` `/progresso` | **Hoje** (anel de hábitos, água, treino, próxima refeição) e **Hábitos** |
| `/agua`, "bebi 500ml" | Cartão de água (+200/+300/+500, desfazer) e campo de registro rápido |
| `/peso` `/altura` `/passos` `/gordura` `/musculo` | **Progresso › Registrar medidas** (mesmas faixas e recusa de valor ambíguo) |
| `/ficha`, Treinei, Fiz o cárdio, Ajustar carga | **Treino**: séries marcáveis, carga ±2,5/±5 kg, botões de conclusão |
| `/checktreino` `/cardio` `/streak` `/reset` | Hoje, Treino e Hábitos (zerar treino pede confirmação) |
| `/cardapio` | **Hábitos › Cardápio** (cada refeição marca o hábito) |
| `/relatorio` `/semana` | **Progresso**: hoje, 7 e 30 dias, gráficos e análise da Mika |
| `/pausar` `/voltar` | **Ajustes › Pausa** (1 a 30 dias) |
| `/motivar` `/cantada` `/meme` `/gif` `/sticker` `/instante` | **Mika**: chat com atalhos e os mesmos comandos digitados |
| Lembretes (06:00, água, refeição, 21:30) | Notificações push (**Ajustes › Lembretes**) |

## O que o app faz a mais

- **Offline**: abre sem rede com o último estado. Hábitos, água, medidas e conclusão de treino
  entram numa fila e sincronizam sozinhos ao voltar a conexão (água não duplica: `Idempotency-Key`).
- **Instalável**: manifest + service worker; atalhos para Treino e Mika no ícone.
- **Tema** claro/escuro conforme o sistema.

## Rodando

Produção: o bot serve o PWA (`dashboard/dist`) na porta `DASHBOARD_PORT` (8081), na mesma origem da API.
A imagem Docker já builda o app (estágio `pwa`). Abra a URL no celular, informe o `DASHBOARD_TOKEN`
e use "Adicionar à tela inicial". **Use HTTPS** (proxy reverso): service worker, push e instalação exigem.

```bash
# desenvolvimento
cd dashboard && bun install
bun run dev        # Vite em :5173 (aponte a URL da API na primeira tela)
bun run test       # vitest
bun run build      # tsc + vite build -> dist/
bun run icons      # regenera os PNGs (a partir da raiz: node dashboard/scripts/make-icons.mjs)
```

### Notificações push

```bash
npx web-push generate-vapid-keys
# .env do bot: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT=mailto:voce@exemplo.com
bun run migrate    # cria push_subscriptions
```
Depois, em **Ajustes › Lembretes**, toque em "Ativar lembretes" em cada aparelho.
No iPhone, o push só funciona com o app instalado na tela inicial (iOS 16.4+).

## App Android (TWA)

O APK/AAB é um invólucro (Trusted Web Activity) do mesmo PWA: nenhuma tela é reescrita.

1. Publique o PWA em HTTPS num domínio seu.
2. Edite `dashboard/twa-manifest.json` (troque `SEU-DOMINIO.exemplo.com`).
3. `npm i -g @bubblewrap/cli`, depois `cd dashboard && bubblewrap init --manifest=https://SEU-DOMINIO/manifest.webmanifest` e `bubblewrap build`
   (gera `app-release-signed.apk` e `.aab`; precisa de JDK 17 e Android SDK, o Bubblewrap oferece instalar).
4. `bubblewrap fingerprint` mostra o SHA-256 da chave; publique em `https://SEU-DOMINIO/.well-known/assetlinks.json`:
   ```json
   [{ "relation": ["delegate_permission/common.handle_all_urls"],
      "target": { "namespace": "android_app", "package_name": "br.com.queimabuchinho.app",
                  "sha256_cert_fingerprints": ["AA:BB:..."] } }]
   ```
   Sem esse arquivo o app abre com barra de endereço (modo Custom Tab). Para servi-lo pelo bot, coloque-o em
   `dashboard/public/.well-known/assetlinks.json` e refaça o build.
5. Instale o APK (`adb install`) ou envie o AAB à Play Store.

> O fluxo Bubblewrap não foi executado neste repositório (exige Android SDK e sua chave de assinatura).
> O restante (PWA, offline, push, API) é coberto por testes e foi verificado em navegador.
