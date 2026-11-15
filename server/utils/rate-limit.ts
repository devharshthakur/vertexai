import { ServiceError } from './service-error'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 20
const buckets = new Map<string, { count: number; resetAt: number }>()

/**
 * Fixed-window limit for AI generation: 20 requests per user per minute.
 *
 * The counter lives in this process, which is enough for the single-instance
 * local deployment. A multi-instance deployment must move the bucket to shared
 * storage (for example Redis); otherwise each instance allows its own 20.
 */
export function enforceAiRateLimit(userId: string): void {
  const now = Date.now()

  if (buckets.size > 1000) {
    for (const [key, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(key)
    }
  }

  const bucket = buckets.get(userId)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  if (bucket.count >= MAX_REQUESTS) {
    throw new ServiceError('rate_limited', 'Too many AI requests. Try again shortly.')
  }

  bucket.count += 1
}
