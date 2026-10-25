import { authClient, type AuthSession } from '@/lib/auth-client'

/** Seed Better Auth's client store so the first browser render matches the server. */
export default defineNuxtPlugin(() => {
  const session = useState<AuthSession | null>('auth:session')

  if (session.value) {
    authClient.hydrateSession(session.value)
  }
})
