import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { createCourseAssignment } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { createAssignmentSchema } from '#shared/validation/assignments'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await parseBody(event, createAssignmentSchema)
  return withServiceErrors(async () => {
    const assignment = await createCourseAssignment(courseId, body, { id: session.user.id, role: session.user.role })
    setResponseStatus(event, 201)
    return assignment
  })
})
