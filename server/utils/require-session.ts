import { createError, type RequestEvent } from 'nuxt/server'
import { auth } from '#server/utils/auth'
import type { AppRole } from '#shared/types/auth'

/**
 * Server-side session guard.
 *
 * Client route middleware (`app/middleware/auth.ts`) never runs for API
 * requests, so every protected server route opts in explicitly by calling one
 * of these helpers. The guard is per-route on purpose: a global Nitro
 * middleware would also run on `/api/auth/**` and break the Better Auth
 * handler, and would turn intentionally public routes private.
 */
export async function requireSession(event: RequestEvent) {
  const session = await auth.api.getSession({ headers: event.req.headers })

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return session
}

/**
 * The session when there is one, `null` otherwise.
 *
 * Public routes use this to answer differently for signed-in users (an
 * instructor seeing their own pending course) without turning them private.
 */
export async function optionalSession(event: RequestEvent) {
  return auth.api.getSession({ headers: event.req.headers })
}

/**
 * Session guard plus a role check. Use it for routes that are not available to
 * every signed-in user; `requireSession` alone is enough for routes that are.
 */
export async function requireRole(event: RequestEvent, ...roles: AppRole[]) {
  const session = await requireSession(event)
  const role = session.user.role

  if (!role || !roles.includes(role as AppRole)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return session
}
