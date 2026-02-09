# 🚀 Quick Start - Configuração Rápida

## Informações do Bot

**Bot**: @junin_n8n_bot  
**Token**: `***REMOVED-BOT-TOKEN***`  
**Chat ID**: `94324040`  
**Nome do usuário**: Antonio Carlos (@jr_acn)

## ⚡ 3 Passos para Configurar

### 1️⃣ Configurar GitHub Secrets

1. Vá para: https://github.com/juninmd/queima-buchinho/settings/secrets/actions
2. Clique em **"New repository secret"**
3. Adicione:

**Primeiro Secret:**
```
Name: TELEGRAM_BOT_TOKEN
Value: ***REMOVED-BOT-TOKEN***
```

**Segundo Secret:**
```
Name: CHAT_ID
Value: 94324040
```

### 2️⃣ Fazer Merge da PR

Após fazer merge, o bot estará configurado!

### 3️⃣ Testar Agora (Opcional)

Para testar antes das 22h:

1. Vá em: https://github.com/juninmd/queima-buchinho/actions/workflows/daily-check.yml
2. Clique em **"Run workflow"**
3. Selecione a branch **"main"** (ou a branch atual)
4. Clique em **"Run workflow"**
5. Aguarde 1-2 minutos
6. Verifique seu Telegram!

## 📱 Como Usar no Dia a Dia

1. **Durante o dia**: Envie "eu treinei" para @junin_n8n_bot quando treinar
2. **Às 22h**: O bot verifica automaticamente
3. **Treinou?** → Recebe parabenização 🎉
4. **Não treinou?** → Recebe motivação (áudio + imagem) 💪

## ✅ Checklist de Configuração

- [ ] Secret `TELEGRAM_BOT_TOKEN` criado
- [ ] Secret `CHAT_ID` criado
- [ ] PR merged
- [ ] Workflow testado manualmente
- [ ] Bot funcionando às 22h automaticamente

## 🎯 Próximas 24 Horas

1. **Hoje**: Configure os secrets e faça merge
2. **Amanhã 22h**: Primeira verificação automática!
3. **Envie "eu treinei"** para o bot quando treinar

## ❓ Troubleshooting Rápido

**Erro "TELEGRAM_BOT_TOKEN not found"**
→ Verifique se o nome do secret está exatamente como `TELEGRAM_BOT_TOKEN`

**Erro "CHAT_ID not found"**
→ Verifique se o nome do secret está exatamente como `CHAT_ID`

**Bot não respondeu**
→ Veja os logs em Actions → Daily Workout Check → Último run

**Quer testar agora?**
→ Use "Run workflow" manualmente (passo 3 acima)

---

🎉 **Pronto!** Seu bot está configurado para rodar gratuitamente no GitHub Actions!
