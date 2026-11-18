import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { defineNitroPlugin } from 'nitropack/runtime'
import { useDb } from '#server/db'
// The demo data lives outside the server directory, so the container can seed
// it with the same code the command line uses.
import { prepareDemoAssets } from '../../demo/assets'
import { hasDemoData, seedDemoData } from '../../demo/seed'

const DATABASE_WAIT_ATTEMPTS = 30
const DATABASE_WAIT_INTERVAL_MS = 2_000

/** Reads an opt-in environment flag. */
function flag(name: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes((process.env[name] ?? '').trim().toLowerCase())
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}

/**
 * The folder holding the committed migrations.
 *
 * `MIGRATIONS_FOLDER` names it explicitly, which is what the container image
 * does. Without it the migrations are read from the checkout.
 */
function resolveMigrationsFolder(): string {
  const configured = process.env.MIGRATIONS_FOLDER?.trim()
  if (configured) return resolve(configured)

  return resolve(process.cwd(), 'server/db/migrations')
}

/** Waits until the database accepts a query, so a starting container does not fail on a database that is still booting. */
async function waitForDatabase(): Promise<void> {
  const db = useDb()

  for (let attempt = 1; attempt <= DATABASE_WAIT_ATTEMPTS; attempt += 1) {
    try {
      await db.execute(sql`select 1`)
      return
    } catch (error) {
      if (attempt === DATABASE_WAIT_ATTEMPTS) {
        throw error
      }

      console.info(`[bootstrap] the database is not ready yet (attempt ${attempt} of ${DATABASE_WAIT_ATTEMPTS}), retrying...`)
      await delay(DATABASE_WAIT_INTERVAL_MS)
    }
  }
}

/**
 * Fails the start when a setting the app cannot work without is missing.
 *
 * A missing secret or connection string otherwise surfaces much later, as a
 * failed sign-in or a failed request, which is harder to trace back.
 */
function requireEnvironment(): void {
  const missing: string[] = []

  if (!process.env.DATABASE_URL?.trim()) {
    missing.push('DATABASE_URL')
  }

  if (!process.env.BETTER_AUTH_SECRET?.trim()) {
    missing.push('BETTER_AUTH_SECRET')
  }

  if (missing.length > 0) {
    throw new Error(`[bootstrap] missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and run "pnpm setup".`)
  }
}

/**
 * Prepares the database before the app serves its first request.
 *
 * A Compose stack has to come up ready to use, so the app can apply the
 * committed migrations and seed the demo courses while it starts. Both steps
 * are opt-in: `DB_AUTO_MIGRATE` applies the migrations, and `DEMO_SEED` seeds
 * the demo courses the first time the stack sees an empty database.
 */
export default defineNitroPlugin(async () => {
  requireEnvironment()

  const autoMigrate = flag('DB_AUTO_MIGRATE')
  const demoSeed = flag('DEMO_SEED')

  if (!autoMigrate && !demoSeed) {
    return
  }

  await waitForDatabase()

  if (autoMigrate) {
    const folder = resolveMigrationsFolder()

    if (!existsSync(folder)) {
      throw new Error(`[bootstrap] the migrations folder ${folder} does not exist.`)
    }

    console.info('[bootstrap] applying the database migrations...')
    await migrate(useDb(), { migrationsFolder: folder })
    console.info('[bootstrap] the database schema is up to date.')
  }

  if (demoSeed) {
    if (await hasDemoData()) {
      console.info('[bootstrap] the demo courses are already in the database, skipping the demo seed.')
      return
    }

    const assets = await prepareDemoAssets()
    console.info(`[bootstrap] prepared the demo assets in ${assets.directory} (${assets.copiedFiles} text files, ${assets.copiedVideos} videos).`)

    console.info('[bootstrap] seeding the demo data...')
    await seedDemoData()
    console.info('[bootstrap] the demo data is ready.')
  }
})
