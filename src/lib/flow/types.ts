import { z } from 'zod'

// --- Size limits ---------------------------------------------------------
// Bounds keep a caller-supplied graph from causing memory pressure or
// runaway AI cost. They are generous enough for any reasonable flow.
const MAX_NODES = 300
const MAX_EDGES = 600
const MAX_MESSAGE = 5_000
const MAX_PROMPT = 2_000
const MAX_SYSTEM_PROMPT = 8_000
const MAX_CASES = 20
const MAX_SHORT = 100
const MAX_VARIABLE = 64

/** Valid variable name — interpolation only resolves `{{\w+}}`. */
const variableName = z
  .string()
  .min(1)
  .max(MAX_VARIABLE)
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'Variable must be a valid identifier')

const positionSchema = z.object({ x: z.number(), y: z.number() })

const conditionCaseSchema = z.object({
  value: z.string().max(MAX_SHORT),
  label: z.string().max(MAX_SHORT),
})

const idSchema = z.string().min(1).max(MAX_SHORT)

const startNodeSchema = z.object({
  id: idSchema,
  type: z.literal('start'),
  position: positionSchema,
  data: z.object({}).strict(),
})

const messageNodeSchema = z.object({
  id: idSchema,
  type: z.literal('message'),
  position: positionSchema,
  data: z.object({ text: z.string().max(MAX_MESSAGE) }),
})

const questionNodeSchema = z.object({
  id: idSchema,
  type: z.literal('question'),
  position: positionSchema,
  data: z.object({
    prompt: z.string().max(MAX_PROMPT),
    /** Variable name the answer is stored under. */
    variable: variableName,
  }),
})

const conditionNodeSchema = z.object({
  id: idSchema,
  type: z.literal('condition'),
  position: positionSchema,
  data: z.object({
    /** Variable whose value selects the branch. */
    variable: variableName,
    cases: z.array(conditionCaseSchema).max(MAX_CASES),
  }),
})

const aiNodeSchema = z.object({
  id: idSchema,
  type: z.literal('ai'),
  position: positionSchema,
  data: z.object({
    systemPrompt: z.string().max(MAX_SYSTEM_PROMPT),
    model: z.string().min(1).max(MAX_SHORT),
  }),
})

const endNodeSchema = z.object({
  id: idSchema,
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
  id: idSchema,
  source: idSchema,
  target: idSchema,
  /** Only meaningful for condition nodes — identifies which branch. */
  sourceHandle: z.string().max(MAX_SHORT).nullish(),
})

export const flowGraphSchema = z.object({
  nodes: z.array(flowNodeSchema).max(MAX_NODES),
  edges: z.array(flowEdgeSchema).max(MAX_EDGES),
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
