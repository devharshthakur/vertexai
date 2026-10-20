/**
 * Drizzle schema barrel.
 *
 * Each table lives in its own module next to this file and is re-exported
 * here, so `drizzle.config.ts` has a single entry point to load.
 *
 * Example:
 *
 *   // server/db/schema/courses.ts
 *   export const courses = pgTable('courses', { ... })
 *
 *   // server/db/schema/index.ts
 *   export * from './courses'
 *
 * The schema is intentionally empty for now: no domain tables have been
 * modelled yet, so the first `drizzle-kit generate` run has nothing to diff.
 */
export {}
