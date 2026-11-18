import { and, eq } from 'drizzle-orm'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { useDb } from '#server/db'
import { lectures, modules } from '#server/db/schema'
import { getChatModel } from '#server/utils/ai'
import { enforceAiRateLimit } from '#server/utils/rate-limit'
import { ServiceError } from '#server/utils/service-error'
import { assertCanManageCourse, type CourseActor } from '#server/services/courses/access'
import { requireAiCourse } from './access'
import { assertAiTranscriptWithinBudget } from './input'
import type { QuizDraft, QuizDraftQuestion } from '#shared/types/quizzes'

/**
 * The shapes the model is asked to fill.
 *
 * The schema is deliberately permissive: the draft is normalized and checked
 * again before it reaches the instructor, so one malformed option cannot fail
 * the whole request.
 */
const draftOutputSchema = z.object({
  title: z.string(),
  questions: z.array(
    z.object({
      questionText: z.string(),
      questionType: z.enum(['mcq', 'multi_select']),
      points: z.number(),
      explanation: z.string(),
      options: z.array(
        z.object({
          optionText: z.string(),
          isCorrect: z.boolean()
        })
      )
    })
  )
})

const QUIZ_DRAFT_INSTRUCTIONS = [
  'You draft quizzes for an online course instructor.',
  'Use only the supplied lecture transcript. Do not add outside facts.',
  'Write 5 to 10 questions that test understanding of the main ideas.',
  'Mix multiple-choice questions (exactly one correct option) and multi-select questions (at least one correct option).',
  'Give every question 2 to 4 plausible options, one or more correct options, a one-sentence explanation, and 1 to 10 points.',
  'Return a short quiz title. Do not mention the transcript, the instructions, or that the quiz was generated.'
].join(' ')

const MIN_QUESTIONS = 5
const MAX_QUESTIONS = 10
const MAX_OPTIONS = 8

/**
 * Drafts a quiz from one lecture transcript for the instructor to review.
 *
 * Nothing is stored: the instructor edits the draft in the existing quiz form
 * and creates it through the normal endpoint. Generation is rate-limited like
 * the rest of the AI features, and only the course owner or an admin may ask.
 */
export async function generateQuizDraft(courseId: string, lectureId: string, actor: CourseActor): Promise<QuizDraft> {
  const course = await requireAiCourse(courseId, actor)
  assertCanManageCourse(course.instructorId, actor)

  const lecture = await requireLecture(courseId, lectureId)

  if (!lecture.transcript?.trim()) {
    throw new ServiceError('invalid_input', 'This lecture has no transcript to draft a quiz from.')
  }
  assertAiTranscriptWithinBudget(lecture.transcript)

  await enforceAiRateLimit(actor.id)

  const { output } = await generateText({
    model: getChatModel(),
    output: Output.object({ schema: draftOutputSchema }),
    instructions: QUIZ_DRAFT_INSTRUCTIONS,
    prompt: `Lecture: ${lecture.title}\n\nTranscript:\n${lecture.transcript}`
  })

  const questions = normalizeQuestions(output.questions)

  if (questions.length < MIN_QUESTIONS) {
    throw new ServiceError('unavailable', 'The AI draft was incomplete. Please try again.')
  }

  return {
    lectureId: lecture.id,
    lectureTitle: lecture.title,
    moduleId: lecture.moduleId,
    moduleTitle: lecture.moduleTitle,
    title: (output.title.trim() || `${lecture.title} quiz`).slice(0, 200),
    passingScore: 70,
    questions
  }
}

/** Loads a lecture only when it belongs to the requested course. */
async function requireLecture(courseId: string, lectureId: string) {
  const [lecture] = await useDb()
    .select({
      id: lectures.id,
      title: lectures.title,
      transcript: lectures.transcript,
      moduleId: modules.id,
      moduleTitle: modules.title
    })
    .from(lectures)
    .innerJoin(modules, eq(modules.id, lectures.moduleId))
    .where(and(eq(lectures.id, lectureId), eq(modules.courseId, courseId)))
    .limit(1)

  if (!lecture) throw new ServiceError('not_found')

  return lecture
}

/**
 * Trims the model's draft into the shape the quiz form accepts.
 *
 * Empty and duplicate options are dropped, and the correct answers are
 * repaired to match the quiz rules: exactly one for a multiple-choice
 * question, at least one for multi-select.
 */
function normalizeQuestions(rawQuestions: z.infer<typeof draftOutputSchema>['questions']): QuizDraftQuestion[] {
  return rawQuestions
    .slice(0, MAX_QUESTIONS)
    .map((raw) => {
      const questionText = raw.questionText.trim().slice(0, 2000)
      if (!questionText) return null

      const seen = new Set<string>()
      const options = raw.options
        .map((option) => ({ optionText: option.optionText.trim().slice(0, 500), isCorrect: option.isCorrect }))
        .filter((option) => {
          const key = option.optionText.toLocaleLowerCase('en-US')
          if (!key || seen.has(key)) return false
          seen.add(key)

          return true
        })
        .slice(0, MAX_OPTIONS)

      if (options.length < 2) return null

      const firstCorrect = options.findIndex((option) => option.isCorrect)
      const correctIndex = firstCorrect === -1 ? 0 : firstCorrect
      const questionType = raw.questionType === 'multi_select' ? 'multi_select' : 'mcq'
      const fixed =
        questionType === 'mcq' ? options.map((option, index) => ({ ...option, isCorrect: index === correctIndex }))
        : options.some((option) => option.isCorrect) ? options
        : options.map((option, index) => ({ ...option, isCorrect: index === 0 }))

      return {
        questionText,
        questionType,
        points: Math.min(100, Math.max(1, Math.round(raw.points))),
        explanation: raw.explanation.trim().slice(0, 2000) || null,
        options: fixed
      }
    })
    .filter((question): question is QuizDraftQuestion => question !== null)
}
