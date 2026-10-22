# API do app (PWA)

Servidor HTTP em `src/api/` (porta `DASHBOARD_PORT`, padrão 8081). Todas as rotas `/api/*` exigem
`Authorization: Bearer $DASHBOARD_TOKEN`; corpo e resposta em JSON. Erros: `{ "error": "<codigo>" }`
com 400 (`invalid_*`), 401 (`unauthorized`), 404 (`not_found`), 405 (`method_not_allowed`), 413 (`payload_too_large`), 500 (`internal_error`), 503 (`mika_unavailable`, `push_disabled`).
CORS libera `GET, POST, PUT, DELETE, OPTIONS` (origem em `DASHBOARD_CORS_ORIGIN`).
Os arquivos estáticos do PWA (`dashboard/dist`, ou `PWA_DIST_DIR`) são servidos sem auth (GET/HEAD) fora de `/api/`, com fallback SPA para `index.html`; só ativa se a pasta existir. `/assets/*` com cache imutável; `sw.js`, manifest e index com `no-cache`.
`Idempotency-Key` (opcional) em `POST /api/metrics`: repetir a mesma chave não grava duas vezes (fila offline).

## Já existentes
`GET /api/dashboard/daily|weekly|monthly`, `GET /api/dashboard/analysis?range=daily|weekly|monthly[&refresh=1]`.

## Estado do dia
`GET /api/app/today` →
```ts
{
  date: string; weekday: string;            // "2026-10-20", "terça-feira"
  habitDefs: { key: string; emoji: string; label: string; category: 'fitness'|'nutrition'|'wellness' }[];
  habits: Record<string, boolean>;
  water: { ml: number; goalMl: number; paceMl: number; celebrationMl: number };
  weight: number | null;                    // último peso registrado (não só o de hoje)
  body: { height: number | null; bodyFat: number | null; muscleMass: number | null; steps: number };
  streak: number; trained: boolean /* workout_logs OU hábito treino */; cardioDone: boolean;
  pauseUntil: string | null;                // "2026-10-22"
}
```

## Hábitos e treino
- `PUT /api/habits/:key` `{ completed: boolean }` → `{ habits: Record<string, boolean> }` (404 se a chave não existe).
- `POST /api/workout/reset` → `{ ok: true }` (equivale a `/reset`: apaga o treino de hoje e desmarca o hábito `treino`).
- `GET /api/ficha` → `{ ficha: Ficha | null; trained: boolean; cardioDone: boolean }` (`null` em dia de descanso; `Ficha` = `src/features/ficha/types.ts`).
- `POST /api/ficha/loads` `{ exerciseKey: string; delta: number }` → `{ loadKg: number }` (delta ∈ {-5,-2.5,2.5,5}; 400 se o exercício não está na ficha de hoje ou não tem carga).
- `POST /api/ficha/done` → `{ trained: true }` · `POST /api/ficha/cardio` → `{ cardioDone: true }`.
- `GET /api/diet` → `{ day: string; meals: { key: 'cafe'|'almoco'|'cafe_tarde'|'jantar'; text: string; done: boolean }[] }`.

## Métricas
- `POST /api/metrics` `{ type: 'water'|'weight'|'steps'|'height'|'body_fat'|'muscle_mass'; value: number }` →
  `{ id: number; total?: number }` (`total` = água acumulada hoje). Valida `METRIC_LIMITS`; 400 `invalid_value` fora da faixa.
- `DELETE /api/metrics/:id` → `{ deleted: boolean }` (desfazer).
- `POST /api/quick-log` `{ text: string }` → registro rápido pelo `parseQuickLog` do bot:
  `{ kind: 'water'|'weight', id: number, message: string }` (já gravado), `{ kind: 'workout'|'cardio', needsConfirm: true }`
  (o app confirma e chama `/api/ficha/done` ou `/api/ficha/cardio`) ou `{ kind: 'none' }` (siga para o chat da Mika).

## Pausa
`GET /api/pause` → `{ until: string | null }` · `POST /api/pause` `{ days: 1..30 }` → `{ until }` · `DELETE /api/pause` → `{ resumed: boolean }`.

## Mika
- `POST /api/mika/chat` `{ message: string (≤500) }` → `{ message: string }` (LLM; 503 `mika_unavailable` se fora).
- `GET /api/mika/cantada` → `{ message }`.
- `POST /api/mika/motivar` → `{ message: string; audioBase64: string | null }` (mp3 do TTS; `null` se o TTS falhar).
- `GET /api/mika/instante?q=` → `{ title: string; audioUrl: string }` (404 se nada).
- `GET /api/mika/media?kind=gif|sticker|meme[&q=]` → `{ items: { url: string; preview: string; title: string }[] }` (sem `q`, sorteia da categoria; `items` vem vazio se a mídia só existir como arquivo local, pois o app não a alcança).

## Notificações push (Web Push, VAPID)
Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:). Sem elas, `enabled: false` e `subscribe`/`prefs` respondem 503 `push_disabled`. Endpoint precisa ser `https://`.
- `GET /api/push/config` → `{ enabled: boolean; publicKey: string | null; native: boolean }` (`native` = `FCM_SERVICE_ACCOUNT` configurada).
- `POST /api/push/subscribe` `{ subscription: PushSubscriptionJSON; prefs?: PushPrefs }` → `{ ok: true }`.
- `PUT /api/push/prefs` `{ endpoint: string; prefs: PushPrefs }` → `{ ok: true }` (404 se a inscrição não existe).
- `DELETE /api/push/subscribe` `{ endpoint: string }` → `{ ok: true }`.

### App nativo (token FCM) — ver [NATIVE.md](./NATIVE.md)
Env: `FCM_SERVICE_ACCOUNT`. Sem ela, `POST /api/push/device` responde 503 `push_disabled`.
- `POST /api/push/device` `{ token: string; platform: 'android' | 'ios'; prefs?: PushPrefs }` → `{ ok: true }`.
- `PUT /api/push/device/prefs` `{ token: string; prefs: PushPrefs }` → `{ ok: true }` (404 se o token não existe).
- `DELETE /api/push/device` `{ token: string }` → `{ ok: true }`.
- `POST /api/push/action` `{ action: 'water_200' | 'water_300' | 'water_500' | 'meal_<cafe|almoco|cafe_tarde|jantar>' }`
  → `{ ok: true; message: string }` (400 `invalid_action`). Botões da notificação; grava no mesmo banco do Telegram.
- `PushPrefs = { ficha: boolean; agua: boolean; refeicao: boolean; fechamento: boolean }` (padrão tudo `true`).
- Payload enviado ao service worker: `{ title: string; body: string; tag: string; url: string }`. Disparos (respeitam a pausa e as prefs):
  ficha às 06:00, junto com a publicação no Telegram (`ficha`), lembrete de água só quando abaixo do ritmo (`agua`), refeição só se não marcada (`refeicao`), relatório das 21:30 (`fechamento`).
