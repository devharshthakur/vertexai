import { defineEventHandler } from 'nuxt/server'
import { getLatestCourseReview } from '#server/services/courses/queries'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  return withServiceErrors(() => getLatestCourseReview(courseId, { id: session.user.id, role: session.user.role }))
})
