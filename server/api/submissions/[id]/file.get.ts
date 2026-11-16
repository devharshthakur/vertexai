import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { defineEventHandler } from 'nuxt/server'
import { create as contentDisposition } from 'content-disposition'
import { getAssignmentSubmissionFile } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { assignmentSubmissionIdSchema } from '#shared/validation/assignments'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const submissionId = parseParam(event, 'id', assignmentSubmissionIdSchema)
  return withServiceErrors(async () => {
    const actor = { id: session.user.id, role: session.user.role }
    const { submission, filePath } = await getAssignmentSubmissionFile(submissionId, actor)
    const details = await stat(filePath)
    event.res.headers.set('Content-Type', submission.contentType)
    event.res.headers.set('Content-Disposition', contentDisposition(submission.originalFilename))
    event.res.headers.set('Cache-Control', 'private, no-store')
    event.res.headers.set('X-Content-Type-Options', 'nosniff')
    event.res.headers.set('Content-Length', String(details.size))
    return Readable.toWeb(createReadStream(filePath))
  })
})
