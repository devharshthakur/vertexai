import { createError, defineEventHandler, setResponseStatus } from 'nuxt/server'
import { MAX_ASSIGNMENT_FILE_BYTES, submitAssignment } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { cleanupMultipartUploads, readMultipartUpload } from '#server/utils/multipart'
import { requireRole } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { assignmentIdSchema } from '#shared/validation/assignments'

export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'student')
  const assignmentId = parseParam(event, 'id', assignmentIdSchema)
  const upload = await readMultipartUpload(event, {
    maxFileBytes: MAX_ASSIGNMENT_FILE_BYTES,
    maxFiles: 1,
    maxFields: 0,
    maxParts: 1,
    invalidMessage: 'Upload exactly one assignment file.',
    tooLargeMessage: 'Files must be 100 MiB or smaller.'
  })

  try {
    const file = upload.files[0]
    if (upload.files.length !== 1 || !file || file.fieldName !== 'file') {
      throw createError({ status: 400, statusText: 'Upload exactly one assignment file.' })
    }

    return await withServiceErrors(async () => {
      const submission = await submitAssignment(assignmentId, file, { id: session.user.id, role: session.user.role })
      setResponseStatus(event, 201)
      return submission
    })
  } catch (error) {
    await cleanupMultipartUploads(upload.files)
    throw error
  }
})
