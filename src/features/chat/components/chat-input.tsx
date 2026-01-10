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
  UserIcon,
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
import { MentionPopover, MentionBadge } from "./mention-popover";
import {
  type Mentionable,
  type MentionData,
  parseMentions,
  DEFAULT_AGENTS,
} from "../lib/mentions";

interface ChatInputProps {
  onSend: (message: string, mentions?: MentionData[]) => void;
  disabled?: boolean;
  placeholder?: string;
  branches?: string[];
  showSelectors?: boolean;
  // Mention support
  workspaceMembers?: Array<{
    id: string;
    name: string;
    email?: string;
    image?: string;
  }>;
  onTypingChange?: (isTyping: boolean) => void;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask anything or @mention someone",
  branches = [],
  showSelectors = true,
  workspaceMembers = [],
  onTypingChange,
}: ChatInputProps) {
  const [value, setValue] = React.useState("");
  const [autoMode, setAutoMode] = React.useState(false);
  const [showMentionPopover, setShowMentionPopover] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentions, setMentions] = React.useState<Mentionable[]>([]);
  const [cursorPosition, setCursorPosition] = React.useState(0);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const {
    repositories,
    selectedBranch,
    setSelectedRepo,
    setSelectedBranch,
    getSelectedRepo,
  } = useWorkspaceStore();

  const selectedRepo = getSelectedRepo();

  // Convert workspace members to mentionable format
  const mentionableUsers: Mentionable[] = React.useMemo(
    () =>
      workspaceMembers.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        image: m.image,
        type: "user" as const,
      })),
    [workspaceMembers]
  );

  // Get available branches for selected repo
  const availableBranches =
    branches.length > 0
      ? branches
      : selectedRepo
        ? [selectedRepo.defaultBranch || "main"]
        : [];

  // Handle typing indicator
  const handleTyping = React.useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    onTypingChange?.(true);

    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange?.(false);
    }, 2000);
  }, [onTypingChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;

    // Parse mentions from the message
    const { mentions: parsedMentions } = parseMentions(value, [
      ...mentionableUsers,
      ...DEFAULT_AGENTS,
    ]);

    // Add selected mentions from popover
    const allMentions: MentionData[] = [
      ...parsedMentions,
      ...mentions.map((m) => ({
        type: m.type as "user" | "agent",
        userId: m.type === "user" ? m.id : undefined,
        userName: m.type === "user" ? m.name : undefined,
        agentType:
          m.type === "agent"
            ? (m as { agentType: "reviewer" | "security" | "ux" | "planner" })
                .agentType
            : undefined,
      })),
    ];

    // Deduplicate mentions
    const uniqueMentions = allMentions.filter(
      (m, i, arr) =>
        arr.findIndex(
          (x) =>
            x.userId === m.userId &&
            x.agentType === m.agentType &&
            x.type === m.type
        ) === i
    );

    onSend(value.trim(), uniqueMentions.length > 0 ? uniqueMentions : undefined);
    setValue("");
    setMentions([]);

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTypingChange?.(false);

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

    // Handle @ trigger for mentions
    if (e.key === "@" && !showMentionPopover) {
      // Get cursor position for popover placement
      const pos = textareaRef.current?.selectionStart || 0;
      setCursorPosition(pos);
      setShowMentionPopover(true);
      setMentionQuery("");
    }

    // Close mention popover on escape
    if (e.key === "Escape" && showMentionPopover) {
      setShowMentionPopover(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    handleTyping();

    // Update mention query when popover is open
    if (showMentionPopover) {
      const cursorPos = e.target.selectionStart || 0;
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex >= 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        // Close popover if space or special character after @
        if (query.includes(" ") || /[^a-zA-Z0-9_]/.test(query)) {
          setShowMentionPopover(false);
        } else {
          setMentionQuery(query);
        }
      } else {
        setShowMentionPopover(false);
      }
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = target.scrollHeight + "px";
  };

  // Handle mention selection
  const handleMentionSelect = (mention: Mentionable) => {
    // Add to selected mentions
    setMentions((prev) => {
      if (prev.find((m) => m.id === mention.id)) return prev;
      return [...prev, mention];
    });

    // Replace the @query with @name in the text
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const textBefore = value.slice(0, lastAtIndex);
      const textAfter = value.slice(cursorPosition + mentionQuery.length);
      const mentionText = `@${mention.name.replace(/\s+/g, "")} `;
      setValue(textBefore + mentionText + textAfter);

      // Move cursor after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = lastAtIndex + mentionText.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
    }

    setShowMentionPopover(false);
    setMentionQuery("");
  };

  // Remove a selected mention
  const handleRemoveMention = (mentionId: string) => {
    setMentions((prev) => prev.filter((m) => m.id !== mentionId));
  };

  // Cleanup typing timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Selected mentions badges */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 px-1">
          {mentions.map((mention) => (
            <MentionBadge
              key={mention.id}
              name={mention.name}
              type={mention.type}
              onClick={() => handleRemoveMention(mention.id)}
              className="pr-1"
            />
          ))}
        </div>
      )}

      {/* Main Input Card */}
      <div className="bg-background border border-border rounded-2xl overflow-hidden relative">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={() => {}}
        />

        {/* Mention Popover */}
        <MentionPopover
          open={showMentionPopover}
          onOpenChange={setShowMentionPopover}
          onSelect={handleMentionSelect}
          users={mentionableUsers}
          searchQuery={mentionQuery}
        >
          <span />
        </MentionPopover>

        {/* Textarea */}
        <div className="px-3 pt-3 pb-2 grow">
          <form onSubmit={handleSubmit}>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
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
                    onClick={() => {
                      setShowMentionPopover(true);
                      setMentionQuery("");
                    }}
                  >
                    <HugeiconsIcon icon={UserIcon} className="size-4 opacity-60" />
                    Mention Someone
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
