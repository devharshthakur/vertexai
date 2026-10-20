import { useAuthSession } from '@/composables/useAuthSession'

/**
 * Protects a page: visitors without a session are sent to the login page and
 * returned to where they were headed afterwards.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await useAuthSession()

  if (!session.value) {
    return navigateTo({ path: '/auth/login', query: { redirect: to.fullPath } })
  }
})
