/**
 * Bumps every direct dependency to its latest version, validates the result,
 * and commits the manifest and lockfile changes on the current branch - no
 * push, no branch switch. Dependencies listed under `update.ignoreDeps` in
 * pnpm-workspace.yaml (currently typescript and @types/node) keep their pins.
 */
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const USAGE = `Usage: pnpm deps:update [options]

Runs \`pnpm update --latest\`, checks the result with \`pnpm validate\`, then
commits package.json, pnpm-lock.yaml and pnpm-workspace.yaml as
"chore: bump deps" on the current branch. Nothing is pushed.

A failed update or validation leaves the changes in your working tree and
commits nothing, so a broken bump never lands on its own.

  -h, --help  show this help
`

// Manifests and lockfile that a dependency bump is allowed to touch.
const DEP_FILES = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']
const COMMIT_MESSAGE = 'chore: bump deps'
// `update.ignoreDeps` only exists from pnpm 11.15; older versions ignore it.
const MIN_PNPM: readonly [number, number] = [11, 15]

function die(message: string): never {
  console.error(`deps:update: error: ${message}`)
  process.exit(1)
}

function note(message: string): void {
  console.log(`deps:update: ${message}`)
}

// Runs git, capturing its output; `ok` is true when it exits 0.
function git(...args: string[]) {
  const { status, stdout } = spawnSync('git', args, { encoding: 'utf8' })
  return { ok: status === 0, out: stdout.trim() }
}

// Runs a command with the user's terminal attached; `ok` is true on exit 0.
function run(command: string, args: string[]) {
  const { status, error } = spawnSync(command, args, { stdio: 'inherit' })
  if (error) die(`could not run '${command}': ${error.message}`)
  return { ok: status === 0 }
}

function parseOptions() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: { help: { type: 'boolean', short: 'h' } },
      allowPositionals: false
    }).values
  } catch (error) {
    die(`${(error as Error).message} (try --help)`)
  }
}

const { help } = parseOptions()

if (help) {
  console.log(USAGE)
  process.exit(0)
}

// Preconditions

if (!git('--version').ok) die('git is not installed')
if (!git('rev-parse', '--git-dir').ok) die('not inside a git repository')

const branch = git('symbolic-ref', '--quiet', '--short', 'HEAD')

if (!branch.ok) {
  die('HEAD is detached; check out a branch before running this')
}

const dirty = git('status', '--porcelain', '--', ...DEP_FILES)

if (dirty.out !== '') {
  die(`uncommitted changes in ${DEP_FILES.join(', ')}; commit or stash them first`)
}

const version = spawnSync('pnpm', ['--version'], { encoding: 'utf8' })

if (version.error) die(`pnpm is not installed: ${version.error.message}`)

if (version.status === 0) {
  const [major = NaN, minor = NaN] = version.stdout.trim().split('.').map(Number)

  if (major < MIN_PNPM[0] || (major === MIN_PNPM[0] && minor < MIN_PNPM[1])) {
    note(`warning: pnpm ${version.stdout.trim()} ignores update.ignoreDeps (needs ${MIN_PNPM.join('.')}+); typescript and @types/node may move too`)
  }
}

// Update

note(`updating dependencies on '${branch.out}'`)

if (!run('pnpm', ['update', '--latest']).ok) {
  die('pnpm update --latest failed; nothing was committed')
}

if (git('status', '--porcelain', '--', ...DEP_FILES).out === '') {
  note('dependencies are already at their latest versions; nothing to commit')
  process.exit(0)
}

// Validate

note('validating the bumped dependencies')

if (!run('pnpm', ['validate']).ok) {
  die('validation failed; the dependency changes are still in your working tree and were not committed')
}

// Stage and commit only the dependency files, leaving other work untouched.

if (!git('add', '--', ...DEP_FILES).ok) {
  die('could not stage the dependency files')
}

const commit = git('commit', '-m', COMMIT_MESSAGE, '--', ...DEP_FILES)

if (!commit.ok) die('git commit failed; the changes are staged but not committed')

const short = git('rev-parse', '--short', 'HEAD').out
note(`committed ${short} "${COMMIT_MESSAGE}" on '${branch.out}'; nothing was pushed`)
