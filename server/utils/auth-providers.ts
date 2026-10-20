/**
 * Sign-in methods available in this deployment.
 *
 * Better Auth only registers a social provider when its credentials are
 * present, so the client asks this module which methods to render instead of
 * guessing. Only provider *names* ever leave the server.
 */
const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

export const githubCredentials =
  githubClientId && githubClientSecret
    ? { clientId: githubClientId, clientSecret: githubClientSecret }
    : undefined

export const githubAuthEnabled = githubCredentials !== undefined

export const enabledAuthProviders: string[] = [
  'email',
  ...(githubAuthEnabled ? ['github'] : [])
]
