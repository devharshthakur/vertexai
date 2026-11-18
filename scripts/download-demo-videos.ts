/**
 * Downloads the demo lecture videos from the GitHub release into
 * `public/videos/<slug>/`.
 *
 * The videos are too large for Git, so they live in a release archive. This
 * script fetches that archive, verifies its checksum, and copies the video
 * files into the demo folders. The transcripts and course descriptions in the
 * repository are kept as they are.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const USAGE = `Usage: pnpm demo:assets [options]

Downloads the demo lecture videos into public/videos/<slug>/.

  -f, --force  download again even when the videos are already there
  -h, --help   show this help
`

const RELEASE_TAG = 'demo-videos-v1'
const ARCHIVE_NAME = 'vertexai-demo-videos-v1.zip'
const RELEASE_BASE = `https://github.com/devharshthakur/vertexai/releases/download/${RELEASE_TAG}`
const ARCHIVE_URL = `${RELEASE_BASE}/${ARCHIVE_NAME}`
const CHECKSUM_URL = `${ARCHIVE_URL}.sha256`

const demoVideosDirectory = fileURLToPath(new URL('../public/videos/', import.meta.url))
const DEMO_SLUGS = ['typescript', 'react', 'tailwind']

function die(message: string): never {
  console.error(`demo:assets: error: ${message}`)
  process.exit(1)
}

function note(message: string): void {
  console.log(`demo:assets: ${message}`)
}

/** Lists the `.mp4` files in a folder, ignoring hidden files. */
async function listVideos(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })

    return entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.') && entry.name.toLowerCase().endsWith('.mp4')).map((entry) => entry.name)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

/** Downloads a URL to a file and returns the path it was written to. */
async function download(url: string, destination: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' })

  if (!response.ok || !response.body) {
    throw new Error(`${url} responded with ${response.status} ${response.statusText}`)
  }

  await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(destination))
}

/** Returns the SHA-256 digest of a file, read in chunks. */
async function sha256(path: string): Promise<string> {
  const hash = createHash('sha256')
  hash.update(await readFile(path))

  return hash.digest('hex')
}

async function main(): Promise<void> {
  let force = false

  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        force: { type: 'boolean', short: 'f' },
        help: { type: 'boolean', short: 'h' }
      },
      allowPositionals: false
    })

    if (values.help) {
      console.log(USAGE)
      return
    }

    force = values.force ?? false
  } catch (error) {
    die(`${(error as Error).message} (try --help)`)
  }

  const missing: string[] = []
  for (const slug of DEMO_SLUGS) {
    const videos = await listVideos(join(demoVideosDirectory, slug))
    if (videos.length === 0) missing.push(slug)
  }

  if (missing.length === 0 && !force) {
    note('every demo video is already in place (use --force to download again)')
    return
  }

  if (spawnSync('unzip', ['-v'], { stdio: 'ignore' }).status !== 0) {
    die('the "unzip" command is required to extract the release archive')
  }

  const workspace = await mkdtemp(join(tmpdir(), 'vertexai-demo-assets-'))
  const archivePath = join(workspace, ARCHIVE_NAME)
  const extractDirectory = join(workspace, 'extracted')

  try {
    note(`downloading ${ARCHIVE_URL} (about 630 MB)`)
    await download(ARCHIVE_URL, archivePath)

    const expected = (await (await fetch(CHECKSUM_URL)).text()).trim().split(/\s+/)[0]?.toLowerCase()
    if (!expected) die(`could not read the expected checksum from ${CHECKSUM_URL}`)

    const actual = await sha256(archivePath)
    if (actual !== expected) {
      die(`checksum mismatch for ${ARCHIVE_NAME}\n  expected ${expected}\n  actual   ${actual}\nThe download is incomplete or the archive was replaced.`)
    }

    note('checksum verified, extracting')
    await mkdir(extractDirectory, { recursive: true })
    const unzip = spawnSync('unzip', ['-q', archivePath, '-d', extractDirectory], { stdio: 'inherit' })
    if (unzip.status !== 0) die('could not extract the release archive')

    let copied = 0
    for (const slug of DEMO_SLUGS) {
      const source = join(extractDirectory, slug)
      const videos = await listVideos(source)
      if (videos.length === 0) continue

      const target = join(demoVideosDirectory, slug)
      await mkdir(target, { recursive: true })

      for (const video of videos) {
        await cp(join(source, video), join(target, video))
        copied += 1
      }

      note(`installed ${videos.length} video file(s) for "${slug}"`)
    }

    if (copied === 0) die(`the archive holds no videos for ${DEMO_SLUGS.join(', ')}`)

    const size = await stat(archivePath)
    note(`done. The archive was ${(size.size / 1024 / 1024).toFixed(0)} MB; the extracted files are in public/videos/.`)
    note('run "pnpm db:seed" to point the demo lectures at them')
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
}

void main().catch((error: unknown) => {
  die(error instanceof Error ? error.message : String(error))
})
