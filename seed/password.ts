const DEFAULT_DEMO_PASSWORD = 'password@123'

export function validateDemoSeedPassword(password = process.env.DEMO_SEED_PASSWORD ?? DEFAULT_DEMO_PASSWORD): void {
  if (password.length < 12) {
    throw new Error('DEMO_SEED_PASSWORD must contain at least 12 characters.')
  }
}
