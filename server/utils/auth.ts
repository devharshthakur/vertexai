import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins/admin'
import { useDb } from '../db'
import * as authSchema from '../db/schema/auth'
import { githubCredentials } from './auth-providers'

/**
 * GitHub sign-in is optional. The provider is only registered when both
 * credentials are present, so a checkout without OAuth setup still boots and
 * email/password sign-in keeps working.
 */
const socialProviders = githubCredentials ? { github: githubCredentials } : {}

export const auth = betterAuth({
  database: drizzleAdapter(useDb(), {
    provider: 'pg',
    // Table names are plural (`users`, `sessions`, ...) to match the
    // convention used by the LMS tables in `docs/PRD.md`.
    usePlural: true,
    schema: authSchema
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8
  },
  socialProviders,
  plugins: [
    admin({
      // New accounts start as students; admins promote them later.
      defaultRole: 'student',
      adminRoles: ['admin']
    })
  ]
})
