import { date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { lectures } from './courses'
import { users } from './auth'

/** Student-owned notes, bookmarks, and daily learning streak state. */
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lectureId: uuid('lecture_id')
      .notNull()
      .references(() => lectures.id, { onDelete: 'cascade' }),
    timestampSeconds: integer('timestamp_seconds').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index('notes_userId_lectureId_idx').on(table.userId, table.lectureId), index('notes_lectureId_idx').on(table.lectureId)]
)

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lectureId: uuid('lecture_id')
      .notNull()
      .references(() => lectures.id, { onDelete: 'cascade' }),
    timestampSeconds: integer('timestamp_seconds').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('bookmarks_userId_lectureId_idx').on(table.userId, table.lectureId), index('bookmarks_lectureId_idx').on(table.lectureId)]
)

export const streaks = pgTable('streaks', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActiveDate: date('last_active_date', { mode: 'string' })
})
