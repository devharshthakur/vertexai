import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { courseIdSchema, updateCourseSchema } from '#shared/validation/courses'
import { updateCourse } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'

/**
 * Updates the metadata of a course.
 *
 * Only the instructor who owns the course, or an admin, may change it. The
 * publication status is not part of the payload — the admin approval endpoint
 * is the only way to publish a course.
 */
export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await readValidatedBody(event, updateCourseSchema)

  return withServiceErrors(async () => {
    return await updateCourse(courseId, body, {
      id: session.user.id,
      role: session.user.role
    })
  })
})
