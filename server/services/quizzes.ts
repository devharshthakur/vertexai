import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { useDb } from '#server/db'
import { courses, enrollments, modules, quizAnswers, quizAttempts, quizOptions, quizQuestions, quizzes } from '#server/db/schema'
import type { QuizAttemptDetail, QuizDetailForStudent, QuizGradedAnswerItem, QuizInstructorOption, QuizInstructorQuestion, QuizStudentQuestion, QuizStudentSummary } from '#shared/types/quizzes'
import type { CreateQuizValues, SubmitQuizAttemptValues } from '#shared/validation/quizzes'
import { ServiceError } from '#server/utils/service-error'
import { assertCanManageCourse, canManageCourse, type CourseActor } from './courses/access'

type QuizRow = typeof quizzes.$inferSelect
type QuestionRow = typeof quizQuestions.$inferSelect
type OptionRow = typeof quizOptions.$inferSelect
type AttemptRow = typeof quizAttempts.$inferSelect

/**
 * Objective quizzes: authoring, redacted student reads, attempts, and grading.
 *
 * Two rules shape this service:
 *
 * - Students never receive `isCorrect` or `explanation` before their attempt is
 *   submitted. Student-facing reads project questions into `QuizStudentQuestion`
 *   and `QuizStudentOption`, which have no correctness fields at all.
 * - Grading is exact-match: a question is only correct when the selected option
 *   set equals the expected option set, so multi-select partial credit never
 *   applies.
 *
 * Attempt writes are transactional and guarded by `submittedAt IS NULL`, which
 * keeps a concurrent resubmit from overwriting the first one.
 */

function roundPoints(value: number): number {
  return Math.round(value * 100) / 100
}

function sumQuestionPoints(questions: QuestionRow[]): number {
  return roundPoints(questions.reduce((total, question) => total + Number(question.points), 0))
}

function groupOptionsByQuestion(options: OptionRow[]): Map<string, OptionRow[]> {
  const byQuestion = new Map<string, OptionRow[]>()
  for (const option of options) {
    const group = byQuestion.get(option.questionId)
    if (group) {
      group.push(option)
    } else {
      byQuestion.set(option.questionId, [option])
    }
  }
  return byQuestion
}

function groupAttemptsByQuiz(attempts: AttemptRow[]): Map<string, AttemptRow[]> {
  const byQuiz = new Map<string, AttemptRow[]>()
  for (const attempt of attempts) {
    const group = byQuiz.get(attempt.quizId)
    if (group) {
      group.push(attempt)
    } else {
      byQuiz.set(attempt.quizId, [attempt])
    }
  }
  return byQuiz
}

function toInstructorOption(option: OptionRow): QuizInstructorOption {
  return {
    id: option.id,
    optionText: option.optionText,
    isCorrect: option.isCorrect,
    orderIndex: option.orderIndex
  }
}

function toInstructorQuestion(question: QuestionRow, options: OptionRow[]): QuizInstructorQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    points: Number(question.points),
    explanation: question.explanation,
    orderIndex: question.orderIndex,
    options: options.map(toInstructorOption)
  }
}

function toStudentQuestion(question: QuestionRow, options: OptionRow[]): QuizStudentQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    points: Number(question.points),
    orderIndex: question.orderIndex,
    options: options.map((option) => ({ id: option.id, optionText: option.optionText, orderIndex: option.orderIndex }))
  }
}

interface QuizSummaryInput {
  quiz: QuizRow
  courseId: string
  moduleTitle: string
  questions: QuestionRow[]
  options: OptionRow[]
  attempts: AttemptRow[]
  actorId: string
  includeInstructor: boolean
}

