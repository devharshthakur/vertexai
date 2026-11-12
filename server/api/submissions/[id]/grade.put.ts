import { defineEventHandler } from 'nuxt/server'
import { gradeAssignmentSubmission } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { assignmentSubmissionIdSchema, gradeAssignmentSubmissionSchema } from '#shared/validation/assignments'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const submissionId = parseParam(event, 'id', assignmentSubmissionIdSchema)
  const body = await parseBody(event, gradeAssignmentSubmissionSchema)
  return withServiceErrors(() => gradeAssignmentSubmission(submissionId, body, { id: session.user.id, role: session.user.role }))
})
