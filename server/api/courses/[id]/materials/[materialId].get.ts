import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { createError, getRequestHeader, sendStream, setResponseHeader, type H3Event } from 'h3'
import { create as contentDisposition } from 'content-disposition'
import rangeParser from 'range-parser'
import { getCourseMaterialFile } from '#server/services/course-materials'
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
    const h3Event = event as unknown as H3Event
    const { material, filePath } = await getCourseMaterialFile(courseId, materialId, { id: session.user.id, role: session.user.role })
    const details = await stat(filePath)
    const isVideo = material.contentType.startsWith('video/')
    const rangeHeader = isVideo ? getRequestHeader(h3Event, 'range') : undefined

    setResponseHeader(h3Event, 'Content-Type', material.contentType)
    setResponseHeader(h3Event, 'Content-Disposition', contentDisposition(material.originalFilename, { type: isVideo ? 'inline' : 'attachment' }))
    setResponseHeader(h3Event, 'Cache-Control', 'private, no-store')
    setResponseHeader(h3Event, 'X-Content-Type-Options', 'nosniff')
    if (isVideo) setResponseHeader(h3Event, 'Accept-Ranges', 'bytes')

    if (!rangeHeader) {
      setResponseHeader(h3Event, 'Content-Length', details.size)
      return sendStream(h3Event, createReadStream(filePath))
    }

    const ranges = rangeParser(details.size, rangeHeader, { combine: true })
    if (ranges === -1 || ranges === -2 || ranges.type !== 'bytes' || ranges.length === 0) {
      setResponseHeader(h3Event, 'Content-Range', `bytes */${details.size}`)
      throw createError({ statusCode: 416, statusMessage: 'Requested range is not satisfiable.' })
    }

    const { start, end } = ranges[0]!
    setResponseStatus(event, 206)
    setResponseHeader(h3Event, 'Content-Range', `bytes ${start}-${end}/${details.size}`)
    setResponseHeader(h3Event, 'Content-Length', end - start + 1)
    return sendStream(h3Event, createReadStream(filePath, { start, end }))
  })
})
