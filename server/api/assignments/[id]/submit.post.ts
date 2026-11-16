import { createError, defineEventHandler, setResponseStatus } from 'nuxt/server'
import { MAX_ASSIGNMENT_FILE_BYTES, submitAssignment } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { assignmentIdSchema } from '#shared/validation/assignments'

const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'student')
  const assignmentId = parseParam(event, 'id', assignmentIdSchema)
  const contentType = event.req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    throw createError({ status: 400, statusText: 'Upload one assignment file.' })
  }
  const contentLengthHeader = event.req.headers.get('content-length')
  const contentLength = Number(contentLengthHeader)
  if (!contentLengthHeader || !Number.isSafeInteger(contentLength) || contentLength < 1) {
    throw createError({ status: 411, statusText: 'Content-Length is required for file uploads.' })
  }
  if (contentLength > MAX_ASSIGNMENT_FILE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES) {
    throw createError({ status: 413, statusText: 'Files must be 100 MiB or smaller.' })
  }
  const parts = [...(await event.req.formData())]
  const part = parts[0]
  if (parts.length !== 1 || !part || part[0] !== 'file' || typeof part[1] === 'string') {
    throw createError({ status: 400, statusText: 'Upload exactly one assignment file.' })
  }
  const upload = part[1]
  if (upload.size > MAX_ASSIGNMENT_FILE_BYTES) {
    throw createError({ status: 413, statusText: 'Files must be 100 MiB or smaller.' })
  }
  const file = { filename: upload.name, data: Buffer.from(await upload.arrayBuffer()) }
  return withServiceErrors(async () => {
    const submission = await submitAssignment(assignmentId, file, { id: session.user.id, role: session.user.role })
    setResponseStatus(event, 201)
    return submission
  })
})
