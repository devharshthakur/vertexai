import { lt, or, sql } from 'drizzle-orm'
import { useDb } from '#server/db'
import { aiRateLimits } from '#server/db/schema'
import { ServiceError } from './service-error'

const WINDOW_SECONDS = 60
const MAX_REQUESTS = 20
const windowCutoff = sql`now() - make_interval(secs => ${WINDOW_SECONDS})`

/**
 * Fixed-window limit for AI generation: 20 requests per user per minute.
 */
export async function enforceAiRateLimit(userId: string): Promise<void> {
  const [bucket] = await useDb()
    .insert(aiRateLimits)
    .values({ userId, windowStartedAt: sql`now()`, count: 1 })
    .onConflictDoUpdate({
      target: aiRateLimits.userId,
      set: {
        windowStartedAt: sql`case when ${aiRateLimits.windowStartedAt} <= ${windowCutoff} then now() else ${aiRateLimits.windowStartedAt} end`,
        count: sql`case when ${aiRateLimits.windowStartedAt} <= ${windowCutoff} then 1 else ${aiRateLimits.count} + 1 end`
      },
      setWhere: or(sql`${aiRateLimits.windowStartedAt} <= ${windowCutoff}`, lt(aiRateLimits.count, MAX_REQUESTS))
    })
    .returning({ count: aiRateLimits.count })

  if (!bucket) throw new ServiceError('rate_limited', 'Too many AI requests. Try again shortly.')
}
