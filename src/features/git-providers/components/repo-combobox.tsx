"use client";

import { useState, useMemo } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { useRepos, type Repository } from "../hooks/use-repos";
import type { GitProvider } from "../lib/oauth-config";

interface RepoComboboxProps {
  provider: GitProvider;
  value: Repository | null;
  onChange: (repo: Repository | null) => void;
}

export function RepoCombobox({
  provider,
  value,
  onChange,
}: RepoComboboxProps) {
  const [search, setSearch] = useState("");
  const { repositories, isLoading } = useRepos(provider, true);

  // Filter repositories based on search
  const filteredRepos = useMemo(() => {
    if (!search) return repositories;
    const lowerSearch = search.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(lowerSearch) ||
        repo.fullName.toLowerCase().includes(lowerSearch)
    );
  }, [repositories, search]);

  return (
    <Combobox
      value={value?.id || null}
      onValueChange={(newValue) => {
        const repo = repositories.find((r) => r.id === newValue);
        onChange(repo || null);
      }}
    >
      <ComboboxInput
        placeholder="Search repositories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        showClear={!!value}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxList>
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="size-5" />
            </div>
          ) : (
            <>
              {filteredRepos.map((repo) => (
                <ComboboxItem key={repo.id} value={repo.id}>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{repo.name}</span>
                      {repo.private && (
                        <LockIcon className="size-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {repo.owner}
                    </span>
                  </div>
                </ComboboxItem>
              ))}
              <ComboboxEmpty>No repositories found</ComboboxEmpty>
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
