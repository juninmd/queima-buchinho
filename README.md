# Queima Buchinho 🔥

Bot do Telegram para motivação de treinos! Este bot:
- ✅ Roda automaticamente via **GitHub Actions** às 22h todos os dias
- ✅ Parabeniza quando você informa que treinou
- 🎵 Envia áudio motivacional quando você não treinou
- 🖼️ Envia imagem motivacional para te incentivar
- 💰 **Sem custo de infraestrutura** - usa GitHub Actions gratuito!

> 🔧 **[→ Ver lista completa de configurações necessárias (CONFIGURACAO.md)](CONFIGURACAO.md)**

## 🎯 Como Funciona

1. Durante o dia, você envia "eu treinei", "treinei" ou "treinado" para o bot
2. Às **22h**, o bot verifica automaticamente se você treinou
3. **Treinou?** → Recebe parabenização 🎉
4. **Não treinou?** → Recebe motivação (áudio + imagem) 💪

## Funcionalidades

- **Verificação diária automática**: Via GitHub Actions às 22h (horário de Brasília)
- **Detecção automática de treino**: Reconhece mensagens com "eu treinei", "treinei" ou "treinado"
- **Mensagens de parabéns**: Parabenizações automáticas quando você treina
- **Motivação ativa**: Áudio e imagem motivacionais quando você não treina
- **Sem custo**: Roda gratuitamente no GitHub Actions (2000 min/mês grátis)
- **Dois modos de operação**:
  - **Checker** (padrão): Verificação diária via cron
  - **Listener** (opcional): Monitoramento contínuo de mensagens

## Pré-requisitos

- Conta no GitHub (para rodar via Actions)
- Token de bot do Telegram (obtido através do [@BotFather](https://t.me/botfather))
- Seu Chat ID do Telegram

## 🚀 Setup Rápido (GitHub Actions)

### 1. Obter Token do Bot

1. No Telegram, fale com [@BotFather](https://t.me/botfather)
2. Envie `/newbot` e siga as instruções
3. Copie o token fornecido

### 2. Obter seu Chat ID

1. Envie uma mensagem qualquer para seu bot
2. Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
3. Procure por `"chat":{"id":XXXXXXX}` - esse é seu Chat ID

### 3. Configurar GitHub Secrets

No seu repositório:

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Crie dois secrets:
   - `TELEGRAM_BOT_TOKEN`: Seu token do bot
   - `CHAT_ID`: Seu chat ID (número)

### 4. Pronto!

O bot rodará automaticamente às 22h todos os dias! 🎉

Para mais detalhes, veja [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)

## Como usar

### GitHub Actions (Recomendado - Grátis!)

Após configurar os Secrets:

1. O bot roda automaticamente às 22h
2. Para testar agora: **Actions** → **Daily Workout Check** → **Run workflow**
3. Envie "eu treinei" para o bot durante o dia
4. Aguarde às 22h para receber a verificação!

### Modo Local (Desenvolvimento)

Se quiser rodar localmente:

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Modo listener (contínuo)
BOT_MODE=listener npm run dev

# Modo checker (teste de verificação única)
BOT_MODE=checker npm start
```

## Comandos do Bot

Quando em modo listener, você pode usar:

- `/help` - Mostra a ajuda e instruções de uso
- `/status` - Verifica se você já treinou hoje
- `/checktreino` - Verifica o status e recebe motivação se necessário
- `/reset` - Reseta seu status de treino (útil para testes)

**Nota**: No modo checker (GitHub Actions), os comandos não são necessários - o bot verifica automaticamente às 22h.

## Como criar um bot no Telegram

1. Abra o Telegram e procure por [@BotFather](https://t.me/botfather)
2. Envie o comando `/newbot`
3. Siga as instruções para escolher um nome e username para seu bot
4. O BotFather fornecerá um token - **guarde este token**
5. Configure o token nos GitHub Secrets (veja Setup acima)
6. Envie uma mensagem para seu bot para obter o Chat ID

## 📊 Arquitetura

### Modo Checker (GitHub Actions)
```
┌─────────────────────────────────────────┐
│  GitHub Actions (às 22h diariamente)    │
│  ┌─────────────────────────────────┐   │
│  │ 1. Busca mensagens do dia       │   │
│  │ 2. Verifica palavras-chave      │   │
│  │ 3. Treinou? → Parabeniza        │   │
│  │    Não treinou? → Motiva        │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Modo Listener (Opcional)
```
┌─────────────────────────────────────────┐
│  Bot rodando continuamente              │
│  ┌─────────────────────────────────┐   │
│  │ Mensagem recebida               │   │
│  │ └─> Contém "treinei"?           │   │
│  │     └─> Sim: Parabeniza         │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Estrutura do Projeto

```
queima-buchinho/
├── .github/
│   └── workflows/
│       ├── daily-check.yml    # Workflow principal (22h diárias)
│       └── listener.yml       # Workflow opcional (contínuo)
├── src/
│   └── index.ts              # Código principal do bot
├── assets/
│   ├── motivation.mp3        # Áudio motivacional (opcional)
│   └── motivation.jpg        # Imagem motivacional (opcional)
├── data/                     # Dados persistidos (auto-gerado)
├── .env.example              # Exemplo de configuração
├── GITHUB_ACTIONS_SETUP.md   # Guia completo de setup
└── README.md
```

## Tecnologias Utilizadas

- **TypeScript**: Linguagem de programação
- **Node.js**: Runtime JavaScript
- **node-telegram-bot-api**: Biblioteca para interação com a API do Telegram
- **GitHub Actions**: Automação e agendamento (cron)
- **dotenv**: Gerenciamento de variáveis de ambiente

## 💰 Custo

**GRÁTIS!** 🎉

- GitHub Actions: 2000 minutos/mês no plano gratuito
- Este bot usa ~1 minuto/dia = ~30 minutos/mês
- Sobram 1970 minutos para outros projetos!

## 📚 Documentação Completa

- **[CONFIGURACAO.md](CONFIGURACAO.md)** - 🔧 Lista completa de valores e secrets necessários
- **[QUICKSTART.md](QUICKSTART.md)** - ⚡ Guia rápido de 3 passos
- **[GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)** - 📖 Setup detalhado e troubleshooting
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 🏗️ Arquitetura técnica do sistema
- **[EXAMPLES.md](EXAMPLES.md)** - 💡 Exemplos de uso

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## Licença

MIT