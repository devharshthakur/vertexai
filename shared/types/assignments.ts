import type { AssignmentRubricCriterion } from '#shared/validation/assignments'

export interface AssignmentSubmissionSummary {
  id: string
  originalFilename: string
  contentType: string
  sizeBytes: number
  submittedAt: string
  grade: number | null
  feedback: string | null
  gradedAt: string | null
}

export interface AssignmentSummary {
  id: string
  courseId: string
  title: string
  instructions: string
  rubric: AssignmentRubricCriterion[]
  dueAt: string
  createdAt: string
  submission: AssignmentSubmissionSummary | null
}

export interface AssignmentInstructorSummary extends AssignmentSummary {
  submissionCount: number
}

export interface AssignmentInstructorSubmission extends AssignmentSubmissionSummary {
  student: { id: string; name: string; email: string }
}
