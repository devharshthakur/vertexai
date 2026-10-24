import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import { COURSE_STATUSES } from '#shared/validation/courses'

/**
 * Course authoring tables: `courses` → `modules` → `lectures`.
 *
 * The shape follows the PRD (§7), with two deliberate deviations:
 *
 * - New tables use UUID primary keys, while the foreign key to `users` stays
 *   **text** because Better Auth already migrated `users.id` as text.
 * - `status`, `difficulty` and `category` are plain varchar columns. The
 *   allowed values live in `shared/validation/courses.ts`, so the browser and
 *   the server validate them from one source of truth.
 */
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instructorId: text('instructor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 80 }),
    difficulty: varchar('difficulty', { length: 20 }),
    thumbnailUrl: text('thumbnail_url'),
    price: numeric('price', { precision: 10, scale: 2 }).default('0').notNull(),
    status: varchar('status', { length: 20, enum: COURSE_STATUSES })
      .default('pending')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [
    index('courses_instructorId_idx').on(table.instructorId),
    index('courses_status_idx').on(table.status),
    index('courses_category_idx').on(table.category),
    index('courses_difficulty_idx').on(table.difficulty)
  ]
)

export const modules = pgTable(
  'modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    orderIndex: integer('order_index').notNull()
  },
  (table) => [index('modules_courseId_idx').on(table.courseId)]
)

export const lectures = pgTable(
  'lectures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    videoUrl: text('video_url'),
    transcript: text('transcript'),
    durationSeconds: integer('duration_seconds'),
    orderIndex: integer('order_index').notNull(),
    resourceUrls: text('resource_urls')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull()
  },
  (table) => [index('lectures_moduleId_idx').on(table.moduleId)]
)

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id]
  }),
  modules: many(modules)
}))

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id]
  }),
  lectures: many(lectures)
}))

export const lecturesRelations = relations(lectures, ({ one }) => ({
  module: one(modules, {
    fields: [lectures.moduleId],
    references: [modules.id]
  })
}))
