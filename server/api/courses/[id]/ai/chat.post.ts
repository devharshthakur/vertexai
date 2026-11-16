import { defineEventHandler, readValidatedBody } from 'nuxt/server'
import { createUIMessageStreamResponse, toUIMessageStream } from 'ai'
import { saveAiChatHistory, startAiChat } from '#server/services/ai/chat'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam } from '#server/utils/validate'
import { aiChatRequestSchema } from '#shared/validation/ai'
import { courseIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await readValidatedBody(event, aiChatRequestSchema)
  const actor = { id: session.user.id, role: session.user.role }
  const { result, messages, citations } = await withServiceErrors(() => startAiChat(courseId, body, actor, event.req.signal))

  const stream = toUIMessageStream({
    stream: result.stream,
    originalMessages: messages,
    messageMetadata: () => ({ citations }),
    onEnd: async ({ messages: updated }) => {
      try {
        await saveAiChatHistory(courseId, actor.id, updated)
      } catch (error) {
        console.error('[ai] failed to save the chat conversation', error)
      }
    }
  })

  return createUIMessageStreamResponse({ stream })
})
