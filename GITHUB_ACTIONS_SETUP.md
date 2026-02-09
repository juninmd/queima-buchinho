# Configuração do GitHub Actions

Este guia explica como configurar o bot para rodar no GitHub Actions com verificação diária às 22h.

## 📋 Visão Geral

O bot agora funciona em dois modos:

1. **Modo Checker** (Recomendado): Roda via GitHub Actions às 22h diariamente
   - Sem custo de infraestrutura
   - Verifica se você treinou durante o dia
   - Envia parabenização ou motivação

2. **Modo Listener** (Opcional): Roda continuamente capturando mensagens
   - Pode rodar localmente ou em servidor
   - Responde instantaneamente às mensagens

## 🚀 Configuração Passo a Passo

### 1. Obter Token do Bot

Você já tem o token:
```
***REMOVED-BOT-TOKEN***
```

### 2. Obter o Chat ID

Você já tem o Chat ID (User ID):
```
94324040
```

### 3. Configurar GitHub Secrets

No seu repositório GitHub:

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

   **Secret 1:**
   - Name: `TELEGRAM_BOT_TOKEN`
   - Value: `***REMOVED-BOT-TOKEN***`

   **Secret 2:**
   - Name: `CHAT_ID`
   - Value: `94324040`

### 4. Habilitar GitHub Actions

1. Vá em **Actions** no seu repositório
2. Se necessário, clique em **Enable Actions**
3. O workflow `Daily Workout Check` será executado automaticamente às 22h (horário de Brasília)

### 5. Testar Manualmente

Para testar antes de esperar às 22h:

1. Vá em **Actions** → **Daily Workout Check**
2. Clique em **Run workflow**
3. Selecione a branch `main` (ou sua branch atual)
4. Clique em **Run workflow**

## 🕐 Horário da Execução

O workflow está configurado para rodar às **22h (horário de Brasília - UTC-3)**.

```yaml
schedule:
  - cron: '0 1 * * *'  # 01:00 UTC = 22:00 BRT
```

Se quiser mudar o horário, edite o arquivo `.github/workflows/daily-check.yml`:
- `0 1` = 22h BRT (01:00 UTC)
- `0 2` = 23h BRT (02:00 UTC)
- `0 0` = 21h BRT (00:00 UTC)

## 📊 Como Funciona

### Fluxo Diário

```
09:00 - Você acorda
10:00 - Você treina e envia "eu treinei" para o bot
       └─> Bot salva que você treinou (se listener estiver ativo)
       
22:00 - GitHub Actions roda automaticamente
       ├─> Verifica mensagens do dia
       ├─> Encontra sua mensagem "eu treinei"
       └─> Envia parabenização 🎉

OU (se não treinou)

22:00 - GitHub Actions roda automaticamente
       ├─> Verifica mensagens do dia
       ├─> Não encontra mensagem de treino
       └─> Envia motivação (áudio + imagem) 💪
```

### Detecção de Treino

O bot detecta treino de duas formas:

1. **Modo Listener** (se ativo): Detecta em tempo real quando você envia mensagem
2. **Modo Checker**: Busca mensagens do dia inteiro usando a API do Telegram

Palavras-chave reconhecidas:
- "eu treinei"
- "treinei"
- "treinado"

## 🔒 Segurança

✅ **Token protegido**: Armazenado em GitHub Secrets, nunca exposto no código
✅ **Execução isolada**: Cada run do workflow é isolado
✅ **Logs privados**: Logs do workflow são privados do repositório

## 🎯 Vantagens do GitHub Actions

- ✅ **Grátis**: 2000 minutos/mês no plano gratuito
- ✅ **Confiável**: Execução garantida no horário agendado
- ✅ **Sem servidor**: Não precisa manter servidor ligado
- ✅ **Fácil debug**: Logs completos de cada execução

## 🛠️ Troubleshooting

### Bot não enviou mensagem às 22h

1. Verifique os **Secrets** estão configurados corretamente
2. Vá em **Actions** e veja se o workflow executou
3. Clique no workflow run e veja os logs

### Erro "TELEGRAM_BOT_TOKEN não está definido"

- Verifique se o secret `TELEGRAM_BOT_TOKEN` foi criado corretamente
- O nome deve ser exatamente `TELEGRAM_BOT_TOKEN`

### Erro "CHAT_ID não está definido"

- Verifique se o secret `CHAT_ID` foi criado corretamente
- O valor deve ser `94324040`

### Bot não detectou meu treino

- Certifique-se de enviar a mensagem para o bot @junin_n8n_bot
- Use uma das palavras-chave: "eu treinei", "treinei" ou "treinado"
- As mensagens devem ser enviadas no mesmo dia (até às 22h)

## 📱 Uso Local (Opcional)

Se quiser rodar localmente em modo listener:

```bash
# Configure o .env
cp .env.example .env
# Edite .env e adicione:
# TELEGRAM_BOT_TOKEN=***REMOVED-BOT-TOKEN***
# CHAT_ID=94324040
# BOT_MODE=listener

# Rode o bot
npm run dev
```

## 📞 Próximos Passos

1. Configure os Secrets no GitHub
2. Faça merge desta PR
3. Envie uma mensagem de teste "eu treinei" para @junin_n8n_bot
4. Teste manualmente o workflow em Actions
5. Aguarde às 22h para receber sua primeira notificação automática! 🎉
