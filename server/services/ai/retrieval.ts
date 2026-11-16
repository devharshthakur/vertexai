import { and, cosineDistance, eq, isNotNull } from 'drizzle-orm'
import { useDb } from '#server/db'
import { lectures, modules } from '#server/db/schema'
import { embedText } from '#server/utils/ai'

/** One lecture selected as grounding material for a tutor answer. */
export interface RetrievedLecture {
  id: string
  title: string
  transcript: string
  excerpt: string
}

/**
 * Finds the three lectures closest to the question, scoped to one course.
 *
 * Each lecture has a single embedding, so the cosine query compares against
 * whole transcripts rather than chunks. The transcripts themselves become the
 * grounded prompt context.
 */
export async function retrieveCourseLectures(courseId: string, question: string): Promise<RetrievedLecture[]> {
  const embedding = await embedText(question)
  const rows = await useDb()
    .select({ id: lectures.id, title: lectures.title, transcript: lectures.transcript })
    .from(lectures)
    .innerJoin(modules, eq(modules.id, lectures.moduleId))
    .where(and(eq(modules.courseId, courseId), isNotNull(lectures.embedding), isNotNull(lectures.transcript)))
    .orderBy(cosineDistance(lectures.embedding, embedding))
    .limit(3)

  return rows.flatMap((row) =>
    row.transcript ?
      [
        {
          id: row.id,
          title: row.title,
          transcript: row.transcript,
          excerpt: buildExcerpt(row.transcript, question)
        }
      ]
    : []
  )
}

/** Builds the strict grounding instructions shared by chat answers. */
export function buildTutorInstructions(courseTitle: string, retrieved: RetrievedLecture[]): string {
  const context = retrieved.length ? retrieved.map((lecture, index) => `[${index + 1}] Lecture: ${lecture.title}\n${lecture.transcript}`).join('\n\n') : 'No lecture transcript is available for this course.'

  return [
    `You are the AI tutor for the course "${courseTitle}".`,
    'Answer only from the lecture transcripts in the course context below. Do not use outside knowledge.',
    'If the context does not contain the answer, say that the course material does not cover it, and do not guess.',
    'Do not invent lecture titles, facts, or quotations. Refer to the lectures you used by title.',
    'Keep answers clear and concise. Use short paragraphs and simple hyphen bullets when a list helps.',
    '',
    'Course context:',
    context
  ].join('\n')
}

/**
 * Picks a short quotation for a citation chip.
 *
 * It prefers a window around a question keyword, so the quote is usually the
 * passage the answer drew on. The window is always a contiguous slice of the
 * transcript, with ellipses only when the text was clipped.
 */
function buildExcerpt(transcript: string, question: string, maxLength = 240): string {
  const text = transcript.replace(/\s+/g, ' ').trim()
  const words = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4)

  const match = words.map((word) => text.toLowerCase().indexOf(word)).find((index) => index >= 0) ?? -1
  const start = match < 0 ? 0 : Math.max(0, match - Math.floor(maxLength / 3))
  const slice = text.slice(start, start + maxLength).trim()

  return `${start > 0 ? '…' : ''}${slice}${start + maxLength < text.length ? '…' : ''}`
}
