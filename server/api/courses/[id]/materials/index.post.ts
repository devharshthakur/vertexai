import { createError, defineEventHandler, setResponseStatus } from 'nuxt/server'
import { addCourseMaterial } from '#server/services/courses/materials'
import { withServiceErrors } from '#server/utils/errors'
import { cleanupMultipartUploads, readMultipartUpload } from '#server/utils/multipart'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { courseMaterialUploadFieldsSchema, MAX_COURSE_MATERIAL_BYTES } from '#shared/validation/course-materials'

function invalidMultipartRequest() {
  return createError({ status: 400, statusText: 'Upload one material file and its module details.' })
}

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const upload = await readMultipartUpload(event, {
    maxFileBytes: MAX_COURSE_MATERIAL_BYTES,
    maxFiles: 1,
    maxFields: 2,
    maxParts: 3,
    invalidMessage: 'Upload one material file and its module details.',
    tooLargeMessage: 'Files must be 100 MiB or smaller.'
  })

  try {
    const { fields, files } = upload
    const file = files[0]
    if (files.length !== 1 || !file || file.fieldName !== 'file') throw invalidMultipartRequest()

    const parsedFields = courseMaterialUploadFieldsSchema.safeParse(fields)
    if (!parsedFields.success) {
      throw createError({ status: 400, statusText: 'Choose a valid module and lecture.', data: { issues: parsedFields.error.issues } })
    }

    return await withServiceErrors(async () => {
      const material = await addCourseMaterial(courseId, parsedFields.data, file, { id: session.user.id, role: session.user.role })
      setResponseStatus(event, 201)
      return material
    })
  } catch (error) {
    await cleanupMultipartUploads(upload.files)
    throw error
  }
})
