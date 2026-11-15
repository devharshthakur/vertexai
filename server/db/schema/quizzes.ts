import { relations, sql } from 'drizzle-orm'
import { boolean, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { modules } from './courses'
import { QUIZ_QUESTION_TYPES } from '../../../shared/validation/quizzes'

/**
 * Objective quizzes: `quizzes` → `quiz_questions` → `quiz_options`, with
 * `quiz_attempts` → `quiz_answers` recording student submissions.
 *
 * New tables use UUID primary keys, while the foreign key to `users` stays
 * **text** because Better Auth migrated `users.id` as text. `question_type`
 * is a plain varchar column; the allowed values live in
 * `shared/validation/quizzes.ts` so the browser and server validate from one
 * source of truth.
 *
 * `quiz_attempts_open_uidx` is a partial unique index: a student may hold only
 * one unsubmitted attempt per quiz, while submitted attempts leave the index
 * and allow retakes. `quiz_answers.selected_option_ids` stores the UUIDs of the
 * selected options so multi-select answers survive without a join table.
 */
export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    passingScore: integer('passing_score').default(70).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [index('quizzes_moduleId_idx').on(table.moduleId)]
)

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull(),
    questionType: varchar('question_type', { length: 20, enum: QUIZ_QUESTION_TYPES }).notNull(),
    points: numeric('points', { precision: 5, scale: 2 }).default('1').notNull(),
    explanation: text('explanation'),
    orderIndex: integer('order_index').notNull()
  },
  (table) => [index('quiz_questions_quizId_orderIndex_idx').on(table.quizId, table.orderIndex)]
)

export const quizOptions = pgTable(
  'quiz_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => quizQuestions.id, { onDelete: 'cascade' }),
    optionText: text('option_text').notNull(),
    isCorrect: boolean('is_correct').default(false).notNull(),
    orderIndex: integer('order_index').notNull()
  },
  (table) => [index('quiz_options_questionId_orderIndex_idx').on(table.questionId, table.orderIndex)]
)

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: numeric('score', { precision: 5, scale: 2 }),
    passed: boolean('passed'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('quiz_attempts_open_uidx')
      .on(table.quizId, table.userId)
      .where(sql`${table.submittedAt} IS NULL`),
    index('quiz_attempts_quizId_userId_idx').on(table.quizId, table.userId),
    index('quiz_attempts_userId_idx').on(table.userId)
  ]
)

export const quizAnswers = pgTable(
  'quiz_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => quizAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => quizQuestions.id, { onDelete: 'cascade' }),
    selectedOptionIds: uuid('selected_option_ids')
      .array()
      .default(sql`'{}'::uuid[]`)
      .notNull(),
    isCorrect: boolean('is_correct').notNull(),
    pointsEarned: numeric('points_earned', { precision: 5, scale: 2 }).notNull()
  },
  (table) => [uniqueIndex('quiz_answers_attemptId_questionId_uidx').on(table.attemptId, table.questionId), index('quiz_answers_attemptId_idx').on(table.attemptId)]
)

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  module: one(modules, {
    fields: [quizzes.moduleId],
    references: [modules.id]
  }),
  questions: many(quizQuestions),
  attempts: many(quizAttempts)
}))

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizQuestions.quizId],
    references: [quizzes.id]
  }),
  options: many(quizOptions),
  answers: many(quizAnswers)
}))

export const quizOptionsRelations = relations(quizOptions, ({ one }) => ({
  question: one(quizQuestions, {
    fields: [quizOptions.questionId],
    references: [quizQuestions.id]
  })
}))

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id]
  }),
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id]
  }),
  answers: many(quizAnswers)
}))

export const quizAnswersRelations = relations(quizAnswers, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [quizAnswers.attemptId],
    references: [quizAttempts.id]
  }),
  question: one(quizQuestions, {
    fields: [quizAnswers.questionId],
    references: [quizQuestions.id]
  })
}))
