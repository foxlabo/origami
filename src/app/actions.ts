'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { ensureDbReady } from '@/lib/db/init'
import {
  createBot as dbCreateBot,
  deleteBot as dbDeleteBot,
  renameBot as dbRenameBot,
  updateBotGraph as dbUpdateBotGraph,
  getBot,
} from '@/lib/db/queries'
import { emptyGraph } from '@/lib/flow/defaults'
import { flowGraphSchema } from '@/lib/flow/types'
import { validateGraph } from '@/lib/flow/validate'

const MAX_NAME = 80
const MAX_DESCRIPTION = 280
/** 1 MB cap on a serialised graph — guards against pathological payloads. */
const MAX_GRAPH_BYTES = 1024 * 1024

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(MAX_NAME),
  description: z.string().trim().max(MAX_DESCRIPTION).default(''),
})

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createBotAction(formData: FormData): Promise<void> {
  ensureDbReady()
  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) {
    throw new Error(z.flattenError(parsed.error).formErrors.join(', ') || 'Invalid bot details')
  }
  const bot = dbCreateBot({
    name: parsed.data.name,
    description: parsed.data.description,
    graph: JSON.stringify(emptyGraph()),
  })
  revalidatePath('/')
  redirect(`/bots/${bot.id}`)
}

export async function renameBotAction(id: string, name: string): Promise<ActionResult> {
  ensureDbReady()
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > MAX_NAME) {
    return { ok: false, error: 'Name must be 1-80 characters' }
  }
  const updated = dbRenameBot(id, trimmed)
  if (!updated) return { ok: false, error: 'Bot not found' }
  revalidatePath('/')
  revalidatePath(`/bots/${id}`)
  return { ok: true }
}

export async function deleteBotAction(id: string): Promise<void> {
  ensureDbReady()
  dbDeleteBot(id)
  revalidatePath('/')
  redirect('/')
}

export async function saveBotGraphAction(id: string, graphJson: string): Promise<ActionResult> {
  ensureDbReady()
  if (Buffer.byteLength(graphJson, 'utf8') > MAX_GRAPH_BYTES) {
    return { ok: false, error: 'Flow is too large to save' }
  }
  let parsedGraph: unknown
  try {
    parsedGraph = JSON.parse(graphJson)
  } catch {
    return { ok: false, error: 'Flow graph is not valid JSON' }
  }
  const validation = flowGraphSchema.safeParse(parsedGraph)
  if (!validation.success) {
    return { ok: false, error: 'Flow graph failed validation' }
  }
  // Semantic checks (one start node, unique ids, no dangling edges, ...).
  const semantic = validateGraph(validation.data)
  if (!semantic.ok) {
    return { ok: false, error: semantic.errors[0] ?? 'Flow graph is invalid' }
  }
  if (!getBot(id)) return { ok: false, error: 'Bot not found' }
  dbUpdateBotGraph(id, JSON.stringify(validation.data))
  revalidatePath(`/bots/${id}`)
  return { ok: true }
}
