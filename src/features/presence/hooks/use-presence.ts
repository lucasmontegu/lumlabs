"use client";

import { useEffect, useState, useCallback } from "react";
import * as Ably from "ably";
import { useAbly } from "./use-ably";

interface PresenceMember {
  clientId: string;
  data: {
    userId: string;
    userName?: string;
    userImage?: string;
    sessionId?: string;
  };
}

interface UsePresenceOptions {
  channelName: string;
  userData: {
    userId: string;
    userName?: string;
    userImage?: string;
    sessionId?: string;
  };
  enabled?: boolean;
}

/**
 * Hook to manage presence in a channel
 */
export function usePresence({
  channelName,
  userData,
  enabled = true,
}: UsePresenceOptions) {
  const { client, isConnected } = useAbly();
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isEntered, setIsEntered] = useState(false);

  // Enter presence
  const enterPresence = useCallback(async () => {
    if (!client || !isConnected || !enabled) return;

    try {
      const channel = client.channels.get(channelName);
      await channel.presence.enter(userData);
      setIsEntered(true);
    } catch (error) {
      console.error("Failed to enter presence:", error);
    }
  }, [client, isConnected, enabled, channelName, userData]);

  // Leave presence
  const leavePresence = useCallback(async () => {
    if (!client || !isConnected) return;

    try {
      const channel = client.channels.get(channelName);
      await channel.presence.leave();
      setIsEntered(false);
    } catch (error) {
      console.error("Failed to leave presence:", error);
    }
  }, [client, isConnected, channelName]);

  // Update presence data
  const updatePresence = useCallback(
    async (newData: Partial<UsePresenceOptions["userData"]>) => {
      if (!client || !isConnected || !isEntered) return;

      try {
        const channel = client.channels.get(channelName);
        await channel.presence.update({ ...userData, ...newData });
      } catch (error) {
        console.error("Failed to update presence:", error);
      }
    },
    [client, isConnected, isEntered, channelName, userData]
  );

  useEffect(() => {
    if (!client || !isConnected || !enabled) return;

    const channel = client.channels.get(channelName);

    // Get initial presence
    channel.presence.get().then((presenceSet) => {
      const memberList = presenceSet.map((p) => ({
        clientId: p.clientId,
        data: p.data as PresenceMember["data"],
      }));
      setMembers(memberList);
    });

    // Subscribe to presence changes
    const handlePresenceMessage = (
      message: Ably.PresenceMessage
    ) => {
      setMembers((prev) => {
        const filtered = prev.filter((m) => m.clientId !== message.clientId);

        if (message.action === "enter" || message.action === "update") {
          return [
            ...filtered,
            {
              clientId: message.clientId,
              data: message.data as PresenceMember["data"],
            },
          ];
        }

        // For leave/absent, just return filtered list
        return filtered;
      });
    };

    channel.presence.subscribe(handlePresenceMessage);

    // Enter presence on mount
    enterPresence();

    return () => {
      channel.presence.unsubscribe(handlePresenceMessage);
      leavePresence();
    };
  }, [client, isConnected, enabled, channelName, enterPresence, leavePresence]);

  return {
    members,
    isEntered,
    enterPresence,
    leavePresence,
    updatePresence,
  };
}
