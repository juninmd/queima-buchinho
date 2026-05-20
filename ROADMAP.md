# ROADMAP.md - Queima Buchinho Next Execution

Gerado em 2026-05-20 apos deep explore do repositorio.

## Estado sincronizado

- `git fetch origin` e `git push origin master`: executados; push retornou `Everything up-to-date`.
- `master` e `origin/master`: 0 commits a frente, 0 atras.
- Worktree ja estava sujo antes da analise: modificados `src/controllers/bot.controller.ts`, `src/services/tts.service.ts`, `src/utils/telegram.ts`, `tests/meme.test.ts`; novos `get-models.js`, `src/controllers/handlers/`.

## Diagnostico principal

O produto ja tem uma base boa para um bot de acompanhamento fitness no Telegram:
treino, cardio, agua, metricas corporais, habitos, cardapio, ficha de treino,
midia, TTS, IA via OpenRouter, Redis, PostgreSQL, Docker e GitHub Actions.

O problema atual nao e falta de feature isolada. O gargalo e produto espalhado:
controllers grandes, regras duplicadas entre menu/scheduler/callbacks, contratos
de comando implicitos, testes quebrados por refatoracao parcial e operacao com
Node/variaveis inconsistentes.

## Evidencias encontradas

- `pnpm lint`: passou.
- `pnpm test -- --runInBand`: falhou em 3 testes de `tests/controllers/bot.controller.test.ts`.
- Cobertura atual reportada pelo Jest: 77.83% statements, 79.13% lines.
- Acima de 150 linhas: `scheduler.service.ts` 308, `menu.controller.ts` 241, `media.service.ts` 223, `habits.controller.ts` 210, `metrics.service.ts` 177.
- Runtime desalinhado: `package.json` exige Node `>=24`, CI usa Node 24, Dockerfile usa Node 26.
- `.env.example` usa `BOT_TOKEN`, mas `src/index.ts` exige `TELEGRAM_BOT_TOKEN`.
- `src/services/media.service.ts` usa a chave publica beta do Giphy como fallback.

## Prioridade 0 - estabilizar a base atual

Objetivo: deixar a branch verde antes de qualquer feature nova.

1. Concluir ou reverter conscientemente a refatoracao local de handlers do `BotController`.
2. Corrigir os testes quebrados:
   - expectativa antiga de `sendAudioMessage` versus chamadas reais por `replyMika`
   - TTS real rodando apos o fim dos testes
   - mocks inconsistentes depois da extracao para `src/controllers/handlers/`
3. Garantir que `pnpm lint` e `pnpm test -- --runInBand` passem juntos.
4. Atualizar testes de controller para validar comportamento, nao detalhe acidental de helper.

Gate de aceite:

- `pnpm lint`
- `pnpm test -- --runInBand`
- nenhum log assincro depois do fim dos testes

## Prioridade 1 - arquitetura de comandos e callbacks

Objetivo: transformar o bot em um sistema de comandos previsivel e extensivel.

1. Criar registro declarativo de comandos com regex, nome canonico, descricao, handler, exemplos e contexto: usuario, grupo, canal.
2. Separar roteamento de execucao em `CommandRouter`, `MessageIntentRouter` e `CallbackRouter`.
3. Extrair callbacks de `HabitsController` para handlers pequenos.
4. Remover duplicacao entre `MenuController`, `SchedulerService` e callbacks.
5. Criar testes unitarios por handler e poucos testes integrados de roteamento.

Gate de aceite:

- cada arquivo novo ou alterado com ate 150 linhas, exceto testes se aprovado
- cobertura dos comandos principais: `/menu`, `/status`, `/checktreino`, `/cardio`, `/relatorio`, `/peso`, `/agua`, `/meme`, `/gif`, callbacks de habito e agua

## Prioridade 2 - contrato de dados e configuracao

Objetivo: reduzir surpresa em producao.

1. Criar `src/config/env.ts` com validacao por Zod.
2. Padronizar variaveis: `TELEGRAM_BOT_TOKEN`, `CHAT_ID`, `DATABASE_URL`, `REDIS_URL`, `OPENROUTER_API_KEY`, `AI_MODEL`, `GIPHY_API_KEY`.
3. Remover fallback para chave publica do Giphy; sem chave, usar apenas midia local.
4. Alinhar Node entre `package.json`, CI e Dockerfile.
5. Documentar setup local real no README.

Gate de aceite:

- boot falha cedo com erro claro quando config obrigatoria falta
- `.env.example` bate 1:1 com o codigo
- Docker build usa a mesma major version validada no CI

## Prioridade 3 - experiencia Mika e progressao fitness

Objetivo: deixar o produto mais util do que um bot de lembrete.

1. Criar "painel diario" no Telegram com treino, cardapio, agua, habitos pendentes, streak e proxima acao recomendada.
2. Adicionar metas configuraveis: agua diaria, treino semanal, cardio semanal, peso alvo.
3. Criar feedback adaptativo da Mika: elogia consistencia, cobra reincidencia, reconhece progresso real e evita repetir texto.
4. Persistir eventos de interacao para relatorios melhores.

Gate de aceite:

- usuario consegue entender o dia inteiro pelo `/menu`
- relatorio diario usa dados reais de treino, agua, metricas e habitos
- IA tem fallback deterministico quando OpenRouter falha

## Prioridade 4 - automacao operacional

Objetivo: deploy e lembretes previsiveis.

1. Adicionar workflows agendados para `reminder_morning`, `reminder_conditional`, `reminder_water`, `reminder_habits_check`, `reminder_daily_audit`, `reminder_food_*`.
2. Criar smoke test de startup sem token real.
3. Adicionar healthcheck que valide DB/Redis opcionalmente.
4. Separar jobs de CI: typecheck, unit tests, coverage, docker build.

Gate de aceite:

- workflow manual consegue disparar cada lembrete com secrets configurados
- CI nao precisa de Telegram/OpenRouter reais para passar
- container sobe em compose local com healthcheck verde

## Sequencia recomendada para a proxima execucao

1. Salvar/entender as mudancas locais ja existentes.
2. Corrigir a suite quebrada do `BotController`.
3. Finalizar a extracao dos handlers ja iniciada.
4. Extrair callbacks de `HabitsController`.
5. Criar `env.ts` e alinhar `.env.example`, CI e Docker.
6. Quebrar `SchedulerService` por familias de jobs.
7. Implementar o painel diario rico no `/menu`.
8. Adicionar workflows agendados restantes.
9. Rodar lint, testes e smoke local.
10. Commitar e fazer push.
