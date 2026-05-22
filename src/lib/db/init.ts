import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { sampleGraph } from '@/lib/flow/defaults'
import { db } from './index'
import { upsertBotIfMissing } from './queries'

let initialized = false

/**
 * Apply pending migrations and seed the sample bot idempotently.
 *
 * Safe to call repeatedly: `drizzle migrate` checks its bookkeeping table, and
 * the seed uses `INSERT OR IGNORE` on a stable id. Call before the first DB
 * query in any server context.
 */
export function ensureDbReady(): void {
  if (initialized) return

  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') })

  upsertBotIfMissing({
    id: 'sample-bot',
    name: 'サンプルボット',
    description: '名前を聞いて挨拶する最小フロー。Origami の動作確認用。',
    graph: JSON.stringify(sampleGraph),
  })

  initialized = true
}
