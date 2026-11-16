import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { reviewCourse } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, reviewCourseSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await readValidatedBody(event, reviewCourseSchema)

  return withServiceErrors(() => reviewCourse(courseId, body, session.user.id))
})
