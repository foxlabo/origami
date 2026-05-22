import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { z } from 'zod'
import { type RunDeps, runFlow } from '@/lib/flow/engine'
import { isAllowedModel } from '@/lib/flow/models'
import { type BotMessage, flowGraphSchema } from '@/lib/flow/types'
import { validateGraph } from '@/lib/flow/validate'

const MAX_INPUT_CHARS = 4_000
const MAX_TRANSCRIPT_TURNS = 500
const MAX_TURN_CHARS = 16_000
const MAX_VARIABLES = 200
/** Hard cap on the whole request body — a backstop on top of the field caps. */
const MAX_BODY_BYTES = 2 * 1024 * 1024

const requestSchema = z.object({
  graph: flowGraphSchema,
  session: z.object({
    currentNodeId: z.string().max(100).nullable(),
    variables: z
      .record(z.string().max(64), z.string().max(MAX_TURN_CHARS))
      .refine((v) => Object.keys(v).length <= MAX_VARIABLES, {
        message: `Too many variables (max ${MAX_VARIABLES})`,
      }),
    transcript: z
      .array(
        z.object({
          role: z.enum(['bot', 'user']),
          text: z.string().max(MAX_TURN_CHARS),
        }),
      )
      .max(MAX_TRANSCRIPT_TURNS),
  }),
  input: z.string().max(MAX_INPUT_CHARS).nullable(),
})

/**
 * Real AI dependency for the engine — calls OpenAI. Server-only.
 * The model is allow-listed by `validateGraph` before the engine runs.
 */
async function generateAiReply(
  systemPrompt: string,
  model: string,
  transcript: BotMessage[],
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
  if (!isAllowedModel(model)) throw new Error(`Model not allowed: ${model}`)
  const openai = createOpenAI({ apiKey })
  const messages = transcript.map((m) => ({
    role: m.role === 'bot' ? ('assistant' as const) : ('user' as const),
    content: m.text,
  }))
  const result =
    messages.length > 0
      ? await generateText({ model: openai(model), system: systemPrompt, messages })
      : await generateText({ model: openai(model), system: systemPrompt, prompt: 'こんにちは' })
  return result.text
}

function logError(scope: string, err: unknown): void {
  // biome-ignore lint/suspicious/noConsole: server-side observability for opaque error responses
  console.error(`[origami/${scope}]`, err)
}

/**
 * Execute one step of a chatbot flow.
 *
 * The graph is supplied in the request so the builder can test unsaved canvas
 * changes. This endpoint is intended for local, single-user use — see the
 * README security note. The graph is still hard-validated (shape, size,
 * semantics, model allow-list) before anything runs.
 */
export async function POST(req: Request) {
  let raw: string
  try {
    raw = await req.text()
  } catch {
    return Response.json({ error: 'Could not read request body' }, { status: 400 })
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return Response.json({ error: 'Request body too large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request shape' }, { status: 400 })
  }

  const { graph, session, input } = parsed.data

  const semantic = validateGraph(graph)
  if (!semantic.ok) {
    return Response.json(
      { error: `Flow is invalid: ${semantic.errors.join(' ')}` },
      { status: 400 },
    )
  }

  const deps: RunDeps = { generateAiReply }

  let result: Awaited<ReturnType<typeof runFlow>>
  try {
    result = await runFlow(graph, session, input, deps)
  } catch (err) {
    logError('bot-run', err)
    return Response.json({ error: 'Flow execution failed' }, { status: 500 })
  }

  // Never echo provider/internal error detail to the client.
  if (result.status === 'error') {
    logError('bot-run/flow', result.error)
    return Response.json({
      ...result,
      error: 'The flow could not finish. Check the flow design and server logs.',
    })
  }

  return Response.json(result)
}
