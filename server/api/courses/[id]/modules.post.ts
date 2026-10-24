import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { addModuleSchema, courseIdSchema } from '#shared/validation/courses'
import { addModule } from '#server/services/courses/commands'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseBody, parseParam } from '#server/utils/validate'

/**
 * Appends a module to a course.
 *
 * Lectures are added separately, once the storage service can accept the
 * video upload.
 */
export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await parseBody(event, addModuleSchema)

  return withServiceErrors(async () => {
    const module = await addModule(courseId, body, {
      id: session.user.id,
      role: session.user.role
    })

    setResponseStatus(event, 201)

    return module
  })
})
