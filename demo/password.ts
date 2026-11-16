export const DEFAULT_DEMO_PASSWORD = 'password@1234'

export function validateDemoSeedPassword(password = DEFAULT_DEMO_PASSWORD): void {
  if (password.length < 12) {
    throw new Error('The predefined demo password must contain at least 12 characters.')
  }
}
