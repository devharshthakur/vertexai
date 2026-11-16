/**
 * Prepares the local environment file.
 *
 * It copies `.env.example` to `.env` when there is none and puts a generated
 * auth secret in place of the placeholder, so a new checkout needs one command
 * before the app can run. An existing `.env` is never overwritten.
 */
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const USAGE = `Usage: pnpm setup

Creates .env from .env.example and fills in a generated BETTER_AUTH_SECRET.
An existing .env is kept as it is.
`

const PLACEHOLDER_SECRET = 'replace-me-with-a-random-32-character-secret'
const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const environmentPath = join(projectRoot, '.env')
const templatePath = join(projectRoot, '.env.example')

function note(message: string): void {
  console.log(`setup: ${message}`)
}

/** Generates a secret with enough entropy for the session signing key. */
function generateSecret(): string {
  return randomBytes(32).toString('base64')
}

/** Replaces the value of a variable in an environment file. */
function setVariable(contents: string, name: string, value: string): string {
  const pattern = new RegExp(`^${name}=.*$`, 'm')

  if (pattern.test(contents)) {
    return contents.replace(pattern, `${name}=${value}`)
  }

  return `${contents.trimEnd()}\n${name}=${value}\n`
}

/** Reads the value of a variable from an environment file. */
function readVariable(contents: string, name: string): string | undefined {
  const match = new RegExp(`^${name}=(.*)$`, 'm').exec(contents)

  return match?.[1]?.trim()
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE)
    return
  }

  if (!existsSync(templatePath)) {
    throw new Error('.env.example is missing. Run this from a project checkout.')
  }

  let contents: string

  if (existsSync(environmentPath)) {
    contents = await readFile(environmentPath, 'utf8')
    note('.env already exists, keeping it.')
  } else {
    contents = await readFile(templatePath, 'utf8')
    note('created .env from .env.example.')
  }

  const secret = readVariable(contents, 'BETTER_AUTH_SECRET')
  if (!secret || secret === PLACEHOLDER_SECRET) {
    contents = setVariable(contents, 'BETTER_AUTH_SECRET', generateSecret())
    await writeFile(environmentPath, contents, 'utf8')
    note('wrote a generated BETTER_AUTH_SECRET into .env.')
  } else {
    note('BETTER_AUTH_SECRET is already set.')
  }

  const databaseUrl = readVariable(contents, 'DATABASE_URL')
  const postgresPort = readVariable(contents, 'POSTGRES_PORT') ?? '5433'

  if (databaseUrl && !databaseUrl.includes(`:${postgresPort}/`)) {
    note(`warning: DATABASE_URL does not use the POSTGRES_PORT ${postgresPort}. The app would not find the database.`)
  }

  if (!readVariable(contents, 'AI_GATEWAY_API_KEY')) {
    note('note: no AI_GATEWAY_API_KEY is set. The AI tutor will show its unavailable state until one is added.')
  }

  note('The environment is ready.')
  console.log(`
Next steps:
  pnpm install
  pnpm db:up          start the database
  pnpm demo:setup     create and seed the demo data
  pnpm dev            http://localhost:5173

Or run the whole stack in Docker:
  docker compose up --build     http://localhost:3000
`)
}

void main().catch((error: unknown) => {
  console.error(`setup: error: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
