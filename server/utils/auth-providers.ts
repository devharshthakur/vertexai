/**
 * GitHub credentials for the Better Auth social provider.
 *
 * Better Auth only registers a social provider when its credentials are
 * present, so a checkout without OAuth setup still boots and email/password
 * sign-in keeps working. Which providers ended up registered is read back
 * from the auth instance itself — see `server/api/auth-providers.get.ts`.
 */
const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

export const githubCredentials =
  githubClientId && githubClientSecret
    ? { clientId: githubClientId, clientSecret: githubClientSecret }
    : undefined
