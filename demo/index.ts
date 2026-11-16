import 'dotenv/config'
import { useDb } from '../server/db'
import { seedDemoData } from './seed'

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The demo seed is disabled in production.')
  }

  await seedDemoData()
}

void (async () => {
  try {
    await seed()
  } catch (error: unknown) {
    console.error('Demo seed failed:', error)
    process.exitCode = 1
  } finally {
    await useDb().$client.end()
  }
})()
