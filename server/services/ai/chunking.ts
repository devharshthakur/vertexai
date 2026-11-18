/**
 * Splits a lecture transcript into the pieces the tutor indexes.
 *
 * The embedding model accepts a bounded input, so a transcript is cut into
 * chunks that always fit. Paragraphs stay whole when they fit, a paragraph
 * that does not is split at sentence boundaries, and a single long sentence is
 * cut at the limit. Consecutive chunks share a short overlap so an answer that
 * spans a boundary still has the context around it.
 */

/**
 * Rough characters per token, used to turn a token budget into a text window.
 *
 * The app ships no tokenizer, so the budget is converted with a conservative
 * ratio: the seeded transcripts measured about 4.3 characters per token, so
 * four characters per token keeps every chunk inside the model window.
 */
const charactersPerToken = 4

/** One indexed piece of a transcript. */
export interface TranscriptChunk {
  /** Position of the chunk inside the transcript, from zero. */
  position: number
  /** The chunk text, including the overlap with the previous chunk. */
  content: string
}

/**
 * Cuts a transcript into chunks that fit the configured embedding budget.
 *
 * The chunk size comes from the token budget, so the same code works for any
 * embedding model: the caller passes the model's chunk and input budgets.
 */
export function chunkTranscript(transcript: string, budget: { chunkTokens: number; maxInputTokens: number }): TranscriptChunk[] {
  const inputLimit = Math.max(1, Math.floor(budget.maxInputTokens * charactersPerToken))
  const requested = Math.max(1, Math.floor(budget.chunkTokens * charactersPerToken))

  // The overlap adds about a tenth of a chunk, so leave that room in the limit.
  const maxCharacters = Math.max(1, Math.floor(Math.min(requested, inputLimit / 1.1)))
  const overlapCharacters = Math.floor(maxCharacters / 10)

  const segments = splitIntoSegments(transcript, maxCharacters)
  const chunks: TranscriptChunk[] = []

  let current = ''

  for (const segment of segments) {
    const candidate = current ? `${current}\n\n${segment}` : segment

    if (current && candidate.length > maxCharacters) {
      chunks.push({ position: chunks.length, content: current.trim() })
      current = `${overlapTail(current, overlapCharacters)}\n\n${segment}`
      continue
    }

    current = candidate
  }

  if (current.trim()) chunks.push({ position: chunks.length, content: current.trim() })

  return chunks
}

/**
 * Breaks the text into pieces no longer than the limit.
 *
 * Paragraphs are the natural unit of a transcript, so they are kept whole
 * when they fit and only broken up when they do not.
 */
function splitIntoSegments(text: string, maxCharacters: number): string[] {
  const segments: string[] = []
  let current = ''

  const flush = () => {
    if (current.trim()) segments.push(current.trim())
    current = ''
  }

  for (const paragraph of text.split(/\n{2,}/)) {
    const trimmed = paragraph.trim()

    if (!trimmed) continue

    if (trimmed.length <= maxCharacters) {
      if (current && current.length + trimmed.length + 2 > maxCharacters) flush()
      current = current ? `${current}\n\n${trimmed}` : trimmed
      continue
    }

    flush()

    for (const piece of splitLongParagraph(trimmed, maxCharacters)) {
      if (current && current.length + piece.length + 1 > maxCharacters) flush()
      current = current ? `${current} ${piece}` : piece
    }
  }

  flush()

  return segments
}

/** Splits a paragraph that is longer than the limit at its sentence boundaries. */
function splitLongParagraph(paragraph: string, maxCharacters: number): string[] {
  const pieces: string[] = []
  let current = ''

  for (const sentence of paragraph.split(/(?<=[.!?])\s+/).filter(Boolean)) {
    if (sentence.length > maxCharacters) {
      if (current) {
        pieces.push(current)
        current = ''
      }

      for (let offset = 0; offset < sentence.length; offset += maxCharacters) {
        pieces.push(sentence.slice(offset, offset + maxCharacters))
      }

      continue
    }

    if (current && current.length + sentence.length + 1 > maxCharacters) {
      pieces.push(current)
      current = sentence
      continue
    }

    current = current ? `${current} ${sentence}` : sentence
  }

  if (current) pieces.push(current)

  return pieces
}

/**
 * Returns the tail of a chunk that starts on a word boundary.
 *
 * The overlap keeps the sentences before a boundary in the next chunk, so a
 * question about that part of the lecture still finds its context.
 */
function overlapTail(chunk: string, overlapCharacters: number): string {
  if (overlapCharacters <= 0) return ''

  const tail = chunk.slice(-overlapCharacters)
  const boundary = tail.indexOf(' ')

  return boundary >= 0 ? tail.slice(boundary + 1) : tail
}
