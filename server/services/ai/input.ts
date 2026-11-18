import { getAiGenerationTranscriptCharacterLimit } from '#server/utils/ai'
import { ServiceError } from '#server/utils/service-error'

/** Rejects transcripts that would make a generation request too large. */
export function assertAiTranscriptWithinBudget(transcript: string): void {
  const limit = getAiGenerationTranscriptCharacterLimit()
  if (transcript.length > limit) {
    throw new ServiceError('invalid_input', `This transcript is too long to process. It must be ${limit.toLocaleString('en-US')} characters or fewer.`)
  }
}
