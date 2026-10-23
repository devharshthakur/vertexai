import { defineEventHandler } from 'nuxt/server'
import { courseIdSchema } from '#shared/validation/courses'
import { getCourse } from '#server/services/course-service'
import { toHttpError } from '#server/utils/errors'
import { optionalSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'

/**
 * A course with its curriculum.
 *
 * The route is public: approved courses are readable by anyone. A course that
 * is still pending is readable by its own instructor and by admins, which is
 * why the session is optional here.
 */
export default defineEventHandler(async (event) => {
  const courseId = parseParam(event, 'id', courseIdSchema)
  const session = await optionalSession(event)

  try {
    return await getCourse(courseId, {
      id: session?.user.id,
      role: session?.user.role
    })
  } catch (error) {
    throw toHttpError(error)
  }
})
