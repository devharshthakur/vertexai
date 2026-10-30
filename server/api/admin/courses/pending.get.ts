import { defineEventHandler } from 'nuxt/server'
import { listPendingCourses } from '#server/services/courses/queries'
import { requireRole } from '#server/utils/require-session'
import { parseQuery } from '#server/utils/validate'
import { courseQuerySchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const query = parseQuery(event, courseQuerySchema)

  return listPendingCourses(query)
})
