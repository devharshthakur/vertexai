import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { UIMessage } from 'ai'
import { users } from './auth'
import { courses } from './courses'

/**
 * AI tutor conversation history.
 *
 * There is one implicit thread per student and course, so the table stores the
 * individual messages in order instead of a separate session row. Each row
 * holds one AI SDK `UIMessage` as JSON, exactly as the chat transport produced
 * it, so the browser can restore the conversation without a translation layer.
 */
export const aiChatMessages = pgTable(
  'ai_chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    message: jsonb('message').$type<UIMessage>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index('ai_chat_messages_userId_courseId_createdAt_idx').on(table.userId, table.courseId, table.createdAt), index('ai_chat_messages_courseId_idx').on(table.courseId)]
)
