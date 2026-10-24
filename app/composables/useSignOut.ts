import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

/**
 * Ends the session and returns the visitor to the landing page.
 *
 * The shared state is refreshed before navigating, so the header and the page
 * that asked for the sign-out both see the visitor as signed out.
 */
export function useSignOut() {
  async function signOut() {
    await authClient.signOut()
    await refreshAuthSession()
    await navigateTo('/')
  }

  return { signOut }
}
