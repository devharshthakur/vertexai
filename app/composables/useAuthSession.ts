import type { Ref } from 'vue'
import { authClient, type AuthSession } from '@/lib/auth-client'

/**
 * Initializes the session for the current request.
 *
 * Server-side, this reads the incoming cookies so the session is available to
 * the first render. In the browser, `useAuthSessionState` reads Better Auth's
 * live store instead. Call this once from global middleware.
 */
export async function useAuthSession(): Promise<{
  data: Ref<AuthSession | null>
}> {
  if (import.meta.server) {
    // Acquire Nuxt context before awaiting.
    const state = useState<AuthSession | null>('auth:session', () => null)
    const { data } = await authClient.useSession(useFetch)
    state.value = data.value

    return { data }
  }

  return { data: useAuthSessionState() }
}

/**
 * Reads the session synchronously during setup.
 *
 * Global middleware initializes server state before this is called. On the
 * client it tracks Better Auth's store, which the session plugin hydrates from
 * the server payload.
 */
export function useAuthSessionState(): Ref<AuthSession | null> {
  if (import.meta.server) {
    return useState<AuthSession | null>('auth:session', () => null)
  }

  const state = authClient.useSession()

  return computed(() => state.value.data)
}

/**
 * Synchronizes the client session before navigation that depends on it.
 * Better Auth updates its store asynchronously after sign-in.
 */
export async function refreshAuthSession() {
  if (import.meta.server) return

  await authClient.useSession().value.refetch()
}
