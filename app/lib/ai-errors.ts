const TRANSCRIPT_LIMIT_MESSAGE = /^This transcript is too long to process\. It must be [\d,]+ characters or fewer\.$/

/** Preserve the server's configured character limit without exposing other API errors. */
export function getAiGenerationErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) return fallback

  const response = 'data' in error ? error.data : undefined
  const message =
    typeof response === 'object' && response !== null && 'message' in response && typeof response.message === 'string' ? response.message
    : 'message' in error && typeof error.message === 'string' ? error.message
    : ''

  return TRANSCRIPT_LIMIT_MESSAGE.test(message) ? message : fallback
}
