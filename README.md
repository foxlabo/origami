# Origami

A visual, no-code chatbot flow builder. Design a conversation as a node graph,
then test it in a live chat widget.

> Inspired by [typebot](https://github.com/baptisteArno/typebot.io). Independently
> re-implemented from scratch as a portfolio project.

## Status

🚧 **Pre-MVP** — under active development.

## Features (planned for MVP)

- 🎨 **Visual builder** — drag-and-drop flow canvas (React Flow)
- 🧩 **Node types** — start, message, question, condition, AI response, end
- ▶️ **Test runner** — built-in chat widget that executes the flow live
- 🤖 **AI nodes** — let a node reply with an LLM (OpenAI)
- 💾 **Local-first** — SQLite-backed, no server required
- 🗂 **Multiple bots** — create, edit, delete

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19.2
- **Flow canvas**: React Flow (`@xyflow/react`)
- **Styling**: Tailwind CSS 4
- **AI**: Vercel AI SDK v6 (OpenAI)
- **DB**: SQLite (`better-sqlite3`) + Drizzle ORM
- **Quality**: Biome + Vitest + Playwright, TypeScript strict

## Quick Start

```bash
pnpm install
cp .env.example .env.local   # add OPENAI_API_KEY if you use AI nodes
pnpm dev
```

Open <http://localhost:3000>.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Development](./docs/DEVELOPMENT.md)
- [Roadmap](./docs/ROADMAP.md)

## Security model

Origami is designed as a **single-user, local-only** application:

- No authentication / authorisation is built in. Server Actions and the
  `/api/bot/run` endpoint are reachable by any caller that can hit the server.
- `/api/bot/run` accepts a flow graph in the request body so the builder can
  test unsaved canvas changes. The graph is hard-validated (shape, size,
  semantics) and AI-node models are restricted to an allow-list, but a funded
  `OPENAI_API_KEY` can still be spent by anyone who can reach the endpoint.
- The DB lives on the local filesystem (`./origami.db`).

If you deploy Origami beyond `localhost`, **put an auth layer in front of it**
(Auth.js, reverse-proxy basic auth, or Tailscale-only access).

## License

[MIT](./LICENSE)
