"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  Image01Icon,
  MoreHorizontalIcon,
  GitBranchIcon,
  CloudIcon,
  Add01Icon,
  Search01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, Repository } from "@/features/workspace/stores/workspace-store";
import type { SandboxProviderType } from "@/lib/sandbox-provider";

// GitHub icon component
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface CloudEnvironment {
  id: string;
  name: string;
  provider: SandboxProviderType;
  networkAccess: "trusted" | "restricted" | "none";
  envVars?: string;
  isDefault?: boolean;
}

interface PromptComposerProps {
  onSubmit: (prompt: string, options: {
    repositoryId: string;
    branch: string;
    environment: CloudEnvironment;
  }) => void;
  onAddEnvironment: () => void;
  isLoading?: boolean;
  environments: CloudEnvironment[];
  selectedEnvironment: CloudEnvironment | null;
  onEnvironmentChange: (env: CloudEnvironment) => void;
}

export function PromptComposer({
  onSubmit,
  onAddEnvironment,
  isLoading = false,
  environments,
  selectedEnvironment,
  onEnvironmentChange,
}: PromptComposerProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [repoOpen, setRepoOpen] = React.useState(false);
  const [branchOpen, setBranchOpen] = React.useState(false);
  const [envOpen, setEnvOpen] = React.useState(false);
  const [repoSearch, setRepoSearch] = React.useState("");
  const [branchSearch, setBranchSearch] = React.useState("");
  const [branches, setBranches] = React.useState<string[]>(["main"]);
  const [selectedBranch, setSelectedBranch] = React.useState("main");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { repositories, selectedRepoId, setSelectedRepo, getSelectedRepo } = useWorkspaceStore();
  const selectedRepo = getSelectedRepo();

  // Fetch branches when repo changes
  React.useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedRepo) return;

      try {
        const response = await fetch(
          `/api/git/${selectedRepo.provider}/branches?repoFullName=${encodeURIComponent(selectedRepo.fullName || selectedRepo.name)}`
        );
        if (response.ok) {
          const data = await response.json();
          setBranches(data.branches?.map((b: { name: string }) => b.name) || ["main"]);
          setSelectedBranch(selectedRepo.defaultBranch || "main");
        }
      } catch (error) {
        console.error("Failed to fetch branches:", error);
        setBranches(["main"]);
      }
    };

    fetchBranches();
  }, [selectedRepo]);

  const filteredRepos = React.useMemo(() => {
    if (!repoSearch) return repositories;
    const search = repoSearch.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(search) ||
        repo.fullName?.toLowerCase().includes(search)
    );
  }, [repositories, repoSearch]);

  const filteredBranches = React.useMemo(() => {
    if (!branchSearch) return branches;
    const search = branchSearch.toLowerCase();
    return branches.filter((branch) => branch.toLowerCase().includes(search));
  }, [branches, branchSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !selectedRepo || !selectedEnvironment) return;

    onSubmit(inputValue.trim(), {
      repositoryId: selectedRepo.id,
      branch: selectedBranch,
      environment: selectedEnvironment,
    });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 200) + "px";
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Input Area */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 pb-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleTextareaInput}
              placeholder="Find a small todo in the codebase and do it"
              disabled={isLoading}
              className="w-full bg-transparent border-0 shadow-none focus-visible:ring-0 text-base min-h-[60px] max-h-[200px] resize-none placeholder:text-zinc-500 p-0"
              rows={2}
            />
          </div>

          {/* Actions Row */}
          <div className="px-4 pb-2 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300"
            >
              <HugeiconsIcon icon={Image01Icon} className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
            </Button>
            <div className="flex-1" />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading || !selectedRepo}
              size="sm"
              className="h-8 w-8 p-0 rounded-lg bg-orange-700 hover:bg-orange-600 disabled:opacity-30"
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="size-4" />
            </Button>
          </div>

          {/* Selectors Row */}
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center gap-1">
            {/* Repository Selector */}
            <Popover open={repoOpen} onOpenChange={setRepoOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  />
                }
              >
                <GitHubIcon className="size-4" />
                <span>{selectedRepo?.name || "Select repo"}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 opacity-50" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-80 p-0 bg-zinc-900 border-zinc-700"
              >
                <div className="p-2 border-b border-zinc-800">
                  <div className="relative">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500"
                    />
                    <Input
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Search repositories"
                      className="pl-9 bg-zinc-800 border-zinc-700 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {repositories.length > 0 && (
                    <div className="p-2">
                      <p className="px-2 py-1.5 text-xs text-zinc-500 font-medium">
                        Recently Used
                      </p>
                      {filteredRepos.slice(0, 3).map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => {
                            setSelectedRepo(repo.id);
                            setRepoOpen(false);
                            setRepoSearch("");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-zinc-800",
                            selectedRepoId === repo.id && "bg-zinc-800"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200 truncate">
                              {repo.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {repo.owner || ""}
                            </p>
                          </div>
                          {selectedRepoId === repo.id && (
                            <HugeiconsIcon
                              icon={Tick01Icon}
                              className="size-4 text-orange-500"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredRepos.length > 3 && (
                    <div className="p-2 border-t border-zinc-800">
                      <p className="px-2 py-1.5 text-xs text-zinc-500 font-medium">
                        All Repositories
                      </p>
                      {filteredRepos.slice(3).map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => {
                            setSelectedRepo(repo.id);
                            setRepoOpen(false);
                            setRepoSearch("");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-zinc-800",
                            selectedRepoId === repo.id && "bg-zinc-800"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-200 truncate">
                              {repo.name}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {repo.owner || ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredRepos.length === 0 && (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      No repositories found
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-zinc-800">
                  <p className="px-2 py-2 text-xs text-zinc-500">
                    Repo missing? Connect it in settings.
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-zinc-700" />

            {/* Branch Selector */}
            <Popover open={branchOpen} onOpenChange={setBranchOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  />
                }
              >
                <HugeiconsIcon icon={GitBranchIcon} className="size-4" />
                <span>{selectedBranch}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 opacity-50" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-72 p-0 bg-zinc-900 border-zinc-700"
              >
                <div className="p-2 border-b border-zinc-800">
                  <div className="relative">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500"
                    />
                    <Input
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      placeholder="Search branches"
                      className="pl-9 bg-zinc-800 border-zinc-700 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto p-2">
                  {filteredBranches.map((branch) => (
                    <button
                      key={branch}
                      onClick={() => {
                        setSelectedBranch(branch);
                        setBranchOpen(false);
                        setBranchSearch("");
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-zinc-800",
                        selectedBranch === branch && "bg-zinc-800"
                      )}
                    >
                      <span className="text-sm text-zinc-200 truncate flex-1">
                        {branch}
                      </span>
                      {selectedBranch === branch && (
                        <HugeiconsIcon
                          icon={Tick01Icon}
                          className="size-4 text-orange-500"
                        />
                      )}
                    </button>
                  ))}
                  {filteredBranches.length === 0 && (
                    <p className="px-2 py-4 text-center text-sm text-zinc-500">
                      No branches found
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-zinc-700" />

            {/* Environment Selector */}
            <Popover open={envOpen} onOpenChange={setEnvOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  />
                }
              >
                <HugeiconsIcon icon={CloudIcon} className="size-4" />
                <span>{selectedEnvironment?.name || "Default"}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 opacity-50" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-56 p-2 bg-zinc-900 border-zinc-700"
              >
                {environments.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => {
                      onEnvironmentChange(env);
                      setEnvOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-zinc-800",
                      selectedEnvironment?.id === env.id && "bg-zinc-800"
                    )}
                  >
                    <HugeiconsIcon icon={CloudIcon} className="size-4 text-zinc-400" />
                    <span className="text-sm text-zinc-200 flex-1">{env.name}</span>
                    {selectedEnvironment?.id === env.id && (
                      <HugeiconsIcon
                        icon={Tick01Icon}
                        className="size-4 text-orange-500"
                      />
                    )}
                  </button>
                ))}
                <div className="mt-1 pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setEnvOpen(false);
                      onAddEnvironment();
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-zinc-800"
                  >
                    <HugeiconsIcon icon={Add01Icon} className="size-4 text-zinc-400" />
                    <span className="text-sm text-zinc-200">Add environment</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { CloudEnvironment };
