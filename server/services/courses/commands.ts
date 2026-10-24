import { desc, eq } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courses, modules } from '#server/db/schema'
import type { CourseSummary, ModuleSummary } from '#shared/types/courses'
import type {
  AddModuleValues,
  CreateCourseValues,
  UpdateCourseValues
} from '#shared/validation/courses'
import { ServiceError } from '#server/utils/service-error'
import { assertCanManageCourse, type CourseActor } from './access'
import { toCourseSummary, toModuleSummary } from './presenters'

/** Creates a course in the pending state for its instructor. */
export async function createCourse(
  input: CreateCourseValues,
  ownerId: string
): Promise<CourseSummary> {
  const [row] = await useDb()
    .insert(courses)
    .values({
      instructorId: ownerId,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      difficulty: input.difficulty ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      price: input.price === undefined ? '0' : String(input.price),
      status: 'pending'
    })
    .returning()

  return toCourseSummary(row!)
}

/** Updates supplied course metadata after checking ownership. */
export async function updateCourse(
  courseId: string,
  input: UpdateCourseValues,
  actor: CourseActor
): Promise<CourseSummary> {
  const existing = await requireOwnedCourse(courseId, actor)
  const [row] = await useDb()
    .update(courses)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && {
        description: input.description
      }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
      ...(input.thumbnailUrl !== undefined && {
        thumbnailUrl: input.thumbnailUrl
      }),
      ...(input.price !== undefined && { price: String(input.price) }),
      updatedAt: new Date()
    })
    .where(eq(courses.id, existing.id))
    .returning()

  return toCourseSummary(row!)
}

/** Adds a module at the requested or next available position. */
export async function addModule(
  courseId: string,
  input: AddModuleValues,
  actor: CourseActor
): Promise<ModuleSummary> {
  const existing = await requireOwnedCourse(courseId, actor)
  const orderIndex =
    input.orderIndex ?? (await nextModuleOrderIndex(existing.id))
  const [row] = await useDb()
    .insert(modules)
    .values({ courseId: existing.id, title: input.title, orderIndex })
    .returning()

  return toModuleSummary(row!)
}

/** Returns the next contiguous module position for a course. */
async function nextModuleOrderIndex(courseId: string): Promise<number> {
  const rows = await useDb()
    .select({ orderIndex: modules.orderIndex })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(desc(modules.orderIndex))
    .limit(1)

  return (rows[0]?.orderIndex ?? -1) + 1
}

/** Loads a course and enforces owner/admin write access. */
async function requireOwnedCourse(
  courseId: string,
  actor: CourseActor
): Promise<typeof courses.$inferSelect> {
  const [row] = await useDb()
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  if (!row) throw new ServiceError('not_found')
  assertCanManageCourse(row.instructorId, actor)

  return row
}
