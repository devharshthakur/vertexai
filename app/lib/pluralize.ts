/** Formats a count with its noun, e.g. `pluralize(3, 'lecture')`. */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`
) {
  return `${count} ${count === 1 ? singular : plural}`
}
