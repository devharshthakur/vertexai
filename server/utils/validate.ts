import { createError, getRouterParam, type RequestEvent } from 'nuxt/server'
import type { ZodType } from 'zod'

/**
 * Route input validation.
 *
 * Bodies and queries are validated with Nuxt's `readValidatedBody` and
 * `getValidatedQuery`. `readLimitedJsonBody` adds a byte cap for endpoints
 * whose input cost must be bounded before parsing. Routes validate every
 * parameter with a schema from `shared/validation/` before the request reaches
 * a service.
 */

function validationError(issues: readonly unknown[]) {
  return createError({
    status: 400,
    statusText: 'Validation failed',
    message: 'Validation failed',
    data: { issues, message: 'Validation failed' }
  })
}

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

/**
 * Reads JSON while enforcing a byte limit on the stream itself.
 *
 * `Content-Length` is checked when present as an early rejection, but the
 * streamed byte count is authoritative so a missing or false header cannot
 * bypass the cap.
 */
export async function readLimitedJsonBody<T>(event: Pick<RequestEvent, 'req'>, maxBytes: number, schema: ZodType<T>): Promise<T> {
  const request = event.req
  const contentLength = Number(request.headers.get('content-length'))

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw payloadTooLarge()
  }

  let input: unknown

  if (request.body) {
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        size += value.byteLength
        if (size > maxBytes) {
          await reader.cancel().catch(() => undefined)
          throw payloadTooLarge()
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    let text: string
    try {
      const body = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        body.set(chunk, offset)
        offset += chunk.byteLength
      }
      text = new TextDecoder('utf-8', { fatal: true }).decode(body)
    } catch {
      throw invalidJson()
    }

    try {
      input = text ? JSON.parse(text) : undefined
    } catch {
      throw invalidJson()
    }
  }

  const result = schema.safeParse(input)
  if (!result.success) throw validationError(result.error.issues)

  return result.data
}

function payloadTooLarge() {
  return createError({ status: 413, statusText: 'Request body is too large.' })
}

function invalidJson() {
  return createError({ status: 400, statusText: 'Invalid JSON body' })
}
