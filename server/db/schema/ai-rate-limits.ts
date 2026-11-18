import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'

/** One fixed-window AI request counter per user. */
export const aiRateLimits = pgTable(
  'ai_rate_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull(),
    count: integer('count').notNull()
  },
  (table) => [uniqueIndex('ai_rate_limits_user_id_uidx').on(table.userId)]
)
