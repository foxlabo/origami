# Roadmap

## v1.0 — Shipped ✅

After two rounds of Codex review:

- Project scaffold (Next.js 16, Biome, Drizzle, Vitest, Playwright)
- SQLite schema + auto-migrate + sample-bot seed
- Flow model with Zod schemas + size limits (start / message / question /
  condition / ai / end)
- Pure execution engine: walks the graph, pauses at questions, branches on
  conditions, calls an injected AI dependency, loop-guarded
- Semantic graph validation (one start, unique ids, no dangling edges,
  single outgoing for linear nodes, condition branch checks, model allow-list)
- 26 unit tests (engine + validation)
- Bot list with create / rename / delete
- React Flow visual builder: custom nodes, node palette, per-node config
  panel, single-outgoing-edge enforcement, non-deletable start node
- Save validates shape + semantics (server action)
- Test runner: chat widget executing the live canvas graph via
  `POST /api/bot/run`, with request size caps, model allow-list, stale-run
  protection, and masked provider errors
- Documented as local-only (auth is out of scope for v1)

## v1.1 — Polish

- Stable per-case ids for condition branches (decouple from match value)
- Typed React Flow nodes instead of loose casts
- Optimistic-concurrency save (updatedAt compare-and-swap)
- Variable picker / autocomplete in text fields
- Export / import a flow as JSON
- Flow validation surfaced inline on the canvas (highlight broken nodes)
- Playwright E2E for the build → save → test loop
- Undo / redo

## v2.0 — Beyond

- API-call node, file-upload node
- Public embeddable widget
- LINE / WhatsApp channels
- Edge-runtime execution
- Multi-user: ownership columns + auth
