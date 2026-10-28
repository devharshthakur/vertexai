import { useQueryClient } from '@tanstack/vue-query'
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

export function useSignOut() {
  const queryClient = useQueryClient()

  async function signOut() {
    await authClient.signOut()
    // Refresh before navigating so the next route sees the signed-out state.
    await refreshAuthSession()
    // Do not let one account's cached data reach the next one.
    queryClient.clear()
    await navigateTo('/')
  }

  return { signOut }
}
