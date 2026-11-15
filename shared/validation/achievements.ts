import { z } from 'zod'

/**
 * Milestone badges and certificate identifiers.
 *
 * The catalogue lives here rather than in a database table: it is a handful of
 * fixed milestones that both the browser and the server render from, so the
 * database only records which slugs a user has earned (PRD §7 `user_badges`
 * without the redundant `badges` lookup table).
 */

/** Milestone badges a learner can earn. Awarding is idempotent per slug. */
export const BADGE_SLUGS = ['course_completed', 'streak_7', 'quiz_perfect'] as const

export type BadgeSlug = (typeof BADGE_SLUGS)[number]

/** Display copy for a milestone, kept framework-free so the server can also use it. */
export interface BadgeDefinition {
  slug: BadgeSlug
  name: string
  description: string
}

/** Ordered catalogue the dashboard renders; earned state comes from the database. */
export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  { slug: 'course_completed', name: 'Course finisher', description: 'Completed every lecture in a course.' },
  { slug: 'streak_7', name: 'Seven-day streak', description: 'Studied on seven days in a row.' },
  { slug: 'quiz_perfect', name: 'Perfect score', description: 'Answered every question in a quiz correctly.' }
]

export const certificateIdSchema = z.uuid('Invalid certificate ID.')
