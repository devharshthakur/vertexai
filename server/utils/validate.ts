import { createError, getRouterParam, type RequestEvent } from 'nuxt/server'
import type { ZodType } from 'zod'

/**
 * Route parameter validation.
 *
 * Bodies and queries are validated with Nuxt's `readValidatedBody` and
 * `getValidatedQuery`; this helper covers the one no Nuxt helper validates.
 * Routes validate every parameter with a schema from `shared/validation/`
 * before the request reaches a service.
 */

/** Validates a route parameter against a zod schema, such as a course id. */
export function parseParam<T>(event: RequestEvent, name: string, schema: ZodType<T>): T {
  const result = schema.safeParse(getRouterParam(event, name))

  if (!result.success) {
    throw createError({
      status: 400,
      statusText: 'Invalid parameter.',
      data: { issues: result.error.issues }
    })
  }

  return result.data
}
