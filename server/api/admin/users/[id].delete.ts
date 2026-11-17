import { defineEventHandler } from 'nuxt/server'
import { deleteUser, type AdminActor } from '#server/services/admin/users'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { adminUserIdSchema } from '#shared/validation/admin'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const userId = parseParam(event, 'id', adminUserIdSchema)
  const actor: AdminActor = { id: session.user.id, headers: event.req.headers }

  return withServiceErrors(() => deleteUser(userId, actor))
})
