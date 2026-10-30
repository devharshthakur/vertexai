import { spawnSync } from 'node:child_process'

// Deletes the local Postgres container and its volume, starts a fresh one,
// then applies migrations. All local database data is lost.
const commands = [
  ['docker', 'compose', 'down', '--volumes'],
  ['docker', 'compose', 'up', '-d', '--wait', 'db'],
  ['pnpm', 'db:migrate']
] as const

for (const [command, ...args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.status !== 0) {
    console.error(`db:setup: ${command} ${args.join(' ')} failed`)
    process.exit(1)
  }
}
