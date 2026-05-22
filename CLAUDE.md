# CLAUDE.md — Origami

Context for AI coding agents working on this repo.

## Project intent

Origami is a portfolio-grade clean-room reimagining of `typebot`: a visual
chatbot flow builder. Quality over speed. Prefer fewer well-tested features.

## Hard rules

- **No code copy from typebot.** Reading its docs for understanding is fine.
- **TypeScript strict.** No `any` without a `// reason:` comment.
- **No `console.log`** in committed code — use a logger or remove.
- **Every new feature**: a Vitest unit test for pure logic (especially the flow
  engine), plus a Playwright E2E for user-visible flows.
- Conventional Commits, small and atomic.

## Stack reminders

- Next.js **16** App Router (docs in `node_modules/next/dist/docs/`)
- React 19.2, Tailwind **4** (configured via CSS, no `tailwind.config.js`)
- React Flow = `@xyflow/react` (v12)
- AI SDK v6 (`ai`, `@ai-sdk/openai`)
- Drizzle ORM + `better-sqlite3`

## Architecture rules

- The flow **engine** (`src/lib/flow/engine.ts`) is pure: it takes the graph,
  session, input, and an injected `generateAiReply` dependency. Never call the
  network directly from the engine — keep it unit-testable.
- DB access goes through `src/lib/db/`; routes/actions import from there.
- React Flow custom nodes live in `src/components/builder/nodes/`.
- Server Components must not pass functions as props to Client Components.
- Theme/hydration-sensitive UI must be mount-gated to avoid SSR mismatch.

## Before claiming done

Run `pnpm typecheck && pnpm check && pnpm test`. For UI, verify in a real
browser — `next build` does not render dynamic routes so runtime bugs slip past.
