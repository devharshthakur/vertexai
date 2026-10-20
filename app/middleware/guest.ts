import { useAuthSession } from '@/composables/useAuthSession'

/**
 * Keeps signed-in visitors away from the login and sign-up pages.
 */
export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await useAuthSession()

  if (session.value) {
    return navigateTo('/dashboard')
  }
})
