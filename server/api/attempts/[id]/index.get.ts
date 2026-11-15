import { defineEventHandler } from 'nuxt/server'
import { getQuizAttempt } from '#server/services/quizzes'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { quizAttemptIdSchema } from '#shared/validation/quizzes'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const attemptId = parseParam(event, 'id', quizAttemptIdSchema)
  return withServiceErrors(() => getQuizAttempt(attemptId, { id: session.user.id, role: session.user.role }))
})
