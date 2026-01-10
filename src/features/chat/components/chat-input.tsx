"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Attachment01Icon,
  CodeSquareIcon,
  GlobalSearchIcon,
  Clock01Icon,
  MagicWand01Icon,
  RepositoryIcon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  branches?: string[];
  showSelectors?: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask anything",
  branches = [],
  showSelectors = true,
}: ChatInputProps) {
  const [value, setValue] = React.useState("");
  const [autoMode, setAutoMode] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const {
    repositories,
    selectedRepoId,
    selectedBranch,
    setSelectedRepo,
    setSelectedBranch,
    getSelectedRepo,
  } = useWorkspaceStore();

  const selectedRepo = getSelectedRepo();

  // Get available branches for selected repo
  const availableBranches =
    branches.length > 0
      ? branches
      : selectedRepo
        ? [selectedRepo.defaultBranch || "main"]
        : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;

    onSend(value.trim());
    setValue("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
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
    target.style.height = target.scrollHeight + "px";
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Main Input Card */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={() => {}}
        />

        {/* Textarea */}
        <div className="px-3 pt-3 pb-2 grow">
          <form onSubmit={handleSubmit}>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleTextareaInput}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full bg-transparent! p-0 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder-muted-foreground resize-none border-none outline-none text-sm min-h-10 max-h-[25vh]"
              rows={1}
            />
          </form>
        </div>

        {/* Bottom Row - Actions */}
        <div className="mb-2 px-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Add Button with Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-full border border-border hover:bg-accent"
                  />
                }
              >
                <HugeiconsIcon icon={Add01Icon} className="size-3" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                className="max-w-xs rounded-2xl p-1.5"
              >
                <DropdownMenuGroup className="space-y-1">
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <HugeiconsIcon icon={Attachment01Icon} className="size-4 opacity-60" />
                    Attach Files
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => {}}
                  >
                    <HugeiconsIcon icon={CodeSquareIcon} className="size-4 opacity-60" />
                    Code Interpreter
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => {}}
                  >
                    <HugeiconsIcon icon={GlobalSearchIcon} className="size-4 opacity-60" />
                    Web Search
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => {}}
                  >
                    <HugeiconsIcon icon={Clock01Icon} className="size-4 opacity-60" />
                    Chat History
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Auto Mode Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoMode(!autoMode)}
              className={cn(
                "h-7 px-2 rounded-full border border-border hover:bg-accent",
                {
                  "bg-primary/10 text-primary border-primary/30": autoMode,
                  "text-muted-foreground": !autoMode,
                }
              )}
            >
              <HugeiconsIcon icon={MagicWand01Icon} className="size-3" />
              <span className="text-xs">Auto</span>
            </Button>
          </div>

          {/* Send Button */}
          <div>
            <Button
              type="submit"
              disabled={!value.trim() || disabled}
              className="size-7 p-0 rounded-full bg-primary disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit}
            >
              <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selectors Below Input */}
      {showSelectors && (
        <div className="flex items-center gap-0 pt-2">
          {/* Repository Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 rounded-full border border-transparent hover:bg-accent/10 text-muted-foreground text-xs"
                />
              }
            >
              <HugeiconsIcon icon={RepositoryIcon} className="size-3" />
              <span>{selectedRepo?.name || "Project"}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-w-xs rounded-2xl p-1.5 border-border"
            >
              <DropdownMenuGroup className="space-y-1">
                {repositories.map((repo) => (
                  <DropdownMenuItem
                    key={repo.id}
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => setSelectedRepo(repo.id)}
                  >
                    <HugeiconsIcon icon={RepositoryIcon} className="size-4 opacity-60" />
                    {repo.name}
                  </DropdownMenuItem>
                ))}
                {repositories.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No projects connected
                  </div>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Branch Selector */}
          {selectedRepo && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 rounded-full border border-transparent hover:bg-accent/10 text-muted-foreground text-xs"
                  />
                }
              >
                <HugeiconsIcon icon={GitBranchIcon} className="size-3" />
                <span>{selectedBranch || "Branch"}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-w-xs rounded-2xl p-1.5 border-border"
              >
                <DropdownMenuGroup className="space-y-1">
                  {availableBranches.map((branch) => (
                    <DropdownMenuItem
                      key={branch}
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => setSelectedBranch(branch)}
                    >
                      <HugeiconsIcon icon={GitBranchIcon} className="size-4 opacity-60" />
                      {branch}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex-1" />
        </div>
      )}
    </div>
  );
}
