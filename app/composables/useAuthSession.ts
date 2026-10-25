import type { Ref } from 'vue'
import { authClient, type AuthSession } from '@/lib/auth-client'

/**
 * The signed-in session, or `null`.
 *
 * On the server the session is read with the incoming cookies and handed to
 * the payload, so the first render already knows who the visitor is. In the
 * browser the live client-side session is used instead: Better Auth keeps it
 * up to date after a sign-in or sign-out, so it never lags behind the cookie.
 */
export async function useAuthSession(): Promise<{
  data: Ref<AuthSession | null>
}> {
  if (import.meta.server) {
    // Both Nuxt composables are called before the first `await`, because the
    // Nuxt context is not available afterwards.
    const state = useState<AuthSession | null>('auth:session', () => null)
    const { data } = await authClient.useSession(useFetch)
    state.value = data.value

    return { data }
  }

  return { data: useAuthSessionState() }
}

/**
 * The session as a ref that can be read synchronously during setup.
 *
 * The server value is filled by `useAuthSession()`, which the `session.global`
 * middleware awaits before any page setup. In the browser the live Better Auth
 * store is read instead; the session plugin hydrates it from the payload.
 *
 * Read the session through this ref when a Nuxt data fetch depends on it:
 * `useFetch` and `useAsyncData` must be registered before the first `await`,
 * otherwise Nuxt reports NUXT_E3003 and cannot wait for the request.
 */
export function useAuthSessionState(): Ref<AuthSession | null> {
  if (import.meta.server) {
    return useState<AuthSession | null>('auth:session', () => null)
  }

  const state = authClient.useSession()

  return computed(() => state.value.data)
}

/**
 * Refreshes the client-side session.
 *
 * Better Auth refreshes it a moment after a sign-in, but the navigation that
 * follows a sign-in would otherwise run against the previous value.
 */
export async function refreshAuthSession() {
  if (import.meta.server) return

  await authClient.useSession().value.refetch()
}
