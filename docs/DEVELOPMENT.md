# Development

## Prerequisites

- Node 20+
- pnpm 10+

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The SQLite schema is auto-migrated and a sample bot is seeded on first run.

## Environment variables

| Key | Required for | Notes |
|---|---|---|
| `OPENAI_API_KEY` | AI-response nodes | from <https://platform.openai.com> |
| `DATABASE_URL` | DB | default `file:./origami.db` |

A bot flow with no AI node runs fully without any API key.

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | production build |
| `pnpm check` | Biome lint + format check |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm db:generate` | Drizzle: generate migration |
| `pnpm db:push` | Drizzle: push schema to local DB |

## Workflow

- Branch: `feature/{topic}` / `fix/{topic}`
- Conventional Commits
- Every feature: a Vitest test for pure logic, Playwright for user flows
- Lint/format enforced before commit
