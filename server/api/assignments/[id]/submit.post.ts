import { createError, defineEventHandler, setResponseStatus } from 'nuxt/server'
import { getRequestHeader, readMultipartFormData, type H3Event } from 'h3'
import { MAX_ASSIGNMENT_FILE_BYTES, submitAssignment } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { assignmentIdSchema } from '#shared/validation/assignments'

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'student')
  const assignmentId = parseParam(event, 'id', assignmentIdSchema)
  const h3Event = event as unknown as H3Event
  const contentType = getRequestHeader(h3Event, 'content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    throw createError({ statusCode: 400, statusMessage: 'Upload one assignment file.' })
  }
  const contentLengthHeader = getRequestHeader(h3Event, 'content-length')
  const contentLength = Number(contentLengthHeader)
  if (!contentLengthHeader || !Number.isSafeInteger(contentLength) || contentLength < 1) {
    throw createError({ statusCode: 411, statusMessage: 'Content-Length is required for file uploads.' })
  }
  if (contentLength > MAX_ASSIGNMENT_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Files must be 100 MiB or smaller.' })
  }
  const parts = await readMultipartFormData(h3Event)
  if (!parts || parts.length !== 1 || parts[0]?.name !== 'file' || parts[0].filename === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'Upload exactly one assignment file.' })
  }
  const file = parts[0]
  if (file.data.length > MAX_ASSIGNMENT_FILE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Files must be 100 MiB or smaller.' })
  }
  return withServiceErrors(async () => {
    const submission = await submitAssignment(assignmentId, { filename: file.filename!, data: file.data }, { id: session.user.id, role: session.user.role })
    setResponseStatus(event, 201)
    return submission
  })
})
