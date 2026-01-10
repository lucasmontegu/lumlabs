"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, RobotIcon, Alert02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { type Message, type MessagePhase, type Approval } from "../stores/chat-store";
import { PlanCard, type PlanData } from "./plan-card";
import { BuildingProgress, type FileChange } from "./building-progress";
import { ReadyCard } from "./ready-card";

interface ChatMessagesProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
  // For plan approval flow
  pendingApproval?: Approval | null;
  onApprovePlan?: () => void;
  onAdjustPlan?: () => void;
  isApprovingPlan?: boolean;
  // For building progress
  buildingFiles?: FileChange[];
  currentBuildingFile?: string;
  isBuildComplete?: boolean;
  // For ready state
  filesChanged?: string[];
  onCreatePR?: () => void;
  onIterate?: () => void;
  isCreatingPR?: boolean;
  prUrl?: string;
}

const phaseLabels: Record<MessagePhase, string> = {
  planning: "Planning",
  building: "Building",
  review: "Reviewing",
};

const phaseColors: Record<MessagePhase, string> = {
  planning: "bg-yellow-500/10 text-yellow-600",
  building: "bg-blue-500/10 text-blue-600",
  review: "bg-purple-500/10 text-purple-600",
};

/**
 * Parse plan data from a plan message
 */
function parsePlanData(message: Message): PlanData | null {
  if (message.type !== "plan") {
    return null;
  }

  try {
    const parsed = JSON.parse(message.content);
    return {
      summary: parsed.summary || "",
      changes: (parsed.changes || []).map(
        (c: { description: string; files?: string[] }) => ({
          description: c.description,
          files: c.files,
        })
      ),
      considerations: parsed.considerations,
    };
  } catch {
    return {
      summary: message.content.slice(0, 200),
      changes: [{ description: "Review the plan details" }],
    };
  }
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
              ? "bg-muted text-muted-foreground"
              : "bg-muted text-foreground"
        )}
      >
        <HugeiconsIcon
          icon={isUser ? UserIcon : isSystem ? Alert02Icon : RobotIcon}
          className="size-4"
        />
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Phase badge */}
        {message.phase && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              phaseColors[message.phase]
            )}
          >
            {phaseLabels[message.phase]}
          </span>
        )}

        {/* Message content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : isSystem
                ? "bg-muted/50 text-muted-foreground italic"
                : "bg-muted text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>

        {/* Metadata */}
        {message.metadata?.filesChanged && message.metadata.filesChanged.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.metadata.filesChanged.slice(0, 3).map((file) => (
              <span
                key={file}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {file.split("/").pop()}
              </span>
            ))}
            {message.metadata.filesChanged.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{message.metadata.filesChanged.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
        <HugeiconsIcon icon={RobotIcon} className="size-4" />
      </div>
      <div className="flex max-w-[75%] flex-col gap-1">
        <div className="rounded-2xl bg-muted px-4 py-2 text-foreground">
          <p className="whitespace-pre-wrap text-sm">{content}</p>
          <span className="inline-block size-2 animate-pulse rounded-full bg-current" />
        </div>
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
  // Plan approval
  pendingApproval,
  onApprovePlan,
  onAdjustPlan,
  isApprovingPlan,
  // Building progress
  buildingFiles,
  currentBuildingFile,
  isBuildComplete,
  // Ready state
  filesChanged,
  onCreatePR,
  onIterate,
  isCreatingPR,
  prUrl,
}: ChatMessagesProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <HugeiconsIcon icon={RobotIcon} className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Ready to build</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Describe what you want to create and I&apos;ll help you plan and build
            it.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render a message based on its type
   */
  const renderMessage = (message: Message) => {
    // Plan message - render PlanCard
    if (message.type === "plan") {
      const planData = parsePlanData(message);
      if (planData) {
        // Determine approval status for this plan
        const approvalStatus =
          pendingApproval?.messageId === message.id
            ? pendingApproval.status
            : "pending";

        return (
          <div key={message.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <HugeiconsIcon icon={RobotIcon} className="size-4" />
            </div>
            <div className="flex-1 max-w-[85%]">
              <PlanCard
                plan={planData}
                status={approvalStatus as "pending" | "approved" | "rejected"}
                onApprove={onApprovePlan}
                onAdjust={onAdjustPlan}
                isLoading={isApprovingPlan}
              />
            </div>
          </div>
        );
      }
    }

    // Building progress message - render BuildingProgress
    if (message.type === "building_progress") {
      return (
        <div key={message.id} className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <HugeiconsIcon icon={RobotIcon} className="size-4" />
          </div>
          <div className="flex-1 max-w-[85%]">
            <BuildingProgress
              files={buildingFiles || []}
              currentFile={currentBuildingFile}
              isComplete={isBuildComplete}
            />
          </div>
        </div>
      );
    }

    // Ready message - render ReadyCard
    if (message.type === "ready") {
      return (
        <div key={message.id} className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <HugeiconsIcon icon={RobotIcon} className="size-4" />
          </div>
          <div className="flex-1 max-w-[85%]">
            <ReadyCard
              filesChanged={filesChanged || []}
              onCreatePR={onCreatePR}
              onIterate={onIterate}
              isLoading={isCreatingPR}
              prUrl={prUrl}
            />
          </div>
        </div>
      );
    }

    // Default: render as regular message bubble
    return <MessageBubble key={message.id} message={message} />;
  };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map(renderMessage)}
      {isStreaming && streamingContent && (
        <StreamingMessage content={streamingContent} />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