/** Projects a quiz row into the shared summary without ever exposing answer keys. */
function toQuizSummary({ quiz, courseId, moduleTitle, questions, options, attempts, actorId, includeInstructor }: QuizSummaryInput): QuizStudentSummary {
  const openAttempt = attempts.find((attempt) => attempt.userId === actorId && attempt.submittedAt === null)
  const submitted = attempts.filter((attempt) => attempt.userId === actorId && attempt.submittedAt !== null).sort((left, right) => (right.submittedAt?.getTime() ?? 0) - (left.submittedAt?.getTime() ?? 0))
  const latest = submitted[0]
  const optionsByQuestion = groupOptionsByQuestion(options)

  return {
    id: quiz.id,
    moduleId: quiz.moduleId,
    moduleTitle,
    courseId,
    title: quiz.title,
    passingScore: quiz.passingScore,
    questionCount: questions.length,
    totalPoints: sumQuestionPoints(questions),
    createdAt: quiz.createdAt.toISOString(),
    latestAttempt:
      latest && latest.submittedAt ?
        {
          id: latest.id,
          score: Number(latest.score),
          passed: Boolean(latest.passed),
          submittedAt: latest.submittedAt.toISOString()
        }
      : null,
    openAttemptId: openAttempt?.id ?? null,
    instructor:
      includeInstructor ?
        {
          attemptCount: attempts.filter((attempt) => attempt.submittedAt !== null).length,
          passCount: attempts.filter((attempt) => attempt.submittedAt !== null && attempt.passed === true).length,
          questions: questions.map((question) => toInstructorQuestion(question, optionsByQuestion.get(question.id) ?? []))
        }
      : null
  }
}

/** Loads a quiz with its owning module and course, or raises `not_found`. */
async function loadQuiz(quizId: string) {
  const [row] = await useDb().select({ quiz: quizzes, module: modules, course: courses }).from(quizzes).innerJoin(modules, eq(modules.id, quizzes.moduleId)).innerJoin(courses, eq(courses.id, modules.courseId)).where(eq(quizzes.id, quizId)).limit(1)
  if (!row) throw new ServiceError('not_found')
  return row
}

/** Loads an attempt with its quiz, module, and course, or raises `not_found`. */
async function loadAttempt(attemptId: string) {
  const [row] = await useDb()
    .select({ attempt: quizAttempts, quiz: quizzes, module: modules, course: courses })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(modules, eq(modules.id, quizzes.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(eq(quizAttempts.id, attemptId))
    .limit(1)
  if (!row) throw new ServiceError('not_found')
  return row
}

async function isEnrolled(courseId: string, userId: string): Promise<boolean> {
  const [row] = await useDb()
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)))
    .limit(1)
  return Boolean(row)
}

/** Loads the ordered questions and options for the given quizzes. */
async function loadQuizStructure(quizIds: string[]) {
  if (quizIds.length === 0) return { questions: [] as QuestionRow[], options: [] as OptionRow[] }
  const questions = await useDb().select().from(quizQuestions).where(inArray(quizQuestions.quizId, quizIds)).orderBy(asc(quizQuestions.orderIndex))
  const options =
    questions.length ?
      await useDb()
        .select()
        .from(quizOptions)
        .where(
          inArray(
            quizOptions.questionId,
            questions.map((question) => question.id)
          )
        )
        .orderBy(asc(quizOptions.orderIndex))
    : []
  return { questions, options }
}

