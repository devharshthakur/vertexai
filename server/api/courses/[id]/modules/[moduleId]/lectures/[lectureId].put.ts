import { defineEventHandler } from 'nuxt/server'
import { updateLecture } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { courseIdSchema, updateLectureSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const moduleId = parseParam(event, 'moduleId', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', courseIdSchema)
  const body = await parseBody(event, updateLectureSchema)

  return withServiceErrors(() =>
    updateLecture(courseId, moduleId, lectureId, body, {
      id: session.user.id,
      role: session.user.role
    })
  )
})
