import type { AiChatMessage } from '#shared/types/ai'

type ChatThreadEntry = {
  tail: Promise<void>
  holders: number
}

/** In-flight conversations, keyed by user and course. */
const threads = new Map<string, ChatThreadEntry>()

/** Thrown when a submitted transcript cannot be merged safely with stored history. */
export class ChatThreadConflictError extends Error {
  constructor() {
    super('The stored conversation has changed. Reload it before trying again.')
    this.name = 'ChatThreadConflictError'
  }
}

/**
 * Waits for the previous request in one user/course thread and reserves the
 * next turn. The returned release function is idempotent and must be called
 * only after the response stream and its persistence callback have settled.
 */
export async function acquireChatThread(key: string, abortSignal?: AbortSignal): Promise<() => void> {
  const entry = threads.get(key) ?? { tail: Promise.resolve(), holders: 0 }
  const previous = entry.tail

  entry.holders += 1
  threads.set(key, entry)

  let releaseTurn!: () => void
  const turn = new Promise<void>((resolve) => {
    releaseTurn = resolve
  })

  entry.tail = previous.then(() => turn)

  let released = false
  const release = () => {
    if (released) return

    released = true
    releaseTurn()
    entry.holders -= 1

    if (entry.holders === 0 && threads.get(key) === entry) threads.delete(key)
  }

  try {
    await waitForTurn(previous, abortSignal)
  } catch (error) {
    release()
    throw error
  }

  return release
}

/**
 * Extends the stored thread with messages the client has not seen yet.
 *
 * A queued second tab can submit a transcript based on stale history. Messages
 * up to the latest stored id are server-owned; only the suffix after it is
 * appended, so the first tab's completed exchange cannot be replaced.
 */
export function mergeSubmittedChatMessages(stored: AiChatMessage[], requested: AiChatMessage[]): AiChatMessage[] {
  const storedIds = new Set(stored.map((message) => message.id))
  const lastKnownIndex = requested.findLastIndex((message) => storedIds.has(message.id))
  const appended = requested.slice(lastKnownIndex + 1)

  if (!appended.length) throw new ChatThreadConflictError()

  return [...stored, ...appended]
}

/**
 * Returns the server-owned history a regeneration may replace.
 *
 * The client leaves the target assistant message out of its request. Stored
 * messages are authoritative, and only one trailing assistant may be replaced;
 * a stale branch that would discard newer exchanges is rejected.
 */
export function prepareChatRegeneration(stored: AiChatMessage[], requested: AiChatMessage[]): AiChatMessage[] {
  const matchesPrefix = requested.every((message, index) => stored[index]?.id === message.id)

  if (!matchesPrefix) throw new ChatThreadConflictError()

  const trailing = stored.slice(requested.length)

  if (trailing.length > 1 || (trailing.length === 1 && trailing[0]?.role !== 'assistant')) {
    throw new ChatThreadConflictError()
  }

  return stored.slice(0, requested.length)
}

/** Waits for the preceding turn without leaving an abort listener behind. */
function waitForTurn(previous: Promise<void>, abortSignal?: AbortSignal): Promise<void> {
  if (!abortSignal) return previous

  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(abortSignal.reason ?? new DOMException('The chat request was cancelled.', 'AbortError'))
    }
    const cleanup = () => abortSignal.removeEventListener('abort', onAbort)

    if (abortSignal.aborted) {
      onAbort()
      return
    }

    abortSignal.addEventListener('abort', onAbort, { once: true })
    previous.then(
      () => {
        cleanup()
        resolve()
      },
      (error) => {
        cleanup()
        reject(error)
      }
    )
  })
}
