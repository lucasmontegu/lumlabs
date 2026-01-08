"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Time01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useChatStore } from "../stores/chat-store";
import { useSessionStore } from "@/features/session";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { generateId } from "@/lib/id";

interface ChatContainerProps {
  onToggleHistory?: () => void;
}

export function ChatContainer({ onToggleHistory }: ChatContainerProps) {
  const { activeSessionId } = useSessionStore();
  const {
    getMessages,
    addMessage,
    streamingContent,
    isStreaming,
  } = useChatStore();

  const messages = activeSessionId ? getMessages(activeSessionId) : [];
  const currentStreamingContent = activeSessionId
    ? streamingContent[activeSessionId] || ""
    : "";
  const currentIsStreaming = activeSessionId
    ? isStreaming[activeSessionId] || false
    : false;

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId) return;

    // Add user message locally
    const userMessage = {
      id: generateId("msg"),
      sessionId: activeSessionId,
      role: "user" as const,
      content,
      createdAt: new Date(),
    };
    addMessage(activeSessionId, userMessage);

    // TODO: Send to API and handle streaming response
    // For now, simulate a response
    setTimeout(() => {
      const assistantMessage = {
        id: generateId("msg"),
        sessionId: activeSessionId,
        role: "assistant" as const,
        content: `I understand you want to: "${content}"\n\nLet me analyze this request and create a plan for you.`,
        phase: "planning" as const,
        createdAt: new Date(),
      };
      addMessage(activeSessionId, assistantMessage);
    }, 1000);
  };

  if (!activeSessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">
          Select a session to start chatting
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <span className="font-medium">Chat</span>
        {onToggleHistory && (
          <Button variant="ghost" size="icon-sm" onClick={onToggleHistory}>
            <HugeiconsIcon icon={Time01Icon} className="size-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ChatMessages
        messages={messages}
        streamingContent={currentStreamingContent}
        isStreaming={currentIsStreaming}
      />

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={currentIsStreaming} />
    </div>
  );
}
