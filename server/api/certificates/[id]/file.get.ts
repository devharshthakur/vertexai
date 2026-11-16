import { defineEventHandler } from 'nuxt/server'
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

    event.res.headers.set('Content-Type', 'application/pdf')
    event.res.headers.set('Content-Disposition', contentDisposition(filename))
    event.res.headers.set('Cache-Control', 'private, no-store')
    event.res.headers.set('X-Content-Type-Options', 'nosniff')
    event.res.headers.set('Content-Length', String(pdf.length))

    return new Response(new Uint8Array(pdf))
  })
})
