import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { courses } from './courses'
import { users } from './auth'

export const courseApprovals = pgTable(
  'course_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    reviewedBy: text('reviewed_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    decision: varchar('decision', {
      length: 20,
      enum: ['approved', 'rejected']
    }).notNull(),
    comment: text('comment'),
    reviewedAt: timestamp('reviewed_at').defaultNow().notNull()
  },
  (table) => [
    index('course_approvals_courseId_idx').on(table.courseId),
    index('course_approvals_reviewedBy_idx').on(table.reviewedBy)
  ]
)
