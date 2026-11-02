import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { addLecture } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { courseIdSchema, createLectureSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const moduleId = parseParam(event, 'moduleId', courseIdSchema)
  const body = await parseBody(event, createLectureSchema)

  return withServiceErrors(async () => {
    const lecture = await addLecture(courseId, moduleId, body, {
      id: session.user.id,
      role: session.user.role
    })

    setResponseStatus(event, 201)

    return lecture
  })
})
