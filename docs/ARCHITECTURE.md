# Architecture

Design decisions for Origami, a visual chatbot flow builder.

## High-Level Decisions

| Concern | Choice | Why |
|---|---|---|
| Runtime | Next.js 16 App Router | Server components + route handlers |
| Flow canvas | React Flow (`@xyflow/react`) | The signature UI of a chatbot builder |
| Builder state | Zustand | Lightweight store for the editor |
| DB | SQLite + Drizzle | Local-first MVP, zero infra |
| AI | Vercel AI SDK v6 (OpenAI) | AI-response nodes |
| Execution | Pure engine + injected AI fn | Deterministic, unit-testable |

## Data Model

```text
bots
  id: text (nanoid)
  name: text
  description: text
  graph: text (JSON: { nodes: FlowNode[], edges: FlowEdge[] })
  createdAt / updatedAt: integer (unix ms)
```

A bot owns exactly one flow graph (stored as JSON). Test sessions are
ephemeral — held by the test widget / passed through the run API — so there
is no sessions table for the MVP.

## Flow Model

A flow is a directed graph.

**Node types** (`src/lib/flow/types.ts`):

| type | data | behaviour |
|---|---|---|
| `start` | — | entry point; one outgoing edge |
| `message` | `{ text }` | emits a bot message, continues |
| `question` | `{ prompt, variable }` | emits prompt, **waits** for user input, stores it in `variable` |
| `condition` | `{ variable, cases: {value,label}[] }` | branches on a variable; edges carry `sourceHandle` = case value or `else` |
| `ai` | `{ systemPrompt, model }` | calls an LLM with the transcript, emits the reply |
| `end` | — | terminates the run |

**Edges**: `{ id, source, target, sourceHandle? }`. `sourceHandle` is only
meaningful for `condition` nodes (which branch is taken).

## Execution Engine

`src/lib/flow/engine.ts` exposes a single function:

```ts
runFlow(graph, session, input, deps) => Promise<RunResult>
```

- `session`: `{ currentNodeId, variables, transcript }`
- `input`: the user's latest message (or `null` to start a run)
- `deps.generateAiReply(systemPrompt, model, transcript)`: injected so the
  engine stays pure and testable; the API route injects the real OpenAI call,
  tests inject a mock
- `RunResult`: `{ session, messages: BotMessage[], status: 'awaiting-input' | 'ended' | 'error' }`

The engine walks from `currentNodeId`, emitting messages, until it reaches a
`question` (→ `awaiting-input`) or `end` (→ `ended`). A safety counter caps
the number of node visits per step to prevent infinite loops in malformed
graphs.

## Why "local-first"

No server hosting is planned yet. SQLite removes all DB infra. Everything is
compatible with a future Postgres backend via Drizzle's dialect swap.

## Inspired By, Not Copied From

Origami's name, code, and UX are independent from typebot. typebot's source
may be read for understanding general patterns; no code is copied.

## Out of Scope (MVP)

- LINE / WhatsApp channel integration
- Edge-runtime execution (Cloudflare Workers)
- Public embeddable widget on third-party sites
- API-call node, file upload node
