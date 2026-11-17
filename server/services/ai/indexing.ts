import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { useDb } from '#server/db'
import { lectureChunks, lectures, modules } from '#server/db/schema'
import { embedTexts, getAiEmbeddingBudget } from '#server/utils/ai'
import { chunkTranscript } from './chunking'

/** Embeddings that are currently being generated, keyed by course. */
const inFlight = new Map<string, Promise<IndexingOutcome>>()

/** What one indexing run did to a course. */
export interface IndexingOutcome {
  /** Lectures this run indexed. */
  indexed: number
  /** Lectures this run could not index. */
  failed: number
  /** Lectures of the course that have indexed chunks after the run. */
  available: number
}

/**
 * Lazily embeds every lecture transcript of a course that has none yet.
 *
 * A transcript is split into chunks first, because the embedding model
 * accepts only a bounded input. One lecture therefore costs as many embedding
 * requests as it has chunks the first time its tutor is used. Concurrent chat
 * requests for the same course share one run instead of paying twice.
 *
 * One lecture that cannot be indexed does not stop the others: the run keeps
 * going and reports what failed, so a single bad transcript cannot take the
 * whole course's tutor down.
 */
export function indexCourseLectures(courseId: string): Promise<IndexingOutcome> {
  const running = inFlight.get(courseId)

  if (running) return running

  const promise = embedPendingLectures(courseId).finally(() => inFlight.delete(courseId))

  inFlight.set(courseId, promise)

  return promise
}

async function embedPendingLectures(courseId: string): Promise<IndexingOutcome> {
  const db = useDb()
  const budget = getAiEmbeddingBudget()

  const rows = await db
    .select({ id: lectures.id, transcript: lectures.transcript })
    .from(lectures)
    .innerJoin(modules, eq(modules.id, lectures.moduleId))
    .where(and(eq(modules.courseId, courseId), isNotNull(lectures.transcript)))

  const candidates = rows.filter((row): row is { id: string; transcript: string } => Boolean(row.transcript?.trim()))

  if (!candidates.length) return { indexed: 0, failed: 0, available: 0 }

  const indexed = await db
    .select({ lectureId: lectureChunks.lectureId })
    .from(lectureChunks)
    .where(
      inArray(
        lectureChunks.lectureId,
        candidates.map((candidate) => candidate.id)
      )
    )

  const alreadyIndexed = new Set(indexed.map((row) => row.lectureId))
  const pending = candidates.filter((candidate) => !alreadyIndexed.has(candidate.id))

  let indexedCount = 0
  let failedCount = 0

  for (const lecture of pending) {
    try {
      await indexLecture(courseId, lecture.id, lecture.transcript, budget)
      indexedCount += 1
    } catch (error) {
      failedCount += 1
      console.error(`[ai] failed to index the transcript of lecture ${lecture.id}`, error)
    }
  }

  const available = await db
    .select({ lectureId: lectureChunks.lectureId })
    .from(lectureChunks)
    .where(
      inArray(
        lectureChunks.lectureId,
        candidates.map((candidate) => candidate.id)
      )
    )

  return { indexed: indexedCount, failed: failedCount, available: new Set(available.map((row) => row.lectureId)).size }
}

/**
 * Embeds one transcript and stores its chunks.
 *
 * The write is skipped when the transcript changed while it was being
 * embedded, so a stale run cannot overwrite the chunks of a newer transcript.
 */
async function indexLecture(courseId: string, lectureId: string, transcript: string, budget: { chunkTokens: number; maxInputTokens: number }): Promise<void> {
  const chunks = chunkTranscript(transcript, budget)

  if (!chunks.length) return

  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content))
  const values = chunks.map((chunk, index) => ({ lectureId, courseId, position: chunk.position, content: chunk.content, embedding: embeddings[index]! }))

  const db = useDb()
  const [current] = await db.select({ transcript: lectures.transcript }).from(lectures).where(eq(lectures.id, lectureId)).limit(1)

  if (current?.transcript !== transcript) return

  await db.transaction(async (tx) => {
    await tx.delete(lectureChunks).where(eq(lectureChunks.lectureId, lectureId))
    await tx.insert(lectureChunks).values(values)
  })
}
