# Roadmap

## v0.1 — MVP

- [ ] Project scaffold (Next.js 16, Biome, Drizzle, Vitest, Playwright)
- [ ] SQLite schema: bots + auto-migrate + sample seed
- [ ] Flow types + pure execution engine (start/message/question/condition/ai/end)
- [ ] Engine unit tests
- [ ] Bot list / create / delete
- [ ] React Flow visual builder with custom nodes + node palette
- [ ] Save flow graph (server action)
- [ ] Test runner: chat widget executing the flow
- [ ] `/api/bot/[id]/run` execution endpoint (AI nodes call OpenAI)

## v0.2 — Polish

- [ ] Node config side-panel (edit text/prompt/variable inline)
- [ ] Flow validation (unreachable nodes, missing edges) surfaced in the UI
- [ ] Variable interpolation in message text (`{{name}}`)
- [ ] Export / import flow as JSON
- [ ] Keyboard shortcuts, undo/redo

## v1.0+ — Beyond

- [ ] API-call node, file-upload node
- [ ] Public embeddable widget
- [ ] LINE / WhatsApp channels
- [ ] Edge-runtime execution
