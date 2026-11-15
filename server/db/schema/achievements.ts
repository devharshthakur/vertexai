import { relations } from 'drizzle-orm'
import { index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { courses } from './courses'
import { BADGE_SLUGS } from '../../../shared/validation/achievements'

/**
 * Completion rewards: downloadable certificates and milestone badges.
 *
 * A certificate row is written once, when the final lecture of a course is
 * completed. The recipient name and course title are snapshotted on the row so
 * a later profile or course rename never rewrites an already issued document.
 * The PDF itself is rendered on demand, so no file has to be stored or kept in
 * sync (a deliberate deviation from PRD §7's `certificate_url`).
 *
 * `user_badges` records only earned slugs; the catalogue, names, and copy live
 * in `shared/validation/achievements.ts` for the same reason the quiz question
 * types do — one source of truth for browser and server.
 */
export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    recipientName: varchar('recipient_name', { length: 150 }).notNull(),
    courseTitle: varchar('course_title', { length: 200 }).notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex('certificates_userId_courseId_uidx').on(table.userId, table.courseId), index('certificates_courseId_idx').on(table.courseId)]
)

export const userBadges = pgTable(
  'user_badges',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeSlug: varchar('badge_slug', { length: 40, enum: BADGE_SLUGS }).notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [primaryKey({ columns: [table.userId, table.badgeSlug] })]
)

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id]
  }),
  course: one(courses, {
    fields: [certificates.courseId],
    references: [courses.id]
  })
}))

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id]
  })
}))
