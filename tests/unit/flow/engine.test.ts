import { describe, expect, it, vi } from 'vitest'
import { interpolate, type RunDeps, runFlow } from '@/lib/flow/engine'
import { createSession, type FlowGraph } from '@/lib/flow/types'

const pos = { x: 0, y: 0 }

/** AI dependency that fails if unexpectedly invoked. */
const noAi: RunDeps = {
  generateAiReply: async () => {
    throw new Error('AI dependency should not be called in this test')
  },
}

describe('interpolate', () => {
  it('replaces {{var}} placeholders', () => {
    expect(interpolate('Hi {{name}}!', { name: 'Aki' })).toBe('Hi Aki!')
  })

  it('replaces unknown variables with an empty string', () => {
    expect(interpolate('Hi {{name}}!', {})).toBe('Hi !')
  })

  it('tolerates whitespace inside the braces', () => {
    expect(interpolate('{{ name }}', { name: 'X' })).toBe('X')
  })
})

describe('runFlow', () => {
  it('runs a linear message flow to completion', async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'm', type: 'message', position: pos, data: { text: 'hello' } },
        { id: 'e', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'm' },
        { id: '2', source: 'm', target: 'e' },
      ],
    }
    const result = await runFlow(graph, createSession(), null, noAi)
    expect(result.status).toBe('ended')
    expect(result.messages).toEqual([{ role: 'bot', text: 'hello' }])
  })

  it('pauses at a question and resumes once input arrives', async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'q', type: 'question', position: pos, data: { prompt: 'name?', variable: 'name' } },
        { id: 'm', type: 'message', position: pos, data: { text: 'hi {{name}}' } },
        { id: 'e', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'q' },
        { id: '2', source: 'q', target: 'm' },
        { id: '3', source: 'm', target: 'e' },
      ],
    }

    const step1 = await runFlow(graph, createSession(), null, noAi)
    expect(step1.status).toBe('awaiting-input')
    expect(step1.messages).toEqual([{ role: 'bot', text: 'name?' }])
    expect(step1.session.currentNodeId).toBe('q')

    const step2 = await runFlow(graph, step1.session, 'Aki', noAi)
    expect(step2.status).toBe('ended')
    expect(step2.messages).toEqual([{ role: 'bot', text: 'hi Aki' }])
    expect(step2.session.variables.name).toBe('Aki')
  })

  it('branches on a condition node by variable value', async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'q', type: 'question', position: pos, data: { prompt: 'yes/no?', variable: 'ans' } },
        {
          id: 'c',
          type: 'condition',
          position: pos,
          data: { variable: 'ans', cases: [{ value: 'yes', label: 'Yes' }] },
        },
        { id: 'my', type: 'message', position: pos, data: { text: 'said yes' } },
        { id: 'mn', type: 'message', position: pos, data: { text: 'said else' } },
        { id: 'e', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'q' },
        { id: '2', source: 'q', target: 'c' },
        { id: '3', source: 'c', target: 'my', sourceHandle: 'yes' },
        { id: '4', source: 'c', target: 'mn', sourceHandle: 'else' },
        { id: '5', source: 'my', target: 'e' },
        { id: '6', source: 'mn', target: 'e' },
      ],
    }

    const start = await runFlow(graph, createSession(), null, noAi)
    const yes = await runFlow(graph, start.session, 'yes', noAi)
    expect(yes.messages).toEqual([{ role: 'bot', text: 'said yes' }])

    const other = await runFlow(graph, start.session, 'maybe', noAi)
    expect(other.messages).toEqual([{ role: 'bot', text: 'said else' }])
  })

  it('invokes the injected AI dependency for ai nodes', async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        {
          id: 'a',
          type: 'ai',
          position: pos,
          data: { systemPrompt: 'be nice', model: 'gpt-5.4-mini' },
        },
        { id: 'e', type: 'end', position: pos, data: {} },
      ],
      edges: [
        { id: '1', source: 's', target: 'a' },
        { id: '2', source: 'a', target: 'e' },
      ],
    }
    const generateAiReply = vi.fn(async () => 'AI says hi')
    const result = await runFlow(graph, createSession(), null, { generateAiReply })
    expect(generateAiReply).toHaveBeenCalledOnce()
    expect(result.messages).toEqual([{ role: 'bot', text: 'AI says hi' }])
    expect(result.status).toBe('ended')
  })

  it('errors when the graph has no start node', async () => {
    const result = await runFlow({ nodes: [], edges: [] }, createSession(), null, noAi)
    expect(result.status).toBe('error')
    expect(result.error).toMatch(/start/i)
  })

  it('errors when a graph loops infinitely', async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'm', type: 'message', position: pos, data: { text: 'loop' } },
      ],
      edges: [
        { id: '1', source: 's', target: 'm' },
        { id: '2', source: 'm', target: 'm' },
      ],
    }
    const result = await runFlow(graph, createSession(), null, noAi)
    expect(result.status).toBe('error')
    expect(result.error).toMatch(/loop|step/i)
  })

  it('surfaces an AI node failure as an error result', async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'a', type: 'ai', position: pos, data: { systemPrompt: 'x', model: 'm' } },
      ],
      edges: [{ id: '1', source: 's', target: 'a' }],
    }
    const result = await runFlow(graph, createSession(), null, {
      generateAiReply: async () => {
        throw new Error('quota exceeded')
      },
    })
    expect(result.status).toBe('error')
    expect(result.error).toBe('quota exceeded')
  })

  it('ends gracefully at a dead end (node with no outgoing edge)', async () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 's', type: 'start', position: pos, data: {} },
        { id: 'm', type: 'message', position: pos, data: { text: 'bye' } },
      ],
      edges: [{ id: '1', source: 's', target: 'm' }],
    }
    const result = await runFlow(graph, createSession(), null, noAi)
    expect(result.status).toBe('ended')
    expect(result.messages).toEqual([{ role: 'bot', text: 'bye' }])
  })
})
