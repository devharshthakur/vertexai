import type { UIMessage } from 'ai'

/** A lecture the tutor used, quoted for the citation chip under an answer. */
export interface AiCitation {
  lectureId: string
  title: string
  excerpt: string
}

/** Metadata attached to every tutor answer. */
export interface AiChatMessageMetadata {
  citations?: AiCitation[]
}

export type AiChatMessage = UIMessage<AiChatMessageMetadata>

/** The stored conversation for one student and one course. */
export interface AiChatHistory {
  messages: AiChatMessage[]
  /** False when no OpenAI key is configured; the UI disables the composer. */
  available: boolean
}

/** The cached summary state of one lecture. */
export interface AiLectureSummary {
  summary: string | null
  generatedAt: string | null
  /** False when no OpenAI key is configured. */
  available: boolean
}
