import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courses, lectures, modules } from '#server/db/schema'
import type {
  AddModuleValues,
  CourseQueryValues,
  CourseStatus,
  CreateCourseValues,
  UpdateCourseValues
} from '#shared/validation/courses'
import { ServiceError } from '#server/utils/service-error'

/**
 * Course business logic.
 *
 * The service owns the rules that the API routes must not contain: what the
 * public catalog shows, who may change a course, and how the curriculum is
 * assembled. It never touches HTTP objects — routes pass plain values in and
 * translate the results into responses.
 */

/** The signed-in user, as far as the course rules care about them. */
export interface CourseActor {
  id?: string | null
  role?: string | null
}

/** An actor that is known to be a signed-in user with an id. */
export interface CourseOwner {
  id: string
  role?: string | null
}

export interface CourseSummary {
  id: string
  instructorId: string
  title: string
  description: string | null
  category: string | null
  difficulty: string | null
  thumbnailUrl: string | null
  price: number
  status: CourseStatus
  createdAt: Date
  updatedAt: Date
}

export interface LectureSummary {
  id: string
  moduleId: string
  title: string
  videoUrl: string | null
  transcript: string | null
  durationSeconds: number | null
  orderIndex: number
  resourceUrls: string[]
}

export interface ModuleSummary {
  id: string
  courseId: string
  title: string
  orderIndex: number
  lectures: LectureSummary[]
}

export interface CourseWithCurriculum {
  course: CourseSummary
  modules: ModuleSummary[]
}

export interface CourseListResult {
  items: CourseSummary[]
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Escapes the wildcard characters of a user-supplied search term. */
function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`)
}

function toCourseSummary(row: typeof courses.$inferSelect): CourseSummary {
  return {
    id: row.id,
    instructorId: row.instructorId,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    thumbnailUrl: row.thumbnailUrl,
    price: Number(row.price),
    status: row.status as CourseStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

/**
 * The public catalog: approved courses only, newest first.
 *
 * Redis caching lands in Week 2 — the result shape is already the one the
 * cache will store, so adding it later touches only this function.
 */
export async function listPublishedCourses(
  query: CourseQueryValues
): Promise<CourseListResult> {
  return listCourses(query, eq(courses.status, 'approved'))
}

/** The courses an instructor owns, in any publication state. */
export async function listInstructorCourses(
  query: CourseQueryValues,
  instructorId: string
): Promise<CourseListResult> {
  return listCourses(query, eq(courses.instructorId, instructorId))
}

async function listCourses(
  query: CourseQueryValues,
  scope: SQL | undefined
): Promise<CourseListResult> {
  const db = useDb()
  const filters = [scope]

  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`
    filters.push(
      or(ilike(courses.title, pattern), ilike(courses.description, pattern))
    )
  }

  if (query.category) {
    filters.push(eq(courses.category, query.category))
  }

  if (query.difficulty) {
    filters.push(eq(courses.difficulty, query.difficulty))
  }

  const where = and(...filters)
  const offset = (query.page - 1) * query.limit

  const rows = await db
    .select()
    .from(courses)
    .where(where)
    .orderBy(desc(courses.createdAt))
    .limit(query.limit)
    .offset(offset)

  const [totals] = await db
    .select({ total: count() })
    .from(courses)
    .where(where)

  const total = totals?.total ?? 0

  return {
    items: rows.map(toCourseSummary),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit))
  }
}

/**
 * A course with its curriculum.
 *
 * Approved courses are public. A course that is still pending is visible to
 * its own instructor and to admins only.
 */
