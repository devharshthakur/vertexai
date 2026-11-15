import { z } from 'zod'

export const QUIZ_QUESTION_TYPES = ['mcq', 'multi_select'] as const
export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPES)[number]

export const quizIdSchema = z.uuid('Invalid quiz ID.')
export const quizAttemptIdSchema = z.uuid('Invalid quiz attempt ID.')

export const createQuizOptionSchema = z.object({
  optionText: z.string().trim().min(1, 'Enter option text.').max(500, 'Keep the option under 500 characters.'),
  isCorrect: z.boolean()
})

export const createQuizQuestionSchema = z
  .object({
    questionText: z.string().trim().min(1, 'Enter a question prompt.').max(2_000, 'Keep the question under 2,000 characters.'),
    questionType: z.enum(QUIZ_QUESTION_TYPES, { error: 'Choose a valid question type.' }),
    points: z.number().positive('Enter more than 0 points.').max(100, 'Use 100 points or fewer.').multipleOf(0.01, 'Use at most two decimal places.'),
    explanation: z.string().trim().max(2_000, 'Keep the explanation under 2,000 characters.').nullable().optional(),
    options: z.array(createQuizOptionSchema).min(2, 'Add at least two options.').max(8, 'Use 8 options or fewer.')
  })
  .superRefine((question, ctx) => {
    const correctCount = question.options.filter((option) => option.isCorrect).length
    if (question.questionType === 'mcq' && correctCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Multiple-choice questions must have exactly one correct option.'
      })
    } else if (question.questionType === 'multi_select' && correctCount < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Multi-select questions must have at least one correct option.'
      })
    }
  })

export const createQuizSchema = z.object({
  moduleId: z.uuid('Choose a valid module.'),
  title: z.string().trim().min(1, 'Enter a quiz title.').max(200, 'Keep the title under 200 characters.'),
  passingScore: z.number().int('Enter a whole-number percentage.').min(1, 'Passing score must be at least 1%.').max(100, 'Passing score cannot exceed 100%.'),
  questions: z.array(createQuizQuestionSchema).min(1, 'Add at least one question.').max(30, 'Use 30 questions or fewer.')
})

export const submitQuizAnswerSchema = z.object({
  questionId: z.uuid('Invalid question ID.'),
  selectedOptionIds: z.array(z.uuid('Invalid option ID.')).min(1, 'Select at least one option.').max(8, 'Too many options selected.')
})

export const submitQuizAttemptSchema = z.object({
  answers: z.array(submitQuizAnswerSchema).min(1, 'Answer every question before submitting.')
})

export type CreateQuizOptionValues = z.output<typeof createQuizOptionSchema>
export type CreateQuizQuestionValues = z.output<typeof createQuizQuestionSchema>
export type CreateQuizValues = z.output<typeof createQuizSchema>
export type SubmitQuizAnswerValues = z.output<typeof submitQuizAnswerSchema>
export type SubmitQuizAttemptValues = z.output<typeof submitQuizAttemptSchema>
