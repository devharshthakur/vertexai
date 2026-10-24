import { defineEventHandler } from 'nuxt/server'
import { listMyEnrollments } from '#server/services/enrollment-service'
import { requireSession } from '#server/utils/require-session'

/**
 * The courses the signed-in student is enrolled in.
 *
 * The dashboard and the course cards read this list; `progressPercent` is the
 * cached value the progress service keeps up to date.
 */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)

  return listMyEnrollments(session.user.id)
})
