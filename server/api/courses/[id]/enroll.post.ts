import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { courseIdSchema, enrollCourseSchema } from '#shared/validation/courses'
import { enrollStudent } from '#server/services/enrollment-service'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'

/**
 * Enrolls the signed-in student in a course.
 *
 * The student comes from the session, so the request carries no identity.
 * Enrolling again returns the existing enrollment instead of failing.
 */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)

  await parseBody(event, enrollCourseSchema)

  return withServiceErrors(async () => {
    const enrollment = await enrollStudent(courseId, session.user.id)

    setResponseStatus(event, 201)

    return enrollment
  })
})
