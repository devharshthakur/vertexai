import { z } from 'zod'

const defaultAiChatModel = 'openai/gpt-6-luna'
const defaultAiEmbeddingModel = 'openai/text-embedding-3-large'

/**
 * Input window of the default embedding model. `openai/text-embedding-3-large`
 * rejects an input above 8,192 tokens, so a transcript longer than that cannot
 * be embedded in one call.
 */
const defaultAiEmbeddingMaxInputTokens = 8_192

/**
 * Size of one embedded transcript chunk. It stays far below the model window so
 * a lecture of any length is split into inputs the model accepts.
 */
const defaultAiEmbeddingChunkTokens = 1_500
const defaultAiGenerationMaxTranscriptCharacters = 64_000

/** Vercel AI Gateway model ids are always `provider/model`. */
const modelSchema = z
  .string()
  .trim()
  .min(1, 'Model identifiers must not be blank.')
  .regex(/^[^/\s]+\/[^/\s]+$/, 'Model identifiers must use the gateway "provider/model" format.')

/** A token budget: environment variables arrive as strings, runtime config as numbers. */
const tokenBudgetSchema = z.coerce.number().int().positive().max(1_000_000)

/**
 * Nuxt reads these variables while loading `nuxt.config.ts`, so invalid values
 * fail before the app starts.
 */
export const runtimeEnvironmentSchema = z
  .object({
    AI_GATEWAY_API_KEY: z.string().trim().default(''),
    AI_CHAT_MODEL: modelSchema.default(defaultAiChatModel),
    AI_EMBEDDING_MODEL: modelSchema.default(defaultAiEmbeddingModel),
    AI_EMBEDDING_MAX_INPUT_TOKENS: tokenBudgetSchema.default(defaultAiEmbeddingMaxInputTokens),
    AI_EMBEDDING_CHUNK_TOKENS: tokenBudgetSchema.default(defaultAiEmbeddingChunkTokens),
    AI_GENERATION_MAX_TRANSCRIPT_CHARACTERS: tokenBudgetSchema.default(defaultAiGenerationMaxTranscriptCharacters)
  })
  .refine((values) => values.AI_EMBEDDING_CHUNK_TOKENS < values.AI_EMBEDDING_MAX_INPUT_TOKENS, {
    path: ['AI_EMBEDDING_CHUNK_TOKENS'],
    message: 'AI_EMBEDDING_CHUNK_TOKENS must be smaller than AI_EMBEDDING_MAX_INPUT_TOKENS.'
  })

/**
 * The effective server config. Validation is repeated in `server/utils/ai.ts`
 * because `NUXT_*` variables override the config generated at build time.
 */
export const runtimeConfigSchema = z
  .object({
    aiGatewayApiKey: z.string().trim().default(''),
    aiChatModel: modelSchema.default(defaultAiChatModel),
    aiEmbeddingModel: modelSchema.default(defaultAiEmbeddingModel),
    aiEmbeddingMaxInputTokens: tokenBudgetSchema.default(defaultAiEmbeddingMaxInputTokens),
    aiEmbeddingChunkTokens: tokenBudgetSchema.default(defaultAiEmbeddingChunkTokens),
    aiGenerationMaxTranscriptCharacters: tokenBudgetSchema.default(defaultAiGenerationMaxTranscriptCharacters)
  })
  .refine((values) => values.aiEmbeddingChunkTokens < values.aiEmbeddingMaxInputTokens, {
    path: ['aiEmbeddingChunkTokens'],
    message: 'aiEmbeddingChunkTokens must be smaller than aiEmbeddingMaxInputTokens.'
  })

export type RuntimeEnvironment = Record<string, string | undefined>
export type RuntimeConfigInput = z.input<typeof runtimeConfigSchema>

/** Builds the Nuxt runtime config from its unprefixed environment variables. */
export function createRuntimeConfig(environment: RuntimeEnvironment = process.env) {
  const values = runtimeEnvironmentSchema.parse(environment)

  return {
    aiGatewayApiKey: values.AI_GATEWAY_API_KEY,
    aiChatModel: values.AI_CHAT_MODEL,
    aiEmbeddingModel: values.AI_EMBEDDING_MODEL,
    aiEmbeddingMaxInputTokens: values.AI_EMBEDDING_MAX_INPUT_TOKENS,
    aiEmbeddingChunkTokens: values.AI_EMBEDDING_CHUNK_TOKENS,
    aiGenerationMaxTranscriptCharacters: values.AI_GENERATION_MAX_TRANSCRIPT_CHARACTERS
  }
}

/** Validates the effective config after Nuxt applies `NUXT_*` overrides. */
export function parseRuntimeConfig(config: RuntimeConfigInput) {
  return runtimeConfigSchema.parse(config)
}
