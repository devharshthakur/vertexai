import { sql } from 'drizzle-orm'
import { lectureProgress, lectures } from '#server/db/schema'

/**
 * Shared lecture totals for enrollment progress.
 *
 * Both the dashboard query and the completion update must use the same
 * definition, or a completed lecture can move one percentage while the list
 * reports another.
 */
export const courseProgressCounts = {
  total: sql<number>`count(${lectures.id})::int`,
  completed: sql<number>`count(${lectureProgress.id}) filter (where ${lectureProgress.completed})::int`
}

/** Converts raw lecture counts into the percentage stored on an enrollment. */
export function courseProgressPercent(total: number | undefined, completed: number | undefined): number {
  return total ? ((completed ?? 0) / total) * 100 : 0
}
