# 🔧 Configuração - Valores e Secrets Necessários

## ⚡ Resposta Rápida

Você precisa configurar **2 secrets** no GitHub Actions:

| Secret | Valor | Onde Obter |
|--------|-------|------------|
| `TELEGRAM_BOT_TOKEN` | Token do seu bot | [@BotFather](https://t.me/botfather) no Telegram |
| `CHAT_ID` | Seu ID de usuário no Telegram | Via API do Telegram |

---

## 📋 Lista Completa de Configurações

### 1. GitHub Secrets (OBRIGATÓRIO para GitHub Actions)

Estes secrets são necessários para o bot rodar via GitHub Actions:

#### `TELEGRAM_BOT_TOKEN`
- **O que é**: Token de autenticação do seu bot do Telegram
- **Formato**: Texto longo tipo `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
- **Onde configurar**: GitHub → Settings → Secrets and variables → Actions
- **Como obter**:
  1. Abra o Telegram
  2. Fale com [@BotFather](https://t.me/botfather)
  3. Envie `/newbot` e siga as instruções
  4. Copie o token que ele fornecer

**Exemplo do token atual (já configurado):**
```
***REMOVED-BOT-TOKEN***
```

#### `CHAT_ID`
- **O que é**: ID numérico do usuário que receberá as mensagens
- **Formato**: Número inteiro (ex: `94324040`)
- **Onde configurar**: GitHub → Settings → Secrets and variables → Actions
- **Como obter**:
  1. Envie uma mensagem qualquer para seu bot
  2. Acesse no navegador: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
     (Substitua `<SEU_TOKEN>` pelo token do passo anterior)
  3. Procure por `"chat":{"id":XXXXXXX}` no JSON retornado
  4. O número `XXXXXXX` é seu Chat ID

**Exemplo do Chat ID atual (já configurado):**
```
94324040
```

---

### 2. Variáveis de Ambiente (OPCIONAL - apenas para desenvolvimento local)

Se você quiser rodar o bot localmente (não necessário para GitHub Actions):

#### `.env` file
Crie um arquivo `.env` na raiz do projeto com:

```bash
# Token do bot do Telegram
TELEGRAM_BOT_TOKEN=seu_token_aqui

# ID do chat/usuário que receberá as mensagens
CHAT_ID=seu_chat_id_aqui

# Modo de operação: 'checker' ou 'listener'
BOT_MODE=listener
```

**Nota**: O arquivo `.env` é ignorado pelo git (está no `.gitignore`), então suas credenciais ficam seguras.

---

## 🎯 Passo a Passo para Configurar

### Opção A: GitHub Actions (Recomendado - Grátis)

1. **Vá para as configurações do repositório**
   ```
   https://github.com/juninmd/queima-buchinho/settings/secrets/actions
   ```

2. **Clique em "New repository secret"**

3. **Adicione o primeiro secret:**
   - Name: `TELEGRAM_BOT_TOKEN`
   - Value: (cole seu token do bot)
   - Clique em "Add secret"

4. **Adicione o segundo secret:**
   - Name: `CHAT_ID`
   - Value: (cole seu chat ID)
   - Clique em "Add secret"

5. **Pronto!** O bot já está configurado ✅

### Opção B: Desenvolvimento Local

1. **Clone o repositório**
   ```bash
   git clone https://github.com/juninmd/queima-buchinho.git
   cd queima-buchinho
   ```

2. **Copie o arquivo de exemplo**
   ```bash
   cp .env.example .env
   ```

3. **Edite o arquivo `.env`**
   ```bash
   nano .env
   # ou use seu editor preferido
   ```

4. **Configure os valores:**
   ```
   TELEGRAM_BOT_TOKEN=***REMOVED-BOT-TOKEN***
   CHAT_ID=94324040
   BOT_MODE=listener
   ```

5. **Instale e rode:**
   ```bash
   npm install
   npm run dev
   ```

---

## ✅ Checklist de Verificação

Marque cada item conforme for completando:

### GitHub Actions (Produção)
- [ ] Secret `TELEGRAM_BOT_TOKEN` criado no GitHub
- [ ] Secret `CHAT_ID` criado no GitHub
- [ ] Bot criado via @BotFather no Telegram
- [ ] Workflow testado manualmente em Actions

### Desenvolvimento Local (Opcional)
- [ ] Arquivo `.env` criado
- [ ] `TELEGRAM_BOT_TOKEN` configurado no `.env`
- [ ] `CHAT_ID` configurado no `.env`
- [ ] `BOT_MODE` configurado no `.env`
- [ ] Dependências instaladas (`npm install`)
- [ ] Bot testado localmente (`npm run dev`)

---

## 🔍 Como Verificar se Está Funcionando

### GitHub Actions
1. Vá em **Actions** no seu repositório
2. Clique em **Daily Workout Check**
3. Clique em **Run workflow** → Selecione a branch → **Run workflow**
4. Aguarde ~2 minutos
5. Verifique seu Telegram - você deve receber uma mensagem!

### Local
1. Execute `npm run dev`
2. Você deve ver: `🤖 Bot Queima Buchinho iniciado!`
3. Envie "teste" para o bot no Telegram
4. O console deve mostrar a mensagem recebida

---

## ❓ Perguntas Frequentes

### P: Onde encontro meu token do bot?
**R**: Fale com [@BotFather](https://t.me/botfather) no Telegram e use o comando `/mybots`, depois selecione seu bot e "API Token".

### P: Como descobrir meu Chat ID?
**R**: Envie uma mensagem para seu bot e acesse:
```
https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
```
Procure por `"chat":{"id":XXXXXXX}`.

### P: O que acontece se eu configurar errado?
**R**: O bot não funcionará e você verá erros nos logs do GitHub Actions. Revise os valores e tente novamente.

### P: Posso usar o mesmo bot para múltiplos usuários?
**R**: Sim, mas você precisará modificar o código para suportar múltiplos `CHAT_ID`. Atualmente está configurado para um único usuário.

### P: Os secrets são seguros?
**R**: Sim! GitHub Secrets são criptografados e não aparecem nos logs. Nunca são expostos publicamente.

### P: Preciso pagar pelo GitHub Actions?
**R**: Não! GitHub fornece 2000 minutos grátis por mês. Este bot usa ~1 minuto/dia = ~30 minutos/mês.

---

## 🆘 Precisa de Ajuda?

- **Guia Rápido**: Veja [QUICKSTART.md](QUICKSTART.md)
- **Setup Detalhado**: Veja [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md)
- **Arquitetura**: Veja [ARCHITECTURE.md](ARCHITECTURE.md)
- **README**: Veja [README.md](README.md)

---

## 📌 Valores Atuais (Referência)

Para este projeto específico, os valores já conhecidos são:

```
Bot: @junin_n8n_bot
Token: ***REMOVED-BOT-TOKEN***
Chat ID: 94324040
Usuário: Antonio Carlos (@jr_acn)
```

**⚠️ IMPORTANTE**: Estes valores já estão documentados mas devem ser configurados como secrets no GitHub para funcionarem!

---

🎉 **Com estes 2 secrets configurados, seu bot estará pronto para rodar!**
