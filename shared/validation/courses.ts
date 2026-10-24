import { z } from 'zod'

/**
 * Schemas for the course catalog and the instructor course builder.
 *
 * They live in `shared/` so the browser and the Nitro server validate the
 * same payloads with the same rules — the course form and the API route that
 * backs it share one definition.
 */

/** Explanation depth a course is pitched at (PRD §7 `courses.difficulty`). */
export const COURSE_DIFFICULTIES = [
  'beginner',
  'intermediate',
  'advanced'
] as const

/**
 * Publication state of a course. Only `approved` courses are listed in the
 * public catalog; the transition is driven by the admin approval queue.
 */
export const COURSE_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'archived'
] as const

export const courseDifficultySchema = z.enum(COURSE_DIFFICULTIES)
export const courseStatusSchema = z.enum(COURSE_STATUSES)
export const courseIdSchema = z.uuid('Invalid course id.')

export const createCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Use at least 3 characters.')
    .max(200, 'Keep the title under 200 characters.'),
  description: z.string().trim().max(5000).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  difficulty: courseDifficultySchema.nullable().optional(),
  thumbnailUrl: z.url('Enter a valid URL.').nullable().optional(),
  price: z
    .number()
    .min(0, 'The price cannot be negative.')
    .max(100_000)
    .optional()
})

/**
 * Metadata updates. The publication status is intentionally absent: only the
 * admin approval endpoint may change it.
 */
export const updateCourseSchema = createCourseSchema.partial()

export const addModuleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a module title.')
    .max(200, 'Keep the title under 200 characters.'),
  orderIndex: z.number().int().min(0).optional()
})

/**
 * Enrolling in a course carries no payload — the student comes from the
 * session. The schema exists so the route validates its body like every other
 * mutation, and rejects fields it does not know.
 */
export const enrollCourseSchema = z.object({}).strict().optional()

/**
 * Catalog query parameters. Values arrive as strings, so the numbers are
 * coerced before they are validated.
 */
export const courseQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  difficulty: courseDifficultySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
})

export type CourseDifficulty = (typeof COURSE_DIFFICULTIES)[number]
export type CourseStatus = (typeof COURSE_STATUSES)[number]

export type CreateCourseValues = z.input<typeof createCourseSchema>
export type UpdateCourseValues = z.input<typeof updateCourseSchema>
export type AddModuleValues = z.input<typeof addModuleSchema>
export type CourseQueryValues = z.output<typeof courseQuerySchema>
