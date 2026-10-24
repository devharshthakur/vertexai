import { defineEventHandler } from 'nuxt/server'
import { listCourseCategories } from '#server/services/courses/queries'

/**
 * The categories that published courses use.
 *
 * The catalog filter needs them to offer real choices: the product has no
 * fixed taxonomy, so the list comes from the courses themselves.
 */
export default defineEventHandler(async () => {
  return listCourseCategories()
})
