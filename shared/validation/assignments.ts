import { z } from 'zod'

export const assignmentIdSchema = z.uuid('Invalid assignment ID.')
export const assignmentSubmissionIdSchema = z.uuid('Invalid submission ID.')

export const assignmentRubricCriterionSchema = z.object({
  description: z.string().trim().min(1, 'Describe this rubric criterion.').max(300, 'Keep the criterion under 300 characters.'),
  points: z.number().positive('Enter more than 0 points.').max(100, 'Use 100 points or fewer.').multipleOf(0.01, 'Use at most two decimal places.')
})

export const createAssignmentSchema = z
  .object({
    title: z.string().trim().min(1, 'Enter an assignment title.').max(200, 'Keep the title under 200 characters.'),
    instructions: z.string().trim().min(1, 'Enter assignment instructions.').max(20_000, 'Keep the instructions under 20,000 characters.'),
    rubric: z.array(assignmentRubricCriterionSchema).min(1, 'Add at least one rubric criterion.').max(20, 'Use 20 rubric criteria or fewer.'),
    dueAt: z.iso.datetime({ offset: true, error: 'Choose a valid deadline.' })
  })
  .refine((value) => value.rubric.reduce((total, criterion) => total + criterion.points, 0) <= 100, {
    path: ['rubric'],
    message: 'Rubric points cannot total more than 100.'
  })

export const gradeAssignmentSubmissionSchema = z.object({
  grade: z.number().min(0, 'The score cannot be negative.').max(100, 'The score cannot exceed 100.').multipleOf(0.01, 'Use at most two decimal places.'),
  feedback: z.string().trim().max(10_000, 'Keep feedback under 10,000 characters.').nullable().optional()
})

export type CreateAssignmentValues = z.output<typeof createAssignmentSchema>
export type GradeAssignmentSubmissionValues = z.output<typeof gradeAssignmentSubmissionSchema>
export type AssignmentRubricCriterion = z.output<typeof assignmentRubricCriterionSchema>
