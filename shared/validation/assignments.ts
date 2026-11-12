import { z } from 'zod'

export const assignmentIdSchema = z.uuid('Invalid assignment ID.')
export const assignmentSubmissionIdSchema = z.uuid('Invalid submission ID.')

export const assignmentRubricCriterionSchema = z.object({
  description: z.string().trim().min(1).max(300),
  points: z.number().positive().max(100).multipleOf(0.01)
})

export const createAssignmentSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    instructions: z.string().trim().min(1).max(20_000),
    rubric: z.array(assignmentRubricCriterionSchema).min(1).max(20),
    dueAt: z.iso.datetime({ offset: true })
  })
  .refine((value) => value.rubric.reduce((total, criterion) => total + criterion.points, 0) <= 100, {
    path: ['rubric'],
    message: 'Rubric points cannot total more than 100.'
  })

export const gradeAssignmentSubmissionSchema = z.object({
  grade: z.number().min(0).max(100).multipleOf(0.01),
  feedback: z.string().trim().max(10_000).nullable().optional()
})

export type CreateAssignmentValues = z.output<typeof createAssignmentSchema>
export type GradeAssignmentSubmissionValues = z.output<typeof gradeAssignmentSubmissionSchema>
export type AssignmentRubricCriterion = z.output<typeof assignmentRubricCriterionSchema>
