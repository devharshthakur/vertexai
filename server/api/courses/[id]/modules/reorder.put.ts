import { defineEventHandler } from 'nuxt/server'
import { reorderModules } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import {
  courseIdSchema,
  reorderModulesSchema
} from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await parseBody(event, reorderModulesSchema)

  return withServiceErrors(() =>
    reorderModules(courseId, body, {
      id: session.user.id,
      role: session.user.role
    })
  )
})
