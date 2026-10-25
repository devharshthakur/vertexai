import { useAuthSession } from '@/composables/useAuthSession'

/**
 * Initializes the session before named middleware, pages, and layouts read it.
 * Those consumers rely on this ordering to register their data fetches during setup.
 */
export default defineNuxtRouteMiddleware(async () => {
  await useAuthSession()
})
