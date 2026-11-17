import type { AiChatMessage } from '#shared/types/ai'
import { useAiChatLockPool } from '#server/db'

/** Thrown when a submitted transcript cannot be merged safely with stored history. */
export class ChatThreadConflictError extends Error {
  constructor() {
    super('The stored conversation has changed. Reload it before trying again.')
    this.name = 'ChatThreadConflictError'
  }
}

/**
 * Acquires a PostgreSQL session lock for one user/course thread. The returned
 * release function is idempotent and must be called after stream persistence.
 */
export async function acquireChatThread(key: string, abortSignal?: AbortSignal): Promise<() => Promise<void>> {
  const pool = useAiChatLockPool()

  while (!abortSignal?.aborted) {
    const client = await pool.connect()

    if (abortSignal?.aborted) {
      client.release()
      break
    }

    let locked: boolean
    try {
      const result = await client.query<{ locked: boolean }>('select pg_try_advisory_lock(hashtextextended($1, 0)) as locked', [key])
      locked = result.rows[0]?.locked ?? false
    } catch (error) {
      client.release(error instanceof Error ? error : new Error('Failed to acquire the AI chat lock.'))
      throw error
    }

    if (locked) {
      let released = false

      return async () => {
        if (released) return
        released = true

        try {
          await client.query('select pg_advisory_unlock(hashtextextended($1, 0))', [key])
          client.release()
        } catch (error) {
          client.release(error instanceof Error ? error : new Error('Failed to release the AI chat lock.'))
          throw error
        }
      }
    }

    client.release()
    await waitBeforeRetry(abortSignal)
  }

  throw abortSignal?.reason ?? new DOMException('The chat request was cancelled.', 'AbortError')
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

/** Retries a busy thread without leaving an abort listener or timer behind. */
function waitBeforeRetry(abortSignal?: AbortSignal): Promise<void> {
  if (!abortSignal) return new Promise((resolve) => setTimeout(resolve, 100))

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, 100)
    const onAbort = () => {
      cleanup()
      reject(abortSignal.reason ?? new DOMException('The chat request was cancelled.', 'AbortError'))
    }
    const cleanup = () => {
      clearTimeout(timer)
      abortSignal.removeEventListener('abort', onAbort)
    }

    if (abortSignal.aborted) {
      onAbort()
      return
    }

    abortSignal.addEventListener('abort', onAbort, { once: true })
  })
}
