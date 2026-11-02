import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getYouTubeVideoId } from '../shared/utils/youtube'

const transcriptDirectory = join(dirname(fileURLToPath(import.meta.url)), 'transcripts')
const missingTranscriptWarnings = new Set<string>()

/** Loads an optional offline transcript from `seed/transcripts/<youtube-video-id>.txt`. */
export async function loadSeedTranscript(videoUrl: string): Promise<string | null> {
  const videoId = getYouTubeVideoId(videoUrl)
  if (!videoId) return null

  try {
    const transcript = await readFile(join(transcriptDirectory, `${videoId}.txt`), 'utf8')
    return transcript.trim() ? transcript : null
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error

    if (!missingTranscriptWarnings.has(videoId)) {
      missingTranscriptWarnings.add(videoId)
      console.warn(`No transcript file for YouTube video ${videoId}; add seed/transcripts/${videoId}.txt to seed its transcript.`)
    }

    return null
  }
}
