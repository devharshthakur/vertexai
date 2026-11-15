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
import { indexCourseLectures } from './indexing'
import { buildTutorInstructions, retrieveCourseLectures, type RetrievedLecture } from './retrieval'

/** Returns the stored conversation for the signed-in actor and course. */
export async function getAiChatHistory(courseId: string, actor: CourseActor): Promise<AiChatHistory> {
  await requireAiCourse(courseId, actor)

  const rows = await useDb()
    .select({ message: aiChatMessages.message })
    .from(aiChatMessages)
    .where(and(eq(aiChatMessages.userId, actor.id), eq(aiChatMessages.courseId, courseId)))
    .orderBy(asc(aiChatMessages.createdAt), asc(aiChatMessages.id))

  return { messages: rows.map((row) => row.message as AiChatMessage), available: isAiConfigured() }
}

/**
 * Verifies access, indexes the course lazily, and starts a grounded answer.
 *
 * The route owns the HTTP stream and persistence callback; this service returns
 * the AI SDK result plus the citations that belong in the answer metadata.
 */
export async function startAiChat(courseId: string, input: AiChatRequestValues, actor: CourseActor, abortSignal?: AbortSignal) {
  const course = await requireAiCourse(courseId, actor)
  const messages = await validateChatMessages(input.messages)
  const question = lastUserMessageText(messages)

  if (!question) throw new ServiceError('invalid_input', 'Ask a question about the course.')

  enforceAiRateLimit(actor.id)

  let retrieved: RetrievedLecture[]

  try {
    await indexCourseLectures(courseId)
    retrieved = await retrieveCourseLectures(courseId, question)
  } catch (error) {
    if (error instanceof ServiceError) throw error

    console.error('[ai] failed to prepare course context', error)
    throw new ServiceError('unavailable', 'The AI tutor could not prepare this course.')
  }

  const citations: AiCitation[] = retrieved.map((lecture) => ({ lectureId: lecture.id, title: lecture.title, excerpt: lecture.excerpt }))

  const result = streamText({
    model: getChatModel(),
    instructions: buildTutorInstructions(course.title, retrieved),
    messages: await convertToModelMessages(messages),
    abortSignal
  })

  return { result, messages, citations }
}

/**
 * Replaces the stored thread with the messages the stream ended with.
 *
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
