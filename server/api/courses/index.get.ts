import { defineEventHandler } from 'nuxt/server'
import { courseQuerySchema } from '#shared/validation/courses'
import { listPublishedCourses } from '#server/services/course-service'
import { parseQuery } from '#server/utils/validate'

/**
 * The public course catalog.
 *
 * Only approved courses are listed. Filters come from the query string and are
 * validated with the shared schema before the service runs.
 */
export default defineEventHandler(async (event) => {
  const query = parseQuery(event, courseQuerySchema)

  return listPublishedCourses(query)
})
