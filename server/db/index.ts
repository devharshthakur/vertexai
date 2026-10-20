import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const MAX_POOL_SIZE = 10

type Db = ReturnType<typeof createDb>

function createDb() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('[db] DATABASE_URL is not set. Copy .env.example to .env.')
  }

  const pool = new Pool({ connectionString, max: MAX_POOL_SIZE })

  // An idle client that errors is emitted on the pool itself. Without a
  // listener Node treats it as an unhandled 'error' event and exits.
  pool.on('error', (error) => {
    console.error('[db] idle client error', error)
  })

  return drizzle({ client: pool, schema })
}

/**
 * The pool is cached on `globalThis` so Nitro's dev-server reloads reuse a
 * single connection pool instead of leaking one per reload.
 */
const globalForDb = globalThis as typeof globalThis & { __vertexaiDb?: Db }

/**
 * Returns the shared Drizzle client. The connection is created on first use,
 * so importing this module never requires a database to be reachable.
 */
export function useDb() {
  globalForDb.__vertexaiDb ??= createDb()

  return globalForDb.__vertexaiDb
}

export type { Db }
