import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'

/** Leave `baseURL` unset so Better Auth uses `/api/auth` on the current origin. */
export const authClient = createAuthClient({
  plugins: [adminClient()]
})

export type AuthSession = typeof authClient.$Infer.Session
export type AuthUser = AuthSession['user']
