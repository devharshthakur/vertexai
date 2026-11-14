import { defineEventHandler } from 'nuxt/server'
import { listAssignmentSubmissions } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { assignmentIdSchema } from '#shared/validation/assignments'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const assignmentId = parseParam(event, 'id', assignmentIdSchema)
  return withServiceErrors(() => listAssignmentSubmissions(assignmentId, { id: session.user.id, role: session.user.role }))
})
