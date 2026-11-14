const assignmentDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC'
})

/**
 * Formats an assignment timestamp identically on the server and in the browser.
 *
 * The locale and time zone are fixed, so host and visitor settings cannot change
 * the text and break hydration. The ICU datapack versions behind Node and the
 * browser disagree about the space before the meridiem, so whitespace is
 * normalized. The explicit `UTC` suffix keeps the fixed time zone visible.
 */
export function formatAssignmentDateTime(isoTimestamp: string) {
  const date = new Date(isoTimestamp)
  if (Number.isNaN(date.getTime())) return 'an unknown time'

  return `${assignmentDateTimeFormatter.format(date).replace(/\s/g, ' ')} UTC`
}
