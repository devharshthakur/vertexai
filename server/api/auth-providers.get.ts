import { defineEventHandler } from 'nuxt/server'
import { enabledAuthProviders } from '#server/utils/auth-providers'

/**
 * Lists the sign-in methods this deployment supports.
 *
 * The login page uses it to decide whether to render the social sign-in
 * button. It intentionally lives outside `/api/auth/**` so it does not
 * compete with the Better Auth catch-all route.
 */
export default defineEventHandler(() => {
  return { providers: enabledAuthProviders }
})
