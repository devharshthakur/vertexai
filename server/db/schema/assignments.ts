import { index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar, integer } from 'drizzle-orm/pg-core'
import { courses } from './courses'
import { users } from './auth'
import type { AssignmentRubricCriterion } from '../../../shared/validation/assignments'

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    instructions: text('instructions').notNull(),
    rubric: jsonb('rubric').$type<AssignmentRubricCriterion[]>().notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index('assignments_courseId_dueAt_idx').on(table.courseId, table.dueAt)]
)

export const assignmentSubmissions = pgTable(
  'assignment_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storageKey: uuid('storage_key').notNull().unique(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    contentType: varchar('content_type', { length: 120 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    grade: numeric('grade', { precision: 5, scale: 2 }),
    feedback: text('feedback'),
    gradedAt: timestamp('graded_at', { withTimezone: true })
  },
  (table) => [uniqueIndex('assignment_submissions_assignmentId_userId_uidx').on(table.assignmentId, table.userId), index('assignment_submissions_assignmentId_idx').on(table.assignmentId), index('assignment_submissions_userId_idx').on(table.userId)]
)
