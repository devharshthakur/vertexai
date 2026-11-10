import { defineEventHandler } from 'nuxt/server'
import { listCourseMaterials } from '#server/services/course-materials'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)

  return withServiceErrors(() => listCourseMaterials(courseId, { id: session.user.id, role: session.user.role }))
})
