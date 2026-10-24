import { and, desc, eq } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courses, enrollments } from '#server/db/schema'
import type { CourseStatus } from '#shared/validation/courses'
import type { EnrollmentSummary } from '#shared/types/courses'
import { ServiceError } from '#server/utils/service-error'

/**
 * Enrollment business logic.
 *
 * A student joins a course; the enrollment is the row the progress service
 * later keeps up to date, and the row the dashboard and the player page read.
 */

type EnrollmentRow = typeof enrollments.$inferSelect
type CourseRow = typeof courses.$inferSelect

function toEnrollmentSummary(
  enrollment: EnrollmentRow,
  course: CourseRow
): EnrollmentSummary {
  return {
    id: enrollment.id,
    courseId: enrollment.courseId,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    progressPercent: Number(enrollment.progressPercent),
    course: {
      id: course.id,
      title: course.title,
      thumbnailUrl: course.thumbnailUrl,
      category: course.category,
      difficulty: course.difficulty,
      status: course.status as CourseStatus
    }
  }
}

/**
 * Enrolls the student in a course.
 *
 * Enrolling twice is not an error: the existing enrollment is returned, so a
 * double-clicked button does not fail.
 */
export async function enrollStudent(
  courseId: string,
  userId: string
): Promise<EnrollmentSummary> {
  const db = useDb()

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  if (!course) {
    throw new ServiceError('not_found')
  }

  // Only published courses can be joined. A pending course is not part of the
  // catalog, so it is not joinable either.
  if (course.status !== 'approved') {
    throw new ServiceError('forbidden')
  }

  await db
    .insert(enrollments)
    .values({ userId, courseId })
    .onConflictDoNothing()

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(
      and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
    )
    .limit(1)

  if (!enrollment) {
    throw new ServiceError('not_found')
  }

  return toEnrollmentSummary(enrollment, course)
}

/** The courses the student is enrolled in, newest enrollment first. */
export async function listMyEnrollments(
  userId: string
): Promise<EnrollmentSummary[]> {
  const db = useDb()

  const rows = await db
    .select({ enrollment: enrollments, course: courses })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt))

  return rows.map((row) => toEnrollmentSummary(row.enrollment, row.course))
}
