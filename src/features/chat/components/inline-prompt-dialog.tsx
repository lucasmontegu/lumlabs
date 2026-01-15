"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  Add01Icon,
  SparklesIcon,
  Cancel01Icon,
  CloudIcon,
  ComputerIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/features/workspace/stores/workspace-store";
import { useChatStream } from "../hooks/use-chat-stream";
import { ChatMessages } from "./chat-messages";
import { useChatStore } from "../stores/chat-store";
import { generateId } from "@/lib/id";
import type { SandboxProviderType } from "@/lib/sandbox-provider";

interface Environment {
  id: string;
  name: string;
  provider: SandboxProviderType;
  isDefault?: boolean;
}

interface SandboxProviderInfo {
  type: SandboxProviderType;
  name: string;
  available: boolean;
  isDefault: boolean;
  features: {
    persistent: boolean;
    pauseResume: boolean;
    gpuSupport: boolean;
  };
}

interface InlinePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export function InlinePromptDialog({
  open,
  onOpenChange,
  initialPrompt = "",
  sessionId: propSessionId,
  onSessionCreated,
}: InlinePromptDialogProps) {
  const [inputValue, setInputValue] = React.useState(initialPrompt);
  const [sessionId, setSessionId] = React.useState<string | null>(propSessionId ?? null);
  const [isCreatingSession, setIsCreatingSession] = React.useState(false);
  const [environments, setEnvironments] = React.useState<Environment[]>([
    { id: "default", name: "Default", provider: "daytona", isDefault: true },
  ]);
  const [selectedEnvironment, setSelectedEnvironment] = React.useState<Environment>(
    environments[0]
  );
  const [sandboxProviders, setSandboxProviders] = React.useState<SandboxProviderInfo[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { getSelectedRepo } = useWorkspaceStore();
  const selectedRepo = getSelectedRepo();

  const { getMessages, addMessage } = useChatStore();

  // Fetch available sandbox providers
  React.useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch("/api/sandbox-providers");
        if (response.ok) {
          const data = await response.json();
          setSandboxProviders(data.providers || []);

          // Update default environment with actual default provider
          if (data.defaultProvider) {
            setEnvironments((prev) =>
              prev.map((env) =>
                env.isDefault ? { ...env, provider: data.defaultProvider } : env
              )
            );
            setSelectedEnvironment((prev) =>
              prev.isDefault ? { ...prev, provider: data.defaultProvider } : prev
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch sandbox providers:", error);
      }
    };

    if (open) {
      fetchProviders();
    }
  }, [open]);

  // Chat streaming hook
  const {
    sendMessage: sendStreamMessage,
    isStreaming,
    streamingContent,
  } = useChatStream({
    sessionId: sessionId || "",
    sandboxProvider: selectedEnvironment.provider,
    onError: (error) => {
      console.error("Chat stream error:", error);
    },
  });

  const messages = sessionId ? getMessages(sessionId) : [];

  // Focus textarea when dialog opens
  React.useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setInputValue("");
      if (!propSessionId) {
        setSessionId(null);
      }
    } else if (initialPrompt) {
      setInputValue(initialPrompt);
    }
  }, [open, initialPrompt, propSessionId]);

  const createSession = async (prompt: string): Promise<string | null> => {
    if (!selectedRepo) {
      console.error("No repository selected");
      return null;
    }

    setIsCreatingSession(true);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryId: selectedRepo.id,
          name: prompt.slice(0, 50) + (prompt.length > 50 ? "..." : ""),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json();
      const newSessionId = data.session.id;
      setSessionId(newSessionId);
      onSessionCreated?.(newSessionId);
      return newSessionId;
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming || isCreatingSession) return;

    let currentSessionId = sessionId;

    // Create session if needed
    if (!currentSessionId) {
      currentSessionId = await createSession(inputValue);
      if (!currentSessionId) return;
    }

    // Add user message locally
    const messageId = generateId("msg");
    addMessage(currentSessionId, {
      id: messageId,
      sessionId: currentSessionId,
      role: "user",
      content: inputValue.trim(),
      createdAt: new Date(),
    });

    // Send to streaming API
    sendStreamMessage(inputValue.trim());
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
    target.style.height = Math.min(target.scrollHeight, 150) + "px";
  };

  const handleAddEnvironment = () => {
    // In a real implementation, this would open a modal to configure a new environment
    const newEnv: Environment = {
      id: generateId("env"),
      name: `Environment ${environments.length + 1}`,
      provider: "daytona",
    };
    setEnvironments((prev) => [...prev, newEnv]);
    setSelectedEnvironment(newEnv);
  };

  const getProviderIcon = (provider: SandboxProviderType) => {
    switch (provider) {
      case "e2b":
        return CloudIcon;
      case "modal":
        return CloudIcon;
      default:
        return ComputerIcon;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon icon={SparklesIcon} className="size-4 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">
                {sessionId ? "Continue Building" : "Start Building"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {selectedRepo?.name || "No project selected"}
              </p>
            </div>

            {/* Environment Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs"
                  />
                }
              >
                <HugeiconsIcon
                  icon={getProviderIcon(selectedEnvironment.provider)}
                  className="size-3.5"
                />
                <span>{selectedEnvironment.name}</span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  {environments.map((env) => (
                    <DropdownMenuItem
                      key={env.id}
                      onClick={() => setSelectedEnvironment(env)}
                      className={cn(
                        "gap-2",
                        selectedEnvironment.id === env.id && "bg-accent"
                      )}
                    >
                      <HugeiconsIcon
                        icon={getProviderIcon(env.provider)}
                        className="size-4"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{env.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {env.provider}
                        </p>
                      </div>
                      {env.isDefault && (
                        <span className="text-xs text-muted-foreground">Default</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddEnvironment} className="gap-2">
                  <HugeiconsIcon icon={Add01Icon} className="size-4" />
                  <span>Add environment</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        {/* Messages Area (only shown after session created) */}
        {sessionId && (messages.length > 0 || isStreaming) && (
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px]">
            <ChatMessages
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/20">
          <div className="bg-background border border-border rounded-xl overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="p-3">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleTextareaInput}
                  placeholder={
                    sessionId
                      ? "Continue the conversation..."
                      : "Describe what you want to build..."
                  }
                  disabled={isStreaming || isCreatingSession}
                  className="w-full bg-transparent p-0 border-0 shadow-none focus-visible:ring-0 text-sm min-h-[60px] max-h-[150px] resize-none"
                  rows={2}
                />
              </div>

              {/* Actions Bar */}
              <div className="px-3 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Press Enter to send</span>
                </div>
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isStreaming || isCreatingSession}
                  size="sm"
                  className="h-8 px-4 gap-2"
                >
                  {isCreatingSession ? (
                    <>Creating...</>
                  ) : isStreaming ? (
                    <>Building...</>
                  ) : (
                    <>
                      <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Provider Info */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <HugeiconsIcon
              icon={getProviderIcon(selectedEnvironment.provider)}
              className="size-3.5"
            />
            <span>
              Using {selectedEnvironment.provider === "daytona" ? "Daytona" :
                     selectedEnvironment.provider === "e2b" ? "E2B" : "Modal"} sandbox
              {selectedEnvironment.provider === "daytona" && " (persistent)"}
              {selectedEnvironment.provider === "e2b" && " (ephemeral, fast)"}
              {selectedEnvironment.provider === "modal" && " (GPU support)"}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
