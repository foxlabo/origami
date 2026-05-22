import type { BotMessage, FlowGraph, FlowSession } from './types'

/** Injected dependency so the engine stays pure and unit-testable. */
export interface RunDeps {
  generateAiReply: (
    systemPrompt: string,
    model: string,
    transcript: BotMessage[],
  ) => Promise<string>
}

export type RunStatus = 'awaiting-input' | 'ended' | 'error'

export interface RunResult {
  session: FlowSession
  /** Bot messages emitted during this step (not including prior transcript). */
  messages: BotMessage[]
  status: RunStatus
  error?: string
}

/** Safety cap: max node visits in a single step, guards against graph loops. */
const MAX_STEPS = 200

/** Replace `{{variable}}` placeholders in text with session variable values. */
export function interpolate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => variables[key] ?? '')
}

/** Resolve the next node id by following an outgoing edge from `nodeId`. */
function followEdge(graph: FlowGraph, nodeId: string, handle?: string): string | null {
  const outgoing = graph.edges.filter((e) => e.source === nodeId)
  if (handle !== undefined) {
    const exact = outgoing.find((e) => (e.sourceHandle ?? 'else') === handle)
    if (exact) return exact.target
    const fallback = outgoing.find((e) => (e.sourceHandle ?? 'else') === 'else')
    return fallback?.target ?? null
  }
  return outgoing[0]?.target ?? null
}

/**
 * Advance a flow run by one step.
 *
 * - With `input === null` and a fresh session, the run starts at the `start` node.
 * - With `input` set and the session paused on a `question`, the input is stored
 *   in that question's variable and the run continues.
 *
 * The run walks forward emitting messages until it hits a `question`
 * (→ `awaiting-input`) or terminates (→ `ended`).
 */
export async function runFlow(
  graph: FlowGraph,
  session: FlowSession,
  input: string | null,
  deps: RunDeps,
): Promise<RunResult> {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]))
  const messages: BotMessage[] = []
  const variables: Record<string, string> = { ...session.variables }
  const transcript: BotMessage[] = [...session.transcript]

  const fail = (error: string, currentNodeId: string | null): RunResult => ({
    session: { currentNodeId, variables, transcript },
    messages,
    status: 'error',
    error,
  })

  // Resolve the node to begin walking from.
  let currentId: string | null

  if (session.currentNodeId === null) {
    const start = graph.nodes.find((n) => n.type === 'start')
    if (!start) return fail('Flow has no start node', null)
    currentId = start.id
  } else {
    const paused = nodeById.get(session.currentNodeId)
    if (!paused) return fail(`Paused node "${session.currentNodeId}" not found`, null)
    if (paused.type !== 'question') {
      return fail('Session is paused on a non-question node', session.currentNodeId)
    }
    if (input === null) {
      // Still waiting — nothing to advance.
      return { session: { ...session }, messages, status: 'awaiting-input' }
    }
    // Trim the answer so condition matching is not thrown off by stray
    // whitespace from the channel.
    const answer = input.trim()
    variables[paused.data.variable] = answer
    transcript.push({ role: 'user', text: answer })
    currentId = followEdge(graph, paused.id)
  }

  let steps = 0
  while (currentId !== null) {
    if (++steps > MAX_STEPS) {
      return fail('Flow exceeded the maximum step count (possible loop)', currentId)
    }

    const node = nodeById.get(currentId)
    if (!node) return fail(`Edge points to missing node "${currentId}"`, null)

    switch (node.type) {
      case 'start': {
        currentId = followEdge(graph, node.id)
        break
      }
      case 'message': {
        const text = interpolate(node.data.text, variables)
        messages.push({ role: 'bot', text })
        transcript.push({ role: 'bot', text })
        currentId = followEdge(graph, node.id)
        break
      }
      case 'question': {
        const prompt = interpolate(node.data.prompt, variables)
        messages.push({ role: 'bot', text: prompt })
        transcript.push({ role: 'bot', text: prompt })
        return {
          session: { currentNodeId: node.id, variables, transcript },
          messages,
          status: 'awaiting-input',
        }
      }
      case 'condition': {
        const value = variables[node.data.variable] ?? ''
        const matched = node.data.cases.find((c) => c.value === value)
        currentId = followEdge(graph, node.id, matched ? matched.value : 'else')
        break
      }
      case 'ai': {
        let reply: string
        try {
          reply = await deps.generateAiReply(node.data.systemPrompt, node.data.model, transcript)
        } catch (err) {
          return fail(err instanceof Error ? err.message : 'AI node failed', node.id)
        }
        messages.push({ role: 'bot', text: reply })
        transcript.push({ role: 'bot', text: reply })
        currentId = followEdge(graph, node.id)
        break
      }
      case 'end': {
        return {
          session: { currentNodeId: null, variables, transcript },
          messages,
          status: 'ended',
        }
      }
    }

    if (currentId === null) {
      // Dead end (no outgoing edge) — treat as a graceful finish.
      return {
        session: { currentNodeId: null, variables, transcript },
        messages,
        status: 'ended',
      }
    }
  }

  return { session: { currentNodeId: null, variables, transcript }, messages, status: 'ended' }
}
