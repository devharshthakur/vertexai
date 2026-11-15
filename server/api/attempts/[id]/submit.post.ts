import { defineEventHandler } from 'nuxt/server'
import { submitQuizAttempt } from '#server/services/quizzes'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { quizAttemptIdSchema, submitQuizAttemptSchema } from '#shared/validation/quizzes'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const attemptId = parseParam(event, 'id', quizAttemptIdSchema)
  const body = await parseBody(event, submitQuizAttemptSchema)
  return withServiceErrors(() => submitQuizAttempt(attemptId, body, { id: session.user.id, role: session.user.role }))
})
