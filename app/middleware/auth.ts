import { useAuthSessionState } from '@/composables/useAuthSession'

/** Protected routes require a session; `redirect` restores the original path after sign-in. */
export default defineNuxtRouteMiddleware((to) => {
  const session = useAuthSessionState()

  if (!session.value) {
    return navigateTo({ path: '/auth/login', query: { redirect: to.fullPath } })
  }
})
