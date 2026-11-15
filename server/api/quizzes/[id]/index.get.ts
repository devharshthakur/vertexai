import { defineEventHandler } from 'nuxt/server'
import { getQuizForStudent } from '#server/services/quizzes'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { quizIdSchema } from '#shared/validation/quizzes'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const quizId = parseParam(event, 'id', quizIdSchema)
  return withServiceErrors(() => getQuizForStudent(quizId, { id: session.user.id, role: session.user.role }))
})
