import { defineEventHandler } from 'nuxt/server'
import { setResponseHeader, type H3Event } from 'h3'
import { create as contentDisposition } from 'content-disposition'
import { getCertificateDownload } from '#server/services/achievements'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { certificateIdSchema } from '#shared/validation/achievements'

/**
 * Downloads an issued certificate as a PDF.
 *
 * The service enforces that only the recipient or an admin may read it. The PDF
 * is rendered on demand from the row, so the response is never cached and no
 * file has to be stored or kept in sync.
 */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const certificateId = parseParam(event, 'id', certificateIdSchema)

  return withServiceErrors(async () => {
    const { filename, pdf } = await getCertificateDownload(certificateId, { id: session.user.id, role: session.user.role })
    const h3Event = event as unknown as H3Event

    setResponseHeader(h3Event, 'Content-Type', 'application/pdf')
    setResponseHeader(h3Event, 'Content-Disposition', contentDisposition(filename))
    setResponseHeader(h3Event, 'Cache-Control', 'private, no-store')
    setResponseHeader(h3Event, 'X-Content-Type-Options', 'nosniff')
    setResponseHeader(h3Event, 'Content-Length', pdf.length)

    return pdf
  })
})
