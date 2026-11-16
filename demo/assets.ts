import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/** The file extensions that hold a lecture video. */
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.mov', '.m4v', '.ogv']

/**
 * The folder that holds the demo lecture assets.
 *
 * `DEMO_ASSETS_DIR` names it explicitly. Without it the folder is resolved
 * from the working directory: a built application serves its static files from
 * `.output/public`, and a checkout keeps them in `public`.
 */
export function resolveDemoAssetsDirectory(): string {
  const configured = process.env.DEMO_ASSETS_DIR?.trim()
  if (configured) return resolve(configured)

  const built = resolve(process.cwd(), '.output/public/videos')
  if (existsSync(built)) return built

  return resolve(process.cwd(), 'public/videos')
}

/** Reports whether a file name is a lecture video. */
function isVideoFile(name: string): boolean {
  const lower = name.toLowerCase()

  return VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

/** Lists the files of a folder, ignoring hidden ones. Returns an empty list when the folder does not exist. */
async function listFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })

    return entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.')).map((entry) => entry.name)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

/**
 * Returns the MP4 to serve: `video.mp4` when present, otherwise the first MP4
 * in the folder.
 *
 * The video files are not committed to Git, so a folder may hold only the
 * transcript and the course description. That is a valid demo: the lecture is
 * seeded without a video and the player shows its "no video" state.
 */
async function findVideoFile(directory: string, slug: string): Promise<string | null> {
  let files: string[]

  try {
    files = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isFile()).map(({ name }) => name)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Missing ${slug}/ in ${directory}. Add transcript.txt and about.md before running the seed.`, { cause: error })
    }

    throw error
  }

  const videos = files.filter((name) => !name.startsWith('.') && name.toLowerCase().endsWith('.mp4'))

  if (videos.length === 0) {
    return null
  }

  return videos.includes('video.mp4') ? 'video.mp4' : videos.sort()[0]!
}

export interface DemoVideoContent {
  slug: string
  /** `null` when the folder holds no video file. */
  videoUrl: string | null
  lectureTitle: string
  courseDescription: string
  transcript: string
}

function parseAbout(markdown: string, slug: string): Pick<DemoVideoContent, 'lectureTitle' | 'courseDescription'> {
  const normalised = markdown
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim()
  const match = /^#\s+(.+)\n+([\s\S]+)$/.exec(normalised)
  const lectureTitle = match?.[1]?.trim()
  const courseDescription = match?.[2]?.trim()

  if (!lectureTitle || !courseDescription) {
    throw new Error(`The about.md of "${slug}" must start with "# Lecture title" followed by the course description.`)
  }

  return { lectureTitle, courseDescription }
}

async function readRequiredFile(path: string, label: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Missing ${label}. Add the demo asset before running the seed.`, { cause: error })
    }

    throw error
  }
}

/**
 * Loads one demo lecture from the assets folder.
 *
 * The folder holds a plain-text transcript and an `about.md` whose first
 * heading is the lecture title and whose remaining text is the course
 * description. A video file (`video.mp4` or another `.mp4` name) is optional:
 * videos are not committed to Git, and `pnpm demo:assets` fetches them.
 */
export async function loadDemoVideo(slug: string): Promise<DemoVideoContent> {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Invalid demo asset folder "${slug}". Use lowercase letters, numbers, and hyphens.`)
  }

  const assetsDirectory = resolveDemoAssetsDirectory()
  const directory = join(assetsDirectory, slug)
  const videoFile = await findVideoFile(directory, slug)
  const [about, transcript] = await Promise.all([readRequiredFile(join(directory, 'about.md'), `${slug}/about.md`), readRequiredFile(join(directory, 'transcript.txt'), `${slug}/transcript.txt`)])
  const transcriptText = transcript.replace(/^\uFEFF/, '').trim()

  if (!transcriptText) {
    throw new Error(`The transcript.txt of "${slug}" is empty. Add the lecture transcript before running the seed.`)
  }

  return {
    slug,
    videoUrl: videoFile ? `/videos/${slug}/${encodeURIComponent(videoFile)}` : null,
    transcript: transcriptText,
    ...parseAbout(about, slug)
  }
}

/** Loads every demo folder before the seed changes any database rows. */
export async function loadDemoVideos(slugs: readonly string[]): Promise<Map<string, DemoVideoContent>> {
  const uniqueSlugs = [...new Set(slugs)]
  const videos = await Promise.all(uniqueSlugs.map(loadDemoVideo))

  return new Map(videos.map((video) => [video.slug, video] as const))
}

export interface DemoAssetsSummary {
  /** The folder the demo assets live in. */
  directory: string
  /** How many text files were copied into it. */
  copiedFiles: number
  /** How many video files were copied into it. */
  copiedVideos: number
}

/**
 * Puts the demo assets in place before the demo data is seeded.
 *
 * A container holds the transcripts and course descriptions in its image and
 * receives the videos from a mounted folder, because the videos are far too
 * large to ship in an image. `DEMO_ASSETS_SOURCE` is the folder the files are
 * copied from, and `DEMO_VIDEO_INBOX` is the folder the videos are copied
 * from. Both are optional: a checkout needs neither.
 */
export async function prepareDemoAssets(): Promise<DemoAssetsSummary> {
  const directory = resolveDemoAssetsDirectory()
  const source = process.env.DEMO_ASSETS_SOURCE?.trim()
  const inbox = process.env.DEMO_VIDEO_INBOX?.trim()
  let copiedFiles = 0
  let copiedVideos = 0

  await mkdir(directory, { recursive: true })

  if (source) {
    copiedFiles = await copyDemoFiles(resolve(source), directory, (name) => !isVideoFile(name))
  }

  if (inbox) {
    copiedVideos = await copyDemoFiles(resolve(inbox), directory, isVideoFile)
  }

  return { directory, copiedFiles, copiedVideos }
}

/**
 * Copies the files of every subfolder of `from` into the matching subfolder
 * of `to`, keeping the files the filter accepts.
 */
async function copyDemoFiles(from: string, to: string, accept: (name: string) => boolean): Promise<number> {
  let copied = 0

  for (const slug of await listDirectories(from)) {
    const targetDirectory = join(to, slug)
    await mkdir(targetDirectory, { recursive: true })

    for (const entry of await listFiles(join(from, slug))) {
      if (!accept(entry)) continue

      await copyFile(join(from, slug, entry), join(targetDirectory, entry))
      copied += 1
    }
  }

  return copied
}

/** Lists the subfolders of a folder. Returns an empty list when the folder does not exist. */
async function listDirectories(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true })

    return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => entry.name)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}
