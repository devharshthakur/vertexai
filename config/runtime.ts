import { z } from 'zod'

const defaultAiChatModel = 'openai/gpt-6-luna'
const defaultAiEmbeddingModel = 'openai/text-embedding-3-large'

/** Vercel AI Gateway model ids are always `provider/model`. */
const modelSchema = z
  .string()
  .trim()
  .min(1, 'Model identifiers must not be blank.')
  .regex(/^[^/\s]+\/[^/\s]+$/, 'Model identifiers must use the gateway "provider/model" format.')

/**
 * Nuxt reads these variables while loading `nuxt.config.ts`, so invalid values
 * fail before the app starts.
 */
export const runtimeEnvironmentSchema = z.object({
  AI_GATEWAY_API_KEY: z.string().trim().default(''),
  AI_CHAT_MODEL: modelSchema.default(defaultAiChatModel),
  AI_EMBEDDING_MODEL: modelSchema.default(defaultAiEmbeddingModel)
})

/**
 * The effective server config. Validation is repeated in `server/utils/ai.ts`
 * because `NUXT_*` variables override the config generated at build time.
 */
export const runtimeConfigSchema = z.object({
  aiGatewayApiKey: z.string().trim().default(''),
  aiChatModel: modelSchema.default(defaultAiChatModel),
  aiEmbeddingModel: modelSchema.default(defaultAiEmbeddingModel)
})

export type RuntimeEnvironment = Record<string, string | undefined>
export type RuntimeConfigInput = z.input<typeof runtimeConfigSchema>

/** Builds the Nuxt runtime config from its unprefixed environment variables. */
export function createRuntimeConfig(environment: RuntimeEnvironment = process.env) {
  const values = runtimeEnvironmentSchema.parse(environment)

  return {
    aiGatewayApiKey: values.AI_GATEWAY_API_KEY,
    aiChatModel: values.AI_CHAT_MODEL,
    aiEmbeddingModel: values.AI_EMBEDDING_MODEL
  }
}

/** Validates the effective config after Nuxt applies `NUXT_*` overrides. */
export function parseRuntimeConfig(config: RuntimeConfigInput) {
  return runtimeConfigSchema.parse(config)
}
