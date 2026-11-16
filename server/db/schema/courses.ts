import { relations, sql } from 'drizzle-orm'
import { index, integer, numeric, pgTable, text, timestamp, uuid, varchar, vector } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { COURSE_STATUSES } from '../../../shared/validation/courses'

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
    status: varchar('status', { length: 20, enum: COURSE_STATUSES }).default('draft').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull()
  },
  (table) => [index('courses_instructorId_idx').on(table.instructorId), index('courses_status_idx').on(table.status), index('courses_category_idx').on(table.category), index('courses_difficulty_idx').on(table.difficulty)]
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
      .notNull(),
    /** Cached AI summary of the transcript. */
    summary: text('summary'),
    summaryGeneratedAt: timestamp('summary_generated_at', { withTimezone: true })
  },
  (table) => [index('lectures_moduleId_idx').on(table.moduleId)]
)

/**
 * One embedded piece of a lecture transcript.
 *
 * A transcript can be longer than the embedding model accepts in one request,
 * so the tutor indexes it in chunks. Each row holds one chunk with its vector,
 * and the course id is stored next to it so retrieval stays a single scoped
 * query instead of a join through modules and lectures.
 */
export const lectureChunks = pgTable(
  'lecture_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lectureId: uuid('lecture_id')
      .notNull()
      .references(() => lectures.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    /** Position of the chunk inside the transcript, from zero. */
    position: integer('position').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('lecture_chunks_courseId_idx').on(table.courseId), index('lecture_chunks_lectureId_idx').on(table.lectureId), index('lecture_chunks_embedding_hnsw_idx').using('hnsw', table.embedding.op('vector_cosine_ops'))]
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

export const lecturesRelations = relations(lectures, ({ one, many }) => ({
  module: one(modules, {
    fields: [lectures.moduleId],
    references: [modules.id]
  }),
  chunks: many(lectureChunks)
}))
