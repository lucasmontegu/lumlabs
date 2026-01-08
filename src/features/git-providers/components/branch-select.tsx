"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBranches } from "../hooks/use-repos";
import type { GitProvider } from "../lib/oauth-config";

interface BranchSelectProps {
  provider: GitProvider;
  owner: string;
  repo: string;
  value: string;
  onChange: (branch: string) => void;
  defaultBranch?: string;
}

export function BranchSelect({
  provider,
  owner,
  repo,
  value,
  onChange,
  defaultBranch,
}: BranchSelectProps) {
  const { branches, isLoading } = useBranches(provider, owner, repo);

  // Sort branches with default branch first
  const sortedBranches = [...branches].sort((a, b) => {
    if (a.name === defaultBranch) return -1;
    if (b.name === defaultBranch) return 1;
    return a.name.localeCompare(b.name);
  });

  if (isLoading) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-4xl border border-input bg-input/30 px-3 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading branches...
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-full">
        <SelectValue>{value || "Select branch"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedBranches.map((branch) => (
          <SelectItem key={branch.name} value={branch.name}>
            <div className="flex items-center gap-2">
              <BranchIcon className="size-4 text-muted-foreground" />
              <span>{branch.name}</span>
              {branch.name === defaultBranch && (
                <span className="text-xs text-muted-foreground">(default)</span>
              )}
              {branch.protected && (
                <ShieldIcon className="size-3 text-muted-foreground" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BranchIcon({ className }: { className?: string }) {
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
      <line x1="6" x2="6" y1="3" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
