/**
 * Resolve a `redirect` query value to a safe destination.
 *
 * Only same-origin relative paths are accepted; anything else falls back so the
 * login and signup flows cannot be turned into an open redirect.
 */
export function resolveSafeRedirect(
  target: unknown,
  fallback = '/dashboard'
): string {
  return typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//')
    ? target
    : fallback
}
