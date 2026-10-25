import { useAuthSession } from '@/composables/useAuthSession'

/**
 * Resolves the session before any page setup runs.
 *
 * Some composables read the session synchronously so their `useFetch` registers
 * during setup; the server value is only in place once `useAuthSession()` has
 * finished. Awaiting it here makes that ordering explicit instead of relying on
 * component render order.
 */
export default defineNuxtRouteMiddleware(async () => {
  await useAuthSession()
})
