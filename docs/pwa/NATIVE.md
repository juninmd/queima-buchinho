# App nativo (Android e iOS) com notificações ricas

O mesmo app React do `dashboard/` roda dentro de uma casca [Capacitor](https://capacitorjs.com). Telas, offline e
fila de escrita são as do PWA; o que muda é o push: em vez de Web Push, o aparelho registra um **token FCM**
(Firebase Cloud Messaging) e o bot entrega pela API do FCM, que repassa ao Android (FCM) e ao iOS (APNs).

```
Scheduler/Telegram ──► pushService.notify ──┬─► Web Push (PWA, tabela push_subscriptions)
                                            └─► FCM v1 (app nativo, tabela device_tokens)
App nativo ──► POST /api/push/device (token) · POST /api/push/action (botões da notificação)
Telegram /app ──► link do app + notificação de teste nos aparelhos registrados
```

## O que a notificação nativa traz

| Recurso | Android | iOS |
|---|---|---|
| Imagem grande (1º aparelho da ficha) | sim (FCM `image`) | sim, com a extensão `NotificationService` |
| Canais por tipo (ficha, água, refeições, fechamento) | sim (`qb-*`, criados no app) | — |
| Botões rápidos (`+200 ml`, `+300 ml`, `Já comi ✅`) | não: tocar abre a aba certa | sim (categorias `QB_*`) |
| Prioridade alta / urgência temporal | `priority: HIGH` | `time-sensitive` |
| Agrupamento por tipo | `tag` | `thread-id` |
| Toque abre a aba (`/#treino`, `/#hoje`…) | sim | sim |

Os botões gravam no **mesmo Postgres** do Telegram (`POST /api/push/action`): a água aparece no `/relatorio`
e a refeição marca o hábito, sem passar pela tela. As preferências (Ajustes › Lembretes) valem por aparelho.

## 1. Servidor

```bash
bun run migrate          # cria device_tokens (além de push_subscriptions)
```
`.env` do bot:
- `FCM_SERVICE_ACCOUNT`: JSON da conta de serviço do Firebase (Configurações do projeto › Contas de serviço ›
  Gerar nova chave), puro ou em base64. Sem ela, só o Web Push funciona e `/api/push/config` devolve `native: false`.
- `APP_URL`: endereço HTTPS do app (aparece no `/app` do Telegram).

## 2. Firebase

1. Crie um projeto no Firebase e registre **dois apps** com o id `br.com.queimabuchinho.app` (Android e iOS).
2. Baixe `google-services.json` → `dashboard/android/app/` e `GoogleService-Info.plist` → `dashboard/ios/App/App/`
   (ambos ignorados pelo git).
3. iOS: em Configurações do projeto › Cloud Messaging, envie a **chave APNs** (.p8) da sua conta Apple Developer.

## 3. Android

```bash
cd dashboard && bun install
bun run native:android     # build web + cap sync + ícones/splash + abre o Android Studio
```
Run ▶ no aparelho, ou `cd android && ./gradlew assembleDebug` (APK em `app/build/outputs/apk/debug`).
O workflow `android.yml` gera o APK de debug a cada mudança (secret opcional `GOOGLE_SERVICES_JSON`).
Release: crie sua keystore (nunca no git) e rode `./gradlew bundleRelease` para a Play Store.

## 4. iOS (precisa de macOS + Xcode)

```bash
cd dashboard && bun run native:ios
```
No Xcode, alvo **App**: Signing com seu time e, em *Signing & Capabilities*, confira **Push Notifications** e
**Background Modes › Remote notifications** (já declarados em `App.entitlements`/`Info.plist`). Para
`production`, troque `aps-environment` para `production` no arquivo de entitlements.

**Imagem nas notificações (extensão):**
1. File › New › Target › *Notification Service Extension*, nome `NotificationService`, Swift, embed in App.
2. Substitua o `NotificationService.swift` e o `Info.plist` gerados pelos de `dashboard/native/ios/NotificationService/`.
3. Ajuste o *Deployment Target* da extensão para o do app (15.0+) e assine com o mesmo time.

## 5. Conectar o app ao bot

Na primeira abertura informe a **URL HTTPS do bot** (a origem do WebView é `https://localhost`, então não há
valor padrão) e o `DASHBOARD_TOKEN`. Depois, **Ajustes › Lembretes › Ativar** pede a permissão e registra o token.
No Telegram, `/app` confirma quantos aparelhos estão registrados e dispara uma notificação de teste.

## Desenvolvimento

```bash
bun run lint && bun run test        # dashboard (vitest)
bun run native:sync                 # depois de mudar o front: rebuilda e copia para android/ e ios/
```
O front só carrega o plugin do Firebase dentro do app nativo (`import()` sob demanda em `src/lib/native.ts`);
o PWA continua sem o SDK web do Firebase.

> Os projetos `android/` e `ios/` foram gerados e o front compila e passa nos testes, mas o build nativo,
> o envio real via FCM/APNs e a extensão de imagem do iOS dependem de SDKs, contas Firebase/Apple e
> aparelhos que não existem neste ambiente: valide em um aparelho antes de publicar.
