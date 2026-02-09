# Exemplos de Uso do Bot

## Cenário 1: Usuário Treinou

**Mensagem do usuário:**
```
Eu treinei hoje! Foi muito bom! 💪
```

**Resposta do bot:**
```
🎉 Parabéns! Você treinou hoje! Continue assim! 💪
```

---

## Cenário 2: Usuário Não Treinou

**Comando do usuário:**
```
/status
```

**Resposta do bot (se não treinou):**
```
❌ Você ainda não registrou seu treino hoje.
```

Seguido de:
- 🎵 Áudio motivacional (se disponível)
- 🖼️ Imagem motivacional (se disponível)

---

## Cenário 3: Verificação Manual

**Comando do usuário:**
```
/checktreino
```

**Resposta do bot:**
- Se treinou: Mensagem de parabéns
- Se não treinou: Áudio + imagem motivacional

---

## Cenário 4: Reset de Status

**Comando do usuário:**
```
/reset
```

**Resposta do bot:**
```
🔄 Status de treino resetado! Envie uma mensagem com "eu treinei", "treinei" ou "treinado" para marcar seu treino.
```

---

## Exemplos de Mensagens Válidas

Todas essas mensagens serão reconhecidas como treino:

✅ "Eu treinei hoje!"
✅ "Acabei de treinar"
✅ "Treinei na academia"
✅ "Hoje eu treinei muito"
✅ "Fui treinado pelo personal"
✅ "EU TREINEI!!!"

---

## Exemplos de Mensagens Inválidas

Estas mensagens **NÃO** serão reconhecidas como treino:

❌ "Vou treinar amanhã"
❌ "Preciso treinar"
❌ "O treino foi pesado"
❌ "Treinamento às 18h"
❌ "treinar é importante"

---

## Fluxo Diário

1. **Manhã**: Usuário acorda
2. **Durante o dia**: Usuário pode enviar `/status` para verificar
   - Se não treinou → Recebe motivação
3. **Depois do treino**: Usuário envia "eu treinei"
   - Bot responde com parabéns
4. **Meia-noite**: Bot reseta automaticamente o status de todos os usuários
5. **Próximo dia**: Ciclo recomeça

---

## Dicas de Uso

1. **Em Grupos**: Adicione o bot ao grupo onde você discute treinos
2. **Privado**: Use o bot em conversa privada para acompanhamento pessoal
3. **Lembretes**: Use `/status` como lembrete diário
4. **Motivação**: Use `/checktreino` quando precisar de um empurrão
5. **Testes**: Use `/reset` para testar o bot sem esperar até meia-noite
