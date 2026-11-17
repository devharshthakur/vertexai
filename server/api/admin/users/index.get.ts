import { defineEventHandler, getValidatedQuery } from 'nuxt/server'
import { listAdminUsers } from '#server/services/admin/users'
import { requireRole } from '#server/utils/require-session'
import { adminUserQuerySchema } from '#shared/validation/admin'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const query = await getValidatedQuery(event, adminUserQuerySchema)

  return listAdminUsers(query)
})
