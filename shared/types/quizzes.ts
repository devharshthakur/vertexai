import type { QuizQuestionType } from '#shared/validation/quizzes'

export interface QuizAttemptLatestSummary {
  id: string
  score: number
  passed: boolean
  submittedAt: string
}

export interface QuizStudentSummary {
  id: string
  moduleId: string
  moduleTitle: string
  courseId: string
  title: string
  passingScore: number
  questionCount: number
  totalPoints: number
  createdAt: string
  latestAttempt: QuizAttemptLatestSummary | null
  openAttemptId: string | null
  instructor: {
    attemptCount: number
    passCount: number
    questions: QuizInstructorQuestion[]
  } | null
}

export interface QuizInstructorOption {
  id: string
  optionText: string
  isCorrect: boolean
  orderIndex: number
}

export interface QuizInstructorQuestion {
  id: string
  questionText: string
  questionType: QuizQuestionType
  points: number
  explanation: string | null
  orderIndex: number
  options: QuizInstructorOption[]
}

export interface QuizInstructorSummary {
  id: string
  moduleId: string
  moduleTitle: string
  courseId: string
  title: string
  passingScore: number
  questionCount: number
  totalPoints: number
  attemptCount: number
  passCount: number
  createdAt: string
  questions: QuizInstructorQuestion[]
}

export interface QuizStudentOption {
  id: string
  optionText: string
  orderIndex: number
}

export interface QuizStudentQuestion {
  id: string
  questionText: string
  questionType: QuizQuestionType
  points: number
  orderIndex: number
  options: QuizStudentOption[]
}

export interface QuizDetailForStudent {
  quiz: QuizStudentSummary
  questions: QuizStudentQuestion[]
}

export interface QuizGradedAnswerItem {
  questionId: string
  questionText: string
  questionType: QuizQuestionType
  points: number
  pointsEarned: number
  isCorrect: boolean
  explanation: string | null
  selectedOptionIds: string[]
  correctOptionIds: string[]
  options: QuizInstructorOption[]
}

export interface QuizAttemptDetail {
  id: string
  quizId: string
  courseId: string
  quizTitle: string
  passingScore: number
  startedAt: string
  submittedAt: string | null
  score: number | null
  passed: boolean | null
  earnedPoints: number | null
  totalPoints: number
  results: QuizGradedAnswerItem[] | null
}
