import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { createTextStreamResponse, toTextStream } from 'ai'
import { startLectureSummary } from '#server/services/ai/summary'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { lectureSummaryRequestSchema } from '#shared/validation/ai'
import { courseIdSchema, lectureIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const lectureId = parseParam(event, 'lectureId', lectureIdSchema)
  const body = await readValidatedBody(event, lectureSummaryRequestSchema)
  const summary = await withServiceErrors(() => startLectureSummary(courseId, lectureId, body, { id: session.user.id, role: session.user.role }, event.req.signal))

  if (summary.kind === 'cached') {
    return createTextStreamResponse({ stream: singleTextStream(summary.summary) })
  }

  return createTextStreamResponse({ stream: toTextStream({ stream: summary.result.stream }) })
})

/** Streams a cached summary through the same text response shape as a fresh one. */
function singleTextStream(text: string): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text)
      controller.close()
    }
  })
}
