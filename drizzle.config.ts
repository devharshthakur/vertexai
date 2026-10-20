import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env.')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema/index.ts',
  out: './server/db/migrations',
  dbCredentials: {
    url: databaseUrl
  },
  strict: true,
  verbose: true
})
