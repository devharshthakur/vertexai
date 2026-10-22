import { defineEventHandler } from 'nuxt/server'
import { requireSession } from '#server/utils/require-session'

/**
 * The signed-in user's own profile.
 *
 * Only the fields the UI needs are returned. The session object also carries
 * the session token, so it must never be returned as-is.
 */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const { id, name, email, role } = session.user

  return { user: { id, name, email, role } }
})
