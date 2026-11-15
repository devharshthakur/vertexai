import { defineEventHandler } from 'nuxt/server'
import { getMyBadges } from '#server/services/achievements'
import { requireSession } from '#server/utils/require-session'

/** The full badge catalogue with the signed-in user's earned dates. */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  return getMyBadges(session.user.id)
})
