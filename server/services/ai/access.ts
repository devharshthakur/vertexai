import { and, eq } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courses, enrollments } from '#server/db/schema'
import { ServiceError } from '#server/utils/service-error'
import { assertCanViewCourse, canManageCourse, type CourseActor } from '#server/services/courses/access'

/** The course fields the AI tutor needs after access has been verified. */
export interface AiCourse {
  id: string
  title: string
  instructorId: string
  status: string
}

/**
 * Loads a course for the AI tutor.
 *
 * The course owner and admins may use their own thread on any course they can
 * see; everyone else must be enrolled in an approved course. The check never
 * exposes another user's conversation, because every query is also scoped to
 * the actor's id.
 */
export async function requireAiCourse(courseId: string, actor: CourseActor): Promise<AiCourse> {
  const db = useDb()
  const [course] = await db.select({ id: courses.id, title: courses.title, instructorId: courses.instructorId, status: courses.status }).from(courses).where(eq(courses.id, courseId)).limit(1)

  if (!course) throw new ServiceError('not_found')
  assertCanViewCourse(course.status, course.instructorId, actor)

  if (canManageCourse(course.instructorId, actor)) return course

  const [enrollment] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, actor.id)))
    .limit(1)

  if (!enrollment) throw new ServiceError('forbidden')

  return course
}
