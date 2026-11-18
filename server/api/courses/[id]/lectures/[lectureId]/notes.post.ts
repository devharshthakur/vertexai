import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { createLectureNote } from '#server/services/courses/learning-tools'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, lectureIdSchema } from '#shared/validation/courses'
import { createLectureNoteSchema } from '#shared/validation/learning'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)
  const input = await readValidatedBody(event, createLectureNoteSchema)
  return withServiceErrors(() => createLectureNote(courseId, lectureId, session.user.id, input))
})
