import { describe, expect, it } from 'vitest'
import type { FlowGraph } from '@/lib/flow/types'
import { validateGraph } from '@/lib/flow/validate'

const pos = { x: 0, y: 0 }

const wellFormed: FlowGraph = {
  nodes: [
    { id: 's', type: 'start', position: pos, data: {} },
    { id: 'm', type: 'message', position: pos, data: { text: 'hi' } },
    { id: 'e', type: 'end', position: pos, data: {} },
  ],
  edges: [
    { id: '1', source: 's', target: 'm' },
    { id: '2', source: 'm', target: 'e' },
  ],
}

describe('validateGraph', () => {
  it('accepts a well-formed graph', () => {
    expect(validateGraph(wellFormed)).toEqual({ ok: true, errors: [] })
  })

  it('rejects a graph with no start node', () => {
    const result = validateGraph({
      nodes: [{ id: 'e', type: 'end', position: pos, data: {} }],
      edges: [],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/start/i)
  })

  it('rejects multiple start nodes', () => {
    const result = validateGraph({
      nodes: [
        { id: 's1', type: 'start', position: pos, data: {} },
        { id: 's2', type: 'start', position: pos, data: {} },
      ],
      edges: [],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/2 start/i)
  })

  it('rejects duplicate node ids', () => {
    const result = validateGraph({
      nodes: [
        { id: 'dup', type: 'start', position: pos, data: {} },
        { id: 'dup', type: 'end', position: pos, data: {} },
      ],
      edges: [],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/duplicate/i)
  })

  it('rejects dangling edges', () => {
    const result = validateGraph({
      nodes: [{ id: 's', type: 'start', position: pos, data: {} }],
      edges: [{ id: 'e1', source: 's', target: 'ghost' }],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/missing node/i)
  })

  it('rejects more than one outgoing edge from a linear node', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'a', type: 'end', position: pos, data: {} },
        { id: 'b', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'a' },
        { id: '2', source: 's', target: 'b' },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/outgoing/i)
  })

  it('rejects an AI node with an unsupported model', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'a',
          type: 'ai',
          position: pos,
          data: { systemPrompt: 'x', model: 'totally-made-up-model' },
        },
      ],
      edges: [{ id: '1', source: 's', target: 'a' }],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/model/i)
  })

  it('allows an AI node with an allow-listed model', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'a',
          type: 'ai',
          position: pos,
          data: { systemPrompt: 'x', model: 'gpt-5.4-mini' },
        },
      ],
      edges: [{ id: '1', source: 's', target: 'a' }],
    })
    expect(result.ok).toBe(true)
  })

  it('allows disconnected draft nodes (reachability is not required)', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'orphan', type: 'message', position: pos, data: { text: 'wip' } },
      ],
      edges: [],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects duplicate edge ids', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'e', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: 'dup', source: 's', target: 'e' },
        { id: 'dup', source: 's', target: 'e' },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/duplicate edge id/i)
  })

  it('rejects a condition with duplicate case values', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'c',
          type: 'condition',
          position: pos,
          data: {
            variable: 'answer',
            cases: [
              { value: 'yes', label: 'A' },
              { value: 'yes', label: 'B' },
            ],
          },
        },
      ],
      edges: [{ id: '1', source: 's', target: 'c' }],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/duplicate case value/i)
  })

  it('rejects a condition case value of "else"', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'c',
          type: 'condition',
          position: pos,
          data: { variable: 'answer', cases: [{ value: 'else', label: 'X' }] },
        },
      ],
      edges: [{ id: '1', source: 's', target: 'c' }],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/reserved/i)
  })

  it('rejects a condition edge using an unknown branch handle', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'c',
          type: 'condition',
          position: pos,
          data: { variable: 'answer', cases: [{ value: 'yes', label: 'Y' }] },
        },
        { id: 'e', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'c' },
        { id: '2', source: 'c', target: 'e', sourceHandle: 'ghost' },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/unknown branch/i)
  })

  it('rejects two condition edges from the same branch handle', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'c',
          type: 'condition',
          position: pos,
          data: { variable: 'answer', cases: [{ value: 'yes', label: 'Y' }] },
        },
        { id: 'a', type: 'end', position: pos, data: {} },
        { id: 'b', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'c' },
        { id: '2', source: 'c', target: 'a', sourceHandle: 'yes' },
        { id: '3', source: 'c', target: 'b', sourceHandle: 'yes' },
      ],
    })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toMatch(/more than one edge/i)
  })

  it('accepts a well-formed condition', () => {
    const result = validateGraph({
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'c',
          type: 'condition',
          position: pos,
          data: { variable: 'answer', cases: [{ value: 'yes', label: 'Y' }] },
        },
        { id: 'a', type: 'end', position: pos, data: {} },
        { id: 'b', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'c' },
        { id: '2', source: 'c', target: 'a', sourceHandle: 'yes' },
        { id: '3', source: 'c', target: 'b', sourceHandle: 'else' },
      ],
    })
    expect(result.ok).toBe(true)
  })
})
