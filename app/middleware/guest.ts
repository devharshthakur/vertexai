import { useAuthSessionState } from '@/composables/useAuthSession'

/** Signed-in visitors have no reason to see the login or sign-up pages. */
export default defineNuxtRouteMiddleware(() => {
  const session = useAuthSessionState()

  if (session.value) {
    return navigateTo('/dashboard')
  }
})
