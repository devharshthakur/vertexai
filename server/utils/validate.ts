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

function parse<T>(value: unknown, schema: Validator<T>) {
  const result = schema.safeParse(value)

  if (!result.success) {
    throw toValidationError(result.error)
  }

  return result.data
}

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
  return parse(await readBody(event), schema)
}

/** Validates the query string of a request. */
export function parseQuery<T>(event: RequestEvent, schema: Validator<T>) {
  return parse(getQuery(event), schema)
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
