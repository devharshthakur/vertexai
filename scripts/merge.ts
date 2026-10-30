/**
 * Fast-forwards the current feature branch into main - no merge commit, no
 * rewrite, no push. Run it from the feature branch; you end up on main.
 */
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const USAGE = `Usage: pnpm merge [options]

Fast-forward the current branch into the target branch (default: main) and
leave you on it. No merge commit, no rewrite of the feature branch, no push.

  -t, --target <branch>  target branch (default: $MAIN_BRANCH, else main)
  -n, --dry-run          check and report, change nothing
  -h, --help             show this help
`

let feature = ''
let onTarget = false

function die(message: string): never {
  console.error(`merge: error: ${message}`)
  process.exit(1)
}

function note(message: string): void {
  console.log(`merge: ${message}`)
}

// Runs git, capturing its output; `ok` is true when it exits 0.
function git(...args: string[]) {
  const { status, stdout } = spawnSync('git', args, { encoding: 'utf8' })
  return { ok: status === 0, out: stdout.trim() }
}

// Bailing out mid-merge must not leave the checkout on the target branch.
function backToFeature(): void {
  if (!onTarget) return
  onTarget = false
  if (!git('switch', '--quiet', feature).ok) {
    console.error(`merge: warning: could not switch back to '${feature}'`)
  }
}

process.on('exit', backToFeature)
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

function parseOptions() {
  try {
    return parseArgs({
      args: process.argv.slice(2),
      options: {
        target: { type: 'string', short: 't' },
        'dry-run': { type: 'boolean', short: 'n' },
        help: { type: 'boolean', short: 'h' }
      },
      allowPositionals: false
    }).values
  } catch (error) {
    die(`${(error as Error).message} (try --help)`)
  }
}

const { target: flag, help, 'dry-run': dryRun } = parseOptions()

if (help) {
  console.log(USAGE)
  process.exit(0)
}

if (flag === '') die('--target requires a branch name')

const target = flag || process.env.MAIN_BRANCH || 'main'

// Preconditions

if (!git('--version').ok) die('git is not installed')
if (!git('rev-parse', '--git-dir').ok) die('not inside a git repository')

const head = git('symbolic-ref', '--quiet', '--short', 'HEAD')

if (!head.ok) {
  die('HEAD is detached; check out the feature branch before running this')
}

feature = head.out

if (feature === target) {
  die(`already on '${target}'; run this from the feature branch`)
}

if (!git('show-ref', '--verify', '--quiet', `refs/heads/${target}`).ok) {
  die(`local branch '${target}' does not exist`)
}

if (!git('diff', '--quiet').ok || !git('diff', '--cached', '--quiet').ok) {
  die('working tree has uncommitted changes; commit or stash them first')
}

if (!git('merge-base', '--is-ancestor', target, feature).ok) {
  die(
    `'${target}' has commits that '${feature}' does not; rebase onto '${target}' first`
  )
}

if (git('merge-base', '--is-ancestor', feature, target).ok) {
  const short = git('rev-parse', '--short', feature).out
  note(`'${target}' already contains '${feature}' (${short}); nothing to do`)
  process.exit(0)
}

const from = git('rev-parse', '--short', target).out
const to = git('rev-parse', '--short', feature).out

if (dryRun) {
  note(
    `dry run: '${target}' would fast-forward ${from} -> ${to} ('${feature}') and leave you on '${target}'; no merge commit, no push`
  )
  process.exit(0)
}

// Fast-forward

note(`fast-forwarding '${target}' ${from} -> ${to}`)

if (!git('switch', '--quiet', target).ok) die(`could not switch to '${target}'`)
onTarget = true

if (!git('merge', '--ff-only', '--quiet', feature).ok) {
  die(`fast-forward refused; '${target}' and '${feature}' are unchanged`)
}

onTarget = false
note(`'${target}' now points at ${to} ('${feature}'); no merge commit created`)
note(`on '${target}'. To publish: git push origin ${target}`)
