# 🚀 Queima Buchinho Bot

[![Status: Active](https://img.shields.io/badge/Status-Active-brightgreen.svg)]()
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-f7df1e.svg?logo=bun&logoColor=black)]()
[![Language: TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg?logo=typescript&logoColor=white)]()
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791.svg?logo=postgresql&logoColor=white)]()
[![Cache: Redis](https://img.shields.io/badge/Cache-Redis-DC382D.svg?logo=redis&logoColor=white)]()
[![Protocol: Antigravity](https://img.shields.io/badge/Protocol-Antigravity-orange.svg)]()

> **Queima Buchinho** é um bot de motivação de treinos e rastreamento de hábitos saudáveis via Telegram, integrado com Inteligência Artificial sob a persona de **Mika** (uma assistente *toxic-cute*, irônica e altamente sarcástica). 
Para começar a interagir e acompanhar seus hábitos, basta iniciar uma conversa com o bot no Telegram e usar o comando /start.
Este projeto demonstra uma aplicação completa de bot Telegram com IA, testes automatizados e deploy via Docker.

Construído com foco em altíssima performance, baixo consumo de memória e inicialização instantânea utilizando o ecossistema **Bun** e **TypeScript**.

---

## ✨ Recursos Principais

- 🏋️ **Ficha de Treino (queima de gordura)**: publicada automaticamente às **06:00 BRT, de segunda a sábado**, com foto do aparelho, nome do exercício, séries/repetições, carga atual e o bloco de cárdio (esteira ou bicicleta). Botões no card ajustam a carga em ±2,5/±5 kg — o valor fica salvo e volta no treino seguinte. Ver seção abaixo.
- 📅 **Rastreamento de Hábitos Diários**: Controle interativo de hábitos como treino, cárdio, alongamento, leitura, meditação, suplementos, refeições e restrição de açúcar.
- 💧 **Registro de Água Simplificado**: Menu rápido para registrar consumo de água ao longo do dia em ml.
- 📈 **Registro de Métricas Corporais**: Acompanhe seu peso, altura, passos diários, gordura corporal e massa muscular com comandos simples.
- 🤖 **Interação Inteligente (Mika)**: Respostas dinâmicas geradas por IA (Ollama ou OpenRouter) com a persona ácida de Mika.
- 🗣️ **Respostas de Voz (TTS)**: Conversão de texto para fala em tempo real integrada utilizando a API Edge-TTS.
- 📊 **Relatórios Consolidados**: Resumos diários e relatórios semanais com gráficos de barra gerados diretamente no chat.
- 🖥️ **Dashboard Web**: App React (`dashboard/`) com progresso diário/semanal/mensal, evolução de peso, água e hábitos — ver seção abaixo.
- ⚡ **Execução Resiliente**: Auto-reconnect em caso de falhas de polling e smart liveness check para monitorar a saúde da aplicação.

---

## 🏋️ Ficha de Treino

Substitui a antiga ficha estática. O treino é **determinístico**: o split e os exercícios saem de
um catálogo curado (`src/features/ficha/`), e a IA escreve apenas a provocação da Mika — se o LLM
estiver fora, a ficha das 6h sai do mesmo jeito, sem provocação.

**Protocolo (queima de gordura):** multiarticular primeiro, repetição alta, descanso curto
(40-60 s) e cárdio **depois** da musculação.

| Dia | Treino | Cárdio |
|---|---|---|
| Segunda | Full Body Metabólico A | Esteira — HIIT 1:2 (15 min) |
| Terça | Superior Metabólico | Bicicleta — Z2 (25 min) |
| Quarta | Inferior + Glúteo | Esteira — inclinada 12% (30 min) |
| Quinta | Full Body Metabólico B | Bicicleta — HIIT 30/60 s (15 min) |
| Sexta | Superior + Core | Esteira — intervalado 1:1 (20 min) |
| Sábado | Inferior + Cárdio Longo | Esteira — trote Z2 (35 min) |
| Domingo | descanso — o cron não dispara | — |

**Botões do card:** `🏋️ Treinei` grava em `workout_logs` + hábito `treino` (streak, `/relatorio` e
dashboard continuam corretos), `🏃 Fiz o cárdio` grava o hábito `cardio`, e `⚖️ Ajustar carga` abre
a lista de exercícios e o seletor de ±2,5/±5 kg.

**Tabelas** (criadas por `bun run migrate`):

- `exercise_loads` — carga por exercício e usuário; é ela que faz a progressão de carga.
- `ficha_sessions` — ficha entregue no dia (JSONB) e se treino/cárdio foram concluídos.

Imagens: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público, CDN do
GitHub); todas as URLs do catálogo foram verificadas em 200 na geração.

---

## 🛠️ Stack Tecnológica

- **Runtime**: [Bun](https://bun.sh/) (para boot ultra-rápido, testes acelerados e economia de memória)
- **Framework do Bot**: `node-telegram-bot-api`
- **Banco de Dados**: PostgreSQL (armazenamento persistente de treinos, hábitos e métricas)
- **Cache / Estado**: Redis (armazenamento temporário e controle de concorrência)
- **IA/LLM**: Provedores de API Ollama e OpenRouter via `@openrouter/ai-sdk-provider`
- **Agendador**: `node-cron` para a ficha de treino das 6h, notificações de refeições e lembretes diários
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
- `/ficha` — Publica a **Ficha de Treino** de hoje (mesma que sai às 6h): imagens dos aparelhos, repetições, cargas e botões.
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

## 🖥️ Dashboard de Progresso

App web (Bun + Vite + React + TypeScript) em `dashboard/` que consome a Dashboard API do bot
(`src/api/dashboard.server.ts`) e mostra progresso diário, semanal e mensal: evolução de peso,
ingestão de água, conclusão de hábitos e calendário de treinos.

```bash
# 1. Habilite a API no .env do bot (raiz)
DASHBOARD_TOKEN=algum-token-secreto
DASHBOARD_PORT=8081

# 2. Configure o frontend
cd dashboard
cp .env.example .env   # aponte VITE_API_URL/VITE_API_TOKEN pro bot

# 3. Rode
bun install
bun run dev
```

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
