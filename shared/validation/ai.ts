import { z } from 'zod'
import type { AiChatMessage } from '#shared/types/ai'

/**
 * AI tutor request schemas.
 *
 * The chat body is the AI SDK's UI message list. Its shape is checked again by
 * `validateUIMessages` in the service; the schema here rejects empty and
 * oversized payloads before they reach it. `DefaultChatTransport` also sends
 * the request trigger, which distinguishes a new prompt from a regeneration.
 */
export const aiChatRequestSchema = z.object({
  messages: z.array(z.custom<AiChatMessage>()).min(1, 'Send at least one message.').max(100),
  trigger: z.enum(['submit-message', 'regenerate-message']).default('submit-message')
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
