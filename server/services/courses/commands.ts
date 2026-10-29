import { asc, desc, eq } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courseApprovals, courses, modules } from '#server/db/schema'
import type { CourseSummary, ModuleSummary } from '#shared/types/courses'
import type {
  AddModuleValues,
  CreateCourseValues,
  ReorderModulesValues,
  ReviewCourseValues,
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

/** Reorders every module in a course after verifying the submitted set. */
export async function reorderModules(
  courseId: string,
  input: ReorderModulesValues,
  actor: CourseActor
): Promise<ModuleSummary[]> {
  const existing = await requireOwnedCourse(courseId, actor)
  const db = useDb()

  return db.transaction(async (tx) => {
    const currentModules = await tx
      .select({ id: modules.id })
      .from(modules)
      .where(eq(modules.courseId, existing.id))
      .orderBy(asc(modules.orderIndex))
    const currentIds = new Set(currentModules.map((module) => module.id))

    if (
      currentIds.size !== input.moduleIds.length ||
      input.moduleIds.some((moduleId) => !currentIds.has(moduleId))
    ) {
      throw new ServiceError(
        'forbidden',
        'The module list does not match this course.'
      )
    }

    for (const [orderIndex, moduleId] of input.moduleIds.entries()) {
      await tx
        .update(modules)
        .set({ orderIndex })
        .where(eq(modules.id, moduleId))
    }

    return tx
      .select()
      .from(modules)
      .where(eq(modules.courseId, existing.id))
      .orderBy(asc(modules.orderIndex))
      .then((rows) => rows.map((row) => toModuleSummary(row)))
  })
}

/** Records one pending-course decision and updates publication status atomically. */
export async function reviewCourse(
  courseId: string,
  input: ReviewCourseValues,
  reviewerId: string
): Promise<CourseSummary> {
  return useDb().transaction(async (tx) => {
    const [course] = await tx
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .for('update')
      .limit(1)

    if (!course) throw new ServiceError('not_found')
    if (course.status !== 'pending') {
      throw new ServiceError(
        'conflict',
        'Only pending courses can be reviewed.'
      )
    }

    const [updatedCourse] = await tx
      .update(courses)
      .set({ status: input.decision, updatedAt: new Date() })
      .where(eq(courses.id, courseId))
      .returning()

    await tx.insert(courseApprovals).values({
      courseId,
      reviewedBy: reviewerId,
      decision: input.decision,
      comment: input.comment ?? null
    })

    return toCourseSummary(updatedCourse!)
  })
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
