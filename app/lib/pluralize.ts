/**
 * A count with its noun: `pluralize(1, 'lecture')` is "1 lecture" and
 * `pluralize(3, 'lecture')` is "3 lectures".
 *
 * The plural is the singular plus an `s` unless the caller passes one, so an
 * irregular noun stays at the call site instead of being special-cased here.
 */
export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`
) {
  return `${count} ${count === 1 ? singular : plural}`
}
