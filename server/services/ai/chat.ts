import { and, asc, eq } from 'drizzle-orm'
import { convertToModelMessages, streamText, validateUIMessages } from 'ai'
import { useDb } from '#server/db'
import { aiChatMessages } from '#server/db/schema'
import { getChatModel, isAiConfigured } from '#server/utils/ai'
import { enforceAiRateLimit } from '#server/utils/rate-limit'
import { ServiceError } from '#server/utils/service-error'
import type { AiChatHistory, AiChatMessage, AiCitation } from '#shared/types/ai'
import type { AiChatRequestValues } from '#shared/validation/ai'
import type { CourseActor } from '#server/services/courses/access'
import { requireAiCourse } from './access'
import { acquireChatThread, ChatThreadConflictError, mergeSubmittedChatMessages, prepareChatRegeneration } from './chat-thread'
import { indexCourseLectures } from './indexing'
import { buildTutorInstructions, retrieveCoursePassages, type RetrievedPassage } from './retrieval'

/**
 * Reserves the next turn for one actor's conversation. The route releases the
 * returned lease after stream persistence settles.
 */
export function acquireAiChatThread(courseId: string, userId: string, abortSignal?: AbortSignal): Promise<() => Promise<void>> {
  return acquireChatThread(`${courseId}:${userId}`, abortSignal)
}

/** Returns the stored conversation for the signed-in actor and course. */
export async function getAiChatHistory(courseId: string, actor: CourseActor): Promise<AiChatHistory> {
  await requireAiCourse(courseId, actor)

  return { messages: await loadChatMessages(courseId, actor.id), available: isAiConfigured() }
}

/**
 * Verifies access, indexes the course lazily, and starts a grounded answer.
 *
 * The route owns the per-thread lock, HTTP stream, and persistence callback.
 * Under that lock this service reconciles the submitted messages with the latest
 * stored thread, then returns the AI SDK result plus answer citations.
 */
export async function startAiChat(courseId: string, input: AiChatRequestValues, actor: CourseActor, abortSignal?: AbortSignal) {
  const course = await requireAiCourse(courseId, actor)
  const requested = await validateChatMessages(input.messages)
  const stored = await loadChatMessages(courseId, actor.id)
  const messages = reconcileChatMessages(stored, requested, input.trigger)
  const question = lastUserMessageText(messages)

  if (!question) throw new ServiceError('invalid_input', 'Ask a question about the course.')

  await enforceAiRateLimit(actor.id)

  let passages: RetrievedPassage[]

  try {
    const indexing = await indexCourseLectures(courseId)

    // Every transcript of the course was rejected, so there is nothing to
    // ground an answer in. The other lectures of the course are unaffected.
    if (indexing.available === 0 && indexing.failed > 0) {
      throw new ServiceError('unavailable', 'The AI tutor could not index the lecture material of this course.')
    }

    passages = await retrieveCoursePassages(courseId, question)
  } catch (error) {
    if (error instanceof ServiceError) throw error

    console.error('[ai] failed to prepare course context', error)
    throw new ServiceError('unavailable', 'The AI tutor could not prepare this course.')
  }

  const citations = buildCitations(passages)

  const result = streamText({
    model: getChatModel(),
    instructions: buildTutorInstructions(course.title, passages, input.depth),
    messages: await convertToModelMessages(messages),
    abortSignal
  })

  return { result, messages, citations }
}

/**
 * Builds the citation chips of an answer.
 *
 * One chip per lecture, taken from the passage that matched the question
 * best, so several passages of the same lecture do not repeat the title.
 */
function buildCitations(passages: RetrievedPassage[]): AiCitation[] {
  const seen = new Set<string>()
  const citations: AiCitation[] = []

  for (const passage of passages) {
    if (seen.has(passage.lectureId)) continue

    seen.add(passage.lectureId)
    citations.push({ lectureId: passage.lectureId, title: passage.lectureTitle, excerpt: passage.excerpt })

    if (citations.length === 3) break
  }

  return citations
}

/**
 * Replaces the stored thread with the messages the stream ended with.
 *
 * The route holds the per-thread lock from reconciliation through this call.
 * A stopped or partial answer is still worth keeping, so the route calls this
 * with whatever messages the stream produced. Rows are inserted in array order
 * with increasing timestamps so the thread reads back in the same order.
 */
export async function saveAiChatHistory(courseId: string, userId: string, messages: AiChatMessage[]): Promise<void> {
  const base = Date.now()
  const values = messages.map((message, index) => ({ userId, courseId, message, createdAt: new Date(base + index) }))
  const db = useDb()

  await db.transaction(async (tx) => {
    await tx.delete(aiChatMessages).where(and(eq(aiChatMessages.userId, userId), eq(aiChatMessages.courseId, courseId)))
    if (values.length) await tx.insert(aiChatMessages).values(values)
  })
}

/** Loads one actor's conversation in display order. */
async function loadChatMessages(courseId: string, userId: string): Promise<AiChatMessage[]> {
  const rows = await useDb()
    .select({ message: aiChatMessages.message })
    .from(aiChatMessages)
    .where(and(eq(aiChatMessages.userId, userId), eq(aiChatMessages.courseId, courseId)))
    .orderBy(asc(aiChatMessages.createdAt), asc(aiChatMessages.id))

  return rows.map((row) => row.message as AiChatMessage)
}

/** Merges a request against server-owned history or reports a stale conflict. */
function reconcileChatMessages(stored: AiChatMessage[], requested: AiChatMessage[], trigger: AiChatRequestValues['trigger']): AiChatMessage[] {
  try {
    return trigger === 'regenerate-message' ? prepareChatRegeneration(stored, requested) : mergeSubmittedChatMessages(stored, requested)
  } catch (error) {
    if (error instanceof ChatThreadConflictError) throw new ServiceError('conflict', error.message)

    throw error
  }
}

/** Validates the AI SDK message list and normalises its metadata type. */
async function validateChatMessages(messages: AiChatMessage[]): Promise<AiChatMessage[]> {
  try {
    return await validateUIMessages<AiChatMessage>({ messages })
  } catch {
    throw new ServiceError('invalid_input', 'The conversation format is invalid.')
  }
}

/** Extracts the most recent user text, which seeds retrieval. */
function lastUserMessageText(messages: AiChatMessage[]): string {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')

  return (
    lastUser?.parts
      .flatMap((part) => (part.type === 'text' ? [part.text] : []))
      .join(' ')
      .trim() ?? ''
  )
}
