// OAuth configuration for git providers

export type GitProvider = "github" | "gitlab" | "bitbucket";

export const PROVIDER_CONFIG = {
  github: {
    name: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userUrl: "https://api.github.com/user",
    scopes: ["repo", "read:user"],
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  },
  gitlab: {
    name: "GitLab",
    authorizeUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    userUrl: "https://gitlab.com/api/v4/user",
    scopes: ["read_repository", "read_user"],
    clientId: process.env.GITLAB_CLIENT_ID!,
    clientSecret: process.env.GITLAB_CLIENT_SECRET!,
  },
  bitbucket: {
    name: "Bitbucket",
    authorizeUrl: "https://bitbucket.org/site/oauth2/authorize",
    tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
    userUrl: "https://api.bitbucket.org/2.0/user",
    scopes: ["repository", "account"],
    clientId: process.env.BITBUCKET_CLIENT_ID!,
    clientSecret: process.env.BITBUCKET_CLIENT_SECRET!,
  },
} as const;

export function isValidProvider(provider: string): provider is GitProvider {
  return provider in PROVIDER_CONFIG;
}

export function getCallbackUrl(provider: GitProvider): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/git/callback/${provider}`;
}
