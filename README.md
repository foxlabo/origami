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

## License

[MIT](./LICENSE)
