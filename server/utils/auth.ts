import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { admin } from 'better-auth/plugins/admin'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
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
      adminRoles: ['admin'],
      // The admin plugin ships `user` and `admin` roles. The application has
      // three, so they are declared here — otherwise the plugin's own
      // `setRole` endpoint would only accept its built-in names. Only `admin`
      // carries administrative permissions; the other two are ordinary
      // accounts, exactly like the built-in `user` role.
      roles: {
        student: userAc,
        instructor: userAc,
        admin: adminAc
      }
    })
  ]
})
