/**
 * Turns TanStack Form validation errors into plain messages.
 *
 * TanStack Form keeps errors as `unknown`: function validators return a
 * string, Standard Schema validators (Zod) return issue objects shaped like
 * `{ message }`. The shadcn `FieldError` component takes strings, so the
 * issues are flattened and de-duplicated here.
 */
export function toErrorMessages(errors: unknown): string[] {
  const messages: string[] = []

  const collect = (error: unknown): void => {
    if (error === undefined || error === null) return

    if (Array.isArray(error)) {
      error.forEach(collect)
      return
    }

    if (typeof error === 'string') {
      if (error.length > 0) messages.push(error)
      return
    }

    if (typeof error === 'object' && 'message' in error) {
      const { message } = error as { message?: unknown }
      if (typeof message === 'string' && message.length > 0) {
        messages.push(message)
      }
    }
  }

  collect(errors)

  return [...new Set(messages)]
}
