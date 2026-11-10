import { defineEventHandler } from 'nuxt/server'
import { deleteLectureBookmark } from '#server/services/learning-tools-service'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, lectureIdSchema } from '#shared/validation/courses'
import { learningBookmarkIdSchema } from '#shared/validation/learning'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)
  const bookmarkId = parseParam(event, 'bookmarkId', learningBookmarkIdSchema)
  await withServiceErrors(() => deleteLectureBookmark(courseId, lectureId, bookmarkId, session.user.id))
  return { ok: true }
})
