import { relations } from 'drizzle-orm'
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'
import { courses } from './courses'
import { users } from './auth'

/**
 * Enrollment: the link between a student and a course.
 *
 * Follows PRD §7, with the plan's deviations: a UUID primary key and a text
 * foreign key to `users`, because Better Auth migrated `users.id` as text.
 *
 * `progress_percent` is a cached value: the progress service recomputes it
 * when a lecture is completed. `lecture_progress`, `notes` and `bookmarks`
 * join this file in Week 2, when the player starts reporting progress.
 */
export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
    progressPercent: numeric('progress_percent', { precision: 5, scale: 2 })
      .default('0')
      .notNull()
  },
  (table) => [
    uniqueIndex('enrollments_userId_courseId_uidx').on(
      table.userId,
      table.courseId
    ),
    index('enrollments_userId_idx').on(table.userId),
    index('enrollments_courseId_idx').on(table.courseId)
  ]
)

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id]
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id]
  })
}))
