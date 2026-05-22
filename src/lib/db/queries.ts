import { desc, eq } from 'drizzle-orm'
import { db } from './index'
import { type Bot, bots, type NewBot } from './schema'

export function listBots(): Bot[] {
  return db.select().from(bots).orderBy(desc(bots.updatedAt)).all()
}

export function getBot(id: string): Bot | undefined {
  return db.select().from(bots).where(eq(bots.id, id)).get()
}

export function createBot(values: Omit<NewBot, 'createdAt' | 'updatedAt'>): Bot {
  return db.insert(bots).values(values).returning().get()
}

/** Idempotent insert for seeding — no-op if the id already exists. */
export function upsertBotIfMissing(values: Omit<NewBot, 'createdAt' | 'updatedAt'>): void {
  db.insert(bots).values(values).onConflictDoNothing().run()
}

export function renameBot(id: string, name: string): Bot | undefined {
  return db
    .update(bots)
    .set({ name, updatedAt: Date.now() })
    .where(eq(bots.id, id))
    .returning()
    .get()
}

export function updateBotGraph(id: string, graph: string): Bot | undefined {
  return db
    .update(bots)
    .set({ graph, updatedAt: Date.now() })
    .where(eq(bots.id, id))
    .returning()
    .get()
}

export function deleteBot(id: string): void {
  db.delete(bots).where(eq(bots.id, id)).run()
}
