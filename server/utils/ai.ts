import { createGateway, embed } from 'ai'
import { useRuntimeConfig } from 'nitropack/runtime'
import { parseRuntimeConfig } from '~~/config/runtime'
import { ServiceError } from './service-error'

/**
 * Dimensions of the stored lecture vectors.
 *
 * The embedding model can return more dimensions than that, so every embedding
 * request asks for this width. It must stay equal to the `vector(1536)`
 * column in `server/db/schema/courses.ts`.
 */
const aiEmbeddingDimensions = 1536

/**
 * Vercel AI Gateway provider used by the AI tutor.
 *
 * The key and models come from Nuxt runtime config so a deployment can change
 * them without rebuilding the app. `AI_GATEWAY_API_KEY` in `.env` is enough for
 * local development; `NUXT_AI_GATEWAY_API_KEY` overrides the runtime default.
 *
 * Gateway model ids are `provider/model` pairs, so the chat and embedding
 * defaults are prefixed (`openai/gpt-6-luna`, `openai/text-embedding-3-large`).
 *
 * Parsing here validates the effective values, including `NUXT_*` overrides
 * that bypass the checks in `nuxt.config.ts`. A missing key is a configuration
 * state, not a crash: every AI route raises a `ServiceError('unavailable')`
 * that the boundary translates to a 503, so the rest of the LMS keeps working.
 */
function aiConfig() {
  const config = useRuntimeConfig()

  const values = parseRuntimeConfig({
    aiGatewayApiKey: config.aiGatewayApiKey || process.env.AI_GATEWAY_API_KEY,
    aiChatModel: config.aiChatModel,
    aiEmbeddingModel: config.aiEmbeddingModel
  })

  return {
    apiKey: values.aiGatewayApiKey,
    chatModel: values.aiChatModel,
    embeddingModel: values.aiEmbeddingModel
  }
}

/** Reports whether an AI Gateway key is configured, without exposing it. */
export function isAiConfigured(): boolean {
  return Boolean(aiConfig().apiKey)
}

/** Builds the gateway provider and the configured model ids, or raises 503. */
export function getAiModels() {
  const { apiKey, chatModel, embeddingModel } = aiConfig()

  if (!apiKey) {
    throw new ServiceError('unavailable', 'The AI tutor is not configured.')
  }

  const gateway = createGateway({ apiKey })

  return {
    gateway,
    chatModel,
    embeddingModel
  }
}

/** The language model used for grounded answers and summaries. */
export function getChatModel() {
  const { gateway, chatModel } = getAiModels()

  return gateway(chatModel)
}

/** The embedding model used to index lecture transcripts. */
function getEmbeddingModel() {
  const { gateway, embeddingModel } = getAiModels()

  return gateway.embeddingModel(embeddingModel)
}

/**
 * Embeds one value with the configured embedding model.
 *
 * The requested width matches the stored vector column, so a model that
 * returns more dimensions still produces values PostgreSQL accepts.
 */
export async function embedText(value: string): Promise<number[]> {
  const { embedding } = await embed({ model: getEmbeddingModel(), value, dimensions: aiEmbeddingDimensions })

  return embedding
}
