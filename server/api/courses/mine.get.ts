import { defineEventHandler } from 'nuxt/server'
import { courseQuerySchema } from '#shared/validation/courses'
import { listInstructorCourses } from '#server/services/courses/queries'
import { requireRole } from '#server/utils/require-session'
import { parseQuery } from '#server/utils/validate'

/**
 * The courses the signed-in instructor owns, in any publication state.
 *
 * Pending courses are invisible in the public catalog, so the course builder
 * needs this list to find them again.
 */
export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const query = parseQuery(event, courseQuerySchema)

  return listInstructorCourses(query, session.user.id)
})
