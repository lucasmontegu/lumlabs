"use client";

import useSWR from "swr";

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  owner: string;
  ownerAvatar: string;
  updatedAt: string;
  language: string | null;
}

export interface Branch {
  name: string;
  sha: string;
  protected: boolean;
}

interface ReposResponse {
  repositories: Repository[];
}

interface BranchesResponse {
  branches: Branch[];
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function useRepos(provider: string | null, enabled = true) {
  const { data, error, isLoading } = useSWR<ReposResponse>(
    enabled && provider ? `/api/git/${provider}/repos` : null,
    fetcher
  );

  return {
    repositories: data?.repositories || [],
    isLoading,
    error,
  };
}

export function useBranches(
  provider: string | null,
  owner: string | null,
  repo: string | null
) {
  const shouldFetch = provider && owner && repo;

  const { data, error, isLoading } = useSWR<BranchesResponse>(
    shouldFetch
      ? `/api/git/${provider}/branches?owner=${owner}&repo=${repo}`
      : null,
    fetcher
  );

  return {
    branches: data?.branches || [],
    isLoading,
    error,
  };
}
