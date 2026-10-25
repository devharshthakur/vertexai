import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

export function useSignOut() {
  async function signOut() {
    await authClient.signOut()
    // Refresh before navigating so the next route sees the signed-out state.
    await refreshAuthSession()
    await navigateTo('/')
  }

  return { signOut }
}
