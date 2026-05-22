import { Boxes } from 'lucide-react'
import { BotCard } from '@/components/bot/bot-card'
import { CreateBotDialog } from '@/components/bot/create-bot-dialog'
import { ensureDbReady } from '@/lib/db/init'
import { listBots } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

/** Best-effort node count for a bot card; never throws on malformed JSON. */
function countNodes(graphJson: string): number {
  try {
    const graph = JSON.parse(graphJson) as { nodes?: unknown[] }
    return Array.isArray(graph.nodes) ? graph.nodes.length : 0
  } catch {
    return 0
  }
}

export default function HomePage() {
  ensureDbReady()
  const bots = listBots()

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Boxes className="h-6 w-6" />
            Origami
          </h1>
          <p className="text-sm text-zinc-500">
            Visual chatbot flow builder — design a conversation, test it live.
          </p>
        </div>
        <CreateBotDialog />
      </header>

      {bots.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-16 text-center text-sm text-zinc-500">
          No bots yet. Click <strong>New bot</strong> to create your first flow.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <BotCard
              key={bot.id}
              id={bot.id}
              name={bot.name}
              description={bot.description}
              nodeCount={countNodes(bot.graph)}
            />
          ))}
        </div>
      )}
    </main>
  )
}
