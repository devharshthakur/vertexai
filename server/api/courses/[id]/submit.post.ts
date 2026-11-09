import { defineEventHandler } from 'nuxt/server'
import { submitCourse } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  await parseBody(event, z.strictObject({}).optional())
  return withServiceErrors(() => submitCourse(courseId, { id: session.user.id, role: session.user.role }))
})
