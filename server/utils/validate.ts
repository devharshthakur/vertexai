import {
  createError,
  getQuery,
  getRouterParam,
  readBody,
  type RequestEvent
} from 'nuxt/server'
import type { ZodType } from 'zod'

/**
 * Request validation helpers.
 *
 * Routes validate every body and query with a schema from `shared/validation/`
 * — the same schema the client form uses — before the request reaches a
 * service.
 */

type Validator<T> = ZodType<T>

/** Turns a Zod failure into a 400 with the field issues attached. */
function toValidationError(error: { issues: unknown }) {
  return createError({
    statusCode: 400,
    statusMessage: 'Validation failed',
    data: { issues: error.issues }
  })
}

/** Validates the JSON body of a request. */
export async function parseBody<T>(event: RequestEvent, schema: Validator<T>) {
  const body = await readBody(event)
  const result = schema.safeParse(body)

  if (!result.success) {
    throw toValidationError(result.error)
  }

  return result.data
}

/** Validates the query string of a request. */
export function parseQuery<T>(event: RequestEvent, schema: Validator<T>) {
  const result = schema.safeParse(getQuery(event))

  if (!result.success) {
    throw toValidationError(result.error)
  }

  return result.data
}

/** Validates a route parameter, such as a course id. */
export function parseParam<T>(
  event: RequestEvent,
  name: string,
  schema: Validator<T>
): T {
  const result = schema.safeParse(getRouterParam(event, name))

  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid parameter.' })
  }

  return result.data
}