export async function getCourse(
  courseId: string,
  actor?: CourseActor | null
): Promise<CourseWithCurriculum> {
  const db = useDb()

  const [row] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  if (!row) {
    throw new ServiceError('not_found')
  }

  if (!canView(row.status, row.instructorId, actor)) {
    throw new ServiceError('not_found')
  }

  const moduleRows = await db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(asc(modules.orderIndex))

  const moduleIds = moduleRows.map((module) => module.id)

  const lectureRows = moduleIds.length
    ? await db
        .select()
        .from(lectures)
        .where(inArray(lectures.moduleId, moduleIds))
        .orderBy(asc(lectures.orderIndex))
    : []

  const lecturesByModule = new Map<string, LectureSummary[]>()

  for (const lecture of lectureRows) {
    const list = lecturesByModule.get(lecture.moduleId) ?? []
    list.push({
      id: lecture.id,
      moduleId: lecture.moduleId,
      title: lecture.title,
      videoUrl: lecture.videoUrl,
      transcript: lecture.transcript,
      durationSeconds: lecture.durationSeconds,
      orderIndex: lecture.orderIndex,
      resourceUrls: lecture.resourceUrls
    })
    lecturesByModule.set(lecture.moduleId, list)
  }

  return {
    course: toCourseSummary(row),
    modules: moduleRows.map((module) => ({
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      orderIndex: module.orderIndex,
      lectures: lecturesByModule.get(module.id) ?? []
    }))
  }
}

/**
 * Creates a course in the `pending` state. It stays out of the public
 * catalog until an admin approves it.
 */
export async function createCourse(
  input: CreateCourseValues,
  owner: CourseOwner
): Promise<CourseSummary> {
  const db = useDb()

  const [row] = await db
    .insert(courses)
    .values({
      instructorId: owner.id,
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

/** Updates the metadata of a course. Only its owner or an admin may do so. */
export async function updateCourse(
  courseId: string,
  input: UpdateCourseValues,
  actor: CourseActor
): Promise<CourseSummary> {
  const db = useDb()
  const existing = await requireOwnedCourse(courseId, actor)

  const [row] = await db
    .update(courses)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.difficulty !== undefined
        ? { difficulty: input.difficulty }
        : {}),
      ...(input.thumbnailUrl !== undefined
        ? { thumbnailUrl: input.thumbnailUrl }
        : {}),
      ...(input.price !== undefined ? { price: String(input.price) } : {}),
      updatedAt: new Date()
    })
    .where(eq(courses.id, existing.id))
    .returning()

  return toCourseSummary(row!)
}

/** Appends a module to a course, keeping the module order contiguous. */
export async function addModule(
  courseId: string,
  input: AddModuleValues,
  actor: CourseActor
): Promise<ModuleSummary> {
  const db = useDb()
  const existing = await requireOwnedCourse(courseId, actor)

  const orderIndex =
    input.orderIndex ?? (await nextModuleOrderIndex(existing.id))

  const [row] = await db
    .insert(modules)
    .values({
      courseId: existing.id,
      title: input.title,
      orderIndex
    })
    .returning()

  return {
    id: row!.id,
    courseId: row!.courseId,
    title: row!.title,
    orderIndex: row!.orderIndex,
    lectures: []
  }
}

async function nextModuleOrderIndex(courseId: string) {
  const db = useDb()
  const rows = await db
    .select({ orderIndex: modules.orderIndex })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(desc(modules.orderIndex))
    .limit(1)

  return (rows[0]?.orderIndex ?? -1) + 1
}

/**
 * Loads a course and checks that the actor may change it.
 *
 * A missing course and a course owned by somebody else are reported
 * differently: `not_found` when the row does not exist, `forbidden` when it
 * exists but belongs to another instructor.
 */
async function requireOwnedCourse(courseId: string, actor: CourseActor) {
  const db = useDb()

  const [row] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  if (!row) {
    throw new ServiceError('not_found')
  }

  if (!canManage(row.instructorId, actor)) {
    throw new ServiceError('forbidden')
  }

  return row
}

function canManage(instructorId: string, actor: CourseActor) {
  return actor.role === 'admin' || instructorId === actor.id
}

function canView(
  status: string,
  instructorId: string,
  actor?: CourseActor | null
) {
  if (status === 'approved') return true

  return Boolean(actor && canManage(instructorId, actor))
}
