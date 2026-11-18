import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const MAX_POOL_SIZE = 10

type Db = ReturnType<typeof createDb>

function createPool(max: number) {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('[db] DATABASE_URL is not set. Copy .env.example to .env.')
  }

  const pool = new Pool({ connectionString, max })

  // An idle client that errors is emitted on the pool itself. Without a
  // listener Node treats it as an unhandled 'error' event and exits.
  pool.on('error', (error) => {
    console.error('[db] idle client error', error)
  })

  return pool
}

function createDb() {
  return drizzle({ client: usePool(), schema })
}

const globalForDb = globalThis as typeof globalThis & { __vertexaiDb?: Db; __vertexaiPool?: Pool; __vertexaiAiLockPool?: Pool }

/**
 * The pools are cached on `globalThis` so Nuxt's dev-server reloads reuse
 * shared connections instead of leaking a new pool on each reload.
 */
function usePool() {
  globalForDb.__vertexaiPool ??= createPool(MAX_POOL_SIZE)
  return globalForDb.__vertexaiPool
}

/**
 * Chat advisory locks use their own bounded pool so long-lived streams cannot
 * occupy every connection used by application queries.
 */
export function useAiChatLockPool() {
  globalForDb.__vertexaiAiLockPool ??= createPool(4)
  return globalForDb.__vertexaiAiLockPool
}

/**
 * Returns the shared Drizzle client. The connection is created on first use,
 * so importing this module never requires a database to be reachable.
 */
export function useDb() {
  globalForDb.__vertexaiDb ??= createDb()

  return globalForDb.__vertexaiDb
}

export type { Db }
