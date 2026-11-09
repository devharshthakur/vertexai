import { and, asc, eq, gte, sql } from 'drizzle-orm'
import { useDb, type Db } from '#server/db'
import { courseApprovals, courses, lectures, modules } from '#server/db/schema'
import type { CourseSummary, LectureSummary, ModuleSummary } from '#shared/types/courses'
import type { AddModuleValues, CreateCourseValues, CreateLectureValues, ReorderLecturesValues, ReorderModulesValues, ReviewCourseValues, UpdateCourseValues, UpdateLectureValues } from '#shared/validation/courses'
import { ServiceError } from '#server/utils/service-error'
import { assertCanManageCourse, type CourseActor } from './access'
import { toCourseSummary, toLectureSummary, toModuleSummary } from './presenters'

type DbTransaction = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Creates a private course draft for its instructor. */
export async function createCourse(input: CreateCourseValues, ownerId: string): Promise<CourseSummary> {
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
      status: 'draft'
    })
    .returning()

  return toCourseSummary(row!)
}

/** Submits a draft or rejected course for review, preserving prior decisions. */
export async function submitCourse(courseId: string, actor: CourseActor): Promise<CourseSummary> {
  return useDb().transaction(async (tx) => {
    const course = await lockOwnedCourse(tx, courseId, actor)
    if (course.status !== 'draft' && course.status !== 'rejected') {
      throw new ServiceError('conflict', 'Only drafts or rejected courses can be submitted.')
    }

    const [updated] = await tx.update(courses).set({ status: 'pending', updatedAt: new Date() }).where(eq(courses.id, courseId)).returning()
    return toCourseSummary(updated!)
  })
}

/** Updates supplied course metadata after checking ownership. */
export async function updateCourse(courseId: string, input: UpdateCourseValues, actor: CourseActor): Promise<CourseSummary> {
  const existing = await requireOwnedCourse(courseId, actor)
  const [row] = await useDb()
    .update(courses)
    .set({
      title: input.title,
      description: input.description,
      category: input.category,
      difficulty: input.difficulty,
      thumbnailUrl: input.thumbnailUrl,
      price: input.price === undefined ? undefined : String(input.price),
      updatedAt: new Date()
    })
    .where(eq(courses.id, existing.id))
    .returning()

  return toCourseSummary(row!)
}

/**
 * Adds a module at the requested position, or appends it.
 *
 * The course row is locked for the whole transaction so concurrent module
 * creations and reorders serialize before either reads the current positions.
 */
export async function addModule(courseId: string, input: AddModuleValues, actor: CourseActor): Promise<ModuleSummary> {
  return useDb().transaction(async (tx) => {
    const existing = await lockOwnedCourse(tx, courseId, actor)
    const currentModules = await tx.select({ id: modules.id, orderIndex: modules.orderIndex }).from(modules).where(eq(modules.courseId, existing.id)).orderBy(asc(modules.orderIndex), asc(modules.id))

    const orderIndex = input.orderIndex ?? currentModules.length

    if (orderIndex > currentModules.length) {
      throw new ServiceError('conflict', 'The module position is out of range.')
    }

    // Repair duplicate or skipped positions deterministically while the course row is locked.
    if (!currentModules.every((module, index) => module.orderIndex === index)) {
      for (const [index, module] of currentModules.entries()) {
        await tx.update(modules).set({ orderIndex: index }).where(eq(modules.id, module.id))
      }
    }

    if (orderIndex < currentModules.length) {
      await tx
        .update(modules)
        .set({ orderIndex: sql`${modules.orderIndex} + 1` })
        .where(and(eq(modules.courseId, existing.id), gte(modules.orderIndex, orderIndex)))
    }

    const [row] = await tx.insert(modules).values({ courseId: existing.id, title: input.title, orderIndex }).returning()

    return toModuleSummary(row!)
  })
}

/** Adds a YouTube lecture to an owned module at the next position. */
export async function addLecture(courseId: string, moduleId: string, input: CreateLectureValues, actor: CourseActor): Promise<LectureSummary> {
  return useDb().transaction(async (tx) => {
    const existingModule = await lockOwnedModule(tx, courseId, moduleId, actor)
    const currentLectures = await tx.select({ id: lectures.id, orderIndex: lectures.orderIndex }).from(lectures).where(eq(lectures.moduleId, existingModule.id)).orderBy(asc(lectures.orderIndex), asc(lectures.id))

    // Repair duplicate or skipped positions deterministically while the module row is locked.
    if (!currentLectures.every((lecture, index) => lecture.orderIndex === index)) {
      for (const [index, lecture] of currentLectures.entries()) {
        await tx.update(lectures).set({ orderIndex: index }).where(eq(lectures.id, lecture.id))
      }
    }

    const [row] = await tx
      .insert(lectures)
      .values({
        moduleId: existingModule.id,
        title: input.title,
        videoUrl: input.videoUrl,
        transcript: input.transcript ?? null,
        durationSeconds: input.durationSeconds ?? null,
        orderIndex: currentLectures.length
      })
      .returning()

    return toLectureSummary(row!)
  })
}

/** Updates lecture details after verifying the course, module, and lecture ownership chain. */
export async function updateLecture(courseId: string, moduleId: string, lectureId: string, input: UpdateLectureValues, actor: CourseActor): Promise<LectureSummary> {
  const existingModule = await requireOwnedModule(courseId, moduleId, actor)
  const [existingLecture] = await useDb().select().from(lectures).where(eq(lectures.id, lectureId)).limit(1)

  if (!existingLecture || existingLecture.moduleId !== existingModule.id) throw new ServiceError('not_found')

  const [row] = await useDb()
    .update(lectures)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
      ...(input.transcript !== undefined && { transcript: input.transcript }),
      ...(input.durationSeconds !== undefined && { durationSeconds: input.durationSeconds })
    })
    .where(eq(lectures.id, existingLecture.id))
    .returning()

  return toLectureSummary(row!)
}

