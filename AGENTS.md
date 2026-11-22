# AGENTS.md

Queima Buchinho: Telegram bot for workout and habit tracking, with the AI persona Mika. Includes a PWA dashboard (`dashboard/`), a Tauri/Android reminders app (`lembretes/`) and a Postgres + Redis stack.

## Stack

- Runtime: Bun, TypeScript (`src/`), Jest for tests
- Storage: PostgreSQL, Redis (via `docker-compose.yml`)
- AI: LiteLLM / Ollama via OpenAI-compatible client
- Dashboard: Vite PWA (`dashboard/`), Capacitor/TWA wrappers
- Reminders app: Vite + Tauri 2 (`lembretes/`)

## Commands

- Install: `bun install --frozen-lockfile` (CI uses Bun; `bun.lock` is authoritative)
- Dev bot: `bun run dev` · Start: `bun run start`
- Migrate DB: `bun run migrate`
- Typecheck / lint: `bun run lint` (`tsc --noEmit`)
- Test: `bun run test` (Jest)
- Build: `bun run build` (`tsc --noEmit`)

## Structure

- `src/index.ts` — entry point
- `src/api/`, `src/controllers/` — HTTP/bot handlers
- `src/features/` — feature modules
- `src/services/` — external integrations (AI, TTS, Telegram, etc.)
- `src/config/`, `src/types/`, `src/utils/` — shared config, types, helpers
- `src/data/`, `src/scripts/` — data access and one-off scripts (`migrate.ts`)
- `dashboard/` — PWA and native wrappers
- `lembretes/` — reminders app (Tauri); `lembretes/scripts/plan.mjs` drives its release
- `docs/` — PWA prototype and design notes
- `tests/`, `__mocks__/` — Jest tests and mocks

## Conventions

- Max 150 lines per file. Split by responsibility before reaching the limit.
- Plan -> Act -> Validate for every task.
- Every change needs passing tests and lint (`bun run test` and `bun run lint`).
- Product rule: Mika's persona is acidic, sarcastic and "toxic-cute", roasts the user for lack of progress, and stays professional and funny. Keep it in replies.
- CI: `pwa.yml` runs dashboard lint and tests; `lembretes.yml` runs lembretes tests; `validate.yml` calls the base-actions reusable validation. No workflow runs the root `bun run test`; run it locally.

## Gotchas

- Secrets: `.env` is git-ignored; `.env.example` lists variable names only. Never commit or log token values (`TELEGRAM_BOT_TOKEN`, `LITELLM_API_KEY`, `SESSION_SECRET`, `VAPID_PRIVATE_KEY`, etc.). Gitleaks config is in `.gitleaks.toml`.
- `data/*` is git-ignored except `data/workout-history.json`.
- Two lockfiles are tracked (`bun.lock`, `pnpm-lock.yaml`); CI uses Bun. Do not hand-edit either.
- Android release needs `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_UPDATER_PUBKEY` (see `lembretes/README.md`).
- Docker: `docker-compose.yml` starts Postgres 15 and Redis 7 locally.

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.
