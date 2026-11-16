import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const demoVideosDirectory = fileURLToPath(new URL('../public/videos/', import.meta.url))

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
      throw new Error(`Missing public/videos/${slug}/. Add transcript.txt and about.md before running the seed.`, { cause: error })
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
    throw new Error(`public/videos/${slug}/about.md must start with "# Lecture title" followed by the course description.`)
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
 * Loads one demo lecture from `public/videos/<slug>/`.
 *
 * The folder holds a plain-text transcript and an `about.md` whose first
 * heading is the lecture title and whose remaining text is the course
 * description. A video file (`video.mp4` or another `.mp4` name) is optional:
 * videos are not committed to Git, and `pnpm demo:assets` fetches them.
 */
export async function loadDemoVideo(slug: string): Promise<DemoVideoContent> {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`Invalid demo video folder "${slug}". Use lowercase letters, numbers, and hyphens.`)
  }

  const directory = join(demoVideosDirectory, slug)
  const videoFile = await findVideoFile(directory, slug)
  const [about, transcript] = await Promise.all([readRequiredFile(join(directory, 'about.md'), `public/videos/${slug}/about.md`), readRequiredFile(join(directory, 'transcript.txt'), `public/videos/${slug}/transcript.txt`)])
  const transcriptText = transcript.replace(/^\uFEFF/, '').trim()

  if (!transcriptText) {
    throw new Error(`public/videos/${slug}/transcript.txt is empty. Add the lecture transcript before running the seed.`)
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
