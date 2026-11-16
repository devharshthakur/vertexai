import { z } from 'zod'
import type { AiChatMessage } from '#shared/types/ai'

/** Caps chat spend and memory before the body reaches validation or the model. */
export const MAX_AI_CHAT_REQUEST_BYTES = 256 * 1024
export const MAX_AI_CHAT_MESSAGE_CHARACTERS = 16_000
export const MAX_AI_CHAT_CONVERSATION_CHARACTERS = 64_000

/**
 * AI tutor request schemas.
 *
 * The chat body is the AI SDK's UI message list. Its shape is checked again by
 * `validateUIMessages` in the service; the schema here rejects empty and
 * oversized payloads before they reach it. `DefaultChatTransport` also sends
 * the request trigger, which distinguishes a new prompt from a regeneration.
 */
export const aiChatRequestSchema = z
  .object({
    messages: z.array(z.custom<AiChatMessage>()).min(1, 'Send at least one message.').max(100),
    trigger: z.enum(['submit-message', 'regenerate-message']).default('submit-message')
  })
  .superRefine(({ messages }, context) => {
    let totalCharacters = 0

    messages.forEach((message, messageIndex) => {
      if (!message || typeof message !== 'object' || !Array.isArray(message.parts)) {
        context.addIssue({ code: 'custom', path: ['messages', messageIndex], message: 'The conversation format is invalid.' })
        return
      }

      let messageCharacters = 0
      message.parts.forEach((part, partIndex) => {
        if (!part || typeof part !== 'object') {
          context.addIssue({ code: 'custom', path: ['messages', messageIndex, 'parts', partIndex], message: 'The conversation format is invalid.' })
          return
        }
        if (part.type !== 'text' || typeof part.text !== 'string') return

        messageCharacters += part.text.length
        if (part.text.length > MAX_AI_CHAT_MESSAGE_CHARACTERS) {
          context.addIssue({
            code: 'too_big',
            origin: 'string',
            maximum: MAX_AI_CHAT_MESSAGE_CHARACTERS,
            inclusive: true,
            path: ['messages', messageIndex, 'parts', partIndex, 'text'],
            message: `Each message must be ${MAX_AI_CHAT_MESSAGE_CHARACTERS.toLocaleString('en-US')} characters or fewer.`
          })
        }
      })

      totalCharacters += messageCharacters
    })

    if (totalCharacters > MAX_AI_CHAT_CONVERSATION_CHARACTERS) {
      context.addIssue({
        code: 'too_big',
        origin: 'string',
        maximum: MAX_AI_CHAT_CONVERSATION_CHARACTERS,
        inclusive: true,
        path: ['messages'],
        message: `The conversation must be ${MAX_AI_CHAT_CONVERSATION_CHARACTERS.toLocaleString('en-US')} characters or fewer.`
      })
    }
  })

/**
 * The summary endpoint has no free-form prompt: the lecture comes from the
 * route. `prompt` exists because `useCompletion` always sends one, and
 * `regenerate` is honoured only for the course owner or an admin.
 */
export const lectureSummaryRequestSchema = z.object({
  prompt: z.string().max(1000).optional(),
  regenerate: z.boolean().optional()
})

export type AiChatRequestValues = z.output<typeof aiChatRequestSchema>
export type LectureSummaryRequestValues = z.output<typeof lectureSummaryRequestSchema>
