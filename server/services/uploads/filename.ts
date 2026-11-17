/** Removes path prefixes and control characters from a client-provided name. */
export function sanitizeUploadFilename(value: string): string | undefined {
  return value
    .split(/[\\/]/)
    .at(-1)
    ?.split('')
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join('')
    .trim()
}
