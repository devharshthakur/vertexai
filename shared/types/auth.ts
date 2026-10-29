import type { SocialProviderList } from 'better-auth'

export const APP_ROLES = {
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin'
} as const

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES]

/**
 * The sign-in methods this deployment can offer.
 *
 * `email` is always available. The social providers come from Better Auth's
 * own provider list, so a provider the server registers is typed here too.
 */
export type AuthProviderId = 'email' | SocialProviderList[number]

/**
 * The response of the provider discovery endpoint.
 *
 * It carries method names only — no credential material ever leaves the
 * server.
 */
export interface AuthProvidersResponse {
  providers: AuthProviderId[]
}
