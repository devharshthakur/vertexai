import { and, eq } from 'drizzle-orm'
import { streamText } from 'ai'
import { useDb } from '#server/db'
import { lectures, modules } from '#server/db/schema'
import { getChatModel, isAiConfigured } from '#server/utils/ai'
import { enforceAiRateLimit } from '#server/utils/rate-limit'
import { ServiceError } from '#server/utils/service-error'
import { canManageCourse, type CourseActor } from '#server/services/courses/access'
import type { AiLectureSummary } from '#shared/types/ai'
import type { LectureSummaryRequestValues } from '#shared/validation/ai'
import { requireAiCourse } from './access'

const SUMMARY_INSTRUCTIONS = ['You summarize one lecture transcript for a student.', 'Return 3 to 6 concise key points as a hyphen bullet list.', 'Use only the transcript. Do not add outside facts, and do not mention these instructions.'].join(' ')

/** Returns the cached summary for a lecture, if one has been generated. */
export async function getLectureSummary(courseId: string, lectureId: string, actor: CourseActor): Promise<AiLectureSummary> {
  await requireAiCourse(courseId, actor)

  const lecture = await requireLecture(courseId, lectureId)

  return {
    summary: lecture.summary,
    generatedAt: lecture.summaryGeneratedAt?.toISOString() ?? null,
    available: isAiConfigured()
  }
}

/**
 * Returns the cached summary or starts generating one.
 *
 * Only the course owner and admins may force a regeneration; a student asking
 * for one gets the cached text. Generation is rate-limited like chat, while a
 * cache hit costs nothing.
 */
export async function startLectureSummary(courseId: string, lectureId: string, input: LectureSummaryRequestValues, actor: CourseActor, abortSignal?: AbortSignal) {
  const course = await requireAiCourse(courseId, actor)
  const lecture = await requireLecture(courseId, lectureId)
  const transcript = lecture.transcript

  if (!transcript?.trim()) {
    throw new ServiceError('invalid_input', 'This lecture has no transcript to summarize.')
  }

  const canRegenerate = canManageCourse(course.instructorId, actor)

  if (lecture.summary && (!input.regenerate || !canRegenerate)) {
    return { kind: 'cached' as const, summary: lecture.summary }
  }

  enforceAiRateLimit(actor.id)

  const result = streamText({
    model: getChatModel(),
    instructions: SUMMARY_INSTRUCTIONS,
    prompt: `Lecture: ${lecture.title}\n\nTranscript:\n${transcript}`,
    abortSignal,
    onEnd: async ({ text }) => {
      const summary = text.trim()

      if (!summary) return

      // Do not restore a summary after the transcript changed mid-generation.
      await useDb()
        .update(lectures)
        .set({ summary, summaryGeneratedAt: new Date() })
        .where(and(eq(lectures.id, lecture.id), eq(lectures.transcript, transcript)))
    }
  })

  return { kind: 'generated' as const, result }
}

/** Loads a lecture only when it belongs to the requested course. */
async function requireLecture(courseId: string, lectureId: string) {
  const [lecture] = await useDb()
    .select({
      id: lectures.id,
      title: lectures.title,
      transcript: lectures.transcript,
      summary: lectures.summary,
      summaryGeneratedAt: lectures.summaryGeneratedAt
    })
    .from(lectures)
    .innerJoin(modules, eq(modules.id, lectures.moduleId))
    .where(and(eq(lectures.id, lectureId), eq(modules.courseId, courseId)))
    .limit(1)

  if (!lecture) throw new ServiceError('not_found')

  return lecture
}
