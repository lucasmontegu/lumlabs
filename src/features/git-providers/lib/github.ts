// GitHub API client

const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  clone_url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  updated_at: string;
  language: string | null;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `GitHub API error: ${response.status}`
    );
  }

  return response.json();
}

export async function listRepositories(
  accessToken: string,
  options: {
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
    type?: "all" | "owner" | "public" | "private" | "member";
  } = {}
): Promise<GitHubRepo[]> {
  const params = new URLSearchParams();
  params.set("sort", options.sort || "updated");
  params.set("direction", options.direction || "desc");
  params.set("per_page", String(options.per_page || 100));
  params.set("page", String(options.page || 1));
  params.set("type", options.type || "all");

  return githubFetch<GitHubRepo[]>(
    `/user/repos?${params.toString()}`,
    accessToken
  );
}

export async function searchRepositories(
  accessToken: string,
  query: string,
  options: {
    per_page?: number;
    page?: number;
  } = {}
): Promise<{ items: GitHubRepo[]; total_count: number }> {
  const params = new URLSearchParams();
  params.set("q", `${query} in:name user:@me`);
  params.set("per_page", String(options.per_page || 30));
  params.set("page", String(options.page || 1));
  params.set("sort", "updated");

  return githubFetch<{ items: GitHubRepo[]; total_count: number }>(
    `/search/repositories?${params.toString()}`,
    accessToken
  );
}

export async function listBranches(
  accessToken: string,
  owner: string,
  repo: string,
  options: {
    per_page?: number;
    page?: number;
  } = {}
): Promise<GitHubBranch[]> {
  const params = new URLSearchParams();
  params.set("per_page", String(options.per_page || 100));
  params.set("page", String(options.page || 1));

  return githubFetch<GitHubBranch[]>(
    `/repos/${owner}/${repo}/branches?${params.toString()}`,
    accessToken
  );
}

export async function getRepository(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubRepo> {
  return githubFetch<GitHubRepo>(
    `/repos/${owner}/${repo}`,
    accessToken
  );
}
