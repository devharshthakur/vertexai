import { defineEventHandler } from 'nuxt/server'
import { updateLectureProgress } from '#server/services/progress-service'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { progressUpdateSchema } from '#shared/validation/progress'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', courseIdSchema)
  const input = await parseBody(event, progressUpdateSchema)
  await withServiceErrors(() => updateLectureProgress(courseId, lectureId, session.user.id, input))
  return { ok: true }
})
