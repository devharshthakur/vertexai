import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { updateLecture } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, lectureIdSchema, moduleIdSchema, updateLectureSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const moduleId = parseParam(event, 'moduleId', moduleIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)
  const body = await readValidatedBody(event, updateLectureSchema)

  return withServiceErrors(() =>
    updateLecture(courseId, moduleId, lectureId, body, {
      id: session.user.id,
      role: session.user.role
    })
  )
})
