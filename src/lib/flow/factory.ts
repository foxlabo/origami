import { nanoid } from 'nanoid'
import type { FlowNode, NodeType } from './types'

/** Create a new node of the given type with sensible default data. */
export function createNode(type: NodeType, position: { x: number; y: number }): FlowNode {
  const id = nanoid(8)
  switch (type) {
    case 'start':
      return { id, type, position, data: {} }
    case 'message':
      return { id, type, position, data: { text: '新しいメッセージ' } }
    case 'question':
      return { id, type, position, data: { prompt: '質問を入力', variable: 'answer' } }
    case 'condition':
      return {
        id,
        type,
        position,
        data: { variable: 'answer', cases: [{ value: 'yes', label: 'はい' }] },
      }
    case 'ai':
      return {
        id,
        type,
        position,
        data: { systemPrompt: 'あなたは親切なアシスタントです。', model: 'gpt-5.4-mini' },
      }
    case 'end':
      return { id, type, position, data: {} }
  }
}
