import { z } from 'zod'

/** Canvas position of a node. */
const positionSchema = z.object({ x: z.number(), y: z.number() })

/** A branch case for a condition node. */
const conditionCaseSchema = z.object({
  value: z.string(),
  label: z.string(),
})

const startNodeSchema = z.object({
  id: z.string(),
  type: z.literal('start'),
  position: positionSchema,
  data: z.object({}).strict(),
})

const messageNodeSchema = z.object({
  id: z.string(),
  type: z.literal('message'),
  position: positionSchema,
  data: z.object({ text: z.string() }),
})

const questionNodeSchema = z.object({
  id: z.string(),
  type: z.literal('question'),
  position: positionSchema,
  data: z.object({
    prompt: z.string(),
    /** Variable name the answer is stored under. */
    variable: z.string(),
  }),
})

const conditionNodeSchema = z.object({
  id: z.string(),
  type: z.literal('condition'),
  position: positionSchema,
  data: z.object({
    /** Variable whose value selects the branch. */
    variable: z.string(),
    cases: z.array(conditionCaseSchema),
  }),
})

const aiNodeSchema = z.object({
  id: z.string(),
  type: z.literal('ai'),
  position: positionSchema,
  data: z.object({
    systemPrompt: z.string(),
    model: z.string(),
  }),
})

const endNodeSchema = z.object({
  id: z.string(),
  type: z.literal('end'),
  position: positionSchema,
  data: z.object({}).strict(),
})

export const flowNodeSchema = z.discriminatedUnion('type', [
  startNodeSchema,
  messageNodeSchema,
  questionNodeSchema,
  conditionNodeSchema,
  aiNodeSchema,
  endNodeSchema,
])

export const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  /** Only meaningful for condition nodes — identifies which branch. */
  sourceHandle: z.string().nullish(),
})

export const flowGraphSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
})

export type FlowNode = z.infer<typeof flowNodeSchema>
export type FlowEdge = z.infer<typeof flowEdgeSchema>
export type FlowGraph = z.infer<typeof flowGraphSchema>
export type NodeType = FlowNode['type']

/** A single turn in a bot conversation. */
export interface BotMessage {
  role: 'bot' | 'user'
  text: string
}

/** Mutable state of an in-progress flow run. */
export interface FlowSession {
  /** Node the run is paused on (a question), or null before start / after end. */
  currentNodeId: string | null
  variables: Record<string, string>
  transcript: BotMessage[]
}

/** Parse + validate a graph that was stored as JSON. Throws on invalid shape. */
export function parseGraph(json: string): FlowGraph {
  return flowGraphSchema.parse(JSON.parse(json))
}

/** A fresh session for a new run. */
export function createSession(): FlowSession {
  return { currentNodeId: null, variables: {}, transcript: [] }
}
