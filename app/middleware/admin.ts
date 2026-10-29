import { APP_ROLES } from '#shared/types/auth'
import { useAuthSessionState } from '@/composables/useAuthSession'

export default defineNuxtRouteMiddleware((to) => {
  const session = useAuthSessionState()

  if (!session.value) {
    return navigateTo({ path: '/auth/login', query: { redirect: to.fullPath } })
  }

  if (session.value.user.role !== APP_ROLES.ADMIN) {
    return navigateTo('/dashboard')
  }
})
