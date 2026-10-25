import type { AuthProvidersResponse } from '#shared/types/auth'

/** The server enables social providers only when their credentials are configured. */
export function useAuthProviders() {
  return useFetch<AuthProvidersResponse>('/api/auth-providers', {
    key: 'auth:providers'
  })
}
