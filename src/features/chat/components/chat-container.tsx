"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Time01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useChatStore, type Mention, type Message } from "../stores/chat-store";
import { useSessionStore } from "@/features/session";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { generateId } from "@/lib/id";
import { useSession, useActiveOrganization } from "@/lib/auth-client";
import { useChatRealtime } from "@/features/presence";
import { useChatStream } from "../hooks/use-chat-stream";
import type { MentionData } from "../lib/mentions";

interface ChatContainerProps {
  onToggleHistory?: () => void;
}

interface WorkspaceMember {
  id: string;
  name: string;
  email?: string;
  image?: string;
}

export function ChatContainer({ onToggleHistory }: ChatContainerProps) {
  const { data: authSession } = useSession();
  const { data: activeOrg } = useActiveOrganization();
  const { activeSessionId } = useSessionStore();
  const {
    getMessages,
    addMessage,
    streamingContent,
    isStreaming,
    getPendingApproval,
  } = useChatStore();

  // State for workspace members (would typically come from API)
  const [workspaceMembers, setWorkspaceMembers] = React.useState<WorkspaceMember[]>([]);

  // Fetch workspace members when org changes
  React.useEffect(() => {
    if (!activeOrg?.id) {
      setWorkspaceMembers([]);
      return;
    }

    // TODO: Fetch from API - for now, include current user
    if (authSession?.user) {
      setWorkspaceMembers([
        {
          id: authSession.user.id,
          name: authSession.user.name || "You",
          email: authSession.user.email,
          image: authSession.user.image || undefined,
        },
      ]);
    }
  }, [activeOrg?.id, authSession?.user]);

  // Handle new messages from other users via realtime
  const handleNewMessage = React.useCallback(
    (data: {
      id: string;
      sessionId: string;
      userId: string;
      userName: string;
      role: "user" | "assistant" | "system";
      content: string;
      mentions?: Mention[];
      createdAt: string;
    }) => {
      if (!activeSessionId || data.sessionId !== activeSessionId) return;

      // Add message from another user
      const message: Message = {
        id: data.id,
        sessionId: data.sessionId,
        userId: data.userId,
        role: data.role,
        content: data.content,
        mentions: data.mentions,
        createdAt: new Date(data.createdAt),
      };

      addMessage(activeSessionId, message);
    },
    [activeSessionId, addMessage]
  );

  // Use realtime chat for typing indicators and message broadcasting
  const { typingUsers, broadcastTyping, broadcastMessage } = useChatRealtime({
    sessionId: activeSessionId || "",
    userId: authSession?.user?.id || "",
    userName: authSession?.user?.name || "Anonymous",
    userImage: authSession?.user?.image || undefined,
    onNewMessage: handleNewMessage,
    enabled: !!activeSessionId && !!authSession?.user,
  });

  // Use the streaming hook for real AI responses
  const {
    sendMessage: sendStreamMessage,
    isStreaming: isStreamingFromHook,
    streamingContent: streamingContentFromHook,
  } = useChatStream({
    sessionId: activeSessionId || "",
    onError: (error) => {
      console.error("Chat stream error:", error);
    },
  });

  const messages = activeSessionId ? getMessages(activeSessionId) : [];
  const currentStreamingContent = activeSessionId
    ? streamingContentFromHook || streamingContent[activeSessionId] || ""
    : "";
  const currentIsStreaming = activeSessionId
    ? isStreamingFromHook || isStreaming[activeSessionId] || false
    : false;
  const pendingApproval = activeSessionId
    ? getPendingApproval(activeSessionId)
    : undefined;

  const handleSendMessage = async (content: string, mentions?: MentionData[]) => {
    if (!activeSessionId) return;

    const messageId = generateId("msg");

    // Convert MentionData to Mention format
    const messageMentions: Mention[] | undefined = mentions?.map((m) => ({
      type: m.type,
      userId: m.userId,
      agentType: m.agentType,
    }));

    // Add user message locally
    const userMessage: Message = {
      id: messageId,
      sessionId: activeSessionId,
      userId: authSession?.user?.id,
      role: "user",
      content,
      mentions: messageMentions,
      createdAt: new Date(),
    };
    addMessage(activeSessionId, userMessage);

    // Broadcast to other users via realtime
    broadcastMessage({
      id: messageId,
      content,
      mentions: messageMentions,
    });

    // Send to streaming API for real AI response
    sendStreamMessage(content);
  };

  // Handle typing change from input
  const handleTypingChange = React.useCallback(
    (isTyping: boolean) => {
      if (isTyping) {
        broadcastTyping();
      }
    },
    [broadcastTyping]
  );

  // Handle mention click (could open user profile, etc.)
  const handleMentionClick = React.useCallback((mention: Mention) => {
    console.log("Mention clicked:", mention);
    // TODO: Navigate to user profile or trigger agent action
  }, []);

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
        pendingApproval={pendingApproval}
        typingUsers={typingUsers}
        onMentionClick={handleMentionClick}
      />

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={currentIsStreaming}
        workspaceMembers={workspaceMembers}
        onTypingChange={handleTypingChange}
      />
    </div>
  );
}
