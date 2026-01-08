"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, RobotIcon, Alert02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { type Message, type MessagePhase } from "../stores/chat-store";

interface ChatMessagesProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
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

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && streamingContent && (
        <StreamingMessage content={streamingContent} />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