/** Lists a course's quizzes for its owner/admin or an enrolled student. */
export async function listCourseQuizzes(courseId: string, actor: CourseActor): Promise<QuizStudentSummary[]> {
  const [course] = await useDb().select().from(courses).where(eq(courses.id, courseId)).limit(1)
  if (!course) throw new ServiceError('not_found')
  const manages = canManageCourse(course.instructorId, actor)

  if (!manages) {
    if (course.status !== 'approved') throw new ServiceError('not_found')
    if (!(await isEnrolled(courseId, actor.id))) throw new ServiceError('forbidden')
  }

  const rows = await useDb().select({ quiz: quizzes, moduleTitle: modules.title }).from(quizzes).innerJoin(modules, eq(modules.id, quizzes.moduleId)).where(eq(modules.courseId, courseId)).orderBy(asc(modules.orderIndex), asc(quizzes.createdAt))
  const quizIds = rows.map((row) => row.quiz.id)
  if (quizIds.length === 0) return []

  const { questions, options } = await loadQuizStructure(quizIds)
  const attempts = await useDb()
    .select()
    .from(quizAttempts)
    .where(and(inArray(quizAttempts.quizId, quizIds), manages ? undefined : eq(quizAttempts.userId, actor.id)))

  const questionsByQuiz = new Map<string, QuestionRow[]>()
  for (const question of questions) {
    const group = questionsByQuiz.get(question.quizId)
    if (group) {
      group.push(question)
    } else {
      questionsByQuiz.set(question.quizId, [question])
    }
  }
  const attemptsByQuiz = groupAttemptsByQuiz(attempts)

  return rows.map(({ quiz, moduleTitle }) =>
    toQuizSummary({
      quiz,
      courseId,
      moduleTitle,
      questions: questionsByQuiz.get(quiz.id) ?? [],
      options,
      attempts: attemptsByQuiz.get(quiz.id) ?? [],
      actorId: actor.id,
      includeInstructor: manages
    })
  )
}

/** Creates a quiz with its questions and options after verifying course ownership. */
export async function createCourseQuiz(courseId: string, values: CreateQuizValues, actor: CourseActor): Promise<QuizStudentSummary> {
  const [course] = await useDb().select().from(courses).where(eq(courses.id, courseId)).limit(1)
  if (!course) throw new ServiceError('not_found')
  assertCanManageCourse(course.instructorId, actor)

  const [module] = await useDb()
    .select({ id: modules.id, title: modules.title })
    .from(modules)
    .where(and(eq(modules.id, values.moduleId), eq(modules.courseId, courseId)))
    .limit(1)
  if (!module) throw new ServiceError('invalid_input', 'Choose a module from this course.')

  const created = await useDb().transaction(async (tx) => {
    const [quiz] = await tx.insert(quizzes).values({ moduleId: values.moduleId, title: values.title, passingScore: values.passingScore }).returning()
    if (!quiz) throw new Error('The quiz was not created.')

    const insertedQuestions = await tx
      .insert(quizQuestions)
      .values(
        values.questions.map((question, index) => ({
          quizId: quiz.id,
          questionText: question.questionText,
          questionType: question.questionType,
          points: question.points.toFixed(2),
          explanation: question.explanation?.trim() || null,
          orderIndex: index
        }))
      )
      .returning()
    const questions = [...insertedQuestions].sort((left, right) => left.orderIndex - right.orderIndex)
    const optionValues = questions.flatMap((question, index) =>
      values.questions[index]!.options.map((option, optionIndex) => ({
        questionId: question.id,
        optionText: option.optionText,
        isCorrect: option.isCorrect,
        orderIndex: optionIndex
      }))
    )
    const options = optionValues.length > 0 ? await tx.insert(quizOptions).values(optionValues).returning() : []

    return { quiz, questions, options }
  })

  return toQuizSummary({
    quiz: created.quiz,
    courseId,
    moduleTitle: module.title,
    questions: created.questions,
    options: created.options,
    attempts: [],
    actorId: actor.id,
    includeInstructor: true
  })
}

/** Loads a quiz for a student, redacting correctness flags and explanations. */
export async function getQuizForStudent(quizId: string, actor: CourseActor): Promise<QuizDetailForStudent> {
  const { quiz, module, course } = await loadQuiz(quizId)
  const manages = canManageCourse(course.instructorId, actor)

  if (!manages) {
    if (course.status !== 'approved') throw new ServiceError('not_found')
    if (!(await isEnrolled(course.id, actor.id))) throw new ServiceError('forbidden')
  }

  const { questions, options } = await loadQuizStructure([quiz.id])
  const optionsByQuestion = groupOptionsByQuestion(options)
  const attempts = await useDb()
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.userId, actor.id)))

  return {
    quiz: toQuizSummary({
      quiz,
      courseId: course.id,
      moduleTitle: module.title,
      questions,
      options,
      attempts,
      actorId: actor.id,
      includeInstructor: false
    }),
    questions: questions.map((question) => toStudentQuestion(question, optionsByQuestion.get(question.id) ?? []))
  }
}

