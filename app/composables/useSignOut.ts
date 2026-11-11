import { useQueryClient } from '@tanstack/vue-query'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import { refreshAuthSession } from '@/composables/useAuthSession'
import { authClient } from '@/lib/auth-client'

export function useSignOut() {
  const queryClient = useQueryClient()

  async function signOut() {
    // Navigate before clearing the session so page guards can still cancel
    // sign-out when the user keeps unsaved changes.
    const navigationResult = await navigateTo('/')
    if (isNavigationFailure(navigationResult, NavigationFailureType.aborted)) return

    await authClient.signOut()
    // Refresh after navigating so the session store reflects the sign-out.
    await refreshAuthSession()
    // Do not let one account's cached data reach the next one.
    queryClient.clear()
  }

  return { signOut }
}
