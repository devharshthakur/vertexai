import { defineEventHandler } from 'nuxt/server'
import { generateQuizDraft } from '#server/services/ai/quiz-draft'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, lectureIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)

  return withServiceErrors(() => generateQuizDraft(courseId, lectureId, { id: session.user.id, role: session.user.role }))
})
