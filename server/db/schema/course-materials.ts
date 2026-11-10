import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { courses, lectures, modules } from './courses'

/** Uploaded files attached to a course module or one of its lectures. */
export const courseMaterials = pgTable(
  'course_materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    lectureId: uuid('lecture_id').references(() => lectures.id, { onDelete: 'cascade' }),
    originalFilename: text('original_filename').notNull(),
    contentType: varchar('content_type', { length: 120 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    storageKey: uuid('storage_key').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => [index('course_materials_course_module_lecture_idx').on(table.courseId, table.moduleId, table.lectureId), uniqueIndex('course_materials_storage_key_uidx').on(table.storageKey)]
)
