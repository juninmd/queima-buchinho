# Arquitetura do Sistema

## 🏗️ Visão Geral

O Queima Buchinho Bot opera em dois modos distintos para maximizar eficiência e minimizar custos.

## 📊 Modos de Operação

### Modo 1: Checker (GitHub Actions - Recomendado)

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DIÁRIO                             │
└─────────────────────────────────────────────────────────────┘

08:00 AM                    Usuário acorda
  │
10:00 AM                    Usuário treina
  │                         └─> Envia "eu treinei" para bot
  │                             └─> Mensagem salva no Telegram
  │
  │ ... dia continua ...
  │
22:00 PM                    ⏰ GitHub Actions Cron
  │                         
  ├─────> Workflow Inicia
  │       │
  │       ├─> npm ci (instala dependências)
  │       │
  │       ├─> npm run build (compila TypeScript)
  │       │
  │       ├─> BOT_MODE=checker npm start
  │       │   │
  │       │   ├─> getUpdates() - busca mensagens do dia
  │       │   │
  │       │   ├─> Filtra mensagens de hoje
  │       │   │
  │       │   ├─> Busca palavras-chave:
  │       │   │   • "eu treinei"
  │       │   │   • "treinei"
  │       │   │   • "treinado"
  │       │   │
  │       │   └─> Decisão:
  │       │       │
  │       │       ├─> ✅ ENCONTROU
  │       │       │   └─> sendMessage(parabenização)
  │       │       │       "🎉 Parabéns! Você treinou!"
  │       │       │
  │       │       └─> ❌ NÃO ENCONTROU
  │       │           ├─> sendVoice(motivation.mp3)
  │       │           │   "🔥 Vamos lá! Não desista!"
  │       │           └─> sendPhoto(motivation.jpg)
  │       │               "💪 Você consegue!"
  │       │
  │       └─> Workflow Finaliza
  │           └─> process.exit(0)
  │
00:00 AM                    Próximo dia começa
  │                         └─> Ciclo reinicia
  └─────────────────────────────────────────────────────────>
```

### Modo 2: Listener (Opcional - Local/Servidor)

```
┌─────────────────────────────────────────────────────────────┐
│                  MODO CONTÍNUO                              │
└─────────────────────────────────────────────────────────────┘

Bot Iniciado
  │
  ├─> bot.on('message')  ◄──── Escuta contínua
  │   │
  │   └─> Mensagem recebida
  │       │
  │       ├─> Contém palavra-chave?
  │       │   │
  │       │   ├─> ✅ SIM
  │       │   │   ├─> markWorkout(userId)
  │       │   │   │   └─> salva em data/workout-status.json
  │       │   │   └─> sendMessage(parabenização)
  │       │   │
  │       │   └─> ❌ NÃO
  │       │       └─> Ignora mensagem
  │       │
  │       └─> Volta a escutar
  │
  └─> Loop infinito até bot ser parado
```

## 🔄 Comparação de Modos

| Aspecto | Checker (GitHub Actions) | Listener (Contínuo) |
|---------|-------------------------|---------------------|
| **Custo** | Grátis (2000 min/mês) | Requer servidor 24/7 |
| **Execução** | 1x por dia às 22h | Contínuo |
| **Resposta** | Apenas às 22h | Instantânea |
| **Detecção** | Via getUpdates() | Via polling |
| **Uso** | ~1 min/dia | 24h/dia |
| **Ideal para** | Verificação diária | Interação em tempo real |

## 🎯 Fluxo de Dados

```
┌──────────────┐
│   Usuário    │
│  @jr_acn     │
└──────┬───────┘
       │
       │ "eu treinei"
       ▼
┌──────────────────┐
│  Telegram API    │
│  (armazena msg)  │
└──────┬───────────┘
       │
       │ Modo Listener: polling contínuo
       │ Modo Checker: getUpdates às 22h
       ▼
┌──────────────────┐
│  Bot Logic       │
│  - Valida texto  │
│  - Checa status  │
└──────┬───────────┘
       │
       ├─> Treinou: Parabenização
       └─> Não treinou: Motivação
       │
       ▼
┌──────────────────┐
│  Telegram API    │
│  (envia msg)     │
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│   Usuário    │
│  @jr_acn     │
└──────────────┘
```

## 💾 Persistência de Dados

```
data/workout-status.json
{
  "94324040": "Sun Feb 09 2026"  // userId: data do último treino
}

Atualizado quando:
- Listener: Em tempo real ao receber mensagem
- Checker: Ao verificar mensagens do dia
```

## 🔐 Configuração de Secrets

```
GitHub Repository Secrets:
├── TELEGRAM_BOT_TOKEN
│   └── "8088364809:AAEbq86Q1vRlRMh-CHi6I_bcOtiHUmY4hHw"
└── CHAT_ID
    └── "94324040"

Acessados via:
- process.env.TELEGRAM_BOT_TOKEN
- process.env.CHAT_ID
```

## ⏰ Cron Schedule

```yaml
schedule:
  - cron: '0 1 * * *'
    # ┬ ┬ ┬ ┬ ┬
    # │ │ │ │ │
    # │ │ │ │ └─ Dia da semana (0-6, 0=Domingo)
    # │ │ │ └─── Mês (1-12)
    # │ │ └───── Dia do mês (1-31)
    # │ └─────── Hora UTC (0-23)
    # └───────── Minuto (0-59)

'0 1 * * *' = 01:00 UTC = 22:00 BRT (Horário de Brasília)

Conversão UTC para BRT:
- UTC-3 = BRT (horário de verão pode variar)
- 01:00 UTC = 22:00 BRT
```

## 📦 Build Process

```
┌────────────────────┐
│  src/index.ts      │  TypeScript source
└─────────┬──────────┘
          │
          │ npm run build (tsc)
          ▼
┌────────────────────┐
│  dist/index.js     │  Compiled JavaScript
└─────────┬──────────┘
          │
          │ npm start (node dist/index.js)
          ▼
┌────────────────────┐
│  Bot Running       │
└────────────────────┘
```

## 🌐 API Calls

### getUpdates (Checker Mode)
```javascript
await bot.getUpdates({ offset: -1, limit: 100 })
// Retorna últimas 100 mensagens
// Filtra por data de hoje
```

### sendMessage (Todos os modos)
```javascript
await bot.sendMessage(chatId, message)
// Envia texto para usuário
```

### sendVoice (Motivação)
```javascript
await bot.sendVoice(chatId, audioPath, { caption: '...' })
// Envia arquivo MP3
```

### sendPhoto (Motivação)
```javascript
await bot.sendPhoto(chatId, imagePath, { caption: '...' })
// Envia arquivo JPG
```

## 🎯 Decisão: Qual Modo Usar?

**Use Checker (GitHub Actions) se:**
- ✅ Quer economia total (grátis)
- ✅ Verificação 1x/dia é suficiente
- ✅ Não precisa de interação em tempo real
- ✅ Prefere simplicidade (sem servidor)

**Use Listener se:**
- ✅ Quer resposta instantânea
- ✅ Tem servidor disponível 24/7
- ✅ Precisa de comandos interativos (/status, /help, etc)
- ✅ Quer logs em tempo real

**Recomendação Atual**: **Checker** ✅
- Custo zero
- Atende o requisito (verificação às 22h)
- Sem complexidade de infraestrutura
