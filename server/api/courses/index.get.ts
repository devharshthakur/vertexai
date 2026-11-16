import { defineEventHandler, getValidatedQuery } from 'nuxt/server'
import { courseQuerySchema } from '#shared/validation/courses'
import { listPublishedCourses } from '#server/services/courses/queries'

/**
 * The public course catalog.
 *
 * Only approved courses are listed. Filters come from the query string and are
 * validated with the shared schema before the service runs.
 */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, courseQuerySchema)

  return listPublishedCourses(query)
})
