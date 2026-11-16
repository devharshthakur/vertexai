import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { reorderLectures } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema, moduleIdSchema, reorderLecturesSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const moduleId = parseParam(event, 'moduleId', moduleIdSchema)
  const body = await readValidatedBody(event, reorderLecturesSchema)

  return withServiceErrors(() =>
    reorderLectures(courseId, moduleId, body, {
      id: session.user.id,
      role: session.user.role
    })
  )
})
