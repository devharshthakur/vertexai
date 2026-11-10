import { APP_ROLES } from '#shared/types/auth'
import { useAuthSessionState } from '@/composables/useAuthSession'

export default defineNuxtRouteMiddleware(() => {
  const session = useAuthSessionState()

  if (session.value && session.value.user.role !== APP_ROLES.STUDENT) {
    return navigateTo('/instructor')
  }
})
