import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { createError, defineEventHandler } from 'nuxt/server'
import { create as contentDisposition } from 'content-disposition'
import rangeParser from 'range-parser'
import { getCourseMaterialFile } from '#server/services/courses/materials'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { courseMaterialIdSchema } from '#shared/validation/course-materials'

/**
 * Streams a course material with its stored content type.
 *
 * Access is decided by the service. Documents download; videos play inline and
 * answer `Range` requests so the player can seek, which is the only reason this
 * route needs to parse the header itself.
 */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const materialId = parseParam(event, 'materialId', courseMaterialIdSchema)

  return withServiceErrors(async () => {
    const { material, filePath } = await getCourseMaterialFile(courseId, materialId, { id: session.user.id, role: session.user.role })
    const details = await stat(filePath)
    const isVideo = material.contentType.startsWith('video/')
    const rangeHeader = isVideo ? event.req.headers.get('range') : undefined

    event.res.headers.set('Content-Type', material.contentType)
    event.res.headers.set('Content-Disposition', contentDisposition(material.originalFilename, { type: isVideo ? 'inline' : 'attachment' }))
    event.res.headers.set('Cache-Control', 'private, no-store')
    event.res.headers.set('X-Content-Type-Options', 'nosniff')
    if (isVideo) event.res.headers.set('Accept-Ranges', 'bytes')

    if (!rangeHeader) {
      event.res.headers.set('Content-Length', String(details.size))
      return Readable.toWeb(createReadStream(filePath))
    }

    const ranges = rangeParser(details.size, rangeHeader, { combine: true })
    if (ranges === -1 || ranges === -2 || ranges.type !== 'bytes' || ranges.length === 0) {
      event.res.headers.set('Content-Range', `bytes */${details.size}`)
      throw createError({ status: 416, statusText: 'Requested range is not satisfiable.' })
    }

    const { start, end } = ranges[0]!
    event.res.status = 206
    event.res.headers.set('Content-Range', `bytes ${start}-${end}/${details.size}`)
    event.res.headers.set('Content-Length', String(end - start + 1))
    return Readable.toWeb(createReadStream(filePath, { start, end }))
  })
})
