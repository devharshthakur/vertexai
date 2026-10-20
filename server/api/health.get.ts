import { sql } from 'drizzle-orm'
import { defineEventHandler } from 'nuxt/server'
import { useDb } from '#server/db'

export default defineEventHandler(async () => {
  await useDb().execute(sql`select 1`)

  return { status: 'ok', database: 'up' }
})
