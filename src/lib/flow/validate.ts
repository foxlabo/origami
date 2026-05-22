import { isAllowedModel } from './models'
import type { FlowGraph } from './types'

export interface GraphValidation {
  ok: boolean
  errors: string[]
}

/**
 * Semantic validation beyond the Zod shape check: a graph that parses can
 * still be structurally broken (no start node, duplicate ids, dangling edges,
 * etc.). Run before persisting and before executing a flow.
 *
 * Note: this intentionally does NOT require every node to be reachable —
 * partially-built draft flows are allowed to be saved.
 */
export function validateGraph(graph: FlowGraph): GraphValidation {
  const errors: string[] = []

  const starts = graph.nodes.filter((n) => n.type === 'start')
  if (starts.length === 0) errors.push('Flow needs a start node.')
  if (starts.length > 1) errors.push(`Flow has ${starts.length} start nodes; only one is allowed.`)

  const ids = new Set<string>()
  for (const node of graph.nodes) {
    if (ids.has(node.id)) errors.push(`Duplicate node id: ${node.id}`)
    ids.add(node.id)
  }

  for (const edge of graph.edges) {
    if (!ids.has(edge.source)) errors.push(`Edge ${edge.id} starts from a missing node.`)
    if (!ids.has(edge.target)) errors.push(`Edge ${edge.id} points to a missing node.`)
  }

  // Linear nodes must have at most one outgoing edge — the engine follows the
  // first one, so more than one makes routing ambiguous.
  for (const node of graph.nodes) {
    if (
      node.type === 'start' ||
      node.type === 'message' ||
      node.type === 'question' ||
      node.type === 'ai'
    ) {
      const outgoing = graph.edges.filter((e) => e.source === node.id)
      if (outgoing.length > 1) {
        errors.push(`The ${node.type} node has ${outgoing.length} outgoing connections; keep one.`)
      }
    }
    if (node.type === 'ai' && !isAllowedModel(node.data.model)) {
      errors.push(`AI node uses an unsupported model: "${node.data.model}".`)
    }
  }

  return { ok: errors.length === 0, errors }
}
