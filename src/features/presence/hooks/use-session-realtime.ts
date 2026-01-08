"use client";

import { useEffect, useState, useCallback } from "react";
import type * as Ably from "ably";
import { useAbly } from "./use-ably";

interface AgentStreamEvent {
  type: "chunk" | "tool_call" | "tool_result" | "error" | "done";
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  };
  error?: string;
}

interface StatusChangeEvent {
  status: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ApprovalEvent {
  type: "requested" | "approved" | "rejected";
  approvalId: string;
  messageId: string;
  reviewerId?: string;
  comment?: string;
  timestamp: string;
}

interface UseSessionRealtimeOptions {
  sessionId: string;
  onAgentChunk?: (content: string) => void;
  onAgentToolCall?: (toolCall: AgentStreamEvent["toolCall"]) => void;
  onAgentError?: (error: string) => void;
  onAgentDone?: () => void;
  onStatusChange?: (status: string, metadata?: Record<string, unknown>) => void;
  onApprovalEvent?: (event: ApprovalEvent) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to session realtime events (agent streaming, status, approvals)
 */
export function useSessionRealtime({
  sessionId,
  onAgentChunk,
  onAgentToolCall,
  onAgentError,
  onAgentDone,
  onStatusChange,
  onApprovalEvent,
  enabled = true,
}: UseSessionRealtimeOptions) {
  const { client, isConnected } = useAbly();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // Reset streaming content
  const resetStream = useCallback(() => {
    setStreamingContent("");
  }, []);

  useEffect(() => {
    if (!client || !isConnected || !enabled || !sessionId) return;

    // Subscribe to agent stream channel
    const streamChannel = client.channels.get(`session:${sessionId}:stream`);
    const statusChannel = client.channels.get(`session:${sessionId}:status`);
    const approvalsChannel = client.channels.get(
      `session:${sessionId}:approvals`
    );

    // Handle agent events
    const handleAgentEvent = (message: Ably.InboundMessage) => {
      const event = message.data as AgentStreamEvent;
      if (!event) return;

      switch (event.type) {
        case "chunk":
          if (event.content) {
            setStreamingContent((prev) => prev + event.content);
            onAgentChunk?.(event.content);
          }
          break;
        case "tool_call":
        case "tool_result":
          if (event.toolCall) {
            onAgentToolCall?.(event.toolCall);
          }
          break;
        case "error":
          if (event.error) {
            onAgentError?.(event.error);
          }
          break;
        case "done":
          setStreamingContent("");
          onAgentDone?.();
          break;
      }
    };

    // Handle status changes
    const handleStatusChange = (message: Ably.InboundMessage) => {
      const data = message.data as StatusChangeEvent;
      if (data) {
        onStatusChange?.(data.status, data.metadata);
      }
    };

    // Handle approval events
    const handleApprovalEvent = (message: Ably.InboundMessage) => {
      const data = message.data as ApprovalEvent;
      if (data) {
        onApprovalEvent?.(data);
      }
    };

    // Subscribe to channels
    streamChannel.subscribe("agent-event", handleAgentEvent);
    statusChannel.subscribe("status-change", handleStatusChange);
    approvalsChannel.subscribe("approval-event", handleApprovalEvent);

    setIsSubscribed(true);

    return () => {
      streamChannel.unsubscribe("agent-event", handleAgentEvent);
      statusChannel.unsubscribe("status-change", handleStatusChange);
      approvalsChannel.unsubscribe("approval-event", handleApprovalEvent);
      setIsSubscribed(false);
    };
  }, [
    client,
    isConnected,
    enabled,
    sessionId,
    onAgentChunk,
    onAgentToolCall,
    onAgentError,
    onAgentDone,
    onStatusChange,
    onApprovalEvent,
  ]);

  return {
    isSubscribed,
    streamingContent,
    resetStream,
  };
}
