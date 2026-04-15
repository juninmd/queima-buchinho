# 🚀 Configuração Helm (app-charts) - Queima Buchinho

Para que o bot funcione **definitivamente produtivamente**, adicione as seguintes configurações ao seu `values.yaml` no repositório `app-charts`.

## 1. 🏥 Health Check (Liveness/Readiness)
O bot agora expõe saúde na porta **8080** (endpoint `/health`).
```yaml
probes:
  liveness:
    path: /health
    port: 8080
  readiness:
    path: /health
    port: 8080
```

## 2. 🚀 Migrações Automáticas (initContainer)
Configure o `initContainer` para rodar as migrações sempre que o bot subir.
```yaml
initContainers:
  - name: migrate
    image: ghcr.io/juninmd/queima-buchinho:latest
    command: ["pnpm", "run", "migrate"]
    envFrom:
      - configMapRef: { name: queima-buchinho-config }
      - secretRef: { name: queima-buchinho-secrets }
```

## 3. ⏰ CronJobs (Lembretes)
O bot precisa de agendamentos para os lembretes. Adicione estas definições de CronJob no seu chart:

| Nome | Schedule | BOT_MODE |
| :--- | :--- | :--- |
| `checker` | `0 22 * * *` | `checker` |
| `morning` | `0 8 * * *` | `reminder_morning` |
| `water` | `0 9-21/2 * * *` | `reminder_water` |
| `conditional` | `0 18,20 * * *` | `reminder_conditional` |
| `food-almoco` | `30 12 * * *` | `reminder_food_almoco` |
| `habits-check` | `0 21 * * *` | `reminder_habits_check` |

## 🛡️ Variáveis de Ambiente Essenciais
Certifique-se de que estas variáveis estejam no seu `Secret` ou `ConfigMap`:
- `TELEGRAM_BOT_TOKEN`: Token do Bot.
- `DATABASE_URL`: `postgres://user:pass@host:5432/db`
- `REDIS_URL`: `redis://host:6379`
- `CHAT_ID`: ID do chat do Telegram.
- `OLLAMA_HOST`: `http://ollama-service.namespace.svc.cluster.local:11434`

## 🛑 Shutdown Gracioso
O Kubernetes enviará um `SIGTERM`. O bot está configurado para encerrar as conexões com o banco e o Redis automaticamente ao receber este sinal.
```yaml
terminationGracePeriodSeconds: 30
```
