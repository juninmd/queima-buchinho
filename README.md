# Queima Buchinho 🔥

Bot do Telegram para motivação de treinos! Este bot monitora mensagens em um grupo do Telegram e:
- ✅ Parabeniza quando você informa que treinou
- 🎵 Envia áudio motivacional quando você não treinou
- 🖼️ Envia imagem motivacional para te incentivar

## Funcionalidades

- **Detecção automática de treino**: O bot reconhece quando você envia mensagens contendo "eu treinei", "treinei" ou "treinado"
- **Mensagens de parabéns**: Receba parabenizações automáticas quando registrar seu treino
- **Motivação ativa**: Se você não treinou, o bot envia áudio e imagem motivacionais
- **Reset diário**: O status de treino é resetado automaticamente à meia-noite
- **Comandos úteis**: Vários comandos para interagir com o bot

## Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Token de bot do Telegram (obtido através do [@BotFather](https://t.me/botfather))

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/juninmd/queima-buchinho.git
cd queima-buchinho
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` e adicione seu token do Telegram:
```
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

5. (Opcional) Adicione arquivos de mídia motivacionais na pasta `assets/`:
   - `motivation.mp3` - Áudio motivacional
   - `motivation.jpg` - Imagem motivacional

## Como usar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

## Comandos do Bot

- `/help` - Mostra a ajuda e instruções de uso
- `/status` - Verifica se você já treinou hoje
- `/checktreino` - Verifica o status e recebe motivação se necessário
- `/reset` - Reseta seu status de treino (útil para testes)

## Como criar um bot no Telegram

1. Abra o Telegram e procure por [@BotFather](https://t.me/botfather)
2. Envie o comando `/newbot`
3. Siga as instruções para escolher um nome e username para seu bot
4. O BotFather fornecerá um token - copie este token
5. Cole o token no arquivo `.env` na variável `TELEGRAM_BOT_TOKEN`
6. Adicione o bot ao seu grupo do Telegram
7. Inicie o bot com `npm start`

## Estrutura do Projeto

```
queima-buchinho/
├── src/
│   └── index.ts          # Código principal do bot
├── assets/
│   ├── README.md         # Instruções sobre arquivos de mídia
│   ├── motivation.mp3    # Áudio motivacional (adicione o seu)
│   └── motivation.jpg    # Imagem motivacional (adicione a sua)
├── dist/                 # Código compilado (gerado automaticamente)
├── .env.example          # Exemplo de configuração
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Tecnologias Utilizadas

- **TypeScript**: Linguagem de programação
- **Node.js**: Runtime JavaScript
- **node-telegram-bot-api**: Biblioteca para interação com a API do Telegram
- **dotenv**: Gerenciamento de variáveis de ambiente

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## Licença

MIT