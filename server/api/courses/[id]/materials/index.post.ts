import { createError, defineEventHandler, setResponseStatus } from 'nuxt/server'
import { getRequestHeader, readMultipartFormData, type H3Event } from 'h3'
import { addCourseMaterial } from '#server/services/course-materials'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { courseMaterialUploadFieldsSchema, MAX_COURSE_MATERIAL_BYTES } from '#shared/validation/course-materials'

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024

function invalidMultipartRequest() {
  return createError({ statusCode: 400, statusMessage: 'Upload one material file and its module details.' })
}

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'instructor', 'admin')
  const courseId = parseParam(event, 'id', courseIdSchema)
  const h3Event = event as unknown as H3Event
  const contentType = getRequestHeader(h3Event, 'content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) throw invalidMultipartRequest()

  const contentLengthHeader = getRequestHeader(h3Event, 'content-length')
  const contentLength = Number(contentLengthHeader)
  if (!contentLengthHeader || !Number.isSafeInteger(contentLength) || contentLength < 1) {
    throw createError({ statusCode: 411, statusMessage: 'Content-Length is required for file uploads.' })
  }
  if (contentLength > MAX_COURSE_MATERIAL_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Files must be 100 MiB or smaller.' })
  }

  const parts = await readMultipartFormData(h3Event)
  if (!parts || parts.length < 2 || parts.length > 3) throw invalidMultipartRequest()

  const values: Record<string, string> = {}
  let file: { filename: string; data: Buffer } | undefined

  for (const part of parts) {
    if (!part.name) throw invalidMultipartRequest()
    if (part.name === 'file' && part.filename !== undefined && !file) {
      file = { filename: part.filename, data: part.data }
      continue
    }
    if ((part.name !== 'moduleId' && part.name !== 'lectureId') || part.filename !== undefined || values[part.name] !== undefined) {
      throw invalidMultipartRequest()
    }
    values[part.name] = part.data.toString('utf8')
  }

  if (!file || file.data.length > MAX_COURSE_MATERIAL_BYTES) {
    throw createError({ statusCode: file ? 413 : 400, statusMessage: file ? 'Files must be 100 MiB or smaller.' : 'Choose one file to upload.' })
  }

  const parsedFields = courseMaterialUploadFieldsSchema.safeParse(values)
  if (!parsedFields.success) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid module and lecture.', data: { issues: parsedFields.error.issues } })
  }

  return withServiceErrors(async () => {
    const material = await addCourseMaterial(courseId, parsedFields.data, file!, { id: session.user.id, role: session.user.role })
    setResponseStatus(event, 201)
    return material
  })
})
