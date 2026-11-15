import { createOpenAI } from '@ai-sdk/openai'
import { useRuntimeConfig } from 'nitropack/runtime'
import { ServiceError } from './service-error'

/**
 * OpenAI provider used by the AI tutor.
 *
 * The key and models come from Nuxt runtime config so a deployment can change
 * them without rebuilding the app. `OPENAI_API_KEY` in `.env` is enough for
 * local development; `NUXT_OPENAI_API_KEY` overrides the runtime default.
 *
 * A missing key is a configuration state, not a crash: every AI route raises a
 * `ServiceError('unavailable')` that the boundary translates to a 503, so the
 * rest of the LMS keeps working.
 */
function aiConfig() {
  const config = useRuntimeConfig()

  return {
    apiKey: (config.openaiApiKey as string | undefined) || process.env.OPENAI_API_KEY || '',
    chatModel: (config.aiChatModel as string | undefined) || 'gpt-5.4-mini',
    embeddingModel: (config.aiEmbeddingModel as string | undefined) || 'text-embedding-3-small'
  }
}

/** Reports whether an OpenAI key is configured, without exposing it. */
export function isAiConfigured(): boolean {
  return Boolean(aiConfig().apiKey)
}

/** Builds the provider and the configured model ids, or raises 503. */
export function getAiModels() {
  const { apiKey, chatModel, embeddingModel } = aiConfig()

  if (!apiKey) {
    throw new ServiceError('unavailable', 'The AI tutor is not configured.')
  }

  const openai = createOpenAI({ apiKey })

  return {
    openai,
    chatModel,
    embeddingModel
  }
}

/** The language model used for grounded answers and summaries. */
export function getChatModel() {
  const { openai, chatModel } = getAiModels()

  return openai(chatModel)
}

/** The embedding model used to index lecture transcripts. */
export function getEmbeddingModel() {
  const { openai, embeddingModel } = getAiModels()

  return openai.embedding(embeddingModel)
}
