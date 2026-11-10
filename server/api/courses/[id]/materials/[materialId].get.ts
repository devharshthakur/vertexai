import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { defineEventHandler, setResponseStatus } from 'nuxt/server'
import { createError, getRequestHeader, sendStream, setResponseHeader, type H3Event } from 'h3'
import { getCourseMaterialFile } from '#server/services/course-materials'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { courseIdSchema } from '#shared/validation/courses'
import { courseMaterialIdSchema } from '#shared/validation/course-materials'

function contentDisposition(filename: string, inline: boolean): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `${inline ? 'inline' : 'attachment'}; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

function parseVideoRange(header: string, size: number, event: Parameters<typeof setResponseHeader>[0]): { start: number; end: number } {
  const rangeError = (): never => {
    setResponseHeader(event, 'Content-Range', `bytes */${size}`)
    throw createError({ statusCode: 416, statusMessage: 'Requested range is not satisfiable.' })
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match) return rangeError()
  if (!match[1] && !match[2]) return rangeError()

  let start: number
  let end: number
  if (!match[1]) {
    const suffixLength = Number(match[2])
    start = Math.max(0, size - suffixLength)
    end = size - 1
  } else {
    start = Number(match[1])
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || start > end) {
    rangeError()
  }

  return { start, end }
}

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
    setResponseHeader(h3Event, 'Content-Disposition', contentDisposition(material.originalFilename, isVideo))
    setResponseHeader(h3Event, 'Cache-Control', 'private, no-store')
    setResponseHeader(h3Event, 'X-Content-Type-Options', 'nosniff')
    if (isVideo) setResponseHeader(h3Event, 'Accept-Ranges', 'bytes')

    if (!rangeHeader) {
      setResponseHeader(h3Event, 'Content-Length', details.size)
      return sendStream(h3Event, createReadStream(filePath))
    }

    const { start, end } = parseVideoRange(rangeHeader, details.size, h3Event)
    setResponseStatus(event, 206)
    setResponseHeader(h3Event, 'Content-Range', `bytes ${start}-${end}/${details.size}`)
    setResponseHeader(h3Event, 'Content-Length', end - start + 1)
    return sendStream(h3Event, createReadStream(filePath, { start, end }))
  })
})
