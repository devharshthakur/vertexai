import type { SocialProviderList } from 'better-auth'

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
