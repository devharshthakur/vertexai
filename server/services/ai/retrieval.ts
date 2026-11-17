import { cosineDistance, eq } from 'drizzle-orm'
import { useDb } from '#server/db'
import { lectureChunks, lectures } from '#server/db/schema'
import { embedText } from '#server/utils/ai'
import type { AiExplanationDepth } from '#shared/validation/ai'

/** How many transcript passages one answer may be grounded in. */
const retrievedPassages = 6

/** One passage of a lecture selected as grounding material for a tutor answer. */
export interface RetrievedPassage {
  lectureId: string
  lectureTitle: string
  /** Position of the passage inside the transcript, from zero. */
  position: number
  content: string
  excerpt: string
}

/**
 * Finds the transcript passages closest to the question, scoped to one course.
 *
 * Lectures are indexed in chunks, so the cosine query compares the question
 * against passages instead of whole transcripts. The passages that match best
 * become the grounded context of the answer.
 */
export async function retrieveCoursePassages(courseId: string, question: string): Promise<RetrievedPassage[]> {
  const embedding = await embedText(question)
  const rows = await useDb()
    .select({
      lectureId: lectureChunks.lectureId,
      position: lectureChunks.position,
      content: lectureChunks.content,
      lectureTitle: lectures.title
    })
    .from(lectureChunks)
    .innerJoin(lectures, eq(lectures.id, lectureChunks.lectureId))
    .where(eq(lectureChunks.courseId, courseId))
    .orderBy(cosineDistance(lectureChunks.embedding, embedding))
    .limit(retrievedPassages)

  return rows.map((row) => ({
    lectureId: row.lectureId,
    lectureTitle: row.lectureTitle,
    position: row.position,
    content: row.content,
    excerpt: buildExcerpt(row.content, question)
  }))
}

/** How the answer should be pitched, per depth the student picked. */
const DEPTH_INSTRUCTIONS: Record<AiExplanationDepth, string> = {
  beginner: 'Explain at beginner depth: define each term you introduce, build the idea in small steps, and use a simple, concrete example. Avoid unexplained jargon.',
  intermediate: 'Explain at intermediate depth: assume the basics, be precise, connect the idea to the rest of the course, and use a short example where it helps.',
  advanced: "Explain at advanced depth: use the field's terminology, be concise, and focus on nuance, trade-offs, and edge cases rather than the basics."
}

/** Builds the strict grounding instructions shared by chat answers. */
export function buildTutorInstructions(courseTitle: string, passages: RetrievedPassage[], depth: AiExplanationDepth): string {
  const context = passages.length ? passages.map((passage, index) => `[${index + 1}] Lecture: ${passage.lectureTitle} (passage ${passage.position + 1})\n${passage.content}`).join('\n\n') : 'No lecture transcript is available for this course.'

  return [
    `You are the AI tutor for the course "${courseTitle}".`,
    'Answer only from the lecture passages in the course context below. Do not use outside knowledge.',
    'If the context does not contain the answer, say that the course material does not cover it, and do not guess.',
    'Do not invent lecture titles, facts, or quotations. Refer to the lectures you used by title.',
    'Keep answers clear and concise. Use short paragraphs and simple hyphen bullets when a list helps.',
    DEPTH_INSTRUCTIONS[depth],
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
 * passage, with ellipses only when the text was clipped.
 */
function buildExcerpt(passage: string, question: string, maxLength = 240): string {
  const text = passage.replace(/\s+/g, ' ').trim()
  const words = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4)

  const match = words.map((word) => text.toLowerCase().indexOf(word)).find((index) => index >= 0) ?? -1
  const start = match < 0 ? 0 : Math.max(0, match - Math.floor(maxLength / 3))
  const slice = text.slice(start, start + maxLength).trim()

  return `${start > 0 ? '…' : ''}${slice}${start + maxLength < text.length ? '…' : ''}`
}
