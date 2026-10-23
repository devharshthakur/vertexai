import { sql } from 'drizzle-orm'
import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { useDb } from '#server/db'

/**
 * Reports whether the database is reachable.
 *
 * A failed probe is a degraded dependency state, not a broken handler, so it is
 * reported as a structured 503 instead of escaping as a generic 500.
 */
export default defineEventHandler(async (event) => {
  try {
    await useDb().execute(sql`select 1`)
  } catch (error) {
    console.error('[health] database probe failed', error)
    setResponseStatus(event, 503, 'Service Unavailable')

    return { status: 'error', database: 'down' } as const
  }

  return { status: 'ok', database: 'up' } as const
})
