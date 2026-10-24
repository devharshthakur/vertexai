import { defineEventHandler } from 'nuxt/server'
import { auth } from '#server/utils/auth'
import type { AuthProviderId } from '#shared/types/auth'

/**
 * Lists the sign-in methods this deployment supports.
 *
 * The login page uses it to decide whether to render the social sign-in
 * button. It intentionally lives outside `/api/auth/**` so it does not
 * compete with the Better Auth catch-all route.
 *
 * The list is read from the live Better Auth configuration instead of a
 * hand-written one, so it can never drift from the providers that are
 * actually registered.
 */
export default defineEventHandler((): { providers: AuthProviderId[] } => {
  const socialProviders = Object.entries(auth.options.socialProviders ?? {})
    .filter(([, config]) => {
      // A provider may be configured as a function that resolves per request;
      // it cannot be inspected synchronously, so it counts as enabled.
      if (typeof config === 'function') return true
      return config.enabled !== false
    })
    .map(([id]) => id as AuthProviderId)

  return { providers: ['email', ...socialProviders] }
})
