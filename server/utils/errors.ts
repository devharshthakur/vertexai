import { createError } from 'nuxt/server'
import { ServiceError } from './service-error'

/**
 * Maps a domain error to an HTTP error.
 *
 * Unknown errors are passed through unchanged so that Nitro's error handler
 * turns them into a generic 500 without leaking internals.
 */
export function toHttpError(error: unknown): unknown {
  if (error instanceof ServiceError) {
    const status =
      error.code === 'invalid_input' ? 400
      : error.code === 'forbidden' ? 403
      : error.code === 'conflict' ? 409
      : error.code === 'unavailable' ? 503
      : error.code === 'rate_limited' ? 429
      : 404

    return createError({
      status,
      statusText:
        error.code === 'invalid_input' ? 'Bad Request'
        : error.code === 'forbidden' ? 'Forbidden'
        : error.code === 'conflict' ? 'Conflict'
        : error.code === 'unavailable' ? 'Service Unavailable'
        : error.code === 'rate_limited' ? 'Too Many Requests'
        : 'Not Found'
    })
  }

  return error
}

/** Translates service errors raised by an async route operation. */
export async function withServiceErrors<T>(operation: () => Promise<T>) {
  try {
    return await operation()
  } catch (error) {
    throw toHttpError(error)
  }
}
