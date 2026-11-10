import { defineEventHandler } from 'nuxt/server'
import { listLectureNotes } from '#server/services/learning-tools-service'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, lectureIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)
  return withServiceErrors(() => listLectureNotes(courseId, lectureId, session.user.id))
})
