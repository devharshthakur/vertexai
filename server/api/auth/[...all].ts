import { defineEventHandler } from 'nuxt/server'
import { auth } from '../../utils/auth'

/**
 * Mounts the Better Auth handler on `/api/auth/**`.
 *
 * Nuxt exposes the incoming request as a Web `Request` on the event, which is
 * exactly what Better Auth expects.
 */
export default defineEventHandler((event) => {
  return auth.handler(event.req)
})
