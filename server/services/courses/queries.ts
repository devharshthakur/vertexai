import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  or,
  type SQL
} from 'drizzle-orm'
import { useDb } from '#server/db'
import { courses, lectures, modules } from '#server/db/schema'
import type {
  CourseListResult,
  CourseWithCurriculum,
  LectureSummary
} from '#shared/types/courses'
import type { CourseQueryValues } from '#shared/validation/courses'
import { ServiceError } from '#server/utils/service-error'
import { assertCanViewCourse, type CourseActor } from './access'
import {
  toCourseSummary,
  toLectureSummary,
  toModuleSummary
} from './presenters'

/** Escapes wildcard characters in a user-supplied search term. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`)
}

/** Lists approved courses using catalog filters and pagination. */
export function listPublishedCourses(
  query: CourseQueryValues
): Promise<CourseListResult> {
  return listCourses(query, eq(courses.status, 'approved'))
}

/** Lists all courses owned by an instructor. */
export function listInstructorCourses(
  query: CourseQueryValues,
  instructorId: string
): Promise<CourseListResult> {
  return listCourses(query, eq(courses.instructorId, instructorId))
}

/** Lists courses awaiting an administrator's review. */
export function listPendingCourses(
  query: CourseQueryValues
): Promise<CourseListResult> {
  return listCourses(query, eq(courses.status, 'pending'))
}

/** Lists distinct categories used by approved courses. */
export async function listCourseCategories(): Promise<string[]> {
  const rows = await useDb()
    .selectDistinct({ category: courses.category })
    .from(courses)
    .where(and(eq(courses.status, 'approved'), isNotNull(courses.category)))
    .orderBy(asc(courses.category))

  return rows
    .map((row) => row.category)
    .filter((category): category is string => Boolean(category))
}

/** Applies shared filters, pagination, and totals to a course scope. */
async function listCourses(
  query: CourseQueryValues,
  scope: SQL | undefined
): Promise<CourseListResult> {
  const filters = [scope]

  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`
    filters.push(
      or(ilike(courses.title, pattern), ilike(courses.description, pattern))
    )
  }
  if (query.category) filters.push(eq(courses.category, query.category))
  if (query.difficulty) filters.push(eq(courses.difficulty, query.difficulty))

  const where = and(...filters)
  const offset = (query.page - 1) * query.limit
  const db = useDb()
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
  } satisfies CourseListResult
}

/** Loads a course and its ordered curriculum when visible to the actor. */
export async function getCourse(
  courseId: string,
  actor?: CourseActor | null
): Promise<CourseWithCurriculum> {
  const db = useDb()
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  if (!course) throw new ServiceError('not_found')
  assertCanViewCourse(course.status, course.instructorId, actor)

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
    list.push(toLectureSummary(lecture))
    lecturesByModule.set(lecture.moduleId, list)
  }

  return {
    course: toCourseSummary(course),
    modules: moduleRows.map((module) =>
      toModuleSummary(module, lecturesByModule.get(module.id) ?? [])
    )
  }
}
