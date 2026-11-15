import { defineEventHandler } from 'nuxt/server'
import { listCourseQuizzes } from '#server/services/quizzes'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  return withServiceErrors(() => listCourseQuizzes(courseId, { id: session.user.id, role: session.user.role }))
})
