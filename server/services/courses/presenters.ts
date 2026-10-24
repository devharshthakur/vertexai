import type { courses, lectures, modules } from '#server/db/schema'
import type {
  CourseSummary,
  LectureSummary,
  ModuleSummary
} from '#shared/types/courses'

/** Converts a course row to its public API shape. */
export function toCourseSummary(
  row: typeof courses.$inferSelect
): CourseSummary {
  return {
    id: row.id,
    instructorId: row.instructorId,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    thumbnailUrl: row.thumbnailUrl,
    price: Number(row.price),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Converts a module row and its lectures to the API shape. */
export function toModuleSummary(
  row: typeof modules.$inferSelect,
  lectures: LectureSummary[] = []
): ModuleSummary {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    orderIndex: row.orderIndex,
    lectures
  }
}

/** Converts a lecture row to the API shape. */
export function toLectureSummary(
  row: typeof lectures.$inferSelect
): LectureSummary {
  return {
    id: row.id,
    moduleId: row.moduleId,
    title: row.title,
    videoUrl: row.videoUrl,
    transcript: row.transcript,
    durationSeconds: row.durationSeconds,
    orderIndex: row.orderIndex,
    resourceUrls: row.resourceUrls
  }
}
