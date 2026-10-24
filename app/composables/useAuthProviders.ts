import type { AuthProvidersResponse } from '#shared/types/auth'

/**
 * Sign-in methods this deployment supports.
 *
 * The server only registers a social provider when its credentials are
 * configured, so the UI asks instead of guessing.
 */
export function useAuthProviders() {
  return useFetch<AuthProvidersResponse>('/api/auth-providers', {
    key: 'auth:providers'
  })
}
