import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { changeUserRole, type AdminActor } from '#server/services/admin/users'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { adminUserIdSchema, adminUserRoleSchema } from '#shared/validation/admin'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const userId = parseParam(event, 'id', adminUserIdSchema)
  const body = await readValidatedBody(event, adminUserRoleSchema)
  const actor: AdminActor = { id: session.user.id, headers: event.req.headers }

  return withServiceErrors(() => changeUserRole(userId, body.role, actor))
})
