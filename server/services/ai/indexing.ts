import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { embed } from 'ai'
import { useDb } from '#server/db'
import { lectures, modules } from '#server/db/schema'
import { getEmbeddingModel } from '#server/utils/ai'

/** Embeddings that are currently being generated, keyed by course. */
const inFlight = new Map<string, Promise<void>>()

/**
 * Lazily embeds every lecture transcript of a course that has none yet.
 *
 * There is one vector per lecture, so a course with three transcripts costs
 * three embedding requests the first time its tutor is used. Concurrent chat
 * requests for the same course share one run instead of paying twice.
 */
export function indexCourseLectures(courseId: string): Promise<void> {
  const running = inFlight.get(courseId)

  if (running) return running

  const promise = embedPendingLectures(courseId).finally(() => inFlight.delete(courseId))

  inFlight.set(courseId, promise)

  return promise
}

async function embedPendingLectures(courseId: string): Promise<void> {
  const db = useDb()
  const pending = await db
    .select({ id: lectures.id, transcript: lectures.transcript })
    .from(lectures)
    .innerJoin(modules, eq(modules.id, lectures.moduleId))
    .where(and(eq(modules.courseId, courseId), isNotNull(lectures.transcript), isNull(lectures.embedding)))

  const transcripts = pending.filter((lecture): lecture is { id: string; transcript: string } => Boolean(lecture.transcript?.trim()))

  if (!transcripts.length) return

  const model = getEmbeddingModel()

  for (const lecture of transcripts) {
    const { embedding } = await embed({ model, value: lecture.transcript })

    // Skip the write if the transcript changed while it was being embedded.
    await db
      .update(lectures)
      .set({ embedding, embeddedAt: new Date() })
      .where(and(eq(lectures.id, lecture.id), eq(lectures.transcript, lecture.transcript)))
  }
}
