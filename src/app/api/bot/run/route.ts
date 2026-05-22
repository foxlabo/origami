import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { z } from 'zod'
import { type RunDeps, runFlow } from '@/lib/flow/engine'
import { type BotMessage, flowGraphSchema } from '@/lib/flow/types'

const MAX_INPUT_CHARS = 4_000

const requestSchema = z.object({
  graph: flowGraphSchema,
  session: z.object({
    currentNodeId: z.string().nullable(),
    variables: z.record(z.string(), z.string()),
    transcript: z.array(z.object({ role: z.enum(['bot', 'user']), text: z.string() })),
  }),
  input: z.string().max(MAX_INPUT_CHARS).nullable(),
})

/** Real AI dependency for the engine — calls OpenAI. Server-only. */
async function generateAiReply(
  systemPrompt: string,
  model: string,
  transcript: BotMessage[],
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
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

function logError(err: unknown): void {
  // biome-ignore lint/suspicious/noConsole: server-side observability for opaque error responses
  console.error('[origami/bot-run]', err)
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request shape' }, { status: 400 })
  }

  const { graph, session, input } = parsed.data
  const deps: RunDeps = { generateAiReply }

  try {
    const result = await runFlow(graph, session, input, deps)
    return Response.json(result)
  } catch (err) {
    logError(err)
    return Response.json({ error: 'Flow execution failed' }, { status: 500 })
  }
}
