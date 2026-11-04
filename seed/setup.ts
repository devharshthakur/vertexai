import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { validateDemoSeedPassword } from './password'

const COMPOSE_PROJECT = 'vertexai'
const POSTGRES_USER = process.env.POSTGRES_USER ?? 'vertexai'
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD ?? 'vertexai'
const POSTGRES_DB = process.env.POSTGRES_DB ?? 'vertexai'
const POSTGRES_PORT = process.env.POSTGRES_PORT ?? '5433'

function getLocalDatabaseUrl(): string {
  const port = Number(POSTGRES_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('POSTGRES_PORT must be a valid TCP port number.')
  }

  const databaseUrl = new URL('postgresql://127.0.0.1')
  databaseUrl.username = POSTGRES_USER
  databaseUrl.password = POSTGRES_PASSWORD
  databaseUrl.port = String(port)
  databaseUrl.pathname = `/${POSTGRES_DB}`

  return databaseUrl.toString()
}

async function confirmReset(): Promise<boolean> {
  if (!process.stdin.isTTY) {
    throw new Error('demo:setup requires an interactive terminal to confirm the destructive database reset.')
  }

  const readline = createInterface({ input: process.stdin, output: process.stdout })

  try {
    const answer = await readline.question(`This permanently deletes all data in Docker Compose project "${COMPOSE_PROJECT}" and its volumes. Type RESET to continue: `)

    return answer === 'RESET'
  } finally {
    readline.close()
  }
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, args, { stdio: 'inherit', env })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed${result.status === null ? ` (${result.signal ?? 'terminated'})` : ` (exit ${result.status})`}.`)
  }
}

async function setupDemo(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('demo:setup is disabled in production.')
  }

  validateDemoSeedPassword()
  const databaseUrl = getLocalDatabaseUrl()
  if (!(await confirmReset())) {
    console.info('Demo setup cancelled; the database was not changed.')
    return
  }

  const compose = ['compose', '-p', COMPOSE_PROJECT]
  run('docker', [...compose, 'down', '--volumes'])
  run('docker', [...compose, 'up', '-d', '--wait', 'db'])

  const databaseEnv = { ...process.env, DATABASE_URL: databaseUrl }
  run('pnpm', ['db:migrate'], databaseEnv)
  run('pnpm', ['db:seed'], databaseEnv)

  console.info('Demo database recreated, migrated, and seeded successfully.')
}

void setupDemo().catch((error: unknown) => {
  console.error('Demo setup failed:', error)
  process.exitCode = 1
})
