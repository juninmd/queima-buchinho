# 🚀 Queima Buchinho Bot

[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-f7df1e.svg?logo=bun&logoColor=black)]()
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg?logo=typescript&logoColor=white)]()
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg?logo=postgresql&logoColor=white)]()
[![Cache: Redis](https://img.shields.io/badge/Cache-Redis-DC382D.svg?logo=redis&logoColor=white)]()
[![Protocol: Antigravity](https://img.shields.io/badge/Protocol-Antigravity-orange.svg)]()

> **Queima Buchinho** é um bot de motivação de treinos e rastreamento de hábitos saudáveis via Telegram, integrado com Inteligência Artificial sob a persona de **Mika** (uma assistente *toxic-cute*, irônica e altamente sarcástica). 

Construído com foco em altíssima performance, baixo consumo de memória e inicialização instantânea utilizando o ecossistema **Bun** e **TypeScript**.
> Ele ajuda os usuários a manterem a consistência nos treinos e hábitos através de interações motivacionais e acompanhamento personalizado.

---

## ✨ Recursos Principais

- 📅 **Rastreamento de Hábitos Diários**: Controle interativo de hábitos como treino, cárdio, alongamento, leitura, meditação, suplementos, refeições e restrição de açúcar.
- 💧 **Registro de Água Simplificado**: Menu rápido para registrar consumo de água ao longo do dia em ml.
- 📈 **Registro de Métricas Corporais**: Acompanhe seu peso, altura, passos diários, gordura corporal e massa muscular com comandos simples.
- 🤖 **Interação Inteligente (Mika)**: Respostas dinâmicas geradas por IA (Ollama ou OpenRouter) com a persona ácida de Mika.
- 🗣️ **Respostas de Voz (TTS)**: Conversão de texto para fala em tempo real integrada utilizando a API Edge-TTS.
- 📊 **Relatórios Consolidados**: Resumos diários e relatórios semanais com gráficos de barra gerados diretamente no chat.
- ⚡ **Execução Resiliente**: Auto-reconnect em caso de falhas de polling e smart liveness check para monitorar a saúde da aplicação.

---

## 🛠️ Stack Tecnológica

- **Runtime**: [Bun](https://bun.sh/) (para boot ultra-rápido, testes acelerados e economia de memória)
- **Framework do Bot**: `node-telegram-bot-api`
- **Banco de Dados**: PostgreSQL (armazenamento persistente de treinos, hábitos e métricas)
- **Cache / Estado**: Redis (armazenamento temporário e controle de concorrência)
- **IA/LLM**: Provedores de API Ollama e OpenRouter via `@openrouter/ai-sdk-provider`
- **Agendador**: `node-cron` para controle interno de notificações de refeições e lembretes diários
- **Testes**: Jest com `ts-jest`

---

## 🎮 Comandos do Bot

### 📋 Menu & Controle
- `/menu` | `/start` | `/progresso` — Abre o menu diário interativo de hábitos.
- `/help` — Exibe a lista de comandos e ajuda.
- `/agua` — Atalho para registrar ingestão de água.
- `/semana` — Exibe o relatório de progresso dos hábitos da semana corrente.
- `/relatorio` — Relatório consolidado do dia.
- `/cardapio` — Exibe a dieta/refeição recomendada para o dia atual.
- `/ficha` — Exibe a rotina de exercícios físicos configurada para o dia.
- `/hora` — Consulta o horário oficial de Brasília.

### 💪 Treino & Streak
- `/checktreino` — Alterna o status do treino de hoje.
- `/cardio` — Alterna o status do cárdio de hoje.
- `/streak` — Exibe quantos dias seguidos você treinou sem falhar.
- `/reset` — Reseta os registros do dia atual.

### 📊 Registro de Métricas
- `/peso <valor>` — Registra seu peso atual em kg (ex: `/peso 78.5`).
- `/altura <valor>` — Registra sua altura em cm (ex: `/altura 175`).
- `/passos <valor>` — Registra os passos acumulados no dia (ex: `/passos 10000`).
- `/gordura <valor>` — Registra o percentual de gordura corporal (ex: `/gordura 14.5`).
- `/musculo <valor>` — Registra o percentual de massa muscular (ex: `/musculo 42.1`).

### 🎭 Diversão & Mídias
- `/motivar` — Solicita uma frase motivacional (ou um deboche) de voz da Mika.
- `/cantada` | `/xaveco` — Envia uma cantada nerd/maromba de academia.
- `/meme <termo>` — Busca um meme de academia (ou termo específico).
- `/sticker <termo>` — Busca um sticker relacionado ao termo.
- `/gif <termo>` — Envia um GIF do Giphy associado ao termo.
- `/instante <som>` — Toca um áudio divertido do MyInstants (ex: `/instante faustao-errou`).

---

## ⚙️ Instalação e Configuração

### 1. Clonar o Repositório
```bash
git clone git@github.com:juninmd/queima-buchinho.git
cd queima-buchinho
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e preencha as credenciais:
```bash
cp .env.example .env
```

### 3. Rodar localmente via Docker Compose
A forma mais rápida de iniciar o banco de dados PostgreSQL, Redis e o bot localmente:
```bash
docker-compose up --build
```

---

## 🛡️ Diretrizes do Protocolo Antigravity

Este projeto segue regras de codificação do protocolo **Antigravity**:
1. **Limite de 150 Linhas por Arquivo**: Módulos e classes devem ser fragmentados para manter a legibilidade e a separação de responsabilidades.
2. **Tipagem Estrita**: Nenhuma utilização de tipo `any` sem justificativa excepcional.
3. **Robustez e Cobertura**: Garantia de cobertura de testes abrangendo cenários felizes e de erro (edge cases).

---

## 🧪 Desenvolvimento & Testes

Para executar testes locais utilizando o runtime do Bun:

```bash
# Executa testes unitários e integrados com Jest
bun run test

# Executa o linter e validações de tipagem do TypeScript
bun run lint
```
