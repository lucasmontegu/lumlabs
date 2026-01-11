"use client";

import { useEffect, useState, useCallback } from "react";
import type * as Ably from "ably";
import { useAbly } from "./use-ably";

export interface MentionNotification {
  id: string;
  sessionId: string;
  sessionName: string;
  mentionedBy: string;
  mentionedByImage?: string;
  messagePreview: string;
  timestamp: string;
  read: boolean;
}

interface UseNotificationsOptions {
  userId: string;
  enabled?: boolean;
  onNewNotification?: (notification: MentionNotification) => void;
}

/**
 * Hook to subscribe to user notifications (mentions, etc.)
 */
export function useNotifications({
  userId,
  enabled = true,
  onNewNotification,
}: UseNotificationsOptions) {
  const { client, isConnected } = useAbly();
  const [notifications, setNotifications] = useState<MentionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const channelName = `user:${userId}:notifications`;

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!client || !isConnected || !enabled || !userId) return;

    const channel = client.channels.get(channelName);

    // Handle mention notifications
    const handleMention = (message: Ably.InboundMessage) => {
      const data = message.data as Omit<MentionNotification, "id" | "read">;
      if (!data) return;

      const notification: MentionNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...data,
        read: false,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount((prev) => prev + 1);
      onNewNotification?.(notification);
    };

    // Subscribe to mention events
    channel.subscribe("mention", handleMention);
    setIsSubscribed(true);

    return () => {
      channel.unsubscribe("mention", handleMention);
      setIsSubscribed(false);
    };
  }, [client, isConnected, enabled, userId, channelName, onNewNotification]);

  return {
    notifications,
    unreadCount,
    isSubscribed,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
