import { defineEventHandler, readValidatedBody, setResponseStatus } from 'nuxt/server'
import { createCourseQuiz } from '#server/services/quizzes'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { createQuizSchema } from '#shared/validation/quizzes'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await readValidatedBody(event, createQuizSchema)
  return withServiceErrors(async () => {
    const quiz = await createCourseQuiz(courseId, body, { id: session.user.id, role: session.user.role })
    setResponseStatus(event, 201)
    return quiz
  })
})
