import { createError, defineEventHandler, setResponseStatus } from 'nuxt/server'
import { addCourseMaterial } from '#server/services/courses/materials'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { courseMaterialUploadFieldsSchema, MAX_COURSE_MATERIAL_BYTES } from '#shared/validation/course-materials'

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024

function invalidMultipartRequest() {
  return createError({ status: 400, statusText: 'Upload one material file and its module details.' })
}

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const contentType = event.req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) throw invalidMultipartRequest()

  const contentLengthHeader = event.req.headers.get('content-length')
  const contentLength = Number(contentLengthHeader)
  if (!contentLengthHeader || !Number.isSafeInteger(contentLength) || contentLength < 1) {
    throw createError({ status: 411, statusText: 'Content-Length is required for file uploads.' })
  }
  if (contentLength > MAX_COURSE_MATERIAL_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    throw createError({ status: 413, statusText: 'Files must be 100 MiB or smaller.' })
  }

  const parts = [...(await event.req.formData())]
  if (parts.length < 2 || parts.length > 3) throw invalidMultipartRequest()

  const values: Record<string, string> = {}
  let upload: File | undefined

  for (const [name, value] of parts) {
    if (typeof value !== 'string') {
      if (name !== 'file' || upload) throw invalidMultipartRequest()
      upload = value
      continue
    }
    if ((name !== 'moduleId' && name !== 'lectureId') || values[name] !== undefined) {
      throw invalidMultipartRequest()
    }
    values[name] = value
  }

  if (!upload) {
    throw createError({ status: 400, statusText: 'Choose one file to upload.' })
  }
  if (upload.size > MAX_COURSE_MATERIAL_BYTES) {
    throw createError({ status: 413, statusText: 'Files must be 100 MiB or smaller.' })
  }

  const parsedFields = courseMaterialUploadFieldsSchema.safeParse(values)
  if (!parsedFields.success) {
    throw createError({ status: 400, statusText: 'Choose a valid module and lecture.', data: { issues: parsedFields.error.issues } })
  }

  const file = { filename: upload.name, data: Buffer.from(await upload.arrayBuffer()) }

  return withServiceErrors(async () => {
    const material = await addCourseMaterial(courseId, parsedFields.data, file, { id: session.user.id, role: session.user.role })
    setResponseStatus(event, 201)
    return material
  })
})
