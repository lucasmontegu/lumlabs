"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface RepoOption {
  id: string;
  name: string;
  fullName: string;
  provider: string;
  private: boolean;
  description: string | null;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  owner: string;
}

interface RepoSelectorProps {
  connectedProviders: string[];
  value: RepoOption | null;
  onChange: (repo: RepoOption | null) => void;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  github: <GitHubIcon />,
  gitlab: <GitLabIcon />,
  bitbucket: <BitbucketIcon />,
};

export function RepoSelector({
  connectedProviders,
  value,
  onChange,
}: RepoSelectorProps) {
  const [search, setSearch] = useState("");

  // Fetch repos from all connected providers
  const { data: allRepos, isLoading } = useSWR<RepoOption[]>(
    connectedProviders.length > 0
      ? `/api/git/repos/all?providers=${connectedProviders.join(",")}`
      : null,
    async () => {
      const results = await Promise.all(
        connectedProviders.map(async (provider) => {
          try {
            const res = await fetch(`/api/git/${provider}/repos`);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.repositories || []).map((repo: RepoOption) => ({
              ...repo,
              provider,
            }));
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    },
    { revalidateOnFocus: false }
  );

  const repositories = allRepos || [];

  // Filter repositories based on search
  const filteredRepos = useMemo(() => {
    if (!search) return repositories;
    const lowerSearch = search.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(lowerSearch) ||
        repo.fullName.toLowerCase().includes(lowerSearch) ||
        repo.owner.toLowerCase().includes(lowerSearch)
    );
  }, [repositories, search]);

  // Group by provider
  const groupedRepos = useMemo(() => {
    const groups: Record<string, RepoOption[]> = {};
    filteredRepos.forEach((repo) => {
      if (!groups[repo.provider]) {
        groups[repo.provider] = [];
      }
      groups[repo.provider].push(repo);
    });
    return groups;
  }, [filteredRepos]);

  return (
    <Combobox
      value={value?.id || null}
      onValueChange={(newValue) => {
        const repo = repositories.find((r) => r.id === newValue);
        onChange(repo || null);
      }}
    >
      <ComboboxInput
        placeholder="Buscar repositorio..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        showClear={!!value}
        className="w-full h-12 text-base"
      />
      <ComboboxContent className="max-h-80">
        <ComboboxList>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-5" />
              <span className="ml-2 text-sm text-muted-foreground">
                Cargando repositorios...
              </span>
            </div>
          ) : (
            <>
              {Object.entries(groupedRepos).map(([provider, repos]) => (
                <div key={provider}>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
                    {PROVIDER_ICONS[provider]}
                    {provider}
                  </div>
                  {repos.map((repo) => (
                    <ComboboxItem
                      key={repo.id}
                      value={repo.id}
                      className="py-3"
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{repo.name}</span>
                          {repo.private && (
                            <LockIcon className="size-3 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {repo.owner} / {repo.defaultBranch}
                        </span>
                      </div>
                    </ComboboxItem>
                  ))}
                </div>
              ))}
              <ComboboxEmpty>No se encontraron repositorios</ComboboxEmpty>
            </>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GitLabIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
    </svg>
  );
}

function BitbucketIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646l3.27-20.03a.768.768 0 0 0-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" />
    </svg>
  );
}
