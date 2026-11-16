import { defineEventHandler } from 'nuxt/server'
import { consumeStream, createUIMessageStreamResponse, toUIMessageStream } from 'ai'
import { acquireAiChatThread, saveAiChatHistory, startAiChat } from '#server/services/ai/chat'
import { withServiceErrors } from '#server/utils/errors'
import { requireSession } from '#server/utils/require-session'
import { parseParam, readLimitedJsonBody } from '#server/utils/validate'
import { aiChatRequestSchema, MAX_AI_CHAT_REQUEST_BYTES } from '#shared/validation/ai'
import { courseIdSchema } from '#shared/validation/courses'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const courseId = parseParam(event, 'id', courseIdSchema)
  const body = await readLimitedJsonBody(event, MAX_AI_CHAT_REQUEST_BYTES, aiChatRequestSchema)
  const actor = { id: session.user.id, role: session.user.role }
  const release = await acquireAiChatThread(courseId, actor.id, event.req.signal)

  try {
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
        } finally {
          release()
        }
      }
    })

    return createUIMessageStreamResponse({ stream, consumeSseStream: consumeStream })
  } catch (error) {
    release()
    throw error
  }
})
