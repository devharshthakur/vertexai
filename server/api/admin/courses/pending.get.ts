import { defineEventHandler, getValidatedQuery } from 'nuxt/server'
import { listPendingCourses } from '#server/services/courses/queries'
import { requireRole } from '#server/utils/require-session'
import { courseQuerySchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const query = await getValidatedQuery(event, courseQuerySchema)

  return listPendingCourses(query)
})
