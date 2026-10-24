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
    return createError({
      statusCode: error.code === 'forbidden' ? 403 : 404,
      statusMessage: error.code === 'forbidden' ? 'Forbidden' : 'Not Found'
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