/** Returns an existing open attempt when the insert loses a unique race. */
function isOpenAttemptConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const candidate = error as { code?: unknown; constraint?: unknown; cause?: unknown }
  if (candidate.code === '23505' && (candidate.constraint === undefined || candidate.constraint === 'quiz_attempts_open_uidx')) return true
  return isOpenAttemptConflict(candidate.cause)
}

async function findOpenAttempt(quizId: string, userId: string): Promise<AttemptRow | undefined> {
  const [row] = await useDb()
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId), isNull(quizAttempts.submittedAt)))
    .limit(1)
  return row
}

/** Starts a quiz attempt, resuming the student's open attempt when one exists. */
export async function startQuizAttempt(quizId: string, actor: CourseActor): Promise<QuizAttemptDetail> {
  const { quiz, course } = await loadQuiz(quizId)
  if (course.status !== 'approved') throw new ServiceError('not_found')
  if (!canManageCourse(course.instructorId, actor) && !(await isEnrolled(course.id, actor.id))) throw new ServiceError('forbidden')

  const existing = await findOpenAttempt(quiz.id, actor.id)
  if (existing) return getQuizAttempt(existing.id, actor)

  try {
    const [attempt] = await useDb().insert(quizAttempts).values({ quizId: quiz.id, userId: actor.id }).returning()
    if (!attempt) throw new Error('The quiz attempt was not created.')
    return getQuizAttempt(attempt.id, actor)
  } catch (error) {
    if (!isOpenAttemptConflict(error)) throw error
    const reopened = await findOpenAttempt(quiz.id, actor.id)
    if (!reopened) throw error
    return getQuizAttempt(reopened.id, actor)
  }
}

/** Loads an attempt for its student or a course manager, grading it after submission. */
export async function getQuizAttempt(attemptId: string, actor: CourseActor): Promise<QuizAttemptDetail> {
  const { attempt, quiz, course } = await loadAttempt(attemptId)
  if (attempt.userId !== actor.id) assertCanManageCourse(course.instructorId, actor)

  const { questions, options } = await loadQuizStructure([quiz.id])
  const base: QuizAttemptDetail = {
    id: attempt.id,
    quizId: quiz.id,
    courseId: course.id,
    quizTitle: quiz.title,
    passingScore: quiz.passingScore,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: null,
    score: null,
    passed: null,
    earnedPoints: null,
    totalPoints: sumQuestionPoints(questions),
    results: null
  }
  if (attempt.submittedAt === null) return base

  const answers = await useDb().select().from(quizAnswers).where(eq(quizAnswers.attemptId, attempt.id))
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]))
  const optionsByQuestion = groupOptionsByQuestion(options)
  const results: QuizGradedAnswerItem[] = questions.map((question) => {
    const answer = answersByQuestion.get(question.id)
    const questionOptions = optionsByQuestion.get(question.id) ?? []
    return {
      questionId: question.id,
      questionText: question.questionText,
      questionType: question.questionType,
      points: Number(question.points),
      pointsEarned: answer ? Number(answer.pointsEarned) : 0,
      isCorrect: answer?.isCorrect ?? false,
      explanation: question.explanation,
      selectedOptionIds: answer?.selectedOptionIds ?? [],
      correctOptionIds: questionOptions.filter((option) => option.isCorrect).map((option) => option.id),
      options: questionOptions.map(toInstructorOption)
    }
  })

  return {
    ...base,
    submittedAt: attempt.submittedAt.toISOString(),
    score: Number(attempt.score),
    passed: Boolean(attempt.passed),
    earnedPoints: roundPoints(results.reduce((total, result) => total + result.pointsEarned, 0)),
    results
  }
}

