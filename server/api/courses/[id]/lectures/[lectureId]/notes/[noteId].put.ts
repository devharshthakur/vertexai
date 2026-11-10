import { defineEventHandler } from 'nuxt/server'
import { updateLectureNote } from '#server/services/learning-tools-service'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { courseIdSchema, lectureIdSchema } from '#shared/validation/courses'
import { learningNoteIdSchema, updateLectureNoteSchema } from '#shared/validation/learning'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)
  const noteId = parseParam(event, 'noteId', learningNoteIdSchema)
  const input = await parseBody(event, updateLectureNoteSchema)
  return withServiceErrors(() => updateLectureNote(courseId, lectureId, noteId, session.user.id, input))
})
