"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type * as Ably from "ably";
import { useAbly } from "./use-ably";
import type { Message, Mention } from "@/features/chat/stores/chat-store";

interface TypingUser {
  userId: string;
  userName: string;
  userImage?: string;
  timestamp: number;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userImage?: string;
  role: "user" | "assistant" | "system";
  content: string;
  mentions?: Mention[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface UseChatRealtimeOptions {
  sessionId: string;
  userId: string;
  userName: string;
  userImage?: string;
  onNewMessage?: (message: ChatMessage) => void;
  enabled?: boolean;
}

const TYPING_TIMEOUT = 3000; // 3 seconds

/**
 * Hook for realtime chat features (messages, typing indicators)
 */
export function useChatRealtime({
  sessionId,
  userId,
  userName,
  userImage,
  onNewMessage,
  enabled = true,
}: UseChatRealtimeOptions) {
  const { client, isConnected } = useAbly();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const typingCleanupRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Channel for this session's chat
  const channelName = `session:${sessionId}:chat`;

  /**
   * Broadcast that user is typing
   */
  const broadcastTyping = useCallback(async () => {
    if (!client || !isConnected || !enabled) return;

    const now = Date.now();
    // Throttle: only send every 2 seconds
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;

    try {
      const channel = client.channels.get(channelName);
      await channel.publish("typing", {
        userId,
        userName,
        userImage,
        timestamp: now,
      });
    } catch (error) {
      console.error("Failed to broadcast typing:", error);
    }
  }, [client, isConnected, enabled, channelName, userId, userName, userImage]);

  /**
   * Broadcast a new message to other users
   */
  const broadcastMessage = useCallback(
    async (message: {
      id: string;
      content: string;
      mentions?: Mention[];
      metadata?: Record<string, unknown>;
    }) => {
      if (!client || !isConnected || !enabled) return;

      try {
        const channel = client.channels.get(channelName);
        await channel.publish("message", {
          id: message.id,
          sessionId,
          userId,
          userName,
          userImage,
          role: "user",
          content: message.content,
          mentions: message.mentions,
          metadata: message.metadata,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to broadcast message:", error);
      }
    },
    [client, isConnected, enabled, channelName, sessionId, userId, userName, userImage]
  );

  /**
   * Clear stale typing indicators
   */
  const cleanupTypingUsers = useCallback(() => {
    const now = Date.now();
    setTypingUsers((prev) =>
      prev.filter((u) => now - u.timestamp < TYPING_TIMEOUT)
    );
  }, []);

  useEffect(() => {
    if (!client || !isConnected || !enabled || !sessionId) return;

    const channel = client.channels.get(channelName);

    // Handle typing events
    const handleTyping = (message: Ably.InboundMessage) => {
      const data = message.data as TypingUser;
      if (!data || data.userId === userId) return; // Ignore own typing

      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== data.userId);
        return [...filtered, data];
      });
    };

    // Handle new messages from other users
    const handleMessage = (message: Ably.InboundMessage) => {
      const data = message.data as ChatMessage;
      if (!data || data.userId === userId) return; // Ignore own messages

      // Remove this user from typing when they send a message
      setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));

      // Notify callback
      onNewMessage?.(data);
    };

    // Subscribe to events
    channel.subscribe("typing", handleTyping);
    channel.subscribe("message", handleMessage);

    setIsSubscribed(true);

    // Start cleanup interval for stale typing indicators
    typingCleanupRef.current = setInterval(cleanupTypingUsers, 1000);

    return () => {
      channel.unsubscribe("typing", handleTyping);
      channel.unsubscribe("message", handleMessage);
      setIsSubscribed(false);

      if (typingCleanupRef.current) {
        clearInterval(typingCleanupRef.current);
      }
    };
  }, [
    client,
    isConnected,
    enabled,
    sessionId,
    channelName,
    userId,
    onNewMessage,
    cleanupTypingUsers,
  ]);

  return {
    isSubscribed,
    typingUsers: typingUsers.filter((u) => u.userId !== userId),
    broadcastTyping,
    broadcastMessage,
  };
}