interface GradedAnswer {
  questionId: string
  selectedOptionIds: string[]
  isCorrect: boolean
  pointsEarned: number
}

/** Grades one question by exact-match set equality against its correct options. */
function gradeAnswer(question: QuestionRow, questionOptions: OptionRow[], selectedOptionIds: string[]): GradedAnswer {
  const correctOptionIds = questionOptions.filter((option) => option.isCorrect).map((option) => option.id)
  const selected = new Set(selectedOptionIds)
  const isCorrect = selected.size === correctOptionIds.length && correctOptionIds.every((id) => selected.has(id))
  return {
    questionId: question.id,
    selectedOptionIds,
    isCorrect,
    pointsEarned: isCorrect ? Number(question.points) : 0
  }
}

/** Validates one submitted answer against its question's options. */
function validateAnswer(answer: SubmitQuizAttemptValues['answers'][number], question: QuestionRow, questionOptions: OptionRow[]) {
  if (new Set(answer.selectedOptionIds).size !== answer.selectedOptionIds.length) {
    throw new ServiceError('invalid_input', 'Duplicate selected options are not allowed.')
  }
  const optionIds = new Set(questionOptions.map((option) => option.id))
  if (answer.selectedOptionIds.some((optionId) => !optionIds.has(optionId))) {
    throw new ServiceError('invalid_input', 'Select options that belong to each question.')
  }
  if (question.questionType === 'mcq' && answer.selectedOptionIds.length !== 1) {
    throw new ServiceError('invalid_input', 'Multiple-choice questions allow only one selected option.')
  }
}

/** Validates, grades, and stores a submitted attempt once. */
export async function submitQuizAttempt(attemptId: string, values: SubmitQuizAttemptValues, actor: CourseActor): Promise<QuizAttemptDetail> {
  const { attempt, quiz } = await loadAttempt(attemptId)
  if (attempt.userId !== actor.id) throw new ServiceError('forbidden')
  if (attempt.submittedAt !== null) throw new ServiceError('conflict', 'This quiz attempt has already been submitted.')

  const { questions, options } = await loadQuizStructure([quiz.id])
  const optionsByQuestion = groupOptionsByQuestion(options)
  const answersByQuestion = new Map<string, SubmitQuizAttemptValues['answers'][number]>()
  for (const answer of values.answers) {
    if (answersByQuestion.has(answer.questionId)) throw new ServiceError('invalid_input', 'Duplicate question answers are not allowed.')
    answersByQuestion.set(answer.questionId, answer)
  }
  if (answersByQuestion.size !== questions.length || questions.some((question) => !answersByQuestion.has(question.id))) {
    throw new ServiceError('invalid_input', 'Answer every question before submitting.')
  }

  const graded = questions.map((question) => {
    const answer = answersByQuestion.get(question.id)!
    const questionOptions = optionsByQuestion.get(question.id) ?? []
    validateAnswer(answer, question, questionOptions)
    return gradeAnswer(question, questionOptions, answer.selectedOptionIds)
  })

  const totalPoints = sumQuestionPoints(questions)
  const earnedPoints = roundPoints(graded.reduce((total, answer) => total + answer.pointsEarned, 0))
  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10_000) / 100 : 0
  const passed = score >= quiz.passingScore

  await useDb().transaction(async (tx) => {
    const updated = await tx
      .update(quizAttempts)
      .set({ score: score.toFixed(2), passed, submittedAt: new Date() })
      .where(and(eq(quizAttempts.id, attempt.id), isNull(quizAttempts.submittedAt)))
      .returning({ id: quizAttempts.id })
    if (updated.length === 0) throw new ServiceError('conflict', 'This quiz attempt has already been submitted.')

    await tx.insert(quizAnswers).values(
      graded.map((answer) => ({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionIds: answer.selectedOptionIds,
        isCorrect: answer.isCorrect,
        pointsEarned: answer.pointsEarned.toFixed(2)
      }))
    )
  })

  return getQuizAttempt(attempt.id, actor)
}
