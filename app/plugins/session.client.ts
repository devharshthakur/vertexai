import { authClient, type AuthSession } from '@/lib/auth-client'

/**
 * Puts the session that was rendered on the server into the client-side
 * session store.
 *
 * Without this the first client render would not know about the session and
 * would disagree with the server-rendered markup.
 */
export default defineNuxtPlugin(() => {
  const session = useState<AuthSession | null>('auth:session')

  if (session.value) {
    authClient.hydrateSession(session.value)
  }
})
