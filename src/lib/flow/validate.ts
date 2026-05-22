import { isAllowedModel } from './models'
import type { FlowGraph } from './types'

export interface GraphValidation {
  ok: boolean
  errors: string[]
}

/** Reserved branch handle for a condition node's fallback edge. */
const ELSE_HANDLE = 'else'

/**
 * Semantic validation beyond the Zod shape check: a graph that parses can
 * still be structurally broken (no start node, duplicate ids, dangling edges,
 * ambiguous condition routing, ...). Run before persisting and before
 * executing a flow.
 *
 * Note: this intentionally does NOT require every node to be reachable —
 * partially-built draft flows are allowed to be saved.
 */
export function validateGraph(graph: FlowGraph): GraphValidation {
  const errors: string[] = []

  const starts = graph.nodes.filter((n) => n.type === 'start')
  if (starts.length === 0) errors.push('Flow needs a start node.')
  if (starts.length > 1) errors.push(`Flow has ${starts.length} start nodes; only one is allowed.`)

  // Unique node + edge ids.
  const nodeIds = new Set<string>()
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}`)
    nodeIds.add(node.id)
  }
  const edgeIds = new Set<string>()
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id: ${edge.id}`)
    edgeIds.add(edge.id)
    if (!nodeIds.has(edge.source)) errors.push(`Edge ${edge.id} starts from a missing node.`)
    if (!nodeIds.has(edge.target)) errors.push(`Edge ${edge.id} points to a missing node.`)
  }

  for (const node of graph.nodes) {
    const outgoing = graph.edges.filter((e) => e.source === node.id)

    // Linear nodes follow exactly one edge — more than one makes routing
    // depend on array order rather than visible intent.
    if (
      node.type === 'start' ||
      node.type === 'message' ||
      node.type === 'question' ||
      node.type === 'ai'
    ) {
      if (outgoing.length > 1) {
        errors.push(`The ${node.type} node has ${outgoing.length} outgoing connections; keep one.`)
      }
    }

    if (node.type === 'ai' && !isAllowedModel(node.data.model)) {
      errors.push(`AI node uses an unsupported model: "${node.data.model}".`)
    }

    if (node.type === 'condition') {
      // Case values must be unique, non-empty, and not collide with `else`.
      const seen = new Set<string>()
      for (const c of node.data.cases) {
        if (c.value === '') {
          errors.push('A condition case value cannot be empty.')
        } else if (c.value === ELSE_HANDLE) {
          errors.push(`A condition case value cannot be "${ELSE_HANDLE}" (reserved fallback).`)
        } else if (seen.has(c.value)) {
          errors.push(`Condition has a duplicate case value: "${c.value}".`)
        }
        seen.add(c.value)
      }
      // Every outgoing edge must use a known branch handle, at most once each.
      const validHandles = new Set<string>([...node.data.cases.map((c) => c.value), ELSE_HANDLE])
      const usedHandles = new Set<string>()
      for (const edge of outgoing) {
        const handle = edge.sourceHandle ?? ELSE_HANDLE
        if (!validHandles.has(handle)) {
          errors.push(`A condition edge uses an unknown branch "${handle}".`)
        } else if (usedHandles.has(handle)) {
          errors.push(`A condition has more than one edge from the "${handle}" branch.`)
        }
        usedHandles.add(handle)
      }
    }
  }

  return { ok: errors.length === 0, errors }
}
