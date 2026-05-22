import { notFound } from 'next/navigation'
import { BotEditor } from '@/components/builder/bot-editor'
import { ensureDbReady } from '@/lib/db/init'
import { getBot } from '@/lib/db/queries'
import { emptyGraph } from '@/lib/flow/defaults'
import { type FlowGraph, parseGraph } from '@/lib/flow/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BotEditorPage({ params }: PageProps) {
  ensureDbReady()
  const { id } = await params

  const bot = getBot(id)
  if (!bot) notFound()

  // Fall back to an empty graph if the stored JSON is somehow corrupt, so the
  // editor still opens and the user can recover.
  let graph: FlowGraph
  try {
    graph = parseGraph(bot.graph)
  } catch {
    graph = emptyGraph()
  }

  return <BotEditor botId={bot.id} botName={bot.name} initialGraph={graph} />
}
