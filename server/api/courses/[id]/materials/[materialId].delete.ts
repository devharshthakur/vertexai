import { defineEventHandler } from 'nuxt/server'
import { removeCourseMaterial } from '#server/services/course-materials'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { courseMaterialIdSchema } from '#shared/validation/course-materials'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const materialId = parseParam(event, 'materialId', courseMaterialIdSchema)

  return withServiceErrors(async () => {
    await removeCourseMaterial(courseId, materialId, { id: session.user.id, role: session.user.role })
    return { deleted: true }
  })
})
