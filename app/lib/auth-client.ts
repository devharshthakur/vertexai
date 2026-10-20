import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'

/**
 * Browser-side Better Auth client.
 *
 * The base URL is intentionally left unset: Better Auth then resolves it to
 * `/api/auth` on the current origin, which is where the Nitro handler is
 * mounted.
 */
export const authClient = createAuthClient({
  plugins: [adminClient()]
})

export type AuthSession = typeof authClient.$Infer.Session
export type AuthUser = AuthSession['user']
