import type { FlowGraph } from './types'

/** The starting graph for a brand-new bot: just a start node. */
export function emptyGraph(): FlowGraph {
  return {
    nodes: [{ id: 'start', type: 'start', position: { x: 260, y: 40 }, data: {} }],
    edges: [],
  }
}

/** A small demo flow used to seed the sample bot on first run. */
export const sampleGraph: FlowGraph = {
  nodes: [
    { id: 'start', type: 'start', position: { x: 300, y: 20 }, data: {} },
    {
      id: 'm1',
      type: 'message',
      position: { x: 230, y: 130 },
      data: { text: 'こんにちは！Origami のサンプルボットです。' },
    },
    {
      id: 'q1',
      type: 'question',
      position: { x: 230, y: 270 },
      data: { prompt: 'お名前を教えてください。', variable: 'name' },
    },
    {
      id: 'm2',
      type: 'message',
      position: { x: 230, y: 410 },
      data: { text: '{{name}} さん、はじめまして！何かお手伝いできることはありますか？' },
    },
    { id: 'end', type: 'end', position: { x: 300, y: 540 }, data: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'm1' },
    { id: 'e2', source: 'm1', target: 'q1' },
    { id: 'e3', source: 'q1', target: 'm2' },
    { id: 'e4', source: 'm2', target: 'end' },
  ],
}
