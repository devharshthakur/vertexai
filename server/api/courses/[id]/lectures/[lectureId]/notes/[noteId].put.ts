import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { updateLectureNote } from '#server/services/courses/learning-tools'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, lectureIdSchema } from '#shared/validation/courses'
import { learningNoteIdSchema, updateLectureNoteSchema } from '#shared/validation/learning'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)
  const noteId = parseParam(event, 'noteId', learningNoteIdSchema)
  const input = await readValidatedBody(event, updateLectureNoteSchema)
  return withServiceErrors(() => updateLectureNote(courseId, lectureId, noteId, session.user.id, input))
})
