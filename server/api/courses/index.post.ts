import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { createCourseSchema } from '#shared/validation/courses'
import { createCourse } from '#server/services/courses/commands'
import { requireRole } from '#server/utils/require-session'
import { parseBody } from '#server/utils/validate'

/**
 * Creates a course.
 *
 * The course starts in the `pending` state, so it stays out of the public
 * catalog until an admin approves it.
 */
export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const body = await parseBody(event, createCourseSchema)

  const course = await createCourse(body, session.user.id)

  setResponseStatus(event, 201)

  return course
})
