import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

const now = (name: string) =>
  integer(name)
    .notNull()
    .$defaultFn(() => Date.now())

export const bots = sqliteTable('bots', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  /** The flow graph, serialised as JSON ({ nodes, edges }). */
  graph: text('graph').notNull(),
  createdAt: now('created_at'),
  updatedAt: now('updated_at'),
})

export type Bot = typeof bots.$inferSelect
export type NewBot = typeof bots.$inferInsert