/** Reorders all lectures in a module after verifying the submitted set. */
export async function reorderLectures(courseId: string, moduleId: string, input: ReorderLecturesValues, actor: CourseActor): Promise<LectureSummary[]> {
  return useDb().transaction(async (tx) => {
    const existingModule = await lockOwnedModule(tx, courseId, moduleId, actor)
    const currentLectures = await tx.select({ id: lectures.id }).from(lectures).where(eq(lectures.moduleId, existingModule.id)).orderBy(asc(lectures.orderIndex), asc(lectures.id))
    const currentIds = new Set(currentLectures.map((lecture) => lecture.id))

    if (currentIds.size !== input.lectureIds.length || input.lectureIds.some((lectureId) => !currentIds.has(lectureId))) {
      throw new ServiceError('forbidden', 'The lecture list does not match this module.')
    }

    for (const [orderIndex, lectureId] of input.lectureIds.entries()) {
      await tx.update(lectures).set({ orderIndex }).where(eq(lectures.id, lectureId))
    }

    return tx
      .select()
      .from(lectures)
      .where(eq(lectures.moduleId, existingModule.id))
      .orderBy(asc(lectures.orderIndex), asc(lectures.id))
      .then((rows) => rows.map(toLectureSummary))
  })
}

/** Reorders every module in a course after verifying the submitted set. */
export async function reorderModules(courseId: string, input: ReorderModulesValues, actor: CourseActor): Promise<ModuleSummary[]> {
  return useDb().transaction(async (tx) => {
    const existing = await lockOwnedCourse(tx, courseId, actor)
    const currentModules = await tx.select({ id: modules.id }).from(modules).where(eq(modules.courseId, existing.id)).orderBy(asc(modules.orderIndex), asc(modules.id))
    const currentIds = new Set(currentModules.map((module) => module.id))

    if (currentIds.size !== input.moduleIds.length || input.moduleIds.some((moduleId) => !currentIds.has(moduleId))) {
      throw new ServiceError('forbidden', 'The module list does not match this course.')
    }

    for (const [orderIndex, moduleId] of input.moduleIds.entries()) {
      await tx.update(modules).set({ orderIndex }).where(eq(modules.id, moduleId))
    }

    return tx
      .select()
      .from(modules)
      .where(eq(modules.courseId, existing.id))
      .orderBy(asc(modules.orderIndex), asc(modules.id))
      .then((rows) => rows.map((row) => toModuleSummary(row)))
  })
}

/** Records one pending-course decision and updates publication status atomically. */
export async function reviewCourse(courseId: string, input: ReviewCourseValues, reviewerId: string): Promise<CourseSummary> {
  return useDb().transaction(async (tx) => {
    const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for('update').limit(1)

    if (!course) throw new ServiceError('not_found')
    if (course.status !== 'pending') {
      throw new ServiceError('conflict', 'Only pending courses can be reviewed.')
    }

    const [updatedCourse] = await tx.update(courses).set({ status: input.decision, updatedAt: new Date() }).where(eq(courses.id, courseId)).returning()

    await tx.insert(courseApprovals).values({
      courseId,
      reviewedBy: reviewerId,
      decision: input.decision,
      comment: input.comment ?? null
    })

    return toCourseSummary(updatedCourse!)
  })
}

/** Loads a course and enforces owner/admin write access. */
async function requireOwnedCourse(courseId: string, actor: CourseActor): Promise<typeof courses.$inferSelect> {
  const [row] = await useDb().select().from(courses).where(eq(courses.id, courseId)).limit(1)

  if (!row) throw new ServiceError('not_found')
  assertCanManageCourse(row.instructorId, actor)

  return row
}

/** Loads a module and enforces course ownership before lecture mutations. */
async function requireOwnedModule(courseId: string, moduleId: string, actor: CourseActor): Promise<typeof modules.$inferSelect> {
  const course = await requireOwnedCourse(courseId, actor)
  const [row] = await useDb().select().from(modules).where(eq(modules.id, moduleId)).limit(1)

  if (!row || row.courseId !== course.id) throw new ServiceError('not_found')

  return row
}

/**
 * Locks the owned course row so module-list ordering operations serialize on
 * the same key, then re-checks ownership against the locked row.
 */
async function lockOwnedCourse(tx: DbTransaction, courseId: string, actor: CourseActor): Promise<typeof courses.$inferSelect> {
  const [row] = await tx.select().from(courses).where(eq(courses.id, courseId)).for('update').limit(1)

  if (!row) throw new ServiceError('not_found')
  assertCanManageCourse(row.instructorId, actor)

  return row
}

/**
 * Verifies course ownership and locks the module row so lecture-list ordering
 * operations serialize per module.
 */
async function lockOwnedModule(tx: DbTransaction, courseId: string, moduleId: string, actor: CourseActor): Promise<typeof modules.$inferSelect> {
  const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).limit(1)

  if (!course) throw new ServiceError('not_found')
  assertCanManageCourse(course.instructorId, actor)

  const [row] = await tx
    .select()
    .from(modules)
    .where(and(eq(modules.id, moduleId), eq(modules.courseId, course.id)))
    .for('update')
    .limit(1)

  if (!row) throw new ServiceError('not_found')

  return row
}
