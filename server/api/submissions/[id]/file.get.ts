import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { defineEventHandler } from 'nuxt/server'
import { sendStream, setResponseHeader, type H3Event } from 'h3'
import { getAssignmentSubmissionFile } from '#server/services/assignments'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { assignmentSubmissionIdSchema } from '#shared/validation/assignments'

function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const submissionId = parseParam(event, 'id', assignmentSubmissionIdSchema)
  return withServiceErrors(async () => {
    const actor = { id: session.user.id, role: session.user.role }
    const { submission, filePath } = await getAssignmentSubmissionFile(submissionId, actor)
    const details = await stat(filePath)
    const h3Event = event as unknown as H3Event
    setResponseHeader(h3Event, 'Content-Type', submission.contentType)
    setResponseHeader(h3Event, 'Content-Disposition', contentDisposition(submission.originalFilename))
    setResponseHeader(h3Event, 'Cache-Control', 'private, no-store')
    setResponseHeader(h3Event, 'X-Content-Type-Options', 'nosniff')
    setResponseHeader(h3Event, 'Content-Length', details.size)
    return sendStream(h3Event, createReadStream(filePath))
  })
})
